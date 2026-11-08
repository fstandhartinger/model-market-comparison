#!/usr/bin/env python3
"""Agent CLI for the fast-lane review-first queue (orders the pre-payment intake check could not clear).

  intake_review.py list
  intake_review.py approve <id|ref> --by <agent> [--mail]    sets intake_approved_at/by, new pay token (only its sha256 is
                                                              stored), prints the pay URL ONCE; --mail sends the customer
                                                              the fixed-template pay-link mail
  intake_review.py decline <id|ref> --by <agent> --reason "..." [--code <code> --mail]    status intake_declined; --mail sends
                                                              the fixed template whose reason paragraph is picked by --code
  intake_review.py watch                                      one pass of the owner handoff (see below); run by a timer

Customer mail goes only through autopickup.Effects.mail (the same fixed-template path autopickup uses: author-message guard,
mail tool, brand From address). The mail text is a template plus the order reference, the pay URL or one paragraph picked from
DECLINE_REASONS; no agent free text (--reason stays in the database) reaches the customer.

watch: every awaiting_review row without a local marker (~/.local/state/fastlane-autopickup/intake-review/<id>.json, no DB write)
gets exactly one board handoff to the owning job; the marker is written only after the post succeeded. If the row is still
awaiting_review 12 h later, one reminder (at most one) follows.

Database: FASTLANE_DB (default benchmarkheaven_accounts, the same as autopickup.py), through psql. Stdlib only apart from the
lazily imported autopickup. Everything is idempotent: approve on an already-approved unpaid row issues a fresh token (the old
link stops working); decline never touches paid rows.
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
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB_NAME = os.environ.get("FASTLANE_DB") or "benchmarkheaven_accounts"
SITE = os.environ.get("FASTLANE_SITE") or "https://benchmarkheaven.com"
HERE = Path(__file__).resolve().parent
STATE_DIR = Path(os.environ.get("FASTLANE_INTAKE_STATE") or Path.home() / ".local/state/fastlane-autopickup/intake-review")
AGENT_BOARD = os.environ.get("FASTLANE_AGENT_BOARD") or str(Path.home() / "bin/agent-board")
BOARD_THREAD = "11"
OWNER_JOB = "fastlane-sla-20261004"
REMINDER_AFTER_HOURS = 12
# One paragraph per decline code; the only text of a decline mail that depends on the agent's choice.
DECLINE_REASONS = {
    "unsupported_runtime": "Our standard GPU runner cannot serve this model's architecture, so we cannot run it within the fast lane.",
    "custom_code": "The model needs custom code from its repository, which we cannot run within the fast lane.",
    "over_cap": "Running this model would need more GPU time than the fast lane covers.",
    "private_endpoint": "We could not test your endpoint: it is private or needs an API key, and the fast lane cannot take private credentials.",
    "unreachable": "We could not reach or read your model or endpoint from our side.",
    "other": "We are not able to take this order into the fast lane.",
}
APPROVED_TEMPLATE = "autopickup-intake-approved-template.txt"
DECLINED_TEMPLATE = "autopickup-intake-declined-template.txt"
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


def render_mail(template: str, values: dict[str, str]) -> str:
    """Fixed template (installed copy first, repository copy as fallback) filled with autopickup's single-pass filler."""
    import autopickup  # lazy: same module and mail path the autopickup uses
    try:
        text = autopickup.read_template(template)
    except autopickup.PickupError:
        text = (HERE / template).read_text(encoding="utf-8")
    return autopickup.fill_template(text, values)


def send_mail(to: str, subject: str, body: str) -> tuple[bool, str]:
    """Customer mail through autopickup.Effects.mail (author guard + mail tool + brand sender). Replaced in tests."""
    import autopickup
    return autopickup.Effects(dry_run=False).mail(to, subject, body)


def order_email(rid: str) -> str:
    found = sql_rows(f"SELECT json_build_object('email', email) FROM bh_priority_evaluation_requests WHERE id = {sql_text(rid)}::uuid")
    return (found[0].get("email") or "") if found else ""


def mail_customer(rid: str, subject: str, template: str, values: dict[str, str]) -> bool:
    to = order_email(rid)
    ok, detail = send_mail(to, subject, render_mail(template, values))
    print(f"mail to customer of {rid[:8]}: {'sent' if ok else 'NOT sent (' + detail + ')'}")
    return ok


def mark_mailed(rid: str, key: str) -> None:
    sql("UPDATE bh_priority_evaluation_requests SET intake_check=COALESCE(intake_check, '{}'::jsonb) || "
        f"jsonb_build_object({sql_text(key)}, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')) WHERE id={sql_text(rid)}::uuid")


