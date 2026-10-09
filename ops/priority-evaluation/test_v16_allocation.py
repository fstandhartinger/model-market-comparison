"""Synthetic receipt/gate tests, no provider request or real ledger mutation."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import v16_allocation as a


class FreshAllocationTests(unittest.TestCase):
    def setup_scope(self, root, original_allocations=2, rid=a.WALD):
        job=root/rid;(job/'review').mkdir(parents=True);(root/'requests').mkdir();pods=root/'pods';pods.mkdir()
        def write(path,value):path.write_text(json.dumps(value));return a.sha(path)
        original={'request_id':rid,'creation_attempts':original_allocations+1,'spent_upper_bound_usd':16.25,
                  'measurement_completed':True,'pod_id':None,'cleanup_uncertain':False}
        ledger=pods/f'{rid}.json';write(ledger,original)
        admission={'generation':'v16-paid-cohort'}
        admission_sha=write(job/'review/V16-PROFILE-ADMISSION.json',admission)
        decision_sha=write(job/'review/V16-ALLOCATION-DECISION.json',{'authorizer':'Florian','date':'2026-10-09','topic_thread_id':13211,
                     'instruction':'run new evaluation with the new v1.6 methodology, finish the fast-lane jobs.'})
        authority={'schema_version':1,'scope':'fresh-native-v16-generation','order_id':rid,'generation':admission['generation'],
                  'admission_sha256':admission_sha,'decision_sha256':decision_sha,'original_ledger_sha256':a.sha(ledger),
                  'original_creation_attempts':original['creation_attempts'],'original_allocations':original_allocations,
                  'allowed_total_allocations':original_allocations+1,'max_additional_allocations':1,'original_spent_upper_bound_usd':16.25}
        authority_sha=write(job/'review/V16-ALLOCATION-AUTHORITY.json',authority)
        reviewer_sha=write(job/'review/V16-ALLOCATION-REVIEW.json',{'verdict':'ACCEPTED','reviewer_engine':'claude',
                  'authority_sha256':authority_sha,'verified_root_decision_sha256':decision_sha,'root_decision_authenticity_verified':True})
        state={'v16_generation_allocation':{'verdict':'ACCEPTED','authority_sha256':authority_sha,'independent_review_sha256':reviewer_sha}}
        write(root/'requests'/f'{rid}.json',state)
        return job,pods,admission,original

    def test_one_fresh_rental_preserves_old_counters_and_refuses_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);job,pods,admission,original=self.setup_scope(root);snapshot=copy.deepcopy(original)
            recheck=Mock()
            with patch.object(a.pod_runner,'STATE_ROOT',root),patch.object(a.pod_runner,'PODS_DIR',pods), \
                    patch.object(a.pod_capacity,'allocation_count',side_effect=lambda state,_:state['creation_attempts']-1):
                gate=a.FreshAllocation(job,admission,recheck)
                self.assertEqual(gate('check',original),3)
                gate('before_reserve',original)
                self.assertEqual(original,snapshot)
                reserved={**original,'creation_attempts':4,'spent_upper_bound_usd':20,'attempt_ttl_hours':.75,'attempt_reserved_upper_bound_usd':3.75}
                gate('before_create',reserved)
                with self.assertRaises((ValueError,FileExistsError)):gate('before_create',reserved)
                with self.assertRaises(ValueError):gate('check',reserved)
                with self.assertRaises(ValueError):a.FreshAllocation(job,admission,recheck)
                self.assertEqual(json.loads((pods/f'{job.name}.json').read_text()),snapshot)

    def test_authority_cannot_expand_others_or_skip_claude_or_ledger_binding(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);job,pods,admission,original=self.setup_scope(root,rid='1c027833-1c49-408d-b4a0-63a4d654249b')
            with patch.object(a.pod_runner,'STATE_ROOT',root),patch.object(a.pod_runner,'PODS_DIR',pods):
                with self.assertRaisesRegex(ValueError,'bounded'):a.FreshAllocation(job,admission,Mock())
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);job,pods,admission,original=self.setup_scope(root)
            with patch.object(a.pod_runner,'STATE_ROOT',root),patch.object(a.pod_runner,'PODS_DIR',pods):
                (pods/f'{job.name}.json').write_text(json.dumps({**original,'creation_attempts':0}))
                with self.assertRaisesRegex(ValueError,'original ledger changed'):a.FreshAllocation(job,admission,Mock())

    def test_remaining_budget_bounds_ttl_and_recheck_refuses_before_claim(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);job,pods,admission,original=self.setup_scope(root)
            with patch.object(a.pod_runner,'STATE_ROOT',root),patch.object(a.pod_runner,'PODS_DIR',pods), \
                    patch.object(a.pod_capacity,'allocation_count',side_effect=lambda state,_:state['creation_attempts']-1):
                gate=a.FreshAllocation(job,admission,Mock());gate('before_reserve',original)
                reserved={**original,'creation_attempts':4,'spent_upper_bound_usd':20.01,'attempt_ttl_hours':.75,'attempt_reserved_upper_bound_usd':3.75}
                with self.assertRaisesRegex(ValueError,'reservation charge differs|exceeds original accounting'):gate('before_create',reserved)
                self.assertFalse(gate.create_claim.exists())
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);job,pods,admission,original=self.setup_scope(root)
            with patch.object(a.pod_runner,'STATE_ROOT',root),patch.object(a.pod_runner,'PODS_DIR',pods),patch.object(a.pod_capacity,'allocation_count',return_value=2):
                gate=a.FreshAllocation(job,admission,Mock(side_effect=ValueError('retired')))
                with self.assertRaisesRegex(ValueError,'retired'):gate('before_reserve',original)
                self.assertFalse(gate.claim.exists())
