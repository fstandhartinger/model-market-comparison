"""Dormant Root/peer-owned one-use +5 gate; never an automatic financial grant."""
import hashlib,json,math,os
from pathlib import Path
ROOT_OWNER='codex:fastlane-v16-finish-20261009'
GENERATION='native-v16-paid-20261009'
SCOPE='exact-native-preinput-small-topup-one-use'
RYO='81e785ad-081b-4592-99df-1c3d709fd6c8'
DECISOR='3687485f-5a51-4964-bd9a-73973f3494d7'
BOUNDS={RYO:(2,20.0,3,25.0),DECISOR:(3,19.8,4,24.8)}
REFS={'profile_admission','profile_review','gate','standing_decision','original_history','controller','v16_profiles','pod_runner','operator','source_freeze','recipe'}
STATE=Path('/home/flori/.local/state/fastlane-autopickup')
RUNTIME=Path('/home/flori/.local/share/priority-evaluation/runtime')

def sha(path):
 p=Path(path)
 if any(q.is_symlink()for q in (p,*p.parents)) or not p.is_file():raise ValueError('unsafe topup reference')
 return hashlib.sha256(p.read_bytes()).hexdigest()
def read(path):return json.loads(Path(path).read_text())
def exclusive(path,value):
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
 if any(q.is_symlink()for q in (p,*p.parents)):raise ValueError('unsafe topup claim')
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'w')as f:json.dump(value,f,sort_keys=True,allow_nan=False);f.flush();os.fsync(f.fileno())
 fd=os.open(p.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(fd)
 finally:os.close(fd)
def preinput(rid,state,ttl=1,budget=5):
 if rid not in BOUNDS:raise ValueError('topup exact order only')
 n,spent,_,_=BOUNDS[rid]
 if state.get('request_id')!=rid or type(state.get('creation_attempts'))is not int or state['creation_attempts']!=n or type(state.get('spent_upper_bound_usd'))not in (int,float) or state['spent_upper_bound_usd']!=spent or state.get('pod_id')is not None or state.get('cleanup_uncertain')is not False or not state.get('torn_down_at') or any(state.get(k)for k in ('input_dispatched','execution_started','measurement_completed','scored_dispatch_uncertain')) or type(ttl)not in (int,float) or not 0<ttl<=1 or type(budget)not in (int,float) or not 0<budget<=5:raise ValueError('topup preinput whole financial scope')

class ScopedTopUp:
 """Requires authentic Root adoption plus peer over exact authority and sources."""
 max_new_usd=5.0
 max_ttl_hours=1.0
 contingency_usd=0.0
 def __init__(self,job,admission,recheck):
  self.job=Path(job);self.rid=self.job.name;self.recheck=recheck
  if self.rid not in BOUNDS or admission.get('generation')!=GENERATION:raise ValueError('topup generation scope')
  self.n,self.spent,self.allowed_total,self.lifetime_cap_usd=BOUNDS[self.rid]
  self.base=self.job/'review/native-small-topup';self.plan_path=self.base/'PLAN.json';self.auth_path=self.base/'ROOT-AUTHORITY.json';self.peer_path=self.base/'SOURCE-PEER.json'
  self.verify()
  self.ledger=STATE/'pods'/f'{self.rid}.json';self.original=read(self.ledger)
  if sha(self.ledger)!=self.plan['original_ledger_sha256']:raise ValueError('topup whole original ledger CAS')
  preinput(self.rid,self.original)
  self.reserve_claim=self.base/'RESERVE-CLAIM.json';self.create_claim=self.base/'CREATE-CLAIM.json'
  if self.reserve_claim.exists()or self.create_claim.exists():raise ValueError('topup rental already consumed')
 def verify(self):
  p=read(self.plan_path);a=read(self.auth_path);peer=read(self.peer_path);request=read(STATE/'requests'/f'{self.rid}.json')
  expected={'authority_sha256':sha(self.auth_path),'peer_sha256':sha(self.peer_path),'plan_sha256':sha(self.plan_path),'status':'owned','automatic_retry_prohibited':True}
  if request.get('scoped_native_topup')!=expected:raise ValueError('Root adopted one-use anchor absent')
  if p.get('SOURCE_ONLY_PROSPECTIVE_NOT_INSTALLABLE')is not False or p.get('schema_version')!=1 or p.get('scope')!=SCOPE or p.get('order_id')!=self.rid or p.get('generation')!=GENERATION or p.get('bounds')!=dict(zip(('old_creation_attempts','old_spend_usd','maximum_lifetime_allocations','maximum_lifetime_usd'),BOUNDS[self.rid])) or p.get('max_new_usd')!=5 or p.get('max_ttl_hours')!=1:raise ValueError('exact immutable topup scope')
  if a.get('verdict')!='ACCEPTED' or a.get('root_owner')!=ROOT_OWNER or a.get('scope')!=SCOPE or a.get('plan_sha256')!=sha(self.plan_path) or a.get('standing_decision_authenticity_verified')is not True or a.get('financial_scope')!=p['bounds']:raise ValueError('actual Root financial authority absent')
  if peer.get('verdict')!='PASS' or peer.get('reviewer_engine')!='claude' or peer.get('root_authority_sha256')!=sha(self.auth_path) or peer.get('plan_sha256')!=sha(self.plan_path) or peer.get('gate_sha256')!=sha(__file__) or peer.get('standing_decision_authenticity_verified')is not True:raise ValueError('genuine exact independent topup peer absent')
  refs=p.get('references',{})
  if set(refs)!=REFS:raise ValueError('complete topup reference set')
  for ref in refs.values():
   if sha(ref['path'])!=ref['sha256']:raise ValueError('topup original/source reference changed')
  if Path(refs['gate']['path']).resolve()!=Path(__file__).resolve() or Path(refs['profile_admission']['path'])!=self.job/'review/V16-PROFILE-ADMISSION.json' or Path(refs['controller']['path'])!=RUNTIME/'autopickup.py' or Path(refs['pod_runner']['path'])!=RUNTIME/'pod_runner.py' or Path(refs['v16_profiles']['path'])!=RUNTIME/'v16_profiles.py' or Path(refs['recipe']['path'])!=self.job/'trusted-runner/POD-RECIPE.json':raise ValueError('actual topup source paths')
  frozen=read(refs['source_freeze']['path'])
  files=frozen.get('files',{})
  if set(files)!={str(q)for q in RUNTIME.rglob('*')if q.is_file()} or any(q.is_symlink()for q in RUNTIME.rglob('*')):raise ValueError('whole runtime source closure membership')
  for path,digest in files.items():
   if sha(path)!=digest:raise ValueError('whole runtime source closure bytes')
  history=read(refs['original_history']['path'])
  if not isinstance(history,dict)or not history.get('files'):raise ValueError('all failed/original history required')
  for path,digest in history['files'].items():
   if sha(path)!=digest:raise ValueError('original failed/claim/history changed')
  if sha(self.base/'ACTIVATION-CLAIM.json')!=a.get('activation_claim_sha256'):raise ValueError('exclusive Root activation custody')
  self.plan=p;self.recheck()
 def recovery_bounds(self,job,state,ttl,budget):
  if Path(job)!=self.job:raise ValueError('foreign supplemented recovery')
  self.verify();preinput(self.rid,state,ttl,budget)
 def __call__(self,phase,state):
  self.verify()
  if phase in ('check','before_reserve'):
   preinput(self.rid,state)
   if self.reserve_claim.exists()or self.create_claim.exists():raise ValueError('one new allocation consumed')
   # Quotes may add only their own authenticated monotonic metadata before reserve.
   allowed={'placement_quote','read_only_capacity_checks','read_only_capacity_refs'}
   if {k:v for k,v in state.items()if k not in allowed}!={k:v for k,v in self.original.items()if k not in allowed}:raise ValueError('original whole ledger fields changed')
   oldrefs=self.original.get('read_only_capacity_refs',[]);newrefs=state.get('read_only_capacity_refs',[])
   if newrefs[:len(oldrefs)]!=oldrefs or len(newrefs)-len(oldrefs)>2 or state.get('read_only_capacity_checks',0)-self.original.get('read_only_capacity_checks',0)!=len(newrefs)-len(oldrefs):raise ValueError('original readonly history changed')
   if phase=='before_reserve':exclusive(self.reserve_claim,{'plan_sha256':sha(self.plan_path),'ledger_before_sha256':sha(self.ledger)})
  elif phase=='before_create':
   ttl=state.get('attempt_ttl_hours');charge=state.get('attempt_reserved_upper_bound_usd')
   if type(ttl)not in (int,float)or not 0<ttl<=1 or type(charge)not in (int,float)or not 0<charge<=5 or abs(charge-ttl*5)>1e-9 or state.get('creation_attempts')!=self.n+1 or state.get('spent_upper_bound_usd')!=self.spent+charge or state['spent_upper_bound_usd']>self.lifetime_cap_usd or state.get('attempt_contingency_usd')!=0 or state.get('pod_id')is not None or state.get('cleanup_uncertain')is not True or any(state.get(k)for k in ('input_dispatched','execution_started','measurement_completed')):raise ValueError('topup conservative reservation accounting')
   if read(self.reserve_claim).get('plan_sha256')!=sha(self.plan_path):raise ValueError('topup reserve custody')
   exclusive(self.create_claim,{'plan_sha256':sha(self.plan_path),'creation_attempts':self.n+1})
  else:raise ValueError('topup lifecycle phase')
  return self.allowed_total
