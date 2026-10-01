#!/usr/bin/env python3
"""Shared helpers for the /submit intake bridge and the bh-submission CLI (CR-251).

Database access is the same fixed local peer-auth psql connection as
email-access/fastlane_transactional.py; values travel as psql variables (never string-built SQL).
Secrets (API-key ciphertext, the private key) are never logged or printed by this module.
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
from pathlib import Path

HOME = Path(os.environ.get("HOME", "/home/flori"))
PRIVATE_KEY = Path(os.environ.get("BH_SUBMISSION_PRIVATE_KEY", HOME / ".config/benchmarkheaven/submission-secret-private.pem"))
JOBS_ROOT = Path(os.environ.get("BH_JOBS_ROOT", "/home/flori/jobs"))
STATUSES = ("awaiting_payment", "queued", "in_evaluation", "evaluated", "rejected", "spam", "withdrawn")
TERMINAL = ("evaluated", "rejected", "spam", "withdrawn")
SAFE_ENV = {"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8", "PGCONNECT_TIMEOUT": "5"}


class DbError(RuntimeError):
    pass


class Db:
    """psql wrapper. `conninfo` (tests only) is a libpq connection string replacing the fixed peer connection."""

    def __init__(self, conninfo: str | None = None):
        self.conninfo = conninfo

    def _argv(self, variables: dict) -> list[str]:
        argv = ["/usr/bin/psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"]
        for key, value in variables.items():
            argv += ["-v", f"{key}={'' if value is None else value}"]
        if self.conninfo:
            argv.append(self.conninfo)
        else:
            argv += ["-h", "/var/run/postgresql", "-p", "5432", "-U", "flori", "-d", "benchmarkheaven_accounts"]
        return argv

    def _run(self, sql: str, variables: dict) -> str:
        env = dict(SAFE_ENV)
        if self.conninfo:  # tests: keep a scratch cluster's unix socket reachable and ignore ambient PG* settings
            env["PGOPTIONS"] = ""
        result = subprocess.run(self._argv(variables), input="SET standard_conforming_strings=on;\n" + sql,
                                text=True, capture_output=True, timeout=30, env=env, check=False)
        if result.returncode:
            first = (result.stderr or "").strip().splitlines()[:1]
            raise DbError(first[0][:200] if first else "psql failed")
        return result.stdout

    def rows(self, select_sql: str, **variables) -> list[dict]:
        """Run one SELECT (no trailing semicolon) and return a list of dicts."""
        out = self._run(f"SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM ({select_sql}) t;", variables)
        # psql prints the SET command tag as nothing under -q; the json is the last non-empty line.
        lines = [line for line in out.splitlines() if line.strip()]
        return json.loads(lines[-1]) if lines else []

    def execute(self, sql: str, **variables) -> None:
        self._run(sql, variables)

    def scalar(self, select_sql: str, **variables):
        out = [line for line in self._run(select_sql, variables).splitlines() if line.strip()]
        return out[-1] if out else None


class RefError(ValueError):
    pass


def resolve_ref(db: Db, ref: str) -> dict:
    """ref = first 8 hex chars of the id (any case) or a full uuid. Returns the row (without ciphertext)."""
    ref = (ref or "").strip().lower()
    if re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", ref):
        found = db.rows("SELECT id::text FROM bh_model_submissions WHERE id=(:'ref')::uuid", ref=ref)
    elif re.fullmatch(r"[0-9a-f]{8}", ref):
        found = db.rows("SELECT id::text FROM bh_model_submissions WHERE id::text LIKE :'ref' || '%' LIMIT 3", ref=ref)
    else:
        raise RefError("reference must be 8 hex characters or a full uuid")
    if not found:
        raise RefError("no submission with that reference")
    if len(found) > 1:
        raise RefError("ambiguous reference; use the full uuid")
    return found[0]


# --------------------------------------------------------------------------------------- crypto
def b64u_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def decrypt_v1(ciphertext: str, private_pem: bytes) -> str:
    """v1.<RSA-OAEP-SHA256 wrapped AES key>.<iv>.<gcm tag>.<ct>, every part base64url."""
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    parts = ciphertext.split(".")
    if len(parts) != 5 or parts[0] != "v1":
        raise ValueError("unsupported ciphertext format")
    wrapped, iv, tag, body = (b64u_decode(p) for p in parts[1:])
    key = serialization.load_pem_private_key(private_pem, password=None)
    aes_key = key.decrypt(wrapped, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    return AESGCM(aes_key).decrypt(iv, body + tag, None).decode("utf-8")


def keygen(path: Path = PRIVATE_KEY) -> str:
    """Create an RSA-3072 key pair if the private key does not exist; return ONLY the public PEM. Never overwrites."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    if path.exists():
        raise FileExistsError("private key already exists; refusing to overwrite")
    path.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(path.parent, 0o700)
    key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as fh:
        fh.write(pem)
    return key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()


def export_key(db: Db, ref: str, dest: str, private_key: Path = PRIVATE_KEY, jobs_root: Path = JOBS_ROOT) -> str:
    """Decrypt a stored API key into a new 0600 file under jobs_root. Returns the full submission id."""
    target = Path(os.path.abspath(dest))
    if jobs_root.resolve() not in target.resolve().parents:
        raise PermissionError(f"destination must be under {jobs_root}/")
    if os.path.lexists(target):
        raise FileExistsError("destination already exists")
    row = resolve_ref(db, ref)
    data = db.rows("SELECT api_key_ciphertext FROM bh_model_submissions WHERE id=(:'id')::uuid", id=row["id"])
    ciphertext = data[0]["api_key_ciphertext"] if data else None
    if not ciphertext:
        raise LookupError("no API key stored for this submission (none given, or already purged)")
    plain = decrypt_v1(ciphertext, private_key.read_bytes())
    target.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(plain)
    return row["id"]
