import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import autopickup as ap  # noqa: E402

RID = "b80901aa-5eb3-44b4-8722-078f89204d4a"
UNSUPPORTED_META = {"jevbench": {"system_key": "urun_sense", "system": {
    "support": {"choice": "native", "noul": "native", "score": "native"}, "endpoint_kind": "api",
    "price_in_per_m": None, "price_out_per_m": None, "price_kind": "unavailable", "cost_basis": "BLOCKED"}}}


class TariffMissingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.job = ap.job_directory(RID, self.root)
        (self.job / "trusted-runner").mkdir(parents=True)
        (self.job / "STATE.md").write_text("# state\n")
        self.write_bundle({"jevbench": {"backend": "unsupported"}}, UNSUPPORTED_META)

    def tearDown(self):
        self.tmp.cleanup()

    def write_bundle(self, runtime, meta):
        (self.job / "trusted-runner/RUNTIME.json").write_text(json.dumps(runtime))
        (self.job / "trusted-runner/MEASUREMENT-META.json").write_text(json.dumps(meta))

    def row(self, **extra):
        row = {"id": RID, "stripe_mode": "live", "synthetic_test": False, "access_type": "api_endpoint",
               "status": "paid", "benchmarks": ["jevbench"], "customer_hold_started_at": None, "refund_id": None, "refund_decision": None,
               "result_delivered_at": None,
               "access_instructions": json.dumps({"endpoint": "https://inference.urun.sh/v1/systemone",
                                                  "model": "sense-latest", "api_key": "secret"})}
        row.update(extra)
        return row

    def run_cmd(self, row, updated=True):
        with mock.patch.object(ap, "JOB_ROOT", self.root), mock.patch.object(ap, "load_row", return_value=row), \
                mock.patch.object(ap, "update_row", return_value=updated) as update:
            result = ap.tariff_missing(RID)
        return result, update

    def test_missing_tariff_becomes_a_change_request(self):
        result, update = self.run_cmd(self.row())
        self.assertIn("clock paused", result)
        assignments, guard = update.call_args.args[1], update.call_args.args[2]
        self.assertIn("customer_hold_reason='customer_changes'", assignments)
        self.assertIn("change_request_email_status='approval_required'", assignments)
        self.assertIn("customer_hold_started_at IS NULL", guard)
        self.assertIn("refund_decision IS NULL", guard)
        self.assertIn("IS DISTINCT FROM 'running'", guard)
        change = json.loads((self.job / "review/CHANGES-REQUESTED.json").read_text())
        self.assertEqual(change["reason"], "public_tariff_missing")
        self.assertIn("https://inference.urun.sh/v1/systemone", change["findings"][0])
        self.assertEqual(len(change["findings"]), 2)
        for finding in change["findings"]:
            self.assertLessEqual(len(finding), 400)
            self.assertFalse(finding.endswith("..."))
        self.assertNotIn("secret", json.dumps(change))
        self.assertIn("Public tariff missing", (self.job / "STATE.md").read_text())
        with mock.patch.object(ap, "SHARE_ROOT", Path(ap.__file__).resolve().parent):
            subject, body = ap.change_request_message(RID, self.job)
        self.assertIn("public, bookable USD price", body)
        self.assertIn("per credit plus the credits charged per token) on a public page.", body)
        self.assertIn("link to the public price page", body)
        self.assertNotIn("Training data", body)
        self.assertNotIn("{{", body)

    def test_priced_bundle_is_refused(self):
        meta = json.loads(json.dumps(UNSUPPORTED_META))
        meta["jevbench"]["system"].update(price_in_per_m=1.0, price_out_per_m=1.0, price_kind="public")
        self.write_bundle({"jevbench": {"backend": "typesafe"}}, meta)
        with self.assertRaises(ap.PickupError):
            self.run_cmd(self.row())
        self.assertFalse((self.job / "review/CHANGES-REQUESTED.json").exists())

    def test_unsupported_for_another_reason_is_refused(self):
        meta = json.loads(json.dumps(UNSUPPORTED_META))
        meta["jevbench"]["system"].update(price_in_per_m=0.5, price_out_per_m=0.5, price_kind="public")
        self.write_bundle({"jevbench": {"backend": "unsupported"}}, meta)
        with self.assertRaises(ap.PickupError):
            self.run_cmd(self.row())

    def test_held_open_weights_or_delivered_orders_are_refused(self):
        for row in (self.row(customer_hold_started_at="t"), self.row(access_type="open_weights"),
                    self.row(result_delivered_at="t"), self.row(refund_decision="approved"),
                    self.row(stripe_mode="test"), self.row(access_instructions=None)):
            with self.subTest(row=row):
                with self.assertRaises(ap.PickupError):
                    self.run_cmd(row)
        self.assertFalse((self.job / "review/CHANGES-REQUESTED.json").exists())

    def test_existing_change_request_is_not_overwritten(self):
        (self.job / "review").mkdir()
        (self.job / "review/CHANGES-REQUESTED.json").write_text("{}")
        with self.assertRaises(ap.PickupError):
            self.run_cmd(self.row())
        self.assertEqual((self.job / "review/CHANGES-REQUESTED.json").read_text(), "{}")

    def test_image_or_uncovered_benchmarks_are_refused(self):
        for row in (self.row(benchmarks=["jevbench", "imagejevbench"]), self.row(benchmarks=[])):
            with self.subTest(row=row):
                with self.assertRaises(ap.PickupError):
                    self.run_cmd(row)
        self.assertFalse((self.job / "review/CHANGES-REQUESTED.json").exists())

    def test_database_error_without_a_committed_hold_removes_the_draft(self):
        with mock.patch.object(ap, "JOB_ROOT", self.root), \
                mock.patch.object(ap, "load_row", side_effect=[self.row(), self.row()]), \
                mock.patch.object(ap, "update_row", side_effect=RuntimeError("timeout")):
            with self.assertRaises(RuntimeError):
                ap.tariff_missing(RID)
        self.assertFalse((self.job / "review/CHANGES-REQUESTED.json").exists())

    def test_database_error_after_a_committed_hold_keeps_the_draft(self):
        committed = self.row(customer_hold_started_at="t", customer_hold_reason="customer_changes",
                             change_request_email_status="approval_required")
        with mock.patch.object(ap, "JOB_ROOT", self.root), \
                mock.patch.object(ap, "load_row", side_effect=[self.row(), committed]), \
                mock.patch.object(ap, "update_row", side_effect=RuntimeError("timeout")):
            with self.assertRaises(RuntimeError):
                ap.tariff_missing(RID)
        self.assertTrue((self.job / "review/CHANGES-REQUESTED.json").exists())

    def test_other_change_requests_keep_the_general_template(self):
        (self.job / "review").mkdir()
        (self.job / "review/CHANGES-REQUESTED.json").write_text(json.dumps({"reason": "api_key_missing",
                                                                             "findings": ["API key: please add one."]}))
        with mock.patch.object(ap, "SHARE_ROOT", Path(ap.__file__).resolve().parent):
            _subject, body = ap.change_request_message(RID, self.job)
        self.assertIn("Training data", body)

    def test_lost_guard_race_leaves_no_change_request(self):
        with self.assertRaises(ap.PickupError):
            self.run_cmd(self.row(), updated=False)
        self.assertFalse((self.job / "review/CHANGES-REQUESTED.json").exists())

    def test_cli_subcommand_exists(self):
        with mock.patch.object(ap, "tariff_missing", return_value="ok") as cmd, \
                mock.patch.object(ap, "cycle_lock") as lock:
            lock.return_value.__enter__ = mock.Mock(return_value=True)
            lock.return_value.__exit__ = mock.Mock(return_value=False)
            self.assertEqual(ap.main(["tariff-missing", RID]), 0)
        cmd.assert_called_once_with(RID)


if __name__ == "__main__":
    unittest.main()
