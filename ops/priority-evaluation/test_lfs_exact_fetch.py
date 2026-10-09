import hashlib, json, os, sys, tempfile, threading, unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lfs_exact_fetch as L

REPO = 'owner/repo'
TOKEN = 'hf_' + 'A' * 30
DATA = b'weights-bytes' * 100
OID = hashlib.sha256(DATA).hexdigest()
STATE = {}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        STATE.setdefault('batch_auth', []).append(self.headers.get('Authorization'))
        self.rfile.read(int(self.headers.get('Content-Length', 0)))
        mode = STATE['mode']
        if mode == 'batch_401':
            self.send_response(401); self.send_header('Content-Length', '0'); self.end_headers(); return
        if mode in ('batch_xet', 'batch_missing', 'batch_upload', 'batch_error', 'batch_size'):
            ent = {'oid': OID, 'size': len(DATA), 'actions': {'download': {'href': STATE['href']}}}
            doc = {'transfer': 'basic', 'objects': [ent]}
            if mode == 'batch_xet': doc['transfer'] = 'xet'
            if mode == 'batch_missing': doc['objects'] = []
            if mode == 'batch_upload': ent['actions']['upload'] = {'href': STATE['href']}
            if mode == 'batch_error': ent['error'] = {'code': 404}
            if mode == 'batch_size': ent['size'] = 1
            body = json.dumps(doc).encode()
            self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        if mode == 'batch_redirect':
            self.send_response(307); self.send_header('Location', '/other/repo.git/info/lfs/objects/batch'); self.end_headers(); return
        href = STATE['href']
        act = {'download': {'href': href}}
        if mode == 'header':
            act['download']['header'] = {'Authorization': 'Bearer x'}
        body = json.dumps({'transfer': 'basic', 'objects': [{'oid': OID, 'size': len(DATA), 'actions': act}]}).encode()
        self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        STATE.setdefault('get_auth', []).append(self.headers.get('Authorization'))
        mode = STATE['mode']
        if mode == 'redirect_loop':
            self.send_response(302); self.send_header('Location', self.path); self.end_headers(); return
        if mode == 'redirect_foreign':
            self.send_response(302); self.send_header('Location', 'http://evil.example/x'); self.end_headers(); return
        if mode == 'drip':
            self.send_response(200); self.send_header('Content-Length', str(len(DATA))); self.end_headers()
            import time as _t
            try:
                for _ in range(40):
                    self.wfile.write(b'x'); self.wfile.flush(); _t.sleep(0.3)
            except OSError:
                pass
            return
        if mode == 'ctl_location':
            self.send_response(302); self.send_header('Location', 'http://localhost:%d/a b\x01?sig=SECRET' % self.server.server_address[1]); self.end_headers(); return
        data = {'bad_sha': b'x' * len(DATA), 'oversize': DATA + b'!'}.get(mode, DATA)
        self.send_response(200); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = HTTPServer(('127.0.0.1', 0), H)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def run_mode(self, mode, href=None):
        STATE.clear(); STATE['mode'] = mode
        STATE['href'] = href or f'http://localhost:{self.port}/cdn/obj?sig=SECRET'
        logs = []
        d = tempfile.mkdtemp()
        f = L.Fetcher(REPO, TOKEN, d, scheme='http', api_host='127.0.0.1', port=self.port,
                      host_ok=lambda h: h == 'localhost', log=logs.append)
        f.batch_path = f'/{REPO}.git/info/lfs/objects/batch'
        return f, d, logs, [{'path': 'a/w.safetensors', 'oid': OID, 'size': len(DATA)}]

    def test_ok_and_token_never_on_download(self):
        f, d, logs, objs = self.run_mode('ok')
        self.assertEqual(f.run(objs), {'a/w.safetensors': OID})
        with open(os.path.join(d, 'a/w.safetensors'), 'rb') as fh:
            self.assertEqual(fh.read(), DATA)
        self.assertEqual(STATE['get_auth'], [None])
        self.assertEqual(len(STATE['batch_auth']), 1)
        self.assertNotIn('SECRET', ''.join(logs)); self.assertNotIn(TOKEN, ''.join(logs))

    def test_batch_redirect_refused(self):
        f, d, _, objs = self.run_mode('batch_redirect')
        with self.assertRaisesRegex(L.Violation, 'redirect on authenticated'):
            f.run(objs)

    def test_foreign_href_refused(self):
        f, d, _, objs = self.run_mode('ok', href='http://evil.example/x')
        with self.assertRaisesRegex(L.Violation, 'not allowlisted'):
            f.run(objs)

    def test_userinfo_href_refused(self):
        f, d, _, objs = self.run_mode('ok', href=f'http://u:p@127.0.0.1:{self.port}/x')
        with self.assertRaisesRegex(L.Violation, 'userinfo'):
            f.run(objs)

    def test_same_host_other_repo_refused(self):
        f, d, _, objs = self.run_mode('ok', href=f'http://127.0.0.1:{self.port}/other/repo/resolve/x')
        f.host_ok = lambda h: False
        with self.assertRaisesRegex(L.Violation, 'outside exact repository'):
            f.run(objs)

    def test_server_header_refused(self):
        f, d, _, objs = self.run_mode('header')
        with self.assertRaisesRegex(L.Violation, 'headers refused'):
            f.run(objs)

    def test_redirect_loop_bounded(self):
        f, d, _, objs = self.run_mode('redirect_loop')
        with self.assertRaisesRegex(L.Violation, 'redirect limit'):
            f.run(objs)
        self.assertEqual(os.listdir(os.path.join(d, 'a')), [])

    def test_redirect_foreign_refused(self):
        f, d, _, objs = self.run_mode('redirect_foreign')
        with self.assertRaisesRegex(L.Violation, 'not allowlisted'):
            f.run(objs)

    def test_bad_sha_and_oversize(self):
        for m, msg in (('bad_sha', 'mismatch'), ('oversize', 'larger')):
            f, d, _, objs = self.run_mode(m)
            with self.assertRaisesRegex(L.Violation, msg):
                f.run(objs)
            self.assertEqual(os.listdir(os.path.join(d, 'a')), [])

    def test_request_budget(self):
        f, d, _, objs = self.run_mode('ok')
        f.requests = L.MAX_REQUESTS
        with self.assertRaisesRegex(L.Violation, 'budget'):
            f.run(objs)

    def test_batch_edge_cases(self):
        for m, msg in (('batch_401', 'batch status 401'), ('batch_xet', 'non-basic'), ('batch_missing', 'does not match'),
                       ('batch_upload', 'unexpected actions'), ('batch_error', 'does not match'), ('batch_size', 'does not match')):
            f, d, _, objs = self.run_mode(m)
            with self.assertRaisesRegex(L.Violation, msg):
                f.run(objs)

    def test_batch_auth_exact_and_token_cleared(self):
        import base64
        f, d, _, objs = self.run_mode('ok')
        f.run(objs)
        self.assertEqual(STATE['batch_auth'], ['Basic ' + base64.b64encode(b'hf_user:' + TOKEN.encode()).decode()])
        self.assertIsNone(f.token)

    def test_hard_deadline_slow_drip(self):
        import time
        f, d, _, objs = self.run_mode('drip')
        f.deadline = time.monotonic() + 1
        t = time.monotonic()
        with self.assertRaisesRegex(L.Violation, 'wall-clock'):
            f.run(objs)
        self.assertLess(time.monotonic() - t, 5)

    def test_default_allowlist_siblings_port_and_http(self):
        f = L.Fetcher(REPO, TOKEN, tempfile.mkdtemp())
        for bad, msg in (('https://huggingface.co/owner/repo-evil/x', 'outside exact'),
                         ('https://huggingface.co/owner/repository/x', 'outside exact'),
                         ('https://huggingface.co:8443/owner/repo/x', 'port'),
                         ('https://evilhuggingface.co/x', 'not allowlisted'),
                         ('http://cdn-lfs.hf.co/x', 'scheme'),
                         ('https://huggingface.co/other/repo/resolve/x', 'outside exact')):
            with self.assertRaisesRegex(L.Violation, msg):
                f._check_url(bad)
        for good in ('https://huggingface.co/owner/repo/resolve/x', 'https://cdn-lfs.hf.co/x?sig=1',
                     'https://huggingface.co/owner/repo.git/info/lfs/objects/abc'):
            f._check_url(good)
        with self.assertRaisesRegex(L.Violation, 'loopback'):
            L.Fetcher(REPO, TOKEN, tempfile.mkdtemp(), scheme='http')

    def test_manifest_gaps(self):
        f, d, _, _ = self.run_mode('ok')
        for objs in ([{'path': 'a', 'oid': OID, 'size': True}],
                     [{'path': 'a', 'oid': OID, 'size': 1}, {'path': 'a', 'oid': OID, 'size': 1}],
                     [{'path': 'a//b', 'oid': OID, 'size': 1}], [{'path': './b', 'oid': OID, 'size': 1}]):
            with self.assertRaises(L.Violation):
                f.run(objs)

    def test_control_char_location_no_secret_in_main_output(self):
        f, d, _, objs = self.run_mode('ctl_location')
        with self.assertRaises(Exception) as cm:
            f.run(objs)
        shown = str(cm.exception) if isinstance(cm.exception, L.Violation) else type(cm.exception).__name__
        self.assertNotIn('SECRET', shown)

    def test_helper_real(self):
        import stat
        here = os.path.dirname(os.path.abspath(__file__))
        tf = os.path.join(tempfile.mkdtemp(), 'tok'); fd = os.open(tf, os.O_WRONLY | os.O_CREAT, 0o600)
        os.write(fd, TOKEN.encode()); os.close(fd)
        self.assertEqual(L.token_from_helper(os.path.join(here, 'hf_git_credential.py'), 'empiriolabsai/aplomb-1', tf), TOKEN)
        with self.assertRaises(L.Violation):
            L.token_from_helper(os.path.join(here, 'hf_git_credential.py'), 'empiriolabsai/aplomb-1', tf + 'x')

    def test_main_refuses_without_isolation_and_prints_no_traceback(self):
        import subprocess
        here = os.path.dirname(os.path.abspath(__file__))
        a = ['x', 'owner/repo', 'm', 'h', 't', os.path.join(tempfile.mkdtemp(), 'o')]
        r = subprocess.run(['/usr/bin/python3', os.path.join(here, 'lfs_exact_fetch.py')] + a[1:], capture_output=True, text=True)
        self.assertEqual(r.returncode, 1); self.assertIn('python3 -I', r.stderr); self.assertNotIn('Traceback', r.stderr)
        env = {'PATH': '/usr/bin', 'SSL_CERT_FILE': '/x'}
        r = subprocess.run(['/usr/bin/python3', '-I', os.path.join(here, 'lfs_exact_fetch.py')] + a[1:], capture_output=True, text=True, env=env)
        self.assertEqual(r.returncode, 1); self.assertIn('FAILED', r.stderr)

    def test_unsafe_manifest(self):
        f, d, _, _ = self.run_mode('ok')
        with self.assertRaisesRegex(L.Violation, 'unsafe path'):
            f.run([{'path': '../x', 'oid': OID, 'size': 1}])

    def test_manifest_excludes_audio_notes(self):
        import synthetic_pointer_manifest as SPM
        m = L.load_manifest(SPM.make())
        self.assertEqual(len(m), 5)
        self.assertFalse(any(o['path'].startswith('audio_notes') for o in m))
        self.assertEqual(sum(o['size'] for o in m), 94402904 + 1295918896 + 6601452576 + 3990429440 + 20037157)


if __name__ == '__main__':
    unittest.main()
