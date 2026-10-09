"""Glue: stream the reviewed LFS object set from Sandy to ONE owned Lium pod (host side only).

Pins every input by hash (read once, then run from a private copy), looks up the exact RUNNING pod,
pins its ed25519 host key obtained through the provider's authenticated exec channel, and runs the
independently reviewed lfs_stream_to_pod.py as a separate `env -i python3 -I` process under an outer
hard timeout. No HF token, signed URL or Authorization value is handled or logged here. Source only;
never run against a real pod without the host-staging acceptance receipt.
"""
import base64
import hashlib
import io
import ipaddress
import json
import os
import re
import subprocess
import tarfile
import tempfile

POD_RE = re.compile(r'[A-Za-z0-9][A-Za-z0-9-]{0,63}')
HOSTKEY_RE = re.compile(r'(ssh-ed25519) (AAAAC3NzaC1lZDI1NTE5AAAAI[A-Za-z0-9+/]{43})( \S+)?')
LIUM = os.path.expanduser('~/.local/bin/lium')
REMOTE_ROOT_RE = re.compile(r'/[A-Za-z0-9._/-]{1,200}')
SAFE_TAR_NAME = re.compile(r'[A-Za-z0-9_./-]{1,200}')


class StreamError(Exception):
    pass


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def canonical_sha256(manifest):
    return sha256_bytes(json.dumps(sorted(manifest, key=lambda e: e['path']), sort_keys=True,
                                   separators=(',', ':')).encode())


def ssh_argv(ip, port, key_path, known_hosts):
    try:
        ok = type(port) is int and 1 <= port <= 65535 and isinstance(ip, str) and str(ipaddress.IPv4Address(ip)) == ip
    except ValueError:
        ok = False
    if not ok:
        raise StreamError('bad pod address')
    return ['/usr/bin/ssh', '-F', '/dev/null', '-i', key_path, '-p', str(port),
            '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes',
            '-o', 'UserKnownHostsFile=' + known_hosts, '-o', 'GlobalKnownHostsFile=/dev/null',
            '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'UpdateHostKeys=no', '-o', 'ConnectTimeout=30',
            '-o', 'ProxyCommand=none', '-o', 'ControlMaster=no', '-o', 'ControlPath=none',
            '-o', 'ForwardAgent=no', '-o', 'ForwardX11=no', '-o', 'ClearAllForwardings=yes',
            '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=6', '-o', 'RequestTTY=no',
            'root@' + ip]


def pod_row(pod_id, run):
    r = run([LIUM, 'ps', pod_id, '--format', 'json'], capture_output=True, text=True, timeout=60,
            stdin=subprocess.DEVNULL, errors='replace')
    if r.returncode:
        raise StreamError('pod listing failed')
    try:
        rows = json.loads(r.stdout)
    except ValueError:
        raise StreamError('pod listing unreadable')
    rows = rows if isinstance(rows, list) else [rows]
    rows = [x for x in rows if isinstance(x, dict) and x.get('id') == pod_id]
    if len(rows) != 1 or rows[0].get('status') != 'RUNNING':
        raise StreamError('exact running pod not found')
    return rows[0]


def host_key(text):
    lines = [l for l in (text or '').splitlines() if l.strip()]
    m = HOSTKEY_RE.fullmatch(lines[0]) if len(lines) == 1 else None
    if not m:
        raise StreamError('pod host key unavailable')
    blob = base64.b64decode(m.group(2), validate=True)
    if len(blob) != 51 or blob[:4] != b'\0\0\0\x0b' or blob[4:15] != b'ssh-ed25519' or blob[15:19] != b'\0\0\0\x20':
        raise StreamError('pod host key malformed')
    return 'ssh-ed25519 ' + m.group(2)


