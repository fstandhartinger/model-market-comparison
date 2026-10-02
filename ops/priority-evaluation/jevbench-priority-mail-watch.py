#!/usr/bin/env python3
"""Read-only Gmail IMAP watcher for replies to open fast-lane requests."""

import email
import email.header
import email.policy
import email.utils
import imaplib
import json
import os
import re
import shlex
import stat
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

HOME = Path.home()
TABLE = "bh_priority_evaluation_requests"
EVENTS = "bh_priority_eval_customer_mail_events"
SECRET_FILE = HOME / ".config/dev-secrets.env"
ACCOUNT = "florian.standhartinger@gmail.com"
EMAIL_RE = re.compile(r"^[^\s@<>]{1,64}@[A-Za-z0-9.-]{1,190}$")


class MailWatchError(Exception):
    pass


def sql(statement: str) -> str:
    result = subprocess.run(
        # Statement on stdin, never argv: it can carry customer text (visible in ps otherwise).
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", "benchmarkheaven_accounts", "-f", "-"],
        input=statement, text=True, capture_output=True, timeout=20,
    )
    if result.returncode:
        raise MailWatchError("database operation failed")
    return result.stdout.strip()


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def request_uuid(value: object) -> str:
    result = str(value)
    if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", result, re.I):
        raise MailWatchError("database returned an invalid request ID")
    return result


def app_password() -> str:
    value = os.environ.get("GMAIL_APP_PASSWORD", "").strip()
    if value:
        return value
    try:
        info = SECRET_FILE.stat()
        if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
            raise MailWatchError("Gmail credential file is not private")
        for raw in SECRET_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("export "):
                line = line[7:].lstrip()
            if not line.startswith("GMAIL_APP_PASSWORD="):
                continue
            parts = shlex.split(line.split("=", 1)[1], posix=True)
            if parts and parts[0].strip():
                return parts[0].strip()
    except OSError as exc:
        raise MailWatchError("Gmail credential is unavailable") from exc
    raise MailWatchError("Gmail credential is unavailable")


def decode_header(raw: str | None) -> str:
    if not raw:
        return ""
    chunks = []
    for part, encoding in email.header.decode_header(raw):
        if isinstance(part, bytes):
            try:
                chunks.append(part.decode(encoding or "utf-8", errors="replace"))
            except LookupError:
                chunks.append(part.decode("utf-8", errors="replace"))
        else:
            chunks.append(part)
    return "".join(chunks).strip()


def plain_body(message: email.message.Message) -> tuple[str, bool]:
    parts = message.walk() if message.is_multipart() else (message,)
    texts = []
    for part in parts:
        if part.get_content_disposition() == "attachment":
            continue
        if part.get_content_type() != "text/plain":
            continue
        payload = part.get_payload(decode=True)
        if not isinstance(payload, bytes):
            continue
        charset = part.get_content_charset() or "utf-8"
        try:
            texts.append(payload.decode(charset, errors="replace"))
        except LookupError:
            texts.append(payload.decode("utf-8", errors="replace"))
    text = "\n\n".join(texts).replace("\r", "").strip()
    lines = []
    for line in text.splitlines():
        if line.lstrip().startswith(">") or re.match(r"^On .+wrote:$", line.strip(), re.I):
            break
        lines.append(line.rstrip())
    trimmed = "\n".join(lines).strip()
    if not trimmed:
        trimmed = "(No plain-text message body was available.)"
    return trimmed[:200_000], len(trimmed) > 200_000


CREDENTIAL_RE = re.compile(
    r"(api[_ -]?key|secret|token|bearer|passw|\bpw\b|\bpwd\b|\bpass\b|login|cred|authori[sz]ation|\bsk-|\bkey\b"
    r"|[A-Za-z0-9+/=._\-]{24,})", re.I)
ACCESS_SUMMARY = ("Customer access reply received (may contain credentials). Content withheld; private 0600 copy "
                  "only. Agent-owned access reconciliation: route through private host-only key intake.")
