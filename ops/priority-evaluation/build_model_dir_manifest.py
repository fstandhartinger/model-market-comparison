"""Build the non-LFS part of the weights directory from the pinned git objects, plus the full runner manifest.

Offline and object-verified: the commit, every tree and every blob is re-hashed (sha1 of the git object
encoding) while walking from the pinned commit id, so replace refs / tampered stores cannot change the file set.
LFS pointer entries must equal the reviewed pointer manifest exactly (path set, oid, size) and are skipped
(they are streamed by the reviewed LFS wrapper). Regular files only. Deterministic tar. Source only.
"""
import hashlib
import io
import json
import os
import re
import subprocess
import tarfile

LFS_HEAD = b'version https://git-lfs.github.com/spec/v1\n'
HEX40 = re.compile(r'[0-9a-f]{40}')
NAME_RE = re.compile(r'[A-Za-z0-9._-]+')
POINTER_RE = re.compile(rb'version https://git-lfs\.github\.com/spec/v1\noid sha256:([0-9a-f]{64})\nsize ([0-9]{1,15})\n')
MAX_BLOB = 50 << 20
MAX_TOTAL = 200 << 20


class BuildError(Exception):
    pass


def git(repo, *args):
    env = {'PATH': '/usr/bin:/bin', 'HOME': '/nonexistent', 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1',
           'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_ATTR_NOSYSTEM': '1',
           'GIT_TERMINAL_PROMPT': '0', 'GIT_DIR': os.path.join(repo, '.git')}
    r = subprocess.run(['/usr/bin/git', '-c', 'protocol.allow=never', *args], capture_output=True, env=env,
                       timeout=120, stdin=subprocess.DEVNULL)
    if r.returncode:
        raise BuildError('git ' + args[0] + ' failed')
    return r.stdout


def obj(repo, kind, oid):
    if not HEX40.fullmatch(oid):
        raise BuildError('bad object id')
    if kind == 'blob':
        size = int(git(repo, 'cat-file', '-s', oid))
        if size > MAX_BLOB:
            raise BuildError('blob too large')
    data = git(repo, 'cat-file', kind, oid)
    if hashlib.sha1(kind.encode() + b' %d\0' % len(data) + data).hexdigest() != oid:
        raise BuildError(kind + ' hash mismatch')
    return data


def walk(repo, tid, prefix, out):
    raw = obj(repo, 'tree', tid)
    i = 0
    while i < len(raw):
        sp = raw.index(b' ', i); nul = raw.index(b'\0', sp)
        mode, name, sha = raw[i:sp].decode(), raw[sp + 1:nul].decode(), raw[nul + 1:nul + 21].hex()
        i = nul + 21
        if not NAME_RE.fullmatch(name) or name in ('.', '..') or name == '.git':
            raise BuildError('unsafe name refused')
        path = prefix + name
        if mode == '40000':
            walk(repo, sha, path + '/', out)
        elif mode in ('100644', '100755'):
            out.append((path, sha))
        else:
            raise BuildError('non-regular tree entry refused')


def build(repo, commit, tree, lfs_manifest_path, lfs_manifest_sha256, out_tar, exclude_prefixes=('audio_notes/',)):
    if not HEX40.fullmatch(commit) or not HEX40.fullmatch(tree):
        raise BuildError('bad commit/tree id')
    mbytes = open(lfs_manifest_path, 'rb').read()
    if hashlib.sha256(mbytes).hexdigest() != lfs_manifest_sha256:
        raise BuildError('LFS pointer manifest changed')
    lfs = {p['path']: p for p in json.loads(mbytes)['lfs_pointers']}
    craw = obj(repo, 'commit', commit)
    if craw.split(b'\n', 1)[0] != b'tree ' + tree.encode():
        raise BuildError('commit does not point at the pinned tree')
    files = []
    walk(repo, tree, '', files)
    entries, seen_pointers, total = [], set(), 0
    for path, oid in sorted(files):
        data = obj(repo, 'blob', oid)
        m = POINTER_RE.fullmatch(data)
        if data.startswith(LFS_HEAD) and not m:
            raise BuildError('malformed LFS pointer: ' + path)
        if m:
            p = lfs.get(path)
            if not p or p['lfs_sha256'] != m.group(1).decode() or p['size_bytes'] != int(m.group(2)):
                raise BuildError('LFS pointer differs from reviewed manifest: ' + path)
            seen_pointers.add(path)
            continue
        if path in lfs:
            raise BuildError('reviewed pointer path holds a non-pointer: ' + path)
        total += len(data)
        if total > MAX_TOTAL:
            raise BuildError('non-LFS total too large')
        entries.append((path, data))
    if seen_pointers != set(lfs):
        raise BuildError('reviewed LFS pointer paths missing from the tree')
    manifest = [{'path': p, 'sha256': hashlib.sha256(d).hexdigest(), 'size': len(d)} for p, d in entries]
    fd = os.open(out_tar, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as raw_out, tarfile.open(fileobj=raw_out, mode='w', format=tarfile.PAX_FORMAT) as tf:
        for p, d in entries:
            ti = tarfile.TarInfo(p); ti.size = len(d); ti.mode = 0o644; ti.mtime = 0; ti.uid = ti.gid = 0
            ti.uname = ti.gname = ''
            tf.addfile(ti, io.BytesIO(d))
    full = manifest + [{'path': p, 'sha256': v['lfs_sha256'], 'size': v['size_bytes']}
                       for p, v in sorted(lfs.items()) if not p.startswith(tuple(exclude_prefixes))]
    with open(out_tar, 'rb') as f:
        tsha = hashlib.sha256(f.read()).hexdigest()
    return sorted(full, key=lambda e: e['path']), tsha


def canonical_sha256(manifest):
    return hashlib.sha256(json.dumps(sorted(manifest, key=lambda e: e['path']), sort_keys=True,
                                     separators=(',', ':')).encode()).hexdigest()