def make_streamer(*, repository, full_manifest_sha256, manifest_path, manifest_sha256, wrapper_path, wrapper_sha256,
                  base_path, base_sha256, helper_path, helper_sha256, nonlfs_tar_path, nonlfs_tar_sha256, token_file, key_path,
                  timeout_s=3600, run=subprocess.run):
    """Return weights_streamer(provider, pod_id, entries, remote_root) for pod_runner host_staging.

    entries = the full runner manifest (all files, LFS and non-LFS). The pinned non-LFS tar (built offline from the
    pinned git tree) is uploaded through the provider channel; only the 5 reviewed LFS objects are streamed over ssh.
    Anything not in the pinned full manifest is refused."""
    def preflight(entries):
        """Everything that does not need the pod. Returns (blobs, tar_bytes, have, by_path). Raises StreamError."""
        blobs = {}
        for name, path, want in (('manifest', manifest_path, manifest_sha256), ('lfs_stream_to_pod.py', wrapper_path, wrapper_sha256),
                                 ('lfs_exact_fetch.py', base_path, base_sha256), ('hf_git_credential.py', helper_path, helper_sha256)):
            with open(path, 'rb') as f:
                data = f.read()
            if sha256_bytes(data) != want:
                raise StreamError('pinned streaming input changed')
            blobs[name] = data
        with open(nonlfs_tar_path, 'rb') as f:
            tar_bytes = f.read()
        if sha256_bytes(tar_bytes) != nonlfs_tar_sha256:
            raise StreamError('pinned non-LFS tar changed')
        ok = isinstance(entries, list) and all(isinstance(e, dict) and isinstance(e.get('path'), str) for e in entries)
        paths = [e['path'] for e in entries] if ok else None
        if not paths or len(set(paths)) != len(paths):
            raise StreamError('runner manifest differs from the pinned full manifest')
        try:
            canonical = canonical_sha256(entries)
        except (KeyError, TypeError, ValueError):
            raise StreamError('runner manifest differs from the pinned full manifest') from None
        if canonical != full_manifest_sha256:
            raise StreamError('runner manifest differs from the pinned full manifest')
        pointers = {p['path']: p for p in json.loads(blobs['manifest'])['lfs_pointers']}
        have = {p: (v['lfs_sha256'], v['size_bytes']) for p, v in pointers.items() if not p.startswith('audio_notes/')}
        by_path = {e['path']: (e['sha256'], e['size']) for e in entries}
        if any(p.startswith('audio_notes/') and p in pointers for p in by_path) or any(by_path.get(p) != have[p] for p in have):
            raise StreamError('runner manifest differs from reviewed LFS object set')
        # The non-LFS tar must contain exactly the non-LFS manifest files: regular, safe names, matching size and sha256.
        expected = {p: v for p, v in by_path.items() if p not in have}
        try:
            with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as tf:
                members = tf.getmembers()
                names = [m.name for m in members]
                if len(set(names)) != len(names) or set(names) != set(expected):
                    raise StreamError('non-LFS tar content differs from the manifest')
                for m in members:
                    data = tf.extractfile(m).read() if m.isfile() else None
                    if data is None or not SAFE_TAR_NAME.fullmatch(m.name) or any(c in ('', '.', '..') for c in m.name.split('/')) \
                            or (sha256_bytes(data), len(data)) != expected[m.name]:
                        raise StreamError('non-LFS tar member differs from the manifest')
        except tarfile.TarError:
            raise StreamError('non-LFS tar unreadable') from None
        return blobs, tar_bytes, have, by_path

    def streamer(provider, pod_id, entries, remote_root):
        if not isinstance(pod_id, str) or not POD_RE.fullmatch(pod_id) or not isinstance(remote_root, str) \
                or not REMOTE_ROOT_RE.fullmatch(remote_root) or '..' in remote_root.split('/'):
            raise StreamError('bad pod id or remote root')
        blobs, tar_bytes, have, by_path = preflight(entries)
        row = pod_row(pod_id, run)
        ip, port = row.get('ip'), (row.get('ports') or {}).get('22')
        out = provider.exec(pod_id, ['cat', '/etc/ssh/ssh_host_ed25519_key.pub'], timeout=60)
        if getattr(out, 'returncode', 1) != 0:
            raise StreamError('pod host key unavailable')
        key = host_key(out.stdout)
        ssh_argv(ip, port, key_path, '/nonexistent')  # validate the address before writing anything
        with tempfile.TemporaryDirectory(prefix='pod-stream-') as tmp:
            os.chmod(tmp, 0o700)
            tar_local = os.path.join(tmp, 'non-lfs.tar')
            with open(tar_local, 'wb') as f:
                f.write(tar_bytes)
            for cmd in (['mkdir', '-p', '/work'],):
                if provider.exec(pod_id, cmd, timeout=60).returncode != 0:
                    raise StreamError('pod work directory unavailable')
            provider.scp_to(pod_id, tar_local, '/work/non-lfs.tar')
            unpack = provider.exec(pod_id, ['sh', '-c', 'set -e; mkdir -p "$1"; tar --no-same-owner --no-same-permissions -xf /work/non-lfs.tar -C "$1"', 'sh', remote_root], timeout=600)
            if unpack.returncode != 0:
                raise StreamError('non-LFS files could not be unpacked')
            for name, data in blobs.items():  # run exactly the bytes that were hashed
                with open(os.path.join(tmp, name), 'wb') as f:
                    f.write(data)
            kh = os.path.join(tmp, 'known_hosts')
            with open(kh, 'w') as f:
                f.write(f'{ip if port == 22 else f"[{ip}]:{port}"} {key}\n')
            argv = ['/usr/bin/timeout', '-s', 'KILL', str(timeout_s), '/usr/bin/env', '-i', 'PATH=/usr/bin:/bin',
                    '/usr/bin/python3', '-I', os.path.join(tmp, 'lfs_stream_to_pod.py'), repository,
                    os.path.join(tmp, 'manifest'), os.path.join(tmp, 'hf_git_credential.py'), token_file,
                    remote_root] + ssh_argv(ip, port, key_path, kh)
            r = run(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
                    errors='replace', timeout=timeout_s + 60)
        if r.returncode:
            raise StreamError(f'weights stream failed (rc={r.returncode}); treat the remote root as invalid')
        try:
            doc = json.loads(r.stdout)
        except ValueError:
            doc = None
        done = doc.get('objects') if isinstance(doc, dict) else None
        if not isinstance(doc, dict) or doc.get('repository') != repository or doc.get('remote_root') != remote_root \
                or not isinstance(done, dict) or set(done) != set(have) \
                or any(not isinstance(v, str) or v != have[p][0] for p, v in done.items()):
            raise StreamError('stream receipt does not match the reviewed object set')
        return {'streamed': sorted(done), 'non_lfs_uploaded': sorted(set(by_path) - set(have))}
    streamer.preflight = preflight
    return streamer
