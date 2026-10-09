"""One exact root-reviewed Decisor continuation after pre-provider image rejection.
No effects on import. Original controller, ENTRY/HANDOFF/admissions never rewritten.
--apply and --continue remain inactive until root authority and exact source peer.
"""
import argparse,copy,hashlib,importlib,json,os,re,subprocess,sys,time
from pathlib import Path
ORDER='3687485f-5a51-4964-bd9a-73973f3494d7'
GENERATION='native-v16-paid-20261009'
ROOT_OWNER='codex:fastlane-v16-finish-20261009'
UNIT='jevbench-priority-autopickup-evaluation@'+ORDER+'.service'
RUNTIME=Path('/home/flori/.local/share/priority-evaluation/runtime')
JOB=Path('/home/flori/jobs/fastlane-evaluations')/ORDER
ORIGINAL=JOB/'review/decisor-late-handoff'/GENERATION
NEW=ORIGINAL/'preprovider-reconciliation'
DROPIN=Path.home()/'.config/systemd/user'/ (UNIT+'.d')/'90-decisor-preprovider-reconcile.conf'

def encoded(v):return (json.dumps(v,sort_keys=True,indent=2)+'\n').encode()
def digest(path):
 p=Path(path)
 if any(q.is_symlink()for q in (p,*p.parents))or not p.is_file():raise ValueError('unsafe reconciliation source')
 return hashlib.sha256(p.read_bytes()).hexdigest()
def pinned(ref):
 p=Path(ref['path'])
 if digest(p)!=ref['sha256']:raise ValueError('reconciliation pin changed')
 return p
def read(path):return json.loads(Path(path).read_text())
def exclusive(path,value):
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
 if any(q.is_symlink()for q in (p,*p.parents)):raise ValueError('unsafe reconciliation claim')
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb')as f:f.write(encoded(value));f.flush();os.fsync(f.fileno())
 fd=os.open(p.parent,os.O_RDONLY|os.O_DIRECTORY)
 try:os.fsync(fd)
 finally:os.close(fd)

def failed_hold(state):
 h=state.get('operational_hold')
 if not isinstance(h,dict)or h.get('reason')!='pod_recipe_invalid'or h.get('transient')is not False or h.get('retries')!=0:raise ValueError('not exact pre-provider failure')
 return h

def authority(plan_path,authority_path,peer_path):
 plan=read(plan_path);auth=read(authority_path);peer=read(peer_path)
 if plan.get('schema_version')!=1 or plan.get('order_id')!=ORDER or plan.get('generation')!=GENERATION or plan.get('scope')!='exact-decisor-preprovider-reconciliation':raise ValueError('wrong reconciliation scope')
 if auth.get('verdict')!='ACCEPTED'or auth.get('root_owner')!=ROOT_OWNER or auth.get('scope')!=plan['scope']or auth.get('order_id')!=ORDER or auth.get('generation')!=GENERATION or auth.get('plan_sha256')!=digest(plan_path):raise ValueError('root authority absent or changed')
 if auth.get('original_root_decision_sha256')!='8b0ea8b5a610de118bb035e66009c1c27cae39cee0fd820b87fff56386c4320e':raise ValueError('original financial decision differs')
 pinned(plan['original_root_decision'])
 if plan['original_root_decision']!={'path':str(JOB/'review/DECISOR-ROOT-BOUNDED-COMPLETION-DECISION.json'),'sha256':auth['original_root_decision_sha256']}:raise ValueError('original financial pin differs')
 if auth.get('financial_scope')!={'old_creation_attempts':2,'old_spent_upper_bound_usd':7.8,'new_allocation_count':1,'new_inclusive_cap_usd':12.0,'original_order_cap_usd':20.0}:raise ValueError('financial scope differs')
 if peer.get('verdict')!='PASS'or peer.get('reviewer_engine')!='claude'or peer.get('plan_sha256')!=digest(plan_path)or peer.get('helper_sha256')!=digest(__file__)or peer.get('root_authority_sha256')!=digest(authority_path):raise ValueError('genuine exact combined source peer missing')
 for ref in plan['installed_sources']:pinned(ref)
 if plan['helper']!={'path':str(Path(__file__).resolve()),'sha256':digest(__file__)}:raise ValueError('wrong installed continuation helper')
 for n,ref in plan['original_claims'].items():
  if n not in ('ENTRY-CLAIM.json','HANDOFF.json','STARTED.json')or Path(ref['path'])!=ORIGINAL/n:raise ValueError('claim scope differs')
  pinned(ref)
 if set(plan['original_claims'])!={'ENTRY-CLAIM.json','HANDOFF.json','STARTED.json'}:raise ValueError('original claims absent')
 return plan

