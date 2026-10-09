"""Actual offline metadata authorer with isolated first-party source/custody only."""
import copy,unittest
from pathlib import Path
import prepare_ryo_fourth_packet as p
import scoped_native_topup as g
from test_scoped_native_topup import FourthScopeTests
class Tests(unittest.TestCase):
 def fixture(self):
  f=FourthScopeTests().fixture();self.addCleanup(f.tearDown);p.RUNTIME=f.runtime;p.JOBS=f.root
  # Actual changed first-party source, no installed-runtime imports/execution.
  for name in ('scoped_native_topup.py','scoped_native_topup_operator.py'):(f.runtime/name).write_bytes(Path(__file__).with_name(name).read_bytes())
  (f.runtime/'ryotide_runtime_supplement.py').write_bytes(Path('/home/flori/wt/fastlane-ryo-kernel-symbols-20261009/ops/priority-evaluation/ryotide_runtime_supplement.py').read_bytes())
  def ref(path):return {'path':str(path),'sha256':g.sha(path)}
  row=f.root/'row.json';f.write(row,{'id':f.rid,'status':'paid','evaluation_status':'pending','stripe_mode':'live','synthetic_test':False,'pickup_job_dir':str(f.job),'paid_at':'synthetic paid timestamp'})
  argv=f.root/'argv.json';raw=f.original_show();f.write(argv,{'execstart_utf8':raw,'execstart_raw_sha256':p.sha(raw.encode())})
  inst=f.root/'install.json';f.write(inst,{'revision':'a'*40})
  refs=copy.deepcopy(f.p['references'])
  for name,file in [('gate','scoped_native_topup.py'),('operator','scoped_native_topup_operator.py')]:refs[name]=ref(f.runtime/file)
  admission=Path(refs['profile_admission']['path']);f.write(admission,{'order_id':f.rid,'generation':g.GENERATION,'recipe_sha256':refs['recipe']['sha256']});refs['profile_admission']=ref(admission)
  peer=Path(refs['profile_review']['path']);f.write(peer,{'verdict':'ACCEPTED','reviewer_engine':'claude','admission_sha256':g.sha(admission)});refs['profile_review']=ref(peer)
  freeze=Path(refs['source_freeze']['path']);f.write(freeze,{'files':{str(q):g.sha(q)for q in f.runtime.rglob('*')if q.is_file()}});refs['source_freeze']=ref(freeze)
  hp=Path(refs['original_history']['path']);hist=g.read(hp);hist['files'].update({str(q):g.sha(q)for q in (f.statepath,f.ledgerpath,row,argv)});f.write(hp,hist);refs['original_history']=ref(hp)
  spec={'order_id':f.rid,'generation':g.GENERATION,'merged_revision':'a'*40,'state':ref(f.statepath),'ledger':ref(f.ledgerpath),'row':ref(row),'full_sql_row':f.p['full_sql_row'],'execstart':ref(argv),'installation':ref(inst),'cache_freeze':ref(freeze),'previous_topup':f.p['previous_topup'],'references':{n:{'bytes':r,'target':r['path']}for n,r in refs.items()}}
  # Original canonical review target is unchanged even when test byte fixture lives elsewhere.
  spec['references']['profile_review']['target']=str(f.job/'review/V16-PROFILE-REVIEW.json')
  return f,spec
 def test_actual_build_is_inert_and_has_distinct_bounds_custody(self):
  f,s=self.fixture();before=f.statepath.read_bytes(),f.ledgerpath.read_bytes();result=p.build(s)
  self.assertEqual(result['plan']['bounds']['maximum_lifetime_usd'],30);self.assertEqual(result['plan']['scope'],g.RYO_FOURTH_SCOPE);self.assertEqual(result['plan']['previous_topup'],s['previous_topup']);self.assertNotIn('verdict',result['ROOT-AUTHORITY-INPUT']);self.assertEqual(before,(f.statepath.read_bytes(),f.ledgerpath.read_bytes()))
 def test_actual_build_old_consumed_scope_or_state_replay_rejected(self):
  for kind in ('old_count','old_spend','old_anchor','new_anchor','missing_custody','foreign','module_drift'):
   f,s=self.fixture()
   if kind=='foreign':s['order_id']=g.DECISOR
   elif kind=='missing_custody':s['previous_topup'].pop('ENTRY-CLAIM.json')
   elif kind=='module_drift':(f.runtime/'ryotide_runtime_supplement.py').write_text('changed')
   else:
    key=s['ledger']if kind.startswith('old_')and kind!='old_anchor'else s['state'];obj=p.read(key['path'])
    if kind=='old_count':obj['creation_attempts']=2
    elif kind=='old_spend':obj['spent_upper_bound_usd']=20
    elif kind=='old_anchor':obj['scoped_native_topup']['plan_sha256']='0'*64
    else:obj['scoped_native_topup_ryo_fourth']={'already':'owned'}
    f.write(Path(key['path']),obj);key['sha256']=g.sha(key['path'])
   with self.subTest(kind=kind),self.assertRaises((ValueError,KeyError)):p.build(s)
