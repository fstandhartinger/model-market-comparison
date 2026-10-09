"""Synthetic first-party boundaries; no model/customer/container execution."""
import copy,json,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
import decisor_native_preinput as N
import decisor_native_proof as proof
import decisor_runtime_preflight as P
import pod_runner as R
import measurement_dispatch
from test_decisor_runtime_preflight import Tests as Fixtures
class Tests(unittest.TestCase):
 def setup(self,root):
  job,r,a=Fixtures().setup(root);provider,_=Fixtures().provider();cb=P.callback(job,a,r,Mock(),root/'out');return job,r,cb,cb(provider,'owned-pod')
 def proof(self,e,r):return dict(schema_version=1,kind='decisor_native_synthetic_preinput',identity=e,model='decisor-4b',revision=r['weights'][0]['revision'],checkpoint_sha256=r['weights'][0]['sha256'],unchanged_service_argv=[s['argv']for s in r['services']],tested_types=['choice','noul','score'],results=[dict(type=t,response_sha256='a'*64,schema_and_probabilities_accepted=True,cuda_kernel_events=2,cuda_kernel_names=['synthetic_kernel'],trace_sha256={'fresh.trace.json.gz':'b'*64})for t in ['choice','noul','score']],input_dispatched=False,scored=False,inference_requests=3)
 def test_cpu_runtime_not_cuda(self):
  for e in [dict(cat='cuda_runtime',name='cudaLaunchKernel',dur=1,args={'device':0}),dict(cat='cpu_op',name='aten',dur=2,args={'device':0}),dict(cat='kernel',name='kernel',dur=0,args={'device':0}),dict(cat='kernel',name='kernel',dur=1,args={'device':True})]:
   with self.assertRaises(ValueError):proof.kernel_summary([e])
  self.assertEqual(proof.kernel_summary([dict(cat='kernel',name='synthetic',dur=1.5,args={'device':0})])['cuda_kernel_events'],1)
 def test_response_normalized_and_usage(self):
  for t in ['choice','noul','score']:
   a={'type':t,'noul':.6}if t=='noul'else{'type':t,'probabilities':{'A':.3,'B':.7}if t=='choice'else{'0':.2,'1':.3,'2':.5},'choice'if t=='choice'else'score':'B'if t=='choice'else 2}
   v=dict(model='decisor-4b',answers={'decision':a},usage={'prompt_tokens':14,'completion_tokens':1});self.assertTrue(proof.verify_answer(v,t))
   bad=copy.deepcopy(v);bad['usage']['prompt_tokens']=True
   with self.assertRaises(ValueError):proof.verify_answer(bad,t)
   bad=copy.deepcopy(v)
   if t=='noul':bad['answers']['decision']['noul']=float('nan')
   else:bad['answers']['decision']['probabilities'][next(iter(a['probabilities']))]=.9
   with self.assertRaises(ValueError):proof.verify_answer(bad,t)
 def test_exact_proof_identity_checkpoint_all_types(self):
  with tempfile.TemporaryDirectory()as t:
   job,r,cb,report=self.setup(Path(t));e=N.identity(job,'owned-pod',r,report);v=self.proof(e,r);self.assertTrue(N.proof_matches(v,e,r))
   for k,x in [('identity',dict(e,pod_id='foreign')),('checkpoint_sha256',{}),('tested_types',['choice']),('inference_requests',4),('input_dispatched',True),('scored',True),('unchanged_service_argv',[])]:
    bad=copy.deepcopy(v);bad[k]=x;self.assertFalse(N.proof_matches(bad,e,r))
   for k,x in [('cuda_kernel_events',0),('cuda_kernel_events',True),('cuda_kernel_names',[]),('schema_and_probabilities_accepted',False),('trace_sha256',{})]:
    bad=copy.deepcopy(v);bad['results'][1][k]=x;self.assertFalse(N.proof_matches(bad,e,r))
   report.update(native_proof=v,native_proof_accepted=True,native_proof_exit_code=0);self.assertTrue(N.accepted(job,'owned-pod',r,report))
   with self.assertRaises(ValueError):N.accepted(job,'foreign',r,report)
 def test_bad_archive_before_transfer(self):
  with tempfile.TemporaryDirectory()as t:
   job,r,cb,report=self.setup(Path(t));p=Mock()
   with self.assertRaises(ValueError):N.prove(p,'owned-pod',job,r,report,b'NOT_SOURCE',Mock())
   p.exec.assert_not_called();p.scp_to.assert_not_called()
 def test_failed_native_claim_receipt_no_retry(self):
  with tempfile.TemporaryDirectory()as t:
   job,r,cb,report=self.setup(Path(t));p=Mock()
   with patch.object(N,'prove',side_effect=ValueError('synthetic mismatch'))as prove:
    with self.assertRaises(ValueError):cb.after_weights(p,'owned-pod',report,b'notexecuted')
    self.assertEqual(prove.call_count,1)
    with self.assertRaises(measurement_dispatch.OperationalHold):cb.after_weights(p,'owned-pod',report,b'notexecuted')
    self.assertEqual(prove.call_count,1)
   files=list((Path(t)/'out').glob('*-native.json'));self.assertEqual(len(files),1);saved=json.loads(files[0].read_text());self.assertEqual(saved['native_collection_error_type'],'ValueError');self.assertNotIn('native_proof_accepted',saved);self.assertEqual(files[0].stat().st_mode&0o777,0o600)
 def lifecycle(self,cb,err=None,job=N.ORDER):
  if isinstance(cb,Mock):cb.supplemented=False
  p=SimpleNamespace(preflight=lambda*a:None,reserve=lambda*a:'r',create=lambda*a:{'pod_id':'synthetic','hourly_usd':1},attach=lambda*a:None,scp_to=Mock());s={'request_id':job};calls=[];archive=b'SOURCE_SYNTHETIC'
  def execute(*a,**k):calls.append(a[2]);return SimpleNamespace(stdout='sha256:abc')
  with tempfile.TemporaryDirectory()as t:
   root=Path(t);out=root/'out';out.mkdir();r={'kind':'http_typesafe','image':'upstream@sha256:abc','weights':[]}
   with patch.object(R,'_exec',side_effect=execute),patch.object(R,'_teardown'),patch.object(N,'accepted',side_effect=err):
    with self.assertRaises(Exception):R._lifecycle(p,job,r,root/'stage',out,s,('L4',24),.5,2.5,None,lambda:None,runtime_preflight=cb,native_code_archive=archive)
  return s,p,calls,archive
 def test_literal_lifecycle_gate_before_protected(self):
  cb=Mock(return_value={'pod_id':'synthetic'});cb.after_weights=Mock(side_effect=ValueError('native failed'));s,p,calls,b=self.lifecycle(cb);cb.after_weights.assert_called_once();self.assertEqual(cb.after_weights.call_args.args[-1],b);p.scp_to.assert_not_called();self.assertFalse(s['input_dispatched']);self.assertFalse(s['execution_started']);self.assertFalse(any('/work'in c for c in calls))
  s,p,_,_=self.lifecycle(lambda*a:{});p.scp_to.assert_not_called();self.assertFalse(s['input_dispatched'])
  cb=Mock(return_value={});cb.after_weights=Mock(return_value={'native_proof_accepted':True});s,p,_,_=self.lifecycle(cb,ValueError('forged proof'));p.scp_to.assert_not_called();self.assertFalse(s['input_dispatched'])
 def test_other_order_unchanged(self):
  cb=Mock(return_value={});cb.after_weights=Mock(side_effect=AssertionError('not run'));s,p,_,_=self.lifecycle(cb,job='another-order');cb.after_weights.assert_not_called();p.scp_to.assert_called_once();self.assertTrue(s['input_dispatched'])
 def test_profile_primary_plaintext_control_endpoints(self):
  response=Mock();response.__enter__=Mock(return_value=response);response.__exit__=Mock(return_value=False);response.read.return_value=b'Start profiling.\n'
  with patch.object(proof.urllib.request,'urlopen',return_value=response):
   self.assertIsNone(proof.request('http://127.0.0.1:30000/start_profile',{},expect_json=False))
   with self.assertRaises(ValueError):proof.request('http://127.0.0.1:30000/start_profile',{})
 def test_installed_modules(self):
  s=(Path(R.__file__).parent/'install-autopickup.sh').read_text()
  for n in ['decisor_native_preinput.py','decisor_native_proof.py','ryotide_runtime_supplement.py']:self.assertIn(n,s)
if __name__=='__main__':unittest.main()
