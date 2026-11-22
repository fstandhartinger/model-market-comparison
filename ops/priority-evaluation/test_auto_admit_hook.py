"""Proposal 5 option C: the pickup's auto-admit hook in dispatch_measurement (fastlane-zero-wait-p5-hook).

The hook calls fastlane-admit's admit() in-process and, for JevBench orders, a hash-pinned custody `v16-admit` command.
Here fastlane-admit is a fake that delegates the order gate (order_problems/normalize_row) to the real file, and v16-admit
is a fake script in a temp directory. Nothing touches the installed runtime, the database, a pod or the network."""
from __future__ import annotations

import hashlib
import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import autopickup as ap

HERE = Path(__file__).resolve().parent
RID = 'aaaaaaaa-1111-4222-8333-444444444444'
REVIEW_SHA = 'b' * 64


class Reached(Exception):
    pass


FAKE_ADMIT = '''
import importlib.machinery, importlib.util, json, sys
from pathlib import Path
_l = importlib.machinery.SourceFileLoader("real_fastlane_admit", {real!r})
_s = importlib.util.spec_from_loader(_l.name, _l)
real = importlib.util.module_from_spec(_s)
_l.exec_module(real)
Refused, Failed = real.Refused, real.Failed
order_problems, normalize_row = real.order_problems, real.normalize_row
CTL = Path({ctl!r})
def _ctl():
    return json.loads(CTL.read_text())
def family_match(owner, supplement, row):
    if supplement["family"] in row.get("_fam", []):
        return {{"kind": "exact"}}, None
    return None, "no"
def admit(order_id, family, basis, *, dry_run, by, row=None):
    ctl = _ctl()
    with open(ctl["log"], "a") as handle:
        handle.write(json.dumps({{"order": order_id, "family": family, "basis": basis, "by": by, "has_row": row is not None}}) + "\\n")
    if ctl.get("mode") == "boom":
        raise RuntimeError("unexpected")
    problems = order_problems(normalize_row(row))
    if problems:
        raise Refused("; ".join(problems))
    if ctl.get("mode") == "refuse":
        raise Refused("registry says no")
    if ctl.get("mode") == "fail":
        raise Failed("write failed")
    return "added", {{"order_id": order_id}}
'''


