#!/usr/bin/env python3
"""Tests for access_key_purge.py (closed-order API key purge, board #64725).

Private throw-away PostgreSQL cluster built from test_autopickup_schema.sql; synthetic keys only. Nothing touches the live
database. Run: python3 -m unittest ops/priority-evaluation/test_access_key_purge.py -v
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
import unittest.mock
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
PG_BIN = next((p for p in sorted(Path("/usr/lib/postgresql").glob("*/bin"), reverse=True) if (p / "initdb").exists()), None)
TMP = Path(tempfile.mkdtemp(prefix="access-key-purge-test-"))
os.environ["FASTLANE_DB"] = "purge_test"
os.environ["FASTLANE_STATE_ROOT"] = str(TMP / "state")
sys.path.insert(0, str(HERE))
import access_key_purge as akp  # noqa: E402

SYNTH = "sk-SYNTHETIC-purge-test-9f3c2a7b1d"  # never a real key
started = False


def setUpModule() -> None:
    global started
    if PG_BIN is None:
        return
    data, sock = TMP / "pgdata", TMP / "pgsock"
    sock.mkdir()
    subprocess.run([str(PG_BIN / "initdb"), "-D", str(data), "-A", "trust", "-U", "purge_test"], capture_output=True, check=True)
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(data), "-l", str(TMP / "pg.log"), "-w", "-o",
                    f"-k {sock} -p {port} -c listen_addresses='' -c log_min_error_statement=debug5 -c log_statement=all",
                    "start"], capture_output=True, check=True)
    started = True
    os.environ.update({"PGHOST": str(sock), "PGPORT": str(port), "PGUSER": "purge_test"})
    subprocess.run([str(PG_BIN / "createdb"), "purge_test"], capture_output=True, check=True)
    subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", "purge_test", "-f", str(HERE / "test_autopickup_schema.sql")],
                   capture_output=True, check=True)


def tearDownModule() -> None:
    if started:
        subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(TMP / "pgdata"), "-m", "immediate", "stop"], capture_output=True)
    shutil.rmtree(TMP, ignore_errors=True)


def psql(statement: str, **variables: str) -> str:
    argv = ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"]
    for k, v in variables.items():
        argv += ["-v", f"{k}={v}"]
    return subprocess.run(argv + ["-d", "purge_test"], input=statement, text=True, capture_output=True, check=True).stdout.strip()


def insert(access: str, status: str = "completed", rid: str | None = None, access_type: str = "api_endpoint",
           delivered: bool = False, refund_id: str | None = None) -> str:
    rid = rid or str(uuid.uuid4())
    psql("INSERT INTO bh_priority_evaluation_requests (id, submission_id, email, model_name, model_link, access_type, "
         "access_instructions, benchmarks, visibility, pricing_tier, unit_amount, quantity, base_amount, stripe_mode, status, "
         "result_delivered_at, refund_id) VALUES ((:'id')::uuid, gen_random_uuid(), 'a@example.com', 'M', 'https://example.com/m', "
         ":'atype', :'access', ARRAY['jevbench'], 'public', 'api_or_small_open', 4900, 1, 4900, 'test', :'status', "
         "CASE WHEN :'delivered' = 'yes' THEN now() END, NULLIF(:'refund', ''));",
         id=rid, atype=access_type, access=access, status=status, delivered="yes" if delivered else "no", refund=refund_id or "")
    return rid


def access(rid: str) -> str:
    return psql("SELECT access_instructions FROM bh_priority_evaluation_requests WHERE id = (:'id')::uuid;", id=rid)


def run(*argv: str) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            code = akp.main(list(argv))
        except SystemExit as exc:
            code = int(exc.code or 0)
    return code, out.getvalue(), err.getvalue()


def clear() -> None:
    psql("DELETE FROM bh_priority_evaluation_requests;")


@unittest.skipIf(PG_BIN is None, "no PostgreSQL binaries")
class Sweep(unittest.TestCase):
    def setUp(self) -> None:
        clear()

    def test_mixed_access_instructions_shapes(self):
        rows = {
            "json_key": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "api_key": SYNTH, "model": "m-1"})),
            "json_auth_header": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "auth_header": f"Bearer {SYNTH}",
                                                   "headers": {"X-Api-Key": SYNTH}, "model": "m-2"}), status="refunded"),
            "json_no_secret": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "model": "m-3"}), status="expired"),
            "free_text": insert(f"Use endpoint https://api.example.ai/v1 with key {SYNTH}", status="refunded"),
            "json_array": insert(json.dumps([SYNTH, "x"]), status="checkout_failed"),
            "broken_json": insert('{"api_key": "' + SYNTH + '", ', status="intake_declined"),
            "delivered_flag": insert(json.dumps({"api_key": SYNTH}), status="paid", delivered=True),
            "refund_id_flag": insert(json.dumps({"api_key": SYNTH}), status="refund_pending", refund_id="re_synthetic_1"),
            "open_order": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "api_key": SYNTH}), status="paid"),
            "open_free_text": insert(f"key {SYNTH}", status="review_passed"),
        }
        code, out, err = run("sweep")
        self.assertEqual(code, 0, err)
        result = json.loads(out)
        purged = {"json_key", "json_auth_header", "free_text", "json_array", "broken_json", "delivered_flag", "refund_id_flag"}
        self.assertEqual(result["affected_rows"], len(purged))
        self.assertEqual(sorted(result["order_ids"]), sorted(rows[n] for n in purged))
        self.assertRegex(result["api_key_purged_at"], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
        # The key never appears in output, error stream or the receipt log.
        receipt_log = (TMP / "state" / akp.RECEIPT_LOG).read_text()
        for text in (out, err, receipt_log):
            self.assertNotIn(SYNTH, text)
        # JSON objects keep non-secret fields, lose every secret field, gain api_key_purged_at.
        j = json.loads(access(rows["json_key"]))
        self.assertEqual(j, {"endpoint": "https://api.example.ai/v1", "model": "m-1", "api_key_purged_at": result["api_key_purged_at"]})
        j = json.loads(access(rows["json_auth_header"]))
        self.assertEqual(set(j), {"endpoint", "model", "api_key_purged_at"})
        # Non-objects are replaced whole by the marker.
        for name in ("free_text", "json_array", "broken_json"):
            j = json.loads(access(rows[name]))
            self.assertEqual(j, {"access_removed": akp.MARKER_TEXT, "api_key_purged_at": result["api_key_purged_at"]}, name)
        # Untouched: a closed JSON row without secrets, and every open order.
        self.assertNotIn("api_key_purged_at", access(rows["json_no_secret"]))
        self.assertIn(SYNTH, access(rows["open_order"]))
        self.assertIn(SYNTH, access(rows["open_free_text"]))
        # Nothing secret is left in any closed row.
        left = psql("SELECT count(*) FROM bh_priority_evaluation_requests WHERE access_instructions LIKE '%' || :'k' || '%' "
                    "AND status NOT IN ('paid','review_passed');", k=SYNTH)
        self.assertEqual(left, "0")
        # Idempotent: a second sweep changes nothing.
        code, out, _ = run("sweep")
        self.assertEqual((code, json.loads(out)["affected_rows"]), (0, 0))

    def test_dry_run_changes_nothing(self):
        rid = insert(json.dumps({"api_key": SYNTH}), status="refunded")
        code, out, _ = run("sweep", "--dry-run")
        self.assertEqual((code, json.loads(out)["affected_rows"], json.loads(out)["order_ids"]), (0, 1, [rid]))
        self.assertIn(SYNTH, access(rid))

    def test_over_long_json_falls_back_to_marker(self):
        rid = insert(json.dumps({"api_key": "k", "endpoint": "https://e/" + "a" * 740}), status="completed")
        self.assertLessEqual(len(access(rid)), 800)
        code, out, _ = run("sweep")
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(access(rid))["access_removed"], akp.MARKER_TEXT)

    def test_sweep_never_raises(self):
        with unittest.mock.patch.object(akp, "DB_NAME", "no_such_database"):
            self.assertEqual(akp.sweep(), {"error": "database operation failed"})

    def test_postgres_log_never_holds_the_key(self):
        insert(json.dumps({"api_key": SYNTH, "endpoint": "https://api.example.ai/v1"}), status="refunded")
        before = (TMP / "pg.log").read_text()
        run("sweep")
        run("purge-order", "ffffffff")
        new_log = (TMP / "pg.log").read_text()[len(before):]
        self.assertTrue(new_log)  # log_statement=all is on, so the statements were logged
        self.assertNotIn(SYNTH, new_log)


@unittest.skipIf(PG_BIN is None, "no PostgreSQL binaries")
class PurgeOrder(unittest.TestCase):
    def setUp(self) -> None:
        clear()

    def test_exact_id_purges_one_row_with_receipt(self):
        target = insert(f"Azure endpoint https://x.openai.azure.com key {SYNTH}", status="refunded",
                        rid="d2b677de-0000-4000-8000-000000000001")
        other = insert(json.dumps({"api_key": SYNTH}), status="refunded")
        code, out, err = run("purge-order", "d2b677de")
        self.assertEqual(code, 0, err)
        receipt = json.loads(out)
        self.assertEqual(set(receipt), {"action", "order_id", "affected_rows", "api_key_purged_at", "dry_run"})
        self.assertEqual((receipt["order_id"], receipt["affected_rows"]), (target, 1))
        self.assertNotIn(SYNTH, out + err + access(target))
        self.assertIn(SYNTH, access(other))  # exact id only

    def test_refuses_zero_matches(self):
        insert(json.dumps({"api_key": SYNTH}), status="refunded", rid="aaaaaaaa-0000-4000-8000-000000000001")
        code, out, err = run("purge-order", "bbbbbbbb")
        self.assertEqual(code, 3)
        self.assertIn("refused: no order matches", err)
        self.assertEqual(out, "")

    def test_refuses_multiple_matches(self):
        a = insert(json.dumps({"api_key": SYNTH}), status="refunded", rid="cccccccc-0000-4000-8000-000000000001")
        b = insert(json.dumps({"api_key": SYNTH}), status="refunded", rid="cccccccc-0000-4000-8000-000000000002")
        code, out, err = run("purge-order", "cccccccc")
        self.assertEqual(code, 3)
        self.assertIn("refused: 2 orders match", err)
        self.assertIn(SYNTH, access(a))
        self.assertIn(SYNTH, access(b))

    def test_open_order_is_not_purged(self):
        rid = insert(json.dumps({"api_key": SYNTH}), status="paid")
        code, out, _ = run("purge-order", rid)
        self.assertEqual(code, 4)
        receipt = json.loads(out)
        self.assertEqual((receipt["affected_rows"], receipt["status"]), (0, "paid"))
        self.assertIn("not delivered, refunded or closed", receipt["note"])
        self.assertIn(SYNTH, access(rid))

    def test_already_purged_reports_zero(self):
        rid = insert(json.dumps({"api_key": SYNTH}), status="completed")
        self.assertEqual(run("purge-order", rid)[0], 0)
        code, out, _ = run("purge-order", rid)
        self.assertEqual((code, json.loads(out)["affected_rows"]), (4, 0))
        self.assertIn("nothing to purge", json.loads(out)["note"])

    def test_bad_reference_is_refused(self):
        code, _, err = run("purge-order", "x'; DROP TABLE bh_priority_evaluation_requests; --")
        self.assertEqual(code, 3)
        self.assertIn("6-36 hex", err)


@unittest.skipIf(PG_BIN is None, "no PostgreSQL binaries")
class Source(unittest.TestCase):
    def test_module_never_selects_the_column_value(self):
        src = (HERE / "access_key_purge.py").read_text()
        # access_instructions may only be read inside the in-database transformation CTE and written by the UPDATE.
        self.assertEqual(src.count("r.access_instructions AS v"), 1)
        self.assertNotIn("print(row", src)
        self.assertNotIn("hashlib", src)

    def test_autopickup_cycle_calls_sweep_once(self):
        src = (HERE / "autopickup.py").read_text()
        self.assertEqual(src.count("access_key_purge.sweep()"), 1)
        self.assertIn("access_key_purge.py", (HERE / "install-autopickup.sh").read_text())


if __name__ == "__main__":
    import unittest.mock  # noqa: F401
    unittest.main()
