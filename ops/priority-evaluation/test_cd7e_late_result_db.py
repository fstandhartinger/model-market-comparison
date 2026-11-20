"""Isolated PostgreSQL contract. Run with pg_virtualenv python3 .../test_cd7e_late_result_db.py."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager, redirect_stdout
from datetime import timedelta
import fcntl
import hashlib
import io
import importlib.util
import json
import os
import shutil
import smtplib
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import uuid

import autopickup as ap
import cd7e_late_result as late
import fastlane_transactional as sender

DECISOR = "3687485f-5a51-4964-bd9a-73973f3494d7"
DECISOR_KEY = "decisor_result_public_v163_correction"
DB = "cd7e_late_result_fixture"
ROOT = Path(__file__).resolve().parents[2]
CUSTOMER = "fixture-mail@fixture.benchmarkheaven.com"
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
        cls.insert_order(DECISOR)
        ap.sql(f"""
          UPDATE {ap.TABLE}
          SET status='completed',evaluation_status='done',release_status='done',delivery_email_status='sent',
              result_delivered_at='2026-10-06T13:08:59Z',result_url='https://benchmarkheaven.com/jev-models/v1.6.3'
          WHERE id='{DECISOR}';
        """)
        cls.pre_migration_decisor = cls.stage_decisor()
        pending = sender.Envelope(cls.pre_migration_decisor, "gmail", CUSTOMER, None, SUBJECT, BODY).validate()
        if not pending.claim():
            raise AssertionError("ordinary schema must allow the Decisor claim")
        pending.accepted()
        try:
            cls.envelope().validate()
        except ap.PickupError:
            pass
        else:
            raise AssertionError("late schema dependency did not fail closed before migration")
        cls.migrate("004_cd7e_late_result.sql")
        cls.migrate("004_cd7e_late_result.sql")

    @staticmethod
    def stage_decisor():
        envelope_id = str(uuid.uuid4())
        digest = hashlib.sha256(BODY.encode()).hexdigest()
        ap.sql(f"""
          INSERT INTO {late.MAIL}
            (id,request_id,template_key,recipient,subject,body_sha256,expires_at)
          VALUES ('{envelope_id}','{DECISOR}','{DECISOR_KEY}','{CUSTOMER}',
                  '{SUBJECT}','{digest}',now()+interval '1 hour')
        """)
        return envelope_id

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

    def test_migration_activation_and_helper_first_rollback(self):
        old_helper = os.environ.get("CD7E_OLD_HELPER")
        if not old_helper:
            self.skipTest("requires the pinned installed helper fixture")
        spec = importlib.util.spec_from_file_location("cd7e_old_helper", old_helper)
        old = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(old)
        old.query = sender_query

        # Reset only our isolated Decisor fixture, leaving the migrated schema in place.
        ap.sql(f"DELETE FROM {late.MAIL} WHERE id='{self.pre_migration_decisor}'")
        for helper in (sender, old):
            envelope_id = self.stage_decisor()
            envelope = helper.Envelope(envelope_id, "gmail", CUSTOMER, None, SUBJECT, BODY).validate()
            self.assertTrue(envelope.claim())
            envelope.accepted()
            self.assertFalse(helper.Envelope(envelope_id, "gmail", CUSTOMER, None, SUBJECT, BODY).validate().claim())
            ap.sql(f"DELETE FROM {late.MAIL} WHERE id='{envelope_id}'")
        self.set_refunded()
        self.stage()
        with self.assertRaises(old.TransactionRefused):
            old.Envelope(late.ENVELOPE, "gmail", CUSTOMER, None, SUBJECT, BODY).validate()
        self.assertEqual(late.receipt(ap)["state"], "pending")

    def test_expired_pending_stays_pinned_and_held(self):
        self.set_refunded()
        self.stage()
        ap.sql(f"UPDATE {late.MAIL} SET expires_at=now()-interval '1 minute' WHERE id='{late.ENVELOPE}'; "
               f"UPDATE {late.AUTH} SET expires_at=(SELECT expires_at FROM {late.MAIL} WHERE id='{late.ENVELOPE}')")
        with tempfile.TemporaryDirectory() as directory, patch.object(ap, "STATE_ROOT", Path(directory)):
            with self.assertRaisesRegex(ap.PickupError, "expired unsent.*fast-lane SLA owner"):
                late.run(ap, late.ORDER, "send")
        with self.assertRaises(sender.TransactionRefused):
            self.envelope().validate()
        self.assertEqual(late.receipt(ap)["state"], "pending")

    @contextmanager
    def installed_adapter(self):
        adapter = os.environ.get("CD7E_MAIL_ADAPTER")
        if not adapter:
            self.skipTest("requires the pinned installed mail adapter fixture")

        original_run = subprocess.run

        def isolated_query(command, *args, **kwargs):
            if command[0] == "/usr/bin/psql":
                self.assertEqual(command[-1], "benchmarkheaven_accounts")
                output = ap.sql(kwargs["input"])
                return subprocess.CompletedProcess(command, 0, stdout=output, stderr="")
            return original_run(command, *args, **kwargs)

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("mail_tool.py", "brand_sender.py"):
                shutil.copyfile(Path(adapter) / name, root / name)
            shutil.copyfile(Path(sender.__file__), root / "fastlane_transactional.py")
            (root / "accounts.json").write_text(json.dumps({"gmail": {
                "user": "fixture-mailer@fixture.benchmarkheaven.com",
                "smtp_host": "smtp.example.invalid", "pass_env": "GMAIL_APP_PASSWORD",
            }}))
            with (
                patch.object(ap, "MAIL_TOOL", root / "mail_tool.py"),
                patch.object(ap, "gmail_app_password", return_value="fixture-password"),
                patch.object(subprocess, "run", side_effect=isolated_query),
                patch.object(smtplib, "SMTP") as smtp,
                patch.dict(os.environ, {"MAIL_SLOT_CLAIM": ""}),
            ):
                smtp.return_value.send_message.return_value = {}
                yield smtp

    def test_installed_mail_adapter_holds_ambiguous_smtp_with_fixed_message_id(self):
        # All addresses and credentials are fixtures. The real adapter is
        # loaded in-process with its network and database endpoints replaced.
        self.set_refunded()
        self.stage()
        effect = ap.Effects()
        with self.installed_adapter() as smtp, patch.object(ap, "author_message_guard", return_value=None):
            conn = smtp.return_value
            conn.login.side_effect = OSError("simulated failure before submission")
            self.assertFalse(effect.mail(CUSTOMER, SUBJECT, BODY, outbox_id=late.ENVELOPE)[0])
            conn.send_message.assert_not_called()
            self.assertEqual(late.receipt(ap)["state"], "pending")

            conn.login.side_effect = None
            conn.send_message.side_effect = OSError("simulated ambiguous submission")
            self.assertFalse(effect.mail(CUSTOMER, SUBJECT, BODY, outbox_id=late.ENVELOPE)[0])
            outbound = conn.send_message.call_args.args[0]
            self.assertEqual(outbound["Message-ID"], self.envelope().message_id)
            self.assertEqual(late.receipt(ap)["state"], "uncertain")
            smtp.reset_mock()
            self.assertFalse(effect.mail(CUSTOMER, SUBJECT, BODY, outbox_id=late.ENVELOPE)[0])
            smtp.assert_not_called()

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

    def test_post_deadline_operator_verifies_the_result_before_staging(self):
        self.set_order("evaluation_status='pending'")
        self.set_refunded()
        item = {
            "benchmark": "jevbench", "version": "v1.6.30", "system_key": late.SYSTEM,
            "score": 82.5, "release_commit": "a" * 40, "public_url": late.URL,
        }
        base = "c" * 40
        artifact = ap.canonical_artifact_path("jevbench", item["version"])
        previous = ap.previous_version_path(artifact, item["version"])
        release = item["release_commit"]
        entry = {name: value for name, value in item.items() if name != "release_commit"}
        entry.update(artifact_path=artifact, score_field="jevbench_score")

        def leaderboard(systems):
            rows = [
                dict(key=key, rank=index, ranked=True, listing="ranked",
                     jevbench_score=score, scores=dict.fromkeys("ABC", score),
                     ranks=dict.fromkeys("ABC", index))
                for index, (key, score) in enumerate(systems, 1)
            ]
            order = [key for key, _ in systems]
            return json.dumps({"headline": "A", "systems": rows,
                               "board": {axis: {"order": order, "markers": []} for axis in "ABC"}})

        github = {
            f"repos/{ap.REPO}/pulls/99": {"merged": True, "merge_commit_sha": release, "base": {"ref": "main"}},
            f"repos/{ap.REPO}/commits/{release}": {"parents": [{"sha": base}]},
            f"repos/{ap.REPO}/compare/{base}...{release}": {"status": "ahead"},
        }
        roster = [(f"fixture-{index}", 90 - index) for index in range(5)]
        files = {
            (previous, base): leaderboard(roster),
            (artifact, release): leaderboard([*roster, (late.SYSTEM, item["score"])]),
        }
        page = (b'<section id="jev-capability"></section><h3 id="jev-bubble-speed-title"></h3>'
                b'<h3 id="jev-bubble-cost-title"></h3><h2 id="jev14-chart-title"></h2><div id="compare">'
                b'<table></table>3D What-If Presets<aside id="jev15-method"></aside><aside id="jev13-history">')
        pages = {host + "/api/meta": json.dumps({"revision": release}).encode() for host in ap.PUBLIC_HOSTS}
        pages[late.URL] = page

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            job = root / late.ORDER

            def write_pin(relative, content):
                path = job / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(content), encoding="utf-8")
                return {"path": relative, "sha256": ap.sha256_file(path)}

            fixture_measurement = {"synthetic_measurement": True}
            fixture_methods = {"profiles": {"jevbench": {"version_prefix": "v1.6."}}}
            official = {
                "generation": self.approval["generation"],
                "draw_release": "synthetic-draw",
                "official_methods": fixture_methods,
                "official_measurement": fixture_measurement,
            }
            pins = {"official_measurement": fixture_measurement, "official_methods": fixture_methods}
            review = {"schema_version": 1, "verdict": "PASS", "source_pins": pins,
                      "summary": "Synthetic source review", "checks": ["fixture pins"], "findings": []}
            review_pin = write_pin("review/CODE-REVIEW.md", review)
            gate = {"verdict": "PASS", "review_sha256": review_pin["sha256"],
                    "review_result": review, "source_pins": pins}
            write_pin("review/GATE.json", gate)
            official["review_sha256"] = review_pin["sha256"]
            run_receipt = write_pin("results/receipt.json", {"synthetic_measurement": True})
            raw_ref, raw_hash = "custody:" + "1" * 64, "2" * 64
            official["raw_paths"] = {"jevbench": raw_ref}
            official["raw_hashes"] = {"jevbench": raw_hash}
            hashes = {run_receipt["path"]: run_receipt["sha256"], raw_ref: raw_hash}
            result = write_pin("release/RESULT.json", {
                "request_id": late.ORDER, "outcome": "delivered", "visibility": "public",
                "review": review_pin, "receipts": [run_receipt], "results": [entry],
            })
            proofs = {name: write_pin(f"review/{name}.json", {"fixture": True})
                      for name in ("independent_review", "measurement", "exposure", "teardown")}
            proofs["release_result"] = result
            manifest = dict(self.approval, order_id=late.ORDER, scope="exact-cd7e-late-result-delivery",
                            verdict="ACCEPTED", result=item, proofs=proofs)
            trusted_state = {
                "id": late.ORDER,
                "cd7e_late_delivery": {"verdict": "ACCEPTED", "generation": manifest["generation"]},
                "source_review_gate": gate,
                "independent_recompute": {
                    "verdict": "PASS", "request_id": late.ORDER, "scores": {"jevbench": item["score"]},
                    "inputs": {"result_sha256": result["sha256"], "receipt_hashes": hashes},
                    "receipt_hashes": hashes, "output_sha256": "f" * 64, "official_inputs": official,
                },
                "public_release": {"status": "live", "pr_number": 99, "base_commit": base,
                                   "release_commit": release, "results": {"jevbench": {
                                       **entry, "previous_artifact_path": previous}}},
            }

            recompute = trusted_state["independent_recompute"]
            attest = {
                "schema_version": 1, "order_id": late.ORDER, "generation": manifest["generation"],
                "benchmark": "jevbench", "draw_release": official["draw_release"], "raw_ref": raw_ref,
                "raw_sha256": raw_hash, "source_review_sha256": review_pin["sha256"],
                "official_measurement": fixture_measurement, "official_methods": fixture_methods,
                "recompute_sha256": hashlib.sha256(
                    json.dumps(recompute, sort_keys=True, separators=(",", ":")).encode()).hexdigest(),
                **{f"{key}_sha256": proofs[key]["sha256"]
                   for key in ("measurement", "exposure", "release_result")},
            }
            attest_pin = write_pin("review/CD7E-CUSTODY-ATTESTATION.json", attest)
            manifest["attestation_sha256"] = attest_pin["sha256"]
            verifier = root / "fixture-custody-verifier"
            verifier.write_text(
                "#!/usr/bin/python3\n"
                f"import sys; sys.path.insert(0, {str(Path(ap.__file__).resolve().parent)!r})\n"
                "import json, sys\n"
                "from datetime import datetime, timezone\n"
                "from pathlib import Path\n"
                "import v16_profiles\n"
                "base = Path(__file__).parent\n"
                "v16_profiles.ROTATION_TOOL = base / 'synthetic-rotation.py'\n"
                "def check_retirement(_admission):\n"
                "    if (base / 'retired').exists():\n"
                "        raise ValueError('synthetic draw retired')\n"
                "v16_profiles._retirement_unlocked = check_retirement\n"
                f"expected_order = {late.ORDER!r}\n"
                f"expected_generation = {manifest['generation']!r}\n"
                "order, generation, digest, expiry = sys.argv[1:]\n"
                "if (order, generation) != (expected_order, expected_generation):\n"
                "    raise SystemExit(3)\n"
                "with v16_profiles.retirement_lock({'draw_release': 'synthetic-draw'}):\n"
                "    for line in sys.stdin:\n"
                "        check_retirement({})\n"
                "        current = json.loads((base / 'fixture-custody-status.json').read_text())\n"
                "        if (line != 'CHECK\\n' or current['attestation_sha256'] != digest\n"
                "                or datetime.fromisoformat(current['expires_at']) <= datetime.now(timezone.utc)\n"
                "                or datetime.fromisoformat(current['expires_at']) < datetime.fromisoformat(expiry)):\n"
                "            raise SystemExit(3)\n"
                "        print(json.dumps({'status': current['status'], 'attestation_sha256': digest}), flush=True)\n"
            )
            verifier.chmod(0o700)
            manifest["custody_verifier_sha256"] = ap.sha256_file(verifier)
            status_path = root / "fixture-custody-status.json"
            active = {"status": "ACTIVE", "attestation_sha256": manifest["attestation_sha256"],
                      "expires_at": ap.iso(ap.utcnow() + timedelta(hours=2))}
            status_path.write_text(json.dumps(active))

            def release_lookup(path):
                # A separate descriptor cannot acquire the canonical retirement
                # lock while the custody verifier is governing release checks.
                with (root / ".lock").open("a") as check_lock:
                    with self.assertRaises(BlockingIOError):
                        fcntl.flock(check_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                return github[path]

            def pin_manifest():
                manifest_pin = write_pin(late.APPROVAL_PATH, manifest)
                trusted_state["cd7e_late_delivery"]["admission_sha256"] = manifest_pin["sha256"]
                ap.save_state(trusted_state)

            with (
                patch.object(ap, "JOB_ROOT", root),
                patch.object(ap, "STATE_ROOT", root / "state"),
                patch.object(ap, "SHARE_ROOT", Path(ap.__file__).resolve().parent),
                patch.object(late, "CUSTODY_VERIFIER", verifier),
                patch.object(ap.official_scoring, "pins", side_effect=AssertionError("ordinary scorer path used")),
                patch.object(ap.measurement_dispatch, "pins", side_effect=AssertionError("ordinary measurement path used")),
                patch.object(ap.Effects, "gh_json", side_effect=release_lookup),
                patch.object(ap.Effects, "gh_file", side_effect=lambda path, ref: files[path, ref]),
                patch.object(ap.Effects, "http_get", side_effect=lambda url, *args: pages[url]),
                patch.object(ap, "author_message_guard", return_value=None) as guard,
                self.installed_adapter() as smtp,
            ):
                subject, body = ap.result_message(ap.load_row(late.ORDER),
                                                {"outcome": "delivered", "visibility": "public", "results": [item]})
                manifest["message"] = {"subject": subject, "body_sha256": "0" * 64}
                pin_manifest()
                with self.assertRaisesRegex(ap.PickupError, "exact customer message"):
                    late.run(ap, late.ORDER, "send")
                self.assertIsNone(late.receipt(ap))
                self.assertEqual(ap.load_row(late.ORDER)["evaluation_status"], "pending")
                smtp.assert_not_called()

                manifest["message"]["body_sha256"] = hashlib.sha256(body.encode()).hexdigest()

                # An admission cannot substitute another attestation digest.
                manifest["attestation_sha256"] = "0" * 64
                pin_manifest()
                with self.assertRaises(ap.PickupError):
                    late.run(ap, late.ORDER, "send")
                manifest["attestation_sha256"] = attest_pin["sha256"]
                pin_manifest()

                # Even a valid attestation cannot justify a changed recomputation.
                recompute["official_inputs"]["raw_hashes"]["jevbench"] = "3" * 64
                ap.save_state(trusted_state)
                with self.assertRaisesRegex(ap.PickupError, "independent recomputation"):
                    late.run(ap, late.ORDER, "send")
                recompute["official_inputs"]["raw_hashes"]["jevbench"] = raw_hash
                ap.save_state(trusted_state)

                for stale in (dict(active, expires_at=ap.iso(ap.utcnow() - timedelta(minutes=1))),
                              dict(active, status="REVOKED")):
                    status_path.write_text(json.dumps(stale))
                    with self.assertRaisesRegex(ap.PickupError, "custody verifier"):
                        late.run(ap, late.ORDER, "send")
                status_path.write_text(json.dumps(active))

                retired = root / "retired"
                retired.touch()
                with self.assertRaisesRegex(ap.PickupError, "custody verifier"):
                    late.run(ap, late.ORDER, "send")
                retired.unlink()
                self.assertFalse((job / "results/raw").exists())
                self.assertIsNone(late.receipt(ap))
                self.assertEqual(ap.load_row(late.ORDER)["evaluation_status"], "pending")
                smtp.assert_not_called()
                guard.reset_mock()
                first = late.run(ap, late.ORDER, "send")
                self.assertEqual(late.run(ap, late.ORDER, "send"), first)
                self.assertEqual(ap.load_row(late.ORDER)["evaluation_status"], "done")
                smtp.return_value.send_message.assert_called_once()
                message = smtp.return_value.send_message.call_args.args[0]
                self.assertEqual(message["Message-ID"], first["message_id"])
                self.assertEqual(message["To"], CUSTOMER)
                self.assertEqual(guard.call_args_list[0].args, (subject, body))
                self.assertEqual(guard.call_args_list[1].args, (subject, body))
                self.assertEqual(guard.call_count, 2)

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
