"""Public synthetic metadata/rows only; no official inputs, raw files or outcomes."""
import sys,os,copy,unittest,ast
from pathlib import Path
from types import SimpleNamespace
sys.dont_write_bytecode=True
os.environ['PYTHONDONTWRITEBYTECODE']='1'
sys.path.insert(0,str(Path(__file__).parent/'source'))
from cohort import BASE,NATIVE,WRAPPERS,FIXED,completed_shape,disposition,PREDECESSOR_COST_SHA256
from contracts import successor_field_contract,successor_category_contract
from public_proof import prepare_proof
import completed_field_builder as F
import category_builder as C
from public_result_scaffold import sanitize
H='a'*64
INPUT='b'*64
def roster():
 return [dict(key=k,order_id='SYNTHETIC-'+k,name=k,status='complete'if k in BASE else'pending',
   disposition=disposition(k)if k in BASE else None,reason='SYNTHETIC pending',
   raw_path='/SYNTHETIC/'+k,raw_sha256=H,
   system=dict(endpoint_kind='gpu',lane='selfhosted',ranked=k in NATIVE,
     support=dict(choice='native',noul='native',score='native'),
     price_in_per_m=.03,price_out_per_m=.15,price_kind='estimate'))for k in sorted(FIXED)]
def complete(keys):
 rows=roster()
 for r in rows:
  if r['key']in keys:r.update(status='complete',disposition=disposition(r['key']))
 return rows
def receipts(keys):
 rows={};native={}
 for k in keys:
  system=next(r['system']for r in roster()if r['key']==k)
  rows[k]={'order_id':'SYNTHETIC-'+k,'measurement_complete':True,'raw':{'path':'/SYNTHETIC/'+k,'sha256':H},'metadata':{'jevbench':{'system':system}}}
  native[k]={'rows':1500,'raw_sha256':H,'pins':{'profile':{'inputs':{'jevbench':{'items':{'sha256':INPUT}}}}}}
 return rows,native
