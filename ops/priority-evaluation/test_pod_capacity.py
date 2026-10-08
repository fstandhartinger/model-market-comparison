"""Inert host fixtures: no provider request, model, pod or order mutation."""
import copy
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
import uuid
from unittest.mock import patch

import pod_capacity as pc
import pod_runner as pr
import lium_bounded_up as bounded


class CapacityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.rid = str(uuid.uuid4())
        self.state = {'request_id':self.rid,'creation_attempts':2,'spent_upper_bound_usd':1.25,
                      'input_dispatched':False,'execution_started':False}
        self.started = (datetime.now(timezone.utc)-timedelta(seconds=3)).isoformat()

    def proof(self, phase='create_refused'):
        return {'phase':phase,'started_at':self.started,'event':{
            'id':str(uuid.uuid4()),'request_id':uuid.uuid4().hex,
            'action':'pod.create','method':'POST','route':'/executors/rent-by-spec',
            'status_code':409,'resource_type':'pod','resource_id':None,'source':'cli',
            'created_at':(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()}}

    def credit(self, state=None, proof=None):
        state=self.state if state is None else state
        return pc.store_refusal(state,self.root,proof or self.proof(),attempt=2,before={'foreign'},after={'foreign'},released=True)

    def test_credit_retains_raw_attempts_money_and_allocation_cap(self):
        self.credit()
        self.assertEqual(self.state['creation_attempts'],2)
        self.assertEqual(self.state['spent_upper_bound_usd'],1.25)
        self.assertEqual(pc.allocation_count(self.state,self.root),1)
        self.state['creation_attempts']=3
        self.assertEqual(pc.allocation_count(self.state,self.root),2)
        fake=SimpleNamespace(reserve=lambda *a:self.fail('allocation cap reached'))
        with patch.object(pr,'PODS_DIR',self.root),self.assertRaises(pr.PodRunError):
            pr._lifecycle(fake,'fixture',{},self.root/'stage',self.root/'out',self.state,('RTXPRO6000',96),3,18.75,None,lambda:None)
        self.assertEqual(self.state['creation_attempts'],3)

    def test_receipt_bytes_and_cross_order_and_duplicates_fail_closed(self):
        digest=self.credit()
        path=pc.receipt_dir(self.root,self.rid)/(digest+'.json')
        original=path.read_bytes();path.write_bytes(original+b' ')
        with self.assertRaises(pc.CapacityEvidenceError):pc.allocation_count(self.state,self.root)
        path.write_bytes(original)
        self.state['capacity_refusals'].append(digest)
        with self.assertRaises(pc.CapacityEvidenceError):pc.allocation_count(self.state,self.root)
        self.state['capacity_refusals'].pop()
        other=copy.deepcopy(self.state);other['request_id']=str(uuid.uuid4())
        otherdir=pc.receipt_dir(self.root,other['request_id']);otherdir.mkdir(parents=True)
        (otherdir/path.name).write_bytes(original)
        with self.assertRaises(pc.CapacityEvidenceError):pc.allocation_count(other,self.root)

    def test_ambiguity_wrong_event_time_partial_and_four_refusal_cap(self):
        for change in [{'status_code':500},{'resource_id':'actual-pod'},{'route':'/pods/up'},
                       {'created_at':'2000-01-01T00:00:00+00:00'}]:
            proof=self.proof();proof['event'].update(change)
            with self.assertRaises(pc.CapacityEvidenceError):self.credit(copy.deepcopy(self.state),proof)
        partial=copy.deepcopy(self.state);partial['input_dispatched']=True
        with self.assertRaises(pc.CapacityEvidenceError):self.credit(partial)
        for _ in range(12):pc.store_refusal(self.state,self.root,self.proof('read_only_preflight'))
        self.assertEqual(len(self.state['read_only_capacity_refs']),8)
        self.assertEqual(self.state['read_only_capacity_checks'],12)
        self.assertEqual(self.state['creation_attempts'],2)
        self.assertEqual(pc.allocation_count(self.state,self.root),2)
        self.state['creation_attempts']=6
        for attempt in range(1,5):pc.store_refusal(self.state,self.root,self.proof(),attempt=attempt,before=set(),after=set(),released=True)
        with self.assertRaises(pc.CapacityEvidenceError):pc.store_refusal(self.state,self.root,self.proof(),attempt=5,before=set(),after=set(),released=True)

    def test_release_and_same_listing_are_required(self):
        for kwargs in [dict(before=set(),after={'new'},released=True),dict(before=set(),after=set(),released=False)]:
            with self.assertRaises(pc.CapacityEvidenceError):
                pc.store_refusal(copy.deepcopy(self.state),self.root,self.proof(),attempt=2,**kwargs)

    def test_quote_two_only_narrow_route_and_native_exact_price(self):
        refusal=self.proof('read_only_preflight')
        q={'gpu':'RTXPRO6000','gpu_count':2,'hourly_usd':2.38,'node_id':str(uuid.uuid4()),'quoted_at':datetime.now(timezone.utc).isoformat()}
        with patch.object(pc,'quote',side_effect=[{**refusal,'refused':True},q]) as quote:
            result=pr.LiumProvider().preflight('RTXPRO6000',{'kind':'http_typesafe','min_vram_gb':96},('jevbench',),allow_two_gpu=True)
            self.assertEqual(result['quote']['gpu_count'],2)
            self.assertEqual([call.args[1] for call in quote.call_args_list],[1,2])
        for kwargs in [{}, {'allow_two_gpu':True,'capacity_remaining':1}]:
            with patch.object(pc,'quote',return_value={**refusal,'refused':True}) as quote:
                self.assertIsNone(pr.LiumProvider().preflight('RTXPRO6000',
                    {'kind':'http_typesafe','min_vram_gb':96},('jevbench',),**kwargs)['quote'])
                self.assertEqual(quote.call_count,1)
        for recipe,benches in [({'kind':'python_inprocess','min_vram_gb':96},('jevbench',)),
                               ({'kind':'http_typesafe','min_vram_gb':80},('jevbench',)),
                               ({'kind':'aplomb_native','min_vram_gb':96,'hourly_usd':1.3},('jevbench',))]:
            with patch.object(pc,'quote',return_value={**refusal,'refused':True}) as quote:
                self.assertIsNone(pr.LiumProvider().preflight('RTXPRO6000',recipe,benches)['quote'])
                self.assertEqual(quote.call_count,1)
        with patch.object(pc,'quote',return_value={**q,'gpu_count':1}),self.assertRaisesRegex(pr.measurement_dispatch.OperationalHold,'quote_changed'):
            pr.LiumProvider().preflight('RTXPRO6000',{'kind':'aplomb_native','min_vram_gb':96,'hourly_usd':1.3},('jevbench',))

    def test_refused_preflight_never_reserves_or_debits_attempt(self):
        provider=pr.LiumProvider()
        provider.reserve=lambda *a:self.fail('must not reserve')
        proof=self.proof('read_only_preflight')
        provider.preflight=lambda *a:{'quote':None,'refusals':[proof]}
        self.state['creation_attempts']=0
        with patch.object(pr,'PODS_DIR',self.root),self.assertRaises(pr.PodCapacityError):
            pr._lifecycle(provider,'fixture',{},self.root/'stage',self.root/'out',self.state,('RTXPRO6000',96),3,18.75,None,lambda:None)
        self.assertEqual(self.state['creation_attempts'],0)
        self.assertEqual(self.state['spent_upper_bound_usd'],1.25)

    def test_alternate_gpu_preflight_uses_one_shared_two_quote_budget(self):
        provider=pr.LiumProvider();quotes=[];reservations=[]
        def quote(gpu,count,*args):
            quotes.append((gpu,count))
            if gpu=='H100':return {**self.proof('read_only_preflight'),'refused':True}
            return {'gpu':gpu,'gpu_count':1,'hourly_usd':1.3,'node_id':str(uuid.uuid4()),'quoted_at':datetime.now(timezone.utc).isoformat()}
        def reserve(*args):
            reservations.append(args)
            raise RuntimeError('first-party stop before allocation')
        provider.reserve=reserve
        self.state['creation_attempts']=0
        budget={'remaining':2}
        with patch.object(pr,'PODS_DIR',self.root),patch.object(pc,'quote',side_effect=quote):
            with self.assertRaises(pr.PodCapacityError) as refusal:
                pr._lifecycle(provider,'fixture',{'kind':'http_typesafe','min_vram_gb':80},self.root/'stage',self.root/'out',self.state,('H100',80),3,18.75,None,lambda:None,quote_budget=budget)
            self.assertTrue(refusal.exception.read_only_preflight)
            self.assertEqual(budget['remaining'],1)
            with self.assertRaisesRegex(RuntimeError,'stop'):
                pr._lifecycle(provider,'fixture',{'kind':'http_typesafe','min_vram_gb':80},self.root/'stage',self.root/'out',self.state,('A100',80),3,18.75,None,lambda:None,quote_budget=budget)
            with self.assertRaises(pr.PodCapacityError):
                pr._lifecycle(provider,'fixture',{'kind':'http_typesafe','min_vram_gb':80},self.root/'stage',self.root/'out',self.state,('A100',80),3,18.75,None,lambda:None,quote_budget=budget)
        self.assertEqual(quotes,[('H100',1),('A100',1)])
        self.assertEqual(len(reservations),1)
        self.assertEqual(self.state['creation_attempts'],0)
        self.assertEqual(self.state['spent_upper_bound_usd'],1.25)

    def test_real_cli_success_wrapper_and_text_metadata_exact_id(self):
        pid=str(uuid.uuid4());foreign=str(uuid.uuid4())
        row={'id':pid,'huid':'synthetic','gpu_count':2,'price_per_hour':2.38}
        for output in [json.dumps({'pod':row,'termination_time':'2026-10-08T23:00:00'}),
                       'Pod synthetic (name: inert, id:\n'+pid+') ready']:
            def cli(argv,**kwargs):
                if 'lium_bounded_up.py' in ' '.join(map(str,argv)):
                    return SimpleNamespace(returncode=0,stdout=output,stderr='')
                if len(argv)>2 and argv[1:3]==['ps',pid]:
                    return SimpleNamespace(returncode=0,stdout=json.dumps([row]),stderr='')
                return SimpleNamespace(returncode=0,stdout='[]',stderr='')
            with patch.object(pr,'_run_cli',side_effect=cli):
                result=pr.LiumProvider().create('RTXPRO6000',3,18.75)
            self.assertEqual(result['pod_id'],pid)
            self.assertEqual(result['gpu_count'],2)
            self.assertEqual(result['hourly_usd'],2.38)
            self.assertFalse(result['metadata_invalid'])
        row['id']=foreign
        with patch.object(pr,'_run_cli',side_effect=cli):result=pr.LiumProvider().create('RTXPRO6000',3,18.75)
        self.assertEqual(result['pod_id'],pid)
        self.assertTrue(result['metadata_invalid'])

    def test_actual_click_entry_is_inert_and_legacy_up_is_blocked(self):
        from lium.sdk import Lium
        from lium.cli.cli import cli
        original_rent=Lium.rent;original_up=Lium.up
        def invoke(*,args,prog_name):
            self.assertEqual(args,['up','--gpu','RTXPRO6000','-c','2','--ttl','3.0h','--budget','18.75','-y','--json'])
            self.assertEqual(prog_name,'lium')
            with self.assertRaisesRegex(ValueError,'legacy'):Lium.up(object())
        try:
            with patch.object(cli,'main',side_effect=invoke) as main:
                bounded.main(['RTXPRO6000','2','3','18.75','5'])
                main.assert_called_once()
        finally:
            Lium.rent=original_rent;Lium.up=original_up

    def test_authenticated_audit_uniqueness_status_and_null_resource(self):
        proof=self.proof();event=proof['event']
        def cli(*args,**kwargs):return SimpleNamespace(returncode=0,stdout=json.dumps({'items':[event],'next_cursor':None}))
        self.assertEqual(pc.audit_refusal(cli,'lium',event['request_id'],self.started)['id'],event['id'])
        for fields in [{'resource_id':'new'},{'status_code':200},{'resource_id':'missing-placeholder'}]:
            changed={**event,**fields}
            bad=lambda *a,**k:SimpleNamespace(returncode=0,stdout=json.dumps({'items':[changed],'next_cursor':None}))
            with self.assertRaises(pc.CapacityEvidenceError):pc.audit_refusal(bad,'lium',event['request_id'],self.started)

    def test_real_sdk_quote_is_dry_run_and_caps_total_hourly(self):
        from lium.sdk import Lium
        result=SimpleNamespace(pod=None,dry_run=True,gpu_count=2,price_per_hour=2.38,
                               executor=SimpleNamespace(gpu_type='RTXPRO6000',id=str(uuid.uuid4())))
        fake=SimpleNamespace(supports=lambda _:True,rent=unittest.mock.Mock(return_value=result))
        with patch('lium.sdk.Lium',return_value=fake):
            q=pc.quote('RTXPRO6000',2,None,None,5)
        self.assertEqual(q['hourly_usd'],2.38)
        self.assertEqual(fake.rent.call_args.kwargs,{'gpu_type':'RTXPRO6000','gpu_count':2,'max_price_per_gpu_hour':2.5,'dry_run':True})

    def test_bounded_cli_rent_caps_both_quote_and_actual_without_changing_ttl(self):
        calls=[]
        original=lambda client,**kwargs:calls.append(kwargs)
        client=SimpleNamespace(supports=lambda _:True)
        rent=bounded.bounded_rent(original,5,'RTXPRO6000',2)
        for dry in [True,False]:rent(client,gpu_type='RTXPRO6000',gpu_count=2,dry_run=dry,max_price_per_gpu_hour=3)
        self.assertEqual([call['max_price_per_gpu_hour'] for call in calls],[2.5,2.5])
        with self.assertRaises(ValueError):rent(client,gpu_type='H100',gpu_count=2)

if __name__=='__main__':unittest.main()

class RecoveryGuardTests(unittest.TestCase):
    def test_historical_cas_and_original_counters_must_match_exactly(self):
        import recover_wald_capacity as recovery
        state={'request_id':recovery.RID,'creation_attempts':2,'spent_upper_bound_usd':1.25,
               'input_dispatched':False,'execution_started':False,'measurement_completed':False,
               'cleanup_uncertain':False,'pod_id':None,'attempt_reserved_upper_bound_usd':0.0,
               'reservation_id':'gpu-771005577da188e7b57413e2','torn_down_at':'synthetic'}
        original=json.dumps(state).encode()
        with patch.object(recovery,'ORIGINAL_SHA',recovery.sha(original)):
            self.assertEqual(recovery.preserved_state(original),state)
            with self.assertRaisesRegex(RuntimeError,'CAS'):
                recovery.preserved_state(original+b' ')
        for changes in [{'creation_attempts':1},{'input_dispatched':True},{'cleanup_uncertain':True},
                        {'capacity_refusals':[]},{'two_gpu_placement_recipe_sha256':'a'*64}]:
            altered=json.dumps({**state,**changes}).encode()
            with patch.object(recovery,'ORIGINAL_SHA',recovery.sha(altered)),self.assertRaises(RuntimeError):
                recovery.preserved_state(altered)
