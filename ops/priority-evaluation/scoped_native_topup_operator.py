"""Dormant Root-only same-unit SOURCE proposal; dry default, no import effects.
Requires genuine peer over final authority and closure. No automatic grants/retries.
"""
import sys, os
sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
import argparse,copy,hashlib,importlib,json,subprocess,time,signal,shlex
from pathlib import Path
import scoped_native_topup as gate
JOBROOT=Path('/home/flori/jobs/fastlane-evaluations')
def sysrun(*args):return subprocess.run(['systemctl','--user',*args],check=True,timeout=150 if args and args[0]=='stop' else 30,capture_output=True,text=True).stdout
def paths(rid):
 job=JOBROOT/rid;base=job/'review/native-small-topup';unit='jevbench-priority-autopickup-evaluation@'+rid+'.service';drop=Path.home()/'.config/systemd/user'/ (unit+'.d')/'91-native-small-topup.conf'
 if any(q.is_symlink()for q in (drop,*drop.parents)):raise ValueError('unsafe owned dropin path')
 return job,base,unit,drop

def packet(rid):
 job,base,unit,drop=paths(rid);p=gate.read(base/'PLAN.json');auth=gate.read(base/'ROOT-AUTHORITY.json');peer=gate.read(base/'SOURCE-PEER.json')
 if p.get('SOURCE_ONLY_PROSPECTIVE_NOT_INSTALLABLE')is not False or p.get('schema_version')!=1 or p.get('scope')!=gate.SCOPE or p.get('order_id')!=rid or p.get('generation')!=gate.GENERATION or auth.get('scope')!=gate.SCOPE or auth.get('verdict')!='ACCEPTED' or auth.get('root_owner')!=gate.ROOT_OWNER or auth.get('plan_sha256')!=gate.sha(base/'PLAN.json') or auth.get('standing_decision_authenticity_verified')is not True or auth.get('financial_scope')!=p.get('bounds')or peer.get('verdict')!='PASS' or peer.get('reviewer_engine')!='claude' or peer.get('root_authority_sha256')!=gate.sha(base/'ROOT-AUTHORITY.json') or peer.get('plan_sha256')!=gate.sha(base/'PLAN.json') or peer.get('gate_sha256')!=gate.sha(gate.__file__) or peer.get('operator_sha256')!=gate.sha(__file__) or peer.get('standing_decision_authenticity_verified')is not True:raise ValueError('actual combined Root/source peer missing')
 selected='RTX6000' if rid==gate.RYO else 'H100'
 if p.get('selected_gpu')!=selected or auth.get('selected_gpu')!=selected:raise ValueError('literal Root-authenticated GPU selection')
 if p.get('bounds')!=dict(zip(('old_creation_attempts','old_spend_usd','maximum_lifetime_allocations','maximum_lifetime_usd'),gate.BOUNDS[rid])) or p.get('max_new_usd')!=5 or p.get('max_ttl_hours')!=1:raise ValueError('exact new topup bounds')
 if set(p.get('references',{}))!=gate.REFS or Path(p['references']['operator']['path']).resolve()!=Path(__file__).resolve():raise ValueError('complete exact operator references')
 for ref in p['references'].values():
  if gate.sha(ref['path'])!=ref['sha256']:raise ValueError('actual packet source/history pin changed')
 history=gate.read(p['references']['original_history']['path'])
 for path,digest in history['files'].items():
  if gate.sha(path)!=digest:raise ValueError('original history changed')
 frozen=gate.read(p['references']['source_freeze']['path']);actual={str(q)for q in gate.RUNTIME.rglob('*')if q.is_file()}
 if set(frozen['files'])!=actual or any(q.is_symlink()for q in gate.RUNTIME.rglob('*')):raise ValueError('recursive source closure')
 for path,digest in frozen['files'].items():
  if gate.sha(path)!=digest:raise ValueError('recursive source bytes')
 return p,auth,peer

def dropbytes(rid):
 return ('[Service]\nExecStart=\nExecStart=/usr/bin/python3 -B '+str(Path(__file__).resolve())+' --order '+rid+' --continue\n').encode()
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