def awaiting_rows() -> list[dict]:
    return sql_rows(
        "SELECT json_build_object('id', id, 'created_at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'), "
        "'model_link', model_link, 'access_type', access_type, 'intake_check', intake_check, 'approved', intake_approved_at IS NOT NULL) "
        "FROM bh_priority_evaluation_requests WHERE status='awaiting_review' ORDER BY created_at")


def cmd_list(_args) -> int:
    rows = awaiting_rows()
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
    pay_url = f"{SITE}/api/priority-evaluation/pay/{rid}?token={token}"
    print(f"approved {rid[:8]} by {args.by}")
    if args.mail:
        if mail_customer(rid, f"Benchmark Heaven: payment link for your order {rid[:8]}", APPROVED_TEMPLATE,
                         {"ORDER_REF": rid[:8], "PAY_URL": pay_url}):
            mark_mailed(rid, "payLinkMailedAt")
            print("pay URL was mailed to the customer; not printed again")
            return 0
        print(f"pay URL (mail failed, shown once, send it by hand or rerun approve --mail): {pay_url}")
        return 1
    print(f"pay URL (shown once, send it to the customer): {pay_url}")
    return 0


def cmd_decline(args) -> int:
    rid = resolve(args.id)
    if not args.reason.strip():
        raise ReviewError("--reason is required")
    reason = args.reason.strip()[:500]
    if args.mail and not args.code:
        raise ReviewError("--mail needs --code (the customer text is chosen by code, never free text)")
    code = args.code or ""
    changed = sql(
        "UPDATE bh_priority_evaluation_requests SET status='intake_declined', pay_token_hash=NULL, updated_at=now(), "
        f"intake_check=COALESCE(intake_check, '{{}}'::jsonb) || jsonb_build_object('declinedBy', {sql_text(args.by)}, "
        f"'declineReason', {sql_text(reason)}, 'declineCode', {sql_text(code)}, 'declinedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')) "
        f"WHERE id={sql_text(rid)}::uuid AND status='awaiting_review' RETURNING id")
    if not changed:
        raise ReviewError("request is not awaiting review (already paid, declined or in checkout)")
    print(f"declined {rid[:8]} by {args.by}")
    if args.mail:
        if not mail_customer(rid, f"Benchmark Heaven: your order {rid[:8]}", DECLINED_TEMPLATE,
                             {"ORDER_REF": rid[:8], "REASON_PARAGRAPH": DECLINE_REASONS[code]}):
            return 1
        mark_mailed(rid, "declineMailedAt")
    return 0


# ---------------------------------------------------------------- watch (owner handoff)

def marker_path(rid: str) -> Path:
    return STATE_DIR / f"{rid}.json"