# Default-withhold: customer free text never leaves the private copy. CREDENTIAL_RE is only a routing hint
# (access reply vs. other reply), not a claim of complete secret detection.
REPLY_SUMMARY = "Customer reply received. Content withheld; private 0600 copy only."
WITHHELD_SUBJECT = "(withheld)"
FIXED_SUMMARIES = (ACCESS_SUMMARY, REPLY_SUMMARY)


def is_access_reply(body: str, subject: str) -> bool:
    return bool(CREDENTIAL_RE.search(body) or CREDENTIAL_RE.search(subject))


def is_access_event(event: dict) -> bool:
    """Rows written before this fix may hold a raw excerpt; any non-fixed summary is treated as access."""
    return event["summary"] != REPLY_SUMMARY


def safe_summary(body: str, subject: str) -> str:
    """Fixed factual text only; never a body or subject excerpt."""
    return ACCESS_SUMMARY if is_access_reply(body, subject) else REPLY_SUMMARY


def sanitize_legacy_event(event: dict) -> dict:
    """Rewrite a pre-fix row's stored summary/subject to fixed text before any delivery uses it."""
    if event["summary"] in FIXED_SUMMARIES and event.get("subject") == WITHHELD_SUBJECT:
        return event
    summary = event["summary"] if event["summary"] in FIXED_SUMMARIES else ACCESS_SUMMARY
    sql(f"UPDATE {EVENTS} SET summary={literal(summary)}, subject={literal(WITHHELD_SUBJECT)} "
        f"WHERE gmail_message_id={literal(event['gmail_message_id'])}")
    return {**event, "summary": summary, "subject": WITHHELD_SUBJECT}


def scrub_legacy_rows() -> None:
    """Scrub pre-fix summaries/subjects in every row, including 'sent' and 'sending' ones that delivery never
    revisits. Content is never read back; delivery status columns are left untouched."""
    fixed = ", ".join(literal(text) for text in FIXED_SUMMARIES)
    sql(f"UPDATE {EVENTS} SET summary=CASE WHEN summary IN ({fixed}) THEN summary ELSE {literal(ACCESS_SUMMARY)} END, "
        f"subject={literal(WITHHELD_SUBJECT)} "
        f"WHERE summary NOT IN ({fixed}) OR subject IS DISTINCT FROM {literal(WITHHELD_SUBJECT)}")


def run_delivery(argv: list[str], **kwargs) -> int | None:
    """Return the exit code, or None when the outcome is unknown (timeout: the message may have gone out)."""
    try:
        return subprocess.run(argv, text=True, capture_output=True, **kwargs).returncode
    except subprocess.TimeoutExpired:
        return None


def record_delivery(gmail_message_id: str, column: str, returncode: int | None) -> bool:
    """sent on success, failed (retried) on a clean failure; unknown outcomes stay 'sending' so they are
    never retried into a duplicate nor reported as sent (stale_sending() surfaces them)."""
    if returncode is None:
        return False
    status = "sent" if returncode == 0 else "failed"
    stamp = ", notified_at=now()" if column == "notification_status" and returncode == 0 else ""
    sql(f"UPDATE {EVENTS} SET {column}={literal(status)}{stamp} WHERE gmail_message_id={literal(gmail_message_id)}")
    return returncode == 0


def stale_sending() -> int:
    """Count of events whose delivery outcome is unknown; reported by count only, no content."""
    output = sql(f"SELECT count(*) FROM {EVENTS} WHERE notification_status='sending' OR board_status='sending'")
    return int(output or 0)


def event_value(fetch_items: list, key: str) -> str | None:
    pattern = re.compile(rb"\b" + re.escape(key.encode("ascii")) + rb"\s+(?:\"([^\"]+)\"|(\S+))", re.I)
    for item in fetch_items:
        if not isinstance(item, tuple) or len(item) < 2 or not isinstance(item[0], bytes):
            continue
        match = pattern.search(item[0])
        if match:
            return (match.group(1) or match.group(2)).decode("ascii", errors="ignore")
    return None


