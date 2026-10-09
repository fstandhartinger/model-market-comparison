"""Fixed-order original-budget public supplement and pre-input native proof.
Host is stdlib-only. Public wheels are installed only offline on the owned pod.
"""
import hashlib,json,re,tarfile,tempfile
from pathlib import Path
import measurement_dispatch,pod_runner
ORDER='81e785ad-081b-4592-99df-1c3d709fd6c8'
HERE=Path(__file__).parent
CONTEXT=Path('/home/flori/jobs/fastlane-v16-finish-20261009/workers/ryotide-runtime-recovery/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA='c22c3604a72d242118338dd4c77f5d1c2385ce7edca0d391e17f9779d11092fe'
CODE_SHA='4c9057851cf5edc152b5272d426c7729e751489287c7324d340c0655e3751c56'
FILES={'Dockerfile.runtime-supplement':'a320e0418b2ebb478c7a6a2582f1fa6db547dbca8a6b14fa20d4d04ca0484454','runtime-supplement-requirements.txt':'1bc1deb2579c2e433ab952c755984f420cf2f3ee264cce2ad8a47cd784c6548e','wheels/fla_core-0.5.2-py3-none-any.whl':'5e830c85bad3d0d34677f98ac7074d08687a3756f0f0499d95ceb96eb6920761','wheels/flash_linear_attention-0.5.2-py3-none-any.whl':'dcf405d81f5426393b59037097aa700d0f4a841465d5028d5aa543f4502f2400'}
def sha(path):
 p=Path(path)
 if p.is_symlink()or not p.is_file()or p.stat().st_size>3*1024*1024:raise ValueError('supplement file')
 return hashlib.sha256(p.read_bytes()).hexdigest()
def binding():return {'module_sha256':sha(__file__),'proof_sha256':sha(HERE/'ryotide_native_proof.py'),'metadata_sha256':sha(HERE/'ryotide_supplement_metadata.py'),'context_sha256':CONTEXT_SHA,'context_path':str(CONTEXT)}
def recovery_bounds(job,state,ttl,budget):
 if job is None or Path(job).name!=ORDER or state.get('request_id')!=ORDER or type(state.get('creation_attempts'))is not int or state['creation_attempts']!=1 or state.get('spent_upper_bound_usd')!=15 or state.get('pod_id')is not None or state.get('cleanup_uncertain')is not False or not state.get('torn_down_at')or any(state.get(k)for k in('input_dispatched','execution_started','measurement_completed'))or not 0<ttl<=1 or not 0<budget<=5:raise ValueError('second last original-budget attempt only')

def check_context():
 if sha(CONTEXT)!=CONTEXT_SHA:raise ValueError('supplement context pin')
 with tarfile.open(CONTEXT,'r:')as t:
  members=t.getmembers()
  if len(members)!=4 or {m.name for m in members}!=set(FILES)or any(not m.isfile()or m.size>2*1024*1024 for m in members):raise ValueError('public-only context inventory')
  for m in members:
   if hashlib.sha256(t.extractfile(m).read()).hexdigest()!=FILES[m.name]:raise ValueError('supplement member pin')
def effective_image(job,recipe,report):
 image=report.get('effective_image')
 if Path(job).name!=ORDER or not isinstance(image,str)or not re.fullmatch('sha256:[a-f0-9]{64}',image)or report.get('supplement_binding')!=binding()or report.get('image_identity_matches')is not True or report.get('derived_metadata_accepted')is not True:raise ValueError('unaccepted effective image')
 return image

def build(provider,pod_id,recheck,report):
 check_context();recheck();b=binding()
 root='/runtime-preflight/ryotide-supplement'
 pod_runner._exec(provider,pod_id,['mkdir','-p',root])
 provider.scp_to(pod_id,str(CONTEXT),root+'/context.tar')
 r=pod_runner._exec(provider,pod_id,['sha256sum',root+'/context.tar'])
 if CONTEXT_SHA not in r.stdout.split():raise ValueError('transferred context')
 pod_runner._exec(provider,pod_id,['tar','-xf',root+'/context.tar','-C',root])
 result=pod_runner._exec(provider,pod_id,['docker','build','--network','none','--pull=false','--iidfile',root+'/image.iid','-f',root+'/Dockerfile.runtime-supplement',root],timeout=600)
 report.update(build_stdout=diagnostic_text(result.stdout)['text'],build_stderr=diagnostic_text(result.stderr)['text'])
 image=pod_runner._exec(provider,pod_id,['cat',root+'/image.iid']).stdout.strip()
 if not re.fullmatch('sha256:[a-f0-9]{64}',image):raise ValueError('immutable build identity')
 inventory=pod_runner._exec(provider,pod_id,['docker','image','inspect',image])
 parsed=json.loads(inventory.stdout)
 if not isinstance(parsed,list)or len(parsed)!=1 or parsed[0].get('Id')!=image or parsed[0].get('Os')!='linux'or not isinstance(parsed[0].get('RootFS',{}).get('Layers'),list)or not parsed[0]['RootFS']['Layers']:raise ValueError('derived identity')
 image_metadata={k:parsed[0].get(k)for k in ('Id','Architecture','Os','RootFS','RepoDigests')}
 # Retain identity/layers, never arbitrary image environment credential values.
 gate=HERE/'ryotide_supplement_metadata.py';provider.scp_to(pod_id,str(gate),root+'/metadata.py')
 if b['metadata_sha256']not in pod_runner._exec(provider,pod_id,['sha256sum',root+'/metadata.py']).stdout.split():raise ValueError('metadata transfer')
 r=pod_runner._exec(provider,pod_id,['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp','-v',root+'/metadata.py:/metadata.py:ro','--entrypoint','/usr/bin/env',image,'-i','PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin','OPENAI_API_KEY=','HF_TOKEN=','python3','-I','/metadata.py'])
 m=json.loads(r.stdout)
 from ryotide_supplement_metadata import EXPECTED
 if m.get('failures')!=[]or m.get('kind')!='supplement_metadata_only'or set(m.get('packages',{}))!=set(EXPECTED)or any(m['packages'][n].get('version')!=v for n,v in EXPECTED.items())or any(m.get(k)is not False for k in('customer_source_imported','model_loaded','native_kernels_proven','runtime_admitted')):raise ValueError('exact derived metadata')
 report.update(effective_image=image,supplement_binding=b,derived_metadata_accepted=True,derived_metadata=m,derived_image_inspect=image_metadata,build_stdout=diagnostic_text(result.stdout)['text'],build_stderr=diagnostic_text(result.stderr)['text'])
 recheck();return image

def native_command(image,root):
 """Match the pinned measurement service environment, retaining image CUDA libraries."""
 return ['docker','run','--rm','--gpus','all','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--shm-size','16g','--tmpfs','/tmp:exec,size=16g','-e','HOME=/tmp','-e','OPENAI_API_KEY=','-e','HF_TOKEN=','-v',root+'/code:/code:ro','-v','/models:/models:ro','-v',root+'/proof.py:/proof.py:ro','--entrypoint','/usr/bin/env',image,'PYTHONPATH=/code/src:/code/vendor/jevbench','HF_HUB_OFFLINE=1','TRANSFORMERS_OFFLINE=1','HF_HUB_DISABLE_TELEMETRY=1','TOKENIZERS_PARALLELISM=false','python3','/proof.py']

# Escaped ASCII JSON byte limits match retain(indent=2, ensure_ascii=True).
# Nine inherited/build/success text fields, three fixed command observations and
# bounded parsed payloads leave ample space under the whole 1 MiB receipt budget.
PROOF_TEXT_LIMIT=16*1024
PROOF_PARSED_LIMIT=48*1024
# CUDA profiler emits demangled C++ templates; authentic symbols exceed500.
# Preserve full names within the existing escaped48KiB parsed-proof budget.
PROOF_KERNEL_NAME_LIMIT=4096
RETAINED_TEXT_FIELDS=('gpu_inventory','gpu_inventory_stderr','image_inspect_stdout','image_inspect_stderr','stdout','stderr','build_stdout','build_stderr','native_proof_stderr')
RETAINED_JSON_FIELDS=('metadata','derived_metadata','derived_image_inspect','native_proof')
def redact_text(value):
 text=str(value)
 keys=r'(?:OPENAI_API_KEY|HF_TOKEN|HUGGING_FACE_HUB_TOKEN|AWS_SECRET_ACCESS_KEY|API_KEY|ACCESS_TOKEN|PASSWORD)'
 # Quoted values may contain spaces; blank assignments must not consume -e.
 text=re.sub(r"(?i)([\"']?"+keys+r"[\"']?\s*[=:]\s*)([\"'])(.*?)\2",lambda m:m[1]+m[2]+'[REDACTED]'+m[2],text,flags=re.DOTALL)
 text=re.sub(r"(?i)([\"']?"+keys+r"[\"']?\s*[=:])([^\s,;\"'-][^\s,;\"']*)",r'\1[REDACTED]',text)
 text=re.sub(r"(?i)(authorization\s*[:=]\s*(?:bearer|basic)\s+)[^\s,;\"']+",r'\1[REDACTED]',text)
 text=re.sub(r'\bhf_[A-Za-z0-9]{8,}\b','[REDACTED]',text)
 return text
def serialized_size(value):return len(json.dumps(value,indent=2,ensure_ascii=True).encode('utf-8'))
def diagnostic_text(value):
 text=redact_text(value);original_chars=len(text)
 # Binary search the prefix against escaped bytes, including JSON quotes.
 lo,hi=0,len(text)
 while lo<hi:
  mid=(lo+hi+1)//2
  if serialized_size(text[:mid])<=PROOF_TEXT_LIMIT:lo=mid
  else:hi=mid-1
 return {'text':text[:lo],'truncated':lo<original_chars,'original_chars':original_chars}
def bounded_json(value):
 def redact(v):
  if isinstance(v,dict):
   return {k:'[REDACTED]' if re.fullmatch(r'(?i)OPENAI_API_KEY|HF_TOKEN|HUGGING_FACE_HUB_TOKEN|AWS_SECRET_ACCESS_KEY|API_KEY|ACCESS_TOKEN|PASSWORD|AUTHORIZATION',k) else redact(x) for k,x in v.items()}
  if isinstance(v,list):return [redact(x) for x in v]
  if isinstance(v,str):return redact_text(v)
  return v
 retained=redact(value);size=serialized_size(retained)
 if size<=PROOF_PARSED_LIMIT:return retained
 return {'retained':False,'reason':'parsed_report_size_limit','serialized_bytes':size}
def bound_retained_payloads(report):
 # These are display/diagnostic copies; gate predicates use their original locals.
 for key in RETAINED_TEXT_FIELDS:
  if key in report:report[key]=diagnostic_text(report[key])['text']
 for key in RETAINED_JSON_FIELDS:
  if key in report:report[key]=bounded_json(report[key])
def observed_proof_exec(report,stage,provider,pod_id,command,timeout=600):
 diag=report['native_proof_diagnostics'];diag['stage']=stage
 try:
  result=pod_runner._exec(provider,pod_id,command,timeout=timeout)
 except Exception as error:
  # _exec did not return a result: no invented exit code or transfer observation.
  diag['observations'][stage]={'result_available':False,'exit_code':None,'exception_type':type(error).__name__,'error':diagnostic_text(error)}
  raise
 diag['observations'][stage]={'result_available':True,'exit_code':result.returncode,'stdout':diagnostic_text(result.stdout),'stderr':diagnostic_text(result.stderr)}
 return result
def retain_parsed_proof(report,value):
 # Preserve validation value untouched; bound the retained copy's escaped bytes.
 report['native_proof_diagnostics']['parsed_report']=bounded_json(value)

def prove(provider,pod_id,job,recipe,report,code_tar,recheck):
 bound_retained_payloads(report)
 report['native_proof_diagnostics']={'schema_version':1,'scope':'fixed_firstparty_synthetic_preinput_unscored','stage':'effective_image','actual_code_archive_sha256':hashlib.sha256(code_tar).hexdigest(),'expected_code_archive_sha256':CODE_SHA,'observations':{}}
 diag=report['native_proof_diagnostics']
 try:
  image=effective_image(job,recipe,report);recheck()
  diag['stage']='code_archive_pin'
  if diag['actual_code_archive_sha256']!=CODE_SHA:raise ValueError('exact selected source archive')
  root='/runtime-preflight/ryotide-native';pod_runner._exec(provider,pod_id,['mkdir','-p',root+'/code'])
  diag['stage']='code_transfer'
  with tempfile.NamedTemporaryFile()as f:
   f.write(code_tar);f.flush();provider.scp_to(pod_id,f.name,root+'/code.tar')
  r=observed_proof_exec(report,'code_checksum',provider,pod_id,['sha256sum',root+'/code.tar'])
  if CODE_SHA not in r.stdout.split():raise ValueError('code transfer')
  diag['stage']='code_extract'
  pod_runner._exec(provider,pod_id,['tar','-xf',root+'/code.tar','-C',root+'/code'])
  diag['stage']='proof_transfer'
  proof=HERE/'ryotide_native_proof.py';provider.scp_to(pod_id,str(proof),root+'/proof.py')
  r=observed_proof_exec(report,'proof_checksum',provider,pod_id,['sha256sum',root+'/proof.py'])
  if report['supplement_binding']['proof_sha256']not in r.stdout.split():raise ValueError('proof transfer')
  command=native_command(image,root)
  r=observed_proof_exec(report,'native_process',provider,pod_id,command,timeout=900)
  diag['stage']='native_json_parse';v=json.loads(r.stdout)
  retain_parsed_proof(report,v)
  diag['stage']='native_proof_predicate'
  if not proof_matches(v):raise ValueError('native proof failed')
  report.update(native_proof=v,native_proof_stderr=r.stderr,native_proof_accepted=True,native_code_archive_sha256=CODE_SHA)
  diag['stage']='final_recheck';recheck();diag['stage']='accepted';return report
 except Exception as error:
  diag['exception_type']=type(error).__name__;diag['error']=diagnostic_text(error)
  raise
 finally:
  bound_retained_payloads(report)

def proof_matches(v):
 if not isinstance(v,dict)or set(v.get('optional_backend_versions',{}))!={'flash-qla','tilelang','causal-conv1d','flash-attn'}or any(x is not None and (not isinstance(x,str)or not x)for x in v['optional_backend_versions'].values())or not isinstance(v.get('cuda_kernel_names'),list)or not 1<=len(v['cuda_kernel_names'])<=512 or any(not isinstance(n,str)or not n or len(n)>PROOF_KERNEL_NAME_LIMIT for n in v['cuda_kernel_names']):return False
 if serialized_size(v['cuda_kernel_names'])>PROOF_PARSED_LIMIT:return False
 return isinstance(v,dict)and v.get('schema_version')==1 and v.get('kind')=='ryotide_native_synthetic_preinput'and v.get('model')=='/models/Qwen3.5-9B'and v.get('revision')=='c202236235762e1c871ad0ccb60c8ee5ba337b9a'and str(v.get('engine')).startswith('torch-cuda')and v.get('temperature')==0.667 and v.get('tested_types')==['choice','noul','score']and type(v.get('cuda_kernel_events'))is int and v['cuda_kernel_events']>0 and v.get('input_dispatched')is False and v.get('scored')is False and v.get('http_listener_replaced_for_proof_only')is True and isinstance(v.get('prompt_hash'),str)and re.fullmatch('[a-f0-9]{12}',v['prompt_hash'])is not None
