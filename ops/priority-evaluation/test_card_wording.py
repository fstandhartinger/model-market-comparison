"""Card clarity regressions; all notification and persistence effects are mocked."""
import ast
import importlib.util
import importlib.machinery
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
        self.assertTrue(ROW['model_link'] in lines[1] or c.SITE + '/submit' in lines[1])
        self.assertNotIn(c.order_ref(ROW['id']), card)
        self.assertNotIn('STATE.md', card)
        self.assertNotIn('🧑 Für dich', card)
        self.assertIn('🤖 Agenten', card)
        self.assertLessEqual(len(lines[1].split(': ', 1)[1]), 220)

    def test_retired_method_explains_actual_blocker(self):
        card = c.rescue_card(ROW, 'official_method_retired_requires_admission')
        self.assert_card(card)
        self.assertIn('old test set is retired', card.lower())
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
        self.assertIn('automatic evaluation attempts failed', card.lower())
        self.assertNotIn('private_error_detail', card)

    def test_sla_card_identifies_customer_and_model(self):
        self.assert_card(c.sla_message(ROW, 36))
        self.assertIn('24 hours', c.sla_message(ROW, 24))

    @unittest.skipUnless(Path('/home/flori/bin/notify').is_file(), 'installed Sandy notifier is unavailable')
    def test_actual_notify_contract_and_compaction(self):
        loader = importlib.machinery.SourceFileLoader('actual_notify_card_test', '/home/flori/bin/notify')
        notify_spec = importlib.util.spec_from_loader(loader.name, loader)
        notify = importlib.util.module_from_spec(notify_spec)
        loader.exec_module(notify)
        row = dict(ROW, customer_name=None, email='metask.customer@example.com')
        for card, level in [(c.rescue_card(row, reason), 'urgent') for reason in c.HOLD_REASON_LABELS] + [
                (c.sla_message(row, 36), 'urgent'), (c.sla_message(row, 24), 'now')]:
            todos = notify.validate_format(card, level)
            self.assertEqual(notify.card_lint(card), [])
            compact = notify.compact_immediate(card, todos, 'card-wording-test', dry_run=True)
            self.assertLessEqual(len(compact), 500)
            self.assertEqual(notify.card_lint(compact), [])

    @unittest.skipUnless(Path('/home/flori/bin/notify').is_file(), 'installed Sandy notifier is unavailable')
    def test_every_operational_card_callsite_and_approval_caption(self):
        loader = importlib.machinery.SourceFileLoader('actual_notify_all_cards', '/home/flori/bin/notify')
        nspec = importlib.util.spec_from_loader(loader.name, loader)
        notify = importlib.util.module_from_spec(nspec)
        loader.exec_module(notify)
        tree = ast.parse((HERE / 'autopickup.py').read_text())
        checked = 0
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'agent_status_card':
                # Execute each actual call's presentation arguments with one synthetic order.
                status = ast.literal_eval(node.args[1])
                detail = ast.literal_eval(node.args[2])
                kwargs = {k.arg: ast.literal_eval(k.value) for k in node.keywords}
                card = c.agent_status_card(ROW, status, detail, **kwargs)
                level = 'urgent' if kwargs.get('urgent', True) else 'now'
                todos = notify.validate_format(card, level)
                self.assertEqual(notify.card_lint(card), [])
                short = notify.compact_immediate(card, todos, 'card-wording-test', dry_run=True)
                self.assertEqual(notify.card_lint(short), [])
                checked += 1
        self.assertEqual(checked, 20)
        for status, detail in [('is complete: the customer received the result', 'No X update was needed.'),
                               ('is complete: its ranking update is published on X',
                                'Posted from @airesearch12: https://x.com/airesearch12/status/123456789')]:
            card = c.completed_status_card(ROW, status, detail)
            todos = notify.validate_format(card, 'now')
            self.assertEqual(notify.card_lint(card), [])
            self.assertIn(detail, card)
            self.assertIn(ROW['model_name'], card)
            self.assertIn('Metask', card)
            notify.compact_immediate(card, todos, 'card-wording-test', dry_run=True)
        # Health card deliberately summarizes private details without exposing raw reason keys.
        health = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'health')
        assignment = next(n for n in ast.walk(health) if isinstance(n, ast.Assign)
                          and any(isinstance(t, ast.Name) and t.id == 'message' for t in n.targets))
        expr = ast.Expression(assignment.value)
        card = eval(compile(expr, '<health-card>', 'eval'), {'fresh': [1, 2]})
        notify.validate_format(card, 'now')
        self.assertEqual(notify.card_lint(card), [])
        for card in [c.refund_approval.caption(ROW, kind, '10 Oct 12:00 UTC')
                     for kind in c.refund_approval.REASONS] + [
                         c.sla_decision.caption(ROW, '10 Oct 12:00 UTC'),
                         c.refusal_approval.approval_caption(ROW, 'refusal'),
                         c.refusal_approval.approval_caption(ROW, 'change_request')]:
            todos = notify.validate_format(card, 'now', ask_minutes=960)
            self.assertEqual(notify.card_lint(card), [])
            short = notify.compact_immediate(card, todos, 'card-wording-test', dry_run=True)
            notify.validate_format(short, 'now', ask_minutes=960)
            self.assertEqual(notify.card_lint(short), [])

    def test_email_fallback_and_unsafe_link(self):
        row = dict(ROW, customer_name=None, model_link='https://host.invalid/model?token=secret')
        card = c.rescue_card(row, 'gpu_pod_capacity')
        self.assertIn('owner@example.com', card)
        self.assertNotIn('secret', card)
        self.assertIn(c.SITE + '/submit', card)


if __name__ == '__main__':
    unittest.main()
