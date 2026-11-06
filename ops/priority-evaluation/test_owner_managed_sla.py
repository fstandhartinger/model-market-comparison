"""WPS's one-off ruling must bypass generic 40h cards, including stale decisions."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import autopickup as ap
import sla_decision as sd

WPS = {'id': '114b6e41-14c5-42b1-9a35-386ab83b62e9',
       'stripe_mode': 'live', 'synthetic_test': False}
OTHER = {**WPS, 'id': '214b6e41-14c5-42b1-9a35-386ab83b62e9'}


class OwnerManagedSlaTests(unittest.TestCase):
    def test_bypasses_stale_decisions_without_mutating_them(self):
        for decision in ('delay_note', 'refund', 'no_action', None):
            with self.subTest(decision=decision), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                path = root / (WPS['id'] + '.json')
                old = json.dumps({'decision': decision})
                path.write_text(old)
                with mock.patch.object(sd, '_send_card') as send, \
                     mock.patch.object(sd, 'apply_callbacks') as callbacks:
                    self.assertEqual(sd.advance(WPS, root, mock.Mock(dry_run=False), 1000, 'deadline'),
                                     'owner_managed')
                send.assert_not_called()
                callbacks.assert_not_called()
                self.assertEqual(path.read_text(), old)
                self.assertEqual(list(root.iterdir()), [path])

    def test_no_state_created_or_generic_text_available(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'absent'
            self.assertEqual(sd.advance(WPS, root, mock.Mock(dry_run=False), 1000, 'deadline'),
                             'owner_managed')
            self.assertFalse(root.exists())
        with self.assertRaises(ValueError):
            sd.caption(WPS, 'deadline')
        with self.assertRaises(ValueError):
            ap.delay_note_message(WPS)

    def test_cycle_skips_before_loading_or_applying_any_decision(self):
        effects = mock.Mock(dry_run=False)
        with mock.patch.object(ap, 'sla_decision_rows', return_value=[WPS]), \
             mock.patch.object(ap, 'load_state') as load, \
             mock.patch.object(sd, 'advance', return_value='refund') as advance, \
             mock.patch.object(ap, 'apply_refund_decision') as refund:
            self.assertEqual(ap.sla_decisions(None, Path('/unused'), effects), 0)
        load.assert_not_called()
        advance.assert_not_called()
        refund.assert_not_called()
        effects.mail.assert_not_called()

    def test_other_order_retains_normal_path(self):
        self.assertFalse(sd.owner_managed(OTHER))
        self.assertTrue(sd.owner_managed({**WPS, 'id': WPS['id'].upper()}))
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(sd, 'live_runtime', return_value=False):
            self.assertEqual(sd.advance(OTHER, Path(tmp), mock.Mock(dry_run=True), 1000, 'deadline'), 'pending')


if __name__ == '__main__':
    unittest.main()
