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

    @unittest.skipUnless(NOTIFY.is_file(), 'installed Sandy notifier is unavailable')
    def test_real_notify_accepts_every_approval_caption(self):
        captions = [rf.caption(ROW, kind, '2026-10-12 12:00 UTC') for kind in rf.REASONS]
        captions += [sd.caption(ROW, '2026-10-12 12:00 UTC')]
        captions += [ra.approval_caption(ROW, kind) for kind in ra.KINDS]
        env = {**os.environ, 'NOTIFY_SOURCE': 'approval-card-test', 'AGENT_BOARD_NAME': 'approval-card-test',
               **ra.CALLER_BUTTONS_ENV}  # own empty inbox: notify's freshness gate is not under test
        for text in captions:
            with self.subTest(caption=text.splitlines()[3:4]):
                result = subprocess.run([str(NOTIFY), 'now', '--florian-only', 'approval card regression test',
                                         '--ask', '1440', '--text-stdin', '--dry-run'],
                                        input=text, text=True, capture_output=True, env=env, timeout=60)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('[DRY RUN]', result.stdout)


if __name__ == '__main__':
    unittest.main()
