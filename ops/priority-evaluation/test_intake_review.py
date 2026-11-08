#!/usr/bin/env python3
"""Tests for intake_review.py (review-first queue CLI) and the registry mirror used by the pre-payment intake check.

Uses a private throw-away PostgreSQL cluster built from test_autopickup_schema.sql (schema only), like test_autopickup.py.
Nothing touches the live database, mail, Stripe or the network.
Run: python3 -m unittest ops/priority-evaluation/test_intake_review.py -v
"""
from __future__ import annotations

import contextlib
import hashlib
import io
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
PG_BIN = next((p for p in sorted(Path("/usr/lib/postgresql").glob("*/bin"), reverse=True) if (p / "initdb").exists()), None)
TMP = Path(tempfile.mkdtemp(prefix="intake-review-test-"))
os.environ["FASTLANE_DB"] = "intake_test"
sys.path.insert(0, str(HERE))
import intake_review as ir  # noqa: E402

started = False


def setUpModule() -> None:
    global started
    if PG_BIN is None:
        return
    data, sock = TMP / "pgdata", TMP / "pgsock"
    sock.mkdir()
    subprocess.run([str(PG_BIN / "initdb"), "-D", str(data), "-A", "trust", "-U", "intake_test"], capture_output=True, check=True)
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(data), "-l", str(TMP / "pg.log"), "-w", "-o",
                    f"-k {sock} -p {port} -c listen_addresses=''", "start"], capture_output=True, check=True)
    started = True
    os.environ.update({"PGHOST": str(sock), "PGPORT": str(port), "PGUSER": "intake_test"})
    subprocess.run([str(PG_BIN / "createdb"), "intake_test"], capture_output=True, check=True)
    subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", "intake_test", "-f", str(HERE / "test_autopickup_schema.sql")],
                   capture_output=True, check=True)


def tearDownModule() -> None:
    if started:
        subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(TMP / "pgdata"), "-m", "immediate", "stop"], capture_output=True)
    shutil.rmtree(TMP, ignore_errors=True)


def run(*argv: str) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            code = ir.main(list(argv))
        except SystemExit as exc:  # argparse errors
            code = int(exc.code or 0)
    return code, out.getvalue(), err.getvalue()


def insert(status: str = "awaiting_review", approved: bool = False) -> str:
    rid = str(uuid.uuid4())
    ir.sql(
        "INSERT INTO bh_priority_evaluation_requests (id, submission_id, email, model_name, model_link, access_type, access_instructions, "
        "benchmarks, visibility, pricing_tier, unit_amount, quantity, base_amount, stripe_mode, status, intake_check"
        f"{', intake_approved_at' if approved else ''}) VALUES ('{rid}', '{uuid.uuid4()}', 'a@example.com', 'M', 'https://huggingface.co/o/m', "
        "'open_weights', 'Weights are public.', ARRAY['jevbench'], 'public', 'api_or_small_open', 4900, 1, 4900, 'test', "
        f"'{status}', '{{\"code\":\"custom_code\",\"message\":\"needs review\"}}'::jsonb{', now()' if approved else ''})")
    return rid


def row(rid: str) -> dict:
    return ir.sql_rows(f"SELECT row_to_json(r) FROM bh_priority_evaluation_requests r WHERE id='{rid}'")[0]


