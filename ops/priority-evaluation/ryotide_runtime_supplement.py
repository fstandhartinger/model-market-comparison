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
 report.update(build_stdout=result.stdout,build_stderr=result.stderr)
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
 report.update(effective_image=image,supplement_binding=b,derived_metadata_accepted=True,derived_metadata=m,derived_image_inspect=image_metadata,build_stdout=result.stdout,build_stderr=result.stderr)
 recheck();return image

def prove(provider,pod_id,job,recipe,report,code_tar,recheck):
 image=effective_image(job,recipe,report);recheck()
 if hashlib.sha256(code_tar).hexdigest()!=CODE_SHA:raise ValueError('exact selected source archive')
 root='/runtime-preflight/ryotide-native';pod_runner._exec(provider,pod_id,['mkdir','-p',root+'/code'])
 with tempfile.NamedTemporaryFile()as f:
  f.write(code_tar);f.flush();provider.scp_to(pod_id,f.name,root+'/code.tar')
 if CODE_SHA not in pod_runner._exec(provider,pod_id,['sha256sum',root+'/code.tar']).stdout.split():raise ValueError('code transfer')
 pod_runner._exec(provider,pod_id,['tar','-xf',root+'/code.tar','-C',root+'/code'])
 proof=HERE/'ryotide_native_proof.py';provider.scp_to(pod_id,str(proof),root+'/proof.py')
 if report['supplement_binding']['proof_sha256']not in pod_runner._exec(provider,pod_id,['sha256sum',root+'/proof.py']).stdout.split():raise ValueError('proof transfer')
 command=['docker','run','--rm','--gpus','all','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--shm-size','16g','--tmpfs','/tmp:exec,size=16g','-v',root+'/code:/code:ro','-v','/models:/models:ro','-v',root+'/proof.py:/proof.py:ro','--entrypoint','/usr/bin/env',image,'-i','PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin','HOME=/tmp','OPENAI_API_KEY=','HF_TOKEN=','PYTHONPATH=/code/src:/code/vendor/jevbench','HF_HUB_OFFLINE=1','TRANSFORMERS_OFFLINE=1','HF_HUB_DISABLE_TELEMETRY=1','TOKENIZERS_PARALLELISM=false','python3','/proof.py']
 r=pod_runner._exec(provider,pod_id,command,timeout=900);v=json.loads(r.stdout)
 if not proof_matches(v):raise ValueError('native proof failed')
 report.update(native_proof=v,native_proof_stderr=r.stderr,native_proof_accepted=True,native_code_archive_sha256=CODE_SHA)
 recheck();return report

def proof_matches(v):
 if not isinstance(v,dict)or set(v.get('optional_backend_versions',{}))!={'flash-qla','tilelang','causal-conv1d','flash-attn'}or any(x is not None and (not isinstance(x,str)or not x)for x in v['optional_backend_versions'].values())or not isinstance(v.get('cuda_kernel_names'),list)or not 1<=len(v['cuda_kernel_names'])<=512 or any(not isinstance(n,str)or not n or len(n)>500 for n in v['cuda_kernel_names']):return False
 return isinstance(v,dict)and v.get('schema_version')==1 and v.get('kind')=='ryotide_native_synthetic_preinput'and v.get('model')=='/models/Qwen3.5-9B'and v.get('revision')=='c202236235762e1c871ad0ccb60c8ee5ba337b9a'and str(v.get('engine')).startswith('torch-cuda')and v.get('temperature')==0.667 and v.get('tested_types')==['choice','noul','score']and type(v.get('cuda_kernel_events'))is int and v['cuda_kernel_events']>0 and v.get('input_dispatched')is False and v.get('scored')is False and v.get('http_listener_replaced_for_proof_only')is True and isinstance(v.get('prompt_hash'),str)and re.fullmatch('[a-f0-9]{12}',v['prompt_hash'])is not None