class Tests(unittest.TestCase):
 def test_all_three_completion_orders(self):
  for extra,native,wrappers in [({'decisor_4b'},4,1),({'ryotide_qwen9'},3,2),({'decisor_4b','ryotide_qwen9'},4,2)]:
   s=completed_shape(BASE|extra);self.assertEqual(len(s['eligible']),native);self.assertEqual(len(s['wrappers']),wrappers)
 def test_no_foreign_or_missing_original_or_placeholder_completion(self):
  for keys in (BASE,BASE|{'foreign'},(BASE-{'jeff_1_0_large'})|{'decisor_4b','ryotide_qwen9'}):
   with self.assertRaises(ValueError):completed_shape(keys)
 def test_field_contract_preserves_all_original_records(self):
  old={'roster':roster(),'source_files':{'old':{'path':'/SYNTHETIC','sha256':H}},'input_sha256':INPUT,'cost_basis_sha256':PREDECESSOR_COST_SHA256}
  original=copy.deepcopy(old);reg,native=receipts(BASE|{'decisor_4b'})
  new=successor_field_contract(old,reg,native,{},H,H,'/SYNTHETIC/prereg.json','/SYNTHETIC/new-output',H)
  self.assertEqual(old,original)
  for r in old['roster']:
   if r['key']in BASE:self.assertEqual(r,next(x for x in new['roster']if x['key']==r['key']))
  self.assertEqual(new['addendum_membership']['eligible'],sorted(NATIVE))
 def test_incomplete_wrong_draw_or_raw_provenance_refused(self):
  for mutate in ('incomplete','draw','raw','wrapper_rank'):
   old={'roster':roster(),'source_files':{},'input_sha256':INPUT,'cost_basis_sha256':PREDECESSOR_COST_SHA256};reg,native=receipts(BASE|{'ryotide_qwen9'})
   if mutate=='incomplete':reg['ryotide_qwen9']['measurement_complete']=False
   if mutate=='draw':native['ryotide_qwen9']['pins']['profile']['inputs']['jevbench']['items']['sha256']=H
   if mutate=='raw':reg['jeff_1_0_large']['raw']['path']='/SYNTHETIC/changed'
   if mutate=='wrapper_rank':reg['ryotide_qwen9']['metadata']['jevbench']['system']['ranked']=True
   with self.assertRaises(ValueError):successor_field_contract(old,reg,native,{},H,H,'/SYNTHETIC/prereg','/SYNTHETIC/out',H)
 def test_category_contract_preserves_raw_inputs(self):
  old={'completed':[{'key':k,'raw_sha256':H,'system':{'ranked':k in NATIVE}}for k in sorted(BASE)]}
  entries=copy.deepcopy(old['completed'])+[{'key':'decisor_4b','raw_sha256':H,'system':{'ranked':True}}]
  new=successor_category_contract(old,entries,{'path':'/SYNTHETIC/result','sha256':H},H,2.5,H,H,H)
  self.assertEqual(new['completed'][:4],old['completed'])
  entries[0]['raw_sha256']='c'*64
  with self.assertRaises(ValueError):successor_category_contract(old,entries,{'path':'/SYNTHETIC/result','sha256':H},H,2.5,H,H,H)
 def test_full1500_errors_not_dropped_and_wrapper_not_native(self):
  gold={'SYNTHETIC'+str(i):SimpleNamespace(split='sealed'if i<1200 else'open')for i in range(1500)}
  raw=[dict(task_id=i,ok=False,error='SYNTHETIC failure')for i in gold]
  for keys in (BASE|{'decisor_4b'},BASE|{'ryotide_qwen9'},FIXED):
   rows=complete(keys);pre={'mandatory_candidates':[{'order_id':r['order_id']}for r in rows]};cost={'phase':'accepted_common_cost_basis','final_cost_basis_accepted':True,'exclude_opaque_ids':list(gold)[:21]}
   reg,eligible,pending=F.prepare(rows,pre,gold,{k:raw for k in keys},cost)
   self.assertEqual(set(reg),set(keys));self.assertEqual(set(eligible),keys&NATIVE)
   self.assertEqual({r['key']for r in pending},FIXED-keys)
 def test_late_rank_change_and_incomplete_native_fail(self):
  keys=BASE|{'decisor_4b'};rows=complete(keys);gold={'SYNTHETIC'+str(i):SimpleNamespace(split='sealed'if i<1200 else'open')for i in range(1500)};raw=[dict(task_id=i,ok=False,error='SYNTHETIC')for i in gold];pre={'mandatory_candidates':[{'order_id':r['order_id']}for r in rows]};cost={'phase':'accepted_common_cost_basis','final_cost_basis_accepted':True,'exclude_opaque_ids':list(gold)[:21]}
  next(r for r in rows if r['key']=='metask_jev_rain_12b')['disposition']='native_nonwrapper'
  with self.assertRaises(ValueError):F.prepare(rows,pre,gold,{k:raw for k in keys},cost)
 def proof_fixture(self,keys):
  row=lambda k:dict(key=k,rows=1500,admission='ACCEPTED',admission_sha256=H,raw_sha256=H,native_receipt_sha256=H,source_review_sha256=H,scoring_admission_sha256=H,source_pins_sha256=H,model_commit='a'*40,code_commit='b'*40,model_url='https://example.com/model',code_url='https://example.com/code',completed_at='2026-01-01T00:00:00Z',disposition='native_ranked'if k in NATIVE else'wrapper_unranked')
  category={'evidence_sha256':{'categories':H},'raw_labels_sha256':H,'ruled_labels_sha256':H,'input_sha256':H,'gold_sha256':H,'validated_label_records':3000,'public_handcheck_items':75}
  old={'cost_basis_sha256':PREDECESSOR_COST_SHA256,'systems':[row(k)for k in BASE],'cohort_roster':[{'key':k,'status':'complete'if k in BASE else'pending'}for k in FIXED],'category_reference':category}
  native=sorted(keys&NATIVE);gaps={k:i+1 for i,k in enumerate(native)}
  import statistics
  artifact={'source_sha256':H,'bootstrap':{'B':1000,'bootstrap_seed':16,'g_med_fixed':True},'revision':'v1.6.3','not_measured':[],'systems':[{'key':k,'ranked':k in NATIVE,'intelligence':{'gap':gaps.get(k,999)}}for k in keys],'G_med':statistics.median(gaps.values())}
  return old,artifact,[row(k)for k in keys],copy.deepcopy(category)
 def test_proof_all_actual_completions_and_native_median(self):
  for keys in (BASE|{'decisor_4b'},BASE|{'ryotide_qwen9'},FIXED):
   old,a,rows,c=self.proof_fixture(keys);p=prepare_proof(old,a,rows,H,H,H,c)
   self.assertEqual(len(p['systems']),len(keys));self.assertEqual({r['key']for r in p['field_median']['members']},keys&NATIVE)
   self.assertNotIn('review',p);self.assertNotIn('status',p)
 def test_proof_stale_category_changed_original_or_wrong_median_fails(self):
  for mutate in ('labels','original','median','rank','source','bootstrap','date'):
   old,a,rows,c=self.proof_fixture(BASE|{'decisor_4b'})
   if mutate=='labels':c['ruled_labels_sha256']='c'*64
   if mutate=='original':next(r for r in rows if r['key']=='jeff_1_0_large')['raw_sha256']='c'*64
   if mutate=='median':a['G_med']=999
   if mutate=='source':a['source_sha256']='c'*64
   if mutate=='bootstrap':a['bootstrap']['B']=1
   if mutate=='date':rows[-1]['completed_at']='2026-01-01T00:00:00'
   if mutate=='rank':next(r for r in a['systems']if r['key']=='metask_jev_rain_12b')['ranked']=True
   with self.assertRaises(ValueError):prepare_proof(old,a,rows,H,H,H,c)
 def test_public_scaffold_rejects_private_body_or_partial_rows(self):
  result={'revision':'v1.6.3','protocol':'jevbench::v1.6','not_measured':[],'bootstrap':{'B':1000,'bootstrap_seed':16,'g_med_fixed':True},'systems':[{'key':k,'ranked':k in NATIVE,'status':{'status':'complete','rows':1500,'missing':0},'full_coverage':True,'v16':{'n_items':1500},'cost':{'common_basis':{'n_items':1479}}}for k in BASE|{'decisor_4b'}]}
  self.assertEqual(len(sanitize(result)['systems']),5)
  unknown=copy.deepcopy(result);unknown['systems'][0]['cost']['common_basis']['excluded']=['opaque-item-0001']
  with self.assertRaises(ValueError):sanitize(unknown)
  unknown=copy.deepcopy(result);unknown['systems'][0]['v16']['arbitrary_records']=[{'id':'SYNTHETIC'}]
  with self.assertRaises(ValueError):sanitize(unknown)
  duplicate=copy.deepcopy(result);duplicate['systems'].append(copy.deepcopy(result['systems'][0]))
  with self.assertRaises(ValueError):sanitize(duplicate)
  result['systems'][0]['question']='SYNTHETIC private body'
  with self.assertRaises(ValueError):sanitize(result)
 def test_categories_complete_new_keys_errors_and_zero_taxonomy(self):
  goldrows=[{'opaque_id':'SYNTHETIC'+str(i)}for i in range(1500)]
  gold={r['opaque_id']:SimpleNamespace(oid=r['opaque_id'],split='sealed'if i<1200 else'open',lang='en',family='fixture',type='choice')for i,r in enumerate(goldrows)}
  labels=[{'id':r['opaque_id']+'::'+q,'choice':'fixture'}for r in goldrows for q in ('topic','usecase')]
  class Scorer:
   load_gold_rows=staticmethod(lambda rows:gold)
   group_stats=staticmethod(lambda scored:{'n':len(scored),'score':42.0})
   @staticmethod
   def build_systems(g,registry,raws):
    return ({k:SimpleNamespace(scored=[(x,None)for x in g.values()])for k in registry},
      {k:{'status':'complete','rows':1500,'missing':0,'answered_ok':1499}for k in registry})
  transform=SimpleNamespace(validate_labels=lambda r,g:None,apply_rules=lambda r,g:r)
  taxonomy=SimpleNamespace(TOPICS=[('fixture','Fixture','Synthetic'),('zero','Zero','Synthetic')],USE_CASES=[('fixture','Fixture','Synthetic'),('zero','Zero','Synthetic')])
  previous=None
  for keys in (BASE|{'decisor_4b'},BASE|{'ryotide_qwen9'},FIXED):
   raws={k:[{'task_id':oid,'ok':i!=0,'error':'SYNTHETIC'if i==0 else None}for i,oid in enumerate(gold)]for k in keys}
   status={'status':'complete','rows':1500,'missing':0,'answered_ok':1499}
   public={'systems':[{'key':k,'status':status,'v16':{'breakdowns':{d:{v:{'n':1500,'score':42.0}}for d,v in [('family','fixture'),('lang','en'),('type','choice')]}}}for k in keys]}
   art=C.aggregate(Scorer,transform,taxonomy,public,goldrows,raws,{k:{}for k in keys},labels,labels)
   self.assertEqual(set(art['systems']),set(keys))
   for cells in art['systems'].values():
    self.assertEqual(cells['topics']['fixture'],{'n':1500,'competence':42.0,'coverage_n':1499});self.assertNotIn('zero',cells['topics'])
   self.assertEqual(next(c['n']for c in art['topics']if c['key']=='zero'),0)
   if previous is not None:
    for k in BASE:self.assertEqual(art['systems'][k],previous['systems'][k])
   previous=art
   raws[next(iter(keys))].pop()
   with self.assertRaises(ValueError):C.aggregate(Scorer,transform,taxonomy,public,goldrows,raws,{k:{}for k in keys},labels,labels)
 def test_poisoned_predecessor_authority_never_inherited(self):
  old,a,rows,c=self.proof_fixture(BASE|{'decisor_4b'})
  old.update(review={'verdict':'PASS'},status='ACCEPTED',manifest_sha256=H,G_med=999,results_sha256=H,financial_authority={'accepted':True})
  p=prepare_proof(old,a,rows,H,H,H,c)
  for field in ('review','status','manifest_sha256','G_med','results_sha256','financial_authority'):self.assertNotIn(field,p)
 def test_output_boundary_and_frozen_cost_mask(self):
  from cohort import protected_output_path
  base='/home/flori/jevbench-sealed/v1.6-run/v1.6-fastlane-20261009/'
  self.assertEqual(str(protected_output_path(base+'fresh')),base+'fresh')
  for p in (base+'../../../../tmp/evil',base[:-1],'/tmp/evil',base+'fresh/../evil'):
   with self.assertRaises(ValueError):protected_output_path(p)
  gold={'SYNTHETIC'+str(i):SimpleNamespace(split='sealed'if i<1200 else'open')for i in range(1500)}
  keys=BASE|{'decisor_4b'};rows=complete(keys);raw=[{'task_id':k,'ok':False,'error':'SYNTHETIC'}for k in gold]
  pre={'mandatory_candidates':[{'order_id':r['order_id']}for r in rows]}
  for n in (0,20,22):
   cost={'phase':'accepted_common_cost_basis','final_cost_basis_accepted':True,'exclude_opaque_ids':list(gold)[:n]}
   with self.assertRaises(ValueError):F.prepare(rows,pre,gold,{k:raw for k in keys},cost)
 def test_all_contract_shapes_and_no_source_pin_rebinding(self):
  for keys in (BASE|{'decisor_4b'},BASE|{'ryotide_qwen9'},FIXED):
   old={'roster':roster(),'source_files':{'original':{'path':'/SYNTHETIC','sha256':H}},'input_sha256':INPUT,'cost_basis_sha256':PREDECESSOR_COST_SHA256};reg,native=receipts(keys)
   c=successor_field_contract(old,reg,native,{},H,H,'/SYNTHETIC/prereg','/SYNTHETIC/out',H)
   self.assertEqual(c['predecessor_cost_basis_sha256'],PREDECESSOR_COST_SHA256);self.assertEqual(c['proposal_status'],'SOURCE_PROPOSAL_NOT_ACCEPTED')
   with self.assertRaises(ValueError):successor_field_contract(old,reg,native,{'original':{'path':'/SYNTHETIC/evil','sha256':H}},H,H,'/SYNTHETIC/prereg','/SYNTHETIC/out',H)
 def test_semantic_profile_admission_and_measurement_join(self):
  from stage_field_proposal import verify_admitted_join
  row={'order_id':'SYNTHETIC-order','admission':{'sha256':H}}
  receipt={'pins':{'manifest_sha256':H}}
  admission={'schema_version':1,'verdict':'ACCEPTED','order_id':'SYNTHETIC-order','references':{'measurement':{'sha256':H}}}
  review={'verdict':'ACCEPTED','reviewer_engine':'claude','admission_sha256':H}
  verify_admitted_join(row,receipt,admission,review)
  for mutate in ('admission','review','order','profile'):
   a=copy.deepcopy(admission);r=copy.deepcopy(review);native=copy.deepcopy(receipt)
   if mutate=='admission':a['verdict']='HOLD'
   if mutate=='review':r['admission_sha256']='c'*64
   if mutate=='order':a['order_id']='SYNTHETIC-foreign'
   if mutate=='profile':native['pins']['manifest_sha256']='c'*64
   with self.assertRaises(ValueError):verify_admitted_join(row,native,a,r)
 def test_metadata_custody_hash_and_protected_body_refusal(self):
  import tempfile,json,hashlib
  from stage_field_proposal import metadata
  with tempfile.TemporaryDirectory()as d:
   p=Path(d)/'synthetic-metadata.json';p.write_text(json.dumps({'SYNTHETIC_METADATA':True}))
   ref={'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
   self.assertEqual(metadata(ref),{'SYNTHETIC_METADATA':True})
   for bad in ({'path':str(p),'sha256':'c'*64},dict(ref,extra=True),{'path':'/home/flori/jevbench-sealed/fake.json','sha256':H}):
    with self.assertRaises((ValueError,FileNotFoundError)):metadata(bad)
   link=Path(d)/'symlink.json';link.symlink_to(p)
   with self.assertRaises(ValueError):metadata({'path':str(link),'sha256':ref['sha256']})
 def test_stager_accident_guard_precedes_all_io(self):
  from unittest.mock import patch
  import stage_field_proposal
  with patch.dict(os.environ,{'AGENT_BOARD_NAME':'SYNTHETIC-other-owner'}):
   with self.assertRaises(ValueError):stage_field_proposal.main()
 def test_public_schema_matches_accepted_predecessor_and_rejects_item_arrays(self):
  import json,hashlib
  root=Path(__file__).resolve().parents[2]
  published=root/'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.2-results.json'
  if not published.exists():self.skipTest('contained critic receives separately pinned public dependency fixture')
  template=json.loads((Path(__file__).parent/'source/PUBLIC-SCHEMA-V162.json').read_text())
  self.assertEqual(template['source_sha256'],hashlib.sha256(published.read_bytes()).hexdigest())
  from public_result_scaffold import schema_check
  schema_check(json.loads(published.read_text()),template['schema'])
 def test_isolated_execution_imports_and_local_source_binding(self):
  src=Path(__file__).parent/'source'
  for p in src.glob('*.py'):ast.parse(p.read_text())
  for filename in ('completed_field_launcher.py','category_launcher.py'):
   code=(src/filename).read_text();self.assertIn("'cohort.py'",code);self.assertIn("cohort_source_sha256",code);self.assertIn("'--clearenv'",code);self.assertIn("'--unshare-net'",code)
 def test_cost_constant_enforced_in_proof_and_scoring_gates(self):
  from cohort import verify_cost_binding
  for value in (None,'f'*64):
   old,a,rows,c=self.proof_fixture(BASE|{'decisor_4b'});old['cost_basis_sha256']=value
   with self.assertRaises(ValueError):prepare_proof(old,a,rows,H,H,H,c)
   with self.assertRaises(ValueError):verify_cost_binding({'cost_basis_sha256':value},{'predecessor_cost_basis_sha256':value})
  verify_cost_binding({'cost_basis_sha256':PREDECESSOR_COST_SHA256},{'predecessor_cost_basis_sha256':PREDECESSOR_COST_SHA256})
  for file in ('completed_field_builder.py','completed_field_launcher.py'):
   self.assertIn('verify_cost_binding(root,c)',(Path(__file__).parent/'source'/file).read_text())
 def test_proof_rejects_extra_new_authority_and_missing_provenance(self):
  for mutate in ('row_extra','category_extra','missing_both','invalid_hash'):
   old,a,rows,c=self.proof_fixture(BASE|{'decisor_4b'})
   if mutate=='row_extra':rows[-1]['review']={'verdict':'PASS'}
   if mutate=='category_extra':c['verdict']='PASS'
   if mutate=='missing_both':c.pop('raw_labels_sha256');old['category_reference'].pop('raw_labels_sha256')
   if mutate=='invalid_hash':c['raw_labels_sha256']=old['category_reference']['raw_labels_sha256']='invalid'
   with self.assertRaises(ValueError):prepare_proof(old,a,rows,H,H,H,c)
 def test_sanitized_public_result_to_proof(self):
  old,a,rows,c=self.proof_fixture(BASE|{'decisor_4b'});a.pop('source_sha256');a['protocol']='jevbench::v1.6'
  for r in a['systems']:
   r.update(status={'status':'complete','rows':1500,'missing':0},full_coverage=True,v16={'n_items':1500},cost={'common_basis':{'n_items':1479}})
  public=sanitize(a);proof=prepare_proof(old,public,rows,H,H,H,c)
  self.assertEqual(proof['source_sha256'],H)
  self.assertNotIn('source_sha256',public)
 def test_metadata_parent_symlink_fails(self):
  import tempfile,hashlib,json
  from stage_field_proposal import metadata
  with tempfile.TemporaryDirectory()as d:
   parent=Path(d)/'real';parent.mkdir();p=parent/'m.json';p.write_text('{}');link=Path(d)/'link';link.symlink_to(parent,target_is_directory=True)
   with self.assertRaises(ValueError):metadata({'path':str(link/'m.json'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 def test_launchers_no_approvals_refuse_before_io_or_process(self):
  import completed_field_launcher,category_launcher,contextlib,io
  from unittest.mock import patch
  for launcher in (completed_field_launcher,category_launcher):
   with patch.object(sys,'argv',['SYNTHETIC']),patch.object(launcher,'bounded',side_effect=AssertionError('unexpected I/O')),patch.object(launcher.subprocess,'run',side_effect=AssertionError('unexpected execution')),contextlib.redirect_stderr(io.StringIO()):
    self.assertEqual(launcher.main(),2)
if __name__=='__main__':unittest.main()