def continuation_binding(rid):
 return {'path':'/usr/bin/python3','argv':['/usr/bin/python3','-B',str(Path(__file__).resolve()),'--order',rid,'--continue'],'ignore_errors':False}

def sole(a,rid,p):
 _,_,unit,_=paths(rid)
 if a.Effects().unit_state(unit).get('ActiveState')not in ('inactive','failed'):raise ValueError('original unit not inactive')
 if sysrun('show',unit,'-p','Type','--value').strip()!='exec':raise ValueError('canonical Type=exec unit required for acknowledged start')
 if execstart_sha256(sysrun('show',unit,'-p','ExecStart','--value'))!=p['original_execstart_sha256']:raise ValueError('original unit argv changed')
 for line in sysrun('list-units','--all','--no-legend','--plain').splitlines():
  cells=line.split()
  if rid in line and cells and cells[0]!=unit and any(x in cells for x in ('active','activating','deactivating','reloading')):raise ValueError('another owning unit')
def eligible(a,rid,p,auth):
 job,base,unit,drop=paths(rid);statepath=gate.STATE/'requests'/f'{rid}.json';ledgerpath=gate.STATE/'pods'/f'{rid}.json'
 if gate.sha(statepath)!=p['original_state_sha256']or gate.sha(ledgerpath)!=p['original_ledger_sha256']:raise ValueError('whole state/ledger CAS')
 state=gate.read(statepath);ledger=gate.read(ledgerpath);gate.preinput(rid,ledger)
 # Run the actual complete first-party verifier in non-adopted prospective mode
 # before any activation effect; this does not construct/reserve an allocation.
 probe=gate.ScopedTopUp.__new__(gate.ScopedTopUp);probe.job=job;probe.rid=rid;probe.base=base;probe.plan_path=base/'PLAN.json';probe.auth_path=base/'ROOT-AUTHORITY.json';probe.peer_path=base/'SOURCE-PEER.json';probe.recheck=lambda:None
 probe.verify(prospective=True)
 if state.get('scoped_native_topup')is not None or not isinstance(state.get('operational_hold'),dict)or state['operational_hold'].get('transient')is not False:raise ValueError('original permanent failure only')
 if drop.exists()or drop.is_symlink()or any((base/n).exists()for n in ('ACTIVATION-CLAIM.json','ENTRY-CLAIM.json','RESERVE-CLAIM.json','CREATE-CLAIM.json')):raise ValueError('one use consumed')
 a.validate_review_gate(job);v=importlib.import_module('v16_adoption');package=v.selected(job,state)
 if package[0]['generation']!=gate.GENERATION:raise ValueError('original native generation')
 out=gate.STATE/'measurements'/rid/gate.GENERATION/'jevbench'
 if any((out/n).exists()for n in ('receipt.json','raw.jsonl','scored-loop-started.json')):raise ValueError('prior scored observation; no restart')
 row=a.load_row(rid)
 if row!=auth['expected_row']or row.get('evaluation_status')!='pending' or row.get('synthetic_test')is not False or row.get('stripe_mode')!='live' or row.get('pickup_job_dir')!=str(job)or row.get('status')not in ('paid','review_passed') or not row.get('paid_at')or any(row.get(k)is not None for k in ('refund_id','refunded_at','customer_hold_started_at','customer_hold_reason')):raise ValueError('exact Root paid pending row')
 if rid==gate.DECISOR:
  import decisor_late_completion as late
  late.row_check(row,('pending',))
  # Preserve consumed ENTRY/admission. Detect stale original source joins before
  # creating ANY new activation claim or clearing the archived failure hold.
  original_late=gate.read(job/'review/DECISOR-LATE-COMPLETION-ADMISSION.json')
  for ref in original_late['references'].values():
   if gate.sha(ref['path'])!=ref['sha256']:
    name=next(k for k,v in original_late['references'].items()if v==ref)
    gate.late_successor(job,gate.GENERATION,name,ref,Path(ref['path']),job/'review/DECISOR-LATE-COMPLETION-ADMISSION.json',job/'review/decisor-late-handoff'/gate.GENERATION/'ENTRY-CLAIM.json',prospective=True)
  original_entry=gate.read(job/'review/decisor-late-handoff'/gate.GENERATION/'ENTRY-CLAIM.json')
  if original_entry.get('admission_sha256')!=gate.sha(job/'review/DECISOR-LATE-COMPLETION-ADMISSION.json'):raise ValueError('original consumed Decisor ENTRY differs; no rebind/replay')
 elif row.get('result_delivered_at')is not None or a.deadline_for(row)<=a.utcnow():raise ValueError('RYO live paid SLA')
 sole(a,rid,p)
 return state,row

