"""Trusted synthetic Git fixtures, never customer source execution."""
import hashlib,io,json,subprocess,tarfile,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import execution_source
import native_source_selection as n
from measurement_dispatch import OperationalHold

class SelectedTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.job=Path(self.tmp.name)/n.ORDER;self.repo=self.job/'source/code';self.repo.mkdir(parents=True)
  self.git('init','-q');self.git('config','user.email','fixture@example.invalid');self.git('config','user.name','Fixture')
  for name,body in [('src/native.py',b'# never executed\n'),('LICENSE',b'licence\n'),('results/excluded.jsonl',b'bulk\n')]:
   q=self.repo/name;q.parent.mkdir(exist_ok=True);q.write_bytes(body)
  self.git('add','.');self.git('commit','-qm','fixture');self.commit=self.git('rev-parse','HEAD').decode().strip();self.tree=self.git('rev-parse','HEAD^{tree}').decode().strip();full=[];selected=[]
  for e in self.git('ls-tree','-r','-z','HEAD').split(b'\0'):
   if not e:continue
   h,name=e.split(b'\t');mode,kind,oid=h.decode().split();name=name.decode();body=(self.repo/name).read_bytes();row=dict(path=name,mode=mode,git_blob=oid,bytes=len(body));full.append(row)
   if not name.startswith('results/'):selected.append({**row,'sha256':hashlib.sha256(body).hexdigest()})
  self.policy={'order_id':n.ORDER,'commit':self.commit,'tree':self.tree,'full_tree':full,'selected':selected,'exclusions':[{'path':'results/excluded.jsonl'}]};self.policy_path=Path(self.tmp.name)/'policy.json';self.policy_path.write_text(json.dumps(self.policy));self.policy_hash=hashlib.sha256(self.policy_path.read_bytes()).hexdigest()
  for key,val in [('COMMIT',self.commit),('TREE',self.tree),('POLICY',self.policy_path),('POLICY_SHA256',self.policy_hash)]:
   p=patch.object(n,key,val);p.start();self.addCleanup(p.stop)
  self.admit();self.receipt={'which':'code','commit':self.commit,'tree':self.tree,**n.inspect_selected(self.job,self.repo,self.commit,self.tree)};self.write_receipt()
 def git(self,*a):return subprocess.run(['git','-C',str(self.repo),*a],capture_output=True,check=True,env={'PATH':'/usr/bin:/bin','HOME':self.tmp.name,'GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_NOSYSTEM':'1'}).stdout
 def admit(self,**changes):
  x={'schema_version':1,'verdict':'ACCEPTED','reviewer_engine':'claude','order_id':n.ORDER,'commit':self.commit,'tree':self.tree,'selection_sha256':self.policy_hash,'scope':'necessary_native_source_only'};x.update(changes);(self.job/'NATIVE-SOURCE-ADMISSION.json').write_text(json.dumps(x))
 def write_receipt(self):(self.job/'source/FETCH-RECEIPT-code.json').write_text(json.dumps(self.receipt))
 def code(self):return {'commit':self.commit,'tree':self.tree}
 def test_selected_reproducible_tar_and_truthful_inventory(self):
  a=execution_source.export_bound_source(self.code(),self.job);b=execution_source.export_bound_source(self.code(),self.job);self.assertEqual(a,b)
  with tarfile.open(fileobj=io.BytesIO(a)) as t:self.assertEqual(t.getnames(),['LICENSE','src/native.py']);self.assertTrue(all(x.isfile() and not x.linkname for x in t))
  self.assertEqual(hashlib.sha256(a).hexdigest(),self.receipt['native_selection']['archive_sha256']);self.assertFalse(self.receipt['archive_objects']['fully_hydrated']);self.assertEqual(self.receipt['archive_objects']['file_count'],3)
 def test_unaccepted_missing_or_wrong_pair(self):
  for change in [{'schema_version':True},{'schema_version':1.0},{'verdict':'PROPOSED'},{'reviewer_engine':'customer'},{'commit':'a'*40},{'tree':'b'*40},{'selection_sha256':'c'*64}]:
   self.admit(**change)
   with self.assertRaises(OperationalHold):execution_source.validate_code_binding(self.code(),self.job)
  (self.job/'NATIVE-SOURCE-ADMISSION.json').unlink()
  with self.assertRaises(OperationalHold):execution_source.validate_code_binding(self.code(),self.job)
 def test_changed_acceptance_bytes_after_receipt(self):
  p=self.job/'NATIVE-SOURCE-ADMISSION.json';p.write_text(p.read_text()+'\n')
  with self.assertRaises(OperationalHold):execution_source.validate_code_binding(self.code(),self.job)
 def test_member_removed_or_excluded_injected(self):
  for change in ['remove','inject']:
   x=json.loads(json.dumps(self.policy))
   if change=='remove':x['selected'].pop()
   else:x['selected'].append({**x['full_tree'][-1],'sha256':'0'*64})
   self.policy_path.write_text(json.dumps(x))
   with self.assertRaises(OperationalHold):n.inspect_selected(self.job,self.repo,self.commit,self.tree)
 def test_excluded_worktree_injection_never_exported(self):
  (self.repo/'results/injected.py').write_text('raise RuntimeError()');a=execution_source.export_bound_source(self.code(),self.job)
  with tarfile.open(fileobj=io.BytesIO(a)) as t:self.assertNotIn('results/injected.py',t.getnames())
 def test_missing_selected_blob_holds_before_binding(self):
  oid=self.policy['selected'][0]['git_blob'];(self.repo/'.git/objects'/oid[:2]/oid[2:]).unlink()
  with self.assertRaises(OperationalHold):execution_source.validate_code_binding(self.code(),self.job)
 def test_missing_excluded_blob_permitted_not_claimed_hydrated(self):
  f=next(x for x in self.policy['full_tree'] if x['path'].startswith('results/'));oid=f['git_blob'];(self.repo/'.git/objects'/oid[:2]/oid[2:]).unlink();self.assertEqual(execution_source.validate_code_binding(self.code(),self.job),self.repo);self.assertFalse(self.receipt['archive_objects']['fully_hydrated'])
 def test_corrupt_selected_blob(self):
  oid=self.policy['selected'][0]['git_blob'];q=self.repo/'.git/objects'/oid[:2]/oid[2:];q.chmod(0o600);q.write_bytes(b'corrupt')
  with self.assertRaises(OperationalHold):n.inspect_selected(self.job,self.repo,self.commit,self.tree)
 def test_receipt_hash_mismatch(self):
  self.receipt['native_selection']['archive_sha256']='a'*64;self.write_receipt()
  with self.assertRaises(OperationalHold):execution_source.validate_code_binding(self.code(),self.job)
 def test_nonryotide_and_recipe_switch_forbidden(self):
  with self.assertRaises(OperationalHold):n.acceptance(self.job.with_name('other'),self.commit,self.tree)
  with self.assertRaises(OperationalHold):n.acceptance(self.job,'a'*40,self.tree)
  with self.assertRaises(OperationalHold):execution_source.validate_code_binding({**self.code(),'native_selection':True},self.job)
 def test_original_file_and_total_caps(self):
  with patch.object(n,'MAX_FILE_BYTES',1),self.assertRaises(OperationalHold):n.inspect_selected(self.job,self.repo,self.commit,self.tree)
  with patch.object(n,'MAX_BYTES',1),self.assertRaises(OperationalHold):n.inspect_selected(self.job,self.repo,self.commit,self.tree)
 def test_symlink_acceptance_rejected(self):
  p=self.job/'NATIVE-SOURCE-ADMISSION.json';body=p.read_text();p.unlink();q=Path(self.tmp.name)/'elsewhere';q.write_text(body);p.symlink_to(q)
  with self.assertRaises(OperationalHold):n.inspect_selected(self.job,self.repo,self.commit,self.tree)

 def test_review_worktree_exactness(self):
  self.assertEqual(n.validate_receipt(self.job,self.repo,self.receipt,review_worktree=True),self.receipt['native_selection'])
  (self.repo/'src/native.py').write_bytes(b'changed reviewer bytes')
  with self.assertRaises(OperationalHold):n.validate_receipt(self.job,self.repo,self.receipt,review_worktree=True)
 def test_nonryotide_receipt_selection_cannot_expand(self):
  other=self.job.with_name('other');self.job.rename(other)
  with self.assertRaises(OperationalHold):execution_source.validate_code_binding(self.code(),other)
 def test_policy_symlink_rejected(self):
  raw=self.policy_path.read_bytes();self.policy_path.unlink();q=Path(self.tmp.name)/'replacement';q.write_bytes(raw);self.policy_path.symlink_to(q)
  with self.assertRaises(OperationalHold):n.inspect_selected(self.job,self.repo,self.commit,self.tree)

 def test_fetch_materializes_only_verified_review_bytes(self):
  (self.repo/'src/native.py').unlink();(self.repo/'LICENSE').write_bytes(b'edited review bytes');self.fetch()
  n.validate_receipt(self.job,self.repo,self.receipt,review_worktree=True)
  self.assertEqual((self.repo/'src/native.py').read_bytes(),b'# never executed\n')
 def test_materialization_symlink_rejected(self):
  p=self.repo/'src/native.py';p.unlink();p.symlink_to(self.repo/'LICENSE')
  with self.assertRaises(OperationalHold):n.materialize_review_worktree(self.job,self.repo,self.receipt)

 def test_real_pod_run_holds_before_provider_or_allocation(self):
  import pod_runner
  from unittest.mock import Mock
  self.admit(verdict='PROPOSED');provider=Mock()
  recipe={'schema_version':1,'kind':'http_typesafe','image':'example/image:fixed@sha256:'+'a'*64,'min_vram_gb':24,'weights':[{'repo':'example/model','revision':'f'*40,'dir':'model','sha256':{'config.json':'b'*64}}],'code':self.code(),'services':[{'argv':['python3','-m','native'],'env':{},'ready_url':'http://127.0.0.1:8000/health'}],'endpoint':'http://127.0.0.1:8000','model':'fixture'}
  with self.assertRaises(OperationalHold):pod_runner.run(n.ORDER,self.job,recipe,self.job/'output',{},provider=provider)
  self.assertFalse(provider.mock_calls)

 def fetch(self):
  import autopickup as a
  from contextlib import ExitStack
  (self.job/'source/PIN.json').write_text(json.dumps({'code_commit':self.commit}))
  row={'synthetic_test':False,'pickup_job_dir':str(self.job),'code_link':'https://github.com/csabag/ryotide','benchmarks':['jevbench']}
  def trusted_git(repo,*args,**kw):
   if args[0]=='ls-remote':return self.commit+'\tHEAD\n'
   if args[0]=='fetch':return ''
   return subprocess.run(['git','-C',str(repo),*args],input=kw.get('stdin'),capture_output=True,check=True,text=True,env={'PATH':'/usr/bin:/bin','HOME':self.tmp.name,'GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_NOSYSTEM':'1','GIT_ALLOW_PROTOCOL':'file'}).stdout
  with ExitStack() as stack:
   stack.enter_context(patch.object(a,'load_row',return_value=row));stack.enter_context(patch.object(a,'JOB_ROOT',Path(self.tmp.name)));stack.enter_context(patch.object(a,'git',side_effect=trusted_git));stack.enter_context(patch.object(a.source_metadata,'inspect_pinned_tree',side_effect=AssertionError('no whole-archive fallback')))
   return a.fetch_source(n.ORDER,'code')
 def test_actual_fetch_writes_truthful_selected_receipt(self):
  value=self.fetch();self.assertFalse(value['archive_objects']['fully_hydrated']);self.assertEqual(value['archive_objects']['scope'],'reviewed_native_selection');self.assertEqual(value['review_source_bytes'],sum(x['bytes'] for x in self.policy['selected']));self.assertEqual(value,json.loads((self.job/'source/FETCH-RECEIPT-code.json').read_text()))
 def test_actual_fetch_unaccepted_never_writes_success(self):
  import autopickup as a
  (self.job/'source/FETCH-RECEIPT-code.json').unlink();self.admit(verdict='PROPOSED')
  with self.assertRaises(a.FetchInfraError):self.fetch()
  self.assertFalse((self.job/'source/FETCH-RECEIPT-code.json').exists())

if __name__=='__main__':unittest.main()