def fetch_metadata(client: imaplib.IMAP4_SSL, uid: bytes) -> dict | None:
    status, parts = client.uid("fetch", uid, "(X-GM-MSGID X-GM-THRID INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER])")
    if status != "OK" or not isinstance(parts, list):
        return None
    gm_id = event_value(parts, "X-GM-MSGID")
    thread_id = event_value(parts, "X-GM-THRID")
    internal = event_value(parts, "INTERNALDATE")
    size_text = event_value(parts, "RFC822.SIZE")
    header = next((item[1] for item in parts if isinstance(item, tuple) and len(item) > 1 and isinstance(item[1], bytes)), b"")
    message = email.message_from_bytes(header, policy=email.policy.default)
    sender = email.utils.parseaddr(decode_header(message.get("From")))[1].strip().lower()
    subject = decode_header(message.get("Subject"))
    if not sender or not EMAIL_RE.fullmatch(sender) or not gm_id:
        return None
    received_at = None
    if internal:
        try:
            received_at = email.utils.parsedate_to_datetime(internal if isinstance(internal, str) else internal.decode("ascii"))
        except (ValueError, TypeError, UnicodeDecodeError):
            received_at = None
    if received_at is None:
        received_at = email.utils.parsedate_to_datetime(message.get("Date")) if message.get("Date") else None
    if received_at is None:
        return None
    if received_at.tzinfo is None:
        received_at = received_at.replace(tzinfo=timezone.utc)
    try:
        size = int(size_text or "0")
    except ValueError:
        size = 0
    return {
        "gmail_message_id": gm_id,
        "gmail_thread_id": thread_id,
        "uid": uid,
        "sender_email": sender,
        "subject": subject[:180],
        "received_at": received_at.astimezone(timezone.utc),
        "header": header,
        "size": size,
    }


def fetch_body(client: imaplib.IMAP4_SSL, uid: bytes, header: bytes, size: int) -> tuple[str, bool]:
    # Pull at most 256 KB per message, with BODY.PEEK to keep the mailbox unchanged.
    request = "(BODY.PEEK[TEXT]<0.262144>)" if size > 262_144 else "(BODY.PEEK[TEXT])"
    status, parts = client.uid("fetch", uid, request)
    if status != "OK" or not isinstance(parts, list):
        return "(Message body could not be read; open the Gmail thread.)", False
    body = next((item[1] for item in parts if isinstance(item, tuple) and len(item) > 1 and isinstance(item[1], bytes)), b"")
    raw = header + b"\r\n" + body
    parsed = email.message_from_bytes(raw, policy=email.policy.default)
    text, was_long = plain_body(parsed)
    return text, was_long or size > 262_144


def read_open_requests() -> list[dict]:
    output = sql(f"""
      SELECT COALESCE(json_agg(row_data ORDER BY paid_at), '[]') FROM (
        SELECT json_build_object(
          'id',id::text,'email',lower(email),'model_name',model_name,'benchmarks',benchmarks,
          'paid_at',paid_at,'created_at',created_at,'pickup_job_dir',pickup_job_dir,
          'pickup_owner',pickup_owner,'access_type',access_type,'model_link',model_link,
          'code_link',code_link,'access_instructions',access_instructions,'notes',notes,
          'visibility',visibility,'amount_total',amount_total,'base_amount',base_amount,
          'stripe_mode',stripe_mode,'review_basis',review_basis,'synthetic_test',synthetic_test
          ,'mail_last_checked_at',mail_last_checked_at
        ) AS row_data, paid_at
        FROM {TABLE}
        WHERE status IN ('paid','review_passed','refund_due','refund_pending')
          AND result_delivered_at IS NULL AND payment_intent_id IS NOT NULL
      ) open_fastlane
    """)
    try:
        rows = json.loads(output or "[]")
    except json.JSONDecodeError as exc:
        raise MailWatchError("database returned invalid open-request data") from exc
    return rows if isinstance(rows, list) else []


