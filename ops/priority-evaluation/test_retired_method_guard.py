"""Regression for urgent-autofix-394 (#22690/#22751): dispatch_measurement holds JevBench orders lacking a v1.6 admission."""
from pathlib import Path
import unittest
from unittest.mock import patch

import autopickup as ap


class Reached(Exception):
    pass


class RetiredMethodGuardTests(unittest.TestCase):
    def dispatch(self, benchmarks, state):
        def stop(*args, **kwargs):
            raise Reached()
        with patch.object(ap, "validate_review_gate", lambda job_dir: {"source_pins": {}}), \
                patch.object(ap, "load_row", lambda rid: {"benchmarks": benchmarks}), \
                patch.object(ap, "load_state", lambda rid: dict(state)), \
                patch.object(ap, "load_json_file", stop):
            try:
                ap.dispatch_measurement("00000000-0000-0000-0000-000000000000", Path("/nonexistent"))
            except ap.measurement_dispatch.OperationalHold as exc:
                return "HOLD:" + str(exc)
            except Reached:
                return "PROCEEDS"

    def test_jevbench_without_admission_holds(self):
        self.assertEqual(self.dispatch(["jevbench"], {}), "HOLD:official_method_retired_requires_admission")

    def test_jevbench_plus_image_without_admission_holds(self):
        self.assertEqual(self.dispatch(["jevbench", "imagejevbench"], {}), "HOLD:official_method_retired_requires_admission")

    def test_image_only_proceeds(self):
        self.assertEqual(self.dispatch(["imagejevbench"], {}), "PROCEEDS")

    def test_v16_admitted_proceeds(self):
        self.assertEqual(self.dispatch(["jevbench"], {"v16_profile_admission": {"verdict": "ACCEPTED"}}), "PROCEEDS")


if __name__ == "__main__":
    unittest.main()
