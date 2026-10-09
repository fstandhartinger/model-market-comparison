"""Synthetic host-adoption checks: no pods, production DB, protected rows or mail."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import autopickup as ap
import v16_adoption as adoption


class AdoptionTests(unittest.TestCase):
    def test_absent_is_legacy_but_rejected_record_never_falls_back(self):
        self.assertIsNone(adoption.selected(Path('/unused'), {}))
        with patch.object(adoption.v16_profiles, 'accepted', side_effect=ValueError('rejected')):
            with self.assertRaises(ValueError):
                adoption.selected(Path('/unused'), {'v16_profile_admission': {'verdict': 'HOLD'}})

    def test_adoption_keeps_old_raw_and_rejects_mixed_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); job = root/'job'; job.mkdir()
            source = root/'measurements/job/fresh/jevbench'; source.mkdir(parents=True)
            raw = source/'raw.jsonl'; raw.write_text('synthetic\n')
            receipt = dict(pins={'manifest':'fresh'}, rows=1500,
                           raw_sha256=hashlib.sha256(raw.read_bytes()).hexdigest())
            (source/'receipt.json').write_text(json.dumps(receipt))
            old = job/'results/raw/jevbench.jsonl'; old.parent.mkdir(parents=True); old.write_text('old\n')
            package = ({'generation':'fresh'}, receipt['pins'], {})
            with patch.object(adoption.v16_profiles, 'STATE_ROOT', root):
                adopted, _ = adoption.adopt_raw(job, package)
                self.assertEqual(adopted, receipt)
                self.assertEqual(old.read_text(), 'old\n')
                self.assertEqual((job/adoption.raw_paths(package[0])['jevbench']).read_text(), 'synthetic\n')
                receipt['pins'] = {'manifest':'legacy'}
                (source/'receipt.json').write_text(json.dumps(receipt))
                with self.assertRaises(ValueError): adoption.adopt_raw(job, package)

    def test_measurement_plan_adopts_but_never_scores_or_rerents(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); job=root/'order'; job.mkdir()
            receipt=root/'measurements/order/fresh/jevbench/receipt.json'
            receipt.parent.mkdir(parents=True); receipt.write_text('{}')
            state={'official_measurement': {'inputs': {'legacy':True}}}
            package=({'generation':'fresh'}, {}, {})
            with patch.object(ap, 'STATE_ROOT', root), \
                 patch.object(ap, 'validate_review_gate'), \
                 patch.object(ap, 'load_state', return_value=state), \
                 patch.object(ap, 'save_state') as save, \
                 patch.object(ap, 'update_row'), \
                 patch.object(ap, 'set_operational_hold') as hold, \
                 patch.object(ap, 'score_measurement') as score, \
                 patch.object(adoption, 'selected', return_value=package), \
                 patch.object(adoption, 'adopt_raw', return_value=({'raw_sha256':'fresh'}, None)), \
                 patch.object(adoption, 'baseline_complete', return_value=False), \
                 patch.object(adoption.v16_profiles, 'measure') as measure:
                self.assertEqual(ap.evaluate_v16_generation('order', job), 0)
                measure.assert_not_called(); score.assert_not_called()
                self.assertEqual(state['v16_host_measurements']['fresh']['jevbench']['raw_sha256'], 'fresh')
                hold.assert_called_once_with(state, 'v16_completed_cohort_baseline_required', transient=False)
                self.assertEqual(state['official_measurement']['inputs'], {'legacy':True})
                save.assert_called_once()

    def test_completed_generation_scores_then_holds_legacy_renderer(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); job=root/'order'; job.mkdir()
            state={}; package=({'generation':'fresh'}, {}, {})
            with patch.object(ap, 'STATE_ROOT', root), patch.object(ap,'validate_review_gate'), \
                 patch.object(ap,'load_state',return_value=state), patch.object(ap,'save_state'), \
                 patch.object(ap,'update_row'), patch.object(ap,'set_operational_hold') as hold, \
                 patch.object(ap,'score_measurement') as score, \
                 patch.object(adoption,'selected',return_value=package), \
                 patch.object(adoption,'adopt_raw',return_value=({}, None)), \
                 patch.object(adoption,'baseline_complete',return_value=True), \
                 patch.object(adoption.v16_profiles,'measure') as measure:
                ap.evaluate_v16_generation('order',job)
                measure.assert_called_once_with(job); score.assert_called_once_with('order',job)
                hold.assert_called_once_with(state,'v16_cohort_public_release_required',transient=False)

    def test_raw_receipt_binding_uses_generation_and_refuses_conflicting_hash(self):
        paths={'jevbench':'results/raw/fresh/jevbench.jsonl'}
        self.assertEqual(ap.bind_raw_receipts({}, {'jevbench':'abc'}, paths), {paths['jevbench']:'abc'})
        with self.assertRaises(ap.PickupError):
            ap.bind_raw_receipts({paths['jevbench']:'old'}, {'jevbench':'abc'}, paths)

if __name__ == '__main__': unittest.main()
