#!/usr/bin/env python3
"""Sandy-side bridge for benchmarkheaven.com/submit (CR-251). Run every 5 minutes by a user timer.

1. intake: queued submissions -> Harold's ADD-REQUESTS.md (+ add_requests_pending flag)
2. confirmation mail (approved template submission_confirmation_v1 only, through the shared mail tool)
3. API-key purge (terminal status or older than 30 days)
4. abandoned checkout (awaiting_payment > 48 h and the priority request is not paid -> withdrawn)
5. one routine digest line when rows were synced

Idempotent and flock-guarded. --dry-run changes nothing (no DB write, no file write, no digest); mails go through the
mail tool's own --dry-run gate check. Paths are overridable by environment variables for tests only.
"""
from __future__ import annotations

import argparse
import contextlib
import fcntl
import importlib.util
import io
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from submissions_lib import Db, DbError  # noqa: E402

HOME = Path(os.environ.get("HOME", "/home/flori"))
HERE = Path(__file__).resolve().parent
ADD_REQUESTS = Path(os.environ.get("BH_ADD_REQUESTS", "/home/flori/jobs/harold-answers-airesearch12-20260919/ADD-REQUESTS.md"))
WATCH_DB = Path(os.environ.get("BH_WATCH_DB", "/home/flori/jobs/jevbench-conversation-watch-20260919/state/watch.db"))
LOG = Path(os.environ.get("BH_BRIDGE_LOG", HOME / ".local/state/bh-submissions/bridge.log"))
LOCK = Path(os.environ.get("BH_BRIDGE_LOCK", HOME / ".locks/bh-submission-intake.lock"))
MAIL_TOOL = Path(os.environ.get("BH_MAIL_TOOL", HOME / ".claude/skills/email-access/mail_tool.py"))
MAIL_AUDIT = MAIL_TOOL.parent / "sent-audit.log"
MAIL_SECRET_FILE = Path(os.environ.get("BH_MAIL_SECRET_FILE", HOME / ".config/dev-secrets.env"))
NOTIFY = Path(os.environ.get("BH_NOTIFY", HOME / "bin/notify"))
TEMPLATE = HERE / "submission-confirmation-template.txt"

SECTION = "## From benchmarkheaven.com/submit"
TABLE_HEAD = "| Request | Source/date | Action | Link |\n|---|---|---|---|"
FILE_HEAD = "# JevBench add requests\n\n"
MAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,24}$")
MAX_MAILS_PER_RUN = 10
MAX_ATTEMPTS = 96
BENCH_LABEL = {"jevbench": "JevBench", "imagejevbench": "ImageJevBench", "audiojevbench": "AudioJevBench"}
TOP_N = 10


# ------------------------------------------------------------------------------------ logging
def log(event: str, **fields) -> None:
    """JSON lines; ids and counts only (never emails, keys or free text)."""
    try:
        LOG.parent.mkdir(parents=True, exist_ok=True)
        with LOG.open("a") as fh:
            fh.write(json.dumps({"ts": datetime.now(timezone.utc).isoformat(timespec="seconds"), "event": event, **fields}) + "\n")
    except OSError:
        pass


# ------------------------------------------------------------------------------------ text helpers
def cell(value, limit: int) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip().replace("|", "/")
    return text[: limit - 1] + "…" if len(text) > limit else text


def benchmarks_label(row) -> str:
    return ", ".join(BENCH_LABEL.get(b, cell(b, 40)) for b in (row.get("benchmarks") or [])) or "unspecified"


def contact_label(row) -> str:
    parts = []
    if row.get("contact_email"):
        parts.append(cell(row["contact_email"], 120))
    if row.get("contact_x"):
        handle = cell(row["contact_x"], 60)
        parts.append(handle if handle.startswith("@") else "@" + handle)
    return " ".join(parts) or "no contact given"


