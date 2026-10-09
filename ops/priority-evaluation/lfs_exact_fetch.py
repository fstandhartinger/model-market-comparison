#!/usr/bin/python3 -I
"""First-party exact-object Git-LFS downloader for one pinned Hugging Face repository.

Replaces installed git-lfs for host acquisition (review findings F1-F3):
  * no git config, .lfsconfig, netrc, insteadOf, proxy or extraHeader is ever read;
  * the batch endpoint is a constant derived from the repository name;
  * the account token is requested once from the unchanged get-only credential helper,
    kept only in memory and sent ONLY to the exact batch URL, with zero redirects;
  * object downloads never carry the account token; every hop (incl. redirects) is
    re-validated against a host allowlist, https only, no userinfo, <=3 redirects;
  * server-supplied action headers are refused; objects are bound to the manifest
    (sha256 + exact size); hard request-count and wall-clock limits; no URL queries
    or headers are ever logged.
Source only: nothing here has contacted a network service.
"""
import hashlib
import http.client
import json
import os
import re
import signal
import ssl
import subprocess
import sys
import time
from urllib.parse import urljoin, urlsplit

API_HOST = 'huggingface.co'
REPO_RE = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]{0,99}/[A-Za-z0-9][A-Za-z0-9._-]{0,99}')
OID_RE = re.compile(r'[0-9a-f]{64}')
MAX_REQUESTS = 40
MAX_REDIRECTS = 3
DEFAULT_DEADLINE_S = 4 * 3600
CHUNK = 1 << 20
CA_FILE = '/etc/ssl/certs/ca-certificates.crt'
FORBIDDEN_ENV = ('SSL_CERT_FILE', 'SSL_CERT_DIR', 'OPENSSL_CONF', 'SSLKEYLOGFILE', 'OPENSSL_MODULES')
LOOPBACK = ('127.0.0.1', 'localhost', '::1')


class Violation(Exception):
    pass


def default_host_ok(host: str) -> bool:
    return host == API_HOST or host.endswith('.huggingface.co') or host.endswith('.hf.co')