class HookCase(unittest.TestCase):
    def setUp(self):
        holder = tempfile.TemporaryDirectory()
        self.addCleanup(holder.cleanup)
        self.root = Path(holder.name)
        os.chmod(self.root, 0o700)
        self.job = self.root / 'job'
        (self.job / 'trusted-runner').mkdir(parents=True)
        (self.job / 'STATE.md').write_text('# state\n')
        self.state_root = self.root / 'state'
        (self.state_root / 'requests').mkdir(parents=True)
        self.admit_log = self.root / 'admit.log'
        self.ctl = self.root / 'ctl.json'
        self.set_ctl()
        self.admit_path = self.root / 'fastlane-admit'
        self.admit_path.write_text(FAKE_ADMIT.format(real=str(HERE / 'fastlane-admit'), ctl=str(self.ctl)))
        os.chmod(self.admit_path, 0o644)  # the umask on a dev box may leave it group-writable, which the hook refuses
        self.admit_sha = hashlib.sha256(self.admit_path.read_bytes()).hexdigest()
        self.write_job(runtime_backend='gpu_pod', recipe=True)
        self.row = {'id': RID, 'benchmarks': ['jevbench'], 'status': 'paid', 'stripe_mode': 'live', 'synthetic_test': False,
                    'paid_at': '2026-11-22T10:00:00Z', 'result_delivered_at': None, 'refund_id': None, 'refunded_at': None,
                    'refund_status': None, 'model_link': 'https://huggingface.co/x/y', 'code_link': None,
                    '_fam': ['cue_reflex']}
        self.native_calls = []
        patches = [mock.patch.object(ap, 'STATE_ROOT', self.state_root),
                   mock.patch.object(ap, 'FASTLANE_ADMIT_PATH', self.admit_path),
                   mock.patch.object(ap, 'FASTLANE_ADMIT_SHA256', self.admit_sha),
                   mock.patch.object(ap, 'V16_ADMIT_PATH', ''),
                   mock.patch.object(ap, 'V16_ADMIT_SHA256', ''),
                   mock.patch.object(ap, 'validate_review_gate',
                                     lambda job_dir: {'source_pins': {}, 'review_sha256': REVIEW_SHA}),
                   mock.patch.object(ap, 'load_row', lambda rid: self.row),
                   mock.patch.object(ap, 'ensure_native_owner', side_effect=lambda *a, **k: self.native_calls.append(a)),
                   mock.patch.object(ap, 'start_native_owner_job', side_effect=lambda *a, **k: self.native_calls.append(a)),
                   mock.patch.object(ap.measurement_dispatch, 'runtime_spec', side_effect=Reached())]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        ap.save_state(ap.load_state(RID))  # the pickup has a state file for every order it reached

    # fixtures ---------------------------------------------------------------------------------------------------
    def set_ctl(self, **kw):
        self.ctl.write_text(json.dumps({'log': str(self.admit_log), **kw}))

    def write_job(self, runtime_backend='gpu_pod', recipe=True):
        trusted = self.job / 'trusted-runner'
        (trusted / 'RUNTIME.json').write_text(json.dumps({'jevbench': {'backend': runtime_backend}}))
        (trusted / 'MEASUREMENT-META.json').write_text(json.dumps({'jevbench': {}}))
        if recipe:
            (trusted / 'POD-RECIPE.json').write_text('{}')

    def v16_script(self, exit_code=0, sleep=0, write_state=True, mode=0o700, grandchild_marker=None):
        path = self.root / 'v16-admit'
        log = self.root / 'v16.log'
        state = self.state_root / 'requests' / f'{RID}.json'
        grand = ''
        if grandchild_marker:
            grand = (f'import subprocess\n'
                     f'subprocess.Popen([sys.executable, "-c", "import time; time.sleep(2); open({str(grandchild_marker)!r}, \'w\').write(\'late\')"])\n')
        path.write_text(f'#!{sys.executable}\nimport json, os, sys, time\n'
                        f'open({str(log)!r}, "a").write(json.dumps(sys.argv[1:]) + "\\n")\n'
                        + grand +
                        f'time.sleep({sleep})\n'
                        f'if {exit_code} == 0 and {write_state}:\n'
                        f'    s = json.load(open({str(state)!r}))\n'
                        f'    s["v16_profile_admission"] = {{"verdict": "ACCEPTED"}}\n'
                        f'    json.dump(s, open({str(state)!r} + ".tmp", "w")); os.replace({str(state)!r} + ".tmp", {str(state)!r})\n'
                        f'sys.exit({exit_code})\n')
        os.chmod(path, mode)
        self.v16_log = log
        return path

    def pin(self, path, sha=None):
        sha = sha or hashlib.sha256(Path(path).read_bytes()).hexdigest()
        for target, value in (('V16_ADMIT_PATH', str(path)), ('V16_ADMIT_SHA256', sha)):
            patcher = mock.patch.object(ap, target, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def repin_admit(self):
        os.chmod(self.admit_path, 0o644)
        patcher = mock.patch.object(ap, 'FASTLANE_ADMIT_SHA256', hashlib.sha256(self.admit_path.read_bytes()).hexdigest())
        patcher.start()
        self.addCleanup(patcher.stop)

    # helpers ----------------------------------------------------------------------------------------------------
    def dispatch(self):
        try:
            ap.dispatch_measurement(RID, self.job)
        except ap.measurement_dispatch.OperationalHold as exc:
            return 'HOLD:' + str(exc)
        except Reached:
            return 'PROCEEDS'
        return 'RETURNED'

    def dispatch_ignoring_errors(self):
        try:
            self.dispatch()
        except Exception:  # noqa: BLE001
            pass

    def admit_calls(self):
        if not self.admit_log.exists():
            return []
        return [json.loads(line) for line in self.admit_log.read_text().splitlines()]

    def v16_calls(self):
        return [json.loads(line) for line in self.v16_log.read_text().splitlines()] if getattr(self, 'v16_log', None) \
            and self.v16_log.exists() else []

    def state_md(self):
        return (self.job / 'STATE.md').read_text()

    def state(self):
        return ap.load_state(RID)


class FamilyAdmitTests(HookCase):
    def test_one_match_admits_once_with_audit_basis_and_row(self):
        self.row['benchmarks'] = ['imagejevbench']
        self.write_job(runtime_backend='gpu_pod')
        (self.job / 'trusted-runner/RUNTIME.json').write_text(json.dumps({'imagejevbench': {'backend': 'gpu_pod'}}))
        (self.job / 'trusted-runner/MEASUREMENT-META.json').write_text(json.dumps({'imagejevbench': {}}))
        self.dispatch()
        self.assertEqual(self.admit_calls(), [{'order': RID, 'family': 'cue_reflex', 'by': 'fastlane-autopickup',
                                               'basis': 'autopickup review-sha256 ' + REVIEW_SHA, 'has_row': True}])
        self.assertEqual(self.state()['auto_admit']['outcome'], 'added')
        self.assertIn('auto-admit: family cue_reflex added', self.state_md())
        self.assertEqual(self.native_calls, [])

    def test_idempotent_per_review(self):
        self.dispatch()
        self.dispatch()
        self.assertEqual(len(self.admit_calls()), 1)
        self.assertEqual(self.state_md().count('auto-admit: family'), 1)

    def test_new_review_sha_tries_again(self):
        self.dispatch()
        with mock.patch.object(ap, 'validate_review_gate', lambda j: {'source_pins': {}, 'review_sha256': 'c' * 64}):
            self.dispatch()
        self.assertEqual(len(self.admit_calls()), 2)

    def test_zero_matches_unchanged(self):
        self.row['_fam'] = []
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.admit_calls(), [])
        self.assertNotIn('auto-admit', self.state_md())

    def test_two_matches_unchanged(self):
        self.row['_fam'] = ['cue_reflex', 'sieve']
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.admit_calls(), [])

    def test_registry_refusal_is_one_note_and_today_s_hold(self):
        self.set_ctl(mode='refuse')
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.dispatch()
        self.assertEqual(len(self.admit_calls()), 1)  # a refused review is not retried every cycle
        self.assertEqual(self.state()['auto_admit']['outcome'], 'refused')
        self.assertIn('not admitted: registry says no', self.state_md())

    def test_failed_write_is_noted_not_raised(self):
        self.set_ctl(mode='fail')
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.state()['auto_admit']['outcome'], 'failed')

    def test_unexpected_error_in_admit_falls_through(self):
        self.set_ctl(mode='boom')
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertIn('family admission step failed: RuntimeError', self.state_md())

    def test_ineligible_orders_are_not_admitted(self):
        cases = {'refunded': {'refunded_at': 'x'}, 'refund_id': {'refund_id': 're_1'}, 'refund_status': {'refund_status': 'due'},
                 'synthetic': {'synthetic_test': True}, 'test_mode': {'stripe_mode': 'test'}, 'unpaid': {'paid_at': None},
                 'delivered': {'result_delivered_at': 'x'}, 'status': {'status': 'refunded'}}
        for name, change in cases.items():
            with self.subTest(name):
                self.admit_log.unlink(missing_ok=True)
                (self.state_root / 'requests' / f'{RID}.json').unlink(missing_ok=True)
                row = dict(self.row, **change)
                with mock.patch.object(ap, 'load_row', lambda rid: row):
                    self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
                # the real order gate inside admit() refused; nothing was admitted
                self.assertEqual(self.state()['auto_admit']['outcome'], 'refused')

    def test_existing_supplement_admission_or_missing_recipe_or_no_gpu_pod_skips(self):
        (self.job / 'trusted-runner/SUPPLEMENT-ADMISSION.json').write_text('{}')
        self.dispatch()
        (self.job / 'trusted-runner/SUPPLEMENT-ADMISSION.json').unlink()
        (self.job / 'trusted-runner/POD-RECIPE.json').unlink()
        self.dispatch()
        self.write_job(runtime_backend='http', recipe=True)
        self.dispatch()
        self.assertEqual(self.admit_calls(), [])

    def test_fastlane_admit_missing_or_broken_falls_through(self):
        for content in (None, 'raise SystemExit(3)', 'def broken(:'):
            with self.subTest(content):
                if content is None:
                    self.admit_path.unlink(missing_ok=True)
                else:
                    self.admit_path.write_text(content)
                    self.repin_admit()
                self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')

    def test_wrong_row_id_is_ignored(self):
        self.row['id'] = 'bbbbbbbb-1111-4222-8333-444444444444'
        self.dispatch_ignoring_errors()
        self.assertEqual(self.admit_calls(), [])


