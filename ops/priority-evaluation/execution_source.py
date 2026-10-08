"""Bind executable source to host fetch receipts; never grant review or admission.

Legacy code recipes contain commit/tree and default to source/code. An explicit
source="model" selects source/model and its real fetch receipt instead. Export
uses only local Git objects in disposable metadata, without the fetched repo's
configuration, hooks, refs, alternates, or inherited process environment.
"""
from __future__ import annotations

import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile

from measurement_dispatch import OperationalHold

GIT = "/usr/bin/git"
SHA40 = re.compile(r"[0-9a-f]{40}")


def _safe_path(path: Path, *, directory: bool) -> None:
    """Require real directories throughout, and the expected final file type."""
    if ".." in path.parts:
        raise OperationalHold("pod_recipe_unbound")
    absolute = path.absolute()
    for component in (*reversed(absolute.parents), absolute):
        mode = component.lstat().st_mode
        expected = stat.S_ISDIR if component != absolute or directory else stat.S_ISREG
        if not expected(mode):
            raise OperationalHold("pod_recipe_unbound")


def validate_code_binding(recipe_code: dict, job_dir: Path) -> Path:
    """Return the fixed source directory when its receipt matches both SHA pins.

The receipt must originate from the host fetch workflow. This function checks
its binding, not its provenance or the parent's full source-review pins.
"""
    if not isinstance(recipe_code, dict) or set(recipe_code) not in (
        {"commit", "tree"}, {"source", "commit", "tree"}
    ):
        raise OperationalHold("pod_recipe_invalid")
    source = recipe_code.get("source", "code")
    if not isinstance(source, str) or source not in ("code", "model") or any(
        not isinstance(recipe_code[key], str) or not SHA40.fullmatch(recipe_code[key])
        for key in ("commit", "tree")
    ):
        raise OperationalHold("pod_recipe_invalid")
    repo = Path(job_dir) / "source" / source
    receipt_path = repo.parent / f"FETCH-RECEIPT-{source}.json"
    try:
        _safe_path(repo, directory=True)
        _safe_path(repo / ".git", directory=True)
        _safe_path(receipt_path, directory=False)
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise OperationalHold("pod_recipe_unbound") from None
    if not isinstance(receipt, dict) or receipt.get("which") != source or any(
        receipt.get(key) != recipe_code[key] for key in ("commit", "tree")
    ):
        raise OperationalHold("pod_recipe_mismatched_fetch")
    return repo


def _local_objects(original: Path, destination: Path) -> None:
    """Copy regular local objects; never carry Git control metadata over."""
    _safe_path(original, directory=True)
    for current, dirs, files in os.walk(original, followlinks=False):
        current_path = Path(current)
        target = destination / current_path.relative_to(original)
        target.mkdir(exist_ok=True)
        for name in dirs:
            if not stat.S_ISDIR((current_path / name).lstat().st_mode):
                raise OperationalHold("pod_recipe_unbound")
        for name in files:
            path = current_path / name
            if not stat.S_ISREG(path.lstat().st_mode):
                raise OperationalHold("pod_recipe_unbound")
            # Alternates can redirect object reads outside this fetched source.
            if path.relative_to(original).as_posix() in (
                "info/alternates", "info/http-alternates"
            ):
                raise OperationalHold("pod_recipe_unbound")
            # Copies work across filesystems and don't share mutable object inodes.
            with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), "rb") as source:
                if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
                    raise OperationalHold("pod_recipe_unbound")
                with (target / name).open("xb") as output:
                    shutil.copyfileobj(source, output)


def _validate_archive(data: bytes, commit: str) -> None:
    """Allow only safe relative files/directories and Git's commit comment."""
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as archive:
            paths = {}
            for member in archive:
                name = member.name.rstrip("/")
                parts = name.split("/")
                # Check raw components: PurePath normalizes away '.' components.
                if not name or name.startswith("/") or "\\" in name \
                        or re.match(r"[A-Za-z]:", name) \
                        or any(part in ("", ".", "..") for part in parts) \
                        or member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE) \
                        or member.linkname or (member.isdir() and member.size != 0) \
                        or name in paths:
                    raise OperationalHold("pod_recipe_unbound")
                # Normal git archive emits a global PAX comment with the commit.
                # It does not override a path, link, type, size, or timestamps.
                if any(key != "comment" or value != commit
                       for key, value in member.pax_headers.items()):
                    raise OperationalHold("pod_recipe_unbound")
                paths[name] = member.isdir()
            if any(key != "comment" or value != commit
                   for key, value in archive.pax_headers.items()):
                raise OperationalHold("pod_recipe_unbound")
            # A file cannot also be an ancestor of a different archive entry.
            for name in paths:
                parts = name.split("/")
                for index in range(1, len(parts)):
                    if paths.get("/".join(parts[:index])) is False:
                        raise OperationalHold("pod_recipe_unbound")
    except (tarfile.TarError, ValueError, UnicodeError, EOFError):
        raise OperationalHold("pod_recipe_unbound") from None


def export_bound_source(recipe_code: dict, job_dir: Path) -> bytes:
    """Export the exact bound commit from local objects, without network access.

Sparse/partial fetches missing archive objects fail closed; they are never
hydrated through remotes. Host-owned source/receipts must stay stable while
export runs, as they must during the parent's source-review gate.
"""
    repo = validate_code_binding(recipe_code, job_dir)
    try:
        with tempfile.TemporaryDirectory(prefix="fastlane-source-") as temporary:
            isolated = Path(temporary)
            (isolated / "refs").mkdir()
            (isolated / "HEAD").write_text("ref: refs/heads/unused\n")
            (isolated / "config").write_text(
                "[core]\n\trepositoryformatversion = 0\n\tbare = true\n"
            )
            _local_objects(repo / ".git" / "objects", isolated / "objects")
            env = {
                "PATH": "/usr/bin:/bin", "HOME": temporary, "LC_ALL": "C",
                "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_SYSTEM": "/dev/null",
                "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_COUNT": "0",
                "GIT_TERMINAL_PROMPT": "0", "GIT_NO_LAZY_FETCH": "1",
                "GIT_ALLOW_PROTOCOL": "",
            }
            command = [GIT, "--git-dir", str(isolated)]
            revision = subprocess.run(
                command + ["rev-parse", "--verify", recipe_code["commit"] + "^{commit}"],
                env=env, capture_output=True, timeout=60, check=False,
            )
            tree = subprocess.run(
                command + ["rev-parse", "--verify", recipe_code["commit"] + "^{tree}"],
                env=env, capture_output=True, timeout=60, check=False,
            )
            if revision.returncode or tree.returncode or (
                revision.stdout.decode().strip() != recipe_code["commit"]
                or tree.stdout.decode().strip() != recipe_code["tree"]
            ):
                raise OperationalHold("pod_recipe_mismatched_fetch")
            archive = subprocess.run(
                command + ["archive", "--format=tar", recipe_code["commit"]],
                env=env, capture_output=True, timeout=120, check=False,
            )
            if archive.returncode or not archive.stdout:
                raise OperationalHold("pod_recipe_unbound")
            _validate_archive(archive.stdout, recipe_code["commit"])
            return archive.stdout
    except (OSError, UnicodeError, subprocess.TimeoutExpired):
        raise OperationalHold("pod_recipe_unbound") from None