class Fetcher:
    def __init__(self, repository, token, outdir, *, scheme='https', api_host=API_HOST, port=None,
                 host_ok=default_host_ok, deadline_s=DEFAULT_DEADLINE_S, log=None):
        if not REPO_RE.fullmatch(repository):
            raise Violation('bad repository')
        if scheme not in ('https', 'http'):
            raise Violation('bad scheme')
        if scheme == 'http' and api_host not in LOOPBACK:  # token never travels over plain http
            raise Violation('plain http only for loopback tests')
        self.repo, self.token = repository, token
        self.scheme, self.api_host, self.port = scheme, api_host, port
        self.host_ok, self.deadline = host_ok, time.monotonic() + deadline_s
        self.outdir, self.requests = outdir, 0
        self.log = log or (lambda m: print(m, file=sys.stderr))
        self.batch_path = f'/{repository}.git/info/lfs/objects/batch'

    def _conn(self, host, port):
        self.requests += 1
        if self.requests > MAX_REQUESTS:
            raise Violation('request budget exceeded')
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise Violation('wall-clock limit exceeded')
        timeout = min(120, remaining)
        if self.scheme == 'https':
            ctx = ssl.create_default_context(cafile=CA_FILE)  # explicit trust, no env-driven paths
            return http.client.HTTPSConnection(host, port, timeout=timeout, context=ctx)
        return http.client.HTTPConnection(host, port, timeout=timeout)

    def batch(self, objects):
        import base64
        body = json.dumps({'operation': 'download', 'transfers': ['basic'], 'hash_algo': 'sha256',
                           'objects': [{'oid': o['oid'], 'size': o['size']} for o in objects]}).encode()
        auth = base64.b64encode(b'hf_user:' + self.token.encode()).decode()
        conn = self._conn(self.api_host, self.port)
        try:
            conn.request('POST', self.batch_path, body, {
                'Authorization': 'Basic ' + auth, 'Host': self.api_host,
                'Accept': 'application/vnd.git-lfs+json', 'Content-Type': 'application/vnd.git-lfs+json'})
            resp = conn.getresponse()
            if 300 <= resp.status < 400:
                raise Violation('redirect on authenticated batch endpoint refused')  # F1/F2
            if resp.status != 200:
                raise Violation(f'batch status {resp.status}')
            data = resp.read(4 << 20)
        finally:
            conn.close()
        self.token = None
        doc = json.loads(data)
        if doc.get('transfer', 'basic') != 'basic':
            raise Violation('non-basic transfer refused')
        by_oid = {}
        for entry in doc.get('objects', []):
            by_oid[entry.get('oid')] = entry
        out = {}
        for o in objects:
            e = by_oid.get(o['oid'])
            if not e or e.get('size') != o['size'] or 'error' in e:
                raise Violation('batch response does not match manifest object ' + o['oid'][:12])
            dl = (e.get('actions') or {}).get('download')
            if not dl or set((e.get('actions') or {})) - {'download'}:
                raise Violation('unexpected actions for ' + o['oid'][:12])
            if dl.get('header'):
                raise Violation('server-supplied headers refused')  # F4
            out[o['oid']] = self._check_url(dl.get('href', ''))
        return out

    def _check_url(self, href):
        u = urlsplit(href)
        if u.scheme != self.scheme or u.username or u.password or not u.hostname:
            raise Violation('href scheme/userinfo refused')
        if not self.host_ok(u.hostname) and u.hostname != self.api_host:
            raise Violation('href host not allowlisted: ' + u.hostname)
        if self.scheme == 'https' and u.port not in (None, 443):
            raise Violation('href port refused')
        if u.hostname == self.api_host and not (
                u.path == f'/{self.repo}' or u.path.startswith((f'/{self.repo}/', f'/{self.repo}.git/'))):
            raise Violation('same-host href outside exact repository refused')  # F1/F3
        return href

    def download(self, oid, size, href, dest):
        part = dest + '.part'
        fd = os.open(part, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        h, got = hashlib.sha256(), 0
        try:
            with os.fdopen(fd, 'wb') as f:
                url = href
                for hop in range(MAX_REDIRECTS + 1):
                    u = urlsplit(self._check_url(url))
                    conn = self._conn(u.hostname, u.port)
                    try:
                        target = u.path + ('?' + u.query if u.query else '')
                        conn.request('GET', target, headers={'Host': u.netloc})  # never our token
                        r = conn.getresponse()
                        if 300 <= r.status < 400:
                            loc = r.getheader('Location') or ''
                            if not loc or hop == MAX_REDIRECTS:
                                raise Violation('redirect limit or empty location')
                            url = urljoin(url, loc)
                            continue
                        if r.status != 200:
                            raise Violation(f'download status {r.status}')
                        while True:
                            if time.monotonic() > self.deadline:
                                raise Violation('wall-clock limit exceeded')
                            buf = r.read(CHUNK)
                            if not buf:
                                break
                            got += len(buf)
                            if got > size:
                                raise Violation('object larger than manifest size')
                            h.update(buf)
                            f.write(buf)
                        break
                    finally:
                        conn.close()
            if got != size or h.hexdigest() != oid:
                raise Violation('size/sha256 mismatch for ' + oid[:12])
            os.replace(part, dest)
        except BaseException:
            try:
                os.unlink(part)
            except OSError:
                pass
            raise

    def run(self, objects):
        """objects: list of {path, oid(sha256), size}. Returns dict path -> sha256."""
        seen = set()
        for o in objects:
            if not OID_RE.fullmatch(o['oid']) or type(o['size']) is not int or o['size'] <= 0:
                raise Violation('bad manifest entry')
            p = o['path']
            if p.startswith('/') or '\x00' in p or any(c in ('', '.', '..') for c in p.split('/')):
                raise Violation('unsafe path')
            if p in seen:
                raise Violation('duplicate path')
            seen.add(p)
        def _alarm(signum, frame):
            raise Violation('hard wall-clock limit exceeded')
        old = signal.signal(signal.SIGALRM, _alarm)
        signal.setitimer(signal.ITIMER_REAL, max(1.0, self.deadline - time.monotonic()))
        try:
            return self._run(objects)
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
            signal.signal(signal.SIGALRM, old)

    def _run(self, objects):
        hrefs = self.batch(objects)
        done = {}
        for o in objects:
            dest = os.path.join(self.outdir, o['path'])
            os.makedirs(os.path.dirname(dest), mode=0o700, exist_ok=True)
            self.log(f"fetch {o['path']} size={o['size']}")
            self.download(o['oid'], o['size'], hrefs[o['oid']], dest)
            done[o['path']] = o['oid']
        return done


def token_from_helper(helper, repository, token_file):
    env = {'PATH': '/usr/bin:/bin', 'HF_CREDENTIAL_REPOSITORY': repository, 'HF_CREDENTIAL_TOKEN_FILE': token_file}
    inp = f'protocol=https\nhost={API_HOST}\npath={repository}.git\n\n'
    out = subprocess.run(['/usr/bin/python3', '-I', helper, 'get'], input=inp, env=env,
                         capture_output=True, text=True, timeout=10, check=False).stdout
    for line in out.splitlines():
        if line.startswith('password='):
            return line[len('password='):]
    raise Violation('credential helper returned nothing')


def load_manifest(path, exclude_prefixes=('audio_notes/',)):
    with open(path) as f:
        doc = json.load(f)
    return [{'path': p['path'], 'oid': p['lfs_sha256'], 'size': p['size_bytes']}
            for p in doc['lfs_pointers'] if not p['path'].startswith(exclude_prefixes)]


def main(argv):
    if len(argv) != 6:
        print('usage: lfs_exact_fetch.py <repo> <manifest.json> <helper.py> <token_file> <new_outdir>', file=sys.stderr)
        return 2
    try:
        if not sys.flags.isolated or any(k in os.environ for k in FORBIDDEN_ENV):
            raise Violation('run with python3 -I and without SSL_*/OPENSSL_*/SSLKEYLOGFILE variables')
        repo, manifest, helper, token_file, outdir = argv[1:]
        os.makedirs(outdir, mode=0o700, exist_ok=False)
        f = Fetcher(repo, token_from_helper(helper, repo, token_file), outdir)
        done = f.run(load_manifest(manifest))
        print(json.dumps({'repository': repo, 'objects': done, 'requests': f.requests}, indent=1))
        return 0
    except BaseException as e:  # never print tracebacks: they can embed signed URLs
        print('FAILED: ' + (str(e) if isinstance(e, Violation) else type(e).__name__)
              + ' (treat outdir as invalid)', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