def intake_line(row) -> str:
    marker = f"bh-submit:{row['id']}"
    ref = row["id"][:8]
    req = [f"**{cell(row.get('model_name'), 120) or 'Unnamed model'}**", f"benchmarks: {benchmarks_label(row)}"]
    if row.get("followup_name"):
        rank = f" (#{row['followup_rank']} on {BENCH_LABEL.get(row.get('followup_benchmark'), cell(row.get('followup_benchmark'), 40))})" \
            if row.get("followup_rank") else ""
        req.append(f"follow-up of {cell(row['followup_name'], 100)}{rank}")
    if row.get("fast_lane"):
        req.append(f"FAST LANE — paid, owned by the priority worker (request {row.get('priority_request_id') or 'pending'})")
    if row.get("api_key_present") and not row.get("api_key_deleted_at"):
        req.append(f"API key on file (encrypted; `bh-submission key-export {ref}`)")
    if row.get("description"):
        req.append(f"submitter note (untrusted text): {cell(row['description'], 300)}")
    source = f"benchmarkheaven.com/submit {cell(row.get('queued_at') or row.get('created_at'), 10)} ({marker}; ref {ref}); contact {contact_label(row)}"
    action = "Resolve/recheck reachability, then measure if reachable; regular queue unless FAST LANE."
    links = " ".join(cell(row.get(k), 300) for k in ("github_url", "huggingface_url", "api_url") if row.get(k))
    return f"| {'; '.join(req)} | {source} | {action} | {links or '-'} |"


def append_row(path: Path, marker: str, line: str) -> bool:
    """Append `line` inside the submit section (created on first use). False if the marker is already present."""
    lock = path.with_name(path.name + ".bh-submit.lock")
    path.parent.mkdir(parents=True, exist_ok=True)
    with lock.open("a") as lock_fh:
        fcntl.flock(lock_fh, fcntl.LOCK_EX)
        text = path.read_text() if path.exists() else ""
        if marker in text:
            return False
        if SECTION not in text:
            prefix = "" if not text else ("" if text.endswith("\n\n") else ("\n" if text.endswith("\n") else "\n\n"))
            block = (FILE_HEAD if not text else "") + f"{SECTION}\n\n{TABLE_HEAD}\n{line}\n"
            with path.open("a") as fh:
                fh.write(prefix + block)
            return True
        # Insert after the last table line of our own section so later sections stay intact.
        lines = text.split("\n")
        start = next(i for i, l in enumerate(lines) if l.strip() == SECTION)
        end = len(lines)
        for i in range(start + 1, len(lines)):
            if lines[i].startswith("## "):
                end = i
                break
        last = start
        for i in range(start + 1, end):
            if lines[i].startswith("|"):
                last = i
        lines.insert(last + 1, line)
        tmp = path.with_name(path.name + ".bh-submit.tmp")
        tmp.write_text("\n".join(lines))
        os.replace(tmp, path)
        return True


