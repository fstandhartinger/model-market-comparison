"""First-party inert fixtures for bounded metadata and offline export."""
import hashlib
import unittest
import shutil
import autopickup as ap
import execution_source
import source_metadata as sm
from test_execution_source import ExecutionSourceTests


class SourceMetadataTests(ExecutionSourceTests):
    def metadata(self, repo, code, limit=65536):
        return sm.inspect_pinned_tree(repo, code['commit'], code['tree'], ap.git, max_bytes=limit)

    def commit_files(self, repo, files):
        for name, value in files.items():
            path = repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(value)
        self.git(repo, 'add', '.')
        self.git(repo, 'commit', '-qm', 'inert metadata')
        code = {'commit': self.git(repo, 'rev-parse', 'HEAD'), 'tree': self.git(repo, 'rev-parse', 'HEAD^{tree}')}
        self.receipt('code', code)
        return code

    def test_metadata_sparse_lfs_and_offline_archive(self):
        repo, _ = self.fixture()
        pointer = ('version https://git-lfs.github.com/spec/v1\noid sha256:'+'a'*64+'\nsize 9876543210\n').encode()
        names = ['serving.json','temperature.json','MANIFEST.json','native_reference/source-pins.json']
        code = self.commit_files(repo, {**{n:b'{}\n' for n in names}, 'model.safetensors':pointer, 'example.png':b'inert image'})
        ap.git(repo, 'sparse-checkout', 'init', '--no-cone')
        ap.git(repo, 'sparse-checkout', 'set', '--no-cone', *ap.REVIEW_GIT_PATTERNS)
        self.assertTrue(all((repo/n).exists() for n in names))
        self.assertFalse((repo/'model.safetensors').exists())
        result = self.metadata(repo, code)
        self.assertEqual(result['weights']['model.safetensors']['sha256'], 'a'*64)
        self.assertEqual(result['weights']['model.safetensors']['size_bytes'], 9876543210)
        self.assertIn(b'inert image', execution_source.export_bound_source(code, self.job))

    def test_bad_pointer_and_bounds(self):
        repo, _ = self.fixture()
        code = self.commit_files(repo, {'model.safetensors':b'not a weight pointer\n'})
        with self.assertRaisesRegex(sm.MetadataError, 'invalid'):
            self.metadata(repo, code)
        with self.assertRaisesRegex(sm.MetadataError, 'byte limit'):
            self.metadata(repo, code, limit=1)
        with self.assertRaisesRegex(sm.MetadataError, 'tree differs'):
            self.metadata(repo, {**code,'tree':'a'*40})

    def test_strict_pointer_identity(self):
        canonical = 'version https://git-lfs.github.com/spec/v1\noid sha256:'+'b'*64+'\nsize 12\n'
        for body in [canonical.replace('size 12','size 0'), canonical.replace('size 12','size -1'),
                     canonical.replace('b'*64,'B'*64), canonical+'ext-0-foo bar\n', 'x'*1025,
                     canonical.replace('\n','\r\n')]:
            oid=hashlib.sha1(b'blob '+str(len(body.encode())).encode()+b'\0'+body.encode()).hexdigest()
            with self.assertRaises(sm.MetadataError): sm.lfs_pointer(body,oid)
        with self.assertRaises(sm.MetadataError): sm.lfs_pointer(canonical,'c'*40)

    def test_symlink_and_alternate_rejection(self):
        repo, _=self.fixture()
        (repo/'escape.py').symlink_to('/etc/passwd')
        self.git(repo,'add','escape.py');self.git(repo,'commit','-qm','inert symlink')
        code={'commit':self.git(repo,'rev-parse','HEAD'),'tree':self.git(repo,'rev-parse','HEAD^{tree}')}
        with self.assertRaisesRegex(sm.MetadataError,'unsafe'):self.metadata(repo,code)
        (repo/'.git/objects/info/alternates').write_text('/tmp\n')
        with self.assertRaisesRegex(sm.MetadataError,'object store'):self.metadata(repo,code)

    def test_missing_blob_fetch_bound_and_offline_export(self):
        repo,code=self.fixture()
        oid=self.git(repo,'rev-parse','HEAD:app.py')
        path=repo/'.git/objects'/oid[:2]/oid[2:]
        data=path.read_bytes();path.unlink();calls=[]
        ap.git(repo,'config','remote.origin.url','https://github.com/firstparty/inert')
        def controlled(dest,*args,**kwargs):
            if args[0]=='fetch':
                calls.append((args,kwargs))
                shutil.copytree(repo/'.git/objects',dest/'objects',dirs_exist_ok=True)
                target=dest/'objects'/oid[:2]/oid[2:]
                target.parent.mkdir(exist_ok=True);target.write_bytes(data);return ''
            return ap.git(dest,*args,**kwargs)
        result=sm.inspect_pinned_tree(repo,code['commit'],code['tree'],controlled,max_bytes=65536)
        self.assertEqual(calls[0][0],('fetch','--quiet','--depth=1','--filter=blob:limit=65536','--no-tags','origin',code['commit']))
        self.assertEqual(calls[0][1]['max_pack_bytes'],65536)
        self.assertEqual(result['archive_objects']['hydrated_blob_count'],1)
        self.assertEqual(self.archive_app(code),b'# synthetic first version\n')

    def test_excluded_blob_refuses_without_lazy_network(self):
        repo,code=self.fixture()
        ap.git(repo,'config','remote.origin.url','https://github.com/firstparty/inert')
        oid=self.git(repo,'rev-parse','HEAD:app.py')
        path=repo/'.git/objects'/oid[:2]/oid[2:]
        path.unlink(); fetches=[]; offline_reads=[]
        def controlled(dest,*args,**kwargs):
            if args[0]=='fetch':
                fetches.append(args)
                shutil.copytree(repo/'.git/objects',dest/'objects',dirs_exist_ok=True)
                with (dest/'config').open('a') as config:
                    config.write('\n[extensions]\n\tpartialClone = origin\n[remote "origin"]\n\tpromisor = true\n')
                return ''
            if args[0]=='cat-file':
                config=(dest/'config').read_text()
                self.assertNotIn('origin',config)
                self.assertNotIn('partialClone',config)
                self.assertNotIn('promisor',config)
                offline_reads.append(args)
            return ap.git(dest,*args,**kwargs)
        with self.assertRaisesRegex(sm.MetadataError,'unavailable'):
            sm.inspect_pinned_tree(repo,code['commit'],code['tree'],controlled,max_bytes=65536)
        self.assertEqual(len(fetches),1)
        self.assertEqual(len(offline_reads),2)

    def test_http_alternates_and_fifo_fail_before_git_read(self):
        repo,code=self.fixture()
        unsafe=repo/'.git/objects/info/http-alternates'
        unsafe.write_text('https://example.invalid/objects\n')
        with self.assertRaisesRegex(sm.MetadataError,'object store'):self.metadata(repo,code)
        unsafe.unlink()
        import os
        os.mkfifo(unsafe)
        with self.assertRaisesRegex(sm.MetadataError,'object store'):self.metadata(repo,code)

if __name__=='__main__':unittest.main()
