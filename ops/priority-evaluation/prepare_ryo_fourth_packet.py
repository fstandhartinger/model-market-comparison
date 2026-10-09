"""SOURCE-only final metadata authoring. No runtime imports or operational effects.
Input refs distinguish bytes under review from eventual canonical destination.
Never writes an authority, review verdict, live file, state or ledger.
"""
import argparse, ast, hashlib, json, os, re, shlex
from pathlib import Path
ROOT = Path('/home/flori/jobs/fastlane-v16-finish-20261009/proposals/native-small-topup-ryo-fourth-preparation')
RUNTIME = Path('/home/flori/.local/share/priority-evaluation/runtime')
STATE = Path('/home/flori/.local/state/fastlane-autopickup')
JOBS = Path('/home/flori/jobs/fastlane-evaluations')
RYO = '81e785ad-081b-4592-99df-1c3d709fd6c8'
DECISOR = '3687485f-5a51-4964-bd9a-73973f3494d7'
BOUNDS = {RYO: (3,25,4,30)}
GENERATION = 'native-v16-paid-20261009'
SCOPE = 'exact-ryo-native-preinput-fourth-small-topup-one-use'
REFS = {'profile_admission','profile_review','gate','standing_decision','original_history','controller','v16_profiles','pod_runner','operator','source_freeze','recipe'}
LATE_NAMES = {'controller','late_completion','v16_profiles','profile_admission','profile_review','source_pins'}
def sha(b): return hashlib.sha256(b).hexdigest()
def data(p):
 p=Path(p)
 if not p.is_absolute() or any(q.is_symlink() for q in (p,*p.parents)) or not p.is_file(): raise ValueError('absolute regular unsymlinked evidence required')
 if '/jevbench-sealed/' in str(p): raise ValueError('protected input access prohibited')
 return p.read_bytes()
def read(p): return json.loads(data(p))
def checked(ref):
 if set(ref)!={'path','sha256'} or not re.fullmatch('[0-9a-f]{64}',ref['sha256']) or sha(data(ref['path']))!=ref['sha256']: raise ValueError('exact authentic evidence hash required')
 return ref

def execstart_binding(raw):
 """Stable single-command systemd binding; execution status is not argv."""
 text=raw.strip()
 if not text.startswith('{') or not text.endswith('}') or text.count('{')!=1 or text.count('}')!=1:raise ValueError('exact single ExecStart unavailable')
 fields={}
 for cell in text[1:-1].split(';'):
  if '=' not in cell:raise ValueError('malformed ExecStart field')
  key,value=cell.strip().split('=',1)
  if key in fields:raise ValueError('duplicate ExecStart field')
  fields[key]=value.strip()
 if set(fields)!={'path','argv[]','ignore_errors','start_time','stop_time','pid','code','status'} or fields['ignore_errors'] not in ('yes','no'):raise ValueError('unexpected ExecStart shape')
 try:argv=shlex.split(fields['argv[]'])
 except ValueError as exc:raise ValueError('malformed ExecStart argv') from exc
 path=fields['path']
 if not path.startswith('/') or any(c.isspace()for c in path) or not argv or argv[0]!=path:raise ValueError('exact executable/argv identity required')
 return {'path':path,'argv':argv,'ignore_errors':fields['ignore_errors']=='yes'}

def execstart_sha256(raw):
 return hashlib.sha256(json.dumps(execstart_binding(raw),sort_keys=True,separators=(',',':'),ensure_ascii=True).encode('utf-8')).hexdigest()

def check_execstart_source(path):
 actual=ast.parse(data(path));own=ast.parse(Path(__file__).read_text())
 def functions(tree):return {n.name:ast.dump(n,include_attributes=False)for n in tree.body if isinstance(n,ast.FunctionDef)}
 installed,copied=functions(actual),functions(own)
 for name in ('execstart_binding','execstart_sha256'):
  if installed.get(name)!=copied[name]:raise ValueError('actual installed stable ExecStart algorithm differs')