def find_candidates(client: imaplib.IMAP4_SSL, requests: list[dict]) -> list[tuple[dict, dict, str, bool]]:
    status, _ = client.select('"[Gmail]/All Mail"', readonly=True)
    if status != "OK":
        raise MailWatchError("Gmail All Mail folder is unavailable in read-only mode")
    by_sender: dict[str, list[dict]] = {}
    for row in requests:
        address = str(row.get("email", "")).lower()
        if EMAIL_RE.fullmatch(address):
            by_sender.setdefault(address, []).append(row)
    found: list[tuple[dict, dict, str, bool]] = []
    seen_ids: set[str] = set()
    for sender, rows in by_sender.items():
        timestamps = [datetime.fromisoformat(str(row["paid_at"]).replace("Z", "+00:00")) for row in rows if row.get("paid_at")]
        if not timestamps:
            continue
        start = min(timestamps).astimezone(timezone.utc)
        since = start.strftime("%d-%b-%Y")
        status, search_data = client.uid("search", None, "FROM", f'"{sender}"', "SINCE", since)
        if status != "OK" or not search_data or not search_data[0]:
            continue
        for uid in search_data[0].split():
            metadata = fetch_metadata(client, uid)
            if not metadata or metadata["gmail_message_id"] in seen_ids or metadata["sender_email"] != sender:
                continue
            seen_ids.add(metadata["gmail_message_id"])
            if metadata["received_at"] < start:
                continue
            matches = rows
            model_matches = [row for row in rows if str(row.get("model_name", "")).casefold() in metadata["subject"].casefold()]
            if model_matches:
                matches = model_matches
            elif len(rows) > 1:
                # Preserve attribution when one mailbox owns several active requests.
                body, was_long = fetch_body(client, metadata["uid"], metadata["header"], metadata["size"])
                body_models = [row for row in rows if str(row.get("model_name", "")).casefold() in body.casefold()]
                matches = body_models or rows[:1]
                for row in matches:
                    found.append((row, metadata, body, was_long))
                continue
            row = matches[0]
            paid_at = datetime.fromisoformat(str(row["paid_at"]).replace("Z", "+00:00")).astimezone(timezone.utc)
            if metadata["received_at"] < paid_at:
                continue
            body, was_long = fetch_body(client, metadata["uid"], metadata["header"], metadata["size"])
            found.append((row, metadata, body, was_long))
    return found


def ensure_request_folder(row: dict) -> tuple[Path, str]:
    request_id = request_uuid(row.get("id"))
    job_dir = Path(str(row.get("pickup_job_dir") or HOME / "jobs/fastlane-evaluations" / request_id)).resolve()
    expected = (HOME / "jobs/fastlane-evaluations" / request_id).resolve()
    if row.get("pickup_job_dir"):
        job_dir = Path(str(row["pickup_job_dir"])).resolve()
    if not job_dir.is_relative_to((HOME / "jobs").resolve()):
        raise MailWatchError("job folder path is outside the fast-lane job root")
    job_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(job_dir, 0o700)
    owner = str(row.get("pickup_owner") or "fastlane-eval-" + request_id[:8])
    if not re.fullmatch(r"[a-zA-Z0-9._:-]{3,80}", owner):
        raise MailWatchError("request has an invalid board owner")
    sql(
        f"UPDATE {TABLE} SET pickup_job_dir={literal(str(job_dir))},pickup_owner={literal(owner)},updated_at=now() "
        f"WHERE id='{request_id}'::uuid AND pickup_job_dir IS NULL"
    )
    return job_dir, owner


