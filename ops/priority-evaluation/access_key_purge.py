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
- Shapes: a JSON object keeps its non-secret fields (endpoint, model, ...), loses every secret-looking field (api_key,
  auth_header, token, password, headers, ...) and gains "api_key_purged_at". Anything else (free text, JSON that is not an
  object, invalid JSON) is replaced as a whole by a fixed marker object, because a key inside free text cannot be cut out
  safely. A JSON object that would exceed the column's 800-character limit also falls back to the marker.
- Closed = status completed/refunded/expired/checkout_failed/intake_declined, or result_delivered_at or refund_id set.
  Open orders are never touched.

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
# Field names treated as secrets inside a JSON object (case-insensitive regex on the key, never on the value).
SECRET_FIELD_RE = "(key|token|secret|passw|auth|bearer|credential|cookie|header|session)"
REF_RE = re.compile(r"^[0-9a-fA-F-]{6,36}$")

CLOSED_SQL = ("(r.status IN (" + ", ".join(f"'{s}'" for s in CLOSED_STATUSES) + ")"
              " OR r.result_delivered_at IS NOT NULL OR r.refund_id IS NOT NULL)")

# One statement: lock the scoped rows, compute the purged value in the database, update, return ids only.
# :scope is substituted by this module from two fixed strings below (never user input); :'now' and :'id' are psql variables.
PURGE_SQL = f"""
WITH candidates AS (
  SELECT r.id, r.access_instructions AS v FROM {TABLE} r
  WHERE {CLOSED_SQL} AND %(scope)s
    AND position('"api_key_purged_at"' in r.access_instructions) = 0  -- already purged rows are not re-locked each cycle
  FOR UPDATE
), shaped AS (
  SELECT c.id, CASE WHEN pg_input_is_valid(c.v, 'jsonb') AND jsonb_typeof(c.v::jsonb) = 'object' THEN c.v::jsonb END AS obj
  FROM candidates c
), secret_fields AS (
  SELECT s.id, array_agg(k) FILTER (WHERE k <> 'api_key_purged_at' AND lower(k) ~ '{SECRET_FIELD_RE}') AS ks
  FROM shaped s LEFT JOIN LATERAL jsonb_object_keys(s.obj) AS k ON true
  GROUP BY s.id
), marker AS (
  SELECT jsonb_build_object('access_removed', '{MARKER_TEXT}', 'api_key_purged_at', :'now')::text AS m
), planned AS (
  SELECT s.id, CASE
      WHEN s.obj IS NULL THEN (SELECT m FROM marker)
      WHEN f.ks IS NULL THEN NULL
      ELSE ((s.obj - f.ks) || jsonb_build_object('api_key_purged_at', :'now'))::text
    END AS new_value
  FROM shaped s JOIN secret_fields f USING (id)
), final AS (
  SELECT p.id, CASE WHEN length(p.new_value) <= 800 THEN p.new_value ELSE (SELECT m FROM marker) END AS new_value
  FROM planned p WHERE p.new_value IS NOT NULL
), upd AS (
  UPDATE {TABLE} r SET access_instructions = f.new_value, updated_at = now()
  FROM final f WHERE r.id = f.id
  RETURNING r.id::text AS id
)
SELECT json_build_object('count', count(*), 'ids', COALESCE(json_agg(id ORDER BY id), '[]'::json), 'api_key_purged_at', :'now')
FROM upd;
"""
SCOPE_ALL = "true"
SCOPE_ONE = "r.id = (:'id')::uuid"


class PurgeError(RuntimeError):
    pass


def _psql(body: str, **variables: str) -> str:
    argv = ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=terse"]
    for key, value in variables.items():
        argv += ["-v", f"{key}={value}"]
    argv += ["-d", DB_NAME]
    script = "\\set VERBOSITY terse\nSET standard_conforming_strings = on;\n" + body
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


def _purge(scope: str, dry_run: bool, **variables: str) -> dict:
    statement = PURGE_SQL % {"scope": scope}
    wrapped = ("BEGIN;\n" + statement + ("ROLLBACK;\n" if dry_run else "COMMIT;\n"))
    result = _last_json(_psql(wrapped, now=_now(), **variables))
    result["count"] = int(result.get("count") or 0)
    result["ids"] = [str(i) for i in result.get("ids") or []]
    return result


def _receipt(entry: dict) -> None:
    try:
        STATE_ROOT.mkdir(parents=True, exist_ok=True)
        with (STATE_ROOT / RECEIPT_LOG).open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, sort_keys=True) + "\n")
    except OSError:
        pass


def resolve(ref: str) -> str:
    """Exactly one order id for `ref` (full uuid or prefix); refuses zero or several matches. Reads ids only."""
    ref = (ref or "").strip().lower()
    if not REF_RE.match(ref):
        raise PurgeError("order reference must be 6-36 hex characters (uuid or prefix)")
    out = _psql(f"SELECT COALESCE(json_agg(id::text ORDER BY id), '[]'::json) FROM {TABLE} WHERE id::text LIKE :'ref' || '%';", ref=ref)
    lines = [line for line in out.splitlines() if line.strip()]
    ids = json.loads(lines[-1]) if lines else []
    if len(ids) == 0:
        raise PurgeError(f"refused: no order matches {ref}")
    if len(ids) > 1:
        raise PurgeError(f"refused: {len(ids)} orders match {ref}; give more of the id")
    return ids[0]


def order_state(order_id: str) -> dict:
    """Non-secret facts explaining a zero-row purge: status and whether the row is closed. Never the column value."""
    out = _psql(f"SELECT json_build_object('status', r.status, 'closed', {CLOSED_SQL}) FROM {TABLE} r WHERE r.id = (:'id')::uuid;", id=order_id)
    return _last_json(out)


def purge_order(ref: str, dry_run: bool = False) -> dict:
    order_id = resolve(ref)
    result = _purge(SCOPE_ONE, dry_run, id=order_id)
    receipt = {"action": "purge-order", "order_id": order_id, "affected_rows": result["count"],
               "api_key_purged_at": result["api_key_purged_at"] if result["count"] else None, "dry_run": dry_run}
    if result["count"] == 0:
        state = order_state(order_id)
        receipt["note"] = ("order is not delivered, refunded or closed; not purged" if not state.get("closed")
                           else "nothing to purge (already purged or no access secrets)")
        receipt["status"] = state.get("status")
    if not dry_run:
        _receipt({"at": _now(), **receipt})
    return receipt


def sweep(dry_run: bool = False) -> dict:
    """Purge every closed order that still holds access secrets. Never raises (autopickup cycle safety)."""
    try:
        result = _purge(SCOPE_ALL, dry_run)
    except Exception as exc:  # noqa: BLE001 - the pickup cycle must go on; the reason is generic by construction
        return {"error": str(exc) if isinstance(exc, PurgeError) else type(exc).__name__}
    receipt = {"action": "sweep", "affected_rows": result["count"], "order_ids": result["ids"],
               "api_key_purged_at": result["api_key_purged_at"] if result["count"] else None, "dry_run": dry_run}
    if result["count"] and not dry_run:
        _receipt({"at": _now(), **receipt})
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
