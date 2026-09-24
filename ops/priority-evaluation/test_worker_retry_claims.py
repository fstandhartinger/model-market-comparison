import importlib.util
import sqlite3
import unittest
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

    def eligibility_from(self, query):
        marker = f"WHERE r.id=(SELECT id FROM {worker.TABLE} WHERE "
        return query.split(marker, 1)[1].split(" ORDER BY created_at", 1)[0]

    def evaluate(self, columns, expression, values):
        names = ",".join(columns)
        placeholders = ",".join("?" for _ in columns)
        sql = (
            f"WITH request({names}) AS (SELECT {placeholders}) "
            f"SELECT CASE WHEN {expression} THEN 1 ELSE 0 END FROM request"
        )
        with sqlite3.connect(":memory:") as db:
            return bool(db.execute(sql, values).fetchone()[0])

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
        query = self.query_for(worker.claim_refund)
        self.assertIn(expression.strip(), self.eligibility_from(query))
        # SQLite lacks PostgreSQL's null-safe inequality operator; preserve its truth table.
        expression = expression.replace(
            "refund_status IS DISTINCT FROM 'failed'",
            "(refund_status <> 'failed' OR refund_status IS NULL)",
        )
        expression = expression.replace(
            "refund_status IS DISTINCT FROM 'canceled'",
            "(refund_status <> 'canceled' OR refund_status IS NULL)",
        )
        columns = ("refund_status", "refund_id", "refund_attempts")
        cases = (
            ("failed", None, 0, True),
            ("failed", None, 2, True),
            ("failed", None, 3, False),
            ("failed", "re_123", 1, False),
            ("canceled", None, 2, True),
            ("canceled", "re_123", 0, False),
            ("unknown", None, 3, True),
            (None, None, 3, True),
        )
        for refund_status, refund_id, attempts, expected in cases:
            with self.subTest(refund_status=refund_status, refund_id=refund_id, attempts=attempts):
                self.assertEqual(
                    self.evaluate(columns, expression, (refund_status, refund_id, attempts)),
                    expected,
                )

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
        eligibility = self.eligibility_from(query)

        self.assertIn(f"id='{request_id}'::uuid", eligibility)
        self.assertIn("status IN ('paid','review_passed','refund_due','refund_pending')", eligibility)
        self.assertNotIn("refund_attempts <", eligibility)


if __name__ == "__main__":
    unittest.main()
