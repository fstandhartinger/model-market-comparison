"""Card clarity regressions; all notification and persistence effects are mocked."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location('card_wording_controller_test', HERE / 'autopickup.py')
c = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = c
spec.loader.exec_module(c)

ROW = {'id': '11111111-1111-4111-8111-111111111111', 'customer_name': 'Metask',
       'email': 'owner@example.com', 'model_name': 'metask-jev-rain-12B',
       'model_link': 'https://huggingface.co/Metask/metask-jev-rain-12B',
       'paid_at': '2026-10-09T00:00:00+00:00'}


class CardWording(unittest.TestCase):
    def assert_card(self, card):
        lines = card.splitlines()
        self.assertTrue(lines[1].startswith("Worum geht's: "))
        self.assertIn('Metask', lines[1])
        self.assertIn(ROW['model_name'], lines[1])
        self.assertIn(ROW['model_link'], lines[1])
        self.assertNotIn(c.order_ref(ROW['id']), card)
        self.assertNotIn('STATE.md', card)
        self.assertIn('🧑 Für dich', card)
        for field in ('Why:', 'Steps:', 'Time:'):
            self.assertIn(field, card)

    def test_retired_method_explains_actual_blocker(self):
        card = c.rescue_card(ROW, 'official_method_retired_requires_admission')
        self.assert_card(card)
        self.assertIn('old test set is retired', card)
        self.assertIn('replacement test set has not been approved', card)
        self.assertNotIn('official_method_retired_requires_admission', card)
        self.assertIn('Testset', c.hold_reason_label('official_method_retired_requires_admission', language='de'))

    def test_unknown_reason_never_leaks_exception_or_paths(self):
        card = c.rescue_card(ROW, 'internal_failure /private/path token=do-not-show')
        self.assert_card(card)
        self.assertNotIn('do-not-show', card)
        self.assertNotIn('/private', card)
        self.assertIn('investigate the cause', card)

    def test_operational_hold_preserves_key_and_board_contract(self):
        state = {'steps': {}, 'operational_hold': {'reason': 'official_method_retired_requires_admission'}}
        effects = mock.Mock()
        effects.board.return_value = False
        with mock.patch.object(c, 'alert') as alert:
            c.operational_escalate(ROW, state, effects, c.utcnow(),
                                  'official_method_retired_requires_admission', exhausted=False)
        self.assert_card(alert.call_args.kwargs['text'])
        self.assertTrue(alert.call_args.kwargs['urgent'])
        self.assertIn('official_method_retired_requires_admission', effects.board.call_args.args[0])
        self.assertEqual(state['operational_hold']['reason'], 'official_method_retired_requires_admission')

    def test_exhaustion_uses_clear_card(self):
        row = dict(ROW, status='paid', evaluation_status='exhausted')
        state = {'evaluation_exhausted': {'reason': 'private_error_detail'}}
        with mock.patch.object(c, 'alert') as alert:
            c.manage_evaluation(row, state, mock.Mock(), c.utcnow())
        card = alert.call_args.kwargs['text']
        self.assert_card(card)
        self.assertIn('automatic evaluation attempts failed', card)
        self.assertNotIn('private_error_detail', card)

    def test_sla_card_identifies_customer_and_model(self):
        self.assert_card(c.sla_message(ROW, 36))
        self.assertIn('24 hours', c.sla_message(ROW, 24))

    def test_email_fallback_and_unsafe_link(self):
        row = dict(ROW, customer_name=None, model_link='https://host.invalid/model?token=secret')
        card = c.rescue_card(row, 'gpu_pod_capacity')
        self.assertIn('owner@example.com', card)
        self.assertNotIn('secret', card)
        self.assertIn(c.SITE + '/submit', card)


if __name__ == '__main__':
    unittest.main()
