"""Append one exact late-result audit row from trusted transport evidence.

This component runs on the audit side of the service boundary. Callers must
authenticate the accepted envelope before supplying its canonical fields. All
writers and replacements of the sink must take the same canonical lock.
"""

import fcntl
import os
import stat
from datetime import datetime, timezone


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


def append_accepted(path, inode, lock_path, lock_inode, *, accepted_at, recipient, subject):
    """Return 'appended' or 'present' only after syncing the exact row."""
    row = _expected_row(accepted_at, recipient, subject)
    try:
        lock_fd = os.open(lock_path, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK)
        with os.fdopen(lock_fd, "rb") as lock:
            _require_inode(os.fstat(lock.fileno()), lock_inode)
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            _require_inode(os.stat(lock_path, follow_symlinks=False), lock_inode)
            flags = os.O_RDWR | os.O_APPEND | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK
            fd = os.open(path, flags)
            with os.fdopen(fd, "rb") as stream:
                _require_inode(os.fstat(fd), inode)
                present = _existing_row(stream, row)
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
    except OSError as exc:
        raise AuditHold("audit storage unavailable or busy") from exc
