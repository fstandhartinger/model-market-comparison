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
 def test_automatic_manager_owned_anchor_returns_before_any_effect(self):
  import ast
  tree=ast.parse(Path(__file__).with_name('autopickup.py').read_text());fn=next(x for x in tree.body if isinstance(x,ast.FunctionDef)and x.name=='manage_evaluation');fn.args=ast.arguments(posonlyargs=[],args=[ast.arg(arg=x)for x in ('row','state','effects','now')],kwonlyargs=[],kw_defaults=[],defaults=[]);fn.returns=None
  ns={};exec(compile(ast.fix_missing_locations(ast.Module(body=[fn],type_ignores=[])),'synthetic-manager','exec'),ns)
  ns['manage_evaluation']({}, {'scoped_native_topup':{}}, None, None)
 def test_ducktyped_gate_does_not_extend_default_cap(self):
  fake=type('CustomerFlag',(),{'lifetime_cap_usd':100000,'allowed_total':999})()
  scoped=type(fake)is g.ScopedTopUp;self.assertFalse(scoped);self.assertEqual(fake.lifetime_cap_usd if scoped else 20,20)
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
 def test_canonical_preamble_suppresses_project_and_child_cache(self):
  import subprocess,sys
  source=Path(__file__).with_name('autopickup.py').read_text()
  prefix=source[:source.index('import argparse')]
  self.assertIn('sys.dont_write_bytecode = True',prefix)
  self.assertIn('PYTHONDONTWRITEBYTECODE',prefix)
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);(root/'synthetic_project.py').write_text('VALUE=1\n')
   script=root/'controller.py';script.write_text(prefix+'\nimport synthetic_project\nimport subprocess\nsubprocess.run([sys.executable,"-c","import synthetic_project"],check=True)\n')
   subprocess.run([sys.executable,str(script)],cwd=root,env={'PATH':'/usr/bin:/bin'},check=True,timeout=10)
   self.assertEqual(list(root.rglob('*.pyc')),[])
