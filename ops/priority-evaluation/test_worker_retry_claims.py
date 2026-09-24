import importlib.util
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

    def test_failed_notification_gets_a_retry_backoff(self):
        query = self.query_for(worker.claim_notification)

        self.assertIn("notification_status='pending' AND (", query)
        self.assertIn("last_notification_attempt_at IS NULL", query)
        self.assertIn("last_notification_attempt_at < now()-interval '1 minute'", query)
        self.assertIn("notification_status='sending' AND last_notification_attempt_at < now()-interval '10 minutes'", query)

    def test_automatic_terminal_refunds_have_a_finite_retry_limit(self):
        query = self.query_for(worker.claim_refund)
        eligibility = self.eligibility_from(query)

        self.assertIn("refund_status IS DISTINCT FROM 'failed'", eligibility)
        self.assertIn("refund_status IS DISTINCT FROM 'canceled'", eligibility)
        self.assertIn(
            f"refund_id IS NULL AND refund_attempts < {worker.AUTO_REFUND_FAILURE_ATTEMPT_LIMIT}",
            eligibility,
        )

    def test_manual_refund_claim_is_not_limited_by_automatic_cap(self):
        request_id = "8f15b2f0-3d6e-4a70-b8a3-80dbdc57107a"
        query = self.query_for(worker.claim_refund, request_id)
        eligibility = self.eligibility_from(query)

        self.assertIn(f"id='{request_id}'::uuid", eligibility)
        self.assertIn("status IN ('paid','review_passed','refund_due','refund_pending')", eligibility)
        self.assertNotIn("refund_attempts <", eligibility)


if __name__ == "__main__":
    unittest.main()
