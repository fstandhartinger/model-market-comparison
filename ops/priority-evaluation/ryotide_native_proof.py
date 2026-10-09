"""Pod-only first-party synthetic native proof; NEVER execute on the host.
Runs the frozen server CLI/parser/loader/warm-up. Only the HTTP listener is
replaced for this unscored proof, with a bounded direct native Engine runner.
Measurement still uses the unchanged real HTTP service.
"""
import contextlib,json,math,sys,importlib.metadata

def verify_answer(result,qtype):
 a=result.get('answers',{}).get('decision',{})
 if result.get('model')!='/models/Qwen3.5-9B'or a.get('type')!=qtype:raise ValueError('native answer')
 u=result.get('usage',{})
 if type(u.get('input_tokens'))is not int or u['input_tokens']<=0 or u.get('output_tokens')!=0:raise ValueError('native usage')
 if qtype=='noul':
  if isinstance(a.get('noul'),bool)or not isinstance(a.get('noul'),(float,int))or not math.isfinite(a['noul'])or not 0<=a['noul']<=1:raise ValueError('native Noul')
 else:
  p=a.get('probabilities');keys={'A','B'}if qtype=='choice'else{'0','1'}
  if not isinstance(p,dict)or set(p)!=keys or any(isinstance(v,bool)or not isinstance(v,(float,int))or not math.isfinite(v)or not 0<=v<=1 for v in p.values())or abs(sum(p.values())-1)>1e-5:raise ValueError('native distribution')
 return True

def main():
 import torch
 import ryotide.server as server
 if not torch.cuda.is_available():raise ValueError('CUDA absent')
 report={}
 class ProofServer:
  def __init__(self,address,engine):self.engine=engine
  def serve_forever(self):
   e=self.engine;h=e.health()
   if h.get('model')!='/models/Qwen3.5-9B'or h.get('revision')!='c202236235762e1c871ad0ccb60c8ee5ba337b9a'or not str(h.get('engine')).startswith('torch-cuda')or h.get('weights',{}).get('offloaded_to_cpu')or h['config']['temperature']!=0.667:raise ValueError('native loader identity')
   with torch.profiler.profile(activities=[torch.profiler.ProfilerActivity.CPU,torch.profiler.ProfilerActivity.CUDA])as prof:
    for t in ('choice','noul','score'):
     q={'type':t,'instructions':'Operator synthetic pre-input runtime check: select the matching option.'}
     if t=='choice':q['criteria']={'A':'alpha','B':'beta'}
     elif t=='score':q['criteria']=['low','high']
     verify_answer(e.decide({'state':'Operator synthetic value: alpha.','questions':{'decision':q}}),t)
    torch.cuda.synchronize()
   events=[event for event in prof.events()if event.device_type==torch.autograd.DeviceType.CUDA]
   n=len(events)
   names=sorted({event.name for event in events})
   optional={}
   for package in ('flash-qla','tilelang','causal-conv1d','flash-attn'):
    try:optional[package]=importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:optional[package]=None
   if n<1:raise ValueError('actual CUDA kernels absent')
   report.update(schema_version=1,kind='ryotide_native_synthetic_preinput',model=h['model'],revision=h['revision'],engine=h['engine'],prompt_hash=h['prompt_hash'],temperature=h['config']['temperature'],tested_types=['choice','noul','score'],cuda_kernel_events=n,cuda_kernel_names=names,optional_backend_versions=optional,input_dispatched=False,scored=False,http_listener_replaced_for_proof_only=True)
 # No model/adapter monkeypatch: only capture the engine passed to the listener.
 original_handler,original_server=server.make_handler,server.ThreadingHTTPServer
 server.make_handler=lambda engine:engine;server.ThreadingHTTPServer=ProofServer
 sys.argv=['ryotide.server','--preset','ryotide-qwen9','--model','/models/Qwen3.5-9B','--device','cuda','--host','127.0.0.1','--port','8778']
 try:
  with contextlib.redirect_stdout(sys.stderr):server.main()
 finally:server.make_handler,server.ThreadingHTTPServer=original_handler,original_server
 print(json.dumps(report,sort_keys=True))
if __name__=='__main__':main()
