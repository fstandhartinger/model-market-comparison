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
sys.path.insert(0, str(HERE))
import access_key_purge as akp  # noqa: E402

# No FASTLANE_* environment changes (they would leak into other test modules run in the same process).
akp.DB_NAME = "purge_test"
akp.STATE_ROOT = TMP / "state"
PG_ENV_KEYS = ("PGHOST", "PGPORT", "PGUSER")
SAVED_PG_ENV = {k: os.environ.get(k) for k in PG_ENV_KEYS}

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
    for key, value in SAVED_PG_ENV.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
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
        submit_text = ("Submitted via /submit (ref ABCD1234). API URL: https://api.example.ai/v1 "
                       "API key: stored encrypted in the submission record.")
        rows = {
            "json_key": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "api_key": SYNTH, "model": "m-1"})),
            "json_auth_header": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "auth_header": f"Bearer {SYNTH}",
                                                   "headers": {"X-Api-Key": SYNTH}, "model": "m-2"}), status="refunded"),
            "json_nested": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "config": {"api_key": SYNTH}}), status="completed"),
            "json_key_in_url": insert(json.dumps({"endpoint": f"https://api.example.ai/v1?api_key={SYNTH}", "model": "m-4"}), status="completed"),
            "json_userinfo": insert(json.dumps({"endpoint": f"https://user:{SYNTH}@api.example.ai/v1"}), status="completed"),
            "json_odd_names": insert(json.dumps({"apiKey": SYNTH, "Authorization": SYNTH, "pass": SYNTH, "model": "m-5"}), status="expired"),
            "json_token_in_model": insert(json.dumps({"model": SYNTH.replace("-", "_")}), status="completed"),
            "json_fake_marker": insert(json.dumps({"access_removed": SYNTH}), status="completed"),
            "json_already_marked": insert(json.dumps({"api_key": SYNTH, "api_key_purged_at": "2026-01-01T00:00:00Z"}), status="completed"),
            "json_no_secret": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "model": "m-3"}), status="expired"),
            "free_text": insert(f"Use endpoint https://api.example.ai/v1 with key {SYNTH}", status="refunded"),
            "json_array": insert(json.dumps([SYNTH, "x"]), status="checkout_failed"),
            "broken_json": insert('{"api_key": "' + SYNTH + '", ', status="intake_declined"),
            "submit_text": insert(submit_text, status="completed"),
            "open_weights_text": insert("Open weights at the links above.", status="completed", access_type="open_weights"),
            "submit_text_with_key": insert(submit_text + f" Also: {SYNTH}", status="completed"),
            "refund_id_flag": insert(json.dumps({"api_key": SYNTH}), status="refund_pending", refund_id="re_synthetic_1"),
            "paid_but_delivered": insert(json.dumps({"api_key": SYNTH}), status="paid", delivered=True),
            "open_order": insert(json.dumps({"endpoint": "https://api.example.ai/v1", "api_key": SYNTH}), status="paid"),
            "open_free_text": insert(f"key {SYNTH}", status="review_passed"),
        }
        code, out, err = run("sweep")
        self.assertEqual(code, 0, err)
        result = json.loads(out)
        purged = {"json_key", "json_auth_header", "json_nested", "json_key_in_url", "json_userinfo", "json_odd_names",
                  "json_token_in_model", "json_already_marked", "json_fake_marker", "free_text", "json_array", "broken_json",
                  "submit_text_with_key", "refund_id_flag"}
        self.assertEqual(sorted(result["order_ids"]), sorted(rows[n] for n in purged))
        self.assertEqual(result["affected_rows"], len(purged))
        stamp = result["api_key_purged_at"]
        self.assertRegex(stamp, r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
        # The key never appears in output, error stream or the receipt log.
        receipt_log = (TMP / "state" / akp.RECEIPT_LOG).read_text()
        for text in (out, err, receipt_log):
            self.assertNotIn(SYNTH, text)
        # JSON objects keep only safe allow-listed fields and gain api_key_purged_at.
        self.assertEqual(json.loads(access(rows["json_key"])), {"endpoint": "https://api.example.ai/v1", "model": "m-1", "api_key_purged_at": stamp})
        self.assertEqual(json.loads(access(rows["json_auth_header"])), {"endpoint": "https://api.example.ai/v1", "model": "m-2", "api_key_purged_at": stamp})
        self.assertEqual(json.loads(access(rows["json_nested"])), {"endpoint": "https://api.example.ai/v1", "api_key_purged_at": stamp})
        self.assertEqual(json.loads(access(rows["json_key_in_url"])), {"model": "m-4", "api_key_purged_at": stamp})
        self.assertEqual(json.loads(access(rows["json_odd_names"])), {"model": "m-5", "api_key_purged_at": stamp})
        self.assertEqual(json.loads(access(rows["json_already_marked"])), {"api_key_purged_at": stamp})
        # Non-objects are replaced whole by the marker.
        for name in ("free_text", "json_array", "broken_json", "submit_text_with_key"):
            self.assertEqual(json.loads(access(rows[name])), {"access_removed": akp.MARKER_TEXT, "api_key_purged_at": stamp}, name)
        # Untouched: safe JSON, the key-free /submit texts, a paid row with a delivery stamp, and every open order.
        self.assertEqual(json.loads(access(rows["json_no_secret"])), {"endpoint": "https://api.example.ai/v1", "model": "m-3"})
        self.assertEqual(access(rows["submit_text"]), submit_text)
        self.assertEqual(access(rows["open_weights_text"]), "Open weights at the links above.")
        for name in ("paid_but_delivered", "open_order", "open_free_text"):
            self.assertIn(SYNTH, access(rows[name]), name)
        # Nothing secret is left in any closed row.
        left = psql("SELECT count(*) FROM bh_priority_evaluation_requests WHERE position(:'k' in access_instructions) > 0 "
                    "AND status NOT IN ('paid','review_passed');", k=SYNTH)
        self.assertEqual(left, "0")
        self.assertEqual(psql("SELECT count(*) FROM bh_priority_evaluation_requests WHERE position(:'k' in access_instructions) > 0;",
                              k=SYNTH.replace("-", "_")), "0")
        # Idempotent: a second sweep changes nothing.
        code, out, _ = run("sweep")
        self.assertEqual((code, json.loads(out)["affected_rows"]), (0, 0))

    def test_dry_run_changes_nothing(self):
        rid = insert(json.dumps({"api_key": SYNTH}), status="refunded")
        code, out, _ = run("sweep", "--dry-run")
        self.assertEqual((code, json.loads(out)["affected_rows"], json.loads(out)["order_ids"]), (0, 1, [rid]))
        self.assertIn(SYNTH, access(rid))

    def test_over_long_json_falls_back_to_marker(self):
        # Five safe 140-character URLs fit the 800-character check with the key, but not with api_key_purged_at added.
        safe = {f: ("https://e.example/" + "ab-" * 58)[:140] for f in ("endpoint", "base_url", "api_base", "api_url", "url")}
        rid = insert(json.dumps({"api_key": "k", **safe}), status="completed")
        self.assertLessEqual(len(access(rid)), 800)
        self.assertGreater(len(json.dumps({**safe, "api_key_purged_at": "2026-11-17T07:00:00Z"})), 800)
        code, out, _ = run("sweep")
        self.assertEqual((code, json.loads(out)["affected_rows"]), (0, 1))
        self.assertEqual(json.loads(access(rid))["access_removed"], akp.MARKER_TEXT)

    def test_sweep_never_raises_and_logs_the_failure(self):
        state = TMP / "state-error"
        self.assertEqual(akp.sweep(db="no_such_database", state_root=state), {"error": "database operation failed"})
        entry = json.loads((state / akp.RECEIPT_LOG).read_text().splitlines()[-1])
        self.assertEqual((entry["action"], entry["error"]), ("sweep", "database operation failed"))

    def test_explicit_db_argument_is_used(self):
        rid = insert(json.dumps({"api_key": SYNTH}), status="refunded")
        with unittest.mock.patch.object(akp, "DB_NAME", "no_such_database"):
            self.assertEqual(akp.sweep(db="purge_test")["order_ids"], [rid])

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

    def test_full_uuid_without_hyphens_resolves(self):
        rid = insert(json.dumps({"api_key": SYNTH}), status="refunded")
        code, out, _ = run("purge-order", rid.replace("-", ""))
        self.assertEqual((code, json.loads(out)["order_id"]), (0, rid))

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
        self.assertIn("not refunded or closed", receipt["note"])
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
        self.assertEqual(src.count("access_key_purge.sweep(db=DB_NAME, state_root=STATE_ROOT)"), 1)
        self.assertIn("access_key_purge.py", (HERE / "install-autopickup.sh").read_text())


if __name__ == "__main__":
    import unittest.mock  # noqa: F401
    unittest.main()