def preprovider(a,plan):
 """Exact old financial history and absence, checked before ANY provider call."""
 ledger=pinned(plan['old_pod_ledger']);v=read(ledger)
 if ledger!=Path(a.STATE_ROOT)/'pods'/ (ORDER+'.json')or v.get('creation_attempts')!=2 or v.get('spent_upper_bound_usd')!=7.8 or v.get('pod_id')is not None or v.get('cleanup_uncertain')is not False:raise ValueError('old liability changed')
 for name in ('single-fresh-generation.json','rental-attempt.json'):
  if (Path(a.STATE_ROOT)/'pods/v16-generation'/ORDER/name).exists():raise ValueError('new allocation already claimed')
 output=Path(a.STATE_ROOT)/'measurements'/ORDER/GENERATION/'jevbench'
 if output.exists():raise ValueError('measurement output already exists; reconcile observation')
 a.validate_review_gate(JOB)
 import v16_adoption
 selected=v16_adoption.selected(JOB,a.load_state(ORDER))
 if selected[0]['generation']!=GENERATION:raise ValueError('different generation')
 if digest(JOB/'trusted-runner/POD-RECIPE.json')!=plan['recipe_sha256']:raise ValueError('original recipe changed')
 return selected

def dropin(plan_path,authority_path,peer_path):
 paths=[str(Path(x).resolve())for x in [__file__,plan_path,authority_path,peer_path]]
 if any(any(c.isspace()or c in '%"\\'for c in p)for p in paths):raise ValueError('unsafe unit path')
 return ('[Service]\nExecStart=\nExecStart=/usr/bin/python3 '+paths[0]+' --continue --plan '+paths[1]+' --authority '+paths[2]+' --peer '+paths[3]+'\n').encode()
def sysrun(*args):return subprocess.run(['systemctl','--user',*args],check=True,timeout=30,capture_output=True,text=True).stdout
def argv_sha(command):
 match=re.search(r'argv\[\]=(.*?) ;',command)
 if not match:raise ValueError('systemd argv custody missing')
 return hashlib.sha256(match[1].encode()).hexdigest()

