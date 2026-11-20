#!/usr/bin/env python3
"""Trusted, order-scoped entry point for the 9aa6673b stage launchers.

This file is installed only from merged main. It authenticates the deputy/custody
binding, packet bytes, and every packet pin before it runs any order-local code.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone


ORDER_ID = "9aa6673b-f364-4a20-9fc4-899678189814"
ROOT = Path("/home/flori/jobs/fastlane-native-9aa6673b")
RUNTIME = Path("/home/flori/.local/share/priority-evaluation/runtime")
BOARD = Path("/home/flori/bin/agent-board")
DEADLINE = datetime(2026, 11, 21, 17, 31, 29, tzinfo=timezone.utc)
HASH_RE = re.compile(r"[0-9a-f]{64}\Z")
DEPUTIES = {
    f"{engine}:{role}"
    for engine in ("codex", "claude")
    for role in ("cos-deputy-opus", "cos-night-deputy")
}
CUSTODIANS = {
    "codex:jevbench-item-reserve-20261007",
    "claude:jevbench-item-reserve-20261007",
}

STAGES = {
    "adapter_smoke": {
        "go_prefix": "GO ADAPTER SMOKE ",
        "word": ROOT / "public-smoke/CUSTODY-WORD.txt",
        "packet": ROOT / "public-smoke/PACKET-HASHES.txt",
        "ttl_h": 1.20,
        "max_usd_h": 3,
        "max_reservation_usd": 4.35,
        "unit": "fl9aa-adapter-smoke",
        "run_script": "run_public_smoke.sh",
        "preflight_script": "smoke.py",
        "runtime_max_sec": 4320,
        "one_use_files": (ROOT / "public-smoke/ADAPTER-PROOF-CREATE-CALLED",
                          ROOT / "public-smoke/ADAPTER-PROOF-RESERVATION-CLAIM"),
        "scripts": (
            "public_smoke_admission.py", "public_runtime_inventory.py", "make_smoke_packet.py",
            "public_smoke_method.json", "start_smoke.sh", "run_public_smoke.sh", "smoke.py",
            "public_smoke_gates.py", "host_isolation.py", "verda_dispatch_proof.py",
            "public_smoke_alert.py", "host-isolation/hostcut.py", "host-isolation/netcut.sh",
        ),
    },
    "sealed": {
        "go_prefix": "GO SEALED ",
        "word": ROOT / "v16/CUSTODY-WORD.txt",
        "packet": ROOT / "v16/PACKET-HASHES.txt",
        "ttl_h": 2.75,
        "max_usd_h": 5,
        "max_reservation_usd": 13.75,
        "unit": "fl9aa-sealed",
        "run_script": "run_sealed.sh",
        "preflight_script": "measure_v16.py",
        "runtime_max_sec": 9900,
        "one_use_files": (ROOT / "v16/CREATE-CALLED", ROOT / "v16/RESERVATION-CLAIM"),
        "scripts": (
            "sealed_admission.py", "freeze_bundle.py", "make_packet.py", "make_smoke_packet.py",
            "public_smoke_admission.py", "public_runtime_inventory.py", "public_smoke_gates.py",
            "public_smoke_method.json", "public_smoke_alert.py", "live_gates.py", "start_sealed.sh",
            "run_sealed.sh", "measure_v16.py", "start_smoke.sh", "run_public_smoke.sh",
            "smoke_launcher.sh", "smoke.py", "pod_entry_hard_candy.sh", "build_handoff.py",
            "build_adapter_proof.py", "host_isolation.py", "verda_dispatch_proof.py",
            "verda_stage_alert.py", "host-isolation/hostcut.py", "host-isolation/netcut.sh",
        ),
    },
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def parse_time(value: str) -> datetime:
    require(isinstance(value, str) and value.endswith("Z"), "UTC decision timestamp required")
    return datetime.fromisoformat(value[:-1] + "+00:00")


def first_line(entry: dict, prefix: str) -> dict:
    line = entry.get("body", "").partition("\n")[0]
    require(line.startswith(prefix), f"unexpected decision format in #{entry.get('id')}")
    value = json.loads(line[len(prefix):])
    require(isinstance(value, dict), "decision scope must be a JSON object")
    return value


def board_since(entry_id: int) -> list[dict]:
    raw = subprocess.check_output(
        [str(BOARD), "read", "11", "--since", str(entry_id), "--json"],
        text=True, timeout=30,
    )
    data = json.loads(raw)
    entries = data if isinstance(data, list) else data.get("entries")
    require(isinstance(entries, list), "#11 readback is incomplete")
    return entries


def board_entry(entry_id: int) -> dict:
    rows = board_since(entry_id - 1)
    row = next((item for item in rows if item.get("id") == entry_id), None)
    require(row is not None and row.get("thread_id") == 11, f"exact #11 decision #{entry_id} missing")
    return row


def preliminary_authority(stage: str, deputy_id: int, now: datetime | None = None) -> dict:
    """Bind the packet hash to current deputy and custody decisions before reading candidate code."""
    policy = STAGES[stage]
    now = now or datetime.now(timezone.utc)
    require(type(deputy_id) is int and deputy_id > 0, "positive deputy decision ID required")
    deputy = board_entry(deputy_id)
    require(deputy.get("author") in DEPUTIES and deputy.get("kind") == "decision",
            "approval is not a designated deputy decision")
    scope = first_line(deputy, policy["go_prefix"])
    require(scope.get("order") == ORDER_ID and HASH_RE.fullmatch(str(scope.get("packet_sha256", ""))),
            "deputy decision is not bound to this exact order and packet")
    issued = parse_time(deputy["created_at"])
    expires = parse_time(scope.get("expires"))
    require(issued <= now < expires <= min(issued + timedelta(minutes=20), DEADLINE),
            "deputy decision is stale, expired or outside the order deadline")
    require(scope.get("ttl_h") == policy["ttl_h"] and type(scope.get("attempts")) is int
            and scope["attempts"] == 1 and type(scope.get("custody_id")) is int
            and type(scope.get("clearance_id")) is int and type(scope.get("reaper_id")) is int,
            "deputy decision scope is incomplete")
    require(isinstance(scope.get("custody_sha256"), str)
            and HASH_RE.fullmatch(scope["custody_sha256"]), "custody word hash is missing")
    custody = board_entry(scope["custody_id"])
    require(custody.get("author") in CUSTODIANS and custody.get("kind") == "decision",
            "custody is not a designated #11 decision")
    word_bytes, _ = read_regular_file(policy["word"])
    require(hashlib.sha256(word_bytes).hexdigest() == scope["custody_sha256"],
            "local custody word differs from the deputy decision")
    expected_word = f"#{custody['id']} {custody['author']} {custody['created_at']}\n{custody['body']}"
    try:
        word_text = word_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("custody word is not UTF-8") from exc
    require(word_text.rstrip("\n") == expected_word.rstrip("\n"),
            "custody word bytes differ from their #11 source")
    custody_scope = first_line(custody, "HASH CONFIRMED + UNSPENT ")
    custody_issued = parse_time(custody["created_at"])
    custody_expires = parse_time(custody_scope.get("expires"))
    require(set(custody_scope) == {"order", "stage", "packet_sha256", "expires"}
            and custody_scope["order"] == ORDER_ID and custody_scope["stage"] == stage
            and custody_scope["packet_sha256"] == scope["packet_sha256"]
            and custody_issued <= issued <= now < custody_expires
            and custody_expires <= min(custody_issued + timedelta(hours=2), DEADLINE)
            and expires <= custody_expires,
            "custody confirmation is stale or bound to different packet bytes")
    require(scope.get("provider") == "verda" and scope.get("instance_type") == "1RTXPRO6000.30V"
            and scope.get("offer_id") == f"{scope.get('instance_type')}@{scope.get('location')}"
            and isinstance(scope.get("location"), str) and re.fullmatch(r"FIN-\d+", scope["location"])
            and type(scope.get("max_usd_h")) in (int, float)
            and 0 < scope["max_usd_h"] <= policy["max_usd_h"]
            and type(scope.get("max_os_volume_usd_h")) in (int, float)
            and 0 <= scope["max_os_volume_usd_h"] < scope["max_usd_h"],
            "deputy decision exceeds the stage spending or provider scope")
    require((scope["max_usd_h"] + scope["max_os_volume_usd_h"]) * scope["ttl_h"]
            <= policy["max_reservation_usd"],
            "deputy decision exceeds the stage reservation cap")
    return {"scope": scope, "deputy": deputy, "custody": custody, "packet_sha256": scope["packet_sha256"]}


def require_unused_stage(stage: str) -> None:
    """Preserve the one-use attempt fence before asking candidate code to preflight."""
    for path in STAGES[stage]["one_use_files"]:
        require(not path.exists() and not path.is_symlink(),
                f"one-use stage marker already exists: {path.name}")


def read_regular_file(path: Path) -> tuple[bytes, os.stat_result]:
    """Read one canonical absolute file without following any path component symlink."""
    raw = os.fspath(path)
    require(isinstance(raw, str) and raw.startswith("/") and os.path.normpath(raw) == raw
            and "\\" not in raw, "packet path is not canonical and absolute")
    parts = Path(raw).parts[1:]
    require(parts and all(part not in {"", ".", ".."} for part in parts), "unsafe packet path")
    directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    file_flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    directory_fd = os.open("/", directory_flags)
    try:
        for part in parts[:-1]:
            next_fd = os.open(part, directory_flags, dir_fd=directory_fd)
            os.close(directory_fd)
            directory_fd = next_fd
        fd = os.open(parts[-1], file_flags, dir_fd=directory_fd)
    except OSError as exc:
        raise ValueError(f"unsafe packet file: {Path(raw).name}") from exc
    finally:
        os.close(directory_fd)
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        require(stat.S_ISREG(info.st_mode), f"packet member is not a regular file: {Path(raw).name}")
        return stream.read(), info


def read_pinned_file(path: Path, capture: bool) -> tuple[str, bytes | None]:
    """Hash by streaming; retain only executable closure bytes for the private snapshot."""
    raw = os.fspath(path)
    require(isinstance(raw, str) and raw.startswith("/") and os.path.normpath(raw) == raw
            and "\\" not in raw, "packet path is not canonical and absolute")
    parts = Path(raw).parts[1:]
    require(parts and all(part not in {"", ".", ".."} for part in parts), "unsafe packet path")
    directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    file_flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    directory_fd = os.open("/", directory_flags)
    try:
        for part in parts[:-1]:
            next_fd = os.open(part, directory_flags, dir_fd=directory_fd)
            os.close(directory_fd)
            directory_fd = next_fd
        fd = os.open(parts[-1], file_flags, dir_fd=directory_fd)
    except OSError as exc:
        raise ValueError(f"unsafe packet file: {Path(raw).name}") from exc
    finally:
        os.close(directory_fd)
    digest = hashlib.sha256()
    chunks = [] if capture else None
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        require(stat.S_ISREG(info.st_mode), f"packet member is not a regular file: {Path(raw).name}")
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            if chunks is not None:
                chunks.append(chunk)
    return digest.hexdigest(), (b"".join(chunks) if chunks is not None else None)


def parse_packet(stage: str, packet_bytes: bytes, expected_sha256: str) -> dict[Path, str]:
    require(HASH_RE.fullmatch(expected_sha256)
            and hashlib.sha256(packet_bytes).hexdigest() == expected_sha256,
            "packet bytes do not match the approved digest")
    try:
        lines = packet_bytes.decode("utf-8").splitlines()
    except UnicodeDecodeError as exc:
        raise ValueError("approved packet is not UTF-8") from exc
    require(lines, "approved packet is empty")
    if stage == "adapter_smoke":
        header = re.fullmatch(r"# Order " + re.escape(ORDER_ID)
                              + r", stage adapter_smoke, worker install [0-9a-f]{40}", lines[0])
    else:
        header = re.fullmatch(r"# Order " + re.escape(ORDER_ID)
                              + r", worker install [0-9a-f]{40}", lines[0])
    require(header is not None, "approved packet header differs from the exact order and stage")
    pins: dict[Path, str] = {}
    last_path = None
    for line in lines[1:]:
        if not line or line.startswith("#"):
            continue
        require(len(line) > 66 and line[64:66] == "  " and HASH_RE.fullmatch(line[:64]),
                "malformed packet member line")
        path_text = line[66:]
        path = Path(path_text)
        require(path.is_absolute() and path.as_posix() == path_text and os.path.normpath(path_text) == path_text
                and "\\" not in path_text and path not in pins,
                "duplicate or noncanonical packet path")
        require(last_path is None or path > last_path, "packet members are not in canonical sorted order")
        pins[path] = line[:64]
        last_path = path
    require(pins and len(pins) <= 10000, "packet member set is empty or too large")
    required = {ROOT / "scripts" / name for name in STAGES[stage]["scripts"]}
    required.add(RUNTIME / "native_stage_launcher.py")
    require(required <= pins.keys(),
            "approved packet omits a required stage launcher or runtime member")
    return pins


def authenticate_packet(stage: str, packet_bytes: bytes, expected_sha256: str, reader=read_pinned_file):
    """Authenticate the complete packet before returning any candidate bytes for execution."""
    pins = parse_packet(stage, packet_bytes, expected_sha256)
    captured: dict[Path, bytes] = {}
    for path, expected in pins.items():
        capture = ((path.parent == ROOT / "scripts" or ROOT / "scripts" in path.parents)
                   or (path.parent == RUNTIME or RUNTIME in path.parents))
        actual, data = reader(path, capture)
        require(actual == expected, f"packet pin mismatch: {path.name}")
        if capture:
            require(isinstance(data, bytes), f"execution closure was not captured: {path.name}")
            captured[path] = data
    return pins, captured


def execute_after_authentication(stage, packet_bytes, expected_sha256, reader, execute):
    """Testable ordering boundary: execute is unreachable until every pin verifies."""
    pins, captured = authenticate_packet(stage, packet_bytes, expected_sha256, reader=reader)
    return execute(pins, captured)


def _write_snapshot_file(root: Path, relative: Path, data: bytes, mode=0o400) -> None:
    target = root / relative
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    require(not target.is_symlink(), "snapshot path contains a symlink")
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), mode)
    with os.fdopen(fd, "wb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
        os.fchmod(stream.fileno(), mode)


def _freeze_snapshot(root: Path) -> None:
    for path in root.rglob("*"):
        if path.is_file():
            os.chmod(path, 0o400)
    for path in sorted((p for p in root.rglob("*") if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
        os.chmod(path, 0o500)
    os.chmod(root, 0o500)


def _fsync_snapshot_directories(root: Path) -> None:
    directories = [root, *(path for path in root.rglob("*") if path.is_dir())]
    for directory in sorted(directories, key=lambda path: len(path.parts), reverse=True):
        fd = os.open(directory, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0))
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


def _remove_snapshot(root: Path) -> None:
    if not root.exists():
        return
    for path in root.rglob("*"):
        if path.is_file():
            os.chmod(path, 0o600)
    for path in sorted((p for p in root.rglob("*") if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
        os.chmod(path, 0o700)
    os.chmod(root, 0o700)
    shutil.rmtree(root)


def start_stage(stage: str, deputy_id: int) -> None:
    policy = STAGES[stage]
    authority = preliminary_authority(stage, deputy_id)
    packet_bytes, _ = read_regular_file(policy["packet"])
    snapshot = Path(tempfile.mkdtemp(prefix=("fl9aa-adapter-smoke." if stage == "adapter_smoke"
                                            else "fl9aa-sealed."), dir="/tmp"))
    os.chmod(snapshot, 0o700)
    started = False
    try:
        def launch_verified(pins, captured):
            nonlocal started
            require_unused_stage(stage)
            # Persist the exact approved packet before running any packet-bound code.
            _write_snapshot_file(snapshot, Path("PACKET-HASHES.txt"), packet_bytes)
            for source, data in captured.items():
                if RUNTIME in source.parents:
                    relative = Path("runtime") / source.relative_to(RUNTIME)
                elif ROOT / "scripts" == source or ROOT / "scripts" in source.parents:
                    relative = source.relative_to(ROOT / "scripts")
                else:
                    continue
                _write_snapshot_file(snapshot, relative, data)
            _fsync_snapshot_directories(snapshot)
            required_script = snapshot / policy["preflight_script"]
            run_script = snapshot / policy["run_script"]
            require(required_script.is_file() and run_script.is_file(),
                    "verified startup snapshot lacks its exact stage entry points")
            env = os.environ.copy()
            env["FASTLANE_NATIVE_VERIFIED_RUNTIME_ROOT"] = str(snapshot / "runtime")
            subprocess.run(
                ["/usr/bin/python3", "-IB", str(required_script), "--preflight-only", str(deputy_id),
                 str(snapshot / "PACKET-HASHES.txt")],
                cwd=ROOT, env=env, stdin=subprocess.DEVNULL, check=True, timeout=300,
            )
            preflight_bytes, _ = read_regular_file(snapshot / "PACKET-HASHES.txt")
            require(preflight_bytes == packet_bytes, "candidate preflight packet differs from authenticated bytes")
            _freeze_snapshot(snapshot)
            # A timed-out systemd-run call can still have accepted the unit. Preserve its
            # immutable snapshot on every ambiguous outcome instead of deleting live inputs.
            started = True
            subprocess.run(
                ["systemd-run", "--user", f"--unit={policy['unit']}", f"--working-directory={ROOT}",
                 "--property=UMask=0077", "--property=KillMode=mixed", "--property=KillSignal=SIGTERM",
                 "--property=TimeoutStopSec=1200", f"--property=RuntimeMaxSec={policy['runtime_max_sec']}",
                 f"--setenv=FASTLANE_NATIVE_VERIFIED_RUNTIME_ROOT={snapshot / 'runtime'}",
                 "/bin/bash", str(run_script), str(snapshot), str(deputy_id)],
                cwd=ROOT, stdin=subprocess.DEVNULL, check=True, timeout=60,
            )
            return True

        execute_after_authentication(
            stage, packet_bytes, authority["packet_sha256"], read_pinned_file, launch_verified,
        )
    finally:
        if not started:
            _remove_snapshot(snapshot)


def main(argv=None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=tuple(STAGES))
    parser.add_argument("deputy_board_id", type=int)
    args = parser.parse_args(argv)
    try:
        start_stage(args.stage, args.deputy_board_id)
    except Exception as exc:
        print(f"native stage launch refused: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
