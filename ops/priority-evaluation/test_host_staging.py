"""Host staging tests use only local synthetic data and an in-memory provider."""
import copy
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import unittest
from unittest import mock

import measurement_dispatch as md
import pod_runner as pr
import test_paid_native_order as fixtures
from test_autopickup import _FakeProvider

RID = '00000000-0000-4000-8000-000000000088'


class HostFake(_FakeProvider):
    def __init__(self, failure=None):
        super().__init__()
        self.failure = failure
        self.commands = []
        self.ceilings = []

    def create(self, gpu, ttl_hours, budget, max_hourly=None):
        self.ceilings.append(max_hourly)
        return super().create(gpu, ttl_hours, budget)

    def exec(self, pod, command, timeout=600):
        self.commands.append((command, timeout))
        out = None
        if command[:2] == ['docker', 'build'] and self.failure == 'build':
            return subprocess.CompletedProcess(command, 1, '', 'synthetic build failure')
        if command[:3] == ['docker', 'image', 'inspect'] and command[-1] == '{{.Id}}':
            out = 'sha256:' + 'b' * 64 + '\n'
        elif command[-4:] == ['-m', 'pip', 'freeze', '--all']:
            out = {'credential': 'x @ https://user:secret@example.invalid/x\n',
                   'otherfile': 'x @ file:///etc/passwd\n',
                   'kernelwheel': 'torch==2.8.0\ncausal-conv1d @ file:///tmp/kernel-wheels/causal_conv1d-1.7.0-cp312-cp312-linux_x86_64.whl\n'
                                  'einops @ file:///tmp/kernel-wheels/einops-0.8.1-py3-none-any.whl#sha256=' + 'e' * 64 + '\n',
                   'wheelfragment': 'x @ file:///tmp/kernel-wheels/x-1.0-py3-none-any.whl#egg=x\n',
                   'wheelquery': 'x @ file:///tmp/kernel-wheels/x-1.0-py3-none-any.whl?token=secret\n',
                   }.get(self.failure, 'torch==2.8.0\n')
        elif command[:2] == ['docker', 'run'] and '-I' in command and '-S' in command and '-e' in command:
            out = 'BASE /usr/lib/python3/site-packages\n' + ('HIT /usr/lib/python3/site-packages/aplomb_evil\n' if self.failure == 'origin' else '')
        elif command[:2] == ['docker', 'run'] and '-I' in command:
            raise AssertionError('the origin scan must run with -S (no site/.pth/sitecustomize execution)')
        elif command[:3] in (['docker', 'inspect', 'jev-pod-run'], ['docker', 'image', 'inspect']) and command[-1] == '{{json .Config.Env}}':
            env = ['PATH=/usr/bin', 'HF_TOKEN=', 'OPENAI_API_KEY=', 'HF_HUB_OFFLINE=1']
            if self.failure == 'envsecret':
                env.append('MY_SERVICE_PASSWORD=x')
            if self.failure == 'envtoken':
                env[1] = 'HF_TOKEN=hf_leak'
            out = json.dumps(env)
        elif command[:3] == ['env', 'LC_ALL=C', 'stat'] and command[-2] == '%F:%s' and command[-1].startswith('/work/out/'):
            out = {'bigoutput': 'regular file:%d\n' % 10 ** 12, 'symout': 'symbolic link:40\n'}.get(self.failure, 'regular file:8\n')
        elif command[:3] == ['docker', 'inspect', 'jev-pod-run'] and command[-1] == '{{json .HostConfig}}':
            out = json.dumps({'NetworkMode': 'none', 'Binds': ['/models:/models:ro'], 'Privileged': False, 'CapAdd': None,
                              'ReadonlyRootfs': False, 'Devices': [], 'PidMode': '', 'IpcMode': 'private', 'UsernsMode': '', 'Env': ['SECRET=1']})
        elif command[0] == 'find':
            if '! ' in ' '.join(command):
                out = '/models/torchcast/link\n' if self.failure == 'symlink' else ''
            else:
                out = '/models/torchcast/model.safetensors\n'
                if self.failure == 'extra':
                    out += '/models/torchcast/extra\n'
        elif command[0] == 'stat':
            out = '9\n' if self.failure == 'size' else '8\n'
        elif command[0] == 'sha256sum' and self.failure == 'hash':
            out = '0' * 64 + '  file\n'
        if out is not None:
            self.calls.append(('exec', pod, command[:3]))
            return subprocess.CompletedProcess(command, 0, out, '')
        return super().exec(pod, command, timeout)

    def scp_from(self, pod, remote, local):
        if '/jevbench/' in remote:
            Path(local).write_text('{"fixture":1}\n{"fixture":2}\n' if remote.endswith('raw.jsonl') else '{"rows":2}')
        else:
            super().scp_from(pod, remote, local)