@unittest.skipIf(PG_BIN is None, "no PostgreSQL binaries")
class IntakeReviewCli(unittest.TestCase):
    def test_list_shows_only_awaiting_review_with_reason(self):
        waiting, paid = insert(), insert("paid")
        code, out, _ = run("list")
        self.assertEqual(code, 0)
        self.assertIn(waiting[:8], out)
        self.assertIn("custom_code: needs review", out)
        self.assertNotIn(paid, out)

    def test_approve_stores_only_the_hash_and_prints_url_once(self):
        rid = insert()
        code, out, _ = run("approve", rid[:8], "--by", "lead-agent")
        self.assertEqual(code, 0)
        token = re.search(r"/pay/%s\?token=([A-Za-z0-9_-]{20,})" % rid, out).group(1)
        r = row(rid)
        self.assertEqual(r["pay_token_hash"], hashlib.sha256(token.encode()).hexdigest())
        self.assertNotIn(token, str(r))
        self.assertEqual(r["intake_approved_by"], "lead-agent")
        self.assertIsNotNone(r["intake_approved_at"])
        self.assertEqual(r["status"], "awaiting_review")  # approval does not start checkout or payment

    def test_second_approve_issues_a_fresh_token_and_keeps_first_approval(self):
        rid = insert()
        _, out1, _ = run("approve", rid, "--by", "a1")
        first = row(rid)
        _, out2, _ = run("approve", rid, "--by", "a2")
        second = row(rid)
        self.assertNotEqual(first["pay_token_hash"], second["pay_token_hash"])
        self.assertEqual(second["intake_approved_by"], "a1")
        self.assertEqual(first["intake_approved_at"], second["intake_approved_at"])
        self.assertNotEqual(out1, out2)

    def test_approve_refuses_paid_or_declined_rows(self):
        for status in ("paid", "checkout_pending", "intake_declined"):
            rid = insert(status)
            code, _, err = run("approve", rid, "--by", "a")
            self.assertEqual(code, 1, status)
            self.assertIn("not awaiting review", err)
            self.assertIsNone(row(rid)["pay_token_hash"])

    def test_decline_sets_status_reason_and_drops_token(self):
        rid = insert(approved=True)
        ir.sql(f"UPDATE bh_priority_evaluation_requests SET pay_token_hash='{'0' * 64}' WHERE id='{rid}'")
        code, out, _ = run("decline", rid, "--by", "a", "--reason", "Runtime cannot serve this architecture")
        self.assertEqual(code, 0, out)
        r = row(rid)
        self.assertEqual(r["status"], "intake_declined")
        self.assertIsNone(r["pay_token_hash"])
        self.assertEqual(r["intake_check"]["declineReason"], "Runtime cannot serve this architecture")
        self.assertEqual(r["intake_check"]["code"], "custom_code")  # original finding kept
        self.assertEqual(run("decline", rid, "--by", "a", "--reason", "again")[0], 1)

    def test_decline_never_touches_paid_rows_and_needs_a_reason(self):
        paid = insert("paid")
        self.assertEqual(run("decline", paid, "--by", "a", "--reason", "x")[0], 1)
        self.assertEqual(row(paid)["status"], "paid")
        waiting = insert()
        self.assertEqual(run("decline", waiting, "--by", "a", "--reason", "   ")[0], 1)
        self.assertEqual(row(waiting)["status"], "awaiting_review")

    def test_quotes_in_reason_and_unknown_ids_are_safe(self):
        rid = insert()
        self.assertEqual(run("decline", rid, "--by", "a", "--reason", "it's \"bad\"; DROP TABLE x;--")[0], 0)
        self.assertEqual(row(rid)["intake_check"]["declineReason"], "it's \"bad\"; DROP TABLE x;--")
        self.assertEqual(run("approve", str(uuid.uuid4()), "--by", "a")[0], 1)
        self.assertEqual(run("approve", "not-an-id", "--by", "a")[0], 1)
        self.assertEqual(run("approve", rid, "--by", "bad name; rm")[0], 2)


class RegistryMirror(unittest.TestCase):
    def test_reviewed_supplement_list_matches_native_owner(self):
        import native_owner
        expected = sorted(repo.split("/", 1)[1].lower() for e in native_owner.SUPPLEMENTS for repo in e["repos"] if repo.startswith("huggingface.co/"))
        text = (HERE.parent.parent / "lib" / "priority-intake-runtime.mjs").read_text()
        block = text.split("REVIEWED_SUPPLEMENT_REPOS = Object.freeze([", 1)[1].split("]);", 1)[0]
        self.assertEqual(sorted(re.findall(r"'([^']+)'", block)), expected)

    def test_limits_match_pod_runner(self):
        text = (HERE / "pod_runner.py").read_text()
        js = (HERE.parent.parent / "lib" / "priority-intake-runtime.mjs").read_text()
        for name in ("MAX_HOURLY_USD", "PER_ORDER_CAP_USD"):
            py = float(re.search(rf"^{name} = ([0-9.]+)", text, re.M).group(1))
            self.assertEqual(float(re.search(rf"export const {name} = ([0-9.]+)", js).group(1)), py)


if __name__ == "__main__":
    unittest.main()
