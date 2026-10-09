"""Synthetic finance/one-use source gates only; no customer/GPU/provider effects."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock
import scoped_native_topup as g
class Tests(unittest.TestCase):
 def ledger(self,rid):
  n,s,_,_=g.BOUNDS[rid]
  return dict(request_id=rid,creation_attempts=n,spent_upper_bound_usd=s,pod_id=None,cleanup_uncertain=False,torn_down_at='synthetic',input_dispatched=False,execution_started=False,measurement_completed=False,read_only_capacity_checks=2,read_only_capacity_refs=['old1','old2'])
 def test_exact_scoped_hardware_and_original_recipe_only(self):
  for rid,pair,minv in [(g.RYO,('RTX6000',48),24),(g.DECISOR,('H100',80),80)]:
   with tempfile.TemporaryDirectory()as tmp:
    x=self.instance(rid,Path(tmp));self.assertEqual(x.gpu_choice({'min_vram_gb':minv}),pair)
    with self.assertRaises(ValueError):x.gpu_choice({'min_vram_gb':96})
 def test_exact_both_current_ledgers(self):
  for rid in g.BOUNDS:g.preinput(rid,self.ledger(rid))
 def test_foreign_reset_unknown_cleanup_and_scored_rejected(self):
  for rid in g.BOUNDS:
   for k,v in [('creation_attempts',0),('spent_upper_bound_usd',0),('pod_id','unreconciled'),('cleanup_uncertain',True),('torn_down_at',None),('input_dispatched',True),('execution_started',True),('measurement_completed',True),('scored_dispatch_uncertain',True)]:
    state=self.ledger(rid);state[k]=v
    with self.subTest(rid=rid,k=k),self.assertRaises(ValueError):g.preinput(rid,state)
  with self.assertRaises(ValueError):g.preinput('other',{})
 def test_bounds(self):
  for ttl,budget in [(1.01,5),(1,5.01),(0,5),(True,5),(1,float('nan'))]:
   with self.assertRaises(ValueError):g.preinput(g.RYO,self.ledger(g.RYO),ttl,budget)
 def instance(self,rid,base):
  x=g.ScopedTopUp.__new__(g.ScopedTopUp);x.rid=rid;x.n,x.spent,x.allowed_total,x.lifetime_cap_usd=g.BOUNDS[rid];x.original=self.ledger(rid);x.verify=Mock();x.recheck=Mock();x.plan_path=base/'PLAN.json';x.plan_path.write_text('{}');x.ledger=base/'LEDGER.json';x.ledger.write_text(json.dumps(x.original));x.reserve_claim=base/'RESERVE.json';x.create_claim=base/'CREATE.json';return x
 def test_one_exact_charge_no_second_reserve_or_create(self):
  for rid in g.BOUNDS:
   with tempfile.TemporaryDirectory()as tmp:
    x=self.instance(rid,Path(tmp));s=copy.deepcopy(x.original);self.assertEqual(x('check',s),x.allowed_total);x('before_reserve',s)
    with self.assertRaises(ValueError):x('before_reserve',s)
    s.update(creation_attempts=x.n+1,spent_upper_bound_usd=x.spent+5,attempt_ttl_hours=1,attempt_reserved_upper_bound_usd=5,attempt_contingency_usd=0,cleanup_uncertain=True);x('before_create',s)
    with self.assertRaises(FileExistsError):x('before_create',s)
 def test_overcharge_extra_allocation_and_history_mutation_rejected(self):
  with tempfile.TemporaryDirectory()as tmp:
   x=self.instance(g.DECISOR,Path(tmp));state=copy.deepcopy(x.original);state['read_only_capacity_refs']=['reset']
   with self.assertRaises(ValueError):x('check',state)
   state=copy.deepcopy(x.original);state['read_only_capacity_refs']+=['a','b','c']
   with self.assertRaises(ValueError):x('check',state)
   x('before_reserve',x.original)
   for k,v in [('creation_attempts',5),('spent_upper_bound_usd',25),('attempt_ttl_hours',1.1),('attempt_contingency_usd',.2),('input_dispatched',True)]:
    s=copy.deepcopy(x.original);s.update(creation_attempts=4,spent_upper_bound_usd=24.8,attempt_ttl_hours=1,attempt_reserved_upper_bound_usd=5,attempt_contingency_usd=0,cleanup_uncertain=True);s[k]=v
    with self.subTest(k=k),self.assertRaises(ValueError):x('before_create',s)
 def test_foreign_job_never_reads_authority(self):
  with self.assertRaises(ValueError):g.ScopedTopUp(Path('/synthetic/foreign'),{'generation':g.GENERATION},Mock())
 def test_actual_manager_owned_hold_escalates_without_restart(self):
  import autopickup as a
  from unittest.mock import patch
  import datetime
  effects=Mock();state={'scoped_native_topup':{},'operational_hold':{'reason':'scoped_native_topup_reconciliation_required','transient':False}}
  with patch.object(a,'operational_escalate') as escalation:
   a.manage_evaluation({'id':g.RYO},state,effects,datetime.datetime.now(datetime.timezone.utc))
   escalation.assert_called_once();effects.start_unit.assert_not_called()
   escalation.reset_mock();a.manage_evaluation({'id':g.DECISOR,'result_delivered_at':'historical-private-delivery'},state,effects,datetime.datetime.now(datetime.timezone.utc));escalation.assert_called_once();effects.start_unit.assert_not_called()
if __name__=='__main__':unittest.main()

class HistoricalSuccessorTests(unittest.TestCase):
 def fixture(self,root):
  import hashlib
  job=root/g.DECISOR;job.mkdir();old=root/'retained.py';old.write_text('old source');current=root/'current.py';current.write_text('new source');admission=root/'ADMISSION.json';admission.write_text('{}');entry=root/'ENTRY.json';entry.write_text(json.dumps({'admission_sha256':g.sha(admission)}));peer=job/'review/DECISOR-LATE-COMPLETION-REVIEW.json';peer.parent.mkdir();peer.write_text('{}');history=root/'HISTORY.json';history.write_text(json.dumps({'files':{str(old):g.sha(old)}}));original={'path':str(current),'sha256':g.sha(old)}
  plan={'decisor_original_late':{'admission':{'path':str(admission),'sha256':g.sha(admission)},'entry':{'path':str(entry),'sha256':g.sha(entry)},'peer':{'path':str(peer),'sha256':g.sha(peer)}},'decisor_late_successors':{'controller':{'original':original,'historical_copy':{'path':str(old),'sha256':g.sha(old)},'current':{'path':str(current),'sha256':g.sha(current)}}},'references':{'original_history':{'path':str(history)}}}
  return job,old,current,admission,entry,original,plan
 def call(self,fixture,name='controller'):
  from unittest.mock import patch
  job,old,current,admission,entry,original,plan=fixture
  def verified(instance,**kw):instance.plan=plan
  with patch.object(g.ScopedTopUp,'verify',verified):return g.late_successor(job,g.GENERATION,name,original,current,admission,entry)
 def test_exact_old_current_join_preserves_entry(self):
  with tempfile.TemporaryDirectory()as t:
   f=self.fixture(Path(t));before=f[4].read_bytes();self.assertTrue(self.call(f));self.assertEqual(f[4].read_bytes(),before)
 def test_missing_or_changed_history_current_entry_refuses(self):
  for kind in ('copy','current','entry','undeclared'):
   with tempfile.TemporaryDirectory()as t:
    f=self.fixture(Path(t))
    if kind=='copy':f[1].write_text('changed')
    elif kind=='current':f[2].write_text('changed')
    elif kind=='entry':f[4].write_text('{}')
    else:f[6]['decisor_late_successors']={}
    with self.subTest(kind=kind),self.assertRaises(ValueError):self.call(f)
 def test_no_original_financial_or_handoff_exception(self):
  with tempfile.TemporaryDirectory()as t:
   f=self.fixture(Path(t))
   with self.assertRaises(ValueError):self.call(f,'root_decision')
   with self.assertRaises(ValueError):self.call(f,'handoff')

class CacheFreezeTests(unittest.TestCase):
 def test_actual_canonical_entry_and_child_suppress_project_cache(self):
  import subprocess,sys,shutil
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);runtime=root/'runtime';runtime.mkdir()
   for source in Path(__file__).parent.glob('*.py'):shutil.copy2(source,runtime/source.name)
   env={'PATH':'/usr/bin:/bin','HOME':str(root),'FASTLANE_STATE_ROOT':str(root/'state'),'FASTLANE_JOB_ROOT':str(root/'jobs')}
   subprocess.run([sys.executable,str(runtime/'autopickup.py'),'--help'],env=env,capture_output=True,check=True,timeout=15)
   self.assertEqual(list(runtime.rglob('*.pyc')),[])
   subprocess.run([sys.executable,'-c',"import autopickup,subprocess,sys; subprocess.run([sys.executable,'-c','import pod_runner'],check=True)"],cwd=runtime,env=env,capture_output=True,check=True,timeout=15)
   self.assertEqual([p for p in runtime.rglob('*.pyc')if not p.name.startswith('autopickup.')],[])

class ActualClosureTests(unittest.TestCase):
 def setUp(self):
  import contextlib,datetime,hashlib
  from unittest.mock import patch
  import scoped_native_topup_operator as op
  self.op=op;self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.rid=getattr(self,'fixture_rid',g.RYO)
  self.job=self.root/self.rid;self.base=self.job/'review/native-small-topup';self.base.mkdir(parents=True);self.runtime=self.root/'runtime';self.runtime.mkdir();self.state=self.root/'state';(self.state/'requests').mkdir(parents=True);(self.state/'pods').mkdir()
  self.patches=[patch.object(g,'STATE',self.state),patch.object(g,'RUNTIME',self.runtime),patch.object(op,'JOBROOT',self.root),patch.object(op,'paths',self.paths)]
  for p in self.patches:p.start()
  self.ledger=Tests().ledger(self.rid);self.ledgerpath=self.state/'pods'/f'{self.rid}.json';self.write(self.ledgerpath,self.ledger)
  self.s={'id':self.rid,'operational_hold':{'reason':'original_failure','transient':False}};self.statepath=self.state/'requests'/f'{self.rid}.json';self.write(self.statepath,self.s)
  refs={}
  for name in g.REFS:
   path=self.root/(name+'.json');path.write_text('{}')
   if name=='gate':path=Path(g.__file__).resolve()
   elif name=='operator':path=Path(op.__file__).resolve()
   elif name in ('controller','pod_runner','v16_profiles'):
    path=self.runtime/('autopickup.py' if name=='controller' else name+'.py');path.write_text('# synthetic first-party source fixture\n')
   elif name=='recipe':path=self.job/'trusted-runner/POD-RECIPE.json';path.parent.mkdir();self.write(path,{'kind':'python_inprocess','min_vram_gb':24 if self.rid==g.RYO else 80,'code':{'commit':'synthetic','tree':'synthetic'}})
   elif name=='profile_admission':path=self.job/'review/V16-PROFILE-ADMISSION.json';self.write(path,{'generation':g.GENERATION})
   refs[name]={'path':str(path),'sha256':g.sha(path)}
  retained=self.root/'retained-original-claim.json';self.write(retained,{'original':'unchanged'})
  self.write(Path(refs['original_history']['path']),{'files':{str(retained):g.sha(retained)}})
  self.write(Path(refs['source_freeze']['path']),{'files':{str(p):g.sha(p)for p in self.runtime.rglob('*')if p.is_file()}})
  for r in refs.values():r['sha256']=g.sha(r['path'])
  self.p={'schema_version':1,'SOURCE_ONLY_PROSPECTIVE_NOT_INSTALLABLE':False,'scope':g.SCOPE,'order_id':self.rid,'generation':g.GENERATION,'bounds':dict(zip(('old_creation_attempts','old_spend_usd','maximum_lifetime_allocations','maximum_lifetime_usd'),g.BOUNDS[self.rid])),'max_new_usd':5,'max_ttl_hours':1,'selected_gpu':'RTX6000' if self.rid==g.RYO else 'H100','references':refs,'original_state_sha256':g.sha(self.statepath),'original_ledger_sha256':g.sha(self.ledgerpath),'original_execstart_sha256':op.execstart_sha256(self.original_show())}
  self.write(self.base/'PLAN.json',self.p)
  self.claim={'order_id':self.rid,'generation':g.GENERATION,'plan_sha256':g.sha(self.base/'PLAN.json'),'original_state_sha256':self.p['original_state_sha256'],'original_ledger_sha256':self.p['original_ledger_sha256']}
  self.auth={'scope':g.SCOPE,'root_owner':g.ROOT_OWNER,'verdict':'ACCEPTED','standing_decision_authenticity_verified':True,'financial_scope':self.p['bounds'],'selected_gpu':'RTX6000' if self.rid==g.RYO else 'H100','plan_sha256':g.sha(self.base/'PLAN.json'),'activation_claim_sha256':hashlib.sha256(json.dumps(self.claim,sort_keys=True,allow_nan=False).encode()).hexdigest(),'expected_row':{}}
  self.write(self.base/'ROOT-AUTHORITY.json',self.auth)
  self.peer={'verdict':'PASS','reviewer_engine':'claude','standing_decision_authenticity_verified':True,'plan_sha256':g.sha(self.base/'PLAN.json'),'root_authority_sha256':g.sha(self.base/'ROOT-AUTHORITY.json'),'gate_sha256':g.sha(g.__file__),'operator_sha256':g.sha(op.__file__)};self.write(self.base/'SOURCE-PEER.json',self.peer)
  self.a=Mock();self.a.cycle_lock.side_effect=lambda **kw:contextlib.nullcontext(True);self.a.load_state.side_effect=lambda rid:g.read(self.statepath);self.a.save_state.side_effect=lambda s:self.write(self.statepath,s);self.a.utcnow.return_value=datetime.datetime(2026,10,9,tzinfo=datetime.timezone.utc);self.a.iso.side_effect=lambda dt:dt.isoformat();self.a.update_row.return_value=True;self.a.Effects.return_value.unit_state.return_value={'ActiveState':'inactive'}
  self.a.load_row.return_value={'evaluation_status':'starting'}
 def tearDown(self):
  for p in reversed(self.patches):p.stop()
  self.tmp.cleanup()
 def paths(self,rid,scope=g.SCOPE):return self.job,self.base,'synthetic-own-unit',self.root/'unit.d/drop.conf'
 def show(self,binding,*,changed_status=False):
  import shlex
  stamp='Fri 2026-10-09 18:54:00 UTC' if changed_status else '[n/a]'
  return '{ path='+binding['path']+' ; argv[]='+shlex.join(binding['argv'])+' ; ignore_errors='+('yes' if binding['ignore_errors'] else 'no')+' ; start_time='+stamp+' ; stop_time='+stamp+' ; pid='+('91824' if changed_status else '0')+' ; code='+('exited' if changed_status else '(null)')+' ; status='+('1/FAILURE' if changed_status else '0/0')+' }\n'
 def original_show(self,*,changed_status=False):
  return self.show({'path':'/usr/bin/python3','argv':['/usr/bin/python3','/home/flori/bin/jevbench-autopickup.py','evaluate',self.rid],'ignore_errors':False},changed_status=changed_status)
 def system_show(self,*args):
  if args[0]!='show':return ''
  if 'Type' in args:return 'exec'
  if self.paths(self.rid)[3].exists():return self.show(self.op.continuation_binding(self.rid),changed_status=True)
  return self.original_show(changed_status=True)
 def write(self,p,v):p.write_text(json.dumps(v,sort_keys=True,allow_nan=False))
 def adopt(self):
  self.write(self.base/'ACTIVATION-CLAIM.json',self.claim)
  self.s['scoped_native_topup']={'authority_sha256':g.sha(self.base/'ROOT-AUTHORITY.json'),'peer_sha256':g.sha(self.base/'SOURCE-PEER.json'),'plan_sha256':g.sha(self.base/'PLAN.json'),'status':'owned','automatic_retry_prohibited':True};self.s.pop('operational_hold');self.write(self.statepath,self.s)
 def instance(self):return g.ScopedTopUp(self.job,{'generation':g.GENERATION},lambda:None)
 def test_actual_packet_and_full_verify(self):
  self.op.packet(self.rid);self.adopt();self.instance().recovery_bounds(self.job,self.ledger,1,5)
 def test_actual_verify_missing_forged_authority_peer_gpu_runtime_and_ledger(self):
  from unittest.mock import patch
  for kind in ('missing_auth','forged_auth','missing_peer','forged_peer','wrong_gpu','extra_runtime','changed_runtime','symlink','ledger_byte','history'):
   with self.subTest(kind=kind):
    # Fresh complete independent synthetic closure for every corruption.
    f=ActualClosureTests();f.setUp()
    try:
     f.adopt()
     if kind=='missing_auth':(f.base/'ROOT-AUTHORITY.json').unlink()
     elif kind=='forged_auth':v=dict(f.auth,root_owner='forged');f.write(f.base/'ROOT-AUTHORITY.json',v)
     elif kind=='missing_peer':(f.base/'SOURCE-PEER.json').unlink()
     elif kind=='forged_peer':f.write(f.base/'SOURCE-PEER.json',dict(f.peer,verdict='FORGED'))
     elif kind=='wrong_gpu':f.write(f.base/'PLAN.json',dict(f.p,selected_gpu='H100'))
     elif kind=='extra_runtime':(f.runtime/'unexpected.py').write_text('unexpected')
     elif kind=='changed_runtime':(f.runtime/'autopickup.py').write_text('changed')
     elif kind=='symlink':(f.runtime/'alias.py').symlink_to(f.runtime/'pod_runner.py')
     elif kind=='ledger_byte':f.ledgerpath.write_text(f.ledgerpath.read_text()+'\n')
     elif kind=='history':(f.root/'retained-original-claim.json').write_text('{}')
     with self.assertRaises(ValueError):f.instance()
    finally:f.tearDown()
 def test_actual_eligible_whole_state_cas_refuses_before_imports(self):
  self.statepath.write_text(self.statepath.read_text()+'\n')
  with self.assertRaisesRegex(ValueError,'CAS'):self.op.eligible(self.a,self.rid,self.p,self.auth)
 def test_actual_fail_durable_before_db_failure_and_exit(self):
  self.adopt();self.a.update_row.side_effect=RuntimeError('DB unavailable')
  with self.assertRaises(RuntimeError):self.op.fail(self.a,self.rid)
  self.op.exit_receipt(self.a,self.rid)
  self.assertEqual(g.read(self.base/'EXIT.json')['outcome']['status'],'held')
  self.assertIs(g.read(self.statepath)['operational_hold']['transient'],False)
 def test_failure_persistence_exception_never_exit(self):
  self.adopt();self.a.save_state.side_effect=OSError('disk unavailable')
  with self.assertRaises(OSError):self.op.fail(self.a,self.rid)
  with self.assertRaises(ValueError):self.op.exit_receipt(self.a,self.rid)
  self.assertFalse((self.base/'EXIT.json').exists())
 def test_preowned_packet_failure_continuation_holds_before_exit(self):
  self.adopt();(self.base/'SOURCE-PEER.json').unlink()
  with self.assertRaises(ValueError):self.op.continuation(self.a,self.rid)
  self.op.terminal(self.a,self.rid);self.assertTrue((self.base/'EXIT.json').exists())
 def test_actual_restore_refuses_unheld_exit_and_unknown_cleanup(self):
  self.adopt();drop=self.paths(self.rid)[3];drop.parent.mkdir();drop.write_bytes(self.op.dropbytes(self.rid));self.write(self.base/'EXIT.json',{'unit':'synthetic-own-unit'})
  with self.assertRaises(ValueError):self.op.restore(self.a,self.rid,self.p)
  self.op.fail(self.a,self.rid);self.write(self.ledgerpath,dict(self.ledger,cleanup_uncertain=True))
  with self.assertRaises(ValueError):self.op.restore(self.a,self.rid,self.p)
  self.assertTrue(drop.exists())
 def test_actual_unowned_exit_and_timeout_hold_then_restore(self):
  from unittest.mock import patch
  for timeout in (False,True):
   f=ActualClosureTests();f.setUp()
   try:
    f.adopt();drop=f.paths(f.rid)[3];drop.parent.mkdir();drop.write_bytes(f.op.dropbytes(f.rid))
    if timeout:f.a.Effects.return_value.unit_state.side_effect=[{'ActiveState':'active'},{'ActiveState':'inactive'},{'ActiveState':'inactive'}]
    def system(*args):return f.system_show(*args)
    with patch.object(f.op,'sysrun',side_effect=system):f.op.await_exit(f.a,f.rid,f.p,timeout=0 if timeout else 5)
    f.op.terminal(f.a,f.rid);self.assertTrue((f.base/'RESTORED.json').exists());self.assertTrue((f.base/'SUPERVISOR-EXIT.json').exists());self.assertFalse(drop.exists())
   finally:f.tearDown()
 def test_actual_physical_ada_gate(self):
  self.adopt();x=self.instance();provider=Mock()
  for stdout,valid in [('NVIDIA RTX 6000 Ada Generation, 49140, 8.9',True),('Quadro RTX 6000, 24576, 7.5',False),('NVIDIA RTX 6000 Ada Generation, 24576, 8.9',False),('NVIDIA RTX 6000 Ada Generation, 49140, 8.0',False),('NVIDIA RTX 6000 Ada Generation, nan, 8.9',False)]:
   provider.exec.return_value=Mock(returncode=0,stdout=stdout);state={}
   if valid:x.bind_created_hardware(provider,'synthetic-pod',state);x.check_created_hardware('synthetic-pod',state)
   else:
    with self.assertRaises(ValueError):x.bind_created_hardware(provider,'synthetic-pod',state)
  with self.assertRaises(ValueError):x.check_created_hardware('different-pod',state)
 def test_actual_root_final_binding_required(self):
  with self.assertRaises(ValueError):self.op.final_binding(self.rid,None,None)
  paths={'plan':self.base/'PLAN.json','authority':self.base/'ROOT-AUTHORITY.json','peer':self.base/'SOURCE-PEER.json','gate':Path(g.__file__).resolve(),'operator':Path(self.op.__file__).resolve(),'source_freeze':Path(self.p['references']['source_freeze']['path'])}
  b={'order_id':self.rid,'root_owner':g.ROOT_OWNER,'scope':g.SCOPE,'financial_source_closure_verified':True,'references':{n:{'path':str(p),'sha256':g.sha(p)}for n,p in paths.items()}}
  bp=self.root/'actual-root-binding.json';self.write(bp,b);self.op.final_binding(self.rid,bp,g.sha(bp))
  with self.assertRaises(ValueError):self.op.final_binding(self.rid,bp,'0'*64)
 def test_actual_apply_requires_binding_before_claim(self):
  from unittest.mock import patch
  with patch.dict('os.environ',{'AGENT_BOARD_NAME':g.ROOT_OWNER}),patch.object(self.op,'eligible',return_value=(self.s,{})):
   with self.assertRaises(ValueError):self.op.apply(self.a,self.rid,True)
  self.assertFalse((self.base/'ACTIVATION-CLAIM.json').exists())
 def test_actual_runner_budget_type_single_attempt_selected_gpu(self):
  import pod_runner as runner
  from unittest.mock import patch
  self.adopt();x=self.instance();recipe=g.read(self.job/'trusted-runner/POD-RECIPE.json');source=self.job/'source';source.mkdir();self.write(source/'FETCH-RECEIPT-model.json',{})
  stage=self.root/'synthetic-stage';stage.write_text('synthetic staging')
  pins={'profile':{'inputs':{'jevbench':{'count':1500}}}}
  with patch.object(runner,'PODS_DIR',self.state/'pods'),patch.object(runner,'validate_recipe'),patch.object(runner,'export_source'),patch.object(runner,'build_staging'),patch.object(runner,'_stage_tarball',return_value=stage),patch.object(runner,'_lifecycle',side_effect=runner.PodCapacityError('synthetic capacity'))as lifecycle:
   with self.assertRaisesRegex(runner.measurement_dispatch.OperationalHold,'gpu_pod_capacity'):runner.run(self.rid,self.job,recipe,self.root/'out',pins,25,provider=Mock(),allocation_gate=x,measurement_pins_factory=lambda:pins)
   self.assertEqual(lifecycle.call_count,1);args=lifecycle.call_args.args;self.assertEqual(args[6],('RTX6000',48));self.assertEqual(args[7:9],(1,5))
   with self.assertRaisesRegex(runner.measurement_dispatch.OperationalHold,'gpu_pod_budget_exhausted'):runner.run(self.rid,self.job,recipe,self.root/'out2',pins,25,provider=Mock(),allocation_gate=Mock(lifetime_cap_usd=999,allowed_total=999,max_new_usd=999),measurement_pins_factory=lambda:pins)
 def test_actual_lifecycle_rejects_ducktyped_extended_ceiling(self):
  import pod_runner as runner
  from unittest.mock import patch
  fake=Mock();fake.return_value=4;provider=Mock();state=dict(self.ledger)
  with patch.object(runner.pod_capacity,'allocation_count',return_value=0):
   with self.assertRaises(runner.PodRunError):runner._lifecycle(provider,'synthetic-job',{'kind':'python_inprocess'},self.root/'stage',self.root/'out',state,('RTX6000',48),1,5,Mock(),Mock(),allocation_gate=fake)
  provider.preflight.assert_not_called();provider.create.assert_not_called()

 def test_actual_decisor_cap_24_8_fourth_allocation_single_h100(self):
  import pod_runner as runner
  from unittest.mock import patch
  f=ActualClosureTests();f.fixture_rid=g.DECISOR;f.setUp()
  try:
   f.adopt();x=f.instance();recipe=g.read(f.job/'trusted-runner/POD-RECIPE.json');source=f.job/'source';source.mkdir();f.write(source/'FETCH-RECEIPT-model.json',{})
   stage=f.root/'stage';stage.write_text('synthetic');pins={'profile':{'inputs':{'jevbench':{'count':1500}}}}
   with patch.object(runner,'PODS_DIR',f.state/'pods'),patch.object(runner,'validate_recipe'),patch.object(runner,'export_source'),patch.object(runner,'build_staging'),patch.object(runner,'_stage_tarball',return_value=stage),patch.object(runner,'_lifecycle',side_effect=runner.PodCapacityError('capacity'))as lifecycle:
    with self.assertRaisesRegex(runner.measurement_dispatch.OperationalHold,'gpu_pod_capacity'):runner.run(f.rid,f.job,recipe,f.root/'out',pins,24.8,provider=Mock(),allocation_gate=x,measurement_pins_factory=lambda:pins)
    self.assertEqual(lifecycle.call_count,1);self.assertEqual(lifecycle.call_args.args[6],('H100',80));self.assertAlmostEqual(lifecycle.call_args.args[8],5)
  finally:f.tearDown()
 def test_actual_eligible_original_native_row_and_sole_unit(self):
  import datetime,v16_adoption
  from unittest.mock import patch
  row={'id':self.rid,'evaluation_status':'pending','synthetic_test':False,'stripe_mode':'live','pickup_job_dir':str(self.job),'pickup_owner':'synthetic-original-owner','evaluation_attempts':1,'status':'paid','paid_at':'2026-10-09T17:00:00Z'}
  auth=dict(self.auth,expected_row=row);self.a.load_row.return_value=row;self.a.deadline_for.return_value=datetime.datetime(2026,10,11,tzinfo=datetime.timezone.utc)
  with patch.object(v16_adoption,'selected',return_value=({'generation':g.GENERATION},{},{})),patch.object(self.op,'sysrun',side_effect=self.system_show):
   self.op.eligible(self.a,self.rid,self.p,auth)
   self.a.Effects.return_value.unit_state.return_value={'ActiveState':'active'}
   with self.assertRaises(ValueError):self.op.eligible(self.a,self.rid,self.p,auth)
 def test_actual_apply_failure_after_claim_holds_and_preserves_history(self):
  from unittest.mock import patch
  row={'pickup_owner':'original','pickup_job_dir':str(self.job),'evaluation_attempts':1};self.a.load_row.return_value=row
  with patch.dict('os.environ',{'AGENT_BOARD_NAME':g.ROOT_OWNER}),patch.object(self.op,'eligible',return_value=(self.s,row)),patch.object(self.op,'final_binding'),patch.object(self.op,'sysrun',side_effect=RuntimeError('systemd unavailable')):
   with self.assertRaises(RuntimeError):self.op.apply(self.a,self.rid,True,binding_path='synthetic',binding_sha256='synthetic')
  self.op.terminal(self.a,self.rid);self.assertTrue((self.base/'ACTIVATION-CLAIM.json').exists());self.assertTrue((self.base/'STATE-BEFORE.json').exists());self.assertFalse((self.base/'EXIT.json').exists())
 def test_actual_continuation_signal_holds_without_unconditional_exit(self):
  import signal,v16_adoption
  from unittest.mock import patch
  self.adopt();row={'evaluation_status':'starting','id':self.rid,'pickup_owner':'original','pickup_job_dir':str(self.job),'evaluation_attempts':1};self.auth['expected_row']=row
  self.write(self.base/'ROOT-AUTHORITY.json',self.auth);self.peer['root_authority_sha256']=g.sha(self.base/'ROOT-AUTHORITY.json');self.write(self.base/'SOURCE-PEER.json',self.peer);self.s['scoped_native_topup']['authority_sha256']=g.sha(self.base/'ROOT-AUTHORITY.json');self.s['scoped_native_topup']['peer_sha256']=g.sha(self.base/'SOURCE-PEER.json');self.write(self.statepath,self.s)
  self.a.load_row.return_value=row;self.a.Effects.return_value.unit_state.return_value={'ActiveState':'active'}
  drop=self.paths(self.rid)[3];drop.parent.mkdir();drop.write_bytes(self.op.dropbytes(self.rid));self.a.sql_text.side_effect=lambda x:repr(x)
  def stop(*a,**kw):signal.getsignal(signal.SIGTERM)(signal.SIGTERM,None)
  import os
  with patch.object(self.op,'sysrun',return_value=str(os.getpid())),patch.object(v16_adoption,'selected',return_value=({'generation':g.GENERATION},{},{})),patch.object(v16_adoption.v16_profiles,'measure',side_effect=stop):
   with self.assertRaises(SystemExit):self.op.continuation(self.a,self.rid)
  self.op.terminal(self.a,self.rid);self.assertTrue((self.base/'EXIT.json').exists());self.assertTrue((self.base/'ENTRY-CLAIM.json').exists())
 def test_actual_v16_measure_constructs_gate_and_original_native_guards(self):
  import contextlib,v16_profiles as v,ryotide_runtime_preflight
  from unittest.mock import patch
  self.adopt();admission={'generation':g.GENERATION};pins={'synthetic':'first-party'}
  with patch.object(v,'STATE_ROOT',self.state),patch.object(v,'accepted',return_value=(admission,pins,{})),patch.object(v,'retirement')as retirement,patch.object(v,'retirement_lock',side_effect=lambda a:contextlib.nullcontext()),patch.object(ryotide_runtime_preflight,'callback',return_value=object()),patch.object(v.pod_runner,'run',return_value={'completed':'synthetic'})as run:
   v.measure(self.job,scoped_topup=True)
   gate=run.call_args.kwargs['allocation_gate'];self.assertIs(type(gate),g.ScopedTopUp);self.assertEqual(run.call_args.args[5],25)
   with run.call_args.kwargs['pre_upload_gate']():pass
   retirement.assert_called();self.assertEqual(run.call_args.kwargs['measurement_pins_factory'](),pins)
 def test_actual_controller_ordinary_and_generation_measure_barriers(self):
  import autopickup as a,v16_adoption
  from unittest.mock import patch
  self.adopt();(self.job/'PROMPT.md').write_text('synthetic first-party assignment')
  row={'id':self.rid,'synthetic_test':False,'stripe_mode':'live','pickup_job_dir':str(self.job),'pickup_owner':'original'}
  with patch.object(a,'JOB_ROOT',self.root),patch.object(a,'STATE_ROOT',self.state),patch.object(a,'load_row',return_value=row),patch.object(a,'owner_for',return_value='original'),patch.object(a,'load_state',side_effect=self.a.load_state),patch.object(a,'gate')as legacy:
   with self.assertRaisesRegex(a.PickupError,'owned scoped topup'):a.evaluate(self.rid)
   legacy.assert_not_called()
  with patch.object(a,'STATE_ROOT',self.state),patch.object(a,'validate_review_gate'),patch.object(a,'load_state',side_effect=self.a.load_state),patch.object(v16_adoption,'selected',return_value=({'generation':g.GENERATION},{},{})),patch.object(a,'set_operational_hold')as hold,patch.object(a,'update_row'),patch.object(v16_adoption.v16_profiles,'measure')as measure:
   # Canonical handler catches PickupError into its existing held outcome.
   with self.assertRaisesRegex(a.PickupError,'adoption failed'):a.evaluate_v16_generation(self.rid,self.job)
   measure.assert_not_called();hold.assert_called()

 def test_actual_late_check_authentic_historical_source_join(self):
  import decisor_late_completion as late
  from unittest.mock import patch
  f=ActualClosureTests();f.fixture_rid=g.DECISOR;f.setUp()
  try:
   review=f.job/'review';handoff=review/'decisor-late-handoff'/g.GENERATION;handoff.mkdir(parents=True)
   old=f.root/'historical-controller.py';old.write_text('retained old source')
   decision=review/'DECISOR-ROOT-BOUNDED-COMPLETION-DECISION.json';f.write(decision,{'synthetic':'first-party decision'})
   refs={'controller':Path(f.p['references']['controller']['path']),'late_completion':Path(late.__file__).resolve(),'v16_profiles':Path(late.__file__).parent/'v16_profiles.py','profile_admission':review/'V16-PROFILE-ADMISSION.json','profile_review':review/'V16-PROFILE-REVIEW.json','allocation_authority':review/'V16-ALLOCATION-AUTHORITY.json','allocation_review':review/'V16-ALLOCATION-REVIEW.json','root_decision':decision,'source_pins':review/'SOURCE-PINS.json','handoff':handoff/'HANDOFF.json'}
   for n,p in refs.items():
    if not p.exists():f.write(p,{'synthetic':n})
   f.write(refs['handoff'],{'order_id':g.DECISOR,'generation':g.GENERATION,'one_start_only':True})
   pins={n:{'path':str(p),'sha256':g.sha(p)}for n,p in refs.items()};pins['controller']['sha256']=g.sha(old)
   admission=review/'DECISOR-LATE-COMPLETION-ADMISSION.json';oldpeer=review/'DECISOR-LATE-COMPLETION-REVIEW.json';entry=handoff/'ENTRY-CLAIM.json'
   f.write(admission,{'schema_version':1,'scope':'exact-decisor-late-paid-public-completion','root_owner':g.ROOT_OWNER,'verdict':'ACCEPTED','order_id':g.DECISOR,'generation':g.GENERATION,'expected_row':late.EXPECTED,'root_decision_sha256':g.sha(decision),'public_snapshot':{'revision':'v1.6.1','artifact_sha256':'a'*64},'references':pins})
   f.write(oldpeer,{'verdict':'ACCEPTED','reviewer_engine':'claude','admission_sha256':g.sha(admission),'root_decision_sha256':g.sha(decision)})
   f.write(entry,{'order_id':g.DECISOR,'generation':g.GENERATION,'admission_sha256':g.sha(admission),'handoff_sha256':pins['handoff']['sha256']})
   before=entry.read_bytes()
   historypath=Path(f.p['references']['original_history']['path']);history=g.read(historypath);history['files'][str(old)]=g.sha(old);f.write(historypath,history);f.p['references']['original_history']['sha256']=g.sha(historypath)
   f.p['decisor_original_late']={n:{'path':str(p),'sha256':g.sha(p)}for n,p in {'admission':admission,'entry':entry,'peer':oldpeer}.items()}
   f.p['decisor_late_successors']={'controller':{'original':pins['controller'],'historical_copy':{'path':str(old),'sha256':g.sha(old)},'current':{'path':str(refs['controller']),'sha256':g.sha(refs['controller'])}}}
   f.write(f.base/'PLAN.json',f.p);f.claim['plan_sha256']=g.sha(f.base/'PLAN.json');import hashlib
   f.auth['plan_sha256']=g.sha(f.base/'PLAN.json');f.auth['activation_claim_sha256']=hashlib.sha256(json.dumps(f.claim,sort_keys=True,allow_nan=False).encode()).hexdigest();f.write(f.base/'ROOT-AUTHORITY.json',f.auth)
   f.peer['plan_sha256']=g.sha(f.base/'PLAN.json');f.peer['root_authority_sha256']=g.sha(f.base/'ROOT-AUTHORITY.json');f.write(f.base/'SOURCE-PEER.json',f.peer)
   f.adopt();f.s['decisor_late_public_completion']={'verdict':'ACCEPTED','admission_sha256':g.sha(admission),'independent_review_sha256':g.sha(oldpeer)};f.write(f.statepath,f.s)
   f.a.__file__=str(refs['controller']);f.a.TABLE='synthetic_table';f.a.sql_json.return_value={'identity_sha256':late.IDENTITY_SHA};f.a.load_row.return_value=dict(late.EXPECTED,evaluation_status='running')
   with patch.object(late,'ROOT_DECISION_SHA',g.sha(decision)),patch.object(late,'public_absent',return_value=('v1.6.1','a'*64)):
    obj=late.LateCompletion(f.job,g.GENERATION,f.a);obj.check()
    self.assertEqual(entry.read_bytes(),before)
    old.write_text('tampered historical controller')
    with self.assertRaises(ValueError):obj.check()
  finally:f.tearDown()

 def test_actual_apply_one_start_unowned_exit_hold_restore(self):
  from unittest.mock import patch
  row={'pickup_owner':'original','pickup_job_dir':str(self.job),'evaluation_attempts':1};self.a.load_row.return_value=row;self.a.sql_text.side_effect=repr
  calls=[]
  def system(*args):calls.append(args);return self.system_show(*args)
  with patch.dict('os.environ',{'AGENT_BOARD_NAME':g.ROOT_OWNER}),patch.object(self.op,'eligible',return_value=(self.s,row)),patch.object(self.op,'final_binding'),patch.object(self.op,'sysrun',side_effect=system):
   self.op.apply(self.a,self.rid,True,binding_path='synthetic',binding_sha256='synthetic')
  self.assertEqual(sum(1 for c in calls if c[0]=='start'),1);self.op.terminal(self.a,self.rid);self.assertTrue((self.base/'RESTORED.json').exists());self.assertTrue((self.base/'START-REQUESTED.json').exists())
  self.assertEqual(g.sha(self.ledgerpath),self.p['original_ledger_sha256'])
 def test_actual_continuation_completion_before_exit_and_restore(self):
  import v16_adoption,os
  from unittest.mock import patch
  self.adopt();row={'evaluation_status':'starting','id':self.rid,'pickup_owner':'original','pickup_job_dir':str(self.job),'evaluation_attempts':1};self.auth['expected_row']=row;self.write(self.base/'ROOT-AUTHORITY.json',self.auth);self.peer['root_authority_sha256']=g.sha(self.base/'ROOT-AUTHORITY.json');self.write(self.base/'SOURCE-PEER.json',self.peer);self.s['scoped_native_topup']['authority_sha256']=g.sha(self.base/'ROOT-AUTHORITY.json');self.s['scoped_native_topup']['peer_sha256']=g.sha(self.base/'SOURCE-PEER.json');self.write(self.statepath,self.s)
  self.a.load_row.return_value=row;self.a.sql_text.side_effect=repr;self.a.Effects.return_value.unit_state.return_value={'ActiveState':'active'};drop=self.paths(self.rid)[3];drop.parent.mkdir();drop.write_bytes(self.op.dropbytes(self.rid))
  def measured(*args,**kwargs):
   output=self.state/'measurements'/self.rid/g.GENERATION/'jevbench';output.mkdir(parents=True);self.write(output/'receipt.json',{'synthetic':'completed native receipt'});self.write(self.ledgerpath,dict(self.ledger,measurement_completed=True))
  def adopted(*args):
   row['evaluation_status']='ready_for_release';state=g.read(self.statepath);state['v16_host_measurements']={g.GENERATION:{'jevbench':{'synthetic':'completed native receipt'}}};self.write(self.statepath,state);return 0
  self.a.evaluate_v16_generation.side_effect=adopted
  with patch.object(self.op,'sysrun',return_value=str(os.getpid())),patch.object(v16_adoption,'selected',return_value=({'generation':g.GENERATION},{},{})),patch.object(v16_adoption.v16_profiles,'measure',side_effect=measured):self.assertEqual(self.op.continuation(self.a,self.rid),0)
  self.assertEqual(self.op.terminal(self.a,self.rid)['status'],'completed');self.assertTrue((self.base/'EXIT.json').exists());self.assertNotIn('operational_hold',g.read(self.statepath))
  self.a.Effects.return_value.unit_state.return_value={'ActiveState':'inactive'}
  with patch.object(self.op,'sysrun',side_effect=self.system_show):self.op.restore(self.a,self.rid,self.p)
  self.assertTrue((self.base/'RESTORED.json').exists())

 def test_actual_lifecycle_authentic_scoped_fourth_ceiling_and_budget(self):
  import pod_runner as runner
  from unittest.mock import patch
  f=ActualClosureTests();f.fixture_rid=g.DECISOR;f.setUp()
  try:
   f.adopt();x=f.instance();provider=Mock();provider.preflight.side_effect=runner.PodCapacityError('synthetic fresh quote absent')
   with patch.object(runner.pod_capacity,'allocation_count',return_value=3):
    with self.assertRaises(runner.PodCapacityError):runner._lifecycle(provider,'synthetic-job',{'kind':'python_inprocess'},f.root/'stage',f.root/'out',dict(f.ledger),('H100',80),1,5,Mock(),Mock(),allocation_gate=x)
   provider.preflight.assert_called_once();provider.reserve.assert_not_called();provider.create.assert_not_called()
  finally:f.tearDown()
 def test_actual_late_missing_plan_is_valueerror(self):
  with self.assertRaises(ValueError):g.late_successor(self.root/g.DECISOR,g.GENERATION,'controller',{},self.root/'missing.py',self.root/'missing-admission',self.root/'missing-entry')
 def test_actual_created_old24gb_card_tears_down_before_pull_or_input(self):
  import pod_runner as runner
  from unittest.mock import patch
  self.adopt();x=self.instance();state=dict(self.ledger);provider=Mock();provider.preflight.return_value=None;provider.reserve.return_value='synthetic-reservation';provider.create.return_value={'pod_id':'synthetic-own-pod','hourly_usd':1,'gpu':'RTX6000','gpu_count':1};provider.exec.return_value=Mock(returncode=0,stdout='Quadro RTX 6000, 24576, 7.5')
  recipe={'kind':'python_inprocess','min_vram_gb':24}
  with patch.object(runner.pod_capacity,'allocation_count',return_value=2),patch.object(runner,'_teardown')as cleanup,patch.object(runner,'_exec')as runtime:
   with self.assertRaisesRegex(ValueError,'not exact RTX6000 Ada'):runner._lifecycle(provider,'synthetic-own-job',recipe,self.root/'stage',self.root/'out',state,('RTX6000',48),1,5,Mock(),lambda:self.write(self.ledgerpath,state),allocation_gate=x)
   cleanup.assert_called_once();runtime.assert_not_called();provider.scp_to.assert_not_called()
  self.assertFalse(state['input_dispatched']);self.assertFalse(state['execution_started']);self.assertEqual(state['creation_attempts'],3);self.assertEqual(state['spent_upper_bound_usd'],25);self.assertIsNone(state['pod_id']);self.assertIs(state['cleanup_uncertain'],False)
 def test_missing_activation_custody_still_permanently_held(self):
  self.adopt();(self.base/'ACTIVATION-CLAIM.json').unlink()
  with self.assertRaises(ValueError):self.op.continuation(self.a,self.rid)
  self.op.terminal(self.a,self.rid);self.assertTrue((self.base/'EXIT.json').exists())

 def test_realistic_execstart_ignores_status_binds_executable_argv_and_errors(self):
  self.assertEqual(self.op.execstart_sha256(self.original_show()),self.op.execstart_sha256(self.original_show(changed_status=True)))
  binding=self.op.execstart_binding(self.original_show())
  for field in ('path','argv','ignore_errors'):
   changed=copy.deepcopy(binding)
   if field=='path':changed['path']='/usr/bin/other';changed['argv'][0]='/usr/bin/other'
   elif field=='argv':changed['argv']+=['unexpected']
   else:changed['ignore_errors']=True
   self.assertNotEqual(self.op.execstart_sha256(self.show(changed)),self.p['original_execstart_sha256'])
  for raw in ('original argv\n',self.original_show()+self.original_show(),self.original_show().replace('ignore_errors=no','ignore_errors=unknown')):
   with self.assertRaises(ValueError):self.op.execstart_sha256(raw)
 def test_restore_refuses_changed_loaded_argv_before_unlink(self):
  from unittest.mock import patch
  self.adopt();self.op.fail(self.a,self.rid);drop=self.paths(self.rid)[3];drop.parent.mkdir();drop.write_bytes(self.op.dropbytes(self.rid))
  with patch.object(self.op,'sysrun',return_value=self.original_show(changed_status=True))as system:
   with self.assertRaisesRegex(ValueError,'loaded owned'):self.op.restore(self.a,self.rid,self.p)
   system.assert_called_once()
  self.assertEqual(drop.read_bytes(),self.op.dropbytes(self.rid));self.assertFalse((self.base/'RESTORED.json').exists())
 def test_restore_unexpected_underlying_argv_rolls_back_owned_dropin(self):
  from unittest.mock import patch
  self.adopt();self.op.fail(self.a,self.rid);drop=self.paths(self.rid)[3];drop.parent.mkdir();drop.write_bytes(self.op.dropbytes(self.rid));calls=[]
  def system(*args):
   calls.append(args)
   if args[0]!='show':return ''
   if drop.exists():return self.show(self.op.continuation_binding(self.rid),changed_status=True)
   changed=self.op.execstart_binding(self.original_show());changed['argv']+=['unexpected'];return self.show(changed,changed_status=True)
  with patch.object(self.op,'sysrun',side_effect=system):
   with self.assertRaisesRegex(ValueError,'original argv restore'):self.op.restore(self.a,self.rid,self.p)
  self.assertEqual(drop.read_bytes(),self.op.dropbytes(self.rid));self.assertEqual(sum(c[0]=='daemon-reload' for c in calls),2);self.assertFalse((self.base/'RESTORED.json').exists());self.op.terminal(self.a,self.rid)

class FourthScopeTests(unittest.TestCase):
 def fixture(self,rid=g.RYO,scope=g.RYO_FOURTH_SCOPE):
  f=ActualClosureTests();f.fixture_rid=rid;f.setUp();oldbase=f.base
  # Synthetic immutable custody represents an already failed third attempt.
  f.adopt();anchor=f.s['scoped_native_topup'].copy()
  outcome={'status':'held','plan_sha256':anchor['plan_sha256'],'reason':'continuation_failed'}
  for name in ('ENTRY-CLAIM.json','RESERVE-CLAIM.json','CREATE-CLAIM.json','STATE-BEFORE.json','START-REQUESTED.json'):f.write(oldbase/name,{'synthetic_consumed':name})
  f.write(oldbase/'EXIT.json',{'outcome':outcome});f.write(oldbase/'RESTORED.json',{'terminal_outcome':outcome})
  f.s['scoped_native_topup_outcome']=outcome;f.s['operational_hold']={'reason':'scoped_native_topup_reconciliation_required','transient':False};f.write(f.statepath,f.s)
  n,spent,_,_=g.configuration(rid,scope)[0];f.ledger.update(creation_attempts=n,spent_upper_bound_usd=spent);f.write(f.ledgerpath,f.ledger)
  previous={p.name:{'path':str(p),'sha256':g.sha(p)}for p in oldbase.iterdir()if p.name in {'PLAN.json','ROOT-AUTHORITY.json','SOURCE-PEER.json','ACTIVATION-CLAIM.json','ENTRY-CLAIM.json','RESERVE-CLAIM.json','CREATE-CLAIM.json','STATE-BEFORE.json','START-REQUESTED.json','EXIT.json','RESTORED.json'}}
  hp=Path(f.p['references']['original_history']['path']);history=g.read(hp);history['files'].update({r['path']:r['sha256']for r in previous.values()});f.write(hp,history)
  full=f.root/'full-sql-row.json';f.write(full,{'id':f.rid,'all_columns':'synthetic complete row'});history['files'][str(full)]=g.sha(full);f.write(hp,history)
  f.p['full_sql_row']={'path':str(full),'sha256':g.sha(full)}
  f.p['references']['original_history']['sha256']=g.sha(hp)
  f.base=f.job/'review'/g.configuration(rid,scope)[1];f.base.mkdir()
  f.p.update(scope=scope,bounds=dict(zip(('old_creation_attempts','old_spend_usd','maximum_lifetime_allocations','maximum_lifetime_usd'),g.configuration(rid,scope)[0])),previous_topup=previous,original_state_sha256=g.sha(f.statepath),original_ledger_sha256=g.sha(f.ledgerpath))
  f.write(f.base/'PLAN.json',f.p)
  f.claim.update(plan_sha256=g.sha(f.base/'PLAN.json'),original_state_sha256=f.p['original_state_sha256'],original_ledger_sha256=f.p['original_ledger_sha256'])
  import hashlib
  f.auth.update(scope=scope,financial_scope=f.p['bounds'],plan_sha256=g.sha(f.base/'PLAN.json'),activation_claim_sha256=hashlib.sha256(json.dumps(f.claim,sort_keys=True,allow_nan=False).encode()).hexdigest())
  f.write(f.base/'ROOT-AUTHORITY.json',f.auth);f.peer.update(plan_sha256=g.sha(f.base/'PLAN.json'),root_authority_sha256=g.sha(f.base/'ROOT-AUTHORITY.json'));f.write(f.base/'SOURCE-PEER.json',f.peer)
  return f
 def test_literal_scope_no_decisor_or_unknown_extension(self):
  self.assertEqual(g.BOUNDS[g.RYO],(2,20.,3,25.));self.assertEqual(g.BOUNDS[g.DECISOR],(3,19.8,4,24.8))
  self.assertEqual(g.configuration(g.RYO,g.RYO_FOURTH_SCOPE)[0],(3,25.,4,30.))
  for rid,scope in [(g.DECISOR,g.RYO_FOURTH_SCOPE),(g.RYO,'arbitrary')]:
   with self.assertRaises(ValueError):g.configuration(rid,scope)
 def test_actual_fourth_verify_and_one_reserve_create(self):
  f=self.fixture()
  try:
   g.previous_failure(f.job,f.s,f.p);f.op.packet(f.rid,scope=g.RYO_FOURTH_SCOPE)
   f.write(f.base/'ACTIVATION-CLAIM.json',f.claim)
   _,_,key,_=g.configuration(f.rid,g.RYO_FOURTH_SCOPE)
   f.s[key]={'authority_sha256':g.sha(f.base/'ROOT-AUTHORITY.json'),'peer_sha256':g.sha(f.base/'SOURCE-PEER.json'),'plan_sha256':g.sha(f.base/'PLAN.json'),'status':'owned','automatic_retry_prohibited':True};f.s.pop('operational_hold');f.write(f.statepath,f.s)
   x=g.ScopedTopUp(f.job,{'generation':g.GENERATION},lambda:None,scope=g.RYO_FOURTH_SCOPE)
   self.assertEqual(x('before_reserve',f.ledger),4)
   with self.assertRaises(ValueError):x('before_reserve',f.ledger)
   charged=copy.deepcopy(f.ledger);charged.update(creation_attempts=4,spent_upper_bound_usd=30,attempt_ttl_hours=1,attempt_reserved_upper_bound_usd=5,attempt_contingency_usd=0,cleanup_uncertain=True)
   self.assertEqual(x('before_create',charged),4)
   with self.assertRaises(FileExistsError):x('before_create',charged)
   old=copy.deepcopy(f.s['scoped_native_topup']);f.op.fail(f.a,f.rid,scope=g.RYO_FOURTH_SCOPE)
   self.assertEqual(f.a.load_state(f.rid)['scoped_native_topup'],old)
   self.assertEqual(f.a.load_state(f.rid)['scoped_native_topup_outcome'],f.s['scoped_native_topup_outcome'])
   f.op.exit_receipt(f.a,f.rid,scope=g.RYO_FOURTH_SCOPE)
   self.assertTrue((f.base/'EXIT.json').is_file())
  finally:f.tearDown()
 def test_previous_custody_or_finance_mutations_refused(self):
  for kind in ('anchor','outcome','claim','history','old_scope','old_exit','count','spend','cleanup','input'):
   f=self.fixture()
   try:
    if kind=='anchor':f.s['scoped_native_topup']['plan_sha256']='0'*64
    elif kind=='outcome':f.s['scoped_native_topup_outcome']['reason']='unknown'
    elif kind=='claim':Path(f.p['previous_topup']['ENTRY-CLAIM.json']['path']).write_text('{}')
    elif kind=='history':f.write(Path(f.p['references']['original_history']['path']),{'files':{}})
    elif kind=='old_scope':f.p['previous_topup'].pop('PLAN.json')
    elif kind=='old_exit':f.p['previous_topup'].pop('EXIT.json')
    else:
     k,v={'count':('creation_attempts',2),'spend':('spent_upper_bound_usd',20),'cleanup':('cleanup_uncertain',True),'input':('input_dispatched',True)}[kind];f.ledger[k]=v
    with self.subTest(kind=kind),self.assertRaises(ValueError):
     g.previous_failure(f.job,f.s,f.p);g.preinput(f.rid,f.ledger,scope=g.RYO_FOURTH_SCOPE)
   finally:f.tearDown()
 def test_fourth_argv_different_and_original_unchanged(self):
  import scoped_native_topup_operator as op
  self.assertNotIn('--scope',op.dropbytes(g.RYO).decode())
  self.assertIn('--scope '+g.RYO_FOURTH_SCOPE,op.dropbytes(g.RYO,scope=g.RYO_FOURTH_SCOPE).decode())
  self.assertIn(g.RYO_FOURTH_SCOPE,op.continuation_binding(g.RYO,scope=g.RYO_FOURTH_SCOPE)['argv'])

 def test_actual_whole_sql_guard_refuses_any_column_drift(self):
  f=self.fixture()
  try:
   f.a.TABLE='synthetic_orders';f.a.sql_text.side_effect=lambda x:"'"+x.replace("'","''")+"'";f.a.sql_json.return_value=g.read(f.p['full_sql_row']['path'])
   self.assertIn('to_jsonb(synthetic_orders)',f.op.full_row_guard(f.a,f.rid,f.p,g.RYO_FOURTH_SCOPE))
   f.a.sql_json.return_value={**f.a.sql_json.return_value,'any_column':'changed'}
   with self.assertRaisesRegex(ValueError,'whole SQL'):f.op.full_row_guard(f.a,f.rid,f.p,g.RYO_FOURTH_SCOPE)
  finally:f.tearDown()
 def test_actual_fourth_apply_one_start_whole_sql_and_restore(self):
  from unittest.mock import patch
  f=self.fixture()
  try:
   original=g.read(f.p['full_sql_row']['path']);row={'pickup_owner':'original','pickup_job_dir':str(f.job),'evaluation_attempts':1};f.a.load_row.return_value=row;f.a.TABLE='synthetic_table';f.a.sql_text.side_effect=repr
   old=f.s['scoped_native_topup'].copy();calls=[];queries=[]
   def sql(statement):
    queries.append(statement)
    return original if len(queries)==1 else dict(original,evaluation_status='starting')
   f.a.sql_json.side_effect=sql
   def system(*args):
    calls.append(args)
    if args[0]!='show':return ''
    return f.show(f.op.continuation_binding(f.rid,scope=g.RYO_FOURTH_SCOPE),changed_status=True)if f.paths(f.rid)[3].exists()else f.original_show(changed_status=True)
   with patch.dict('os.environ',{'AGENT_BOARD_NAME':g.ROOT_OWNER}),patch.object(f.op,'eligible',return_value=(f.s,row)),patch.object(f.op,'final_binding'),patch.object(f.op,'sysrun',side_effect=system):
    f.op.apply(f.a,f.rid,True,binding_path='synthetic',binding_sha256='synthetic',scope=g.RYO_FOURTH_SCOPE)
   self.assertEqual(sum(c[0]=='start'for c in calls),1);self.assertEqual(f.a.load_state(f.rid)['scoped_native_topup'],old);self.assertTrue((f.base/'RESTORED.json').exists());self.assertTrue((f.base/'STARTING-ROW-CLAIM.json').exists());self.assertEqual(len(queries),2)
   self.assertIn('to_jsonb(synthetic_table)',f.a.update_row.call_args_list[0].args[2])
  finally:f.tearDown()
 def test_actual_fourth_continuation_whole_sql_then_native_failure_holds(self):
  import os,v16_adoption
  from unittest.mock import patch
  for drift in (False,True):
   f=self.fixture()
   try:
    scope=g.RYO_FOURTH_SCOPE;key=g.configuration(f.rid,scope)[2];row={'evaluation_status':'starting','id':f.rid,'pickup_owner':'original','pickup_job_dir':str(f.job),'evaluation_attempts':1}
    f.auth['expected_row']=row;f.write(f.base/'ROOT-AUTHORITY.json',f.auth);f.peer['root_authority_sha256']=g.sha(f.base/'ROOT-AUTHORITY.json');f.write(f.base/'SOURCE-PEER.json',f.peer);f.write(f.base/'ACTIVATION-CLAIM.json',f.claim)
    old=copy.deepcopy(f.s['scoped_native_topup']);f.s[key]={'authority_sha256':g.sha(f.base/'ROOT-AUTHORITY.json'),'peer_sha256':g.sha(f.base/'SOURCE-PEER.json'),'plan_sha256':g.sha(f.base/'PLAN.json'),'status':'owned','automatic_retry_prohibited':True};f.s.pop('operational_hold');f.write(f.statepath,f.s)
    f.write(f.base/'STARTING-FULL-ROW.json',row);f.write(f.base/'STARTING-ROW-CLAIM.json',{'plan_sha256':g.sha(f.base/'PLAN.json'),'row_sha256':g.sha(f.base/'STARTING-FULL-ROW.json')})
    f.a.TABLE='synthetic_table';f.a.sql_json.return_value=dict(row,any_column='changed')if drift else row;f.a.load_row.return_value=row;f.a.sql_text.side_effect=repr;f.a.Effects.return_value.unit_state.return_value={'ActiveState':'active'};drop=f.paths(f.rid)[3];drop.parent.mkdir();drop.write_bytes(f.op.dropbytes(f.rid,scope=scope))
    with patch.object(f.op,'sysrun',return_value=str(os.getpid())),patch.object(v16_adoption,'selected',return_value=({'generation':g.GENERATION},{},{})),patch.object(v16_adoption.v16_profiles,'measure',side_effect=RuntimeError('synthetic native failure'))as measured:
     with self.assertRaises(ValueError if drift else RuntimeError):f.op.continuation(f.a,f.rid,scope=scope)
     if drift:measured.assert_not_called();self.assertFalse((f.base/'ENTRY-CLAIM.json').exists())
     else:measured.assert_called_once_with(f.job,scoped_topup=scope);self.assertTrue((f.base/'ENTRY-CLAIM.json').exists())
    self.assertEqual(f.a.load_state(f.rid)['scoped_native_topup'],old);self.assertEqual(f.op.terminal(f.a,f.rid,scope=scope)['status'],'held');self.assertTrue((f.base/'EXIT.json').exists())
   finally:f.tearDown()

class FifthScopeTests(unittest.TestCase):
 def test_exact_decisor_fifth_preinput_and_oneuse_finance(self):
  f=FourthScopeTests().fixture(g.DECISOR,g.DECISOR_FIFTH_SCOPE)
  try:
   scope=g.DECISOR_FIFTH_SCOPE;g.previous_failure(f.job,f.s,f.p,rid=g.DECISOR);g.preinput(f.rid,f.ledger,scope=scope)
   for rid in (g.RYO,'other'):
    with self.assertRaises(ValueError):g.configuration(rid,scope)
   _,_,key,_=g.configuration(f.rid,scope);f.write(f.base/'ACTIVATION-CLAIM.json',f.claim)
   f.s[key]={'authority_sha256':g.sha(f.base/'ROOT-AUTHORITY.json'),'peer_sha256':g.sha(f.base/'SOURCE-PEER.json'),'plan_sha256':g.sha(f.base/'PLAN.json'),'status':'owned','automatic_retry_prohibited':True};f.s.pop('operational_hold');f.write(f.statepath,f.s)
   x=g.ScopedTopUp(f.job,{'generation':g.GENERATION},lambda:None,scope=scope);self.assertEqual(x.lifetime_cap_usd,29.8);self.assertEqual(x('before_reserve',f.ledger),5)
   s=copy.deepcopy(f.ledger);s.update(creation_attempts=5,spent_upper_bound_usd=29.8,attempt_ttl_hours=1,attempt_reserved_upper_bound_usd=5,attempt_contingency_usd=0,cleanup_uncertain=True);self.assertEqual(x('before_create',s),5)
   with self.assertRaises(FileExistsError):x('before_create',s)
   old=copy.deepcopy(f.s['scoped_native_topup']);f.op.fail(f.a,f.rid,scope=scope);self.assertEqual(f.a.load_state(f.rid)['scoped_native_topup'],old);self.assertEqual(f.op.terminal(f.a,f.rid,scope=scope)['status'],'held')
  finally:f.tearDown()
 def test_exact_fifth_late_join_uses_genuine_new_scope_and_original_entry(self):
  f=FourthScopeTests().fixture(g.DECISOR,g.DECISOR_FIFTH_SCOPE)
  try:
   scope=g.DECISOR_FIFTH_SCOPE;_,_,key,_=g.configuration(f.rid,scope);f.write(f.base/'ACTIVATION-CLAIM.json',f.claim);f.s[key]={'authority_sha256':g.sha(f.base/'ROOT-AUTHORITY.json'),'peer_sha256':g.sha(f.base/'SOURCE-PEER.json'),'plan_sha256':g.sha(f.base/'PLAN.json'),'status':'owned','automatic_retry_prohibited':True};f.s.pop('operational_hold')
   old=f.root/'old-controller.py';old.write_text('# exact retained original controller');current=f.runtime/'autopickup.py'
   admission=f.job/'review/DECISOR-LATE-COMPLETION-ADMISSION.json';f.write(admission,{'unchanged':'original late admission'});entry=f.job/'review/decisor-late-handoff'/g.GENERATION/'ENTRY-CLAIM.json';entry.parent.mkdir(parents=True);f.write(entry,{'admission_sha256':g.sha(admission)});latepeer=f.job/'review/DECISOR-LATE-COMPLETION-REVIEW.json';f.write(latepeer,{'original':'retained genuine peer fixture'})
   f.p['decisor_original_late']={n:{'path':str(q),'sha256':g.sha(q)}for n,q in [('admission',admission),('entry',entry),('peer',latepeer)]};original={'path':str(current),'sha256':g.sha(old)};f.p['decisor_late_successors']={'controller':{'original':original,'historical_copy':{'path':str(old),'sha256':g.sha(old)},'current':{'path':str(current),'sha256':g.sha(current)}}}
   hp=Path(f.p['references']['original_history']['path']);history=g.read(hp);history['files'][str(old)]=g.sha(old);f.write(hp,history);f.p['references']['original_history']['sha256']=g.sha(hp);f.write(f.base/'PLAN.json',f.p)
   # Rebind only the new synthetic peer/claim/anchor, never original ENTRY/admission.
   import hashlib
   f.claim['plan_sha256']=g.sha(f.base/'PLAN.json');f.write(f.base/'ACTIVATION-CLAIM.json',f.claim);f.auth.update(plan_sha256=g.sha(f.base/'PLAN.json'),activation_claim_sha256=hashlib.sha256(json.dumps(f.claim,sort_keys=True,allow_nan=False).encode()).hexdigest());f.write(f.base/'ROOT-AUTHORITY.json',f.auth);f.peer.update(plan_sha256=g.sha(f.base/'PLAN.json'),root_authority_sha256=g.sha(f.base/'ROOT-AUTHORITY.json'));f.write(f.base/'SOURCE-PEER.json',f.peer);f.s[key].update(authority_sha256=g.sha(f.base/'ROOT-AUTHORITY.json'),peer_sha256=g.sha(f.base/'SOURCE-PEER.json'),plan_sha256=g.sha(f.base/'PLAN.json'));f.write(f.statepath,f.s)
   before=entry.read_bytes();self.assertTrue(g.late_successor(f.job,g.GENERATION,'controller',original,current,admission,entry));self.assertEqual(entry.read_bytes(),before)
   old.write_text('tampered retained history')
   with self.assertRaises(ValueError):g.late_successor(f.job,g.GENERATION,'controller',original,current,admission,entry)
  finally:f.tearDown()
