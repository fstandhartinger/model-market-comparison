import hashlib, io, json, os, shutil, sys, tarfile, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import host_staging_glue as G
import synthetic_pointer_manifest as SPM
import pod_weights_streamer as P


def sha(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def mkjob(**over):
    job = tempfile.mkdtemp(); hs = os.path.join(job, 'host-staging'); os.mkdir(hs)
    man = SPM.make(os.path.join(hs, 'lfs.json'))
    with open(man) as f:
        pointers = json.load(f)['lfs_pointers']
    entries = [{'path': p['path'], 'sha256': p['lfs_sha256'], 'size': p['size_bytes']} for p in pointers if not p['path'].startswith('audio_notes/')]
    entries.append({'path': 'config.json', 'sha256': hashlib.sha256(b'{}').hexdigest(), 'size': 2})
    with tarfile.open(os.path.join(hs, 'non.tar'), 'w') as tf:
        ti = tarfile.TarInfo('config.json'); ti.size = 2; tf.addfile(ti, io.BytesIO(b'{}'))
    with open(os.path.join(hs, 'ctx.tar'), 'wb') as f: f.write(b'ctx')
    for n in ('lfs.json', 'non.tar', 'ctx.tar'): os.chmod(os.path.join(hs, n), 0o600)
    full = P.canonical_sha256(entries)
    cfg = {'schema_version': 1, 'repository': 'empiriolabsai/aplomb-1', 'full_manifest_sha256': full,
           'lfs_pointer_manifest': {'file': 'lfs.json', 'sha256': sha(os.path.join(hs, 'lfs.json'))},
           'non_lfs_tar': {'file': 'non.tar', 'sha256': sha(os.path.join(hs, 'non.tar'))},
           'image_context_tar': {'file': 'ctx.tar', 'sha256': sha(os.path.join(hs, 'ctx.tar'))}}
    cfg.update(over)
    with open(os.path.join(hs, 'CONFIG.json'), 'w') as f: json.dump(cfg, f)
    os.chmod(os.path.join(hs, 'CONFIG.json'), 0o600)
    recipe = {'weights': [{'repo': 'empiriolabsai/aplomb-1', 'dir': 'aplomb', 'revision': 'a' * 40, 'sha256': {}}],
              'host_staging': {'weights_manifest': entries, 'weights_manifest_sha256': full,
                               'image_build': {'context_sha256': cfg['image_context_tar']['sha256']}}}
    return job, recipe


def make(job, recipe, **kw):
    return G.make_callables(job, recipe, module_dir=HERE, token_file='/t', key_path='/k', **kw)


class T(unittest.TestCase):
    def test_ok(self):
        job, recipe = mkjob()
        s, ctx = make(job, recipe)
        self.assertEqual(s.sha256, G.module_bundle_sha256(HERE)); self.assertEqual(len(s.sha256), 64)
        self.assertEqual(str(ctx(job)), os.path.join(job, 'host-staging', 'ctx.tar'))

    def test_refusals(self):
        for over in ({'repository': 'x/y'}, {'extra': 1}, {'non_lfs_tar': {'file': '../x', 'sha256': 'a' * 64}},
                     {'schema_version': 2}, {'schema_version': True}, {'image_context_tar': {'file': 'ctx.tar', 'sha256': 'A' * 64}}):
            job, recipe = mkjob(**over)
            with self.assertRaises(G.GlueError, msg=str(over)): make(job, recipe)
        job, recipe = mkjob(full_manifest_sha256='d' * 64)
        with self.assertRaises(G.GlueError): make(job, recipe)
        job, recipe = mkjob(); recipe['host_staging']['image_build']['context_sha256'] = '0' * 64
        with self.assertRaises(G.GlueError): make(job, recipe)
        job, recipe = mkjob(); os.chmod(os.path.join(job, 'host-staging', 'CONFIG.json'), 0o666)
        with self.assertRaises(G.GlueError): make(job, recipe)
        job, recipe = mkjob(); shutil.rmtree(os.path.join(job, 'host-staging'))
        with self.assertRaises(G.GlueError): make(job, recipe)

    def test_preflight_failures_surface_as_glue_error(self):
        job, recipe = mkjob(); recipe['host_staging']['weights_manifest'] = recipe['host_staging']['weights_manifest'][:-1]
        with self.assertRaises(G.GlueError): make(job, recipe)
        job, recipe = mkjob()
        with open(os.path.join(job, 'host-staging', 'non.tar'), 'ab') as f: f.write(b'x')
        with self.assertRaises(G.GlueError): make(job, recipe)

    def test_wrong_module_dir_and_context_tamper(self):
        job, recipe = mkjob()
        other = tempfile.mkdtemp()
        for n in G.MODULES: shutil.copy(os.path.join(HERE, n), other)
        with self.assertRaises(G.GlueError): G.make_callables(job, recipe, module_dir=other, token_file='/t', key_path='/k')
        job, recipe = mkjob()
        with open(os.path.join(job, 'host-staging', 'ctx.tar'), 'ab') as f: f.write(b'x')
        with self.assertRaises(G.GlueError): make(job, recipe)

    def test_duplicate_key_and_symlinked_file(self):
        job, recipe = mkjob()
        with open(os.path.join(job, 'host-staging', 'CONFIG.json'), 'w') as f: f.write('{"schema_version":1,"schema_version":1}')
        with self.assertRaises(G.GlueError): make(job, recipe)
        job, recipe = mkjob(); hs = os.path.join(job, 'host-staging')
        os.remove(os.path.join(hs, 'ctx.tar')); os.symlink('/etc/hostname', os.path.join(hs, 'ctx.tar'))
        with self.assertRaises(G.GlueError): make(job, recipe)

    def test_tar_directory_deterministic_and_regular_only(self):
        d = tempfile.mkdtemp()
        os.makedirs(os.path.join(d, 'a')); open(os.path.join(d, 'a', 'x'), 'w').write('1'); open(os.path.join(d, 'Dockerfile'), 'w').write('FROM x')
        o1 = os.path.join(tempfile.mkdtemp(), 'o.tar'); o2 = os.path.join(tempfile.mkdtemp(), 'o.tar')
        self.assertEqual(G.tar_directory(d, o1), G.tar_directory(d, o2))
        with tarfile.open(o1) as tf: self.assertEqual(tf.getnames(), ['Dockerfile', 'a/x'])
        os.symlink('Dockerfile', os.path.join(d, 'l'))
        with self.assertRaises(G.GlueError): G.tar_directory(d, os.path.join(tempfile.mkdtemp(), 'o3.tar'))


if __name__ == '__main__':
    unittest.main()
