"""Append one exact late-result audit row from trusted transport evidence.

This component runs on the audit side of the service boundary. Callers must
authenticate the accepted envelope before supplying its canonical fields. All
writers and replacements of the sink must take the same canonical lock.
"""

import fcntl
import os
import re
import stat
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone


ORDER_ID = "cd7e038c-dcac-4990-9ca5-feac99cd8d8d"
ENVELOPE_ID = "1fe81855-8b6d-50f6-863f-f0760c2e48eb"
MESSAGE_ID = b"<fastlane-1fe81855-8b6d-50f6-863f-f0760c2e48eb@benchmarkheaven.com>"
MAX_ROW_BYTES = 4096
MAX_SCAN_BYTES = 8 * 1024 * 1024


class AuditHold(RuntimeError):
    """Audit state requires reconciliation before completion can be recorded."""


def _expected_row(accepted_at, recipient, subject):
    if not isinstance(accepted_at, datetime) or accepted_at.utcoffset() is None:
        raise AuditHold("missing authenticated acceptance time")
    if not isinstance(recipient, str) or not recipient or recipient != recipient.strip():
        raise AuditHold("invalid audit recipient")
    if any(char in recipient for char in "\0\t\r\n,;<> ") or recipient.count("@") != 1:
        raise AuditHold("invalid audit recipient")
    if not isinstance(subject, str) or not subject or any(char in subject for char in "\0\r"):
        raise AuditHold("invalid audit subject")
    stamp = accepted_at.astimezone(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds")
    subject = subject.replace("\t", " ").replace("\n", " ")
    row = f"{accepted_at.timestamp():.0f}\t{stamp}\tgmail\t{recipient.lower()}\t{subject}\t".encode("utf-8")
    row += MESSAGE_ID + b"\n"
    if len(row) > MAX_ROW_BYTES:
        raise AuditHold("audit row exceeds the write bound")
    return row


def _require_inode(info, expected):
    if (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1
            or (info.st_dev, info.st_ino) != expected):
        raise AuditHold("audit file identity changed")


def _existing_row(stream, expected):
    found = False
    total = 0
    while line := stream.readline(MAX_SCAN_BYTES - total + 1):
        total += len(line)
        if total > MAX_SCAN_BYTES or not line.endswith(b"\n"):
            raise AuditHold("audit scan bound reached or incomplete tail")
        fields = line[:-1].split(b"\t", 5)
        if len(fields) == 6 and MESSAGE_ID in fields[5]:
            if found or line != expected:
                raise AuditHold("conflicting exact-envelope audit row")
            found = True
    return found


@dataclass(frozen=True)
class AcceptedEnvelope:
    order_id: str
    envelope_id: str
    message_id: str
    body_sha256: str
    claimed_at: datetime
    accepted_at: datetime
    recipient: str
    subject: str

    def audit_row(self):
        if (
            self.order_id != ORDER_ID
            or self.envelope_id != ENVELOPE_ID
            or self.message_id != MESSAGE_ID.decode("ascii")
            or not isinstance(self.body_sha256, str)
            or re.fullmatch(r"[0-9a-f]{64}", self.body_sha256) is None
            or not isinstance(self.claimed_at, datetime)
            or self.claimed_at.utcoffset() is None
        ):
            raise AuditHold("invalid accepted-envelope identity")
        row = _expected_row(self.accepted_at, self.recipient, self.subject)
        if self.accepted_at < self.claimed_at:
            raise AuditHold("acceptance precedes claim")
        return row


@contextmanager
def _locked_sink(path, inode, lock_path, lock_inode):
    read_flags = os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK
    try:
        lock_fd = os.open(lock_path, os.O_RDONLY | read_flags)
        with os.fdopen(lock_fd, "rb") as lock:
            _require_inode(os.fstat(lock.fileno()), lock_inode)
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            _require_inode(os.stat(lock_path, follow_symlinks=False), lock_inode)
            fd = os.open(path, os.O_RDWR | os.O_APPEND | read_flags)
            with os.fdopen(fd, "rb") as stream:
                _require_inode(os.fstat(fd), inode)
                yield stream
    except OSError as exc:
        raise AuditHold("audit storage unavailable or busy") from exc


def _sync_row(stream, row, path, inode, lock_path, lock_inode):
    present = _existing_row(stream, row)
    fd = stream.fileno()
    _require_inode(os.stat(path, follow_symlinks=False), inode)
    _require_inode(os.stat(lock_path, follow_symlinks=False), lock_inode)
    if not present:
        if os.fstat(fd).st_size + len(row) > MAX_SCAN_BYTES:
            raise AuditHold("audit sink has no space within the scan bound")
        if os.write(fd, row) != len(row):
            raise AuditHold("short audit append requires review")
    os.fsync(fd)
    _require_inode(os.stat(path, follow_symlinks=False), inode)
    _require_inode(os.stat(lock_path, follow_symlinks=False), lock_inode)
    return "present" if present else "appended"


def append_accepted(path, inode, lock_path, lock_inode, *, accepted_at, recipient, subject):
    """Sync the exact marker for component checks without completing delivery."""
    row = _expected_row(accepted_at, recipient, subject)
    with _locked_sink(path, inode, lock_path, lock_inode) as stream:
        return _sync_row(stream, row, path, inode, lock_path, lock_inode)


def reconcile_accepted(path, inode, lock_path, lock_inode, *, lookup, complete):
    """Run the audit-owned lookup, marker sync and completion under one writer lock.

    The audit service supplies these exact-order adapters. Completion must atomically
    compare the accepted envelope with the same claim before recording delivery, and
    report success for an already completed matching claim.
    """
    with _locked_sink(path, inode, lock_path, lock_inode) as stream:
        evidence = lookup()
        if not isinstance(evidence, AcceptedEnvelope):
            raise AuditHold("exact acceptance receipt unavailable")
        row = evidence.audit_row()
        _sync_row(stream, row, path, inode, lock_path, lock_inode)
        if complete(evidence) is not True:
            raise AuditHold("exact acceptance completion refused")
