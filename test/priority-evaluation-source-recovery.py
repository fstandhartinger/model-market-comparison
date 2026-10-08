"""Inert source-access operator correction controls; no imports of runtime dependencies."""
import ast
import base64
import os
import copy
import datetime
import fcntl
import hashlib
import json
from pathlib import Path
import re
import tempfile
from types import SimpleNamespace
import unittest

ROOT=Path(__file__).resolve().parents[1]
RID='acad951a-1b9d-4f3c-a449-350d1c04bd23'
URL='https://huggingface.co/empiriolabsai/aplomb-1'

class Recovery(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.base=Path(self.temp.name);self.job=self.base/RID
  (self.job/'review').mkdir(parents=True);(self.job/'source/model').mkdir(parents=True);self.state=self.base/'state';a=self.state/'change-requests/0';a.mkdir(parents=True);self.approval=a/(RID+'.json')
  self.draft={'draft':{'request_id':RID,'kind':'change_request','hold_started_at':'2026-10-07T23:35:08+00:00'},'notification':'pending','digest':'fixed','send_key':'fake_send','keep_key':'fake_keep','freshness_hold':{'at':1}}
  self.approval.write_text(json.dumps(self.draft))
  self.changes=self.job/'review/CHANGES-REQUESTED.json';self.changes.write_text(json.dumps({'reason':'unusable_model_link','requested_at':'2026-10-07T23:35:08+00:00'}))
  self.fetch=self.job/'source/FETCH-RECEIPT-model.json';self.fetch.write_text(json.dumps({'which':'model','url':URL,'credential_repository':'empiriolabsai/aplomb-1','commit':'a'*40,'tree':'b'*40,'fetched_at':'2026-10-08T10:00:00+00:00'}))
  self.row={'id':RID,'stripe_mode':'live','synthetic_test':False,'status':'paid','model_link':URL,'refund_id':None,'result_delivered_at':None,'evaluation_status':'pending','change_request_email_status':'approval_required','delivery_email_status':'not_due','pickup_job_dir':str(self.job),'customer_hold_reason':'customer_changes','customer_hold_started_at':'2026-10-07T23:35:08+00:00','paid_at':'2026-10-07T23:31:27+00:00','sla_paused_seconds':0,'evaluation_attempts':1,'resubmission_count':0,'pickup_attempts':2,'release_attempts':0,'release_status':'not_due','review_email_status':'not_due','review_passed_at':None,'code_link':None}
  self.original=dict(self.row);self.runtime={'id':RID,'steps':{'evaluation_start':{'attempts':1,'status':'done'}},'stage_attempts':{'preparation':2,'source_review':1}};self.runtime_before=copy.deepcopy(self.runtime);self.updates=[];self.cas=True;self.crash=False;self.fail_read=False
  def load_row(rid):
   if self.fail_read:self.fail_read=False;raise RuntimeError('inert crash after database CAS')
   return dict(self.row)
  def update_row(rid,assignments,guard):
   self.updates.append((assignments,guard))
   if not self.cas:return False
   assert self.runtime["operational_hold"]["reason"] == "source_access_recovered_pending_review"
   assert self.runtime["operational_hold"]["transient"] is False
   self.row.update(customer_hold_started_at=None,customer_hold_reason=None,change_request_email_status='not_due')
   if self.crash:self.crash=False;self.fail_read=True
   return True
  def save_state(state):self.runtime=copy.deepcopy(state)
  def atomic(path,value):Path(path).write_text(value)
  def atomic_approval(path,value):Path(path).write_text(json.dumps(value))
  self.ns={'Path':Path,'re':re,'base64':base64,'os':os,'tempfile':tempfile,'request_id':lambda x:x,'load_row':load_row,'PickupError':ValueError,'job_directory':lambda *x:self.job,'JOB_ROOT':self.base,'subprocess':SimpleNamespace(run=lambda *a,**k:SimpleNamespace(returncode=3,stdout='inactive\n')),'EVAL_UNIT':'eval@{}.service','json':json,'SHA40_RE':re.compile('^[0-9a-f]{40}$'),'parse_ts':lambda x:datetime.datetime.fromisoformat(x) if x else None,'git':lambda d,*args:'a'*40 if args[-1]=='HEAD' else 'b'*40,'STATE_ROOT':self.state,'hashlib':hashlib,'fcntl':fcntl,'CHANGE_HOLD_REASON':'customer_changes','atomic_write':atomic,'utcnow':lambda:datetime.datetime(2026,10,8,10,tzinfo=datetime.timezone.utc),'iso':lambda x:x.isoformat(),'refusal_approval':SimpleNamespace(atomic=atomic_approval),'sql_text':lambda v:"'"+v.replace("'","''")+"'",'update_row':update_row,'Any':object,'load_state':lambda rid:copy.deepcopy(self.runtime),'save_state':save_state,'datetime':datetime.datetime,'Effects':SimpleNamespace,'active_hold':lambda row:bool(row.get('customer_hold_started_at')),'TRANSIENT_HOLD_REASONS':frozenset({'fetch_source_transient'}),'MAX_EVALUATION_ATTEMPTS':3,'BOARD_HANDOFF_THREAD':'measurements','deadline_for':lambda row:datetime.datetime(2026,10,9,23,31,27,tzinfo=datetime.timezone.utc),'owner_for':lambda rid:'original-synthetic-owner','order_ref':lambda rid:str(rid)[:8],'HOLD_MAX_RETRIES':3}
  tree=ast.parse((ROOT/'ops/priority-evaluation/autopickup.py').read_text());self.ns['ROW_FIELDS']=ast.literal_eval(next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='ROW_FIELDS' for t in n.targets)));nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['migrate_source_recovery_projection','recover_source_access','row_json_sql','hold_retries','set_operational_hold','manage_evaluation','operational_escalate','step','step_done','finish_ok']];exec(compile(ast.Module(body=nodes,type_ignores=[]),'trusted-recovery','exec'),self.ns)
 def call(self):return self.ns['recover_source_access'](RID)
 def test_preserves_payment_clock_attempts_and_original_artifacts(self):
  changes=self.changes.read_bytes();self.call();self.assertEqual(self.changes.read_bytes(),changes)
  for k in ['paid_at','sla_paused_seconds','evaluation_attempts','resubmission_count','pickup_attempts','release_attempts']:self.assertEqual(self.row[k],self.original[k])
  assignments,guard=self.updates[0];self.assertNotIn('sla_paused_seconds=',assignments);self.assertNotIn('paid_at=',assignments);self.assertIn('sla_paused_seconds IS NOT DISTINCT FROM',guard);self.assertIn("evaluation_status='pending'",guard);self.assertIn("change_request_email_status IN ('approval_required','held')",guard)
  self.assertEqual(json.loads(self.approval.read_text())['decision'],'withdrawn');self.assertEqual(json.loads((self.job/'review/SOURCE-ACCESS-RECOVERY.json').read_text())['phase'],'complete')
  self.call();self.assertEqual(len(self.updates),1)
  self.assertEqual(self.runtime['stage_attempts'],self.runtime_before['stage_attempts']);self.assertEqual(self.runtime['steps'],self.runtime_before['steps'])
 def test_sent_or_sending_database_never_withdraws(self):
  for flag in ['sending','sent','unknown']:
   self.row['change_request_email_status']=flag
   with self.assertRaises(ValueError):self.call()
   self.assertEqual(json.loads(self.approval.read_text()),self.draft);self.assertEqual(self.updates,[])
 def test_approval_send_claim_and_message_refuse(self):
  for extra in [{'mail':'sending'},{'message_id':123},{'decision':'send'},{'notification':'sent'},{'mail':'sent'}]:
   self.approval.write_text(json.dumps(self.draft|extra))
   with self.assertRaises(ValueError):self.call()
   self.assertEqual(self.updates,[])
 def test_wrong_scope_or_unproved_fetch_refuses(self):
  with self.assertRaises(ValueError):self.ns['recover_source_access']('other-order')
  for key,value in [('credential_repository',None),('url','https://huggingface.co/private/repo'),('commit','bad'),('fetched_at','2026-10-07T00:00:00+00:00')]:
   original=json.loads(self.fetch.read_text());changed=original|{key:value};self.fetch.write_text(json.dumps(changed))
   with self.assertRaises(ValueError):self.call()
   self.assertEqual(self.updates,[]);self.fetch.write_text(json.dumps(original))
 def test_crash_before_cas_resumes_without_new_clock(self):
  self.cas=False
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(self.row,self.original);self.assertEqual(json.loads(self.approval.read_text())['decision'],'withdrawn')
  self.cas=True;self.call();self.assertEqual(self.row['sla_paused_seconds'],0);self.assertEqual(self.row['evaluation_attempts'],1)
 def test_crash_after_cas_resumes_idempotently(self):
  self.crash=True
  with self.assertRaises(RuntimeError):self.call()
  self.call();self.assertEqual(len(self.updates),1);self.assertEqual(self.row['paid_at'],self.original['paid_at'])
 def test_changed_counter_after_recovery_claim_refuses(self):
  self.cas=False
  with self.assertRaises(ValueError):self.call()
  self.row['evaluation_attempts']+=1;self.cas=True
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(len(self.updates),1)
 def test_source_receipt_changed_after_claim_refuses(self):
  self.cas=False
  with self.assertRaises(ValueError):self.call()
  d=json.loads(self.fetch.read_text());d['fetched_at']='2026-10-08T10:01:00+00:00';self.fetch.write_text(json.dumps(d));self.cas=True
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(len(self.updates),1)
 def test_active_or_unverifiable_evaluator_refuses(self):
  for rc,state in [(0,'active'),(1,''),(4,'unknown')]:
   self.ns['subprocess'].run=lambda *a,**k:SimpleNamespace(returncode=rc,stdout=state)
   with self.assertRaises(ValueError):self.call()
   self.assertEqual(self.updates,[])
 def test_unrelated_hold_approval_refuses(self):
  d=self.draft.copy();d["draft"]=dict(d["draft"],hold_started_at="2026-10-08T01:00:00+00:00");self.approval.write_text(json.dumps(d))
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(self.updates,[])
 def test_initial_held_without_recovery_claim_refuses(self):
  self.row['change_request_email_status']='held'
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(json.loads(self.approval.read_text()),self.draft);self.assertEqual(self.updates,[])
 def test_actual_approval_advance_interleaving_resumes_same_recovery(self):
  self.cas=False
  with self.assertRaises(ValueError):self.call()
  helper_tree=ast.parse((ROOT/'ops/priority-evaluation/refusal_approval.py').read_text())
  node=next(n for n in helper_tree.body if isinstance(n,ast.FunctionDef) and n.name=='advance')
  helper_ns={'os':SimpleNamespace(environ={}), 'envelope':lambda *a:(self.draft['draft'],self.draft['digest']), 'fcntl':fcntl,'json':json,'atomic':lambda *a:self.fail('withdrawn approval must never send/write')}
  exec(compile(ast.Module(body=[node],type_ignores=[]),'actual-approval-advance','exec'),helper_ns)
  self.ns['refusal_approval'].advance=helper_ns['advance'];self.ns['change_request_message']=lambda *a:('inert subject','inert body');self.ns['alert']=lambda *a,**k:None;self.ns['order_ref']=lambda x:x[:8]
  tree=ast.parse((ROOT/'ops/priority-evaluation/autopickup.py').read_text());node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='advance_change_request');exec(compile(ast.Module(body=[node],type_ignores=[]),'actual-change-request-advance','exec'),self.ns)
  update=self.ns['update_row']
  def interleave(rid,assignments,guard):
   self.assertEqual(assignments,"change_request_email_status='held'");self.row['change_request_email_status']='held';return True
  self.ns['update_row']=interleave
  self.ns['advance_change_request'](self.row,self.runtime,self.job,SimpleNamespace(dry_run=False),datetime.datetime(2026,10,8,tzinfo=datetime.timezone.utc))
  self.assertEqual(self.row['change_request_email_status'],'held');self.assertEqual(json.loads(self.approval.read_text())['decision'],'withdrawn')
  self.ns['update_row']=update;self.cas=True;self.call()
  self.assertEqual(self.row['change_request_email_status'],'not_due');self.assertEqual(self.row['paid_at'],self.original['paid_at']);self.assertEqual(self.row['resubmission_count'],0);self.assertEqual(self.runtime['stage_attempts'],self.runtime_before['stage_attempts'])
 def test_other_operational_hold_is_preserved(self):
  existing={'reason':'official_input_unresolved','transient':False}
  self.runtime['operational_hold']=existing.copy()
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(self.row,self.original);self.assertEqual(self.runtime['operational_hold'],existing);self.assertEqual(self.updates,[])
 def test_timer_never_retries_nontransient_hold(self):
  self.call();escalations=[];starts=[]
  self.ns['operational_escalate']=lambda *a,**k:escalations.append((a,k))
  effects=SimpleNamespace(start_unit=lambda unit:starts.append(unit))
  for days in [0,1,100]:
   self.ns['manage_evaluation'](self.row,self.runtime,effects,datetime.datetime(2026,10,8,tzinfo=datetime.timezone.utc)+datetime.timedelta(days=days))
  self.assertEqual(starts,[]);self.assertEqual(len(escalations),3);self.assertEqual(len(self.updates),1)
  self.assertFalse(self.runtime['operational_hold']['transient']);self.assertEqual(self.runtime['stage_attempts'],self.runtime_before['stage_attempts']);self.assertEqual(self.runtime['steps'],self.runtime_before['steps'])
 def test_missing_hold_after_interruption_is_restored_before_clear(self):
  self.cas=False
  with self.assertRaises(ValueError):self.call()
  self.runtime.pop('operational_hold');self.cas=True;self.call()
  self.assertEqual(self.runtime['operational_hold']['reason'],'source_access_recovered_pending_review');self.assertFalse(self.runtime['operational_hold']['transient'])
 def test_planned_review_routes_one_board_handoff_and_never_alerts(self):
  self.call();boards=[];alerts=[]
  def board(text,owner,**kw):boards.append((text,owner,kw));return True
  self.ns['alert']=lambda *a,**kw:alerts.append((a,kw));effects=SimpleNamespace(board=board)
  reason='source_access_recovered_pending_review';now=datetime.datetime(2026,10,8,tzinfo=datetime.timezone.utc)
  self.ns['operational_escalate'](self.row,self.runtime,effects,now,reason,exhausted=False)
  self.ns['operational_escalate'](self.row,self.runtime,effects,now,reason,exhausted=False)
  self.assertEqual(len(boards),1);self.assertEqual(boards[0][1],'fastlane-acad951a-recovery-20261008');self.assertIn('no customer action',boards[0][0]);self.assertEqual(alerts,[])
  self.assertEqual(self.runtime['stage_attempts'],self.runtime_before['stage_attempts']);self.assertEqual(self.runtime['steps']['evaluation_start'],self.runtime_before['steps']['evaluation_start'])
 def test_planned_review_failed_board_handoff_still_never_alerts(self):
  self.call();boards=[];alerts=[]
  self.ns['alert']=lambda *a,**kw:alerts.append((a,kw));effects=SimpleNamespace(board=lambda *a,**kw:boards.append(a) and False)
  self.ns['operational_escalate'](self.row,self.runtime,effects,datetime.datetime(2026,10,8,tzinfo=datetime.timezone.utc),'source_access_recovered_pending_review',exhausted=False)
  self.assertEqual(len(boards),1);self.assertEqual(alerts,[]);self.assertNotEqual(self.runtime['steps']['source_access_review_handoff']['status'],'done')
 def test_other_order_reason_or_owner_retains_original_escalation(self):
  self.call();base=copy.deepcopy(self.runtime)
  for mismatch in ['order','reason','owner']:
   state=copy.deepcopy(base);row=dict(self.row);reason='source_access_recovered_pending_review'
   if mismatch=='order':row['id']='00000000-0000-4000-8000-000000000001'
   if mismatch=='reason':reason='actual_source_failure'
   if mismatch=='owner':state['operational_hold']['owner']='different-owner'
   boards=[];alerts=[]
   self.ns['alert']=lambda *a,**kw:alerts.append((a,kw));effects=SimpleNamespace(board=lambda *a,**kw:boards.append(a) or True)
   self.ns['operational_escalate'](row,state,effects,datetime.datetime(2026,10,8,tzinfo=datetime.timezone.utc),reason,exhausted=False)
   self.assertEqual(boards[0][1],'original-synthetic-owner');self.assertEqual(len(alerts),1);self.assertIn('Rescue fast-lane order',alerts[0][1]['text'])
 def legacy_prepared(self):
  self.cas=False
  with self.assertRaises(ValueError):self.call()
  path=self.job/'review/SOURCE-ACCESS-RECOVERY.json';d=json.loads(path.read_text());d['preserved']['release_attempts']=None;path.write_text(json.dumps(d,indent=2)+'\n');self.cas=True
  return path,path.read_bytes()
 def test_actual_row_projection_contract_supplies_release_counter(self):
  self.assertIn('release_attempts',self.ns['ROW_FIELDS']);sql=self.ns['row_json_sql']();self.assertEqual(sql.count("'release_attempts',r.release_attempts"),1)
  projected={k:self.row.get(k) for k in self.ns['ROW_FIELDS']};self.assertEqual(projected['release_attempts'],0)
  self.ns['load_row']=lambda rid:dict({k:self.row.get(k) for k in self.ns['ROW_FIELDS']});self.call();self.assertEqual(self.row['release_attempts'],0)
 def test_legacy_projection_migrates_only_observed_zero_and_preserves_original_bytes(self):
  path,original=self.legacy_prepared();self.call();receipt_path=path.with_name('SOURCE-ACCESS-RECOVERY.release-attempts-migration.json');receipt=json.loads(receipt_path.read_text())
  self.assertEqual(receipt['prior_observation'],'UNOBSERVED');self.assertEqual(base64.b64decode(receipt['original_journal_bytes_base64']),original);self.assertEqual(receipt['original_journal_sha256'],hashlib.sha256(original).hexdigest());self.assertEqual(receipt_path.stat().st_mode&0o777,0o600)
  self.assertIsNone(json.loads(original)['preserved']['release_attempts']);self.assertEqual(receipt['authoritative_release_attempts'],0);self.assertEqual(self.row['release_attempts'],0);self.assertEqual(self.row['paid_at'],self.original['paid_at']);self.assertEqual(self.runtime['stage_attempts'],self.runtime_before['stage_attempts'])
  receipt_bytes=receipt_path.read_bytes();self.call();self.assertEqual(receipt_path.read_bytes(),receipt_bytes)
 def test_legacy_migration_rejects_nonzero_counter_and_changed_states(self):
  path,original=self.legacy_prepared()
  for field,value in [('release_attempts',1),('release_attempts',None),('release_attempts',False),('customer_hold_started_at','2026-10-08T01:00:00+00:00'),('customer_hold_started_at',None),('evaluation_status','starting'),('review_passed_at','2026-10-08T01:00:00+00:00'),('refund_id','refund'),('result_delivered_at','2026-10-08T01:00:00+00:00'),('release_status','starting'),('review_email_status','sent'),('evaluation_attempts',99),('paid_at','2026-10-07T00:00:00+00:00')]:
   before=self.row[field];self.row[field]=value
   with self.assertRaises(ValueError):self.call()
   self.assertEqual(path.read_bytes(),original);self.assertFalse(path.with_name('SOURCE-ACCESS-RECOVERY.release-attempts-migration.json').exists());self.row[field]=before
 def test_legacy_malformed_snapshot_is_never_migrated(self):
  path,original=self.legacy_prepared();baseline=json.loads(original)
  bad=[]
  d=copy.deepcopy(baseline);d['preserved'].pop('evaluation_attempts');bad.append(d)
  d=copy.deepcopy(baseline);d['preserved']['invented_counter']=0;bad.append(d)
  d=copy.deepcopy(baseline);d['phase']='complete';bad.append(d)
  d=copy.deepcopy(baseline);d['approval_before']=None;bad.append(d)
  d=copy.deepcopy(baseline);d['request_id']='other';bad.append(d)
  for d in bad:
   path.write_text(json.dumps(d));before=path.read_bytes()
   with self.assertRaises(ValueError):self.call()
   self.assertEqual(path.read_bytes(),before);self.assertFalse(path.with_name('SOURCE-ACCESS-RECOVERY.release-attempts-migration.json').exists())
 def test_legacy_migration_requires_matching_withdrawal_and_hold(self):
  path,original=self.legacy_prepared();a=json.loads(self.approval.read_text());a['recovery_evidence']={'changed':True};self.approval.write_text(json.dumps(a))
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(path.read_bytes(),original);self.assertFalse(path.with_name('SOURCE-ACCESS-RECOVERY.release-attempts-migration.json').exists())
 def test_receipt_symlink_or_malformed_is_refused_without_overwrite(self):
  path,original=self.legacy_prepared();receipt=path.with_name('SOURCE-ACCESS-RECOVERY.release-attempts-migration.json');other=path.with_name('synthetic-original');other.write_text('{}');receipt.symlink_to(other)
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(other.read_text(),'{}');self.assertEqual(path.read_bytes(),original);receipt.unlink();receipt.write_text('{}');receipt.chmod(0o600)
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(receipt.read_text(),'{}');self.assertEqual(path.read_bytes(),original)
 def test_immutable_receipt_survives_pre_journal_write_crash(self):
  path,original=self.legacy_prepared();atomic=self.ns['atomic_write']
  def crash(target,value):
   if target==path:raise RuntimeError('inert crash after immutable receipt')
   atomic(target,value)
  self.ns['atomic_write']=crash
  with self.assertRaises(RuntimeError):self.call()
  receipt=path.with_name('SOURCE-ACCESS-RECOVERY.release-attempts-migration.json');bytes_before=receipt.read_bytes();self.assertEqual(path.read_bytes(),original);self.ns['atomic_write']=atomic;self.call();self.assertEqual(receipt.read_bytes(),bytes_before)
 def test_receipt_tampering_after_migration_refuses(self):
  path,_=self.legacy_prepared();self.call();receipt=path.with_name('SOURCE-ACCESS-RECOVERY.release-attempts-migration.json');d=json.loads(receipt.read_text());d['original_journal_sha256']='bad';receipt.write_text(json.dumps(d));receipt.chmod(0o600)
  with self.assertRaises(ValueError):self.call()
 def test_git_source_drift_refuses(self):
  self.ns['git']=lambda *a:'c'*40
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(self.updates,[])

if __name__=='__main__':unittest.main()
