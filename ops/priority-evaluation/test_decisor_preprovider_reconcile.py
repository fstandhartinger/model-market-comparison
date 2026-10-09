"""Source guard fixtures, never actual controller/order/unit/provider calls."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
import decisor_preprovider_reconcile as r
class Guards(unittest.TestCase):
 def test_failure_scope_exact(self):
  hold={'reason':'pod_recipe_invalid','transient':False,'retries':0,'at':'original'}
  state={'operational_hold':hold,'stage_attempts':{'preparation':3,'source_review':3}}
  self.assertIs(r.failed_hold(state),hold)
  for update in [{'reason':'other'},{'transient':True},{'retries':1}]:
   with self.subTest(update=update),self.assertRaises(ValueError):r.failed_hold({'operational_hold':dict(hold,**update)})
  self.assertEqual(state['stage_attempts'],{'preparation':3,'source_review':3})
 def test_new_claim_never_replaces_original_or_consumed_claim(self):
  with tempfile.TemporaryDirectory()as t:
   original=Path(t)/'ENTRY-CLAIM.json';original.write_text('original immutable')
   new=Path(t)/'reconciliation/ENTRY-CLAIM.json';r.exclusive(new,{'nonce':'one'})
   with self.assertRaises(FileExistsError):r.exclusive(new,{'nonce':'two'})
   self.assertEqual(original.read_text(),'original immutable');self.assertEqual(r.read(new),{'nonce':'one'})
 def test_exclusive_claim_refuses_symlink(self):
  with tempfile.TemporaryDirectory()as t:
   parent=Path(t);(parent/'real').mkdir();(parent/'link').symlink_to(parent/'real',target_is_directory=True)
   with self.assertRaises(ValueError):r.exclusive(parent/'link/CLAIM.json',{})
 def test_argv_custody_ignores_runtime_pid_timestamp_only(self):
  a='{ path=/usr/bin/python3 ; argv[]=/usr/bin/python3 helper --apply ; start_time=old ; pid=1 ; }'
  b='{ path=/usr/bin/python3 ; argv[]=/usr/bin/python3 helper --apply ; start_time=new ; pid=2 ; }'
  self.assertEqual(r.argv_sha(a),r.argv_sha(b))
  self.assertNotEqual(r.argv_sha(a),r.argv_sha(b.replace('--apply','--continue')))
  with self.assertRaises(ValueError):r.argv_sha('not a systemd argv')
 def test_dropin_rejects_injected_or_systemd_expanded_paths(self):
  for path in ['x y','x%H','x"bad','x\\bad']:
   with self.subTest(path=path),self.assertRaises(ValueError):r.dropin(path,'authority','peer')
 def test_original_two_rental_ledger_and_absence_fail_closed(self):
  with tempfile.TemporaryDirectory()as t:
   root=Path(t);pods=root/'pods';pods.mkdir();ledger=pods/(r.ORDER+'.json')
   valid={'creation_attempts':2,'spent_upper_bound_usd':7.8,'pod_id':None,'cleanup_uncertain':False}
   a=SimpleNamespace(STATE_ROOT=root)
   for change in [{'creation_attempts':3},{'spent_upper_bound_usd':0},{'pod_id':'new'},{'cleanup_uncertain':True}]:
    ledger.write_text(json.dumps(dict(valid,**change)));plan={'old_pod_ledger':{'path':str(ledger),'sha256':r.digest(ledger)}}
    with self.subTest(change=change),self.assertRaises(ValueError):r.preprovider(a,plan)
   ledger.write_text(json.dumps(valid));plan={'old_pod_ledger':{'path':str(ledger),'sha256':r.digest(ledger)}}
   output=root/'measurements'/r.ORDER/r.GENERATION/'jevbench';output.mkdir(parents=True)
   with self.assertRaisesRegex(ValueError,'output already exists'):r.preprovider(a,plan)
 def test_wrong_root_apply_has_zero_controller_calls(self):
  with patch.dict(r.os.environ,{'AGENT_BOARD_NAME':'foreign'}),self.assertRaisesRegex(ValueError,'wrong root'):
   r.apply(None,'plan','authority','peer')
if __name__=='__main__':unittest.main()

class ContinuationFlow(unittest.TestCase):
 def test_same_unit_continuation_consumes_separate_entry_calls_existing_functions(self):
  import contextlib,sys,hashlib
  from unittest.mock import Mock
  with tempfile.TemporaryDirectory()as t:
   root=Path(t);new=root/'new';new.mkdir();original=root/'original';original.mkdir();(original/'ENTRY-CLAIM.json').write_text('old entry unchanged')
   planpath=root/'PLAN';auth=root/'AUTH';peer=root/'PEER'
   for p in (planpath,auth,peer):p.write_text('{}')
   claim={'plan_sha256':r.digest(planpath),'root_authority_sha256':r.digest(auth),'source_peer_sha256':r.digest(peer)}
   (new/'CLAIM.json').write_text(json.dumps(claim));drop=root/'DROPIN';drop.write_bytes(r.dropin(planpath,auth,peer))
   state={'decisor_preprovider_reconciliation':claim,'stage_attempts':{'preparation':3,'source_review':3}}
   a=SimpleNamespace(cycle_lock=lambda **kw:contextlib.nullcontext(),Effects=lambda:SimpleNamespace(unit_state=lambda unit:{'ActiveState':'active'}),load_state=lambda _:state,load_row=lambda _:{'evaluation_status':'starting'},update_row=Mock(return_value=True),evaluate_v16_generation=Mock(return_value=0),set_operational_hold=Mock())
   late=SimpleNamespace(LateCompletion=Mock(return_value=SimpleNamespace(sql_guard=lambda _: 'full original row guard')),row_check=Mock())
   measure=Mock();v16=SimpleNamespace(v16_profiles=SimpleNamespace(measure=measure))
   with patch.object(r,'NEW',new),patch.object(r,'DROPIN',drop),patch.object(r,'authority',return_value={}),patch.object(r,'preprovider'),patch.object(r,'sysrun',return_value=str(r.os.getpid())),patch.dict(sys.modules,{'decisor_late_completion':late,'v16_adoption':v16}):
    self.assertEqual(r.continuation(a,planpath,auth,peer),0)
    measure.assert_called_once_with(r.JOB);a.evaluate_v16_generation.assert_called_once_with(r.ORDER,r.JOB)
    self.assertEqual(late.LateCompletion.call_args.args[-1],('starting','pending'))
    self.assertEqual(r.read(new/'ENTRY-CLAIM.json'),claim);self.assertTrue(r.read(new/'EXIT.json')['entry_consumed'])
    with self.assertRaises(FileExistsError):r.continuation(a,planpath,auth,peer)
    self.assertEqual(measure.call_count,1)
   self.assertEqual((original/'ENTRY-CLAIM.json').read_text(),'old entry unchanged');self.assertEqual(state['stage_attempts'],{'preparation':3,'source_review':3})
