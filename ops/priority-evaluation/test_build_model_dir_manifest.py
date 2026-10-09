import hashlib, json, os, subprocess, sys, tarfile, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_model_dir_manifest as B

PTR = b'version https://git-lfs.github.com/spec/v1\noid sha256:' + b'a' * 64 + b'\nsize 10\n'
ENV = {'PATH': '/usr/bin:/bin', 'GIT_AUTHOR_NAME': 'a', 'GIT_AUTHOR_EMAIL': 'a@a', 'GIT_COMMITTER_NAME': 'a', 'GIT_COMMITTER_EMAIL': 'a@a'}


def repo(files, symlink=None):
    d = tempfile.mkdtemp()
    env = dict(ENV, HOME=d)
    run = lambda *a: subprocess.run(['git', '-C', d, *a], check=True, capture_output=True, env=env)
    run('init', '-q')
    for p, c in files.items():
        os.makedirs(os.path.dirname(os.path.join(d, p)) or d, exist_ok=True)
        with open(os.path.join(d, p), 'wb') as f:
            f.write(c)
    if symlink:
        os.symlink('a', os.path.join(d, symlink))
    run('add', '-A'); run('commit', '-qm', 'x')
    return d, run('rev-parse', 'HEAD').stdout.decode().strip(), run('rev-parse', 'HEAD^{tree}').stdout.decode().strip()


def man(paths, oid='a' * 64, size=10):
    f = os.path.join(tempfile.mkdtemp(), 'm.json')
    with open(f, 'w') as fh:
        json.dump({'lfs_pointers': [{'path': p, 'lfs_sha256': oid, 'size_bytes': size} for p in paths]}, fh)
    with open(f, 'rb') as fh:
        return f, hashlib.sha256(fh.read()).hexdigest()


def out():
    return os.path.join(tempfile.mkdtemp(), 'o.tar')


class T(unittest.TestCase):
    FILES = {'config.json': b'{}', 'w.safetensors': PTR, 'sub/x.txt': b'hi', 'audio_notes/big.safetensors': PTR}
    LFS = ['w.safetensors', 'audio_notes/big.safetensors']

    def test_ok_and_deterministic(self):
        d, c, t = repo(self.FILES); m, ms = man(self.LFS)
        o = out(); full, tsha = B.build(d, c, t, m, ms, o)
        self.assertEqual([e['path'] for e in full], ['config.json', 'sub/x.txt', 'w.safetensors'])
        with tarfile.open(o) as tf:
            self.assertEqual(sorted(tf.getnames()), ['config.json', 'sub/x.txt'])
            self.assertTrue(all(x.uid == 0 and x.mtime == 0 and x.isreg() for x in tf.getmembers()))
        self.assertEqual(B.build(d, c, t, m, ms, out())[1], tsha)
        self.assertEqual(len(B.canonical_sha256(full)), 64)
        with self.assertRaises(FileExistsError):
            B.build(d, c, t, m, ms, o)

    def test_pointer_checks(self):
        d, c, t = repo(self.FILES)
        for paths, kw in (([], {}), (self.LFS + ['missing.bin'], {}), (self.LFS, {'oid': 'b' * 64}), (self.LFS, {'size': 11}),
                          (self.LFS + ['config.json'], {})):
            m, ms = man(paths, **kw)
            with self.assertRaises(B.BuildError): B.build(d, c, t, m, ms, out())
        m, ms = man(self.LFS)
        with self.assertRaises(B.BuildError): B.build(d, c, t, m, '0' * 64, out())

    def test_malformed_pointer_and_unsafe_entries(self):
        d, c, t = repo({'p': PTR.replace(b'size 10', b'size x')})
        m, ms = man([])
        with self.assertRaises(B.BuildError): B.build(d, c, t, m, ms, out())
        d, c, t = repo({'a': b'x'}, symlink='l')
        with self.assertRaises(B.BuildError): B.build(d, c, t, m, ms, out())
        d, c, t = repo({'bad name.txt': b'x'})
        with self.assertRaises(B.BuildError): B.build(d, c, t, m, ms, out())

    def test_wrong_ids_and_replace_refs(self):
        d, c, t = repo({'a': b'x'}); m, ms = man([])
        with self.assertRaises(B.BuildError): B.build(d, c, '0' * 40, m, ms, out())
        with self.assertRaises(B.BuildError): B.build(d, c, 'xyz', m, ms, out())
        # replace ref swapping the tree must not change what is read
        env = dict(ENV, HOME=d)
        g = lambda *a: subprocess.run(['git', '-C', d, *a], check=True, capture_output=True, env=env).stdout.decode().strip()
        blob = g('hash-object', '-w', '--stdin') if False else None
        evil = subprocess.run(['git', '-C', d, 'hash-object', '-w', '--stdin'], input=b'evil', check=True, capture_output=True, env=env).stdout.decode().strip()
        newtree = subprocess.run(['git', '-C', d, 'mktree'], input=f'100644 blob {evil}\ta\n'.encode(), check=True, capture_output=True, env=env).stdout.decode().strip()
        g('replace', t, newtree)
        o = out(); full, _ = B.build(d, c, t, m, ms, o)
        self.assertEqual(full[0]['sha256'], hashlib.sha256(b'x').hexdigest())


if __name__ == '__main__':
    unittest.main()
