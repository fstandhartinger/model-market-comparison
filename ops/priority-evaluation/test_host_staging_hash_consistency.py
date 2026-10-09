import hashlib, io, json, os, subprocess, sys, tarfile, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_model_dir_manifest as B
import pod_runner as pr
import pod_weights_streamer as P
import synthetic_pointer_manifest as SPM


class T(unittest.TestCase):
    def test_three_canonical_hashes_agree_on_shuffled_large_manifest(self):
        entries = [{'path': 'd%02d/f%03d.json' % (i % 5, i), 'sha256': '%064x' % (i * 977 + 3), 'size': i} for i in range(70)]
        shuffled = entries[::-1]
        runner = hashlib.sha256(json.dumps(sorted(shuffled, key=lambda e: e['path']), sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        self.assertEqual(P.canonical_sha256(shuffled), B.canonical_sha256(shuffled))
        self.assertEqual(P.canonical_sha256(shuffled), runner)
        recipe = {'kind': 'aplomb_native', 'weights': [{'dir': 'aplomb', 'sha256': {e['path']: e['sha256'] for e in entries}}],
                  'host_staging': {'weights_manifest': shuffled, 'weights_manifest_sha256': runner,
                                   'image_build': {'context_sha256': 'a' * 64, 'target': 'optimized', 'tag': 'aplomb-runtime:' + 'a' * 12}}}
        pr._validate_host_staging(recipe)

    def test_preflight_accepts_tar_written_like_build(self):
        # Real offline-built tar (nested paths, no directory entries, empty file, PAX format) must pass preflight.
        d = tempfile.mkdtemp(); env = {'PATH': '/usr/bin:/bin', 'HOME': d, 'GIT_AUTHOR_NAME': 'a', 'GIT_AUTHOR_EMAIL': 'a@a',
                                       'GIT_COMMITTER_NAME': 'a', 'GIT_COMMITTER_EMAIL': 'a@a'}
        run = lambda *a: subprocess.run(['git', '-C', d, *a], check=True, capture_output=True, env=env)
        run('init', '-q')
        ptr = lambda p: b'version https://git-lfs.github.com/spec/v1\noid sha256:' + (b'%064x' % (list(SPM.SIZES).index(p) + 1)) + b'\nsize %d\n' % SPM.SIZES[p]
        files = {'config.json': b'{}', 'nested/dir/x.py': b'print(1)\n', 'empty/__init__.py': b''}
        for p in SPM.SIZES:
            files[p] = ptr(p)
        for p, c in files.items():
            os.makedirs(os.path.dirname(os.path.join(d, p)) or d, exist_ok=True)
            with open(os.path.join(d, p), 'wb') as f:
                f.write(c)
        run('add', '-A'); run('commit', '-qm', 'x')
        commit = run('rev-parse', 'HEAD').stdout.decode().strip(); tree = run('rev-parse', 'HEAD^{tree}').stdout.decode().strip()
        man = SPM.make(); data = open(man, 'rb').read()
        out = os.path.join(tempfile.mkdtemp(), 'o.tar')
        full, tsha = B.build(d, commit, tree, man, hashlib.sha256(data).hexdigest(), out)
        h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
        w, b, hp = (os.path.join(HERE, n) for n in ('lfs_stream_to_pod.py', 'lfs_exact_fetch.py', 'hf_git_credential.py'))
        s = P.make_streamer(repository='empiriolabsai/aplomb-1', full_manifest_sha256=B.canonical_sha256(full), manifest_path=man,
                            manifest_sha256=h(man), wrapper_path=w, wrapper_sha256=h(w), base_path=b, base_sha256=h(b),
                            helper_path=hp, helper_sha256=h(hp), nonlfs_tar_path=out, nonlfs_tar_sha256=tsha, token_file='/t', key_path='/k')
        s.preflight(full)
        self.assertEqual(len(full), 3 + 5)


if __name__ == '__main__':
    unittest.main()
