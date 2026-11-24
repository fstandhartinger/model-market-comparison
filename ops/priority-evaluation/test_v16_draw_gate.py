"""CR-857 (b)+(c): the draw-pinning source-review gate and the re-entry of orders held under
`official_method_retired_requires_admission`.

Synthetic temp fixtures only: a fake RESERVATIONS.json, an admission registry, draw reference files built from the tree's own
pod_driver_v16.py, and a job folder without a git source. custody's real file, the sealed folder, the installed runtime, the
database and the network are never touched (v16_profiles.ROTATION_TOOL is patched to a temp file)."""
from __future__ import annotations

import hashlib
import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

import autopickup as ap
import measurement_dispatch
import official_scoring
import official_scoring_v16
import order_admission_registry
import v16_profiles

HERE = Path(__file__).resolve().parent
RID = 'aaaaaaaa-1111-4222-8333-444444444444'
FAMILY, MODULE = 'cue_reflex', 'cue_reflex_runtime_supplement.py'
DRIVER = HERE / 'pod_drivers' / 'pod_driver_v16.py'
PAST = '2020-01-01T00:00:00Z'
FUTURE = '2099-01-01T00:00:00Z'


def sha(path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_atomic(path: Path, text: str, mode: int = 0o600) -> None:
    """custody's way of changing RESERVATIONS.json: tmp file next to it, then an atomic rename."""
    tmp = path.with_name('.' + path.name + '.tmp')
    tmp.write_text(text)
    os.chmod(tmp, mode)
    os.replace(tmp, path)


def make_refs(root: Path, name: str, release: str) -> dict:
    """The four reference files of one synthetic v1.6 draw, valid for v16_profiles.accepted() and custody's pin checks."""
    base = root / 'refs' / name
    base.mkdir(parents=True)
    items = base / 'items.jsonl'
    items.write_text('{"id": "synthetic"}\n')
    gold = base / 'gold.jsonl'
    gold.write_text('{"opaque_id": "synthetic"}\n')
    baseline = base / 'baseline.json'
    baseline.write_text(json.dumps({'method': 'jevbench-v16', 'phase': 'measurement_plan', 'G_med': None}))
    id_map = base / 'id-map.json'
    id_map.write_text('{}')
    freeze = base / 'freeze.json'
    freeze.write_text(json.dumps({'release': release, 'counts': {'selfhosted_input': 1500},
                                  'input_sha256': {'selfhosted': sha(items)},
                                  'file_sha256': {'frozen/gold.jsonl': sha(gold), 'frozen/id-map.json': sha(id_map)}}))
    measurement = base / 'measurement.json'
    measurement.write_text(json.dumps({
        'schema_version': 1, 'method': 'jevbench-v16',
        'code': {'pod_drivers/pod_driver.py': {'path': str(DRIVER), 'sha256': sha(DRIVER)}},
        'inputs': {'jevbench': {'count': 1500, 'items': {'path': str(items), 'sha256': sha(items)}}}}))
    scoring = base / 'scoring.json'
    scoring.write_text(json.dumps({'schema_version': 1, 'profiles': {'jevbench': {
        'version_prefix': 'v1.6.', 'files': {'baseline.json': {'path': str(baseline), 'sha256': sha(baseline)},
                                             'gold.jsonl': {'path': str(gold), 'sha256': sha(gold)}}}}}))
    return {key: {'path': str(path), 'sha256': sha(path)}
            for key, path in (('measurement', measurement), ('scoring', scoring), ('freeze', freeze), ('id_map', id_map))}


class GateCase(unittest.TestCase):
    def setUp(self):
        holder = tempfile.TemporaryDirectory()
        self.addCleanup(holder.cleanup)
        self.root = Path(holder.name)
        os.chmod(self.root, 0o700)
        self.state_root = self.root / 'state'
        (self.state_root / 'requests').mkdir(parents=True)
        self.job = self.root / 'jobs' / RID
        self.job.mkdir(parents=True)
        (self.job / 'STATE.md').write_text('# state\n')
        self.reservations = self.root / 'RESERVATIONS.json'
        self.registry = self.root / 'order-admissions.json'
        self.refs = {'a': make_refs(self.root, 'a', 'draw-a'), 'b': make_refs(self.root, 'b', 'draw-b')}
        self.row = {'id': RID, 'benchmarks': ['jevbench'], 'status': 'paid', 'stripe_mode': 'live', 'synthetic_test': False,
                    'paid_at': '2026-11-22T10:00:00Z', 'result_delivered_at': None, 'refund_id': None, 'refunded_at': None,
                    'refund_status': None, 'model_name': 'Synthetic', 'access_type': 'open_weights', 'visibility': 'public',
                    'model_link': 'https://huggingface.co/x/y', 'code_link': None, 'access_instructions': None}
        self.write_registry([self.entry(RID)])
        self.rotation = self.root / 'rotation.py'
        self.rotation.write_text('# synthetic rotation tool\n')
        for patch in (mock.patch.object(ap, 'STATE_ROOT', self.state_root),
                      mock.patch.object(ap, 'SHARE_ROOT', HERE),
                      mock.patch.object(ap, 'V16_RESERVATIONS_PATH', self.reservations),
                      mock.patch.object(ap, 'V16_ADMIT_PATH', str(self.root / 'v16-admit')),  # pin ON: never executed here
                      mock.patch.object(ap, 'V16_ADMIT_SHA256', 'a' * 64),
                      mock.patch.object(ap, 'load_row', lambda rid: self.row),
                      mock.patch.object(order_admission_registry, 'REGISTRY', self.registry),
                      mock.patch.object(v16_profiles, 'STATE_ROOT', self.state_root),
                      mock.patch.object(v16_profiles, 'ROTATION_TOOL', self.rotation)):
            patch.start()
            self.addCleanup(patch.stop)
        self.retired = {'official_methods': official_scoring.pins(['jevbench']),
                        'official_measurement': measurement_dispatch.pins()}
        ap.save_state(ap.load_state(RID))

    # fixtures ---------------------------------------------------------------------------------------------------
    @staticmethod
    def entry(order_id, family=FAMILY, module=MODULE):
        return {'order_id': order_id, 'family': family, 'module': module, 'module_sha256': 'c' * 64,
                'base_image': 'registry.example/x@sha256:' + 'd' * 64, 'context_sha256': 'e' * 64,
                'admitted_at': '2026-11-22T10:00:00Z', 'admitted_by': 'test', 'basis': 'test'}

    def write_registry(self, entries):
        write_atomic(self.registry, json.dumps({'schema': 1, 'entries': entries}))

    def draw(self, which='a', **overrides):
        value = {'status': 'open', 'families': {FAMILY: MODULE}, 'orders': [], 'expires_at': FUTURE, 'max_uses': 1,
                 'references': self.refs[which]}
        value.update(overrides)
        return value

    def reserve(self, draws=None, *, mode=0o600, **top):
        document = {'schema': 1, 'draws': {'draw-a': self.draw('a')} if draws is None else draws}
        document.update(top)
        write_atomic(self.reservations, json.dumps(document, sort_keys=True), mode)

    def pins(self):
        return ap.source_review_pins(self.job)

    def draw_pins(self, which='a'):
        refs = self.refs[which]
        return {'official_methods': official_scoring_v16.pins(['jevbench'], refs['scoring']['path']),
                'official_measurement': v16_profiles.measurement_pins(refs['measurement']['path'])}

    def assertRetired(self, label=''):
        self.assertEqual(self.pins(), self.retired, label)

    def assertDrawPins(self, which='a'):
        self.assertEqual(self.pins(), self.draw_pins(which))
        self.assertNotEqual(self.pins(), self.retired)

    def state(self):
        return ap.load_state(RID)

    def set_state(self, **values):
        state = self.state()
        state.update(values)
        ap.save_state(state)

    def pass_review(self, pins):
        review = {'schema_version': 1, 'verdict': 'PASS', 'source_pins': pins, 'summary': 'ok', 'checks': ['pins'], 'findings': []}
        (self.job / 'review').mkdir(exist_ok=True)
        review_path = self.job / 'review' / 'CODE-REVIEW.md'
        review_path.write_text(json.dumps(review, sort_keys=True) + '\n')
        gate = {'verdict': 'PASS', 'review_sha256': ap.sha256_file(review_path), 'review_result': review, 'source_pins': pins}
        (self.job / 'review' / 'GATE.json').write_text(json.dumps(gate))
        self.set_state(source_review_gate=gate)
        return gate


class ShippedPinTests(unittest.TestCase):
    """No GateCase here: these are the constants autopickup.py ships. The pin goes on only when custody has posted the reserved
    draw (not before 27 Nov), in its own commit."""

    def test_the_v16_admit_pin_is_empty_in_this_commit(self):
        self.assertEqual((ap.V16_ADMIT_PATH, ap.V16_ADMIT_SHA256), ('', ''))


class PinEmptyIsUnchangedTests(GateCase):
    """The shipped state of CR-857: V16_ADMIT_PATH/SHA256 are empty, and then nothing about the review pins changes."""

    def test_source_review_pins_output_is_exactly_todays_with_a_qualifying_draw_on_disk(self):
        self.reserve()
        with mock.patch.object(ap, 'V16_ADMIT_PATH', ''), mock.patch.object(ap, 'V16_ADMIT_SHA256', ''), \
                mock.patch.object(ap, '_v16_reservations', side_effect=AssertionError('reservations read with the pin empty')), \
                mock.patch.object(ap, '_read_safe_file', side_effect=AssertionError('file read with the pin empty')), \
                mock.patch.object(order_admission_registry, 'load', side_effect=AssertionError('registry read with the pin empty')):
            pins = self.pins()
        self.assertEqual(pins, self.retired)
        self.assertEqual(json.dumps(pins), json.dumps(self.retired))  # same keys in the same order: the review prompt is the same bytes
        self.assertEqual(list(pins), ['official_methods', 'official_measurement'])

    def test_half_pinned_is_off_too(self):
        self.reserve()
        for path, digest in (('', 'a' * 64), (str(self.root / 'v16-admit'), '')):
            with mock.patch.object(ap, 'V16_ADMIT_PATH', path), mock.patch.object(ap, 'V16_ADMIT_SHA256', digest):
                self.assertRetired()

    def test_pin_empty_records_no_draw_and_reads_no_state(self):
        self.reserve()
        with mock.patch.object(ap, 'V16_ADMIT_PATH', ''), mock.patch.object(ap, 'V16_ADMIT_SHA256', ''), \
                mock.patch.object(ap, 'load_state', side_effect=AssertionError('state read with the pin empty')):
            ap.record_v16_gate_draw(self.job, self.row)
        self.assertNotIn('v16_gate_draw', self.state())

    def test_pin_empty_ignores_a_recorded_draw(self):
        self.reserve()
        ap.record_v16_gate_draw(self.job, self.row)
        with mock.patch.object(ap, 'V16_ADMIT_PATH', ''), mock.patch.object(ap, 'V16_ADMIT_SHA256', ''):
            self.assertRetired()

    def test_the_review_prompt_text_is_unchanged_with_the_pin_empty(self):
        self.reserve()
        with mock.patch.object(ap, 'V16_ADMIT_PATH', ''), mock.patch.object(ap, 'V16_ADMIT_SHA256', ''):
            pins = ap.write_review_prompt(self.row, self.job)
        self.assertEqual(pins, self.retired)
        self.assertNotIn('v16_gate_draw', self.state())
        self.assertIn(json.dumps(self.retired, ensure_ascii=True, indent=2), (self.job / 'review' / 'PROMPT.md').read_text())


class DrawSelectionTests(GateCase):
    def test_exactly_one_open_unexpired_draw_that_lists_the_family_is_pinned(self):
        self.reserve()
        self.assertDrawPins('a')

    def test_no_reservation_file_zero_draws_or_only_unusable_draws_keep_the_retired_pins(self):
        self.assertRetired('absent file')
        self.reserve({})
        self.assertRetired('no draws')
        self.reserve({'draw-a': self.draw(status='closed')})
        self.assertRetired('closed draw')
        self.reserve({'draw-a': self.draw(status='used')})
        self.assertRetired('used draw')
        self.reserve({'draw-a': self.draw(expires_at=PAST)})
        self.assertRetired('expired draw')
        expires = (datetime.now(timezone.utc) - timedelta(seconds=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        self.reserve({'draw-a': self.draw(expires_at=expires)})
        self.assertRetired('expired a second ago')

    def test_a_draw_about_to_expire_but_not_yet_is_pinned(self):
        expires = (datetime.now(timezone.utc) + timedelta(minutes=5)).strftime('%Y-%m-%dT%H:%M:%SZ')
        self.reserve({'draw-a': self.draw(expires_at=expires)})
        self.assertDrawPins('a')

    def test_two_qualifying_draws_are_ambiguous_and_keep_the_retired_pins(self):
        self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b')})
        self.assertRetired()

    def test_an_expired_or_closed_second_draw_does_not_make_it_ambiguous(self):
        self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b', expires_at=PAST)})
        self.assertDrawPins('a')
        self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b', status='closed')})
        self.assertDrawPins('a')
        self.reserve({'draw-a': self.draw('a', status='closed'), 'draw-b': self.draw('b')})
        self.assertDrawPins('b')

    def test_an_order_listed_by_id_matches_without_the_family(self):
        self.reserve({'draw-a': self.draw(families={}, orders=[RID])})
        self.assertDrawPins('a')

    def test_a_draw_for_another_order_or_family_or_module_does_not_match(self):
        self.reserve({'draw-a': self.draw(families={}, orders=['bbbbbbbb-1111-4222-8333-444444444444'])})
        self.assertRetired('other order listed')
        self.reserve({'draw-a': self.draw(families={'sieve': MODULE})})
        self.assertRetired('other family')
        self.reserve({'draw-a': self.draw(families={FAMILY: 'sieve_runtime_supplement.py'})})
        self.assertRetired('family maps to another module')
        self.reserve({'draw-a': self.draw(families={})})
        self.assertRetired('no family, no order')

    def test_one_draw_by_order_id_and_one_by_family_are_two_candidates(self):
        self.reserve({'draw-a': self.draw('a', families={}, orders=[RID]), 'draw-b': self.draw('b')})
        self.assertRetired()

    def test_schema_problems_fall_back_like_custody_refuses(self):
        self.reserve(schema=2)
        self.assertRetired('schema 2')
        write_atomic(self.reservations, json.dumps({'schema': 1, 'draws': []}))
        self.assertRetired('draws is a list')
        write_atomic(self.reservations, '[]')
        self.assertRetired('not an object')
        write_atomic(self.reservations, 'not json')
        self.assertRetired('not json')
        self.reservations.write_bytes(b'\xff\xfe')
        os.chmod(self.reservations, 0o600)
        self.assertRetired('not utf-8')
        for bad in ({'families': []}, {'families': None}, {'orders': 'x'}, {'orders': {}}):
            self.reserve({'draw-a': self.draw(**bad)})
            self.assertRetired(f'bad draw {bad}')
        for bad in ('tomorrow', None, 5, '2099-01-01', '2099-01-01T00:00:00+00:00'):
            self.reserve({'draw-a': self.draw(expires_at=bad)})
            self.assertRetired(f'bad expiry {bad!r}')
        self.reserve({'draw-a': 'nonsense'})
        self.assertRetired('draw is not an object')

    def test_a_malformed_draw_anywhere_is_doubt_even_next_to_a_good_one(self):
        # custody raises reservation_schema while scanning: the pickup must not pin a draw custody would not use
        self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b', families=[])})
        self.assertRetired()
        self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b', expires_at='soon')})
        self.assertRetired()

    def test_a_draw_that_is_not_open_may_be_malformed_without_doubt(self):
        self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b', status='closed', families=[], expires_at='soon')})
        self.assertDrawPins('a')

    def test_reference_inventory_and_shape(self):
        for refs in ({k: v for k, v in self.refs['a'].items() if k != 'id_map'}, {**self.refs['a'], 'extra': self.refs['a']['id_map']},
                     None, [], 'x'):
            self.reserve({'draw-a': self.draw(references=refs)})
            self.assertRetired(f'references {refs!r}')
        for key in ('measurement', 'scoring', 'freeze', 'id_map'):
            for broken in ({'path': 'relative.json', 'sha256': self.refs['a'][key]['sha256']},
                           {'path': self.refs['a'][key]['path'], 'sha256': 'F' * 64},
                           {'path': self.refs['a'][key]['path'], 'sha256': 'abc'}, {'path': 5, 'sha256': 'a' * 64}, 'x', None):
                refs = dict(self.refs['a'], **{key: broken})
                self.reserve({'draw-a': self.draw(references=refs)})
                self.assertRetired(f'{key} {broken!r}')

    def test_a_reference_file_whose_sha_differs_from_its_pin_falls_back(self):
        for key in ('measurement', 'scoring', 'freeze', 'id_map'):
            with self.subTest(key):
                self.reserve()
                self.assertDrawPins('a')
                path = Path(self.refs['a'][key]['path'])
                original = path.read_bytes()
                path.write_bytes(original + b' ')
                try:
                    self.assertRetired(key)
                finally:
                    path.write_bytes(original)
                self.assertDrawPins('a')

    def test_a_missing_or_symlinked_reference_falls_back(self):
        self.reserve()
        path = Path(self.refs['a']['measurement']['path'])
        saved = path.with_name('measurement.saved')
        os.replace(path, saved)
        self.assertRetired('missing')
        path.symlink_to(saved)
        self.assertRetired('symlink')
        path.unlink()
        os.replace(saved, path)
        self.assertDrawPins('a')

    def test_profiles_that_are_not_the_v16_method_fall_back(self):
        # the same sanity v16_profiles.accepted() applies; custody refuses these too (profile_method_v16)
        self.reserve()
        manifest = Path(self.refs['a']['measurement']['path'])
        other_driver = manifest.with_name('other_driver.py')
        other_driver.write_text('# not the installed first-party v16 driver\n')
        good = json.loads(manifest.read_text())
        for label, mutate in (('method', lambda v: v.update(method='jevbench-v15')),
                              ('count', lambda v: v['inputs']['jevbench'].update(count=1624)),
                              ('foreign driver', lambda v: v['code']['pod_drivers/pod_driver.py'].update(
                                  path=str(other_driver), sha256=sha(other_driver))),
                              ('driver pin changed', lambda v: v['code']['pod_drivers/pod_driver.py'].update(sha256='0' * 64)),
                              ('no driver', lambda v: v['code'].clear()),
                              ('schema', lambda v: v.update(schema_version=2))):
            value = json.loads(json.dumps(good))
            mutate(value)
            manifest.write_text(json.dumps(value))
            refs = {**self.refs['a'], 'measurement': {'path': str(manifest), 'sha256': sha(manifest)}}
            self.reserve({'draw-a': self.draw(references=refs)})
            self.assertRetired(label)
        manifest.write_text(json.dumps(good))
        self.reserve()
        self.assertDrawPins('a')

    def test_a_scoring_profile_that_is_not_v16_falls_back(self):
        self.reserve()
        manifest = Path(self.refs['a']['scoring']['path'])
        good = json.loads(manifest.read_text())
        bad = json.loads(json.dumps(good))
        bad['profiles']['jevbench']['version_prefix'] = 'v1.5.'
        manifest.write_text(json.dumps(bad))
        refs = {**self.refs['a'], 'scoring': {'path': str(manifest), 'sha256': sha(manifest)}}
        self.reserve({'draw-a': self.draw(references=refs)})
        self.assertRetired()
        manifest.write_text(json.dumps(good))

    def test_unsafe_reservation_files_never_select_a_draw(self):
        self.reserve(mode=0o644)
        self.assertRetired('world readable')
        self.reserve(mode=0o660)
        self.assertRetired('group writable')
        self.reserve()
        self.assertDrawPins('a')
        link = self.root / 'link.json'
        link.symlink_to(self.reservations)
        with mock.patch.object(ap, 'V16_RESERVATIONS_PATH', link):
            self.assertRetired('symlink')
        self.reservations.write_bytes(b' ' * (ap.PINNED_FILE_MAX_BYTES + 1))
        os.chmod(self.reservations, 0o600)
        self.assertRetired('too large')

    def test_the_registry_must_hold_exactly_one_entry_for_the_order(self):
        self.reserve()
        self.write_registry([])
        self.assertRetired('no entry')
        self.write_registry([self.entry(RID), self.entry(RID, module='sieve_runtime_supplement.py')])
        self.assertRetired('two entries')
        self.write_registry([self.entry('bbbbbbbb-1111-4222-8333-444444444444')])
        self.assertRetired('only another order')
        self.write_registry([self.entry('bbbbbbbb-1111-4222-8333-444444444444'), self.entry(RID)])
        self.assertDrawPins('a')
        self.registry.unlink()
        self.assertRetired('registry missing')
        write_atomic(self.registry, 'garbage')
        self.assertRetired('registry unreadable')
        self.write_registry([self.entry(RID)])
        os.chmod(self.registry, 0o666)
        self.assertRetired('registry group/world writable')

    def test_the_entry_family_and_module_pick_the_draw(self):
        self.write_registry([self.entry(RID, family='sieve', module='sieve_runtime_supplement.py')])
        self.reserve()  # families map cue_reflex only
        self.assertRetired()
        self.reserve({'draw-a': self.draw(families={'sieve': 'sieve_runtime_supplement.py'})})
        self.assertDrawPins('a')

    def test_only_a_text_only_jevbench_order_is_gated(self):
        self.reserve()
        self.assertDrawPins('a')
        for benchmarks in (['jevbench', 'imagejevbench'], ['imagejevbench']):
            self.row['benchmarks'] = benchmarks
            # the retired functions are stubbed: other test modules in a shared process change the real image profile, and
            # what matters here is only that the draw logic stays out and today's two calls are made
            with mock.patch.object(ap.official_scoring, 'pins', return_value={'retired': 'scoring'}) as scoring, \
                    mock.patch.object(ap.measurement_dispatch, 'pins', return_value={'retired': 'measurement'}):
                pins = self.pins()
            self.assertEqual(pins, {'official_methods': {'retired': 'scoring'}, 'official_measurement': {'retired': 'measurement'}})
            scoring.assert_called_once_with(benchmarks)

    def test_orders_the_hook_cannot_act_on_are_not_gated(self):
        self.reserve()
        for label, change in {'delivered': {'result_delivered_at': '2026-11-23T00:00:00Z'}, 'refund id': {'refund_id': 're_1'},
                              'refunded': {'refunded_at': '2026-11-23T00:00:00Z'}, 'refund status': {'refund_status': 'due'},
                              'review_passed status': {'status': 'review_passed'}, 'refunded status': {'status': 'refunded'},
                              'test mode': {'stripe_mode': 'test'}, 'synthetic': {'synthetic_test': True},
                              'synthetic missing': {'synthetic_test': None}, 'unpaid': {'paid_at': None}}.items():
            with self.subTest(label):
                saved = dict(self.row)
                self.row.update(change)
                try:
                    self.assertRetired(label)
                finally:
                    self.row.clear()
                    self.row.update(saved)
        self.assertDrawPins('a')

    def test_an_admitted_order_is_never_gated_by_the_draw_logic(self):
        self.reserve()
        state = self.state()
        state['v16_profile_admission'] = {'verdict': 'ACCEPTED'}
        self.assertIsNone(ap._v16_gate_pins(self.row, state))
        self.assertIsNone(ap._select_v16_gate_draw(self.row, state))

    def test_source_review_budget_keeps_a_new_draw_selection_from_exhausting_an_order(self):
        self.reserve()
        for consumed, gated in ((0, True), (1, True), (2, False), (3, False)):
            with self.subTest(consumed):
                self.set_state(stage_attempts={'source_review': consumed})
                if gated:
                    self.assertDrawPins('a')
                else:
                    self.assertRetired()
        for bad in (-1, True, 'x', None, 1.0):
            self.set_state(stage_attempts={'source_review': bad})
            self.assertRetired(f'bad counter {bad!r}')
        for bad in ('x', [], [1], 5):
            self.set_state(stage_attempts=bad)
            self.assertRetired(f'bad stage_attempts {bad!r}')
        self.set_state(stage_attempts={'preparation': 3})  # other stages do not count
        self.assertDrawPins('a')

    def test_the_budget_never_unpins_a_recorded_draw(self):
        self.reserve()
        ap.record_v16_gate_draw(self.job, self.row)
        self.set_state(stage_attempts={'source_review': 3})
        self.assertDrawPins('a')


class RecordedDrawTests(GateCase):
    def test_the_draw_is_recorded_when_the_review_prompt_is_written(self):
        self.reserve()
        self.assertNotIn('v16_gate_draw', self.state())  # selection alone writes nothing
        self.pins()
        self.assertNotIn('v16_gate_draw', self.state())
        before = datetime.now(timezone.utc)
        pins = ap.write_review_prompt(self.row, self.job)
        record = self.state()['v16_gate_draw']
        self.assertEqual(pins, self.draw_pins('a'))
        self.assertEqual(set(record), {'release', 'measurement', 'scoring', 'chosen_at'})
        self.assertEqual((record['release'], record['measurement'], record['scoring']),
                         ('draw-a', self.refs['a']['measurement'], self.refs['a']['scoring']))
        self.assertGreaterEqual(ap.parse_ts(record['chosen_at']), before.replace(microsecond=0))
        prompt = (self.job / 'review' / 'PROMPT.md').read_text()
        self.assertIn(json.dumps(self.draw_pins('a'), ensure_ascii=True, indent=2), prompt)
        self.assertIn('review pins the v1.6 profiles of reserved draw draw-a', (self.job / 'STATE.md').read_text())

    def test_a_caller_that_saves_its_own_state_copy_later_cannot_erase_the_record(self):
        # evaluate() loads its state first, writes the review prompt, then saves that same dict again (stage attempts, the
        # gate). A record made on a separate copy was erased by exactly that: the end-to-end test in test_autopickup.py found it.
        self.reserve()
        state = self.state()
        ap.write_review_prompt(self.row, self.job, state)
        self.assertEqual(state['v16_gate_draw']['release'], 'draw-a')
        self.assertTrue(ap.consume_stage_attempt(state, 'source_review', ap.MAX_SOURCE_REVIEW_ATTEMPTS))
        self.set_state(source_review_gate={'verdict': 'PASS'})
        stale = dict(state)
        ap.save_state(stale)
        self.assertEqual(self.state()['v16_gate_draw']['release'], 'draw-a')
        self.assertDrawPins('a')

    def test_without_a_caller_state_a_separate_copy_is_loaded_and_saved(self):
        self.reserve()
        ap.write_review_prompt(self.row, self.job)
        self.assertEqual(self.state()['v16_gate_draw']['release'], 'draw-a')

    def test_no_qualifying_draw_records_nothing(self):
        ap.record_v16_gate_draw(self.job, self.row)
        self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b')})
        ap.record_v16_gate_draw(self.job, self.row)
        self.assertNotIn('v16_gate_draw', self.state())
        self.assertEqual(ap.write_review_prompt(self.row, self.job), self.retired)

    def test_the_recorded_draw_is_sticky_when_the_reservations_change_afterwards(self):
        self.reserve()
        ap.record_v16_gate_draw(self.job, self.row)
        for label, change in (('expired', lambda: self.reserve({'draw-a': self.draw('a', expires_at=PAST)})),
                              ('closed', lambda: self.reserve({'draw-a': self.draw('a', status='closed')})),
                              ('uses consumed', lambda: self.reserve({'draw-a': self.draw('a', max_uses=0)})),
                              ('a second draw appears', lambda: self.reserve({'draw-a': self.draw('a'), 'draw-b': self.draw('b')})),
                              ('another draw replaces it', lambda: self.reserve({'draw-b': self.draw('b')})),
                              ('file removed', lambda: self.reservations.unlink()),
                              ('file unreadable', lambda: write_atomic(self.reservations, 'junk', 0o666)),
                              ('registry entry removed', lambda: self.write_registry([]))):
            change()
            self.assertDrawPins('a')  # never re-selected
        self.assertEqual(self.state()['v16_gate_draw']['release'], 'draw-a')

    def test_a_second_recording_does_not_move_the_record(self):
        self.reserve()
        ap.record_v16_gate_draw(self.job, self.row)
        first = self.state()['v16_gate_draw']
        self.reserve({'draw-b': self.draw('b')})
        ap.record_v16_gate_draw(self.job, self.row)
        ap.write_review_prompt(self.row, self.job)
        self.assertEqual(self.state()['v16_gate_draw'], first)

    def test_a_recorded_draw_whose_files_no_longer_verify_is_a_pickup_error(self):
        self.reserve()
        ap.record_v16_gate_draw(self.job, self.row)
        for key in ('measurement', 'scoring'):
            path = Path(self.refs['a'][key]['path'])
            original = path.read_bytes()
            path.write_bytes(original + b' ')
            try:
                with self.assertRaisesRegex(ap.PickupError, 'recorded v1.6 draw is unavailable or changed'):
                    self.pins()
            finally:
                path.write_bytes(original)
            self.assertDrawPins('a')
        path.unlink()
        with self.assertRaises(ap.PickupError):
            self.pins()

    def test_a_malformed_record_is_a_pickup_error_not_a_silent_fallback(self):
        self.reserve()
        good = {'release': 'draw-a', **{k: self.refs['a'][k] for k in ('measurement', 'scoring')}, 'chosen_at': 'x'}
        for label, record in (('not a dict', 'draw-a'), ('no release', {k: v for k, v in good.items() if k != 'release'}),
                              ('bad release', dict(good, release='../x')), ('no scoring', {k: v for k, v in good.items() if k != 'scoring'}),
                              ('bad pin', dict(good, scoring={'path': 'rel', 'sha256': 'a' * 64})),
                              ('empty', {}), ('list', [])):
            with self.subTest(label):
                self.set_state(v16_gate_draw=record)
                with self.assertRaises(ap.PickupError):
                    self.pins()

    def test_a_recorded_draw_does_not_apply_to_other_orders_or_admitted_ones(self):
        self.reserve()
        ap.record_v16_gate_draw(self.job, self.row)
        self.row['benchmarks'] = ['jevbench', 'imagejevbench']
        with mock.patch.object(ap.official_scoring, 'pins', return_value={'retired': 'scoring'}), \
                mock.patch.object(ap.measurement_dispatch, 'pins', return_value={'retired': 'measurement'}):
            self.assertEqual(self.pins()['official_measurement'], {'retired': 'measurement'})

    def test_gate_stays_valid_while_the_reservation_is_consumed_and_goes_stale_when_the_recorded_files_change(self):
        # the review gate record uses the pins once; a later edit of the reservation must not turn a passed gate stale
        self.reserve()
        ap.write_review_prompt(self.row, self.job)
        gate = self.pass_review(self.pins())
        self.assertEqual(ap.validate_review_gate(self.job), gate)
        self.reserve({'draw-a': self.draw('a', max_uses=0, expires_at=PAST)})
        self.assertEqual(ap.validate_review_gate(self.job), gate)
        path = Path(self.refs['a']['scoring']['path'])
        original = path.read_bytes()
        path.write_bytes(original + b' ')
        try:
            with self.assertRaises(ap.PickupError):
                ap.validate_review_gate(self.job)
        finally:
            path.write_bytes(original)


class PinChangePathTests(GateCase):
    """A gate that passed on the retired pins goes through the EXISTING pin-change path once a draw qualifies:
    validate_review_gate fails on the changed pins, evaluate() takes review_stage and writes a new review prompt."""

    def test_a_retired_gate_is_stale_once_a_draw_qualifies_and_a_new_review_with_draw_pins_passes(self):
        gate = self.pass_review(self.pins())  # reviewed while no reservation existed
        self.assertEqual(gate['source_pins'], self.retired)
        self.assertEqual(ap.validate_review_gate(self.job), gate)
        self.reserve()  # custody posts the reserved draw
        with self.assertRaisesRegex(ap.PickupError, 'no longer matches the reviewed files'):
            ap.validate_review_gate(self.job)  # evaluate(): review_stage = True
        self.assertNotIn('v16_gate_draw', self.state())
        ap.write_review_prompt(self.row, self.job)  # what review_stage does next: records the draw, pins it
        self.assertEqual(self.state()['v16_gate_draw']['release'], 'draw-a')
        with self.assertRaises(ap.PickupError):
            ap.validate_review_gate(self.job)  # still the old gate until the reviewer has passed
        new_gate = self.pass_review(self.pins())
        self.assertEqual(new_gate['source_pins'], self.draw_pins('a'))
        self.assertEqual(ap.validate_review_gate(self.job), new_gate)
        # ... and from here on custody's two pin checks hold (the same equalities v16-admit evaluates)
        self.assertEqual(new_gate['source_pins']['official_measurement'], v16_profiles.measurement_pins(self.refs['a']['measurement']['path']))
        self.assertEqual(new_gate['source_pins']['official_methods'], official_scoring_v16.pins(['jevbench'], self.refs['a']['scoring']['path']))

    def test_with_the_pin_empty_a_retired_gate_stays_valid_when_a_reservation_appears(self):
        gate = self.pass_review(self.pins())
        self.reserve()
        with mock.patch.object(ap, 'V16_ADMIT_PATH', ''), mock.patch.object(ap, 'V16_ADMIT_SHA256', ''):
            self.assertEqual(ap.validate_review_gate(self.job), gate)


class PositiveControlTests(GateCase):
    """The pins the gate carries are exactly what the runtime derives when it accepts an admission naming that draw."""

    def put(self, path: Path, value) -> str:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))
        return sha(path)

    def build_admitted_job(self, gate_pins):
        job = self.job
        for sub in ('review', 'source', 'trusted-runner'):
            (job / sub).mkdir(exist_ok=True)
        for name in ('RUNTIME.json', 'MEASUREMENT-META.json', 'POD-RECIPE.json', 'UPSTREAM-MANIFEST.json'):
            self.put(job / 'trusted-runner' / name, {})
        source = {name: {'receipt_sha256': self.put(job / 'source' / f'FETCH-RECEIPT-{name}.json', {})} for name in ('model', 'code')}
        trusted = {'manifest_sha256': sha(job / 'trusted-runner/UPSTREAM-MANIFEST.json'),
                   'files': {name: sha(job / 'trusted-runner' / name)
                             for name in ('RUNTIME.json', 'MEASUREMENT-META.json', 'POD-RECIPE.json')}}
        pins = {**source, **gate_pins, 'trusted_runner': trusted}
        review_sha = self.put(job / 'review/CODE-REVIEW.md', {})
        gate = {'verdict': 'PASS', 'review_sha256': review_sha, 'source_pins': pins}
        self.put(job / 'review/GATE.json', gate)
        admission = {'schema_version': 1, 'verdict': 'ACCEPTED', 'order_id': RID, 'generation': 'synthetic', 'draw_release': 'draw-a',
                     'source_pins': source, 'references': self.refs['a'], 'rotation_tool_sha256': sha(self.rotation),
                     'recipe_sha256': sha(job / 'trusted-runner/POD-RECIPE.json')}
        admission_sha = self.put(job / 'review/V16-PROFILE-ADMISSION.json', admission)
        review = {'verdict': 'ACCEPTED', 'reviewer_engine': 'claude', 'admission_sha256': admission_sha}
        independent_sha = self.put(job / 'review/V16-PROFILE-REVIEW.json', review)
        self.set_state(source_review_gate=gate, v16_profile_admission={'verdict': 'ACCEPTED', 'receipt_sha256': admission_sha,
                                                                         'independent_review_sha256': independent_sha})
        return admission

    def test_v16_profiles_accepted_takes_a_gate_with_the_draw_pins(self):
        self.reserve()
        gate_pins = self.pins()  # the pins the pickup's review gate would carry
        self.assertEqual(gate_pins, self.draw_pins('a'))
        admission = self.build_admitted_job(gate_pins)
        accepted, measured, scored = v16_profiles.accepted(self.job)
        self.assertEqual(accepted, admission)
        self.assertEqual(measured, gate_pins['official_measurement'])
        self.assertEqual(scored, gate_pins['official_methods'])

    def test_negative_control_the_retired_pins_are_refused_by_the_same_function(self):
        self.reserve()
        self.build_admitted_job(self.retired)  # the gap CR-857 closes: today's gate pins the retired profile
        with self.assertRaisesRegex(ValueError, 'stale method pins'):
            v16_profiles.accepted(self.job)


class ReentryTests(GateCase):
    """manage_evaluation's re-entry for the non-transient hold official_method_retired_requires_admission (no database here:
    v16_reentry is the decision, the scheduler test in test_autopickup.py drives it through manage_evaluation)."""

    HOLD = 'official_method_retired_requires_admission'

    def setUp(self):
        super().setUp()
        self.now = datetime(2026, 11, 28, 12, 0, tzinfo=timezone.utc)
        self.row['evaluation_attempts'] = 0
        self.hold()
        patch = mock.patch.object(ap, 'JOB_ROOT', self.root / 'jobs')
        patch.start()
        self.addCleanup(patch.stop)

    def hold(self, reason=None, **extra):
        state = self.state()
        state['operational_hold'] = {'reason': reason or self.HOLD, 'transient': False, 'retries': 0, 'at': 'x', **extra}
        ap.save_state(state)

    def attempt(self, reservations_part):
        """The last v16_admit_attempt, refused for the key <review>:<pin>:<reservations part>."""
        key = ('b' * 64) + ':' + ('a' * 64) + ':' + reservations_part
        self.set_state(v16_admit_attempt={'key': key, 'attempts': 1, 'final': True, 'kind': 'refused', 'code': 'no_reservations'})

    def reenter(self):
        return ap.v16_reentry(self.row, self.state(), self.now)

    def test_a_held_order_without_an_attempt_re_enters_once(self):
        self.assertTrue(self.reenter())
        state = self.state()
        self.assertNotIn('operational_hold', state)
        self.assertEqual(state['v16_reentry'], {'reservations': 'absent', 'at': ap.iso(self.now)})
        self.assertIn('the reservations changed', (self.job / 'STATE.md').read_text())

    def test_the_hold_coming_back_for_the_same_reservations_does_not_loop(self):
        self.assertTrue(self.reenter())
        self.hold()  # e.g. custody could not be run (unusable pin file): the hold is set again, no attempt was recorded
        self.assertFalse(self.reenter())
        self.assertIn('operational_hold', self.state())
        self.reserve()  # new reservations sha: one more
        self.assertTrue(self.reenter())
        self.hold()
        self.assertFalse(self.reenter())
        write_atomic(self.reservations, '{"schema": 1, "draws": {}}\n')
        self.assertTrue(self.reenter())
        self.assertEqual(self.state()['v16_reentry']['reservations'], sha(self.reservations))

    def test_the_last_attempt_key_decides(self):
        self.reserve()
        current = sha(self.reservations)
        self.attempt(current)
        self.assertFalse(self.reenter(), 'same reservations as at the last attempt')
        self.assertIn('operational_hold', self.state())
        self.attempt('f' * 64)
        self.assertTrue(self.reenter(), 'other reservations than at the last attempt')
        self.hold()
        self.set_state(v16_reentry={})
        self.attempt('absent')
        self.assertTrue(self.reenter(), 'a file now, absent at the last attempt')
        self.hold()
        self.reservations.unlink()
        self.set_state(v16_reentry={})
        self.attempt('absent')
        self.assertFalse(self.reenter(), 'absent now, absent at the last attempt')
        self.attempt('f' * 64)
        self.assertTrue(self.reenter(), 'absent now, a file at the last attempt')

    def test_an_attempt_record_without_a_reservations_part_does_not_block_re_entry(self):
        for key in ('b' * 64 + ':' + 'a' * 64, 'junk', '', None, 'a:b:c:d'):
            with self.subTest(key):
                self.hold()
                self.set_state(v16_reentry={}, v16_admit_attempt={'key': key} if key is not None else 'nonsense')
                self.assertTrue(self.reenter())

    def test_the_v16_pin_must_be_on(self):
        for path, digest in (('', ''), ('', 'a' * 64), ('/x/v16-admit', '')):
            with mock.patch.object(ap, 'V16_ADMIT_PATH', path), mock.patch.object(ap, 'V16_ADMIT_SHA256', digest):
                self.assertFalse(self.reenter())
                self.assertIn('operational_hold', self.state())

    def test_only_this_hold_on_a_text_order_without_admission_and_with_attempts_left(self):
        cases = {'other reason': lambda: self.hold('unsupported_measurement_backend'),
                 'transient reason': lambda: self.hold('official_measurement_pin_changed'),
                 'no hold': lambda: self.set_state(operational_hold=None),
                 'admitted': lambda: self.set_state(v16_profile_admission={'verdict': 'ACCEPTED'}),
                 'image only': lambda: self.row.update(benchmarks=['imagejevbench']),
                 'attempts used up': lambda: self.row.update(evaluation_attempts=ap.MAX_EVALUATION_ATTEMPTS),
                 'attempts not a number': lambda: self.row.update(evaluation_attempts='3'),
                 'attempts a bool': lambda: self.row.update(evaluation_attempts=True)}
        for label, prepare in cases.items():
            with self.subTest(label):
                self.row.update(benchmarks=['jevbench'], evaluation_attempts=0)
                state = self.state()
                for key in ('v16_profile_admission', 'v16_reentry'):
                    state.pop(key, None)
                ap.save_state(state)
                self.hold()
                prepare()
                self.assertFalse(self.reenter())
        self.row.update(benchmarks=['jevbench'], evaluation_attempts=ap.MAX_EVALUATION_ATTEMPTS - 1)
        state = self.state()
        state.pop('v16_profile_admission', None)
        ap.save_state(state)
        self.hold()
        self.assertTrue(self.reenter(), 'one attempt left is enough')

    def test_an_unusable_reservations_file_is_not_a_reason_to_re_enter(self):
        self.reserve(mode=0o666)
        self.assertFalse(self.reenter())
        self.assertIn('operational_hold', self.state())

    def test_a_live_owner_job_is_never_restarted_under(self):
        with mock.patch.object(ap, 'native_owner_live', return_value=True):
            self.assertFalse(self.reenter())
        self.hold(owner='some-owner-job')
        with mock.patch.object(ap, 'hold_owner_live', return_value=True) as live:
            self.assertFalse(self.reenter())
        self.assertEqual(live.call_args.args[0], 'some-owner-job')
        with mock.patch.object(ap, 'hold_owner_live', return_value=False), mock.patch.object(ap, 'native_owner_live', return_value=False):
            self.assertTrue(self.reenter())  # a dead or finished owner does not block it

    def test_re_entry_never_touches_the_row_or_the_evaluation_status(self):
        self.row['evaluation_status'] = 'pending'
        before = dict(self.row)
        with mock.patch.object(ap, 'update_row', side_effect=AssertionError('the row must not be written')), \
                mock.patch.object(ap, 'mark_evaluation_exhausted', side_effect=AssertionError('never exhausted by a re-entry')):
            self.assertTrue(self.reenter())
        self.assertEqual(self.row, before)
        state = self.state()
        self.assertNotIn('evaluation_exhausted', state)
        self.assertNotIn('stage_attempts', state)  # the re-entry consumes no budget itself

    def test_a_draw_that_cannot_be_reviewed_for_lack_of_budget_is_simply_not_pinned_after_re_entry(self):
        self.set_state(stage_attempts={'source_review': ap.MAX_SOURCE_REVIEW_ATTEMPTS})
        self.reserve()
        self.assertTrue(self.reenter())
        self.assertRetired()  # the gate keeps the retired pins: no new review is triggered, nothing can become exhausted


if __name__ == '__main__':
    unittest.main()
