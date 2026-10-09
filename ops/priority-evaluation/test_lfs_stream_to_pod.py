import hashlib, os, shutil, stat, subprocess, sys, tempfile, threading, unittest
from http.server import HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import test_lfs_exact_fetch as T
import lfs_stream_to_pod as S

DATA, OID, TOKEN, REPO = T.DATA, T.OID, T.TOKEN, T.REPO


def fake_ssh(dirpath, mode='ok'):
    p = os.path.join(dirpath, 'fake-ssh')
    log = os.path.join(dirpath, 'ssh.log')
    body = '#!/bin/sh\nprintf "%s\\n" "$@" >> ' + log + '\n'
    if mode == 'exit1':
        body += 'exit 1\n'
    elif mode == 'sleep':  # only the upload command stalls; verify/abort work normally
        body += 'case "$1" in *\'cat >\'*) exec sleep 30 ;; *) exec sh -c "$1" ;; esac\n'
    else:
        body += 'exec sh -c "$1"\n'
    open(p, 'w').write(body)
    os.chmod(p, 0o700)
    return p, log


class T2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = HTTPServer(('127.0.0.1', 0), T.H)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def mk(self, mode='ok', ssh_mode='ok', path='a/w.safetensors'):
        T.STATE.clear(); T.STATE['mode'] = mode
        T.STATE['href'] = f'http://localhost:{self.port}/cdn/obj?sig=SECRET'
        d = tempfile.mkdtemp(); root = os.path.join(d, 'remote'); os.makedirs(root)
        ssh, log = fake_ssh(d, ssh_mode)
        f = S.StreamFetcher(REPO, TOKEN, None, scheme='http', api_host='127.0.0.1', port=self.port,
                            host_ok=lambda h: h == 'localhost', log=lambda m: None,
                            runner=S.SshRunner([ssh], root))
        return f, root, log, [{'path': path, 'oid': OID, 'size': len(DATA)}]

    @staticmethod
    def parts(root):
        return [n for _, _, fs in os.walk(root) for n in fs]

    def test_stream_ok_no_secrets_remote(self):
        f, root, log, objs = self.mk()
        self.assertEqual(f.run(objs), {'a/w.safetensors': OID})
        with open(os.path.join(root, 'a/w.safetensors'), 'rb') as fh:
            self.assertEqual(fh.read(), DATA)
        self.assertEqual(self.parts(root), ['w.safetensors'])
        with open(log) as lf:
            logged = lf.read()
        for secret in (TOKEN, 'SECRET', 'Basic', 'hf_user'):
            self.assertNotIn(secret, logged)
        self.assertEqual(T.STATE['get_auth'], [None])

    def test_bad_sha_leaves_nothing_remote(self):
        f, root, log, objs = self.mk('bad_sha')
        with self.assertRaisesRegex(S.Violation, 'mismatch'):
            f.run(objs)
        self.assertEqual(self.parts(root), [])

    def test_remote_verify_failure_removes_part(self):
        f, root, log, objs = self.mk()
        orig = f.runner.verify_and_publish
        def tamper(rel, size, oid, tag):
            with open(os.path.join(root, rel + '.part.' + tag), 'ab') as fh:
                fh.write(b'x')
            return orig(rel, size, oid, tag)
        f.runner.verify_and_publish = tamper
        with self.assertRaisesRegex(S.Violation, 'remote verification'):
            f.run(objs)
        self.assertEqual(self.parts(root), [])

    def test_existing_part_refused(self):
        f, root, log, objs = self.mk()
        os.makedirs(os.path.join(root, 'a'))
        stale = os.path.join(root, 'a/w.safetensors.part.deadbeef')
        with open(stale, 'w') as fh:
            fh.write('stale')
        self.assertEqual(f.run(objs), {'a/w.safetensors': OID})  # unique tag: no collision
        with open(stale) as fh:
            self.assertEqual(fh.read(), 'stale')  # other run's temp file untouched

    def test_injection_path(self):
        f, root, log, objs = self.mk(path="a/$(touch PWNED);'q' b.safetensors")
        self.assertEqual(f.run(objs), {objs[0]['path']: OID})
        self.assertTrue(os.path.exists(os.path.join(root, objs[0]['path'])))
        self.assertFalse(os.path.exists(os.path.join(root, 'PWNED')) or os.path.exists('PWNED'))

    def test_existing_directory_target_fails(self):
        f, root, log, objs = self.mk(path='a')
        os.makedirs(os.path.join(root, 'a'))
        with self.assertRaisesRegex(S.Violation, 'remote verification'):
            f.run(objs)
        self.assertEqual(self.parts(root), [])

    def test_remote_exits_early_or_never_reads(self):
        for m in ('exit1', 'sleep'):
            f, root, log, objs = self.mk(ssh_mode=m)
            f.runner.timeout = 3
            import time
            t0 = time.monotonic()
            with self.assertRaises(S.Violation):
                f.run(objs)
            self.assertLess(time.monotonic() - t0, 20)
            self.assertEqual(self.parts(root), [])

    def test_signed_redirect_query_not_in_ssh_log(self):
        class R(T.H):
            def do_GET(self):
                T.STATE.setdefault('get_auth', []).append(self.headers.get('Authorization'))
                if self.path.startswith('/cdn/obj'):
                    self.send_response(302); self.send_header('Location', '/cdn/final?sig=SECRET2'); self.end_headers(); return
                self.send_response(200); self.send_header('Content-Length', str(len(DATA))); self.end_headers(); self.wfile.write(DATA)
        srv = HTTPServer(('127.0.0.1', 0), R)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            f, root, log, objs = self.mk()
            T.STATE['href'] = f'http://localhost:{srv.server_address[1]}/cdn/obj?sig=SECRET'
            f.batch = lambda objects: {objs[0]['oid']: T.STATE['href']}
            f.run(objs)
            self.assertEqual(T.STATE['get_auth'], [None, None])
            with open(log) as lf:
                logged = lf.read()
            self.assertNotIn('sig=', logged)
            with open(os.path.join(root, objs[0]['path']), 'rb') as fh:
                self.assertEqual(fh.read(), DATA)
        finally:
            srv.shutdown()

    def test_main_no_secrets_on_failure(self):
        r = subprocess.run(['/usr/bin/python3', '-I', os.path.join(HERE, 'lfs_stream_to_pod.py'), 'o/r', 'm', 'h', 't', '/r', 'ssh'],
                           capture_output=True, text=True, env={'PATH': '/usr/bin'})
        self.assertEqual(r.returncode, 1); self.assertNotIn('Traceback', r.stderr); self.assertNotIn('hf_', r.stderr)

    def test_bad_root_and_empty_argv(self):
        for root in ('rel/path', '/a/../b', '/a b', '/'):
            with self.assertRaises(S.Violation):
                S.SshRunner(['ssh'], root)
        with self.assertRaises(S.Violation):
            S.SshRunner([], '/ok')

    def test_unreviewed_base_refused(self):
        d = tempfile.mkdtemp()
        shutil.copy(os.path.join(HERE, 'lfs_stream_to_pod.py'), d)
        open(os.path.join(d, 'lfs_exact_fetch.py'), 'w').write(open(os.path.join(HERE, 'lfs_exact_fetch.py')).read() + '\n# x\n')
        r = subprocess.run(['/usr/bin/python3', '-I', os.path.join(d, 'lfs_stream_to_pod.py')], capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0); self.assertIn('not the reviewed version', r.stderr + str(r.stdout))

    def test_main_refuses_without_isolation(self):
        r = subprocess.run(['/usr/bin/python3', os.path.join(HERE, 'lfs_stream_to_pod.py'), 'o/r', 'm', 'h', 't', '/r', 'ssh'],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 1); self.assertIn('python3 -I', r.stderr); self.assertNotIn('Traceback', r.stderr)

    def test_redirect_and_foreign_refused_still(self):
        f, root, log, objs = self.mk('redirect_foreign')
        with self.assertRaisesRegex(S.Violation, 'not allowlisted'):
            f.run(objs)
        self.assertEqual(self.parts(root), [])


if __name__ == '__main__':
    unittest.main()
