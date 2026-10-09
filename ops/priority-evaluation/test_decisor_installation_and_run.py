"""Actual first-party outer-loop/refund tests, synthetic files/providers only."""
import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
import pod_runner as pr
import v16_allocation as allocation
import measurement_dispatch
import test_decisor_allocation as fixtures

class Tests(unittest.TestCase):
    def make(self, root):
        job,pods,admission,old=fixtures.Tests().scope(root)
        (job/'source').mkdir();(job/'source/FETCH-RECEIPT-model.json').write_text('{}')
        return job,pods,admission,old
    def test_installer_stages_exact_runtime_trio_and_preserves_selected_source_modules(self):
        source=(Path(__file__).parent/'install-autopickup.sh').read_text()
        loop=source.split('for f in autopickup.py',1)[1].split('; do',1)[0].split()
        for name in ['decisor_runtime_inspector.py','decisor_runtime_preflight.py','decisor_shim.py','ryotide_runtime_preflight.py','ryotide_runtime_inspector.py']:
            self.assertEqual(loop.count(name),1)
            self.assertTrue((Path(__file__).parent/name).is_file())
        for name in ['native_source_selection.py','ryotide-native-source-policy.json']:self.assertIn(name,loop)
        self.assertIn('install -m 600 "$SRC/$f" "$SHARE/runtime/$f"',source)
    def test_actual_run_clamps_compute_and_ttl_and_preserves_single_failure_status(self):
        for error,reason in [(pr.PodCapacityError('synthetic'), 'gpu_pod_capacity'),
                             (pr.PodRunError('synthetic'), 'gpu_pod_run_failed')]:
            with self.subTest(reason=reason),tempfile.TemporaryDirectory() as temporary:
                root=Path(temporary);job,pods,admission,old=self.make(root)
                stage=root/'stage.tar';stage.write_bytes(b'synthetic')
                pins={'profile':{'inputs':{'jevbench':{'count':1500}}}}
                recipe={'kind':'http_typesafe','min_vram_gb':80,'code':{'commit':'1'*40,'tree':'2'*40}}
                with patch.object(pr,'STATE_ROOT',root),patch.object(pr,'PODS_DIR',pods),patch.object(pr,'validate_recipe'),patch.object(pr,'export_source',return_value=b'synthetic'),patch.object(pr,'build_staging',return_value={}),patch.object(pr,'_stage_tarball',return_value=stage),patch.object(pr,'_lifecycle',side_effect=error) as lifecycle:
                    gate=allocation.FreshAllocation(job,admission,Mock())
                    with self.assertRaisesRegex(measurement_dispatch.OperationalHold,reason):
                        pr.run(allocation.DECISOR,job,recipe,root/'out',pins,20,provider=SimpleNamespace(),alert=Mock(),measurement_pins_factory=lambda:pins,allocation_gate=gate)
                    self.assertEqual(lifecycle.call_count,1)
                    self.assertAlmostEqual(lifecycle.call_args.args[7],2.36)
                    self.assertAlmostEqual(lifecycle.call_args.args[8],11.8)
                    self.assertEqual(json.loads((pods/(allocation.DECISOR+'.json')).read_text()),old)
                    self.assertFalse(stage.exists())
    def test_real_capacity_refund_retains_contingency_and_original_history(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);job,pods,admission,old=self.make(root);state=copy.deepcopy(old);snapshots=[]
            provider=SimpleNamespace(preflight=lambda *args:None,reserve=Mock(return_value='synthetic-reservation'),create=Mock(side_effect=pr.PodCapacityError('synthetic refused before allocation')),release=Mock())
            with patch.object(pr,'STATE_ROOT',root),patch.object(pr,'PODS_DIR',pods),patch.object(pr,'_teardown'):
                gate=allocation.FreshAllocation(job,admission,Mock())
                with self.assertRaises(pr.PodCapacityError):
                    pr._lifecycle(provider,'synthetic-job',{'kind':'http_typesafe','weights':[]},root/'stage',root/'out',state,('H100',80),2.36,11.8,None,lambda:snapshots.append(copy.deepcopy(state)),allocation_gate=gate)
                self.assertTrue(any(abs(s['spent_upper_bound_usd']-19.8)<1e-9 for s in snapshots))
                self.assertAlmostEqual(state['spent_upper_bound_usd'],8.0)
                self.assertEqual(state['attempt_contingency_usd'],.2)
                self.assertEqual(state['attempt_reserved_upper_bound_usd'],0)
                self.assertEqual(state['creation_attempts'],3)
                self.assertTrue(gate.claim.exists());self.assertTrue(gate.create_claim.exists())
                provider.release.assert_called_once_with('synthetic-job',None,'synthetic-reservation')
                self.assertEqual(json.loads(gate.ledger.read_text()),old)
                with self.assertRaises(ValueError):gate('check',state)
    def test_bound_bad_contingency_or_missing_financial_flag_refuses_specific_gate(self):
        for target,field,value,reason in [('authority','conservative_contingency_usd',.3,'conservative contingency'),('review','decisor_scope_and_financial_authority_verified',False,'exact financial scope')]:
            with self.subTest(field=field),tempfile.TemporaryDirectory() as temporary:
                root=Path(temporary);job,pods,admission,old=self.make(root);directory=job/'review'
                authority_path=directory/'V16-ALLOCATION-AUTHORITY.json';review_path=directory/'V16-ALLOCATION-REVIEW.json'
                path=authority_path if target=='authority' else review_path;data=json.loads(path.read_text());data[field]=value;path.write_text(json.dumps(data))
                review=json.loads(review_path.read_text());review['authority_sha256']=allocation.sha(authority_path);review_path.write_text(json.dumps(review))
                request=root/'requests'/(allocation.DECISOR+'.json');state=json.loads(request.read_text());state['v16_generation_allocation'].update(authority_sha256=allocation.sha(authority_path),independent_review_sha256=allocation.sha(review_path));request.write_text(json.dumps(state))
                with patch.object(pr,'STATE_ROOT',root),patch.object(pr,'PODS_DIR',pods):
                    with self.assertRaisesRegex(ValueError,reason):allocation.FreshAllocation(job,admission,Mock())