def save_event(row: dict, metadata: dict, body: str, truncated: bool) -> dict | None:
    request_id = request_uuid(row.get("id"))
    job_dir, owner = ensure_request_folder(row)
    inbox_dir = job_dir / "customer-mail"
    inbox_dir.mkdir(mode=0o700, exist_ok=True)
    os.chmod(inbox_dir, 0o700)
    gm_id = str(metadata["gmail_message_id"])
    safe_id = re.sub(r"[^0-9A-Za-z_-]", "", gm_id)
    if not safe_id:
        raise MailWatchError("Gmail returned an invalid message reference")
    body_path = inbox_dir / f"{safe_id}.txt"
    if not body_path.exists():
        stamp = metadata["received_at"].strftime("%Y-%m-%d %H:%M:%S UTC")
        excerpt_note = "\n\n[The received email was longer than the 256 KB read limit.]" if truncated else ""
        body_path.write_text(
            f"From: {metadata['sender_email']}\nSubject: {metadata['subject']}\nReceived: {stamp}\n"
            f"Gmail message ID: {gm_id}\nGmail thread ID: {metadata.get('gmail_thread_id') or ''}\n\n{body}{excerpt_note}\n",
            encoding="utf-8",
        )
        os.chmod(body_path, 0o600)
    summary = safe_summary(body, metadata["subject"])
    event_json = sql(f"""
      INSERT INTO {EVENTS}
        (gmail_message_id,gmail_thread_id,request_id,sender_email,subject,received_at,summary,body_file,notification_status,board_status)
      VALUES ({literal(gm_id)},{literal(str(metadata.get('gmail_thread_id') or ''))},{literal(request_id)}::uuid,
        {literal(metadata['sender_email'])},{literal(WITHHELD_SUBJECT)},
        {literal(metadata['received_at'].strftime('%Y-%m-%d %H:%M:%S+00'))}::timestamptz,
        {literal(summary)},{literal(str(body_path))},'pending','pending')
      ON CONFLICT (gmail_message_id) DO NOTHING
      RETURNING json_build_object('gmail_message_id',gmail_message_id,'request_id',request_id::text)::text
    """)
    if event_json:
        return {"id": gm_id, "request_id": request_id, "owner": owner, "job_dir": str(job_dir), "summary": summary, "body_file": str(body_path)}
    return None


def claim_event(gmail_message_id: str, column: str) -> bool:
    if column not in ("notification_status", "board_status"):
        raise MailWatchError("invalid mail event state")
    output = sql(f"""
      UPDATE {EVENTS} SET {column}='sending'
      WHERE gmail_message_id={literal(gmail_message_id)} AND {column} IN ('pending','failed')
      RETURNING gmail_message_id
    """)
    return bool(output)


def notify_florian(event: dict, row: dict, metadata: dict) -> bool:
    if is_access_event(event):
        # Agent-owned: the board entry routes it to the paid order's owner. Florian only gets a
        # fixed digest line (no sender, subject or body); status is 'sent' only on real delivery.
        code = run_delivery(
            [str(HOME / "bin/notify"), "digest", "fastlane-customer-mail",
             f"🤖 LÄUFT\nCustomer access reply recorded for paid order {event['request_id'][:8]}; "
             "agents reconcile it via private host-only intake."], timeout=45)
        return record_delivery(event["gmail_message_id"], "notification_status", code)
    model = str(row.get("model_name", "this evaluation"))
    received = metadata["received_at"].strftime("%Y-%m-%d %H:%M UTC")
    # No sender, subject or body excerpt: the private 0600 copy is the only place the content lives.
    message = (
        "🧑 DU BIST DRAN\n"
        f"New customer email for {model} on paid order {event['request_id'][:8]} ({received}).\n"
        f"🧑 Für dich\n- Review the author's reply\n  Why: It may affect the paid evaluation's publication or rerun.\n"
        f"  Steps:\n  1. Read the private copy {event['body_file']} on Sandy.\n"
        f"  2. Decide whether to rerun, publish, or keep the request on hold.\n  Time: 5 min"
    )
    env = dict(os.environ)
    env["NOTIFY_SOURCE"] = "fastlane-customer-mail"
    code = run_delivery([str(HOME / "bin/notify"), "now", "--text-stdin"], input=message, timeout=45, env=env)
    return record_delivery(event["gmail_message_id"], "notification_status", code)


def post_board(event: dict, row: dict, metadata: dict) -> bool:
    owner = event["owner"]
    summary = ACCESS_SUMMARY if is_access_event(event) else REPLY_SUMMARY
    kind = "access reply" if is_access_event(event) else "reply"
    body = (f"Customer {kind} recorded for paid request {event['request_id']}. {summary}\n"
            f"Private copy: {event['body_file']}\n")
    code = run_delivery(
        [str(HOME / "bin/agent-board"), "--as", "fastlane-pickup", "post", "9", "-", "--to", owner, "--kind", "question"],
        input=body, timeout=30)
    return record_delivery(event["gmail_message_id"], "board_status", code)