class AdmitPinTests(HookCase):
    """S3: fastlane-admit is only loaded when it is the pinned file; both steps are off otherwise."""

    def test_empty_pin_turns_the_hook_off_without_a_note(self):
        with mock.patch.object(ap, 'FASTLANE_ADMIT_SHA256', ''):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.admit_calls(), [])
        self.assertNotIn('auto-admit', self.state_md())

    def test_empty_admit_pin_also_keeps_a_fully_pinned_v16_step_off(self):
        path = self.v16_script(exit_code=0)
        self.pin(path)
        with mock.patch.object(ap, 'FASTLANE_ADMIT_SHA256', ''):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.v16_calls(), [])  # step 2 reuses fastlane-admit's order gate, so it needs that pin too

    def test_sha_mismatch_is_not_loaded_and_is_noted(self):
        marker = self.root / 'executed'
        self.admit_path.write_text(f'open({str(marker)!r}, "w").write("x")\n')  # changed after the pin was taken
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertFalse(marker.exists())
        self.assertIn('step skipped: fastlane-admit sha256 differs from the pin', self.state_md())

    def test_group_or_other_writable_file_is_not_loaded(self):
        for mode in (0o664, 0o646):
            with self.subTest(oct(mode)):
                os.chmod(self.admit_path, mode)
                self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
                self.assertEqual(self.admit_calls(), [])
        self.assertIn('fastlane-admit file is not an own, non-writable regular file', self.state_md())

    def test_symlink_is_not_loaded(self):
        link = self.root / 'link-admit'
        link.symlink_to(self.admit_path)
        with mock.patch.object(ap, 'FASTLANE_ADMIT_PATH', link):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.admit_calls(), [])
        self.assertIn('missing, a symlink or unreadable', self.state_md())

    def test_relative_path_is_not_loaded(self):
        with mock.patch.object(ap, 'FASTLANE_ADMIT_PATH', Path('fastlane-admit')):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertIn('path is not absolute', self.state_md())

    def test_the_verified_bytes_are_what_runs(self):
        # the module is built from the bytes that were hashed: a swap after the check cannot change what executes
        original = ap._pinned_bytes

        def swap_after_check(*args, **kwargs):
            result = original(*args, **kwargs)
            self.admit_path.write_text('raise SystemExit(9)\n')
            return result
        with mock.patch.object(ap, '_pinned_bytes', side_effect=swap_after_check):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(len(self.admit_calls()), 1)  # the pinned (original) code ran, not the swapped file
        self.assertNotIn('hook failed', self.state_md())


