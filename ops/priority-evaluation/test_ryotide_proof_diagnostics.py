"""Synthetic first-party subprocess stubs only; never execute a model/container."""
import copy,hashlib,json,unittest
from types import SimpleNamespace
from unittest.mock import Mock,patch
import ryotide_runtime_supplement as S
import pod_runner as R
class Tests(unittest.TestCase):
 def run_proof(self,report,reply=None,error=None,checksum=None):
  code=b'PUBLIC_SYNTHETIC_ARCHIVE';cs=hashlib.sha256(code).hexdigest()
  def execute(provider,pod,command,timeout=600):
   if command[0]=='sha256sum':
    text=(checksum or cs) if command[-1].endswith('code.tar') else 'proof-pin'
    return SimpleNamespace(stdout=text+'  synthetic-file\n',stderr='',returncode=0)
   if command[0]=='docker':
    if error:raise error
    return SimpleNamespace(stdout=json.dumps(reply),stderr='synthetic loader diagnostic',returncode=0)
   return SimpleNamespace(stdout='',stderr='',returncode=0)
  with patch.object(S,'CODE_SHA',cs),patch.object(S,'effective_image',return_value='sha256:'+'a'*64),patch.object(R,'_exec',side_effect=execute):
   return S.prove(Mock(),'synthetic-pod','synthetic-job',{},report,code,Mock())
 def report(self):return {'supplement_binding':{'proof_sha256':'proof-pin'}}
 def valid(self):return dict(schema_version=1,kind='ryotide_native_synthetic_preinput',model='/models/Qwen3.5-9B',revision='c202236235762e1c871ad0ccb60c8ee5ba337b9a',engine='torch-cuda',temperature=.667,tested_types=['choice','noul','score'],cuda_kernel_events=42,cuda_kernel_names=['SYNTHETIC_KERNEL'],optional_backend_versions={k:None for k in ('flash-qla','tilelang','causal-conv1d','flash-attn')},input_dispatched=False,scored=False,http_listener_replaced_for_proof_only=True,prompt_hash='a'*12)
 def test_actual_valueerror_predicate_retains_report_before_rejection(self):
  report=self.report();bad=self.valid();bad['cuda_kernel_events']=0
  with self.assertRaisesRegex(ValueError,'native proof failed'):self.run_proof(report,bad)
  d=report['native_proof_diagnostics'];self.assertEqual(d['stage'],'native_proof_predicate');self.assertEqual(d['parsed_report'],bad)
  self.assertEqual(d['observations']['native_process']['exit_code'],0);self.assertIn('synthetic loader',d['observations']['native_process']['stderr']['text']);self.assertNotIn('native_proof_accepted',report)
 def test_transfer_mismatch_retains_actual_observation(self):
  report=self.report()
  with self.assertRaisesRegex(ValueError,'code transfer'):self.run_proof(report,checksum='wrong')
  d=report['native_proof_diagnostics'];self.assertEqual(d['stage'],'code_checksum');self.assertIn('wrong',d['observations']['code_checksum']['stdout']['text']);self.assertNotIn('native_process',d['observations'])
 def test_remote_error_exit_unknown_not_invented(self):
  report=self.report()
  with self.assertRaises(R.PodRunError):self.run_proof(report,error=R.PodRunError('bounded remote failure'))
  v=report['native_proof_diagnostics']['observations']['native_process'];self.assertFalse(v['result_available']);self.assertIsNone(v['exit_code']);self.assertEqual(v['exception_type'],'PodRunError');self.assertIn('bounded remote failure',v['error']['text'])
 def test_archive_mismatch_records_hash_before_any_provider(self):
  p=Mock();r=self.report()
  with patch.object(S,'effective_image',return_value='synthetic'):
   with self.assertRaisesRegex(ValueError,'exact selected source archive'):S.prove(p,'pod','job',{},r,b'BAD',Mock())
  self.assertEqual(r['native_proof_diagnostics']['actual_code_archive_sha256'],hashlib.sha256(b'BAD').hexdigest());p.scp_to.assert_not_called();p.exec.assert_not_called()
 def test_success_keeps_unchanged_predicate_and_acceptance(self):
  r=self.report();v=self.valid();self.run_proof(r,v);self.assertTrue(r['native_proof_accepted']);self.assertEqual(r['native_proof'],v);self.assertEqual(r['native_proof_diagnostics']['stage'],'accepted')
 def test_bounded_error_and_output_no_credential_assignment(self):
  r=self.report();huge='x'*(2*1024*1024)
  d=S.diagnostic_text('OPENAI_API_KEY=synthetic-secret '+huge)
  self.assertNotIn('synthetic-secret',d['text']);self.assertTrue(d['truncated']);self.assertLessEqual(len(d['text']),S.PROOF_TEXT_LIMIT)
  target={'native_proof_diagnostics':{}}
  S.retain_parsed_proof(target,{'oversize':huge})
  self.assertFalse(target['native_proof_diagnostics']['parsed_report']['retained'])
  self.assertNotIn('synthetic-secret',S.diagnostic_text('{"HF_TOKEN":"synthetic-secret"}')['text'])
 def test_parsed_credential_redaction_keeps_validation_value_unmodified(self):
  value={'HF_TOKEN':'synthetic-secret','nested':{'password':42},'native_field':1}
  original=copy.deepcopy(value);report={'native_proof_diagnostics':{}}
  S.retain_parsed_proof(report,value)
  self.assertEqual(value,original)
  self.assertEqual(report['native_proof_diagnostics']['parsed_report'],{'HF_TOKEN':'[REDACTED]','nested':{'password':'[REDACTED]'},'native_field':1})
 def test_huge_rejected_proof_keeps_total_diagnostics_under_one_mib(self):
  r=self.report()
  with self.assertRaises(ValueError):self.run_proof(r,{'synthetic':'x'*(2*1024*1024)})
  d=r['native_proof_diagnostics'];self.assertFalse(d['parsed_report']['retained']);self.assertLess(len(json.dumps(d).encode()),1024*1024);self.assertNotIn('native_proof_accepted',r)
if __name__=='__main__':unittest.main()
