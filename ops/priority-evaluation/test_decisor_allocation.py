"""Exact Decisor one-use financial gate, local synthetic canonical ledger only."""
import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import Mock, patch
import v16_allocation as a
from test_v16_allocation import FreshAllocationTests

class Tests(unittest.TestCase):
    def scope(self, root, extra=.2):
        job,pods,admission,old=FreshAllocationTests().setup_scope(root,rid=a.DECISOR)
        old.update(creation_attempts=2,spent_upper_bound_usd=7.8)
        ledger=pods/(a.DECISOR+'.json');ledger.write_text(json.dumps(old))
        directory=job/'review';history=directory/'decisor-history';history.mkdir()
        fixture=Path(__file__).parent/'fixtures/decisor-history'
        for filename in ['state.json','state-run2.json']:shutil.copyfile(fixture/filename,history/filename)
        shutil.copyfile(fixture/'root-financial-decision.json',directory/'DECISOR-ROOT-BOUNDED-COMPLETION-DECISION.json')
        journal={'order_id':a.DECISOR,'creation_attempts':2,'allocations':2,'conservative_spent_upper_bound_usd':7.8,'receipts':[{'file':n,'sha256':a.sha(history/n),'ttl_hours':3} for n in ['state.json','state-run2.json']]}
        path=directory/'DECISOR-OLD-RENTALS.json';path.write_text(json.dumps(journal))
        path=directory/'V16-ALLOCATION-AUTHORITY.json';authority=json.loads(path.read_text());authority.update(original_creation_attempts=2,original_spent_upper_bound_usd=7.8,original_ledger_sha256=a.sha(ledger),max_new_usd=12,max_ttl_hours=2.4,conservative_contingency_usd=.2,historical_journal_sha256=a.sha(directory/'DECISOR-OLD-RENTALS.json'),root_financial_decision_sha256=a.sha(directory/'DECISOR-ROOT-BOUNDED-COMPLETION-DECISION.json'));path.write_text(json.dumps(authority))
        path=directory/'V16-ALLOCATION-REVIEW.json';review=json.loads(path.read_text());review.update(authority_sha256=a.sha(directory/'V16-ALLOCATION-AUTHORITY.json'),decisor_scope_and_financial_authority_verified=True,root_financial_decision_sha256=authority['root_financial_decision_sha256']);path.write_text(json.dumps(review))
        path=root/'requests'/(a.DECISOR+'.json');state=json.loads(path.read_text());state['v16_generation_allocation'].update(authority_sha256=a.sha(directory/'V16-ALLOCATION-AUTHORITY.json'),independent_review_sha256=a.sha(directory/'V16-ALLOCATION-REVIEW.json'));path.write_text(json.dumps(state))
        return job,pods,admission,old
    def gate(self, root, **kwargs):
        job,pods,admission,old=self.scope(root,**kwargs)
        stack=[patch.object(a.pod_runner,'STATE_ROOT',root),patch.object(a.pod_runner,'PODS_DIR',pods),patch.object(a.pod_capacity,'allocation_count',side_effect=lambda state,_:state['creation_attempts'])]
        for item in stack:item.start();self.addCleanup(item.stop)
        return a.FreshAllocation(job,admission,Mock()),old
    def test_exact_third_once_preserves_original_and_extra_inclusive_budget(self):
        with tempfile.TemporaryDirectory() as t:
            gate,old=self.gate(Path(t));snapshot=copy.deepcopy(old);self.assertEqual(gate('check',old),3);gate('before_reserve',old)
            reserved=dict(old,creation_attempts=3,attempt_ttl_hours=11.8/5,attempt_reserved_upper_bound_usd=11.8,attempt_contingency_usd=.2,spent_upper_bound_usd=19.8)
            gate('before_create',reserved)
            self.assertEqual(old,snapshot)
            self.assertEqual(json.loads(gate.ledger.read_text()),snapshot)
            with self.assertRaises((FileExistsError,ValueError)):gate('before_create',reserved)
            with self.assertRaises(ValueError):gate('before_reserve',old)
    def test_ttl_charge_and_additional_fee_refusal(self):
        for ttl,extra in [(2.44,0),(2.4,.1),(3,0)]:
            with self.subTest(ttl=ttl,extra=extra),tempfile.TemporaryDirectory() as t:
                gate,old=self.gate(Path(t),extra=extra);gate('before_reserve',old)
                charge=ttl*5
                with self.assertRaises(ValueError):gate('before_create',dict(old,creation_attempts=3,attempt_ttl_hours=ttl,attempt_reserved_upper_bound_usd=charge,spent_upper_bound_usd=7.8+charge))
                self.assertFalse(gate.create_claim.exists())
    def test_verified_fee_allowance_is_precharged_in_total(self):
        with tempfile.TemporaryDirectory() as t:
            gate,old=self.gate(Path(t),extra=.2);gate('before_reserve',old)
            charge=11.8;ttl=charge/5
            reserved=dict(old,creation_attempts=3,attempt_ttl_hours=ttl,attempt_reserved_upper_bound_usd=charge,attempt_contingency_usd=.2,spent_upper_bound_usd=19.8)
            gate('before_create',reserved)
            self.assertEqual(gate.max_new_usd,11.8)

    def test_history_modified_or_cleanup_uncertain_refused(self):
        with tempfile.TemporaryDirectory() as t:
            gate,old=self.gate(Path(t));p=gate.job/'review/decisor-history/state.json';p.write_text('{}')
            with self.assertRaises(ValueError):a.FreshAllocation(gate.job,{'generation':'v16-paid-cohort'},Mock())
    def test_other_order_third_still_refuses(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);job,pods,admission,old=FreshAllocationTests().setup_scope(root,rid='11111111-1111-4111-8111-111111111111')
            with patch.object(a.pod_runner,'STATE_ROOT',root),patch.object(a.pod_runner,'PODS_DIR',pods):
                with self.assertRaisesRegex(ValueError,'bounded'):a.FreshAllocation(job,admission,Mock())
