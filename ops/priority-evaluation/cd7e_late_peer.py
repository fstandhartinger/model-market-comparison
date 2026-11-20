"""Typed database client for the exact-order late pickup service."""

import json
import subprocess
from datetime import datetime


PSQL = (
    "/usr/bin/psql", "-X", "-qAt", "-w", "-v", "ON_ERROR_STOP=1",
    "-h", "/var/run/postgresql", "-p", "5432",
    "-U", "jevbench_cd7e_late", "-d", "benchmarkheaven_accounts",
)


class PeerDatabaseError(RuntimeError):
    pass


def _argument(value):
    if type(value) is str:
        # A hex-only literal keeps values out of argv and cannot add psql commands.
        if "\0" in value or len(value) > 1024:
            raise PeerDatabaseError("invalid late pickup database argument")
        return f"pg_catalog.convert_from(pg_catalog.decode('{value.encode('utf-8').hex()}', 'hex'), 'UTF8')"
    if type(value) is bool:
        return "true" if value else "false"
    if type(value) is datetime and value.utcoffset() is not None:
        return _argument(value.isoformat()) + "::pg_catalog.timestamptz"
    raise PeerDatabaseError("invalid late pickup database argument type")


class PeerDatabase:
    def _call(self, operation, *values):
        args = ", ".join(_argument(value) for value in values)
        sql = (
            "SET search_path = pg_catalog, pg_temp;\n"
            "SET statement_timeout = '10s';\n"
            "SET lock_timeout = '4s';\n"
            f"SELECT pg_catalog.to_jsonb(cd7e_late.{operation}({args}));\n"
        )
        try:
            result = subprocess.run(
                PSQL, input=sql, text=True, encoding="utf-8", capture_output=True,
                timeout=16, check=False, cwd="/",
                env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8", "PGCONNECT_TIMEOUT": "4",
                     "PGPASSFILE": "/dev/null", "PGCLIENTENCODING": "UTF8"},
            )
            if result.returncode or len(result.stdout) > 8192:
                raise PeerDatabaseError("late pickup database operation refused")
            return json.loads(result.stdout) if result.stdout.strip() else None
        except (OSError, subprocess.TimeoutExpired, ValueError) as exc:
            raise PeerDatabaseError("late pickup database unavailable") from exc

    def read_order(self):
        return self._call("read_order")

    def receipt(self):
        return self._call("receipt")

    def stage(self, identity, refund_ref, generation, admission, release, expiry, recipient, subject, digest):
        return self._call("stage", identity, refund_ref, generation, admission, release,
                          expiry, recipient, subject, digest)

    def validate(self, recipient, subject, digest):
        return self._call("validate", recipient, subject, digest)

    def claim(self, recipient, subject, digest, generation, admission):
        return self._call("claim", recipient, subject, digest, generation, admission)

    def accepted(self, digest):
        return self._call("accepted", digest)

    def failed(self, digest, submitted):
        return self._call("failed", digest, submitted)

    def reconcile(self):
        return self._call("reconcile")
