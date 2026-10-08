"""Trusted, bounded Git-object inspection; never executes source or downloads LFS data."""
import hashlib
from pathlib import Path, PurePosixPath
import re
import shutil
import tempfile

MAX_TREE_FILES = 10000
MAX_WEIGHT_FILES = 128
MAX_POINTER_BYTES = 1024
SHA40 = re.compile(r"[0-9a-f]{40}\Z")
POINTER = re.compile(r"version https://git-lfs.github.com/spec/v1\noid sha256:([0-9a-f]{64})\nsize ([1-9][0-9]{0,18})\n?\Z")


class MetadataError(ValueError):
    pass


def lfs_pointer(body, oid):
    if len(body.encode("utf-8")) > MAX_POINTER_BYTES:
        raise MetadataError("weight is not a bounded Git LFS pointer")
    match = POINTER.fullmatch(body)
    raw = body.encode("utf-8")
    actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    if not match or actual != oid:
        raise MetadataError("invalid or unbound Git LFS pointer")
    return {"sha256": match[1], "size_bytes": int(match[2]), "git_blob_oid": oid,
            "pointer_sha256": hashlib.sha256(raw).hexdigest()}


def inspect_pinned_tree(repo, commit, tree, git, *, max_bytes, hf_repository=None):
    if not SHA40.fullmatch(commit) or not SHA40.fullmatch(tree):
        raise MetadataError("invalid pinned Git identity")
    # Read objects with an isolated config and no remotes. Git 2.34 predates
    # GIT_NO_LAZY_FETCH; removing promisor configuration prevents lazy network reads.
    objects = repo / ".git" / "objects"
    if (objects.is_symlink() or (objects / "info" / "alternates").exists()
            or any(path.is_symlink() for path in objects.rglob("*"))):
        raise MetadataError("unsafe pinned Git object store")
    with tempfile.TemporaryDirectory(prefix="fastlane-object-inspection-") as tmp:
        isolated = Path(tmp)
        git(isolated, "init", "--bare", "-q")
        shutil.rmtree(isolated / "objects")
        (isolated / "objects").symlink_to((repo / ".git" / "objects").resolve(), target_is_directory=True)
        if git(isolated, "rev-parse", commit + "^{tree}").strip() != tree:
            raise MetadataError("pinned Git tree differs")
        entries = []
        for entry in git(isolated, "ls-tree", "-r", "-z", "--full-tree", commit).split("\0"):
            if not entry:
                continue
            try:
                header, name = entry.split("\t", 1)
                mode, kind, oid = header.split(" ")
            except ValueError as exc:
                raise MetadataError("malformed pinned Git tree") from exc
            path = PurePosixPath(name)
            if (mode not in ("100644", "100755") or kind != "blob" or not SHA40.fullmatch(oid)
                    or path.is_absolute() or ".." in path.parts or "\\" in name or ":" in name
                    or any(part.lower() == ".git" for part in path.parts)
                    or not name or any(ord(c) < 32 for c in name)):
                raise MetadataError("unsafe pinned Git tree entry")
            entries.append((name, oid))
            if len(entries) > MAX_TREE_FILES:
                raise MetadataError("pinned Git tree exceeds file count limit")
        oids = sorted({oid for _, oid in entries})

        def sizes():
            output = git(isolated, "cat-file", "--batch-check", stdin="".join(oid + "\n" for oid in oids))
            lines = output.splitlines()
            if len(lines) != len(oids):
                raise MetadataError("incomplete pinned Git object inspection")
            result, missing = {}, []
            for oid, line in zip(oids, lines):
                fields = line.split()
                if fields == [oid, "missing"]:
                    missing.append(oid)
                elif len(fields) == 3 and fields[:2] == [oid, "blob"] and fields[2].isdigit():
                    result[oid] = int(fields[2])
                else:
                    raise MetadataError("unexpected pinned Git object type")
            return result, missing

        counts, missing = sizes()
        # The validated immutable commit, never customer paths, is the want.
        # One bounded pack hydrates ordinary blobs, including LFS pointers.
        # No smudge filter, checkout or source execution happens here.
        hydrated = len(missing)
        if missing:
            # Fetch into a fresh object store: refetching an already-present
            # commit does not hydrate excluded blobs on Git 2.34. A blob size
            # filter excludes real large weights; LFS pointers remain ordinary
            # tiny Git objects. The one pack retains the same 64 MiB file bound.
            url = git(repo, "config", "--get", "remote.origin.url").strip()
            if not re.fullmatch(r"https://(?:github\.com|huggingface\.co)/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", url):
                raise MetadataError("unsafe pinned Git hydration remote")
            (isolated / "objects").unlink()
            (isolated / "objects").mkdir()
            with (isolated / "config").open("a") as config:
                config.write('\n[remote "origin"]\n\turl = ' + url + '\n')
            git(isolated, "fetch", "--quiet", "--depth=1", "--filter=blob:limit=" + str(max_bytes),
                "--no-tags", "origin", commit, timeout=600,
                hf_repository=hf_repository, max_pack_bytes=max_bytes)
            if git(isolated, "rev-parse", commit + "^{tree}").strip() != tree:
                raise MetadataError("hydrated pinned Git tree differs")
            counts, missing = sizes()
        if missing:
            raise MetadataError("pinned Git archive objects are unavailable")
        total = sum(counts[oid] for _, oid in entries)
        if total > max_bytes or any(size > max_bytes for size in counts.values()):
            raise MetadataError("pinned Git archive exceeds byte limit")
        weights = {}
        for name, oid in entries:
            if not name.endswith(".safetensors"):
                continue
            if len(weights) >= MAX_WEIGHT_FILES or counts[oid] > MAX_POINTER_BYTES:
                raise MetadataError("weight pointer count or size exceeds limit")
            if not re.fullmatch(r"[A-Za-z0-9_./-]{1,200}", name):
                raise MetadataError("unsafe weight pointer filename")
            body = git(isolated, "cat-file", "blob", oid)
            if len(body.encode("utf-8")) != counts[oid]:
                raise MetadataError("weight pointer byte identity differs")
            weights[name] = lfs_pointer(body, oid)
        if hydrated:
            for source in (isolated / "objects").rglob("*"):
                if source.is_symlink():
                    raise MetadataError("unsafe hydrated Git object store")
                if not source.is_file():
                    continue
                target = objects / source.relative_to(isolated / "objects")
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.is_symlink():
                    raise MetadataError("unsafe existing Git object path")
                if target.exists():
                    continue  # Immutable existing objects may be read-only.
                with source.open("rb") as reader, target.open("xb") as writer:
                    shutil.copyfileobj(reader, writer)
        return {"weights": weights, "archive_objects": {
            "fully_hydrated": True, "file_count": len(entries), "unique_blob_count": len(oids),
            "bytes": total, "hydrated_blob_count": hydrated}}
