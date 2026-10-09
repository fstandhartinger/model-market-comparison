import hashlib, json, os, re, sys, types, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pod_weights_streamer as P

HERE = os.path.dirname(os.path.abspath(__file__))
import synthetic_pointer_manifest as SPM
MAN = SPM.make()
POD = 'e2beb6a5-fea6-4018-9a97-e7f1ab32a1b9'
import base64
BLOB = base64.b64encode(b'\0\0\0\x0bssh-ed25519\0\0\0\x20' + bytes(range(32))).decode()
KEY = 'ssh-ed25519 ' + BLOB
REPO = 'empiriolabsai/aplomb-1'
import tempfile
import io, tarfile


def make_tar(members):
    path = os.path.join(tempfile.mkdtemp(), 'non-lfs.tar')
    with tarfile.open(path, 'w') as tf:
        for name, data, kind in members:
            ti = tarfile.TarInfo(name)
            if kind == 'symlink':
                ti.type = tarfile.SYMTYPE; ti.linkname = '/etc/passwd'
            else:
                ti.size = len(data)
            tf.addfile(ti, io.BytesIO(data) if kind != 'symlink' else None)
    return path


TAR = make_tar([('config.json', b'{}', 'file')])


def h(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def lfs_entries():
    with open(MAN) as f:
        d = json.load(f)
    return [{'path': p['path'], 'sha256': p['lfs_sha256'], 'size': p['size_bytes']} for p in d['lfs_pointers'] if not p['path'].startswith('audio_notes/')]


FULL = lfs_entries() + [{'path': 'config.json', 'sha256': hashlib.sha256(b'{}').hexdigest(), 'size': 2}]


class Prov:
    def __init__(self, out=KEY + ' root@x\n', rc=0, unpack_rc=0):
        self.out, self.rc, self.unpack_rc, self.log = out, rc, unpack_rc, []
    def exec(self, pod, cmd, timeout=60):
        self.log.append(('exec', cmd))
        if cmd[:2] == ['cat', '/etc/ssh/ssh_host_ed25519_key.pub']:
            return types.SimpleNamespace(stdout=self.out, returncode=self.rc)
        if cmd[:2] == ['sh', '-c']:
            return types.SimpleNamespace(stdout='', returncode=self.unpack_rc)
        return types.SimpleNamespace(stdout='', returncode=0)
    def scp_to(self, pod, local, remote):
        self.log.append(('scp', remote, hashlib.sha256(open(local, 'rb').read()).hexdigest()))


class T(unittest.TestCase):
    def mk(self, calls, status='RUNNING', rc=0, objs=None, ip='1.2.3.4', port=2222, root='/models/aplomb', stderr='hf_SECRET?X-Amz-Signature=zz', **over):
        def run(argv, **kw):
            calls.append(argv)
            if argv[1] == 'ps':
                return types.SimpleNamespace(returncode=0, stdout=json.dumps([{'id': POD, 'status': status, 'ip': ip, 'ports': {'22': port}}]), stderr='')
            kh = [a for a in argv if a.startswith('UserKnownHostsFile=')][0].split('=', 1)[1]
            with open(kh) as f:
                calls.append(f.read())
            calls.append(sorted(os.listdir(os.path.dirname(kh))))
            done = {e['path']: e['sha256'] for e in lfs_entries()} if objs is None else objs
            return types.SimpleNamespace(returncode=rc, stdout=json.dumps({'repository': REPO, 'remote_root': root, 'objects': done}), stderr=stderr)
        w, b, hp = (os.path.join(HERE, n) for n in ('lfs_stream_to_pod.py', 'lfs_exact_fetch.py', 'hf_git_credential.py'))
        kw = dict(repository=REPO, full_manifest_sha256=P.canonical_sha256(FULL), manifest_path=MAN, manifest_sha256=h(MAN),
                  wrapper_path=w, wrapper_sha256=h(w), base_path=b, base_sha256=h(b), helper_path=hp, helper_sha256=h(hp),
                  nonlfs_tar_path=TAR, nonlfs_tar_sha256=h(TAR), token_file='/t', key_path='/k', run=run)
        kw.update(over)
        return P.make_streamer(**kw)

    def test_ok(self):
        calls = []; prov = Prov(); r = self.mk(calls)(prov, POD, FULL, '/models/aplomb')
        self.assertEqual(len(r['streamed']), 5); self.assertEqual(r['non_lfs_uploaded'], ['config.json'])
        self.assertIn(('scp', '/work/non-lfs.tar', h(TAR)), prov.log)
        self.assertTrue(any(l[0] == 'exec' and l[1][:2] == ['sh', '-c'] and l[1][-1] == '/models/aplomb' for l in prov.log))
        argv = calls[1]
        self.assertEqual(argv[:6], ['/usr/bin/timeout', '-s', 'KILL', str(3600), '/usr/bin/env', '-i'])
        self.assertIn('StrictHostKeyChecking=yes', argv); self.assertIn('root@1.2.3.4', argv); self.assertIn('ConnectTimeout=30', argv)
        self.assertEqual(calls[2], f'[1.2.3.4]:2222 {KEY}\n')
        self.assertEqual(calls[3], ['hf_git_credential.py', 'known_hosts', 'lfs_exact_fetch.py', 'lfs_stream_to_pod.py', 'manifest', 'non-lfs.tar'])
        self.assertFalse(any(re.search(r'hf_[A-Za-z0-9]{10,}|Authorization', a) for a in argv))
        self.assertIn('/t', argv)

    def test_port22_plain_host(self):
        calls = []; self.mk(calls, port=22)(Prov(), POD, FULL, '/models/aplomb')
        self.assertEqual(calls[2], f'1.2.3.4 {KEY}\n')

    def test_refusals(self):
        cases = [dict(status='STOPPED'), dict(rc=1), dict(objs={}), dict(objs={e['path']: 1 for e in lfs_entries()}),
                 dict(ip='010.1.1.1'), dict(ip='256.1.1.1'), dict(ip='1.2.3.4; id'), dict(port=True), dict(port='22'), dict(port=0)]
        for kw in cases:
            calls = []
            with self.assertRaises(P.StreamError, msg=str(kw)):
                self.mk(calls, **kw)(Prov(), POD, FULL, '/models/aplomb')

    def test_error_text_has_no_stderr(self):
        calls = []
        with self.assertRaises(P.StreamError) as cm:
            self.mk(calls, rc=1)(Prov(), POD, FULL, '/models/aplomb')
        self.assertNotIn('hf_', str(cm.exception)); self.assertNotIn('Signature', str(cm.exception))

    def test_host_key_strictness(self):
        for out in ('', 'junk', KEY + '\n' + KEY + '\n', 'banner\n' + KEY, 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIshort', 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI' + 'A' * 42):
            calls = []
            with self.assertRaises(P.StreamError, msg=out):
                self.mk(calls)(Prov(out=out), POD, FULL, '/models/aplomb')
        with self.assertRaises(P.StreamError): self.mk([])(Prov(rc=1), POD, FULL, '/models/aplomb')

    def test_manifest_and_input_pins(self):
        s = self.mk([])
        bad = [dict(e) for e in FULL]; bad[0]['sha256'] = '0' * 64
        for ents in (bad, FULL[:-1], FULL + [dict(FULL[0])], FULL + [{'path': 'audio_notes/ced-base/model.safetensors', 'sha256': 'a' * 64, 'size': 1}],
                     FULL + [{'path': 'extra.py', 'sha256': 'a' * 64, 'size': 1}], 'x', [1]):
            with self.assertRaises(P.StreamError): s(Prov(), POD, ents, '/models/aplomb')
        for over in ({'manifest_sha256': '0' * 64}, {'wrapper_sha256': '0' * 64}, {'base_sha256': '0' * 64}, {'helper_sha256': '0' * 64}, {'nonlfs_tar_sha256': '0' * 64}):
            with self.assertRaises(P.StreamError): self.mk([], **over)(Prov(), POD, FULL, '/models/aplomb')

    def test_tar_content_must_match_manifest(self):
        for members in ([('config.json', b'{}', 'file'), ('extra.json', b'1', 'file')], [('config.json', b'{"x":1}', 'file')],
                        [('config.json', b'', 'symlink')], [('../config.json', b'{}', 'file')], []):
            tar = make_tar(members)
            with self.assertRaises(P.StreamError, msg=str(members)):
                self.mk([], nonlfs_tar_path=tar, nonlfs_tar_sha256=h(tar))(Prov(), POD, FULL, '/models/aplomb')

    def test_preflight_runs_without_pod_and_refuses(self):
        s = self.mk([])
        s.preflight(FULL)
        with self.assertRaises(P.StreamError): s.preflight(FULL[:-1])
        with self.assertRaises(P.StreamError): s.preflight([{'sha256': 'x'}])

    def test_unpack_failure_and_wrong_receipt(self):
        with self.assertRaises(P.StreamError): self.mk([])(Prov(unpack_rc=1), POD, FULL, '/models/aplomb')
        with self.assertRaises(P.StreamError): self.mk([], root='/other')(Prov(), POD, FULL, '/models/aplomb')

    def test_bad_pod_and_root(self):
        s = self.mk([])
        for pod, root in (('--help', '/models/a'), ('a;b', '/models/a'), (POD, 'models/a'), (POD, '/models/../x'), (POD, '/a b')):
            with self.assertRaises(P.StreamError): s(Prov(), pod, FULL, root)

    def test_ssh_argv_validation(self):
        for ip, port in (('1.2.3', 22), ('1.2.3.4', 0), ('1.2.3.4', '22'), ('１.2.3.4', 22)):
            with self.assertRaises(P.StreamError): P.ssh_argv(ip, port, '/k', '/kh')


if __name__ == '__main__':
    unittest.main()
