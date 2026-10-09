"""Pure synthetic first-party tests; no wheels/customer code/container execution."""
import copy,json,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
import ryotide_runtime_supplement as S
import ryotide_native_proof as proof
import ryotide_runtime_preflight as P
import pod_runner as R
from test_ryotide_runtime_preflight import Tests as Fixtures
class Tests(unittest.TestCase):
 def report(self):return dict(effective_image='sha256:'+'a'*64,supplement_binding=S.binding(),image_identity_matches=True,derived_metadata_accepted=True)
 def state(self):return dict(request_id=S.ORDER,creation_attempts=1,spent_upper_bound_usd=15,pod_id=None,cleanup_uncertain=False,torn_down_at='original-first-teardown',input_dispatched=False,execution_started=False,measurement_completed=False)
 def test_exact_original_recovery_bounds(self):
  S.recovery_bounds('/job/'+S.ORDER,self.state(),1,5)
  for k,v in [('creation_attempts',0),('creation_attempts',2),('spent_upper_bound_usd',0),('spent_upper_bound_usd',20),('cleanup_uncertain',True),('input_dispatched',True),('pod_id','another')]:
   s=self.state();s[k]=v
   with self.assertRaises(ValueError):S.recovery_bounds('/job/'+S.ORDER,s,1,5)
  for ttl,b in [(1.01,5),(1,5.01),(0,5)]:
   with self.assertRaises(ValueError):S.recovery_bounds('/job/'+S.ORDER,self.state(),ttl,b)
 def test_effective_image_fail_closed(self):
  r=self.report();self.assertEqual(S.effective_image('/job/'+S.ORDER,{},r),r['effective_image'])
  for key,value in [('effective_image','mutable:tag'),('supplement_binding',{}),('derived_metadata_accepted',False),('image_identity_matches',False)]:
   x=dict(r);x[key]=value
   with self.assertRaises(ValueError):S.effective_image('/job/'+S.ORDER,{},x)
  with self.assertRaises(ValueError):S.effective_image('/other',{},r)
 def test_native_proof_requires_real_kernel_and_all_types(self):
  v=dict(schema_version=1,kind='ryotide_native_synthetic_preinput',model='/models/Qwen3.5-9B',revision='c202236235762e1c871ad0ccb60c8ee5ba337b9a',engine='torch-cuda',temperature=.667,tested_types=['choice','noul','score'],cuda_kernel_events=42,cuda_kernel_names=['PUBLIC_SYNTHETIC_KERNEL'],optional_backend_versions={k:None for k in ('flash-qla','tilelang','causal-conv1d','flash-attn')},input_dispatched=False,scored=False,http_listener_replaced_for_proof_only=True,prompt_hash='a'*12)
  self.assertTrue(S.proof_matches(v))
  for k,x in [('cuda_kernel_events',0),('cuda_kernel_events',True),('tested_types',['choice']),('model','remote'),('engine','torch-cpu'),('input_dispatched',True),('temperature',1)]:
   bad=dict(v);bad[k]=x;self.assertFalse(S.proof_matches(bad))
 def test_no_foreign_import_in_host_modules(self):
  import ast
  tree=ast.parse(Path(S.__file__).read_text())
  names={n.names[0].name for n in ast.walk(tree)if isinstance(n,ast.Import)}
  self.assertFalse(names&{'torch','fla','ryotide','transformers'})
 def test_native_response_malformed_fails(self):
  good=dict(model='/models/Qwen3.5-9B',answers={'decision':{'type':'choice','probabilities':{'A':.4,'B':.6}}},usage={'input_tokens':10,'output_tokens':0})
  self.assertTrue(proof.verify_answer(good,'choice'))
  good['answers']['decision']['probabilities']['A']=float('nan')
  with self.assertRaises(ValueError):proof.verify_answer(good,'choice')
 def test_native_argv_preserves_image_cuda_environment_and_pinned_service_env(self):
  cmd=S.native_command('sha256:'+'a'*64,'/runtime-preflight/ryotide-native')
  self.assertNotIn('-i',cmd);self.assertFalse(any(x.startswith('PATH=')for x in cmd))
  self.assertIn('OPENAI_API_KEY=',cmd);self.assertIn('HF_TOKEN=',cmd);self.assertIn('--read-only',cmd)
  self.assertEqual(cmd[cmd.index('--network')+1],'none')
  tail=cmd[cmd.index('--entrypoint')+3:]
  self.assertEqual(tail[:5],['PYTHONPATH=/code/src:/code/vendor/jevbench','HF_HUB_OFFLINE=1','TRANSFORMERS_OFFLINE=1','HF_HUB_DISABLE_TELEMETRY=1','TOKENIZERS_PARALLELISM=false'])
 def test_bad_code_archive_before_any_transfer(self):
  provider=Mock()
  with self.assertRaises(ValueError):S.prove(provider,'pod','/job/'+S.ORDER,{},self.report(),b'UNREVIEWED',Mock())
  provider.scp_to.assert_not_called();provider.exec.assert_not_called()
 def test_fixed_callback_supplement_pin_and_drift(self):
  with tempfile.TemporaryDirectory()as t:
   root=Path(t);job,r,a=Fixtures().setup(root);a['runtime_preflight']['supplement']=S.binding()
   with patch.object(S,'check_context'):
    cb=P.callback(job,a,r,Mock(),root/'output')
    self.assertTrue(cb.supplemented);self.assertTrue(callable(cb.after_weights))
    a['runtime_preflight']['supplement']['proof_sha256']='wrong'
    provider=Mock()
    with self.assertRaises(ValueError):cb(provider,'pod')
    provider.exec.assert_not_called()
 def test_native_failure_keeps_input_untransferred(self):
  provider=SimpleNamespace(preflight=lambda*a:None,reserve=lambda*a:'r',create=lambda*a:{'pod_id':'synthetic','hourly_usd':1},attach=lambda*a:None,scp_to=Mock())
  cb=Mock(return_value=self.report());cb.supplemented=False;cb.after_weights.side_effect=ValueError('synthetic native failure')
  commands=[]
  def execute(*a,**k):commands.append(a[2]);return SimpleNamespace(stdout='sha256:abc')
  with tempfile.TemporaryDirectory()as t:
   root=Path(t);out=root/'out';out.mkdir();state={};recipe=dict(kind='http_typesafe',image='upstream@sha256:abc',weights=[])
   with patch.object(R,'_exec',side_effect=execute),patch.object(R,'_teardown'):
    with self.assertRaises(ValueError):R._lifecycle(provider,'job',recipe,root/'stage',out,state,('L4',24),.5,2.5,None,lambda:None,runtime_preflight=cb,job_dir=Path('/job/'+S.ORDER),native_code_archive=b'PUBLIC_SYNTHETIC')
   self.assertFalse(state['input_dispatched']);self.assertFalse(state['execution_started']);provider.scp_to.assert_not_called()
if __name__=='__main__':unittest.main()
