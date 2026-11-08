#!/usr/bin/env python3
"""Agent CLI for the fast-lane review-first queue (orders the pre-payment intake check could not clear).

  intake_review.py list
  intake_review.py approve <id|ref> --by <agent>      sets intake_approved_at/by, new pay token (only its sha256 is stored),
                                                       prints the pay URL ONCE
  intake_review.py decline <id|ref> --by <agent> --reason "..."    status intake_declined

No mail is sent here: the approving agent mails the printed link to the customer. Database: FASTLANE_DB (default
benchmarkheaven_accounts, the same as autopickup.py), through psql. Stdlib only. Everything is idempotent: approve on an
already-approved unpaid row issues a fresh token (the old link stops working); decline never touches paid rows.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import secrets
import subprocess
import sys
from datetime import datetime, timezone

DB_NAME = os.environ.get("FASTLANE_DB") or "benchmarkheaven_accounts"
SITE = os.environ.get("FASTLANE_SITE") or "https://benchmarkheaven.com"
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
REF_RE = re.compile(r"^[0-9a-f]{8}$", re.I)
AGENT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


class ReviewError(Exception):
    pass


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql(statement: str) -> str:
    result = subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", DB_NAME, "-c", statement],
        text=True, capture_output=True, timeout=30, check=False,
    )
    if result.returncode:
        raise ReviewError("database operation failed")
    return result.stdout.strip()


def sql_rows(statement: str) -> list[dict]:
    rows = []
    for line in sql(statement).splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def resolve(ident: str) -> str:
    """Full request id from a full UUID or the 8-character reference; must match exactly one row."""
    if UUID_RE.match(ident):
        found = sql_rows(f"SELECT json_build_object('id', id) FROM bh_priority_evaluation_requests WHERE id = {sql_text(ident.lower())}::uuid")
    elif REF_RE.match(ident):
        found = sql_rows(f"SELECT json_build_object('id', id) FROM bh_priority_evaluation_requests WHERE id::text LIKE {sql_text(ident.lower() + '%')}")
    else:
        raise ReviewError("give the request id (UUID) or its 8-character reference")
    if len(found) != 1:
        raise ReviewError("no unique request for that id" if not found else "reference is ambiguous; use the full id")
    return found[0]["id"]


def age(created: str) -> str:
    seconds = max(0, int((datetime.now(timezone.utc) - datetime.fromisoformat(created.replace("Z", "+00:00"))).total_seconds()))
    return f"{seconds // 3600}h{seconds % 3600 // 60:02d}m"


def cmd_list(_args) -> int:
    rows = sql_rows(
        "SELECT json_build_object('id', id, 'created_at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'), "
        "'model_link', model_link, 'access_type', access_type, 'intake_check', intake_check, 'approved', intake_approved_at IS NOT NULL) "
        "FROM bh_priority_evaluation_requests WHERE status='awaiting_review' ORDER BY created_at")
    if not rows:
        print("no requests awaiting review")
        return 0
    for r in rows:
        check = r.get("intake_check") or {}
        reason = f"{check.get('code', '?')}: {check.get('message', '')}".replace("\n", " ")
        flag = " [approved, awaiting payment]" if r["approved"] else ""
        print(f"{r['id'][:8]}  {r['id']}  age {age(r['created_at'])}  {r['access_type']}  {r['model_link'] or '-'}{flag}\n    {reason}")
    return 0


def cmd_approve(args) -> int:
    rid = resolve(args.id)
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    changed = sql(
        "UPDATE bh_priority_evaluation_requests SET intake_approved_at=COALESCE(intake_approved_at, now()), "
        f"intake_approved_by=COALESCE(intake_approved_by, {sql_text(args.by)}), pay_token_hash={sql_text(digest)}, updated_at=now() "
        f"WHERE id={sql_text(rid)}::uuid AND status='awaiting_review' RETURNING id")
    if not changed:
        raise ReviewError("request is not awaiting review (already paid, declined or in checkout)")
    print(f"approved {rid[:8]} by {args.by}")
    print(f"pay URL (shown once, send it to the customer): {SITE}/api/priority-evaluation/pay/{rid}?token={token}")
    return 0


def cmd_decline(args) -> int:
    rid = resolve(args.id)
    if not args.reason.strip():
        raise ReviewError("--reason is required")
    reason = args.reason.strip()[:500]
    changed = sql(
        "UPDATE bh_priority_evaluation_requests SET status='intake_declined', pay_token_hash=NULL, updated_at=now(), "
        f"intake_check=COALESCE(intake_check, '{{}}'::jsonb) || jsonb_build_object('declinedBy', {sql_text(args.by)}, "
        f"'declineReason', {sql_text(reason)}, 'declinedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')) "
        f"WHERE id={sql_text(rid)}::uuid AND status='awaiting_review' RETURNING id")
    if not changed:
        raise ReviewError("request is not awaiting review (already paid, declined or in checkout)")
    print(f"declined {rid[:8]} by {args.by}")
    return 0


def agent(value: str) -> str:
    if not AGENT_RE.match(value):
        raise argparse.ArgumentTypeError("--by must be an agent name (letters, digits, . _ -)")
    return value


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list").set_defaults(func=cmd_list)
    p = sub.add_parser("approve"); p.add_argument("id"); p.add_argument("--by", required=True, type=agent); p.set_defaults(func=cmd_approve)
    p = sub.add_parser("decline"); p.add_argument("id"); p.add_argument("--by", required=True, type=agent)
    p.add_argument("--reason", required=True); p.set_defaults(func=cmd_decline)
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ReviewError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
