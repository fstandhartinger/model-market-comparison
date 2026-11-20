"""Keep the exact wrapper-owned AirDecision order out of generic measurement."""
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

import autopickup
import measurement_dispatch
import v16_profiles


ORDER = "2be2698b-dc43-42a1-8b8c-1fe228fd0d30"
NEIGHBOR = "2be2698b-dc43-42a1-8b8c-1fe228fd0d31"


class AirDecisionExclusiveMeasurementTests(unittest.TestCase):
    def test_timer_cannot_start_retry_or_clear_hold_even_after_registration(self):
        for status in ("pending", "starting", "running", "failed", "exhausted"):
            with self.subTest(status=status):
                row = {"id": ORDER, "status": "paid", "evaluation_status": status}
                admission = {"verdict": "ACCEPTED"}
                state = {"v16_profile_admission": admission, "operational_hold": {"reason": "fixture"}}
                effects = Mock(dry_run=False)
                with patch.object(autopickup, "update_row") as update:
                    autopickup.manage_evaluation(row, state, effects, datetime.now(timezone.utc))
                update.assert_not_called()
                self.assertEqual(effects.mock_calls, [])
                self.assertEqual(state, {"v16_profile_admission": admission, "operational_hold": {"reason": "fixture"}})

    def test_timer_preserves_review_passed_mail(self):
        row = {"id": ORDER, "status": "review_passed", "review_passed_at": "2026-11-20T05:30:00Z",
               "evaluation_status": "pending"}
        with patch.object(autopickup, "read_template", return_value="Order {ORDER_REF}"), \
                patch.object(autopickup, "send_tracked_mail") as send:
            autopickup.manage_evaluation(row, {"source_review_gate": {"verdict": "PASS"}},
                                         Mock(dry_run=False), datetime.now(timezone.utc))
        send.assert_called_once()

    def test_service_v16_adoption_and_legacy_dispatch_refuse_before_reads(self):
        with patch.object(autopickup, "load_row") as row, patch.object(autopickup, "load_state") as state, \
                patch.object(autopickup, "validate_review_gate") as validate:
            with self.assertRaisesRegex(autopickup.PickupError, "separate native measurement wrapper"):
                autopickup.evaluate(ORDER)
            with self.assertRaisesRegex(autopickup.PickupError, "separate native measurement wrapper"):
                autopickup.evaluate_v16_generation(ORDER, Path(ORDER))
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "separate_native_measurement_wrapper_required"):
                autopickup.dispatch_measurement(ORDER, Path(ORDER))
        row.assert_not_called()
        state.assert_not_called()
        validate.assert_not_called()

    def test_generic_measurement_refuses_before_acceptance(self):
        with patch.object(v16_profiles, "accepted") as accepted:
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "separate_native_measurement_wrapper_required"):
                v16_profiles.measure(Path(ORDER))
        accepted.assert_not_called()

    def test_neighbor_continues_through_ordinary_evaluate(self):
        with patch.object(autopickup, "load_row", return_value=None) as row:
            with self.assertRaisesRegex(autopickup.PickupError, "real live order"):
                autopickup.evaluate(NEIGHBOR)
        row.assert_called_once_with(NEIGHBOR)


if __name__ == "__main__":
    unittest.main()
