"""Inert source-access operator correction controls; no imports of runtime dependencies."""
import ast
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
  self.row={'stripe_mode':'live','synthetic_test':False,'status':'paid','model_link':URL,'refund_id':None,'result_delivered_at':None,'evaluation_status':'pending','change_request_email_status':'approval_required','delivery_email_status':'not_due','pickup_job_dir':str(self.job),'customer_hold_reason':'customer_changes','customer_hold_started_at':'2026-10-07T23:35:08+00:00','paid_at':'2026-10-07T23:31:27+00:00','sla_paused_seconds':0,'evaluation_attempts':1,'resubmission_count':0,'pickup_attempts':2,'release_attempts':0,'review_passed_at':None,'code_link':None}
  self.original=dict(self.row);self.updates=[];self.cas=True;self.crash=False;self.fail_read=False
  def load_row(rid):
   if self.fail_read:self.fail_read=False;raise RuntimeError('inert crash after database CAS')
   return dict(self.row)
  def update_row(rid,assignments,guard):
   self.updates.append((assignments,guard))
   if not self.cas:return False
   self.row.update(customer_hold_started_at=None,customer_hold_reason=None,change_request_email_status='not_due')
   if self.crash:self.crash=False;self.fail_read=True
   return True
  def atomic(path,value):Path(path).write_text(value)
  def atomic_approval(path,value):Path(path).write_text(json.dumps(value))
  self.ns={'request_id':lambda x:x,'load_row':load_row,'PickupError':ValueError,'job_directory':lambda *x:self.job,'JOB_ROOT':self.base,'subprocess':SimpleNamespace(run=lambda *a,**k:SimpleNamespace(returncode=3,stdout='inactive\n')),'EVAL_UNIT':'eval@{}.service','json':json,'SHA40_RE':re.compile('^[0-9a-f]{40}$'),'parse_ts':lambda x:datetime.datetime.fromisoformat(x) if x else None,'git':lambda d,*args:'a'*40 if args[-1]=='HEAD' else 'b'*40,'STATE_ROOT':self.state,'hashlib':hashlib,'fcntl':fcntl,'CHANGE_HOLD_REASON':'customer_changes','atomic_write':atomic,'utcnow':lambda:datetime.datetime(2026,10,8,10,tzinfo=datetime.timezone.utc),'iso':lambda x:x.isoformat(),'refusal_approval':SimpleNamespace(atomic=atomic_approval),'sql_text':lambda v:"'"+v.replace("'","''")+"'",'update_row':update_row,'Any':object}
  tree=ast.parse((ROOT/'ops/priority-evaluation/autopickup.py').read_text());node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='recover_source_access');exec(compile(ast.Module(body=[node],type_ignores=[]),'trusted-recovery','exec'),self.ns)
 def call(self):return self.ns['recover_source_access'](RID)
 def test_preserves_payment_clock_attempts_and_original_artifacts(self):
  changes=self.changes.read_bytes();self.call();self.assertEqual(self.changes.read_bytes(),changes)
  for k in ['paid_at','sla_paused_seconds','evaluation_attempts','resubmission_count','pickup_attempts','release_attempts']:self.assertEqual(self.row[k],self.original[k])
  assignments,guard=self.updates[0];self.assertNotIn('sla_paused_seconds=',assignments);self.assertNotIn('paid_at=',assignments);self.assertIn('sla_paused_seconds IS NOT DISTINCT FROM',guard);self.assertIn("evaluation_status='pending'",guard);self.assertIn("change_request_email_status='approval_required'",guard)
  self.assertEqual(json.loads(self.approval.read_text())['decision'],'withdrawn');self.assertEqual(json.loads((self.job/'review/SOURCE-ACCESS-RECOVERY.json').read_text())['phase'],'complete')
  self.call();self.assertEqual(len(self.updates),1)
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
 def test_git_source_drift_refuses(self):
  self.ns['git']=lambda *a:'c'*40
  with self.assertRaises(ValueError):self.call()
  self.assertEqual(self.updates,[])

if __name__=='__main__':unittest.main()
