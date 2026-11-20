"""Isolated PostgreSQL contract. Run with pg_virtualenv python3 .../test_cd7e_late_result_db.py."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager, redirect_stdout
from dataclasses import replace
from datetime import datetime, timedelta
import fcntl
import hashlib
import io
import importlib.util
import json
import os
import shutil
import smtplib
import socket
import sys
from threading import Thread
import time
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import uuid

import autopickup as ap
import cd7e_late_audit as audit
import cd7e_late_result as late
import cd7e_late_peer as late_peer
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


class RestrictedRelease(unittest.TestCase):
    def test_public_reads_use_fixed_urls_without_credentials(self):
        with patch.object(ap.host_github, "token", side_effect=AssertionError("credential lookup")):
            client = late.PublicRelease(ap)
            sha = "a" * 40
            artifact = ap.canonical_artifact_path("jevbench", "v1.6.3")
            with patch.object(client.opener, "open", side_effect=lambda *_a, **_kw: io.BytesIO(b"{}")) as opened:
                self.assertEqual(client.gh_json(f"repos/{ap.REPO}/pulls/123"), {})
                self.assertEqual(client.gh_json(f"repos/{ap.REPO}/commits/{sha}"), {})
                self.assertEqual(client.gh_json(f"repos/{ap.REPO}/compare/{sha}...{sha}"), {})
                self.assertEqual(client.gh_file(artifact, sha), b"{}")
                self.assertEqual(client.http_get(late.URL), b"{}")
                self.assertEqual(client.http_get(ap.PUBLIC_HOSTS[1] + "/api/meta"), b"{}")
            self.assertEqual([call.args[0].full_url for call in opened.call_args_list], [
                f"https://api.github.com/repos/{ap.REPO}/pulls/123",
                f"https://api.github.com/repos/{ap.REPO}/commits/{sha}",
                f"https://api.github.com/repos/{ap.REPO}/compare/{sha}...{sha}",
                f"https://raw.githubusercontent.com/{ap.REPO}/{sha}/{artifact}",
                late.URL,
                ap.PUBLIC_HOSTS[1] + "/api/meta",
            ])
            for call in opened.call_args_list:
                self.assertFalse(call.args[0].has_header("Authorization"))
                self.assertEqual(call.kwargs["timeout"], 10)

    def test_refuses_unapproved_routes_before_open(self):
        client = late.PublicRelease(ap)
        with patch.object(client.opener, "open") as opened:
            with self.assertRaises(ap.PickupError):
                client.gh_json(f"repos/{ap.REPO}/pulls/1?per_page=1")
            with self.assertRaises(ap.PickupError):
                client.gh_file("data/raw/benchmarks/jevbench/v9.9/jevbench-v1.6.3-results.json", "a" * 40)
            with self.assertRaises(ap.PickupError):
                client.http_get("https://benchmarkheaven.com.example/api/meta")
            opened.assert_not_called()

    def test_redirect_and_oversized_response_fail_closed(self):
        client = late.PublicRelease(ap)
        self.assertIsNone(late.NoReleaseRedirect().redirect_request(
            None, None, 302, "Found", {}, "https://example.invalid/",
        ))
        with patch.object(client.opener, "open", return_value=io.BytesIO(b"{}")):
            with self.assertRaisesRegex(ap.PickupError, "size limit"):
                client.http_get(late.URL, 1)


class CustodyProtocol(unittest.TestCase):
    def test_admission_rejects_unapproved_proofs_before_hashing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            now = ap.utcnow()
            state = {"cd7e_late_delivery": {
                "verdict": "ACCEPTED", "generation": "fixture", "admission_sha256": "a" * 64,
            }}
            approval = {
                "order_id": late.ORDER, "scope": "exact-cd7e-late-result-delivery",
                "generation": "fixture", "verdict": "ACCEPTED",
                "expires_at": ap.iso(now + timedelta(minutes=15)),
                "identity_sha256": "b" * 64, "refund_ref": REF,
            }
            raw = root / "protected.jsonl"
            raw.touch()
            for path in late.PROOF_PATHS.values():
                candidate = root / path
                candidate.parent.mkdir(parents=True, exist_ok=True)
                candidate.touch()
            paths = {
                "wrong release path": {"release_result": raw.name},
                "wrong measurement path": {"measurement": raw.name},
                "redirected measurement": {},
            }
            for case, replacements in paths.items():
                if case == "redirected measurement":
                    measurement = root / late.PROOF_PATHS["measurement"]
                    measurement.unlink()
                    measurement.symlink_to(raw)
                approval["proofs"] = {
                    key: {"path": replacements.get(key, path), "sha256": "c" * 64}
                    for key, path in late.PROOF_PATHS.items()
                }
                with self.subTest(case=case), patch.object(ap, "pinned_file") as pin, \
                        patch.object(ap, "load_json_file", return_value=approval):
                    with self.assertRaisesRegex(ap.PickupError, "unapproved evidence path"):
                        late.load_admission(ap, root, state)
                    pin.assert_called_once_with(root, {
                        "path": late.APPROVAL_PATH, "sha256": "a" * 64,
                    })

    def test_only_exact_approved_aggregate_receipts_are_admitted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            results = root / "results"
            (results / "raw").mkdir(parents=True)
            (results / "raw" / "private.jsonl").touch()
            (results / "aggregate.json").touch()
            (results / "alias.json").symlink_to(results / "raw" / "private.jsonl")
            digest = "1" * 64
            name = "results/aggregate.json"
            approved = {name: digest}
            pin = {"path": name, "sha256": digest}
            ap.check_aggregate_receipts(root, [pin], approved)

            cases = [
                ([pin], None),
                ([pin], {"results/unstaged.json": digest}),
                ([pin, pin], {**approved, "results/other.json": digest}),
                ([dict(pin, sha256="2" * 64)], approved),
            ]
            for path in ("results/raw/private.jsonl", "results/alias.json",
                         "results//aggregate.json", "results/../results/aggregate.json"):
                cases.append(([dict(pin, path=path)], {path: digest}))
            for pins, allowed in cases:
                with self.subTest(pins=pins, allowed=allowed):
                    with self.assertRaisesRegex(ap.PickupError, "approved aggregate receipt"):
                        ap.check_aggregate_receipts(root, pins, allowed)

    def test_refuses_silent_partial_malformed_and_closed_responses(self):
        for behavior in ("silent", "partial", "malformed", "closed"):
            with self.subTest(behavior=behavior):
                client, server = socket.socketpair()
                with client, server, patch.object(late, "CHECK_TIMEOUT", 0.20):
                    def respond():
                        with server.makefile("rb") as requests:
                            requests.readline()
                            if behavior == "malformed":
                                server.sendall(b"{bad json}\n")
                            elif behavior == "partial":
                                try:
                                    for _ in range(12):
                                        server.sendall(b" ")
                                        time.sleep(0.05)
                                except BrokenPipeError:
                                    pass
                            elif behavior == "silent":
                                server.recv(1)
                            else:
                                server.shutdown(socket.SHUT_WR)

                    worker = Thread(target=respond)
                    worker.start()
                    try:
                        expected = (TimeoutError if behavior in ("partial", "silent") else ValueError)
                        with self.assertRaises(expected):
                            late.check_custody_socket(client, {"attestation_sha256": "b" * 64})
                    finally:
                        client.close()
                        worker.join(timeout=2)
                    self.assertFalse(worker.is_alive())

    def test_socket_checks_kernel_peer_uid(self):
        with tempfile.TemporaryDirectory() as directory, socket.socket(socket.AF_UNIX) as server:
            endpoint = Path(directory) / "custody.sock"
            server.bind(str(endpoint))
            server.listen(3)
            uid = os.geteuid()
            with patch.object(late, "CUSTODY_SOCKET", endpoint):
                with self.assertRaisesRegex(ValueError, "peer identity"):
                    with late.open_custody_socket(uid):
                        self.fail("same-identity socket admitted")
                with patch.object(late.os, "geteuid", return_value=uid + 1):
                    with self.assertRaisesRegex(ValueError, "peer identity"):
                        with late.open_custody_socket(uid + 2):
                            self.fail("wrong-identity socket admitted")
                    with late.open_custody_socket(uid):
                        pass


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
        if ap.sql("SELECT to_regclass('cd7e_late.audit_completion')"):
            ap.sql("DELETE FROM cd7e_late.audit_completion")
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

    def fixture_session(self, refresh=lambda: None, admission="b" * 64):
        return late.sender_custody(CUSTOMER, SUBJECT, BODY, self.approval["generation"], admission, refresh)

    @staticmethod
    def install_restricted_fixture():
        if ap.sql("SELECT to_regnamespace('cd7e_late')"):
            return
        ap.sql("""
          CREATE ROLE jevbench_cd7e_owner NOLOGIN NOINHERIT;
          CREATE ROLE jevbench_cd7e_late LOGIN NOINHERIT;
          CREATE ROLE jevbench_cd7e_transport LOGIN NOINHERIT;
          CREATE ROLE jevbench_cd7e_audit LOGIN NOINHERIT;
          CREATE ROLE cd7e_unrelated_fixture LOGIN NOINHERIT;
        """)
        subprocess.run(["psql", "-Xq", "-v", "ON_ERROR_STOP=1", "--single-transaction",
                        "-d", DB, "-f", str(ROOT / "ops/priority-evaluation/cd7e_late_peer.sql")],
                       check=True)

    def test_restricted_database_role_and_exact_lifecycle(self):
        role = "jevbench_cd7e_late"
        self.install_restricted_fixture()

        def peer(statement, database_role=role):
            return ap.sql(f"SET SESSION AUTHORIZATION {database_role}; {statement}")

        version = ap.sql("SHOW server_version")
        print(f"Restricted SQL fixture PostgreSQL {version}")
        self.assertEqual(json.loads(peer("SELECT cd7e_late.read_order()")), {
            "id": late.ORDER, "visibility": "public", "benchmarks": ["jevbench"], "email": CUSTOMER,
        })
        for statement in (f"SELECT email FROM {ap.TABLE}", f"SELECT * FROM {late.MAIL}",
                          f"SELECT * FROM {late.AUTH}", "SELECT * FROM cd7e_late.exact_order",
                          f"SET ROLE jevbench_cd7e_owner; SELECT * FROM {ap.TABLE}",
                          "CREATE TABLE cd7e_late.extra (id int)"):
            with self.subTest(statement=statement), self.assertRaises(ap.PickupError):
                peer(statement)
        with self.assertRaises(ap.PickupError):
            peer("SELECT cd7e_late.read_order()", "cd7e_unrelated_fixture")

        self.set_refunded()
        self.set_order("evaluation_status='pending'")
        digest = hashlib.sha256(BODY.encode()).hexdigest()
        admission = "b" * 64
        generation = self.approval["generation"]
        arguments = ",".join(map(ap.sql_text, (CUSTOMER, SUBJECT, digest)))

        def stage_with(generation):
            values = (self.approval["identity_sha256"], REF, generation, admission, "a" * 40,
                      self.approval["expires_at"], CUSTOMER, SUBJECT, digest)
            return peer("SELECT cd7e_late.stage(" + ",".join(map(ap.sql_text, values)) + ")")

        with self.assertRaises(ap.PickupError):
            stage_with("bad generation")
        self.assertEqual(ap.load_row(late.ORDER)["evaluation_status"], "pending")
        self.assertIsNone(late.receipt(ap))
        self.assertEqual(ap.sql(f"SELECT count(*) FROM {late.MAIL} WHERE id='{late.ENVELOPE}'"), "0")
        self.assertEqual(stage_with(generation), "t")
        self.assertEqual(stage_with(generation), "t")
        with self.assertRaises(ap.PickupError):
            stage_with("changed-generation")
        for changed in (CUSTOMER.upper(), CUSTOMER + ".example"):
            mismatch = ",".join(map(ap.sql_text, (changed, SUBJECT, digest)))
            self.assertEqual(peer(f"SELECT cd7e_late.validate({mismatch})"), "")
        self.assertEqual(peer(f"SELECT cd7e_late.validate({arguments})"), "pending")
        transport_role = "jevbench_cd7e_transport"

        def transport(statement):
            return peer(statement, transport_role)

        self.assertEqual(transport(f"SELECT cd7e_late.claim({arguments}, 'wrong-generation', '{admission}')"), "")
        claim = f"SELECT cd7e_late.claim({arguments}, '{generation}', '{admission}')"
        with self.assertRaises(ap.PickupError):
            peer(claim)
        with ThreadPoolExecutor(max_workers=2) as workers:
            claims = list(workers.map(transport, (claim, claim)))
        self.assertEqual(claims.count(""), 1)
        first_claim = ap.sql_text(next(value for value in claims if value))
        message_id = ap.sql_text(self.envelope().message_id)
        failed = f"SELECT cd7e_late.failed('{digest}', {first_claim}, {message_id}, 'before_submission')"
        accepted = f"SELECT cd7e_late.accepted('{digest}', {first_claim}, {message_id}, clock_timestamp())"
        for statement in (accepted, failed, "SELECT cd7e_late.audit_acceptance()"):
            with self.subTest(statement=statement), self.assertRaises(ap.PickupError):
                peer(statement)
        for statement in ("SELECT cd7e_late.read_order()", "SELECT cd7e_late.audit_acceptance()",
                          f"SELECT * FROM {late.MAIL}"):
            with self.subTest(statement=statement), self.assertRaises(ap.PickupError):
                transport(statement)

        self.assertEqual(transport(failed.replace(message_id, "'<wrong>'")), "f")
        self.assertEqual(transport(failed.replace("'before_submission'", "'accepted'")), "f")
        self.assertEqual(transport(failed), "t")
        second_claim = ap.sql_text(transport(claim))
        self.assertNotEqual(first_claim, second_claim)
        self.assertEqual(transport(accepted), "f")
        self.assertEqual(transport(failed), "f")
        accepted = accepted.replace(first_claim, second_claim)
        self.assertEqual(transport(accepted.replace(message_id, "'<wrong>'")), "f")
        self.assertEqual(transport(accepted.replace(f"'{digest}'", "'wrong'")), "f")
        for offset in ("- interval '1 hour'", "+ interval '1 hour'"):
            self.assertEqual(transport(accepted.replace("clock_timestamp()", f"clock_timestamp() {offset}")), "f")
        accepted_at = ap.sql("SELECT clock_timestamp()")
        accepted = accepted.replace("clock_timestamp()", ap.sql_text(accepted_at))
        self.assertEqual(transport(accepted), "t")
        self.assertEqual(transport(accepted), "f")
        receipt = json.loads(peer("SELECT cd7e_late.receipt()"))
        self.assertEqual(datetime.fromisoformat(receipt["sent_at"]), datetime.fromisoformat(accepted_at))
        self.assertIsNone(receipt["recorded_at"])
        paid = ap.load_row(late.ORDER)
        self.assertEqual(paid["refund_status"], "succeeded")
        self.assertEqual(paid["sla_paused_seconds"], 0)

    @unittest.skipUnless(os.environ.get("CD7E_FIXTURE_PEER") == "1", "requires isolated peer mapping")
    def test_restricted_client_over_a_real_peer_socket(self):
        self.install_restricted_fixture()
        self.set_refunded()
        command = late_peer.PSQL
        fixture_route = (
            *command[:command.index("-h")], "-h", os.environ["PGHOST"],
            "-p", os.environ["PGPORT"], "-U", "jevbench_cd7e_late", "-d", DB,
        )
        # The isolated daemon requires a mapped peer for this one role. Its
        # other test-management connections continue to use the fixture admin.
        who = subprocess.run((*fixture_route, "-c", "SELECT current_user"), text=True,
                             capture_output=True, check=True)
        self.assertEqual(who.stdout.strip(), "jevbench_cd7e_late")
        self.assertEqual(command[command.index("-h") + 1], "/var/run/postgresql")
        self.assertEqual(command[-1], "benchmarkheaven_accounts")

        db = late_peer.PeerDatabase()
        args = (CUSTOMER, "Fixture quote ' and backslash \\", hashlib.sha256(BODY.encode()).hexdigest())
        generation = self.approval["generation"]
        admission = "b" * 64
        with patch.object(late_peer.PeerDatabase, "route", fixture_route), patch.dict(os.environ, {
            "PGUSER": "untrusted-override", "PGHOST": "/invalid", "PGOPTIONS": "-c default_transaction_read_only=on",
        }):
            self.assertEqual(db.read_order()["email"], CUSTOMER)
            self.assertIsNone(db.receipt())
            self.assertTrue(db.stage(
                self.approval["identity_sha256"], REF, generation, admission, "a" * 40,
                datetime.fromisoformat(self.approval["expires_at"]), *args,
            ))
            self.assertEqual(db.validate(*args), "pending")
            transport_route = tuple("jevbench_cd7e_transport" if arg == "jevbench_cd7e_late" else arg
                                    for arg in fixture_route)
            transport = late_peer.TransportDatabase()
            self.assertEqual(transport.route[transport.route.index("-U") + 1], "jevbench_cd7e_transport")
            with patch.object(late_peer.TransportDatabase, "route", transport_route):
                claimed_at = transport.claim(*args, generation, admission)
                self.assertIsNotNone(claimed_at)
                self.assertIsNone(transport.claim(*args, generation, admission))
                self.assertTrue(transport.failed(args[-1], claimed_at, self.envelope().message_id, "uncertain"))
                self.assertIsNone(transport.claim(*args, generation, admission))
            self.assertEqual(db.receipt()["state"], "uncertain")

    @unittest.skipUnless(os.environ.get("CD7E_FIXTURE_PEER") == "1", "requires isolated peer mapping")
    def test_audit_peer_recovers_after_lost_completion_reply(self):
        self.install_restricted_fixture()
        self.set_refunded()
        self.stage()
        command = late_peer.PSQL

        def route(role):
            return (
                *command[:command.index("-h")], "-h", os.environ["PGHOST"],
                "-p", os.environ["PGPORT"], "-U", role, "-d", DB,
            )

        db = late_peer.AuditDatabase()
        transport = late_peer.TransportDatabase()
        transport_role = "jevbench_cd7e_transport"
        audit_role = "jevbench_cd7e_audit"
        self.assertEqual(db.route[db.route.index("-U") + 1], audit_role)
        digest = hashlib.sha256(BODY.encode()).hexdigest()
        message_id = self.envelope().message_id

        def as_role(role, statement):
            return ap.sql(f"SET SESSION AUTHORIZATION {role}; {statement}")

        for statement in ("SELECT cd7e_late.read_order()", "SELECT * FROM cd7e_late.exact_acceptance",
                          "SELECT * FROM cd7e_late.audit_completion", f"SELECT * FROM {late.MAIL}",
                          "SELECT cd7e_late.accepted('digest', now(), 'message', now())"):
            with self.subTest(statement=statement), self.assertRaises(ap.PickupError):
                as_role(audit_role, statement)
        for role in ("jevbench_cd7e_late", transport_role, "cd7e_unrelated_fixture"):
            with self.subTest(role=role), self.assertRaises(ap.PickupError):
                as_role(role, "SELECT cd7e_late.audit_complete('digest', now(), 'message', now(), 'a', 'b')")

        with patch.object(late_peer.AuditDatabase, "route", route(audit_role)), patch.object(
            late_peer.TransportDatabase, "route", route(transport_role)
        ):
            self.assertIsNone(db.lookup())
            claim = transport.claim(CUSTOMER, SUBJECT, digest, self.approval["generation"], "b" * 64)
            self.assertIsNotNone(claim)
            self.assertIsNone(db.lookup())
            accepted_at = datetime.fromisoformat(ap.sql("SELECT clock_timestamp()"))
            self.assertTrue(transport.accepted(digest, claim, message_id, accepted_at))
            evidence = db.lookup()
            self.assertEqual(evidence, audit.AcceptedEnvelope(
                late.ORDER, late.ENVELOPE, message_id, digest, claim, accepted_at, CUSTOMER, SUBJECT,
            ))

            def lost_reply(receipt):
                self.assertTrue(db.complete(receipt))
                raise late_peer.PeerDatabaseError("simulated disconnect after commit")

            for changed in (
                replace(evidence, body_sha256="c" * 64),
                replace(evidence, claimed_at=claim - timedelta(microseconds=1)),
                replace(evidence, accepted_at=accepted_at + timedelta(microseconds=1)),
                replace(evidence, recipient=CUSTOMER.upper()),
                replace(evidence, subject=SUBJECT + " changed"),
            ):
                self.assertFalse(db.complete(changed))
            self.assertIsNone(ap.load_row(late.ORDER)["result_delivered_at"])

            with tempfile.TemporaryDirectory() as directory:
                sink, lock = (Path(directory) / name for name in ("audit", "lock"))
                sink.touch()
                lock.touch()

                def inode(path):
                    info = path.stat()
                    return info.st_dev, info.st_ino

                paths = sink, inode(sink), lock, inode(lock)
                with self.assertRaises(late_peer.PeerDatabaseError):
                    audit.reconcile_accepted(*paths, lookup=db.lookup, complete=lost_reply)
                audit.reconcile_accepted(*paths, lookup=db.lookup, complete=db.complete)
                self.assertEqual(sink.read_bytes(), evidence.audit_row())

                ap.sql(f"UPDATE {late.MAIL} SET claimed_at = claimed_at - interval '1 microsecond' "
                       f"WHERE id='{late.ENVELOPE}'")
                self.assertFalse(db.complete(evidence))
                self.assertFalse(db.complete(db.lookup()))

        paid = ap.load_row(late.ORDER)
        self.assertEqual(datetime.fromisoformat(paid["result_delivered_at"]), accepted_at)
        self.assertEqual(paid["delivery_email_status"], "sent")
        self.assertEqual(paid["refund_status"], "succeeded")
        self.assertEqual(paid["sla_paused_seconds"], 0)

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
        with self.fixture_session():
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
                with self.fixture_session():
                    return envelope.claim()
            except sender.TransactionRefused:
                return False

        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(claim, envelopes)), [False, True])

    def test_live_identity_or_refund_change_after_validation_blocks_claim(self):
        self.set_refunded()
        self.stage()
        envelope = self.envelope().validate()
        with self.fixture_session(admission="c" * 64), self.assertRaisesRegex(sender.TransactionRefused, "state changed"):
            envelope.claim()
        with self.fixture_session():
            self.set_order("refund_status='manual_review'")
            with self.assertRaisesRegex(sender.TransactionRefused, "state changed"):
                envelope.claim()
            self.set_order("refund_status='succeeded',model_link='https://example.invalid/changed'")
            with self.assertRaisesRegex(sender.TransactionRefused, "state changed"):
                envelope.claim()

    def test_pre_submission_failure_and_uncertain_smtp(self):
        self.set_refunded()
        self.stage()
        envelope = self.envelope().validate()
        with self.fixture_session():
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
            self.assertFalse(effect.mail(CUSTOMER, SUBJECT, BODY, outbox_id=late.ENVELOPE)[0])
            smtp.assert_not_called()
            self.assertEqual(late.receipt(ap)["state"], "pending")
            conn.login.side_effect = OSError("simulated failure before submission")
            with self.fixture_session():
                self.assertFalse(effect.mail(CUSTOMER, SUBJECT, BODY, outbox_id=late.ENVELOPE)[0])
            conn.send_message.assert_not_called()
            self.assertEqual(late.receipt(ap)["state"], "pending")

            conn.login.side_effect = None
            conn.send_message.side_effect = OSError("simulated ambiguous submission")
            with self.fixture_session():
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
                            verdict="ACCEPTED", result=item, proofs=proofs,
                            aggregate_receipt_hashes={run_receipt["path"]: run_receipt["sha256"]})
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
            draw = official["draw_release"]
            selected = {
                "S": [f"synthetic-s-{i}" for i in range(1200)],
                "P": [f"synthetic-p-{i}" for i in range(300)],
            }
            (root / "draws").mkdir()
            (root / "draws" / f"{draw}.json").write_text(json.dumps(selected))
            (root / "id-map.json").write_text(json.dumps({
                str(index): {"item_id": key} for index, key in enumerate(selected["S"] + selected["P"])
            }))
            ledger = root / "ledger.jsonl"
            ledger.write_text("")
            rotation = root / "synthetic-rotation.py"
            rotation.write_text(
                "import json\nfrom pathlib import Path\n"
                "class State:\n"
                "    def __init__(self, conf):\n"
                "        self.draws = {p.stem: json.loads(p.read_text()) for p in Path(conf['draws']).glob('*.json')}\n"
                "        self.retired_items = set(Path(conf['ledger']).read_text().splitlines())\n"
                "    def retired(self, item):\n"
                "        return item in self.retired_items\n"
            )
            lock_path = root / ".lock"
            lock_path.touch()
            lock_stat = lock_path.stat()
            verifier = root / "fixture-custody-verifier.py"
            verifier.write_text(
                f"import sys; sys.path.insert(0, {str(Path(ap.__file__).resolve().parent)!r})\n"
                "from array import array\n"
                "import json, socket\n"
                "from datetime import datetime, timezone\n"
                "from pathlib import Path\n"
                "import v16_profiles\n"
                "base = Path(__file__).parent\n"
                "v16_profiles.ROTATION_TOOL = base / 'synthetic-rotation.py'\n"
                f"expected_order = {late.ORDER!r}\n"
                f"expected_envelope = {late.ENVELOPE!r}\n"
                f"expected_generation = {manifest['generation']!r}\n"
                f"expected_release = {release!r}\n"
                f"admission = {{'draw_release': {draw!r}, 'rotation_tool_sha256': {ap.sha256_file(rotation)!r},\n"
                "              'references': {'id_map': {'path': str(base / 'id-map.json')}}}\n"
                "with v16_profiles.retirement_lock(admission, transferable=True) as lock_fd, "
                "socket.fromfd(1, socket.AF_UNIX, socket.SOCK_STREAM) as wire:\n"
                "    initial = None\n"
                "    for line in sys.stdin:\n"
                "        v16_profiles.retirement(admission)\n"
                "        check = json.loads(line)\n"
                "        current = json.loads((base / 'fixture-custody-status.json').read_text())\n"
                "        nonce, operation = check.pop('nonce'), check.pop('operation')\n"
                "        if (operation != ('OPEN' if initial is None else 'CHECK')\n"
                "                or (initial is not None and check != initial)\n"
                "                or check['order_id'] != expected_order or check['envelope_id'] != expected_envelope\n"
                "                or check['generation'] != expected_generation\n"
                "                or check['release_commit'] != expected_release\n"
                "                or check['attestation_sha256'] != current['attestation_sha256']\n"
                "                or check['verifier_sha256'] != current['verifier_sha256']\n"
                "                or datetime.fromisoformat(current['expires_at']) <= datetime.now(timezone.utc)\n"
                "                or datetime.fromisoformat(current['expires_at']) < datetime.fromisoformat(check['expires_at'])):\n"
                "            raise SystemExit(3)\n"
                "        reply = json.dumps({'status': current['status'], 'attestation_sha256': check['attestation_sha256'],\n"
                "                            'nonce': nonce}).encode() + b'\\n'\n"
                "        if initial is None and current['status'] == 'ACTIVE':\n"
                "            wire.sendmsg([reply], [(socket.SOL_SOCKET, socket.SCM_RIGHTS, array('i', [lock_fd]))])\n"
                "            initial = check\n"
                "        else:\n"
                "            wire.sendall(reply)\n"
            )
            manifest["custody_verifier_sha256"] = ap.sha256_file(verifier)
            manifest["custody_uid"] = os.geteuid() + 1
            manifest["custody_lock_device"] = lock_stat.st_dev
            manifest["custody_lock_inode"] = lock_stat.st_ino
            status_path = root / "fixture-custody-status.json"
            active = {"status": "ACTIVE", "attestation_sha256": manifest["attestation_sha256"],
                      "verifier_sha256": manifest["custody_verifier_sha256"],
                      "expires_at": ap.iso(ap.utcnow() + timedelta(hours=2))}
            status_path.write_text(json.dumps(active))
            fixture_processes = []

            @contextmanager
            def fixture_connection(uid):
                self.assertEqual(uid, manifest["custody_uid"])
                client, peer = socket.socketpair()
                with client, peer, subprocess.Popen(
                    [sys.executable, "-B", str(verifier)], stdin=peer, stdout=peer, stderr=subprocess.DEVNULL,
                ) as process:
                    fixture_processes.append(process)
                    peer.close()
                    try:
                        yield client
                    finally:
                        client.close()
                        process.wait(timeout=5)

            def custody_lock_held():
                with lock_path.open("a") as check_lock:
                    with self.assertRaises(BlockingIOError):
                        fcntl.flock(check_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)

            def release_lookup(path):
                custody_lock_held()
                return github[path]

            def pin_manifest():
                manifest_pin = write_pin(late.APPROVAL_PATH, manifest)
                trusted_state["cd7e_late_delivery"]["admission_sha256"] = manifest_pin["sha256"]
                ap.save_state(trusted_state)

            with (
                patch.object(ap, "JOB_ROOT", root),
                patch.object(ap, "STATE_ROOT", root / "state"),
                patch.object(ap, "SHARE_ROOT", Path(ap.__file__).resolve().parent),
                patch.object(late, "open_custody_socket", fixture_connection),
                patch.object(ap.official_scoring, "pins", side_effect=AssertionError("ordinary scorer path used")),
                patch.object(ap.measurement_dispatch, "pins", side_effect=AssertionError("ordinary measurement path used")),
                patch.object(late.PublicRelease, "gh_json", side_effect=release_lookup),
                patch.object(late.PublicRelease, "gh_file", side_effect=lambda path, ref: files[path, ref]),
                patch.object(late.PublicRelease, "http_get", side_effect=lambda url, *args: pages[url]),
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
                    with lock_path.open("a") as writer:
                        fcntl.flock(writer, fcntl.LOCK_EX | fcntl.LOCK_NB)
                        status_path.write_text(json.dumps(stale))
                    with self.assertRaisesRegex(ap.PickupError, "custody verifier"):
                        late.run(ap, late.ORDER, "send")
                status_path.write_text(json.dumps(active))

                ledger.write_text(selected["S"][0] + "\n")
                with self.assertRaisesRegex(ap.PickupError, "custody verifier"):
                    late.run(ap, late.ORDER, "send")
                ledger.write_text("")
                self.assertFalse((job / "results/raw").exists())
                self.assertIsNone(late.receipt(ap))
                self.assertEqual(ap.load_row(late.ORDER)["evaluation_status"], "pending")
                smtp.assert_not_called()

                def lose_session():
                    fixture_processes[-1].kill()
                    fixture_processes[-1].wait(timeout=5)
                    custody_lock_held()

                def revoke_session():
                    # Simulate a verifier refusal while the canonical writer is excluded.
                    status_path.write_text(json.dumps(dict(active, status="REVOKED")))

                def expire_session():
                    expired = dict(active, expires_at=ap.iso(ap.utcnow() - timedelta(minutes=1)))
                    status_path.write_text(json.dumps(expired))

                original_mail = ap.Effects.mail
                for sabotage in (lose_session, revoke_session, expire_session):
                    smtp.reset_mock()
                    with self.subTest(sabotage=sabotage.__name__, boundary="before claim"):
                        def mail_after_loss(effect, *args, **kwargs):
                            self.assertEqual(late.receipt(ap)["state"], "pending")
                            sabotage()
                            return original_mail(effect, *args, **kwargs)

                        with patch.object(ap.Effects, "mail", mail_after_loss):
                            with self.assertRaises(ap.PickupError):
                                late.run(ap, late.ORDER, "send")
                        smtp.assert_not_called()
                        self.assertEqual(late.receipt(ap)["state"], "pending")
                        status_path.write_text(json.dumps(active))
                    with self.subTest(sabotage=sabotage.__name__, boundary="SMTP preparation"):
                        def login_after_claim(*_):
                            self.assertEqual(late.receipt(ap)["state"], "sending")
                            custody_lock_held()
                            sabotage()

                        smtp.return_value.login.side_effect = login_after_claim
                        with self.assertRaises(ap.PickupError):
                            late.run(ap, late.ORDER, "send")
                        smtp.return_value.send_message.assert_not_called()
                        self.assertEqual(late.receipt(ap)["state"], "pending")
                        status_path.write_text(json.dumps(active))

                def submit_with_custody(_message):
                    # Losing the verifier after the last authorization cannot
                    # let a concurrent writer pass the sender's canonical lock.
                    lose_session()
                    self.assertEqual(json.loads(status_path.read_text())["status"], "ACTIVE")
                    return {}

                smtp.return_value.login.side_effect = None
                smtp.return_value.send_message.side_effect = submit_with_custody
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
                with lock_path.open("a") as writer:
                    fcntl.flock(writer, fcntl.LOCK_EX | fcntl.LOCK_NB)

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
