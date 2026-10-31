"""Approval cards reach notify with their own exact buttons; Telegram and the board are mocked."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import refund_approval as rf  # noqa: E402
import refusal_approval as ra  # noqa: E402
import sla_decision as sd  # noqa: E402

ROW = {'id': '11111111-1111-4111-8111-111111111111', 'customer_name': 'Metask',
       'email': 'owner@example.com', 'model_name': 'metask-jev-rain-12B',
       'model_link': 'https://huggingface.co/Metask/metask-jev-rain-12B', 'amount_total': 4900,
       'paid_at': '2026-10-09T00:00:00+00:00', 'status': 'refund_due'}
NOTIFY = Path('/home/flori/bin/notify')


def done(args, returncode=0, stdout='', stderr=''):
    return subprocess.CompletedProcess(args, returncode, stdout, stderr)


class FakeNotify:
    """Records notify/board calls; the preview answer is configurable per test."""

    def __init__(self, preview):
        self.preview, self.calls = preview, []

    def __call__(self, args, **kwargs):
        self.calls.append((args, kwargs))
        if args[0].endswith('agent-board'):
            return done(args)
        if '--dry-run' in args:
            return self.preview(args)
        return done(args, stdout='MESSAGE_ID=4242\n')


def card_senders(tmp):
    """(name, send(state, path)) for each approval card owner's real send function."""
    def refund(state, path):
        rf._send_card(state, path, rf.caption(ROW, 'operator_refusal', 'x'), 1000.0)

    def sla(state, path):
        sd._send_card(state, path, sd.caption(ROW, 'x'), 1000.0)

    def refusal(state, path):
        state.setdefault('draft', {'to': ROW['email'], 'subject': 's', 'body': 'b'})
        ra.notify_card(state, path, 1000.0, 'refusal', row=ROW)
    return [('refund', refund), ('sla', sla), ('refusal', refusal)]