def final_binding(rid, binding_path, binding_sha256):
 # The hash is supplied out of band by the actual Root owner, never inferred
 # from packet booleans or a neighboring host JSON file.
 if not binding_path or not binding_sha256 or gate.sha(binding_path)!=binding_sha256:
  raise ValueError('actual out-of-band Root final binding required')
 job,base,unit,drop=paths(rid)
 expected={name:{'path':str(path),'sha256':gate.sha(path)} for name,path in {
  'plan':base/'PLAN.json','authority':base/'ROOT-AUTHORITY.json',
  'peer':base/'SOURCE-PEER.json','gate':Path(gate.__file__).resolve(),
  'operator':Path(__file__).resolve(),
  'source_freeze':Path(gate.read(base/'PLAN.json')['references']['source_freeze']['path'])}.items()}
 b=gate.read(binding_path)
 if b.get('order_id')!=rid or b.get('root_owner')!=gate.ROOT_OWNER or b.get('scope')!=gate.SCOPE or b.get('financial_source_closure_verified') is not True or b.get('references')!=expected:
  raise ValueError('actual final financial/source closure differs')
 return b

def terminal(a,rid):
 state=a.load_state(rid);anchor=state.get('scoped_native_topup');outcome=state.get('scoped_native_topup_outcome')
 if not isinstance(anchor,dict) or anchor.get('automatic_retry_prohibited') is not True or not isinstance(outcome,dict) or outcome.get('plan_sha256')!=anchor.get('plan_sha256'):
  raise ValueError('durable anchored terminal outcome absent')
 if outcome.get('status')=='held':
  hold=state.get('operational_hold')
  if not isinstance(hold,dict) or hold.get('transient') is not False or hold.get('reason')!='scoped_native_topup_reconciliation_required':raise ValueError('durable permanent hold absent')
 elif outcome.get('status') in ('completed','native_completed_held'):
  receipt=gate.STATE/'measurements'/rid/gate.GENERATION/'jevbench/receipt.json'
  ledger=gate.read(gate.STATE/'pods'/f'{rid}.json')
  if gate.sha(receipt)!=outcome.get('receipt_sha256') or ledger.get('measurement_completed') is not True or state.get('v16_host_measurements',{}).get(gate.GENERATION,{}).get('jevbench')!=gate.read(receipt):raise ValueError('successful adopted native completion absent')
  if outcome['status']=='completed':
   if a.load_row(rid).get('evaluation_status')!='ready_for_release':raise ValueError('successful release-ready completion absent')
  elif not isinstance(state.get('operational_hold'),dict) or state['operational_hold'].get('transient') is not False or state['operational_hold'].get('reason') not in ('v16_completed_cohort_baseline_required','v16_cohort_public_release_required') or a.load_row(rid).get('evaluation_status')!='pending':raise ValueError('completed native canonical publication hold absent')
 else:raise ValueError('unknown terminal outcome')
 return outcome