def bump_pending_flag() -> bool:
    if not WATCH_DB.exists():
        return False
    try:
        c = sqlite3.connect(WATCH_DB, timeout=10)
        old = c.execute("SELECT value FROM flags WHERE key='add_requests_pending'").fetchone()
        value = int(old[0]) + 1 if old else 1
        c.execute("INSERT INTO flags(key,value) VALUES('add_requests_pending',?) "
                  "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(value),))
        c.commit()
        c.close()
        return True
    except (sqlite3.Error, ValueError):
        log("watch_flag_failed")
        return False


# ------------------------------------------------------------------------------------ mail
def gmail_app_password() -> str:
    """Same retrieval as ops/priority-evaluation/autopickup.py: environment first, then the private secret file."""
    value = os.environ.get("GMAIL_APP_PASSWORD", "").strip()
    if value:
        return value
    import shlex
    info = MAIL_SECRET_FILE.stat()
    if info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise RuntimeError("credential file permissions are not private")
    for raw in MAIL_SECRET_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("export "):
            line = line[7:].lstrip()
        if line.startswith("GMAIL_APP_PASSWORD="):
            parts = shlex.split(line.split("=", 1)[1], posix=True)
            if parts and parts[0].strip():
                return parts[0].strip()
    raise RuntimeError("credential is unavailable")


def send_mail(to: str, subject: str, body: str, dry_run: bool) -> tuple[bool, str]:
    """Shared mail tool loaded in-process (recipient and body never reach a command line)."""
    if not MAIL_RE.fullmatch(to or ""):
        return False, "invalid_recipient"
    spec = importlib.util.spec_from_file_location("bh_submit_mail_tool", MAIL_TOOL)
    if spec is None or spec.loader is None:
        return False, "mail_tool_unavailable"
    overrides = {"MAIL_APPROVED_BY_FLORIAN": "1", "MAIL_WEEKEND_OK": "1", "MAIL_DOMAIN_COOLDOWN_HOURS": "1"}
    saved = {k: os.environ.get(k) for k in (*overrides, "GMAIL_APP_PASSWORD", "AGENT_VENTURE")}
    out, err = io.StringIO(), io.StringIO()
    try:
        if not dry_run:
            overrides["GMAIL_APP_PASSWORD"] = gmail_app_password()
        os.environ.update(overrides)
        os.environ.pop("AGENT_VENTURE", None)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        import argparse as ap
        args = ap.Namespace(account="gmail", to=to, subject=subject, body=body, body_file=None, cc=None,
                            dry_run=dry_run, fastlane_outbox_id=None, attach=None)
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            module.cmd_send(args)
    except SystemExit:
        return False, "gate_refused"
    except Exception as exc:  # never include the message: it may contain addresses
        return False, type(exc).__name__
    finally:
        for key, value in saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
    expected = "DRY RUN" if dry_run else "sent from"
    return (expected in out.getvalue()), ("ok" if expected in out.getvalue() else "mail_tool_output")


def recently_mailed(address: str, hours: int = 24) -> bool:
    """The mail tool's own audit log (any job) says this address got mail in the last `hours`."""
    try:
        cutoff = time.time() - hours * 3600
        for line in MAIL_AUDIT.read_text(encoding="utf-8").splitlines()[-5000:]:
            fields = line.split("\t")
            if len(fields) >= 4 and fields[3].strip().lower() == address.lower() and float(fields[0]) >= cutoff:
                return True
    except (OSError, ValueError):
        pass
    return False


def render_confirmation(row, position: int) -> tuple[str, str]:
    raw = TEMPLATE.read_text(encoding="utf-8")
    subject_line, _, body = raw.partition("\n")
    note = ""
    rank = row.get("followup_rank")
    if isinstance(rank, int) and rank > TOP_N:
        note = (f"\nHeads-up: the earlier version is ranked #{rank}, outside the top 10 on the composite score. "
                "We re-evaluate the top 10 with every release and the rest of the leaderboard on a slower schedule, "
                "so the new version may take a while. We apologise — otherwise we couldn't keep up with the number of "
                "submissions and our short release cycles.\n")
    values = {"MODEL": re.sub(r"\s+", " ", row.get("model_name") or "your model").strip()[:120],
              "REFERENCE": row["id"][:8], "BENCHMARKS": benchmarks_label(row), "POSITION": str(position),
              "FOLLOWUP_NOTE": note}
    def fill(text):
        return re.sub(r"\{\{([A-Z_]+)\}\}", lambda m: values[m.group(1)], text)
    subject = fill(subject_line).removeprefix("Subject:").strip()
    return subject, fill(body.lstrip("\n"))


# ------------------------------------------------------------------------------------ steps
def step_intake(db: Db, dry: bool, counts: dict) -> list[dict]:
    rows = db.rows("""SELECT id::text, model_name, github_url, huggingface_url, api_url, description, contact_email, contact_x,
        benchmarks, followup_benchmark, followup_name, followup_rank, api_key_present, api_key_deleted_at, fast_lane,
        priority_request_id::text, queued_at::text, created_at::text FROM bh_model_submissions
        WHERE status='queued' AND intake_synced_at IS NULL ORDER BY queued_at, created_at""")
    synced = []
    for row in rows:
        if dry:
            counts["intake_would_sync"] += 1
            continue
        changed = append_row(ADD_REQUESTS, f"bh-submit:{row['id']}", intake_line(row))
        if changed:
            bump_pending_flag()
        db.execute("UPDATE bh_model_submissions SET intake_synced_at=now(), updated_at=now() WHERE id=(:'id')::uuid", id=row["id"])
        counts["intake_synced"] += 1
        synced.append(row)
        log("intake", id=row["id"], appended=changed, fast_lane=bool(row.get("fast_lane")))
    return synced


def step_confirmations(db: Db, dry: bool, counts: dict) -> None:
    # Fast-lane rows: the priority worker sends the paid confirmation.
    if not dry:
        db.execute("UPDATE bh_model_submissions SET confirmation_status='skipped', updated_at=now() "
                   "WHERE status='queued' AND fast_lane AND confirmation_status='pending'")
    else:
        counts["confirm_fast_lane_would_skip"] = len(db.rows(
            "SELECT 1 FROM bh_model_submissions WHERE status='queued' AND fast_lane AND confirmation_status='pending'"))
    rows = db.rows("""SELECT s.id::text, s.model_name, s.contact_email, s.benchmarks, s.followup_rank, s.confirmation_attempts,
        (SELECT count(*) + 1 FROM bh_model_submissions o WHERE o.status='queued' AND NOT o.fast_lane
           AND (o.queued_at, o.id) < (s.queued_at, s.id)) AS position,
        EXISTS (SELECT 1 FROM bh_model_submissions o WHERE lower(o.contact_email)=lower(s.contact_email) AND o.id<>s.id
           AND o.confirmation_status='sent' AND o.updated_at > now() - interval '24 hours') AS mailed_recently
        FROM bh_model_submissions s
        WHERE s.status='queued' AND NOT s.fast_lane AND s.confirmation_status='pending'
        ORDER BY s.queued_at, s.id""")
    attempted, blocked_domains, mailed = 0, set(), set()
    for row in rows:
        address = (row.get("contact_email") or "").strip()
        domain = address.rsplit("@", 1)[-1].lower()
        if not MAIL_RE.fullmatch(address):
            if not dry:
                db.execute("UPDATE bh_model_submissions SET confirmation_status='failed', updated_at=now() WHERE id=(:'id')::uuid", id=row["id"])
            counts["confirm_failed"] += 1
            continue
        if row["mailed_recently"] or address.lower() in mailed or recently_mailed(address):
            if not dry:
                db.execute("UPDATE bh_model_submissions SET confirmation_status='skipped', updated_at=now() WHERE id=(:'id')::uuid", id=row["id"])
            counts["confirm_skipped"] += 1
            log("confirmation", id=row["id"], result="skipped_recent")
            continue
        if attempted >= MAX_MAILS_PER_RUN or domain in blocked_domains:
            continue
        attempted += 1
        subject, body = render_confirmation(row, int(row["position"]))
        ok, reason = send_mail(address, subject, body, dry)
        if ok:
            mailed.add(address.lower())
            counts["confirm_dry_ok" if dry else "confirm_sent"] += 1
            if not dry:
                db.execute("UPDATE bh_model_submissions SET confirmation_status='sent', updated_at=now() WHERE id=(:'id')::uuid", id=row["id"])
            log("confirmation", id=row["id"], result="dry_run_ok" if dry else "sent")
            continue
        blocked_domains.add(domain)
        attempts = int(row.get("confirmation_attempts") or 0) + 1
        final = attempts >= MAX_ATTEMPTS
        counts["confirm_failed" if final else "confirm_deferred"] += 1
        if not dry:
            db.execute("UPDATE bh_model_submissions SET confirmation_attempts=:'n'::int, "
                       "confirmation_status=CASE WHEN :'final'='t' THEN 'failed' ELSE confirmation_status END, updated_at=now() "
                       "WHERE id=(:'id')::uuid", id=row["id"], n=attempts, final="t" if final else "f")
        log("confirmation", id=row["id"], result="failed" if final else "deferred", reason=reason, attempts=attempts)


def step_purge(db: Db, dry: bool, counts: dict) -> None:
    where = ("api_key_ciphertext IS NOT NULL AND (status IN ('evaluated','rejected','spam','withdrawn') "
             "OR created_at < now() - interval '30 days')")
    if dry:
        counts["keys_would_purge"] = len(db.rows(f"SELECT 1 FROM bh_model_submissions WHERE {where}"))
        return
    found = db.rows(f"SELECT id::text FROM bh_model_submissions WHERE {where}")
    if found:
        db.execute(f"UPDATE bh_model_submissions SET api_key_ciphertext=NULL, api_key_deleted_at=now(), updated_at=now() WHERE {where}")
    counts["keys_purged"] = len(found)
    for r in found:
        log("key_purged", id=r["id"])


def step_abandoned(db: Db, dry: bool, counts: dict) -> None:
    where = ("s.status='awaiting_payment' AND s.created_at < now() - interval '48 hours' AND NOT EXISTS ("
             "SELECT 1 FROM bh_priority_evaluation_requests p WHERE p.id=s.priority_request_id AND p.paid_at IS NOT NULL)")
    found = db.rows(f"SELECT s.id::text FROM bh_model_submissions s WHERE {where}")
    counts["abandoned" if not dry else "abandoned_would_withdraw"] = len(found)
    if dry or not found:
        return
    db.execute(f"UPDATE bh_model_submissions s SET status='withdrawn', updated_at=now() WHERE {where}")
    for r in found:
        log("abandoned_checkout", id=r["id"])


def step_digest(db: Db, synced: list[dict], dry: bool) -> None:
    if dry or not synced:
        return
    queue = db.scalar("SELECT count(*) FROM bh_model_submissions WHERE status='queued'")
    names = ", ".join(cell(r.get("model_name"), 60) for r in synced[:8]) + (" …" if len(synced) > 8 else "")
    text = f"{len(synced)} new model submission(s) via /submit: {names}; queue length {queue}"
    result = subprocess.run([str(NOTIFY), "digest", "bh-submissions", text], capture_output=True, text=True, timeout=60, check=False)
    log("digest", count=len(synced), ok=result.returncode == 0)


# ------------------------------------------------------------------------------------ main
def run(db: Db, dry: bool) -> dict:
    counts = {k: 0 for k in ("intake_synced", "intake_would_sync", "confirm_sent", "confirm_dry_ok", "confirm_skipped",
                             "confirm_failed", "confirm_deferred", "keys_purged", "abandoned")}
    synced = step_intake(db, dry, counts)
    step_confirmations(db, dry, counts)
    step_purge(db, dry, counts)
    step_abandoned(db, dry, counts)
    step_digest(db, synced, dry)
    log("run", dry_run=dry, **{k: v for k, v in counts.items() if v})
    return counts


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="change nothing; mail goes through the mail tool's dry-run gate")
    parser.add_argument("--db", help="libpq connection string (tests only); default is the fixed local peer connection")
    args = parser.parse_args(argv)
    LOCK.parent.mkdir(parents=True, exist_ok=True)
    with LOCK.open("w") as lock_fh:
        try:
            fcntl.flock(lock_fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            print(json.dumps({"skipped": "another run holds the lock"}))
            return 0
        try:
            counts = run(Db(args.db), args.dry_run)
        except DbError as exc:
            log("db_error", error=str(exc)[:120])
            print(json.dumps({"error": "database unavailable", "detail": str(exc)[:120]}), file=sys.stderr)
            return 1
    print(json.dumps({"dry_run": args.dry_run, **{k: v for k, v in counts.items() if v}}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
