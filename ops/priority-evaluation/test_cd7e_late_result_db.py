"""Isolated PostgreSQL contract. Run with pg_virtualenv python3 .../test_cd7e_late_result_db.py."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
from datetime import timedelta
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import uuid

import autopickup as ap
import cd7e_late_result as late
import fastlane_transactional as sender

DB = "cd7e_late_result_fixture"
ROOT = Path(__file__).resolve().parents[2]
CUSTOMER = "test@example.invalid"
SUBJECT = "Benchmark Heaven evaluation order cd7e038c: your result"
BODY = "JevBench result: score 82.50"
REF = "telegram:20073:101"


def sender_query(statement):
    # Use the real sender's SQL and lifecycle, with only its connection redirected.
    output = ap.sql(statement)
    return json.loads(output) if output else None


@unittest.skipUnless(os.environ.get("PG_VIRTUALENV") == "1", "requires isolated pg_virtualenv cluster")
class LateResultDB(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not os.environ.get("PGPORT") or os.environ.get("PGPORT") == "5432":
            raise RuntimeError("refusing default PostgreSQL server")
        subprocess.run(["createdb", DB], check=True)
        cls.db = patch.object(ap, "DB_NAME", DB)
        cls.db.start()
        cls.addClassCleanup(cls.db.stop)
        cls.query = patch.object(sender, "query", sender_query)
        cls.query.start()
        cls.addClassCleanup(cls.query.stop)
        cls.migrate("001_init.sql")
        # Production already contains this scope check. Seed its special template row
        # before running the migration, so replacing the check cannot drop that case.
        ap.sql("""
          ALTER TABLE bh_priority_eval_transactional_mail
            DROP CONSTRAINT bh_priority_eval_transactional_mail_template_key_check,
            ADD CONSTRAINT bh_priority_eval_mail_decisor_v163_template_scope_check CHECK (
              template_key IN ('payment_confirmation_v1','review_passed_v1','result_private_v1','result_public_v1')
              OR (template_key='decisor_result_public_v163_correction'
                AND request_id='3687485f-5a51-4964-bd9a-73973f3494d7'));
        """)
        cls.insert_order("3687485f-5a51-4964-bd9a-73973f3494d7")
        ap.sql("""
          INSERT INTO bh_priority_eval_transactional_mail
              (id,request_id,template_key,recipient,subject,body_sha256,expires_at)
          VALUES (gen_random_uuid(),'3687485f-5a51-4964-bd9a-73973f3494d7',
            'decisor_result_public_v163_correction','test@example.invalid',
            'test',repeat('0',64),now()+interval '1 hour')
        """)
        cls.migrate("004_cd7e_late_result.sql")
        cls.migrate("004_cd7e_late_result.sql")

    @staticmethod
    def migrate(name):
        subprocess.run(["psql", "-Xq", "-v", "ON_ERROR_STOP=1", "--single-transaction",
                        "-d", DB, "-f", str(ROOT / "db/accounts" / name)], check=True)

    @staticmethod
    def insert_order(order):
        ap.sql(f"""
          INSERT INTO {ap.TABLE} (id,submission_id,email,model_name,access_type,
            access_instructions,benchmarks,visibility,pricing_tier,unit_amount,quantity,
            base_amount,amount_total,stripe_mode,status,checkout_session_id,payment_intent_id,
            paid_at,evaluation_status)
          VALUES ('{order}',gen_random_uuid(),'{CUSTOMER}','fixture','open_weights','test',
            ARRAY['jevbench'],'public','api_or_small_open',4900,1,4900,4900,'live','paid',
            'cs_{order}','pi_{order}','2026-11-18T13:33:55Z','ready_for_release')
        """)

    def setUp(self):
        ap.sql(f"DELETE FROM {late.AUTH}; DELETE FROM {late.MAIL} WHERE request_id='{late.ORDER}'; "
               f"DELETE FROM {ap.TABLE} WHERE id='{late.ORDER}';")
        self.insert_order(late.ORDER)
        self.approval = {
            "identity_sha256": ap.sql(f"SELECT bh_cd7e_late_identity(r) FROM {ap.TABLE} r "
                                      f"WHERE r.id='{late.ORDER}'"),
            "refund_ref": REF,
            "generation": "fixture-g1",
            "result": {"release_commit": "a" * 40},
            "expires_at": ap.iso(ap.utcnow() + timedelta(hours=1)),
        }

    def set_order(self, updates):
        ap.sql(f"UPDATE {ap.TABLE} SET {updates} WHERE id='{late.ORDER}'")

    def set_refunded(self):
        self.set_order(f"status='refunded',refund_decided_at=now(),refund_decision='approved',"
                       f"refund_decision_ref='{REF}',refund_status='succeeded',"
                       "refund_id='re_test1',refunded_at=now(),refund_reason='sla_48h_payment'")

    def stage(self):
        late.stage(ap, ap.load_row(late.ORDER), self.approval, SUBJECT, BODY, "b" * 64)

    @staticmethod
    def envelope(body=BODY):
        return sender.Envelope(late.ENVELOPE, "gmail", CUSTOMER, None, SUBJECT, body)

    def test_delayed_callback_then_succeeded_refund_and_crash_reconciliation(self):
        for status in ("paid", "refund_due", "refund_pending"):
            self.set_order(f"status='{status}'")
            with self.assertRaises(ap.PickupError):
                self.stage()
            self.assertIsNone(late.receipt(ap))
        self.set_refunded()
        self.stage()
        self.stage()
        with self.assertRaises(sender.TransactionRefused):
            self.envelope("changed text").validate()
        envelope = self.envelope().validate()
        self.assertTrue(envelope.claim())
        envelope.before_submission()
        envelope.accepted()
        ap.sql(f"UPDATE {late.MAIL} SET expires_at=now()-interval '1 hour' WHERE id='{late.ENVELOPE}'; "
               f"UPDATE {late.AUTH} SET expires_at=(SELECT expires_at FROM {late.MAIL} WHERE id='{late.ENVELOPE}')")
        with tempfile.TemporaryDirectory() as directory, patch.object(ap, "STATE_ROOT", Path(directory)):
            output = io.StringIO()
            with redirect_stdout(output):
                self.assertEqual(ap.main(["cd7e-late-result", late.ORDER, "reconcile"]), 0)
            first = json.loads(output.getvalue())
        self.assertEqual(first, late.reconcile(ap))
        self.assertEqual(first["message_id"], envelope.message_id)
        row = ap.load_row(late.ORDER)
        self.assertEqual((row["status"], row["refund_status"], row["refund_decision"], row["refund_id"]),
                         ("refunded", "succeeded", "approved", "re_test1"))
        self.assertEqual(row["refund_reason"], "sla_48h_payment")
        self.assertEqual(row["delivery_email_status"], "sent")
        self.assertEqual(row["sla_paused_seconds"], 0)
        self.assertEqual(ap.parse_ts(row["paid_at"]), ap.parse_ts("2026-11-18T13:33:55Z"))

    def test_decline_and_concurrent_claims(self):
        self.set_order(f"refund_decision='declined',refund_decided_at=now(),refund_decision_ref='{REF}'")
        self.stage()
        envelopes = [self.envelope().validate() for _ in range(2)]

        def claim(envelope):
            try:
                return envelope.claim()
            except sender.TransactionRefused:
                return False

        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(claim, envelopes)), [False, True])

    def test_live_identity_or_refund_change_after_validation_blocks_claim(self):
        self.set_refunded()
        self.stage()
        envelope = self.envelope().validate()
        self.set_order("refund_status='manual_review'")
        with self.assertRaises(sender.TransactionRefused):
            envelope.claim()
        self.set_order("refund_status='succeeded',model_link='https://example.invalid/changed'")
        with self.assertRaises(sender.TransactionRefused):
            envelope.claim()

    def test_pre_submission_failure_and_uncertain_smtp(self):
        self.set_refunded()
        self.stage()
        envelope = self.envelope().validate()
        envelope.claim()
        envelope.failed()
        self.assertEqual(late.receipt(ap)["state"], "pending")
        second = self.envelope().validate()
        second.claim()
        second.before_submission()
        second.failed()
        self.assertEqual(late.receipt(ap)["state"], "uncertain")
        with self.assertRaises(sender.TransactionRefused):
            self.envelope().validate()
        with self.assertRaises(ap.PickupError):
            late.reconcile(ap)
        self.assertIsNone(ap.load_row(late.ORDER)["result_delivered_at"])

    def test_migration_scope_and_ordinary_mail(self):
        other = str(uuid.uuid4())
        self.insert_order(other)
        digest = "0" * 64
        with self.assertRaises(ap.PickupError):
            ap.sql(f"INSERT INTO {late.MAIL} (id,request_id,template_key,recipient,subject,body_sha256,expires_at) "
                   f"VALUES (gen_random_uuid(),'{other}','{late.KEY}','{CUSTOMER}','test','{digest}',now())")
        row = ap.load_row(other)
        envelope_id = ap.stage_transactional_mail(row, "confirmation", SUBJECT, BODY)
        envelope = sender.Envelope(envelope_id, "gmail", CUSTOMER, None, SUBJECT, BODY).validate()
        self.assertTrue(envelope.claim())
        envelope.accepted()
        self.assertFalse(sender.Envelope(envelope_id, "gmail", CUSTOMER, None, SUBJECT, BODY).validate().claim())

    def test_operator_send_requires_the_approved_message_and_submits_once(self):
        self.set_refunded()
        item = {
            "benchmark": "jevbench", "version": "v1.6.30", "system_key": late.SYSTEM,
            "score": 82.5, "release_commit": "a" * 40, "public_url": late.URL,
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            job = root / late.ORDER
            proofs = {}
            for name in ("independent_review", "measurement", "custody", "teardown", "release_result"):
                relative = "release/RESULT.json" if name == "release_result" else f"review/{name}.json"
                path = job / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"{}")
                proofs[name] = {"path": relative, "sha256": hashlib.sha256(b"{}").hexdigest()}
            manifest = dict(self.approval, order_id=late.ORDER, scope="exact-cd7e-late-result-delivery",
                            verdict="ACCEPTED", result=item, proofs=proofs)
            trusted_state = {
                "cd7e_late_delivery": {"verdict": "ACCEPTED", "generation": manifest["generation"]},
                "independent_recompute": {"official_inputs": {"generation": manifest["generation"]}},
            }
            manifest_path = job / late.APPROVAL_PATH

            def pin_manifest():
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                trusted_state["cd7e_late_delivery"]["admission_sha256"] = ap.sha256_file(manifest_path)

            def transport(recipient, subject, body, *, outbox_id):
                envelope = sender.Envelope(outbox_id, "gmail", recipient, None, subject, body).validate()
                self.assertTrue(envelope.claim())
                envelope.before_submission()
                envelope.accepted()
                return True, ""

            manifest["message"] = {"subject": SUBJECT, "body_sha256": "0" * 64}
            pin_manifest()
            with (
                patch.object(ap, "JOB_ROOT", root),
                patch.object(ap, "STATE_ROOT", root / "state"),
                patch.object(ap, "load_state", return_value=trusted_state),
                patch.object(ap, "verify_result", return_value={
                    "outcome": "delivered", "visibility": "public", "results": [item],
                }) as verify,
                patch.object(ap, "result_message", return_value=(SUBJECT, BODY)),
                patch.object(ap, "author_message_guard", return_value=None) as guard,
                patch.object(ap.Effects, "mail", side_effect=transport) as send,
            ):
                with self.assertRaisesRegex(ap.PickupError, "exact customer message"):
                    late.run(ap, late.ORDER, "send")
                self.assertIsNone(late.receipt(ap))
                send.assert_not_called()
                manifest["message"]["body_sha256"] = hashlib.sha256(BODY.encode()).hexdigest()
                pin_manifest()
                first = late.run(ap, late.ORDER, "send")
                self.assertEqual(late.run(ap, late.ORDER, "send"), first)
                send.assert_called_once()
                guard.assert_called_once_with(SUBJECT, BODY)
                self.assertTrue(verify.call_args.kwargs["public_live"])

    def test_scope_holds_and_prior_result(self):
        self.set_refunded()
        self.set_order("sla_paused_seconds=30")
        with self.assertRaises(ap.PickupError):
            self.stage()
        self.set_order("sla_paused_seconds=0,customer_hold_reason='customer_changes'")
        with self.assertRaises(ap.PickupError):
            self.stage()
        self.set_order("customer_hold_reason=NULL")
        ap.stage_transactional_mail(ap.load_row(late.ORDER), "result_mail", SUBJECT, BODY)
        with self.assertRaises(ap.PickupError):
            self.stage()


if __name__ == "__main__":
    unittest.main(verbosity=2)