def apply(a,plan_path,authority_path,peer_path):
 if os.environ.get('AGENT_BOARD_NAME')!=ROOT_OWNER:raise ValueError('wrong root owner')
 plan=authority(plan_path,authority_path,peer_path)
 with a.cycle_lock(blocking=True):
  if a.Effects().unit_state(UNIT).get('ActiveState')not in ('inactive','failed'):raise ValueError('unit not inactive')
  command=sysrun('show',UNIT,'-p','ExecStart','--value')
  if argv_sha(command)!=plan['original_execstart_sha256']:raise ValueError('same owning unit command changed')
  listing=sysrun('list-units','--all','--no-legend','--plain')
  for line in listing.splitlines():
   cells=line.split()
   if ORDER in line and cells and cells[0]!=UNIT and any(v in cells for v in ('active','activating','deactivating')):raise ValueError('foreign active owner for exact order')
  state=a.load_state(ORDER)
  if digest(Path(a.STATE_ROOT)/'requests'/ (ORDER+'.json'))!=plan['failure_state_sha256']:raise ValueError('whole failed state changed')
  hold=failed_hold(state);preprovider(a,plan)
  import decisor_late_completion as late
  late.row_check(a.load_row(ORDER),('pending',))
  if DROPIN.exists()or DROPIN.is_symlink():raise ValueError('reconciliation dropin already exists')
  claim={'order_id':ORDER,'generation':GENERATION,'plan_sha256':digest(plan_path),'root_authority_sha256':digest(authority_path),'source_peer_sha256':digest(peer_path),'old_hold':hold,'original_claims':plan['original_claims']}
  exclusive(NEW/'CLAIM.json',claim)
  # All history and counters retained; clear only archived exact failure hold.
  try:
   nextstate=copy.deepcopy(state);nextstate.pop('operational_hold');nextstate['decisor_preprovider_reconciliation']=claim;a.save_state(nextstate)
   genuine=late.LateCompletion(JOB,GENERATION,a,('pending',))
   if not a.update_row(ORDER,"evaluation_status='starting'",genuine.sql_guard(('pending',))):raise ValueError('same-generation status CAS refused')
   DROPIN.parent.mkdir(parents=True,exist_ok=True)
   raw=dropin(plan_path,authority_path,peer_path)
   fd=os.open(DROPIN,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   with os.fdopen(fd,'wb')as f:f.write(raw);f.flush();os.fsync(f.fileno())
   exclusive(NEW/'DROPIN.json',{'path':str(DROPIN),'sha256':hashlib.sha256(raw).hexdigest()})
   sysrun('daemon-reload');sysrun('start','--no-block',UNIT)
   exclusive(NEW/'START-REQUESTED.json',{'unit':UNIT,'plan_sha256':digest(plan_path)})
  except Exception:
   fail(a,'decisor_preprovider_reconciliation_failed');raise
 # Never restore while unit may still execute. Durable root recovery if interrupted.
 end=time.monotonic()+3*3600+120
 while time.monotonic()<end:
  props=a.Effects().unit_state(UNIT)
  if props.get('ActiveState')in ('inactive','failed')and (NEW/'EXIT.json').is_file():
   record=read(NEW/'DROPIN.json')
   if digest(DROPIN)!=record['sha256']:raise ValueError('own dropin custody changed')
   DROPIN.unlink();sysrun('daemon-reload')
   if argv_sha(sysrun('show',UNIT,'-p','ExecStart','--value'))!=plan['original_execstart_sha256']:raise ValueError('original command restoration differs')
   exclusive(NEW/'RESTORED.json',{'unit':UNIT,'original_execstart_sha256':plan['original_execstart_sha256']});return
  time.sleep(2)
 raise ValueError('observable exit pending; leave own dropin for root reconciliation')

def fail(a,reason):
 state=a.load_state(ORDER);a.set_operational_hold(state,reason,transient=False)
 a.update_row(ORDER,"evaluation_status='pending'","evaluation_status IN ('starting','running')")

def continuation(a,plan_path,authority_path,peer_path):
 entered=False;owned=False
 try:
  plan=authority(plan_path,authority_path,peer_path)
  with a.cycle_lock(blocking=True):
   if a.Effects().unit_state(UNIT).get('ActiveState')not in ('active','activating')or sysrun('show',UNIT,'-p','MainPID','--value').strip()!=str(os.getpid()):raise ValueError('continuation is not the exact owning unit main process')
   expected=read(NEW/'CLAIM.json')
   if expected.get('plan_sha256')!=digest(plan_path)or expected.get('root_authority_sha256')!=digest(authority_path)or expected.get('source_peer_sha256')!=digest(peer_path)or a.load_state(ORDER).get('decisor_preprovider_reconciliation')!=expected:raise ValueError('accepted exclusive reconciliation claim changed')
   if digest(DROPIN)!=hashlib.sha256(dropin(plan_path,authority_path,peer_path)).hexdigest():raise ValueError('exact same-unit argv custody changed')
   owned=True
   preprovider(a,plan)
   import decisor_late_completion as late
   # Unchanged original LateCompletion branch validates consumed original ENTRY.
   genuine=late.LateCompletion(JOB,GENERATION,a,('starting','pending'))
   late.row_check(a.load_row(ORDER),('starting',))
   exclusive(NEW/'ENTRY-CLAIM.json',expected);entered=True
   if not a.update_row(ORDER,"evaluation_status='running'",genuine.sql_guard(('starting',))):raise ValueError('continuation status CAS refused')
  # Existing function retains native/allocation/runtime/retirement/preupload gates.
  import v16_adoption
  v16_adoption.v16_profiles.measure(JOB)
  # Receipt now exists; unchanged host handler performs idempotent adoption/score.
  return a.evaluate_v16_generation(ORDER,JOB)
 except Exception:
  if owned:
   with a.cycle_lock(blocking=True):fail(a,'decisor_preprovider_reconciliation_failed')
  raise
 finally:
  if owned:exclusive(NEW/'EXIT.json',{'unit':UNIT,'entry_consumed':entered})

def main():
 p=argparse.ArgumentParser();p.add_argument('--plan',type=Path,required=True);p.add_argument('--authority',type=Path,required=True);p.add_argument('--peer',type=Path,required=True)
 mode=p.add_mutually_exclusive_group(required=True);mode.add_argument('--apply',action='store_true');mode.add_argument('--continue',dest='resume',action='store_true');args=p.parse_args()
 sys.path.insert(0,str(RUNTIME));a=importlib.import_module('autopickup')
 if args.apply:return apply(a,args.plan,args.authority,args.peer)
 return continuation(a,args.plan,args.authority,args.peer)
if __name__=='__main__':main()
