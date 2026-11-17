#!/usr/bin/env python3
"""Remove customer API keys from closed fast-lane orders (bh_priority_evaluation_requests.access_instructions).

Board #64709/#64721/#64725 (17 Nov 2026): keys stayed in access_instructions after delivery unless a native owner purged
them by hand, and refunded orders were never purged. This module purges them automatically and offers one exact-id
maintenance command.

Safety contract (binding, deputy #64725):
- The key never leaves PostgreSQL. Every statement transforms the column inside the database; nothing SELECTs, prints,
  hashes or logs the value. Output and the receipt log carry only order ids, the affected-row count and
  api_key_purged_at.
- psql runs with VERBOSITY terse, so an error never echoes a row (no DETAIL/CONTEXT); this module reports only a generic
  failure. Values reach SQL as psql variables, never string-built.
- Shapes: a JSON object keeps only allow-listed, plainly safe string fields (endpoint/base_url/model/provider/...: no "@",
  "?", "=", whitespace runs or 24+ character token runs, so no userinfo, query keys or embedded tokens) and gains
  "api_key_purged_at"; every other field (api_key, auth_header, headers, nested objects, unknown names) is dropped.
  Anything else (free text, JSON that is not an object, invalid JSON) is replaced as a whole by a fixed marker object,
  because a key inside free text cannot be cut out safely. Exempt: the two key-free texts /submit itself writes
  (lib/model-submission.mjs toPriorityBody; its API URL is validated to carry no key). A JSON object that would exceed the
  column's 800-character limit also falls back to the marker.
- Closed = status completed/refunded/expired/checkout_failed/intake_declined, or refund_id set. Open orders are never
  touched; neither is an anomalous paid row with result_delivered_at (e.g. the recovery-pinned 3687485f).
- No row locks are held across the planning step: the UPDATE only applies when the column still equals the value it was
  planned from, with lock_timeout 3 s and statement_timeout 20 s, so a busy row can never stall the pickup cycle.

Commands:
  access_key_purge.py sweep [--dry-run]            purge every closed order that still holds access secrets
  access_key_purge.py purge-order <ref> [--dry-run]  exact-id maintenance path: <ref> = full uuid or an id prefix that must
                                                     match exactly one order (refuses zero or several matches)
autopickup.py calls sweep() once per cycle; it never raises into the cycle.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

TABLE = "bh_priority_evaluation_requests"
DB_NAME = os.environ.get("FASTLANE_DB") or "benchmarkheaven_accounts"
STATE_ROOT = Path(os.environ.get("FASTLANE_STATE_ROOT") or Path.home() / ".local/state/fastlane-autopickup")
RECEIPT_LOG = "access-key-purge.jsonl"
CLOSED_STATUSES = ("completed", "refunded", "expired", "checkout_failed", "intake_declined")
MARKER_TEXT = "Access details removed after the order closed."
# JSON fields that may survive a purge, and only as plain strings (checked on the value inside the database).
SAFE_FIELDS = ("endpoint", "base_url", "api_base", "api_url", "url", "model", "model_id", "model_name", "provider",
               "region", "api_version", "deployment", "access_type", "protocol", "format")
SAFE_VALUE_SQL = ("jsonb_typeof(e.value) = 'string' AND (e.value #>> '{}') ~ '^[A-Za-z0-9._:/+ -]{1,200}$' "
                  "AND (e.value #>> '{}') !~ '[A-Za-z0-9_]{24,}'")
# The key-free texts /submit writes into access_instructions (lib/model-submission.mjs toPriorityBody).
SUBMIT_TEXT_RE = (r"^Submitted via /submit \(ref [A-Za-z0-9-]{1,40}\)\. API URL: (https://[^\s@?#=&]{1,250}|see the submission "
                  r"record\.) API key: (stored encrypted in the submission record|none submitted)\.$")
OPEN_WEIGHTS_TEXT = "Open weights at the links above."
REF_RE = re.compile(r"^[0-9a-f-]{6,36}$")

CLOSED_SQL = ("(r.status IN (" + ", ".join(f"'{s}'" for s in CLOSED_STATUSES) + ")"
              " OR r.refund_id IS NOT NULL)")

# One statement: plan the purged value in the database, update only rows still equal to the planned-from value, return
# ids only. %(scope)s is one of the two fixed strings below (never user input); :'now' and :'id' are psql variables.
PURGE_SQL = f"""
WITH candidates AS (
  SELECT r.id, r.access_instructions AS v FROM {TABLE} r
  WHERE {CLOSED_SQL} AND %(scope)s
), shaped AS (
  SELECT c.id, c.v, CASE WHEN pg_input_is_valid(c.v, 'jsonb') AND jsonb_typeof(c.v::jsonb) = 'object' THEN c.v::jsonb END AS obj
  FROM candidates c
), fields AS (
  SELECT s.id,
    jsonb_object_agg(e.key, e.value) FILTER (WHERE e.key IN ({", ".join(f"'{f}'" for f in SAFE_FIELDS)}) AND {SAFE_VALUE_SQL}) AS kept,
    count(e.key) FILTER (WHERE e.key <> 'api_key_purged_at' AND NOT (e.key = 'access_removed' AND (e.value #>> '{{}}') = '{MARKER_TEXT}')
      AND NOT (e.key IN ({", ".join(f"'{f}'" for f in SAFE_FIELDS)}) AND {SAFE_VALUE_SQL})) AS dropped
  FROM shaped s LEFT JOIN LATERAL jsonb_each(s.obj) AS e ON true
  GROUP BY s.id
), marker AS (
  SELECT jsonb_build_object('access_removed', '{MARKER_TEXT}', 'api_key_purged_at', :'now')::text AS m
), planned AS (
  SELECT s.id, s.v AS old_v, CASE
      WHEN s.obj IS NULL AND (s.v = '{OPEN_WEIGHTS_TEXT}' OR s.v ~ '{SUBMIT_TEXT_RE}') THEN NULL
      WHEN s.obj IS NULL THEN (SELECT m FROM marker)
      WHEN f.dropped = 0 THEN NULL
      ELSE (COALESCE(f.kept, '{{}}'::jsonb) || jsonb_build_object('api_key_purged_at', :'now'))::text
    END AS new_value
  FROM shaped s JOIN fields f USING (id)
), final AS (
  SELECT p.id, p.old_v, CASE WHEN length(p.new_value) <= 800 THEN p.new_value ELSE (SELECT m FROM marker) END AS new_value
  FROM planned p WHERE p.new_value IS NOT NULL
), upd AS (
  UPDATE {TABLE} r SET access_instructions = f.new_value, updated_at = now()
  FROM final f WHERE r.id = f.id AND r.access_instructions = f.old_v
  RETURNING r.id::text AS id
)
SELECT json_build_object('count', count(*), 'ids', COALESCE(json_agg(id ORDER BY id), '[]'::json), 'api_key_purged_at', :'now')
FROM upd;
"""
SCOPE_ALL = "true"
SCOPE_ONE = "r.id = (:'id')::uuid"


class PurgeError(RuntimeError):
    pass


def _psql(body: str, db: str | None = None, **variables: str) -> str:
    argv = ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=terse"]
    for key, value in variables.items():
        argv += ["-v", f"{key}={value}"]
    argv += ["-d", db or DB_NAME]
    script = ("\\set VERBOSITY terse\nSET standard_conforming_strings = on;\nSET lock_timeout = '3s';\n"
              "SET statement_timeout = '20s';\n" + body)
    result = subprocess.run(argv, input=script, text=True, capture_output=True, timeout=60, check=False)
    if result.returncode:
        # Never forward psql's text: it is generic here by design (no row data can reach a log).
        raise PurgeError("database operation failed")
    return result.stdout


def _last_json(output: str) -> dict:
    lines = [line for line in output.splitlines() if line.strip()]
    if not lines:
        raise PurgeError("database returned nothing")
    try:
        value = json.loads(lines[-1])
    except json.JSONDecodeError as exc:
        raise PurgeError("database returned invalid JSON") from exc
    if not isinstance(value, dict):
        raise PurgeError("database returned an invalid result")
    return value


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _purge(scope: str, dry_run: bool, db: str | None = None, **variables: str) -> dict:
    statement = PURGE_SQL % {"scope": scope}
    wrapped = "BEGIN;\n" + statement + ("ROLLBACK;\n" if dry_run else "COMMIT;\n")
    result = _last_json(_psql(wrapped, db, now=_now(), **variables))
    result["count"] = int(result.get("count") or 0)
    result["ids"] = [str(i) for i in result.get("ids") or []]
    return result


def _receipt(entry: dict, state_root: Path | None = None) -> None:
    root = state_root or STATE_ROOT
    try:
        root.mkdir(parents=True, exist_ok=True)
        with (root / RECEIPT_LOG).open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"at": _now(), **entry}, sort_keys=True) + "\n")
    except OSError:
        pass


def resolve(ref: str, db: str | None = None) -> str:
    """Exactly one order id for `ref` (full uuid, with or without hyphens, or a prefix); refuses zero or several matches.
    Reads ids only."""
    ref = (ref or "").strip().lower()
    if not REF_RE.match(ref) or len(ref.replace("-", "")) < 6:
        raise PurgeError("order reference must be 6-36 hex characters (uuid or prefix)")
    out = _psql(f"SELECT json_build_object('ids', COALESCE(json_agg(id::text ORDER BY id), '[]'::json)) FROM {TABLE} "
                "WHERE replace(id::text, '-', '') LIKE replace(:'ref', '-', '') || '%';", db, ref=ref)
    ids = _last_json(out).get("ids") or []
    if len(ids) == 0:
        raise PurgeError(f"refused: no order matches {ref}")
    if len(ids) > 1:
        raise PurgeError(f"refused: {len(ids)} orders match {ref}; give more of the id")
    return str(ids[0])


def order_state(order_id: str, db: str | None = None) -> dict:
    """Non-secret facts explaining a zero-row purge: status and whether the row is closed. Never the column value."""
    out = _psql(f"SELECT json_build_object('status', r.status, 'closed', {CLOSED_SQL}) FROM {TABLE} r WHERE r.id = (:'id')::uuid;",
                db, id=order_id)
    return _last_json(out)


def purge_order(ref: str, dry_run: bool = False, db: str | None = None, state_root: Path | None = None) -> dict:
    order_id = resolve(ref, db)
    result = _purge(SCOPE_ONE, dry_run, db, id=order_id)
    receipt = {"action": "purge-order", "order_id": order_id, "affected_rows": result["count"],
               "api_key_purged_at": result["api_key_purged_at"] if result["count"] else None, "dry_run": dry_run}
    if result["count"] == 0:
        state = order_state(order_id, db)
        receipt["note"] = ("order is not refunded or closed; not purged" if not state.get("closed")
                           else "nothing to purge (already purged, or no access secrets)")
        receipt["status"] = state.get("status")
    if not dry_run:
        _receipt(receipt, state_root)
    return receipt


def sweep(dry_run: bool = False, db: str | None = None, state_root: Path | None = None) -> dict:
    """Purge every closed order that still holds access secrets. Never raises (autopickup cycle safety); a failure is
    returned and written to the receipt log."""
    try:
        result = _purge(SCOPE_ALL, dry_run, db)
    except Exception as exc:  # noqa: BLE001 - the pickup cycle must go on; the reason is generic by construction
        error = {"action": "sweep", "error": str(exc) if isinstance(exc, PurgeError) else type(exc).__name__}
        if not dry_run:
            _receipt(error, state_root)
        return {"error": error["error"]}
    receipt = {"action": "sweep", "affected_rows": result["count"], "order_ids": result["ids"],
               "api_key_purged_at": result["api_key_purged_at"] if result["count"] else None, "dry_run": dry_run}
    if result["count"] and not dry_run:
        _receipt(receipt, state_root)
    return receipt


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="access_key_purge")
    sub = parser.add_subparsers(dest="command", required=True)
    sweep_parser = sub.add_parser("sweep")
    sweep_parser.add_argument("--dry-run", action="store_true")
    one = sub.add_parser("purge-order")
    one.add_argument("ref")
    one.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.command == "sweep":
            result = sweep(args.dry_run)
            print(json.dumps(result, sort_keys=True))
            return 1 if "error" in result else 0
        result = purge_order(args.ref, args.dry_run)
        print(json.dumps(result, sort_keys=True))
        return 0 if result["affected_rows"] == 1 else 4
    except PurgeError as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