def fail(a,rid,reason='continuation_failed'):
 # This supervisor owns the exclusive activation, even if the child failed
 # before authenticating its packet. Preserve the immutable ownership anchor.
 state=a.load_state(rid);anchor=state.get('scoped_native_topup')
 job,base,unit,drop=paths(rid)
 if rid not in gate.BOUNDS or not isinstance(anchor,dict) or anchor.get('automatic_retry_prohibited') is not True or anchor.get('status')!='owned' or not isinstance(anchor.get('plan_sha256'),str) or len(anchor['plan_sha256'])!=64:raise ValueError('no exclusive owned activation to reconcile')
 # A missing or corrupted child custody claim is itself a permanent failure;
 # it must never prevent this already anchored supervisor from holding it.
 state['operational_hold']={'reason':'scoped_native_topup_reconciliation_required','transient':False,'at':a.iso(a.utcnow())}
 state['scoped_native_topup_outcome']={'status':'held','plan_sha256':anchor['plan_sha256'],'reason':reason}
 # One atomic durable state write precedes both the fallible DB update and EXIT.
 a.save_state(state);terminal(a,rid)
 a.update_row(rid,"evaluation_status='pending'","evaluation_status IN ('starting','running')")

def exit_receipt(a,rid,filename='EXIT.json'):
 job,base,unit,drop=paths(rid);outcome=terminal(a,rid)
 gate.exclusive(base/filename,{'unit':unit,'no_retry':True,'outcome':outcome})