class V16AdmitTests(HookCase):
    def setUp(self):
        super().setUp()
        self.row['_fam'] = []  # family step out of the way

    def test_disabled_by_empty_pin_keeps_the_hold(self):
        path = self.v16_script()
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.v16_calls(), [])
        self.assertTrue(path.exists())

    def test_half_pinned_is_disabled(self):
        path = self.v16_script()
        with mock.patch.object(ap, 'V16_ADMIT_PATH', str(path)):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.v16_calls(), [])

    def test_sha_mismatch_holds_and_never_executes(self):
        path = self.v16_script()
        self.pin(path, sha='0' * 64)
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.v16_calls(), [])
        self.assertIn('v16-admit sha256 differs from the pin; hold unchanged', self.state_md())

    def test_missing_file_holds(self):
        self.pin(self.root / 'nope', sha='1' * 64)
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertIn('missing, a symlink or unreadable', self.state_md())

    def test_relative_path_never_executes(self):
        path = self.v16_script()
        self.pin(path, sha=hashlib.sha256(path.read_bytes()).hexdigest())
        with mock.patch.object(ap, 'V16_ADMIT_PATH', os.path.relpath(path)):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.v16_calls(), [])
        self.assertIn('v16-admit path is not absolute', self.state_md())

    def test_group_writable_file_is_refused_even_with_right_hash(self):
        path = self.v16_script(mode=0o770)
        self.pin(path)
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(self.v16_calls(), [])

    def test_a_pin_problem_is_not_an_attempt(self):
        path = self.v16_script(exit_code=1)
        self.pin(path, sha='0' * 64)
        self.dispatch()
        self.assertNotIn('v16_admit_attempt', self.state())

    def test_exit_zero_is_rerouted_never_continued_on_the_legacy_path(self):
        path = self.v16_script(exit_code=0)
        self.pin(path)
        self.assertEqual(self.dispatch(), 'HOLD:v16_admitted_reroute')  # not 'PROCEEDS' (the legacy runtime_spec)
        self.assertEqual(self.v16_calls(), [[RID, '--basis', 'autopickup review-sha256 ' + REVIEW_SHA]])
        self.assertIn('v16-admit exit 0; the order is routed to its v1.6 evaluation', self.state_md())
        self.assertEqual(self.native_calls, [])
        self.assertEqual(self.state()['v16_admit_attempt']['kind'], 'admitted')

    def test_the_reroute_reason_is_transient_and_retried_without_backoff(self):
        self.assertIn('v16_admitted_reroute', ap.TRANSIENT_HOLD_REASONS)
        self.assertIn('v16_admit_retry', ap.TRANSIENT_HOLD_REASONS)
        self.assertIn('v16_admitted_reroute', ap.IMMEDIATE_RETRY_HOLD_REASONS)
        self.assertNotIn('v16_admit_retry', ap.IMMEDIATE_RETRY_HOLD_REASONS)

    def test_an_order_admitted_before_the_hook_is_not_rerouted_by_it(self):
        state = self.state()
        state['v16_profile_admission'] = {'verdict': 'ACCEPTED'}
        ap.save_state(state)
        self.assertEqual(self.dispatch(), 'PROCEEDS')  # unchanged: the guard passes, evaluate() would have routed it earlier
        self.assertEqual(self.v16_calls(), [])

    def test_pickup_never_writes_the_admission_key_itself(self):
        path = self.v16_script(exit_code=0, write_state=False)
        self.pin(path)
        self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertNotIn('v16_profile_admission', self.state())
        self.assertIn('exit 0 but no admission was recorded', self.state_md())

    def test_exit_one_holds_and_is_attempted_once_per_review_and_pin(self):
        path = self.v16_script(exit_code=1)
        self.pin(path)
        for _ in range(3):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(len(self.v16_calls()), 1)  # custody refused and routed the order to #22: never asked again
        self.assertIn('v16-admit exit 1', self.state_md())
        self.assertTrue(self.state()['v16_admit_attempt']['final'])

    def test_a_new_review_sha_or_a_new_pin_is_a_new_attempt(self):
        path = self.v16_script(exit_code=1)
        self.pin(path)
        self.dispatch()
        with mock.patch.object(ap, 'validate_review_gate', lambda j: {'source_pins': {}, 'review_sha256': 'c' * 64}):
            self.dispatch()
        self.assertEqual(len(self.v16_calls()), 2)
        path = self.v16_script(exit_code=1)
        path.write_text(path.read_text() + '# edited by custody\n')
        self.pin(path)
        self.dispatch()
        self.assertEqual(len(self.v16_calls()), 3)

    def test_timeout_is_a_transient_retry_and_stops_after_three_attempts(self):
        path = self.v16_script(exit_code=0, sleep=5)
        self.pin(path)
        with mock.patch.object(ap, 'V16_ADMIT_TIMEOUT_S', 0.3):
            self.assertEqual(self.dispatch(), 'HOLD:v16_admit_retry')
            self.assertEqual(self.dispatch(), 'HOLD:v16_admit_retry')
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')  # third attempt: then today's hold
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertEqual(len(self.v16_calls()), 3)
        self.assertIn('v16-admit timeout after 0.3s; retried later (attempt 1 of 3)', self.state_md())
        self.assertIn('attempt 3 of 3, no more', self.state_md())
        self.assertNotIn('v16_profile_admission', self.state())

    def test_oserror_is_retried_like_a_timeout(self):
        path = self.v16_script(exit_code=0)
        self.pin(path)
        with mock.patch.object(ap.subprocess, 'Popen', side_effect=PermissionError(13, 'Permission denied')):
            self.assertEqual(self.dispatch(), 'HOLD:v16_admit_retry')
        self.assertIn('could not run: Permission denied; retried later', self.state_md())

    def test_a_timeout_kills_the_whole_process_group(self):
        marker = self.root / 'grandchild-wrote'
        path = self.v16_script(exit_code=0, sleep=5, grandchild_marker=marker)
        self.pin(path)
        with mock.patch.object(ap, 'V16_ADMIT_TIMEOUT_S', 0.5):
            self.assertEqual(self.dispatch(), 'HOLD:v16_admit_retry')
        import time
        time.sleep(2.5)  # the grandchild would have written its marker after 2 s
        self.assertFalse(marker.exists())

    def test_runs_in_its_own_session(self):
        path = self.v16_script(exit_code=0)
        self.pin(path)
        seen = {}
        real = ap.subprocess.Popen

        def spy(*args, **kwargs):
            seen.update(kwargs)
            return real(*args, **kwargs)
        with mock.patch.object(ap.subprocess, 'Popen', side_effect=spy):
            self.dispatch()
        self.assertIs(seen.get('start_new_session'), True)
        self.assertEqual(sorted(seen['env']), ['AGENT_BOARD_NAME', 'HOME', 'PATH'])
        self.assertEqual(seen['stdin'], ap.subprocess.DEVNULL)

    def test_not_for_ineligible_orders_other_benchmarks_or_already_admitted(self):
        path = self.v16_script(exit_code=0)
        self.pin(path)
        for name, change in {'refunded': {'refunded_at': 'x'}, 'unpaid': {'paid_at': None},
                             'synthetic': {'synthetic_test': True}, 'image_only': {'benchmarks': ['imagejevbench']}}.items():
            with self.subTest(name):
                row = dict(self.row, **change)
                with mock.patch.object(ap, 'load_row', lambda rid: row):
                    self.dispatch_ignoring_errors()
        self.assertEqual(self.v16_calls(), [])

    def test_a_row_missing_a_gate_column_never_reaches_custody(self):
        path = self.v16_script(exit_code=0)
        self.pin(path)
        for column in ('status', 'stripe_mode', 'synthetic_test', 'paid_at', 'result_delivered_at', 'refund_id', 'refunded_at',
                       'refund_status'):
            with self.subTest(column):
                row = {key: value for key, value in self.row.items() if key != column}
                with mock.patch.object(ap, 'load_row', lambda rid: row):
                    self.dispatch_ignoring_errors()
        self.assertEqual(self.v16_calls(), [])

    def test_hook_errors_never_break_dispatch(self):
        path = self.v16_script(exit_code=0)
        self.pin(path)
        with mock.patch.object(ap, '_run_v16_admit', side_effect=RuntimeError('boom')):
            self.assertEqual(self.dispatch(), 'HOLD:official_method_retired_requires_admission')
        self.assertIn('v16 admission step failed: RuntimeError', self.state_md())


if __name__ == '__main__':
    unittest.main()