def read_marker(rid: str) -> dict | None:
    try:
        data = json.loads(marker_path(rid).read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (OSError, ValueError):
        return None


def write_marker(rid: str, data: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = marker_path(rid).with_suffix(".tmp")
    tmp.write_text(json.dumps(data), encoding="utf-8")
    os.chmod(tmp, 0o600)
    os.replace(tmp, marker_path(rid))


def one_line(value: object, limit: int) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def safe_link(value: object) -> str:
    """Customer-supplied link for the board: scheme, host and path only.

    Userinfo (user:token@), port, query and fragment can carry secrets, so they are dropped; anything that
    does not parse as an http(s) URL with a plain host is replaced by '-'."""
    import urllib.parse
    text = str(value or "").strip()
    try:
        parts = urllib.parse.urlsplit(text)
        host = parts.hostname or ""
    except ValueError:
        return "-"
    if parts.scheme not in ("http", "https") or not re.fullmatch(r"[a-z0-9.-]{1,253}", host):
        return "-"
    path = urllib.parse.quote(urllib.parse.unquote(parts.path), safe="/-._~")[:200]
    return f"{parts.scheme}://{host}{path}"


URL_RE = re.compile(r'[A-Za-z][A-Za-z0-9+.-]*://[^\s"<>]+')


def redact_urls(text: str) -> str:
    """Any URL inside a finding is reduced to scheme, host and path (see safe_link)."""
    return URL_RE.sub(lambda m: safe_link(m.group(0)), text)


def handoff_text(row: dict, reminder: bool) -> str:
    check = row.get("intake_check") or {}
    ref = row["id"][:8]
    script = HERE / "intake_review.py"
    lead = f"REMINDER, still awaiting review after {age(row['created_at'])}: " if reminder else ""
    state = "approved, waiting for the customer to pay" if row.get("approved") else "needs an agent decision"
    return (
        f"@{OWNER_JOB} {lead}fast-lane order {ref} was held for manual review before payment ({state}).\n"
        f"- Order ref: {ref} (id {row['id']})\n"
        f"- Access type: {one_line(row.get('access_type'), 40)}\n"
        f"- Link (host and path only): {safe_link(row.get('model_link'))}\n"
        f"- Intake finding: {one_line(check.get('code'), 60) or '?'}: {redact_urls(one_line(check.get('message'), 400))}\n"
        f"- Age: {age(row['created_at'])}\n"
        f"- Approve (mails the fixed pay-link template): python3 {script} approve {ref} --by <agent> --mail\n"
        f"- Decline (fixed template, code one of {', '.join(DECLINE_REASONS)}): python3 {script} decline {ref} --by <agent> "
        f"--code <code> --reason \"<internal note>\" --mail\n"
        "Nothing has been charged and the customer has no pay link until an agent approves.\n"
        f"Key: {handoff_key(row['id'], reminder)}"
    )


def handoff_key(rid: str, reminder: bool) -> str:
    """Unique per order and handoff kind; lets a retry find a post whose marker write was lost (crash after post)."""
    return f"intake-review:{rid}:{'reminder' if reminder else 'first'}"


def already_posted(key: str) -> bool | None:
    """True if the board already holds an entry with this key, False if not, None if the search failed (fail closed)."""
    try:
        result = subprocess.run([AGENT_BOARD, "search", "--json", key],
                                text=True, capture_output=True, timeout=60, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    start = result.stdout.find("[")
    if start < 0:
        return False if "No matches" in result.stdout else None
    try:
        entries = json.loads(result.stdout[start:])
    except ValueError:
        return None
    return any(isinstance(e, dict) and str(e.get("thread_id")) == str(BOARD_THREAD)
               and f"Key: {key}" in str(e.get("body") or "") for e in entries)


def ensure_posted(row: dict, reminder: bool) -> str:
    """Post the handoff once: search for its key first, so a lost marker never causes a duplicate.

    Returns 'posted', 'recovered' (found on the board, not reposted) or 'failed' (retry next pass)."""
    found = already_posted(handoff_key(row["id"], reminder))
    if found is None:
        return "failed"
    if found:
        return "recovered"
    return "posted" if post_board(handoff_text(row, reminder)) else "failed"


def post_board(text: str) -> bool:
    """True only when agent-board exits 0 and prints 'Posted entry'."""
    try:
        result = subprocess.run([AGENT_BOARD, "post", BOARD_THREAD, "--kind", "handoff", text],
                                text=True, capture_output=True, timeout=60, check=False)
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0 and "Posted entry" in result.stdout


def cmd_watch(_args, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    rows = awaiting_rows()
    failed = 0
    for row in rows:
        rid = row["id"]
        marker = read_marker(rid)
        if marker is None:
            outcome = ensure_posted(row, reminder=False)
            if outcome != "failed":
                write_marker(rid, {"posted_at": now.isoformat(timespec="seconds"), "reminded_at": None,
                                   **({"recovered": True} if outcome == "recovered" else {})})
                print(f"handoff {outcome} for {rid[:8]}")
            else:
                failed += 1
                print(f"handoff for {rid[:8]} NOT posted; will retry next pass", file=sys.stderr)
            continue
        if marker.get("reminded_at"):
            continue
        try:
            posted = datetime.fromisoformat(str(marker.get("posted_at")))
        except ValueError:
            continue
        if posted.tzinfo is None:
            posted = posted.replace(tzinfo=timezone.utc)
        if now - posted >= timedelta(hours=REMINDER_AFTER_HOURS):
            outcome = ensure_posted(row, reminder=True)
            if outcome != "failed":
                write_marker(rid, {**marker, "reminded_at": now.isoformat(timespec="seconds")})
                print(f"reminder {outcome} for {rid[:8]}")
            else:
                failed += 1
                print(f"reminder for {rid[:8]} NOT posted; will retry next pass", file=sys.stderr)
    if not rows:
        print("no requests awaiting review")
    return 1 if failed else 0


def agent(value: str) -> str:
    if not AGENT_RE.match(value):
        raise argparse.ArgumentTypeError("--by must be an agent name (letters, digits, . _ -)")
    return value


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list").set_defaults(func=cmd_list)
    p = sub.add_parser("approve"); p.add_argument("id"); p.add_argument("--by", required=True, type=agent)
    p.add_argument("--mail", action="store_true", help="mail the customer the fixed-template pay link"); p.set_defaults(func=cmd_approve)
    sub.add_parser("watch").set_defaults(func=cmd_watch)
    p = sub.add_parser("decline"); p.add_argument("id"); p.add_argument("--by", required=True, type=agent)
    p.add_argument("--reason", required=True)
    p.add_argument("--code", choices=sorted(DECLINE_REASONS), help="decline reason code (picks the customer paragraph)")
    p.add_argument("--mail", action="store_true", help="mail the customer the fixed decline template"); p.set_defaults(func=cmd_decline)
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ReviewError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
