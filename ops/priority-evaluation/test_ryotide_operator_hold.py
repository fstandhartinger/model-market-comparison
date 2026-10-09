"""Exact correction custody gates; all controller effects/SQL are mocked."""
import copy
import importlib.util
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location('ryotide_hold_controller_test', HERE / 'autopickup.py')
c = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = c
spec.loader.exec_module(c)
RID = '81e785ad-081b-4592-99df-1c3d709fd6c8'


def held():
    return {'id': RID, 'operational_hold': {
        'reason': 'source_link_normalized_pending_v16_review',
        'owner': 'fastlane-v16-finish-20261009', 'transient': False,
        'recovery_evidence': {'request_id': RID, 'operation': 'operator_false_tag_hold_correction',
            'tag_url': 'https://github.com/csabag/ryotide/tree/v0.4.0',
            'commit': '94c71a3d9f044ffaba87981e985b66f47de3be80',
            'normalized_url': 'https://github.com/csabag/ryotide/tree/94c71a3d9f044ffaba87981e985b66f47de3be80',
            'changes_sha256': 'a' * 64}}}


class ExactCorrectionGate(unittest.TestCase):
    def test_exact_hold_without_approval_decision_is_effect_free(self):
        with mock.patch.object(c, 'load_state', return_value=held()), \
             mock.patch.object(c, 'advance_intake') as intake, \
             mock.patch.object(c, 'advance_change_request') as mail, \
             mock.patch.object(c, 'advance_delivery') as delivery, \
             mock.patch.object(c, 'sql') as sql:
            c.process_row({'id': RID, 'synthetic_test': False}, SimpleNamespace(dry_run=False), c.JOB_ROOT, c.utcnow())
        intake.assert_not_called()
        mail.assert_not_called()
        delivery.assert_not_called()
        sql.assert_not_called()

    def test_claim_excludes_held_order_before_sql_mutation(self):
        with mock.patch.object(c, 'load_state', return_value=held()), \
             mock.patch.object(c, 'managed_predicate', return_value='TRUE'), \
             mock.patch.object(c, 'sql_json', return_value=None) as sql:
            self.assertEqual(c.claim_rows(None, c.JOB_ROOT), [])
        self.assertIn("AND r2.id <> '" + RID + "'::uuid", sql.call_args.args[0])

    def test_other_order_and_other_reason_unaffected(self):
        for field, value in [('id', '11111111-1111-4111-8111-111111111111'), ('reason', 'source_review')]:
            state = held()
            if field == 'id':
                state[field] = value
            else:
                state['operational_hold'][field] = value
            self.assertFalse(c.ryotide_source_link_recovery_hold(state))
            with mock.patch.object(c, 'load_state', return_value=state), \
                 mock.patch.object(c, 'managed_predicate', return_value='TRUE'), \
                 mock.patch.object(c, 'sql_json', return_value=None) as sql:
                c.claim_rows(None, c.JOB_ROOT)
            self.assertNotIn("AND r2.id <> '" + RID, sql.call_args.args[0])

    def test_foreign_owner_transient_or_bad_evidence_fails_closed(self):
        for key, value in [('owner', 'other_job'), ('transient', True), ('recovery_evidence', {})]:
            state = held()
            state['operational_hold'][key] = value
            with self.assertRaises(c.PickupError):
                c.ryotide_source_link_recovery_hold(state)

    def test_exact_hold_never_auto_expires(self):
        state = held()
        state['operational_hold'].update(at='2000-01-01T00:00:00+00:00', next_retry_at='2000-01-01T00:00:01+00:00', retries=100)
        self.assertTrue(c.ryotide_source_link_recovery_hold(state))

    def test_expiry_sla_sweep_still_runs_before_claim(self):
        with tempfile.TemporaryDirectory() as temp, \
             mock.patch.object(c, 'STATE_ROOT', Path(temp)), \
             mock.patch.object(c, 'sla_sweep', return_value={'examined': 1}) as sla, \
             mock.patch.object(c, 'sla_decisions', return_value={}) as decisions, \
             mock.patch.object(c, 'refund_decisions', return_value={}) as refunds, \
             mock.patch.object(c, 'claim_rows', return_value=[]) as claim:
            result = c.cycle(SimpleNamespace(dry_run=False))
        sla.assert_called_once()
        decisions.assert_called_once()
        refunds.assert_called_once()
        claim.assert_called_once()
        self.assertEqual(result['sla'], {'examined': 1})

    def test_manual_resubmit_cannot_discard_operator_custody(self):
        with mock.patch.object(c, 'load_state', return_value=held()), \
             mock.patch.object(c, 'load_row') as row, mock.patch.object(c, 'update_row') as update:
            with self.assertRaisesRegex(c.PickupError, 'operator correction owns'):
                c.resubmit(RID)
        row.assert_not_called()
        update.assert_not_called()


if __name__ == '__main__':
    unittest.main()