def build(spec):
 """Pure metadata in/out except read-only explicit public/source evidence files."""
 rid=spec['order_id']
 if rid!=RYO:raise ValueError('RYO fourth exact order only')
 oldn,oldspent,maxn,maxspent=BOUNDS[rid];job=JOBS/rid
 if spec['generation']!=GENERATION or not re.fullmatch('[0-9a-f]{40}',spec['merged_revision']):raise ValueError('actual merged revision required')
 for name in ('state','ledger','row','full_sql_row','execstart','installation','cache_freeze'):
  checked(spec[name])
 state=read(spec['state']['path']);ledger=read(spec['ledger']['path']);row=read(spec['row']['path'])
 if state.get('id')!=rid or state.get('scoped_native_topup_ryo_fourth')is not None or not isinstance(state.get('operational_hold'),dict) or state['operational_hold'].get('transient')is not False or state['operational_hold'].get('reason')!='scoped_native_topup_reconciliation_required':raise ValueError('exact existing permanent held state required')
 if ledger.get('request_id')!=rid or type(ledger.get('creation_attempts'))is not int or ledger['creation_attempts']!=oldn or ledger.get('spent_upper_bound_usd')!=oldspent or ledger.get('pod_id')is not None or ledger.get('cleanup_uncertain')is not False or not ledger.get('torn_down_at') or any(ledger.get(k)for k in ('input_dispatched','execution_started','measurement_completed','scored_dispatch_uncertain')):raise ValueError('original consumed financial history required')
 if row.get('id')!=rid or row.get('evaluation_status')!='pending' or row.get('stripe_mode')!='live' or row.get('synthetic_test')is not False or row.get('pickup_job_dir')!=str(job) or row.get('status')not in ('paid','review_passed') or not row.get('paid_at') or any(row.get(k)is not None for k in ('refund_id','refunded_at','customer_hold_started_at','customer_hold_reason')):raise ValueError('whole current original paid pending row required')
 if row.get('result_delivered_at')is not None:raise ValueError('RYO original undelivered row required')
 if set(spec['references'])!=REFS:raise ValueError('complete final reference set required')
 refs={};provenance={}
 for name,value in spec['references'].items():
  if set(value)!={'bytes','target'}:raise ValueError('explicit final bytes and canonical target required')
  checked(value['bytes']);target=Path(value['target'])
  if not target.is_absolute() or '..'in target.parts:raise ValueError('absolute final target required')
  refs[name]={'path':str(target),'sha256':value['bytes']['sha256']};provenance[name]=value['bytes']
 for n,filename in [('controller','autopickup.py'),('v16_profiles','v16_profiles.py'),('pod_runner','pod_runner.py'),('gate','scoped_native_topup.py'),('operator','scoped_native_topup_operator.py')]:
  if refs[n]['path']!=str(RUNTIME/filename) or provenance[n]['path']!=str(RUNTIME/filename):raise ValueError('actual installed source only')
 check_execstart_source(provenance['operator']['path'])
 if refs['recipe']['path']!=str(job/'trusted-runner/POD-RECIPE.json') or refs['profile_admission']['path']!=str(job/'review/V16-PROFILE-ADMISSION.json') or refs['profile_review']['path']!=str(job/'review/V16-PROFILE-REVIEW.json'):raise ValueError('canonical original order metadata paths required')
 admission=read(provenance['profile_admission']['path'])
 if admission.get('order_id')!=rid or admission.get('generation')!=GENERATION or admission.get('recipe_sha256')!=refs['recipe']['sha256']:raise ValueError('original source recipe/generation admission differs')
 peer=read(provenance['profile_review']['path'])
 if peer.get('verdict')!='ACCEPTED' or peer.get('reviewer_engine')!='claude' or peer.get('admission_sha256')!=refs['profile_admission']['sha256']:raise ValueError('genuine final admission peer required; never generated')
 frozen=read(provenance['source_freeze']['path']);files=frozen['files']
 if sha(data(RUNTIME/'ryotide_runtime_supplement.py'))!='67f05404632a16787e70a5b89a0ac39d754494256b8516889700a68251cde066':raise ValueError('exact reviewed CUDA symbol grammar source required')
 actual={str(q):sha(data(q)) for q in RUNTIME.rglob('*') if q.is_file()}
 if any(q.is_symlink()for q in RUNTIME.rglob('*')) or files!=actual:raise ValueError('whole actual runtime/cache membership and bytes required')
 cache=read(spec['cache_freeze']['path'])
 if cache.get('files')!=files:raise ValueError('source/cache freeze must describe same complete runtime')
 history=read(provenance['original_history']['path'])
 if not history.get('files'):raise ValueError('complete original history required')
 for path,digest in history['files'].items():checked({'path':path,'sha256':digest})
 for ref in (spec['state'],spec['ledger'],spec['row'],spec['full_sql_row'],spec['execstart']):
  if history['files'].get(ref['path'])!=ref['sha256']:raise ValueError('whole current snapshots must be retained in history')
 argv=read(spec['execstart']['path'])
 # Preserve complete raw capture and hash; PLAN uses only stable path/argv/errors.
 raw=argv['execstart_utf8'];rawsha=argv['execstart_raw_sha256']
 if not isinstance(raw,str)or sha(raw.encode())!=rawsha:raise ValueError('authentic full original argv receipt required')
 stable_sha=execstart_sha256(raw)
 plan={'schema_version':1,'SOURCE_ONLY_PROSPECTIVE_NOT_INSTALLABLE':False,'scope':SCOPE,'order_id':rid,'generation':GENERATION,'bounds':dict(zip(('old_creation_attempts','old_spend_usd','maximum_lifetime_allocations','maximum_lifetime_usd'),BOUNDS[rid])),'max_new_usd':5,'max_ttl_hours':1,'selected_gpu':'RTX6000' if rid==RYO else 'H100','original_state_sha256':spec['state']['sha256'],'original_ledger_sha256':spec['ledger']['sha256'],'original_execstart_sha256':stable_sha,'references':refs}
 plan['previous_topup']=spec['previous_topup'];plan['full_sql_row']=spec['full_sql_row']
 # Validate old custody using pure first-party function AST; never import runtime.
 tree=ast.parse(data(provenance['gate']['path']))
 funcs=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='previous_failure']
 if len(funcs)!=1:raise ValueError('actual first-party previous failure validator required')
 namespace={'Path':Path,'sha':lambda p:sha(data(p)),'read':read,'RYO':RYO,'SCOPE':'exact-native-preinput-small-topup-one-use','BOUNDS':{RYO:(2,20.,3,25.)}}
 exec(compile(ast.Module(body=funcs,type_ignores=[]),'<firstparty previous custody validator>','exec'),namespace)
 namespace['previous_failure'](job,state,plan)
 if read(spec['full_sql_row']['path']).get('id')!=RYO:raise ValueError('whole SQL exact identity required')
 claim={'order_id':rid,'generation':GENERATION,'plan_sha256':sha(encode(plan)),'original_state_sha256':spec['state']['sha256'],'original_ledger_sha256':spec['ledger']['sha256']}
 return {'plan':plan,'ROOT-AUTHORITY-INPUT':{'plan_sha256':sha(encode(plan)),'activation_claim_sha256':sha(json.dumps(claim,sort_keys=True,allow_nan=False).encode()),'financial_scope':plan['bounds'],'selected_gpu':plan['selected_gpu'],'expected_row':row},'provenance':{'input':spec,'reference_bytes':provenance,'scope':'candidate metadata only; no financial/source verdict or authority produced'}}
def encode(obj):return (json.dumps(obj,sort_keys=True,indent=2,allow_nan=False)+'\n').encode()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--spec',required=True);ap.add_argument('--output',required=True);args=ap.parse_args()
 if os.environ.get('AGENT_BOARD_NAME')!='codex:fastlane-v16-finish-20261009':raise ValueError('Root-only preparation')
 out=Path(args.output)
 if not out.is_absolute()or out.parent.resolve()!=ROOT.resolve()or out.exists():raise ValueError('fresh owned sibling directory required')
 package=build(read(args.spec));out.mkdir(mode=0o700)
 for name,value in package.items():
  p=out/(name+'.json');p.write_bytes(encode(value));p.chmod(0o600)
 print('CANDIDATE_METADATA_ONLY_NO_AUTHORITY_NO_STATE_EFFECTS')
if __name__=='__main__':main()