def restore(a,rid,p):
 job,base,unit,drop=paths(rid)
 if a.Effects().unit_state(unit).get('ActiveState') not in ('inactive','failed'):raise ValueError('owning unit still active; no restore')
 terminal(a,rid)
 ledger=gate.read(gate.STATE/'pods'/f'{rid}.json')
 if ledger.get('pod_id')is not None or ledger.get('cleanup_uncertain')is not False:raise ValueError('observable certain cleanup required; Root reconciliation only')
 if drop.read_bytes()!=dropbytes(rid):raise ValueError('owned dropin changed')
 # Verify the loaded owning command before removing its exact source bytes.
 if execstart_binding(sysrun('show',unit,'-p','ExecStart','--value'))!=continuation_binding(rid):raise ValueError('loaded owned continuation argv changed')
 owned_bytes=dropbytes(rid)
 drop.unlink()
 try:
  sysrun('daemon-reload')
  if execstart_sha256(sysrun('show',unit,'-p','ExecStart','--value'))!=p['original_execstart_sha256']:raise ValueError('original argv restore')
 except BaseException:
  # A failed reload or unexpected underlying argv must retain the owned
  # override, inactive unit and permanent barrier for explicit reconciliation.
  fd=os.open(drop,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
  with os.fdopen(fd,'wb') as f:f.write(owned_bytes);f.flush();os.fsync(f.fileno())
  sysrun('daemon-reload')
  raise
 gate.exclusive(base/'RESTORED.json',{'unit':unit,'terminal_outcome':terminal(a,rid)})

def await_exit(a,rid,p,*,timeout=3720):
 job,base,unit,drop=paths(rid);deadline=time.monotonic()+timeout
 while True:
  inactive=a.Effects().unit_state(unit).get('ActiveState') in ('inactive','failed')
  if inactive:
   try:
    outcome=terminal(a,rid)
    receipt=gate.read(base/'EXIT.json')
    if receipt.get('outcome')!=outcome or receipt.get('unit')!=unit or receipt.get('no_retry') is not True:raise ValueError('exit outcome differs')
   except (ValueError,OSError,KeyError,TypeError):
    with a.cycle_lock(blocking=True):
     fail(a,rid,'unit_exited_without_valid_terminal_receipt')
     exit_receipt(a,rid,'SUPERVISOR-EXIT.json')
   restore(a,rid,p);return
  if time.monotonic()>=deadline:
   with a.cycle_lock(blocking=True):fail(a,rid,'owning_unit_timeout')
   # SIGTERM uses the child's handler and canonical lifecycle cleanup. A
   # SIGKILL cannot be caught; the supervisor reconciles its observable exit.
   sysrun('stop',unit)
   if a.Effects().unit_state(unit).get('ActiveState') not in ('inactive','failed'):raise ValueError('timeout held; owning unit still active')
   with a.cycle_lock(blocking=True):
    fail(a,rid,'owning_unit_timeout');exit_receipt(a,rid,'SUPERVISOR-EXIT.json')
   restore(a,rid,p);return
  time.sleep(2)

def apply(a,rid,do_apply,*,binding_path=None,binding_sha256=None):
 if os.environ.get('AGENT_BOARD_NAME')!=gate.ROOT_OWNER:raise ValueError('Root only')
 job,base,unit,drop=paths(rid);p,auth,peer=packet(rid)
 with a.cycle_lock(blocking=True):
  state,row=eligible(a,rid,p,auth)
  if do_apply:final_binding(rid,binding_path,binding_sha256)
  if not do_apply:print('SCOPED_TOPUP_DRY_READY_NO_RUNTIME_GRANT');return
  claim={'order_id':rid,'generation':gate.GENERATION,'plan_sha256':gate.sha(base/'PLAN.json'),'original_state_sha256':p['original_state_sha256'],'original_ledger_sha256':p['original_ledger_sha256']}
  if hashlib.sha256(json.dumps(claim,sort_keys=True,allow_nan=False).encode()).hexdigest()!=auth['activation_claim_sha256']:raise ValueError('prospective exact activation claim')
  gate.exclusive(base/'ACTIVATION-CLAIM.json',claim)
  try:
   gate.exclusive(base/'STATE-BEFORE.json',state)
   # New durable anchor blocks ordinary controller paths even with no hold.
   state['scoped_native_topup']={'authority_sha256':gate.sha(base/'ROOT-AUTHORITY.json'),'peer_sha256':gate.sha(base/'SOURCE-PEER.json'),'plan_sha256':gate.sha(base/'PLAN.json'),'status':'owned','automatic_retry_prohibited':True}
   state.pop('operational_hold');a.save_state(state)
   if rid==gate.DECISOR:
    import decisor_late_completion as late
    genuine=late.LateCompletion(job,gate.GENERATION,a,('pending',));guard=genuine.sql_guard(('pending',))
   else:
    guard="status IN ('paid','review_passed') AND evaluation_status='pending' AND synthetic_test=false AND stripe_mode='live' AND result_delivered_at IS NULL AND customer_hold_started_at IS NULL AND customer_hold_reason IS NULL AND refund_id IS NULL AND refunded_at IS NULL AND paid_at IS NOT NULL AND paid_at + COALESCE(sla_paused_seconds,0)*interval '1 second'+interval '48 hours'>now()"
    guard+=f" AND pickup_owner={a.sql_text(row['pickup_owner'])} AND pickup_job_dir={a.sql_text(row['pickup_job_dir'])} AND evaluation_attempts={int(row['evaluation_attempts'])}"
   if a.load_row(rid)!=row or gate.sha(gate.STATE/'pods'/f'{rid}.json')!=p['original_ledger_sha256']or not a.update_row(rid,"evaluation_status='starting'",guard):raise ValueError('late same-row/ledger status CAS')
   drop.parent.mkdir(parents=True,exist_ok=True)
   fd=os.open(drop,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   with os.fdopen(fd,'wb')as f:f.write(dropbytes(rid));f.flush();os.fsync(f.fileno())
   sysrun('daemon-reload');sysrun('start',unit);gate.exclusive(base/'START-REQUESTED.json',{'unit':unit})
  except BaseException:fail(a,rid);raise
 await_exit(a,rid,p)
def continuation(a,rid):
 job,base,unit,drop=paths(rid)
 previous=signal.getsignal(signal.SIGTERM)
 def stopped(signum,frame):raise SystemExit('owning unit stopped')
 signal.signal(signal.SIGTERM,stopped)
 try:
  p,auth,peer=packet(rid)
  with a.cycle_lock(blocking=True):
   if sysrun('show',unit,'-p','MainPID','--value').strip()!=str(os.getpid()) or a.Effects().unit_state(unit).get('ActiveState')not in ('active','activating')or drop.read_bytes()!=dropbytes(rid):raise ValueError('exact owning MainPID/argv custody')
   if gate.sha(base/'ACTIVATION-CLAIM.json')!=auth['activation_claim_sha256']:raise ValueError('exclusive activation custody')
   state=a.load_state(rid);a.validate_review_gate(job);import v16_adoption as v
   selected=v.selected(job,state)
   if selected[0]['generation']!=gate.GENERATION or gate.sha(gate.STATE/'pods'/f'{rid}.json')!=p['original_ledger_sha256']:raise ValueError('native source/whole ledger entry')
   gate.ScopedTopUp(job,selected[0],lambda:None)
   if rid==gate.DECISOR:
    import decisor_late_completion as late
    genuine=late.LateCompletion(job,gate.GENERATION,a,('starting','pending'));guard=genuine.sql_guard(('starting',))
   else:
    row=a.load_row(rid);original=auth['expected_row']
    if row.get('evaluation_status')!='starting' or any(row.get(k)!=original.get(k)for k in ('id','pickup_owner','pickup_job_dir','paid_at','sla_paused_seconds','evaluation_attempts','synthetic_test','stripe_mode')):raise ValueError('RYO original row custody changed')
    guard="status IN ('paid','review_passed') AND evaluation_status='starting' AND synthetic_test=false AND stripe_mode='live' AND customer_hold_started_at IS NULL AND customer_hold_reason IS NULL AND refund_id IS NULL AND refunded_at IS NULL AND result_delivered_at IS NULL AND paid_at IS NOT NULL AND paid_at + COALESCE(sla_paused_seconds,0)*interval '1 second'+interval '48 hours'>now()"
    guard+=f" AND pickup_owner={a.sql_text(original['pickup_owner'])} AND pickup_job_dir={a.sql_text(original['pickup_job_dir'])} AND evaluation_attempts={int(original['evaluation_attempts'])}"
   gate.exclusive(base/'ENTRY-CLAIM.json',{'plan_sha256':gate.sha(base/'PLAN.json')})
   if not a.update_row(rid,"evaluation_status='running'",guard):raise ValueError('same unit running CAS')
  v.v16_profiles.measure(job,scoped_topup=True)
  # This authentic completed receipt is the ONLY path into existing host adoption.
  if not (gate.STATE/'measurements'/rid/gate.GENERATION/'jevbench/receipt.json').is_file():raise ValueError('completed native receipt absent')
  result=a.evaluate_v16_generation(rid,job)
  with a.cycle_lock(blocking=True):
   state=a.load_state(rid)
   # The canonical handler deliberately retains an explicit cohort/publication
   # hold after adopting a completed native receipt. Preserve it honestly.
   outcome_status='completed' if a.load_row(rid).get('evaluation_status')=='ready_for_release' else 'native_completed_held'
   state['scoped_native_topup_outcome']={'status':outcome_status,'plan_sha256':state['scoped_native_topup']['plan_sha256'],'receipt_sha256':gate.sha(gate.STATE/'measurements'/rid/gate.GENERATION/'jevbench/receipt.json')}
   a.save_state(state);terminal(a,rid)
  return result
 except BaseException:
  with a.cycle_lock(blocking=True):fail(a,rid)
  raise
 finally:
  signal.signal(signal.SIGTERM,previous)
  # Never certify an exit merely because the failure handler ran. If durable
  # hold persistence failed, no EXIT is written; the supervisor must reconcile.
  exit_receipt(a,rid)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--order',choices=tuple(gate.BOUNDS),required=True);parser.add_argument('--binding');parser.add_argument('--binding-sha256');mode=parser.add_mutually_exclusive_group();mode.add_argument('--apply',action='store_true');mode.add_argument('--continue',dest='resume',action='store_true');args=parser.parse_args();sys.dont_write_bytecode=True;sys.path.insert(0,str(gate.RUNTIME));a=importlib.import_module('autopickup')
 if args.resume:return continuation(a,args.order)
 return apply(a,args.order,args.apply,binding_path=args.binding,binding_sha256=args.binding_sha256)
if __name__=='__main__':main()
