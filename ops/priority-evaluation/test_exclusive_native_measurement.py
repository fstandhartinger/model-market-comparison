"""The ordinary pickup routes cannot dispatch a wrapper-owned paid order."""
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

import autopickup
import measurement_dispatch
import native_owner
import v16_profiles


class ExclusiveNativeMeasurementTests(unittest.TestCase):
    def test_timer_does_not_claim_or_start_with_a_registered_admission(self):
        order = native_owner.EXCLUSIVE_MEASUREMENT_ORDER
        row = {"id": order, "status": "paid", "evaluation_status": "starting"}
        state = {"v16_profile_admission": {"verdict": "ACCEPTED"}}
        effects = Mock(dry_run=False)
        with patch.object(autopickup, "update_row") as update:
            autopickup.manage_evaluation(row, state, effects, datetime.now(timezone.utc))
        update.assert_not_called()
        self.assertEqual(effects.mock_calls, [])
        self.assertEqual(state, {"v16_profile_admission": {"verdict": "ACCEPTED"}})

    def test_service_entry_and_generic_adoption_refuse_before_reading_state(self):
        order = native_owner.EXCLUSIVE_MEASUREMENT_ORDER
        with patch.object(autopickup, "load_row") as load_row, patch.object(autopickup, "load_state") as load_state:
            with self.assertRaisesRegex(autopickup.PickupError, "separate native measurement wrapper"):
                autopickup.evaluate(order)
            with self.assertRaisesRegex(autopickup.PickupError, "separate native measurement wrapper"):
                autopickup.evaluate_v16_generation(order, Path(order))
        load_row.assert_not_called()
        load_state.assert_not_called()

    def test_generic_measurement_refuses_before_acceptance(self):
        order = native_owner.EXCLUSIVE_MEASUREMENT_ORDER
        with patch.object(v16_profiles, "accepted") as accepted:
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "separate_native_measurement_wrapper_required"):
                v16_profiles.measure(Path(order))
        accepted.assert_not_called()

    def test_neighbor_order_continues_through_ordinary_evaluate(self):
        neighbor = "9d46b4ad-b7b2-4d02-beda-7a56db409849"
        with patch.object(autopickup, "load_row", return_value=None) as load_row:
            with self.assertRaisesRegex(autopickup.PickupError, "real live order"):
                autopickup.evaluate(neighbor)
        load_row.assert_called_once_with(neighbor)


if __name__ == "__main__":
    unittest.main()