class ApprovalCardSend(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        patches = [mock.patch.object(ra, 'telegram_config', return_value=('token', 99)),
                   mock.patch.object(ra, 'card', lambda *a, **k: None),
                   mock.patch.object(ra, 'HOME', self.tmp),
                   mock.patch.dict(os.environ, {}, clear=False)]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        for key in ('FASTLANE_DB', 'FASTLANE_STATE_ROOT', 'NOTIFY_FREE_TEXT_ASK'):
            os.environ.pop(key, None)
        (self.tmp / 'DECISIONS.md').write_text('x')

    def run_send(self, send, fake, name):
        path = self.tmp / f'{name}.json'
        state = {'notification': 'pending'}

        def inbox_or_fake(args, **kwargs):
            if args[0].endswith('agent-board') and 'inbox' in args:
                return subprocess.CompletedProcess(args, 0, b'No matching entries.', b'')
            return fake(args, **kwargs)
        with mock.patch.object(subprocess, 'run', side_effect=inbox_or_fake):
            send(state, path)
        return state, path

    def test_cards_opt_out_of_notify_buttons_and_send(self):
        for name, send in card_senders(self.tmp):
            with self.subTest(card=name):
                fake = FakeNotify(lambda a: done(a, stdout='[DRY RUN] would send to the private chat\n'))
                state, _ = self.run_send(send, fake, name)
                self.assertEqual(state['notification'], 'sent')
                self.assertEqual(state['message_id'], 4242)
                notify_calls = [c for c in fake.calls if c[0][0].endswith('notify')]
                self.assertEqual(len(notify_calls), 2)
                for args, kwargs in notify_calls:
                    self.assertEqual(kwargs['env']['NOTIFY_FREE_TEXT_ASK'], '1')
                    self.assertNotIn('--choices', args)  # the module attaches its own exact keyboard
                self.assertNotIn('preview_failures', state)

    def test_refused_preview_is_recorded_and_alerted_once(self):
        rejection = 'notify: decision cards need buttons: add --choices with 2-5 options'
        for name, send in card_senders(self.tmp):
            with self.subTest(card=name):
                fake = FakeNotify(lambda a: done(a, 2, stderr=rejection + '\n'))
                path = self.tmp / f'{name}-refused.json'
                state = {'notification': 'pending'}

                def inbox_or_fake(args, **kwargs):
                    if args[0].endswith('agent-board') and 'inbox' in args:
                        return subprocess.CompletedProcess(args, 0, b'No matching entries.', b'')
                    return fake(args, **kwargs)
                with mock.patch.object(subprocess, 'run', side_effect=inbox_or_fake), \
                        mock.patch('sys.stderr'):
                    for _ in range(ra.PREVIEW_ALERT_AFTER + 3):
                        send(state, path)
                self.assertEqual(state['notification'], 'pending')
                self.assertEqual(state['preview_failures'], ra.PREVIEW_ALERT_AFTER + 3)
                self.assertIn('decision cards need buttons', state['preview_error'])
                self.assertTrue(state['preview_alerted'])
                posts = [c for c in fake.calls if c[0][0].endswith('agent-board') and 'post' in c[0]]
                self.assertEqual(len(posts), 1)
                self.assertNotIn('--to', posts[0][0])  # the pickup's own inbox gates refusal cards
                self.assertNotIn('@', posts[0][1]['input'])
                self.assertIn('decision cards need buttons', posts[0][1]['input'])

                fake.preview = lambda a: done(a, stdout='[DRY RUN] would send to the private chat\n')
                with mock.patch.object(subprocess, 'run', side_effect=inbox_or_fake):
                    send(state, path)
                self.assertEqual(state['notification'], 'sent')
                for key in ('preview_failures', 'preview_error', 'preview_alerted'):
                    self.assertNotIn(key, state)

    def test_capped_preview_records_the_verdict_not_the_card(self):
        capped = ('[DRY RUN] --florian-only override would be logged: reason\n'
                  '[DRY RUN] global immediate limit reached; message would be queued:\n\n'
                  '🧑 DU BIST DRAN\nWorum geht\'s: Fast-lane for owner@example.com\n')
        path = self.tmp / 'capped.json'
        state = {}
        with mock.patch.object(subprocess, 'run', side_effect=AssertionError('no board post yet')), \
                mock.patch('sys.stderr'):
            ra.preview_failed(state, path, done([], stdout=capped), 'test')
        self.assertEqual(state['preview_error'],
                         'exit 0: [DRY RUN] global immediate limit reached; message would be queued:')
        self.assertNotIn('example.com', path.read_text())

    def test_preview_error_keeps_the_refusal_not_a_warning(self):
        # 580d6afe (31 Oct): a repeat-lint warning printed first hid notify's card v2 refusal for 20 cycles.
        stderr = ('repeat-lint warning (long-window): "in 12 hours" is a 12 h window\n'
                  'notify: card v2 refused (not sent): headline is 126 characters; keep it at most 120\n'
                  'READY FIX (copy this line):\n')
        path = self.tmp / 'warned.json'
        state = {}
        with mock.patch('sys.stderr'):
            ra.preview_failed(state, path, done([], 2, stderr=stderr), 'test')
        self.assertTrue(state['preview_error'].startswith('exit 2: notify: card v2 refused'))

    @unittest.skipUnless(NOTIFY.is_file(), 'installed Sandy notifier is unavailable')
    def test_real_notify_accepts_every_approval_caption(self):
        rows = [ROW,
                # 580d6afe shape: email only, pinned HF tree link (card v2 headline was 126 characters).
                dict(ROW, customer_name=None, email='chenyuwang166@gmail.com', model_name='MetaDecision-31B-Rain',
                     model_link='https://huggingface.co/MeTask-Rain/MetaDecision-31B-Rain/tree/' + '0' * 40,
                     amount_total=9900),
                dict(ROW, customer_name=None, email='gabriel.keith@example-company.com', model_link='',
                     model_name='HS1 0.1.2 (Hyland, Gemma-4-26B-A4B-it + LoRA, option-letter logprob readout, FP8)'),
                dict(ROW, customer_name=None, email='x' * 120 + '@example.com', model_name='Model ' * 60,
                     amount_total=None)]
        captions = []
        for row in rows:
            cards = [rf.caption(row, kind, '2026-10-12 12:00 UTC') for kind in rf.REASONS]
            cards += [sd.caption(row, '2026-10-12 12:00 UTC')]
            cards += [ra.approval_caption(row, kind) for kind in ra.KINDS]
            # Without a known amount no EUR value exists; notify then only warns (money-eur).
            captions += [(text, row.get('amount_total') is not None) for text in cards]
        # notify's inbox freshness gate is not under test (the caller's inbox decides it, not the card text);
        # NOTIFY_OUTBOX_REPLAY skips only that gate, every card lint still runs.
        env = {**os.environ, 'NOTIFY_SOURCE': 'approval-card-test', 'AGENT_BOARD_NAME': 'approval-card-test',
               'NOTIFY_OUTBOX_REPLAY': '1', 'NOTIFY_QUIET_BYPASS': '1',  # Florian's quiet mode is not under test
               **ra.CALLER_BUTTONS_ENV}
        for text, strict in captions:
            with self.subTest(caption=text.splitlines()[1]):
                result = subprocess.run([str(NOTIFY), 'now', '--florian-only', 'approval card regression test',
                                         '--ask', '720', '--text-stdin', '--dry-run'],
                                        input=text, text=True, capture_output=True, env=env, timeout=60)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertRegex(result.stdout, r'\[DRY RUN\] (would send to the|this open human action already exists)')
                warnings = [l for l in result.stderr.splitlines() if l.startswith('repeat-lint')]
                if not strict:
                    warnings = [l for l in warnings if '(money-eur)' not in l]
                self.assertEqual(warnings, [])  # no window/EUR warnings either
                self.assertNotIn('reformatted automatically', result.stdout + result.stderr)

if __name__ == '__main__':
    unittest.main()
