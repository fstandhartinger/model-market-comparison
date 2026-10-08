"""Inert controls for actual health function; no DB, notifications or services."""
import ast
import copy
import datetime as dt
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
import contextlib

ROOT = Path(__file__).resolve().parents[1]
RID = 'acad951a-1b9d-4f3c-a449-350d1c04bd23'
NOW = dt.datetime(2026,10,8,19,tzinfo=dt.timezone.utc)
class Health(unittest.TestCase):
 def setUp(self):
  self.row = dict(id=RID,paid_at='2026-10-07T23:31:27+00:00',notification_status='sent',confirmation_status='sent',evaluation_status='pending')
  self.state = dict(steps={'source_access_review_handoff': {'status':'done'}},operational_hold=dict(reason='source_access_recovered_pending_review',owner='fastlane-acad951a-recovery-20261008',transient=False))
  self.before=copy.deepcopy(self.state)
  def load(rid):
   if self.state is None:raise ValueError('corrupt')
   return copy.deepcopy(self.state)
  self.ns=dict(Any=object,Effects=object,datetime=dt.datetime,timedelta=dt.timedelta,utcnow=lambda:NOW,iso=lambda d:d.isoformat(),PICKUP_TIMERS=[],WORKER_UNIT='worker',MAIL_WATCH_UNIT='mail',systemd_last_success=lambda *a:NOW,managed_predicate=lambda *a:'TRUE',JOB_ROOT=Path('/fake'),TABLE='fake',row_json_sql=lambda *a:'fake',sql_rows=lambda *a:[self.row],request_id=lambda r:r,order_ref=lambda r:r[:8],parse_ts=lambda v:dt.datetime.fromisoformat(v) if v else None,active_hold=lambda r:bool(r.get('customer_hold_started_at')),load_state=load,PickupError=ValueError,deadline_for=lambda r:dt.datetime.fromisoformat(r['paid_at'])+dt.timedelta(hours=48),STATE_ROOT=Path('/nonexistent-fixture'),json=json,ALERT_REPEAT=dt.timedelta(hours=24))
  tree=ast.parse((ROOT/'ops/priority-evaluation/autopickup.py').read_text());nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['health','step','step_done']]
  exec(compile(ast.Module(body=nodes,type_ignores=[]),'actual-health','exec'),self.ns)
  self.effects=SimpleNamespace(dry_run=True,notify=lambda text:True)
 def call(self):return self.ns['health'](self.effects)
 def test_acknowledged_review_hold_reported_without_false_eval_alarm(self):
  r=self.call();self.assertEqual(r['problems'],[]);self.assertEqual(r['held_orders'][0]['owner'],self.state['operational_hold']['owner']);self.assertFalse(r['held_orders'][0]['sla_paused']);self.assertEqual(r['held_orders'][0]['deadline'],'2026-10-09T23:31:27+00:00');self.assertEqual(self.state,self.before)
 def test_wrong_scope_owner_reason_transience_or_missing_handoff_never_hides_stuck_order(self):
  for key,value in [('owner','other'),('reason','other'),('transient',True)]:
   self.state=copy.deepcopy(self.before);self.state['operational_hold'][key]=value;self.assertIn('evaluation not running',self.call()['problems'][0])
  self.state=copy.deepcopy(self.before);self.state['steps']={};self.assertIn('evaluation not running',self.call()['problems'][0])
  self.state=copy.deepcopy(self.before);self.row['id']='1fb9646e-c44d-4732-b708-8c7c5d16f0fa';self.assertIn('evaluation not running',self.call()['problems'][0])
 def test_nonplanned_hold_has_actionable_reason(self):
  self.state['operational_hold']['reason']='static_source_packet_exceeds_review_capacity';self.assertIn('operational hold: static_source_packet_exceeds_review_capacity',self.call()['problems'][0])
 def test_customer_hold_reported_separately(self):
  self.row.update(customer_hold_started_at='2026-10-08T10:00:00+00:00',customer_hold_reason='customer_changes');r=self.call();self.assertEqual(r['problems'],[]);self.assertTrue(r['held_orders'][0]['sla_paused'])
 def test_exhausted_step_and_missing_confirmation_still_alarm_on_planned_hold(self):
  self.state['steps']['preparation']={'status':'exhausted'};self.row['confirmation_status']='pending';r=self.call();self.assertEqual(len(r['problems']),2);self.assertTrue(any('step preparation exhausted' in p for p in r['problems']))
 def test_planned_hold_at_or_after_deadline_still_alarms(self):
  for now in [dt.datetime(2026,10,9,23,31,27,tzinfo=dt.timezone.utc),dt.datetime(2026,10,10,tzinfo=dt.timezone.utc)]:
   self.ns["utcnow"]=lambda:now;r=self.call();self.assertIn("evaluation not running",r["problems"][0]);self.assertFalse(r["held_orders"][0]["sla_paused"])
 def test_corrupt_state_fails_closed(self):
  self.state=None;r=self.call();self.assertEqual(len(r['problems']),2);self.assertIn('pickup state is unreadable',r['problems'][0])
unittest.main()