def pending_events() -> list[dict]:
    output = sql(f"""
      SELECT COALESCE(json_agg(row_data ORDER BY received_at), '[]') FROM (
        SELECT json_build_object('gmail_message_id',e.gmail_message_id,'request_id',e.request_id::text,
          'sender_email',e.sender_email,'subject',e.subject,'received_at',e.received_at,'summary',e.summary,
          'body_file',e.body_file,'notification_status',e.notification_status,'board_status',e.board_status,
          'owner',r.pickup_owner,'model_name',r.model_name,'email',r.email) AS row_data,
          e.received_at
        FROM {EVENTS} e JOIN {TABLE} r ON r.id=e.request_id
        WHERE e.notification_status IN ('pending','failed') OR e.board_status IN ('pending','failed')
      ) pending
    """)
    try:
        value = json.loads(output or "[]")
    except json.JSONDecodeError as exc:
        raise MailWatchError("database returned invalid pending mail data") from exc
    return value if isinstance(value, list) else []


def deliver_pending() -> int:
    count = 0
    scrub_legacy_rows()
    for event in pending_events():
        event = sanitize_legacy_event(event)
        metadata = {
            "sender_email": event["sender_email"], "subject": event["subject"],
            "received_at": datetime.fromisoformat(str(event["received_at"]).replace("Z", "+00:00")),
        }
        row = {"model_name": event.get("model_name")}
        if event.get("notification_status") in ("pending", "failed") and claim_event(event["gmail_message_id"], "notification_status"):
            notify_florian(event, row, metadata)
        if event.get("board_status") in ("pending", "failed") and claim_event(event["gmail_message_id"], "board_status"):
            post_board(event, row, metadata)
        count += 1
    unknown = stale_sending()
    if unknown:
        print(f"priority mail watcher: {unknown} event(s) with unknown delivery outcome stay 'sending'; "
              "reconcile manually (never auto-retried).", file=sys.stderr)
    return count


def mark_checked(rows: list[dict], checked_at: datetime) -> None:
    stamp = checked_at.strftime("%Y-%m-%d %H:%M:%S+00")
    for row in rows:
        request_id = request_uuid(row.get("id"))
        sql(f"UPDATE {TABLE} SET mail_last_checked_at={literal(stamp)}::timestamptz WHERE id='{request_id}'::uuid")


def cycle() -> int:
    rows = read_open_requests()
    if not rows:
        return deliver_pending()
    checked_at = datetime.now(timezone.utc)
    due_rows = []
    for row in rows:
        last = row.get("mail_last_checked_at")
        if not last:
            due_rows.append(row)
            continue
        previous = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
        if previous.tzinfo is None:
            previous = previous.replace(tzinfo=timezone.utc)
        if (checked_at - previous.astimezone(timezone.utc)).total_seconds() >= 14 * 60:
            due_rows.append(row)
    if not due_rows:
        return deliver_pending()
    password = app_password()
    with imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=25) as client:
        client.login(ACCOUNT, password)
        new = find_candidates(client, due_rows)
        for row, metadata, body, truncated in new:
            save_event(row, metadata, body, truncated)
    mark_checked(due_rows, checked_at)
    delivered = deliver_pending()
    print(f"Fast-lane mail watcher: checked {len(rows)} open request(s); queued/notified {delivered} new customer message(s).")
    return delivered


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] != "cycle":
        print("usage: jevbench-priority-mail-watch.py cycle", file=sys.stderr)
        return 2
    try:
        cycle()
        return 0
    except MailWatchError as exc:
        print(f"priority mail watcher: {exc}", file=sys.stderr)
        return 1
    except (imaplib.IMAP4.error, OSError, TimeoutError) as exc:
        print(f"priority mail watcher: {type(exc).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
