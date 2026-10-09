#!/usr/bin/python3 -I
"""Stream exact LFS objects from Sandy to an OWN remote host over ssh with no local weight cache.

Reuses the independently reviewed lfs_exact_fetch.Fetcher unchanged (loaded only if its sha256 equals the pin
below): all token / batch / redirect / allowlist logic stays on Sandy and no HF token or signed URL is ever
forwarded to the remote host. Object bytes are hash/size-checked locally while they stream, written remotely to
<path>.part, re-verified remotely (size + sha256sum) and only then renamed into place.
Source only; nothing here has contacted a network service.
"""
import hashlib
import importlib.util
import json
import os
import re
import secrets
import shlex
import subprocess
import sys
import time

BASE_SHA256 = 'e34464e23490270ff67aedaf5bfb6c055d7d302ce927be25499755d032867c75'
_here = os.path.dirname(os.path.abspath(__file__))
_base_path = os.path.join(_here, 'lfs_exact_fetch.py')
with open(_base_path, 'rb') as _f:
    _src = _f.read()
if hashlib.sha256(_src).hexdigest() != BASE_SHA256:
    raise SystemExit('FAILED: lfs_exact_fetch.py is not the reviewed version')
_spec = importlib.util.spec_from_loader('lfs_exact_fetch', loader=None)
L = importlib.util.module_from_spec(_spec)
sys.modules['lfs_exact_fetch'] = L
exec(compile(_src, _base_path, 'exec'), L.__dict__)

Violation = L.Violation
ROOT_RE = re.compile(r'/[A-Za-z0-9._/-]{1,200}')
PUT_CMD = 'set -e; umask 077; mkdir -p "$(dirname "$1")"; set -C; cat > "$1.part.$2"'
CHECK_CMD = ('set -e; f="$1.part.$4"; [ "$(stat -c %s "$f")" = "$2" ] && '
             '[ "$(sha256sum < "$f" | cut -d" " -f1)" = "$3" ] && [ ! -d "$1" ] && mv -f -T "$f" "$1"')
ABORT_CMD = 'rm -f "$1.part.$2"'


class SshRunner:
    """ssh_argv: fixed argv prefix to reach the owned host (e.g. ['ssh','-o','BatchMode=yes',...,'user@host'])."""

    def __init__(self, ssh_argv, remote_root, timeout=900):
        if not ssh_argv or not ROOT_RE.fullmatch(remote_root) or '..' in remote_root.split('/'):
            raise Violation('bad remote root')
        self.argv, self.root, self.timeout = list(ssh_argv), remote_root.rstrip('/'), timeout

    def _cmd(self, script, *args):
        return self.argv + ['sh -c ' + shlex.quote(script) + ' sh ' + ' '.join(shlex.quote(a) for a in args)]

    def remote_path(self, rel):
        return self.root + '/' + rel

    def open_put(self, rel, tag):
        return subprocess.Popen(self._cmd(PUT_CMD, self.remote_path(rel), tag), stdin=subprocess.PIPE,
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def verify_and_publish(self, rel, size, oid, tag):
        try:
            r = subprocess.run(self._cmd(CHECK_CMD, self.remote_path(rel), str(size), oid, tag), stdin=subprocess.DEVNULL,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=self.timeout)
        except subprocess.TimeoutExpired:
            raise Violation('remote verification timed out for ' + oid[:12])
        if r.returncode != 0:
            raise Violation('remote verification failed for ' + oid[:12])

    def abort(self, rel, tag):
        try:
            subprocess.run(self._cmd(ABORT_CMD, self.remote_path(rel), tag), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=60)
        except Exception:
            pass


class StreamFetcher(L.Fetcher):
    def __init__(self, *a, runner, **kw):
        super().__init__(*a, **kw)
        self.runner = runner

    def download(self, oid, size, href, rel):
        tag = secrets.token_hex(8)  # unique remote temp name per object per run
        proc = self.runner.open_put(rel, tag)
        h, got = hashlib.sha256(), 0
        try:
            url = href
            for hop in range(L.MAX_REDIRECTS + 1):
                u = L.urlsplit(self._check_url(url))
                conn = self._conn(u.hostname, u.port)
                try:
                    conn.request('GET', u.path + ('?' + u.query if u.query else ''), headers={'Host': u.netloc})
                    r = conn.getresponse()
                    if 300 <= r.status < 400:
                        loc = r.getheader('Location') or ''
                        if not loc or hop == L.MAX_REDIRECTS:
                            raise Violation('redirect limit or empty location')
                        url = L.urljoin(url, loc)
                        continue
                    if r.status != 200:
                        raise Violation(f'download status {r.status}')
                    while True:
                        if time.monotonic() > self.deadline:
                            raise Violation('wall-clock limit exceeded')
                        buf = r.read(L.CHUNK)
                        if not buf:
                            break
                        got += len(buf)
                        if got > size:
                            raise Violation('object larger than manifest size')
                        h.update(buf)
                        try:
                            proc.stdin.write(buf)
                        except OSError:
                            raise Violation('remote write failed for ' + oid[:12])
                    break
                finally:
                    conn.close()
            if got != size or h.hexdigest() != oid:
                raise Violation('size/sha256 mismatch for ' + oid[:12])
            try:
                proc.stdin.close()
            except OSError:
                raise Violation('remote write failed for ' + oid[:12])
            try:
                rc = proc.wait(timeout=self.runner.timeout)
            except subprocess.TimeoutExpired:
                raise Violation('remote write timed out for ' + oid[:12])
            if rc != 0:
                raise Violation('remote write failed for ' + oid[:12])
            self.runner.verify_and_publish(rel, size, oid, tag)
        except BaseException:
            try:
                proc.stdin.close()
            except Exception:
                pass
            try:
                proc.kill()
                proc.wait(timeout=30)
            except Exception:
                pass
            self.runner.abort(rel, tag)
            raise

    def _run(self, objects):
        hrefs = self.batch(objects)
        done = {}
        for o in objects:
            self.log(f"stream {o['path']} size={o['size']}")
            self.download(o['oid'], o['size'], hrefs[o['oid']], o['path'])
            done[o['path']] = o['oid']
        return done


def main(argv):
    if len(argv) < 7:
        print('usage: lfs_stream_to_pod.py <repo> <manifest.json> <helper.py> <token_file> <remote_root> <ssh_argv...>',
              file=sys.stderr)
        return 2
    try:
        if not sys.flags.isolated or any(k in os.environ for k in L.FORBIDDEN_ENV):
            raise Violation('run with python3 -I and without SSL_*/OPENSSL_*/SSLKEYLOGFILE variables')
        repo, manifest, helper, token_file, root = argv[1:6]
        f = StreamFetcher(repo, L.token_from_helper(helper, repo, token_file), None,
                          runner=SshRunner(argv[6:], root))
        done = f.run(L.load_manifest(manifest))
        print(json.dumps({'repository': repo, 'remote_root': root, 'objects': done, 'requests': f.requests}, indent=1))
        return 0
    except BaseException as e:
        print('FAILED: ' + (str(e) if isinstance(e, Violation) else type(e).__name__)
              + ' (treat remote root as invalid)', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
