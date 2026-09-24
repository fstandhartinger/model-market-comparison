"""SQLite checks evaluate SQL truth-table fragments; PostgreSQL query assembly is structural only."""

import importlib.util
import io
import sqlite3
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch


WORKER_PATH = Path(__file__).with_name("worker.py")
SPEC = importlib.util.spec_from_file_location("priority_evaluation_worker", WORKER_PATH)
worker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)


class RetryClaimTests(unittest.TestCase):
    def query_for(self, claim, *args):
        with patch.object(worker, "sql_json", return_value=None) as sql_json:
            claim(*args)
        return sql_json.call_args.args[0]

    def evaluate(self, columns, expression, values):
        return bool(self.evaluate_value(columns, expression, values))

    def evaluate_value(self, columns, expression, values):
        names = ",".join(columns)
        placeholders = ",".join("?" for _ in columns)
        sql = (
            f"WITH request({names}) AS (SELECT {placeholders}) "
            f"SELECT {expression} FROM request"
        )
        with sqlite3.connect(":memory:") as db:
            return db.execute(sql, values).fetchone()[0]

    def test_failed_notification_has_a_retry_backoff(self):
        expression = worker.notification_claim_eligibility_sql()
        expression = expression.replace("now()-interval '1 minute'", "'2026-09-24 17:00:00'")
        expression = expression.replace("now()-interval '10 minutes'", "'2026-09-24 16:51:00'")
        columns = ("status", "notification_status", "last_notification_attempt_at")
        query = self.query_for(worker.claim_notification)
        self.assertIn(worker.notification_claim_eligibility_sql(), query)

        self.assertTrue(self.evaluate(columns, expression, ("paid", "pending", None)))
        self.assertTrue(self.evaluate(columns, expression, ("paid", "pending", "2026-09-24 16:59:00")))
        self.assertFalse(self.evaluate(columns, expression, ("paid", "pending", "2026-09-24 17:00:30")))
        self.assertTrue(self.evaluate(columns, expression, ("paid", "sending", "2026-09-24 16:50:00")))
        self.assertFalse(self.evaluate(columns, expression, ("paid", "sending", "2026-09-24 16:52:00")))
        self.assertFalse(self.evaluate(columns, expression, ("review_passed", "pending", None)))

    def test_automatic_terminal_refunds_have_a_finite_retry_limit(self):
        expression = worker.automatic_terminal_refund_retry_eligibility_sql()
        eligibility = worker.refund_claim_eligibility_sql()
        safe_reference = worker.refund_claim_has_safe_retry_reference_sql()
        query = self.query_for(worker.claim_refund)
        self.assertIn(" ".join(expression.split()), " ".join(eligibility.split()))
        self.assertIn(eligibility, query)
        # SQLite lacks PostgreSQL's null-safe inequality operator; preserve its truth table.
        expression = expression.replace(
            "refund_status IS DISTINCT FROM 'failed'",
            "(refund_status <> 'failed' OR refund_status IS NULL)",
        )
        expression = expression.replace(
            "refund_status IS DISTINCT FROM 'canceled'",
            "(refund_status <> 'canceled' OR refund_status IS NULL)",
        )
        columns = ("refund_status", "refund_id", "refund_attempts", "refund_idempotency_key")
        cases = (
            ("failed", None, 0, None, True),
            ("failed", None, 2, None, True),
            ("failed", None, 3, None, False),
            ("failed", "re_123", 1, "key", False),
            ("canceled", None, 2, None, True),
            ("canceled", "re_123", 0, "key", False),
            ("unknown", None, 3, "existing-key", True),
            ("unknown", None, 3, None, False),
            ("unknown", "re_123", 3, None, True),
            (None, None, 3, None, True),
        )
        for refund_status, refund_id, attempts, refund_key, expected in cases:
            with self.subTest(refund_status=refund_status, refund_id=refund_id, attempts=attempts, refund_key=refund_key):
                self.assertEqual(
                    self.evaluate(columns, expression, (refund_status, refund_id, attempts, refund_key)),
                    expected,
                )
        reference_columns = ("refund_id", "refund_idempotency_key", "refund_status")
        reference_cases = (
            (None, None, None, True),
            (None, None, "failed", True),
            (None, None, "canceled", True),
            (None, "existing-key", "unknown", True),
            ("re_123", None, "unknown", True),
            (None, None, "unknown", False),
            (None, None, "processing", False),
            (None, "existing-key", "processing", True),
        )
        for refund_id, key, status, expected in reference_cases:
            with self.subTest(refund_id=refund_id, key=key, status=status):
                self.assertEqual(
                    self.evaluate(reference_columns, safe_reference, (refund_id, key, status)),
                    expected,
                )
        normalized = " ".join(eligibility.split())
        self.assertEqual(normalized.count("AND (" + " ".join(safe_reference.split()) + ")"), 3)

    def test_unknown_refund_reuses_its_idempotency_key(self):
        columns = ("refund_id", "refund_idempotency_key", "refund_status", "refund_attempts")
        cases = (
            (None, "jev-priority-refund-existing", "unknown", 1, 1, "jev-priority-refund-existing"),
            (None, None, "failed", 1, 2, "jev-priority-refund-next"),
            (None, None, None, 0, 1, "jev-priority-refund-next"),
        )
        key_update = worker.refund_idempotency_key_update_sql("jev-priority-refund-next")
        attempts_update = f"refund_attempts + {worker.refund_attempt_increment_sql()}"
        with patch.object(worker.uuid, "uuid4") as uuid4:
            uuid4.return_value.hex = "next"
            query = self.query_for(worker.claim_refund)
        self.assertIn(f"refund_attempts={attempts_update}", query)
        self.assertIn(f"refund_idempotency_key={key_update}", query)
        for refund_id, key, status, attempts, expected_attempts, expected_key in cases:
            statement = (
                f"WITH request({','.join(columns)}) AS (SELECT {','.join('?' for _ in columns)}) "
                f"SELECT {attempts_update}, {key_update} FROM request"
            )
            with self.subTest(status=status, attempts=attempts), sqlite3.connect(":memory:") as db:
                actual_attempts, actual_key = db.execute(
                    statement, (refund_id, key, status, attempts)
                ).fetchone()
            self.assertEqual(actual_attempts, expected_attempts)
            self.assertEqual(actual_key, expected_key)

    def test_manual_refund_claim_is_not_limited_by_automatic_cap(self):
        request_id = "8f15b2f0-3d6e-4a70-b8a3-80dbdc57107a"
        query = self.query_for(worker.claim_refund, request_id)
        eligibility = worker.refund_claim_eligibility_sql(request_id)
        normalized = " ".join(query.split())

        self.assertIn(f"id='{request_id}'::uuid", eligibility)
        self.assertIn("status IN ('paid','review_passed','refund_due','refund_pending')", eligibility)
        self.assertNotIn("refund_attempts <", eligibility)
        self.assertIn("refund_attempts=refund_attempts + 0", normalized)
        self.assertIn(eligibility, query)
        with self.assertRaises(worker.WorkerError):
            worker.claim_refund("not-a-uuid")

    def test_manual_refund_cli_rejects_invalid_id_before_database_access(self):
        with patch.object(worker.sys, "argv", ["worker", "refund", "not-a-uuid"]), \
             patch.object(worker, "claim_refund") as claim, \
             patch.object(worker, "sql_json") as sql_json, \
             redirect_stderr(io.StringIO()):
            self.assertEqual(worker.main(), 1)
        claim.assert_not_called()
        sql_json.assert_not_called()

    def test_clear_key_boolean_controls_refund_id_reset(self):
        cleared = worker.refund_id_update_sql("re_new", True)
        retained = worker.refund_id_update_sql(None, False)

        self.assertIsNone(self.evaluate_value(("refund_id",), cleared, ("re_old",)))
        self.assertEqual(self.evaluate_value(("refund_id",), retained, ("re_old",)), "re_old")

    def test_unknown_refund_notice_repeats_only_until_successful_marker(self):
        notify = worker.refund_attention_should_notify

        self.assertTrue(notify("unknown", 1, 0, None))
        self.assertFalse(notify("unknown", 1, 1, "unknown"))
        self.assertTrue(notify("unknown", 1, 0, None))
        self.assertTrue(notify("failed", 1, 1, "unknown"))
        self.assertTrue(notify("unknown", 2, 1, "unknown"))
        self.assertFalse(notify("pending", 2, 1, "unknown"))

    def test_refund_notice_marker_updates_only_the_current_attempt(self):
        request_id = "8f15b2f0-3d6e-4a70-b8a3-80dbdc57107a"
        row = {"id": request_id, "refund_attempts": 2}
        with patch.object(worker, "sql_json", return_value={"id": request_id}) as sql_json:
            self.assertTrue(worker.mark_refund_attention_notified(row, "unknown"))
        query = sql_json.call_args.args[0]
        self.assertIn("refund_attention_notified_attempts=GREATEST(r.refund_attention_notified_attempts,2)", query)
        self.assertIn(
            "refund_attention_notified_state=CASE WHEN r.refund_attempts=2 THEN 'unknown' ELSE r.refund_attention_notified_state END",
            query,
        )
        self.assertIn("r.refund_attempts=2", query)

    def test_stale_notice_marker_records_only_its_attempt_after_concurrent_retry(self):
        eligibility = worker.refund_attention_marker_eligibility_sql(1, "unknown")
        eligibility = eligibility.replace("r.", "").replace(" IS DISTINCT FROM ", " IS NOT ")
        columns = (
            "refund_attempts",
            "refund_attention_notified_attempts",
            "refund_attention_notified_state",
        )

        # A successful notice for attempt 1 can be recorded after attempt 2 starts,
        # but it must not mark attempt 2's state as already notified.
        self.assertTrue(self.evaluate(columns, eligibility, (2, 0, None)))
        state_update = worker.refund_attention_marker_state_update_sql(1, "unknown").replace("r.", "")
        self.assertEqual(
            self.evaluate_value(("refund_attempts", "refund_attention_notified_state"), state_update, (2, "failed")),
            "failed",
        )
        self.assertTrue(worker.refund_attention_should_notify("unknown", 2, 1, "failed"))

        # Replaying the marker for attempt 1 does nothing once it was recorded.
        self.assertFalse(self.evaluate(columns, eligibility, (2, 1, "unknown")))


if __name__ == "__main__":
    unittest.main()
