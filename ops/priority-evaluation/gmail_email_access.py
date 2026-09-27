#!/usr/bin/env python3
"""Send the allowlisted Benchmark Heaven transactional templates through Gmail SMTP."""

import argparse
import json
import os
import re
import shlex
import smtplib
import stat
import sys
from email.message import EmailMessage
from email.utils import formatdate
from pathlib import Path

ALLOWED_TEMPLATES = {"payment_confirmation_v1", "review_passed_v1", "result_delivered_v1", "refusal_notice_v1"}
EMAIL_RE = re.compile(r"^[^\s@<>]{1,64}@[^\s@<>.](?:[^\s@<>]*[^\s@<>.])?(?:\.[^\s@<>.](?:[^\s@<>]*[^\s@<>.])?)+$")
SECRET_FILE = Path.home() / ".config/dev-secrets.env"
SENDER = "Benchmark Heaven <florian.standhartinger@gmail.com>"


class MailError(Exception):
    pass


def app_password() -> str:
    env_value = os.environ.get("GMAIL_APP_PASSWORD", "").strip()
    if env_value:
        return env_value
    try:
        info = SECRET_FILE.stat()
        if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
            raise MailError("Gmail credential file is not private")
        for raw in SECRET_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("export "):
                line = line[7:].lstrip()
            if not line.startswith("GMAIL_APP_PASSWORD="):
                continue
            pieces = shlex.split(line.split("=", 1)[1], posix=True)
            password = pieces[0].strip() if pieces else ""
            if password:
                return password
    except OSError as exc:
        raise MailError("Gmail credential is unavailable") from exc
    raise MailError("Gmail credential is unavailable")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("send", choices=("send",))
    parser.add_argument("--template", required=True)
    parser.add_argument("--request-id", required=True)
    parser.add_argument("--to", required=True)
    parser.add_argument("--subject", required=True)
    args = parser.parse_args()

    if args.template not in ALLOWED_TEMPLATES:
        raise MailError("email template is not allowlisted")
    if args.template == "payment_confirmation_v1" and (
        os.environ.get("MAIL_APPROVED_BY_FLORIAN") != "1" or os.environ.get("MAIL_WEEKEND_OK") != "1"
    ):
        raise MailError("the approved transactional-mail flags are missing")
    if args.template == "refusal_notice_v1" and os.environ.get("MAIL_APPROVED_BY_FLORIAN") != "1":
        raise MailError("this refusal email requires its exact one-tap approval")
    if not EMAIL_RE.fullmatch(args.to) or len(args.subject) > 180 or "\n" in args.subject or "\r" in args.subject:
        raise MailError("invalid mail recipient or subject")
    if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", args.request_id, re.I):
        raise MailError("invalid request reference")
    body = sys.stdin.read(20_001)
    if not body.strip() or len(body) > 20_000:
        raise MailError("empty or oversized email body")

    message = EmailMessage()
    message["From"] = SENDER
    message["To"] = args.to
    message["Subject"] = args.subject
    message["Date"] = formatdate(localtime=False)
    message["Message-ID"] = f"<fastlane-{args.request_id}-{args.template}@benchmarkheaven.com>"
    message.set_content(body)

    password = app_password()
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=25) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login("florian.standhartinger@gmail.com", password)
        refused = smtp.send_message(message)
    if refused:
        raise MailError("Gmail SMTP refused the recipient")
    print(json.dumps({"status": "sent", "template": args.template, "message_id": message["Message-ID"]}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (MailError, smtplib.SMTPException, OSError) as exc:
        print(f"gmail-email-access: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