class HostStagingTests(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.NativeOrderTests()
        self.fixture.setUp()
        self.root, self.job, self.pins = self.fixture.root, self.fixture.job, self.fixture.pins
        self.recipe = copy.deepcopy(self.fixture.recipe)
        self.context = self.root / 'context.tar'
        with tarfile.open(self.context, 'w') as archive:
            info = tarfile.TarInfo('Dockerfile')
            content = b'FROM synthetic AS optimized\n'
            info.size = len(content)
            archive.addfile(info, io.BytesIO(content))
        context_sha = hashlib.sha256(self.context.read_bytes()).hexdigest()
        self.recipe['host_staging'] = {
            'weights_manifest': [{'path': 'model.safetensors', 'sha256': self.recipe['weights'][0]['sha256']['model.safetensors'], 'size': 8}],
            'image_build': {'context_sha256': context_sha, 'target': 'optimized', 'tag': 'aplomb-runtime:' + context_sha[:12]}}
        self.rehash()
        self.stream_calls = []

        def streamer(provider, pod_id, manifest, remote_root):
            self.stream_calls.append((pod_id, manifest, remote_root))
            statefile = self.root / 'pods' / (RID + '.json')
            if statefile.exists():
                state = json.loads(statefile.read_text())
                self.assertFalse(state['input_dispatched'])
                self.assertFalse(state['execution_started'])
        streamer.sha256 = 'c' * 64
        self.streamer = streamer
        self.acceptance_path = self.job / 'source/HOST-STAGING-ACCEPTANCE.json'
        self.acceptance = {'schema_version': 1, 'request_id': RID,
            'model_commit': self.recipe['weights'][0]['revision'],
            'weights_manifest_sha256': self.recipe['host_staging']['weights_manifest_sha256'],
            'image_context_sha256': context_sha, 'streamer_sha256': streamer.sha256,
            'accepted_by': 'synthetic reviewer', 'accepted_at': '2026-10-09T00:00:00Z'}
        self.write_acceptance()
        path = self.job / 'source/FETCH-RECEIPT-model.json'
        record = json.loads(path.read_text())
        record['credential_repository'] = 'synthetic-secret-do-not-persist'
        path.write_text(json.dumps(record))
        requests = self.root / 'state/requests'
        requests.mkdir(parents=True)
        (requests / (RID + '.json')).write_text('{}')

    def tearDown(self):
        self.fixture.tearDown()

    def rehash(self):
        stage = self.recipe['host_staging']
        stage['weights_manifest_sha256'] = hashlib.sha256(json.dumps(sorted(stage['weights_manifest'], key=lambda e: e['path']), sort_keys=True, separators=(',', ':')).encode()).hexdigest()

    def write_acceptance(self):
        self.acceptance_path.write_text(json.dumps(self.acceptance))
        self.acceptance_path.chmod(0o600)

    def run_recipe(self, fake, **kwargs):
        options = dict(image_context_provider=lambda job: self.context, weights_streamer=self.streamer)
        options.update(kwargs)
        with mock.patch.object(pr, 'PODS_DIR', self.root / 'pods'), \
             mock.patch.object(pr, 'STATE_ROOT', self.root / 'state'), \
             mock.patch.object(md, 'pins', return_value=self.pins), \
             mock.patch.object(pr.native_admission, 'validate_native_admission', return_value='a' * 64):
            return pr.run(RID, self.job, self.recipe, self.root / 'out', self.pins, 20,
                provider=fake, alert=lambda text: None, native_source_pins={'official_measurement': self.pins}, **options)

    def lifecycle(self, fake, ttl=3, **kwargs):
        state = {'host_staging': {}}
        options = dict(job_dir=self.job, image_context_provider=lambda job: self.context, weights_streamer=self.streamer)
        options.update(kwargs)
        (self.root / 'out').mkdir(exist_ok=True)
        with mock.patch.object(pr, 'PODS_DIR', self.root / 'pods'):
            try:
                pr._lifecycle(fake, 'synthetic', self.recipe, self.root / 'stage.tar', self.root / 'out',
                    state, ('H100', 80), ttl, 20, lambda text: None, lambda: None, **options)
            finally:
                self.last_state = state

    def test_valid_schema(self):
        self.assertIs(pr.validate_recipe(self.recipe, self.job), self.recipe)

    def test_schema_reject_matrix(self):
        original = copy.deepcopy(self.recipe)
        changes = [
            lambda r: r.update(kind='python_inprocess'),
            lambda r: r['host_staging'].update(unknown=1),
            lambda r: r.update(host_staging=None),
            lambda r: r['host_staging'].update(weights_manifest=[]),
            lambda r: r['host_staging'].update(weights_manifest=[r['host_staging']['weights_manifest'][0]] * 17),
            lambda r: r['host_staging']['weights_manifest'][0].update(extra=1),
            lambda r: r['host_staging']['image_build'].update(extra=1),
            lambda r: r['host_staging']['image_build'].update(target='base'),
            lambda r: r['host_staging']['image_build'].update(tag='aplomb-runtime:000000000000'),
            lambda r: r['host_staging']['image_build'].update(context_sha256='bad'),
            lambda r: r.update(image='unreviewed:latest'),
            lambda r: r['host_staging'].update(weights_manifest_sha256='0' * 64),
            lambda r: r['host_staging']['weights_manifest'].append(copy.deepcopy(r['host_staging']['weights_manifest'][0]))]
        for change in changes:
            self.recipe = copy.deepcopy(original)
            change(self.recipe)
            with self.subTest(change=change), self.assertRaisesRegex(md.OperationalHold, 'pod_recipe_invalid'):
                pr.validate_recipe(self.recipe, self.job)
        for path in ('../x', '/x', './x', 'a//b', 'a/../b', 'a/', '', 'x\n', 'a\\b'):
            self.recipe = copy.deepcopy(original)
            self.recipe['host_staging']['weights_manifest'][0]['path'] = path
            self.rehash()
            with self.subTest(path=path), self.assertRaisesRegex(md.OperationalHold, 'pod_recipe_invalid'):
                pr.validate_recipe(self.recipe, self.job)
        for field, values in (('size', [-1, True, 1.0, '8']), ('sha256', ['bad', 'A' * 64, 2])):
            for value in values:
                self.recipe = copy.deepcopy(original)
                self.recipe['host_staging']['weights_manifest'][0][field] = value
                self.rehash()
                with self.subTest(field=field, value=value), self.assertRaisesRegex(md.OperationalHold, 'pod_recipe_invalid'):
                    pr.validate_recipe(self.recipe, self.job)
        self.recipe = copy.deepcopy(original)
        self.recipe['weights'][0]['sha256']['extra'] = 'd' * 64
        with self.assertRaisesRegex(md.OperationalHold, 'pod_recipe_invalid'):
            pr.validate_recipe(self.recipe, self.job)

    def test_acceptance_missing_or_mismatched_blocks_before_reservation(self):
        original = dict(self.acceptance)
        for field in original:
            self.acceptance = dict(original)
            self.acceptance[field] = None
            self.write_acceptance()
            fake = HostFake()
            with self.subTest(field=field), self.assertRaisesRegex(md.OperationalHold, 'host_staging_unaccepted'):
                self.run_recipe(fake)
            self.assertEqual(fake.calls, [])
        for field, value in [('model_commit', 'f' * 40), ('request_id', 'other'), ('streamer_sha256', 'a' * 64),
                ('weights_manifest_sha256', 'b' * 64), ('image_context_sha256', 'b' * 64),
                ('accepted_by', ' '), ('accepted_at', '2026-10-09'), ('schema_version', True)]:
            self.acceptance = dict(original)
            self.acceptance[field] = value
            self.write_acceptance()
            with self.subTest(field=field), self.assertRaisesRegex(md.OperationalHold, 'host_staging_unaccepted'):
                self.run_recipe(HostFake())
        self.acceptance_path.unlink()
        with self.assertRaisesRegex(md.OperationalHold, 'host_staging_unaccepted'):
            self.run_recipe(HostFake())

    def test_acceptance_strict_json_and_host_ownership(self):
        for raw in ('[]', '{}', '{"schema_version":1,"schema_version":1}', '{'):
            self.acceptance_path.write_text(raw)
            with self.subTest(raw=raw), self.assertRaisesRegex(md.OperationalHold, 'host_staging_unaccepted'):
                self.run_recipe(HostFake())
        self.write_acceptance()
        self.acceptance_path.chmod(0o666)
        with self.assertRaisesRegex(md.OperationalHold, 'host_staging_unaccepted'):
            self.run_recipe(HostFake())
        self.acceptance_path.unlink()
        self.acceptance_path.symlink_to(self.context)
        with self.assertRaisesRegex(md.OperationalHold, 'host_staging_unaccepted'):
            self.run_recipe(HostFake())

    def test_streamer_missing_fails_closed_without_upload_or_pod(self):
        fake = HostFake()
        with self.assertRaisesRegex(pr.PodRunError, 'weights_streamer_not_configured'):
            self.run_recipe(fake, weights_streamer=None)
        self.assertEqual(fake.calls, [])
        with self.assertRaisesRegex(pr.PodRunError, 'weights_streamer_not_configured'):
            self.lifecycle(fake, weights_streamer=None)
        self.assertEqual(fake.removed, ['pod-1'])
        self.assertFalse(any(call[0] == 'scp_to' for call in fake.calls))

    def test_build_context_hash_mismatch_tears_down_before_upload(self):
        self.context.write_bytes(b'wrong synthetic context')
        fake = HostFake()
        with self.assertRaisesRegex(pr.PodRunError, 'image_build_context_sha256_mismatch'):
            self.lifecycle(fake)
        self.assertEqual(fake.removed, ['pod-1'])
        self.assertFalse(any(call[0] == 'scp_to' for call in fake.calls))
        self.assertFalse(self.last_state['input_dispatched'])

    def test_pre_dispatch_failures_teardown_and_preserve_charge(self):
        for failure, reason in [('extra', 'file_set'), ('symlink', 'non_regular'), ('size', 'size_mismatch'),
                ('hash', 'sha256_mismatch'), ('build', 'pod exec failed'), ('credential', 'pip_freeze_unsafe'), ('otherfile', 'pip_freeze_unsafe'),
                ('wheelfragment', 'pip_freeze_unsafe'), ('wheelquery', 'pip_freeze_unsafe')]:
            fake = HostFake(failure)
            with self.subTest(failure=failure), self.assertRaisesRegex(pr.PodRunError, reason):
                self.lifecycle(fake)
            self.assertEqual(fake.removed, ['pod-1'])
            self.assertFalse(self.last_state['input_dispatched'])
            self.assertFalse(self.last_state['execution_started'])
            self.assertEqual(self.last_state['creation_attempts'], 1)
            self.assertAlmostEqual(self.last_state['spent_upper_bound_usd'], 3 * 1.30)
            self.assertFalse(any(c[0] == 'scp_to' and c[2] == '/work/stage.tar' for c in fake.calls))

    def test_large_unsorted_manifest_with_empty_file_validates_and_hash_is_order_independent(self):
        weights = self.recipe['weights'][0]['sha256']
        entries = [{'path': 'f%03d.json' % i, 'sha256': '%064x' % (i + 7), 'size': 0 if i == 3 else i + 1} for i in range(60)]
        entries.append({'path': 'model.safetensors', 'sha256': weights['model.safetensors'], 'size': 8})
        entries.reverse()
        self.recipe['host_staging']['weights_manifest'] = entries
        self.recipe['weights'][0]['sha256'] = {e['path']: e['sha256'] for e in entries}
        self.rehash()
        pr.validate_recipe(self.recipe, self.job)
        shuffled = list(reversed(entries))
        digest = hashlib.sha256(json.dumps(sorted(shuffled, key=lambda e: e['path']), sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        self.assertEqual(digest, self.recipe['host_staging']['weights_manifest_sha256'])

    def test_streamer_non_podrunerror_is_wrapped_without_text(self):
        def boom(*a, **k):
            raise OSError('/secret/path/token-file leaked?')
        fake = HostFake()
        with self.assertRaises(pr.PodRunError) as cm:
            self.lifecycle(fake, weights_streamer=boom)
        self.assertEqual(str(cm.exception), 'host_weights_stream_failed')
        self.assertEqual(fake.removed, ['pod-1'])

    def test_context_provider_exception_is_wrapped(self):
        def boom(job):
            raise KeyError('/secret')
        fake = HostFake()
        with self.assertRaisesRegex(pr.PodRunError, 'image_build_context_unavailable'):
            self.lifecycle(fake, image_context_provider=boom)
        self.assertEqual(fake.removed, ['pod-1'])

    def test_missing_context_provider_blocks_before_any_pod(self):
        fake = HostFake()
        with self.assertRaisesRegex(pr.PodRunError, 'image_context_provider_not_configured'):
            self.run_recipe(fake, image_context_provider=None)
        self.assertFalse(any(c[0] == 'create' for c in fake.calls))

    def test_provider_price_ceiling_is_the_pinned_price_for_host_staged_recipes(self):
        fake = HostFake()
        self.run_recipe(fake)
        self.assertEqual(fake.ceilings, [self.recipe['hourly_usd']])
        self.assertLess(self.recipe['hourly_usd'], pr.MAX_HOURLY_USD)

    def test_successful_run_charge_equals_ttl_times_the_provider_ceiling(self):
        # The provider ceiling equals the accounted rate, so the recorded upper bound cannot be exceeded.
        fake = HostFake()
        self.run_recipe(fake)
        state = json.loads((self.root / 'pods' / (RID + '.json')).read_text())
        self.assertAlmostEqual(state['spent_upper_bound_usd'], state['attempt_ttl_hours'] * fake.ceilings[0])

    def test_lium_create_forwards_the_ceiling_in_both_argv_forms_and_rejects_bad_ceilings(self):
        seen = []
        def fake_cli(argv, timeout=600, input_text=None):
            seen.append(list(argv))
            if argv[1:2] == ['ps'] or 'ps' in argv[:3]:
                return subprocess.CompletedProcess(argv, 0, '[]', '')
            return subprocess.CompletedProcess(argv, 1, '', '')
        provider = pr.LiumProvider()
        for placement in (None, {'gpu': 'RTXPRO6000', 'gpu_count': 1, 'quoted_at': pr._utcnow().isoformat(), 'hourly_usd': 1.19}):
            seen.clear(); provider._placement = placement
            with mock.patch.object(pr, '_run_cli', fake_cli), self.assertRaises(Exception):
                provider.create('RTXPRO6000', 3.0, 20.0, max_hourly=1.3)
            ups = [a for a in seen if any(str(x).endswith('lium_bounded_up.py') for x in a)]
            self.assertEqual(len(ups), 1)
            self.assertEqual(ups[0][-1], '1.3')
        for bad in (True, 0, -1, 5.01, float('nan'), '1.3'):
            with self.assertRaisesRegex(pr.PodRunError, 'invalid provider price ceiling'):
                provider.create('RTXPRO6000', 3.0, 20.0, max_hourly=bad)

    def test_followup_evidence_origin_listing_env_names_and_output_limits(self):
        receipt = self.run_recipe(HostFake())
        ev = receipt['host_staging']
        self.assertEqual(ev['module_origin_listing_sha256'], hashlib.sha256(b'BASE /usr/lib/python3/site-packages\n').hexdigest())
        self.assertEqual(ev['run_container']['env_names'], ['HF_HUB_OFFLINE', 'HF_TOKEN', 'OPENAI_API_KEY', 'PATH'])
        self.assertNotIn('hf_leak', json.dumps(receipt))
        self.assertEqual(ev['image_env_names'], ['HF_HUB_OFFLINE', 'HF_TOKEN', 'OPENAI_API_KEY', 'PATH'])

    def test_followup_failures_hold_and_tear_down_before_sealed_input_or_results(self):
        for failure, reason, dispatched in [('origin', 'image_contains_customer_package', False),
                                            ('envsecret', 'run_container_env_secret_name', False),
                                            ('envtoken', 'run_container_env_secret_name', False),
                                            ('bigoutput', 'host_output_too_large', True),
                                            ('symout', 'host_output_not_regular', True)]:
            fake = HostFake(failure)
            # After sealed dispatch a failure is a reconciliation hold (partial output is never resumed or rerun).
            error, pattern = (md.OperationalHold, 'partial_measurement_requires_reconciliation') if dispatched else (pr.PodRunError, reason)
            with self.subTest(failure=failure), self.assertRaisesRegex(error, pattern):
                self.lifecycle(fake)
            self.assertEqual(fake.removed, ['pod-1'])
            self.assertEqual(self.last_state['input_dispatched'], dispatched)

    def test_hf_disable_implicit_token_switch_is_allowed_only_as_1(self):
        self.assertEqual(pr._env_names_checked(json.dumps(['PATH=/usr/bin', 'HF_HUB_DISABLE_IMPLICIT_TOKEN=1'])),
                         ['HF_HUB_DISABLE_IMPLICIT_TOKEN', 'PATH'])
        for value in ('0', 'hf_leak', ''):
            with self.subTest(value=value), self.assertRaisesRegex(pr.PodRunError, 'run_container_env_secret_name'):
                pr._env_names_checked(json.dumps(['HF_HUB_DISABLE_IMPLICIT_TOKEN=' + value]))

    def test_long_output_line_is_refused(self):
        with mock.patch.object(pr, 'HOST_MAX_LINE_BYTES', 5), self.assertRaisesRegex(md.OperationalHold, 'partial_measurement_requires_reconciliation'):
            self.lifecycle(HostFake())

    def scan(self, d, extra_env=None, cwd=None, code_prefix=''):
        import subprocess as sp, os as _os
        env = {'PATH': '/usr/bin:/bin'}
        env.update(extra_env or {})
        return sp.run(['python3', '-I', '-S', '-c', code_prefix + pr.ORIGIN_SNIPPET], capture_output=True, text=True,
                      cwd=cwd or d, env=env)

    def test_origin_snippet_finds_names_pth_relative_paths_zip_pythonhome_cwd_without_executing_anything(self):
        import tempfile, os as _os, zipfile
        d = tempfile.mkdtemp(); marker = _os.path.join(d, 'EXECUTED'); clean_cwd = tempfile.mkdtemp()
        site = _os.path.join(d, 'site')
        _os.makedirs(_os.path.join(site, 'extra', 'aplomb'))
        open(_os.path.join(site, 'Run_Aplomb.py'), 'w').write('')
        open(_os.path.join(site, 'evil.pth'), 'w').write('import os; open(%r, "w").write("x")\nextra\n' % marker)  # relative path line
        open(_os.path.join(site, 'sitecustomize.py'), 'w').write('open(%r, "w").write("x")\n' % marker)
        prefix = 'import sys;sys.path.insert(0, %r)\n' % site
        r = self.scan(d, cwd=clean_cwd, code_prefix=prefix)
        self.assertEqual(r.returncode, 0, r.stderr)
        hits = [l for l in r.stdout.splitlines() if l.startswith('HIT ')]
        self.assertTrue(any(h.endswith('Run_Aplomb.py') for h in hits), r.stdout)
        self.assertTrue(any(h.endswith(_os.path.join('extra', 'aplomb')) for h in hits), r.stdout)  # reached via the RELATIVE .pth line
        self.assertTrue(any(l.startswith('CODE ') and 'sitecustomize' in l for l in r.stdout.splitlines()), r.stdout)
        self.assertTrue(any(l.startswith('CODE pth:evil.pth') for l in r.stdout.splitlines()), r.stdout)
        self.assertFalse(_os.path.exists(marker), 'scan executed image code')
        # zip on sys.path
        z = _os.path.join(d, 'x.zip'); zipfile.ZipFile(z, 'w').close()
        r = self.scan(d, cwd=clean_cwd, code_prefix='import sys;sys.path.insert(0, %r)\n' % z)
        self.assertIn('HIT nondir:' + _os.path.realpath(z), r.stdout)
        # PYTHONHOME
        r = self.scan(d, cwd=clean_cwd, extra_env={'PYTHONHOME': '/usr'})
        self.assertIn('HIT env:PYTHONHOME', r.stdout)
        # working directory with aplomb/
        wd = tempfile.mkdtemp(); _os.makedirs(_os.path.join(wd, 'aplomb'))
        r = self.scan(d, cwd=wd)
        self.assertTrue(any(l.startswith('HIT ') and l.endswith('aplomb') for l in r.stdout.splitlines()), r.stdout)
        # clean run
        clean = self.scan(d, cwd=clean_cwd)
        self.assertEqual(clean.returncode, 0, clean.stderr)
        self.assertFalse([l for l in clean.stdout.splitlines() if l.startswith('HIT ')], clean.stdout)
        self.assertTrue(any(l.startswith('BASE ') for l in clean.stdout.splitlines()))

    def test_ttl_too_short_holds_before_any_provider_call(self):
        fake = HostFake()
        with self.assertRaisesRegex(md.OperationalHold, 'host_staging_ttl_too_short'):
            self.lifecycle(fake, ttl=2.5)
        self.assertEqual(fake.calls, [])

    def test_late_staging_refuses_sealed_dispatch_and_tears_down(self):
        from datetime import timedelta
        fake = HostFake()
        late = pr._utcnow() + timedelta(hours=3)
        with mock.patch.object(pr, '_utcnow', return_value=late), \
             self.assertRaisesRegex(pr.PodRunError, 'host_staging_ttl_margin_insufficient'):
            self.lifecycle(fake)
        self.assertEqual(fake.removed, ['pod-1'])
        self.assertFalse(self.last_state['input_dispatched'])
        self.assertFalse(any(c[0] == 'scp_to' and c[2] == '/work/stage.tar' for c in fake.calls))

    def test_kernel_wheel_direct_url_in_freeze_is_allowed(self):
        receipt = self.run_recipe(HostFake('kernelwheel'))
        self.assertIn('causal-conv1d @ file:///tmp/kernel-wheels/', receipt['host_staging']['pip_freeze'])

    def test_streamer_exception_tears_down_before_dispatch(self):
        def broken(*args, **kwargs):
            raise pr.PodRunError('synthetic streamer failure')
        fake = HostFake()
        with self.assertRaisesRegex(pr.PodRunError, 'synthetic streamer failure'):
            self.lifecycle(fake, weights_streamer=broken)
        self.assertFalse(self.last_state['input_dispatched'])
        self.assertEqual(fake.removed, ['pod-1'])

    def test_success_records_hashes_image_and_freeze_uses_built_image(self):
        fake = HostFake()
        receipt = self.run_recipe(fake)
        state = json.loads((self.root / 'pods' / (RID + '.json')).read_text())
        evidence = receipt['host_staging']
        self.assertEqual(evidence, state['host_staging'])
        self.assertEqual(evidence['image_id'], 'sha256:' + 'b' * 64)
        self.assertEqual(evidence['pip_freeze'], 'torch==2.8.0\n')
        self.assertEqual(evidence['pip_freeze_sha256'], hashlib.sha256(evidence['pip_freeze'].encode()).hexdigest())
        self.assertEqual(evidence['acceptance_receipt_sha256'], hashlib.sha256(self.acceptance_path.read_bytes()).hexdigest())
        self.assertEqual(evidence['image_context_sha256'], hashlib.sha256(self.context.read_bytes()).hexdigest())
        self.assertEqual(evidence['weights_manifest_sha256'], self.recipe['host_staging']['weights_manifest_sha256'])
        self.assertNotIn('synthetic-secret-do-not-persist', json.dumps([receipt, state]))
        self.assertEqual(evidence['run_container']['NetworkMode'], 'none')
        self.assertEqual(evidence['run_container']['Privileged'], False)
        self.assertNotIn('Env', evidence['run_container'])
        self.assertEqual(self.stream_calls[0][2], '/models/torchcast')
        self.assertFalse(any(c[:2] == ['docker', 'pull'] or pr.WEIGHTS_SNIPPET in c for c, timeout in fake.commands))
        build = next((c, timeout) for c, timeout in fake.commands if c[:2] == ['docker', 'build'])
        self.assertEqual(build[1], pr.HOST_BUILD_TIMEOUT_S)
        run = next(c for c, timeout in fake.commands if c[:3] == ['docker', 'run', '-d'])
        self.assertEqual(run[-2], self.recipe['host_staging']['image_build']['tag'])
        self.assertEqual(run[run.index('--network') + 1], 'none')
        self.assertEqual(fake.removed, ['pod-1'])
        self.assertEqual(fake.next_pod, 1)
        self.assertEqual(receipt['benchmarks']['jevbench']['host_staging'], evidence)

    def test_host_failure_second_attempt_keeps_full_ttl_at_pinned_price_and_caps(self):
        # Host-staged recipes account TTL and the upper-bound charge at the pinned hourly price (1.30 here), so a
        # failed staging attempt does not starve the one permitted fresh-pod retry (original caps unchanged).
        fake = HostFake('size')
        with self.assertRaisesRegex(md.OperationalHold, 'gpu_pod_run_failed'):
            self.run_recipe(fake)
        state = json.loads((self.root / 'pods' / (RID + '.json')).read_text())
        self.assertEqual(fake.removed, ['pod-1', 'pod-2'])
        self.assertEqual(state['creation_attempts'], 2)
        self.assertAlmostEqual(state['spent_upper_bound_usd'], 2 * 3 * 1.30)
        self.assertLessEqual(state['spent_upper_bound_usd'], 20)
        self.assertAlmostEqual(state['attempt_ttl_hours'], 3)
        self.assertFalse(state['input_dispatched'])
        self.assertFalse(state['execution_started'])
        with self.assertRaises(md.OperationalHold):
            self.run_recipe(fake)
        self.assertEqual(fake.next_pod, 2)  # no third creation

    def test_legacy_recipes_keep_the_five_dollar_ceiling_accounting(self):
        self.assertEqual(pr._attempt_rate({'kind': 'aplomb_native', 'hourly_usd': 1.3}), pr.MAX_HOURLY_USD)
        self.assertEqual(pr._attempt_rate({'host_staging': {}, 'hourly_usd': 1.3}), 1.3)
        for bad in (True, 0, -1, 5.01, '1.3', None):
            self.assertEqual(pr._attempt_rate({'host_staging': {}, 'hourly_usd': bad}), pr.MAX_HOURLY_USD)

    def test_admission_and_quote_gates_still_hold_without_input_upload(self):
        fake = HostFake()
        with mock.patch.object(pr, 'STATE_ROOT', self.root / 'state'), \
             mock.patch.object(md, 'pins', return_value=self.pins), \
             self.assertRaisesRegex(md.OperationalHold, 'native_admission_pin_mismatch'):
            pr.run(RID, self.job, self.recipe, self.root / 'out', self.pins, 20,
                provider=fake, weights_streamer=self.streamer, image_context_provider=lambda job: self.context)
        self.assertEqual(fake.calls, [])
        self.recipe['hourly_usd'] = 1.0  # live pod price 1.30 is DEARER than the pin: hold + teardown
        with self.assertRaisesRegex(md.OperationalHold, 'gpu_pod_quote_changed'):
            self.lifecycle(fake)
        self.assertFalse(any(c[0] == 'scp_to' for c in fake.calls))
        self.assertEqual(fake.removed, ['pod-1'])

    def test_cheaper_live_node_than_the_pin_is_accepted_for_host_staged_recipes(self):
        self.recipe['hourly_usd'] = 2.0  # live 1.30 <= pin: real spend stays below the recorded bound
        fake = HostFake()
        receipt = self.run_recipe(fake)
        self.assertEqual(fake.ceilings, [2.0])
        self.assertEqual(fake.removed, ['pod-1'])
        self.assertIn('host_staging', receipt)

    def test_acceptance_drift_cannot_reuse_completed_receipt(self):
        fake = HostFake()
        self.run_recipe(fake)
        self.acceptance['accepted_by'] = 'second synthetic reviewer'
        self.write_acceptance()
        with self.assertRaisesRegex(md.OperationalHold, 'existing_measurement_receipt_changed'):
            self.run_recipe(fake)
        self.assertEqual(fake.next_pod, 1)

    def test_unsafe_context_tar_fails_before_upload(self):
        with tarfile.open(self.context, 'w') as archive:
            member = tarfile.TarInfo('../escape')
            archive.addfile(member, io.BytesIO(b''))
        self.recipe['host_staging']['image_build']['context_sha256'] = hashlib.sha256(self.context.read_bytes()).hexdigest()
        fake = HostFake()
        with self.assertRaisesRegex(pr.PodRunError, 'image_build_context_unsafe'):
            self.lifecycle(fake)
        self.assertFalse(any(c[0] == 'scp_to' for c in fake.calls))
        self.assertEqual(fake.removed, ['pod-1'])

    def test_legacy_gated_hold_and_pull_path_unchanged(self):
        del self.recipe['host_staging']
        fake = HostFake()
        with self.assertRaisesRegex(md.OperationalHold, 'gated_weights_require_host_acquisition'):
            self.run_recipe(fake)
        self.assertEqual(fake.calls, [])
        fake = _FakeProvider({'sha_bad': True})
        with self.assertRaises(pr.PodRunError):
            self.lifecycle(fake)
        self.assertTrue(any(c[0] == 'exec' and c[2][:2] == ['docker', 'pull'] for c in fake.calls))
        self.assertTrue(any(c[0] == 'exec' and c[2] == ['docker', 'image', 'inspect'] for c in fake.calls))


if __name__ == '__main__':
    unittest.main()
