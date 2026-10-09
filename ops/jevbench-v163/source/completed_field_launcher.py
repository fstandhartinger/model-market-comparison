#!/usr/bin/env python3
"""ROOT-only per-file no-network official completed-field launcher."""
import hashlib,json,stat,subprocess,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
def sha(b):return hashlib.sha256(b).hexdigest()
def bounded(p,cap):
 p=Path(p)
 for x in(*reversed(p.absolute().parents),p.absolute()):
  m=x.lstat().st_mode
  if not(stat.S_ISREG(m)if x==p.absolute()else stat.S_ISDIR(m)):raise ValueError('path')
 if p.stat().st_size>cap:raise ValueError('cap')
 b=p.read_bytes()
 if len(b)>cap:raise ValueError('changed cap')
 return b
def main():
 try:
  if len(sys.argv)!=3:raise ValueError('approvals')
  cr=bounded(HERE/'COMPLETED-FIELD-CONTRACT.json',200000);c=json.loads(cr);cs=sha(cr);ss=sha(bounded(HERE/'completed_field_builder.py',100000))
  if sha(bounded(__file__,100000))!=c['launcher_sha256']or ss!=c['source_sha256']or sha(bounded(HERE/'cohort.py',100000))!=c['cohort_source_sha256']:raise ValueError('source pins')
  pp,rp=[Path(p).absolute()for p in sys.argv[1:]];peer=json.loads(bounded(pp,10000));root=json.loads(bounded(rp,10000))
  if peer!={'schema_version':1,'verdict':'ACCEPTED_SOURCE_COMPLETED_FIELD_BUILDER','reviewer_engine':'claude','source_sha256':ss,'contract_sha256':cs,'scope':'whole_fixed_roster_minTHREE_complete_official_Gmed_all1500_O1S'}:raise ValueError('peer')
  if not isinstance(root.get('cost_basis_sha256'),str)or len(root['cost_basis_sha256'])!=64:raise ValueError('root cost hash')
  if root!={'cost_basis_sha256':root['cost_basis_sha256'],'schema_version':1,'owner':'fastlane-v16-finish-20261009','scope':'BUILD_COMPLETED_FIELD_OFFICIAL_BASELINE_AND_SCORES','source_sha256':ss,'contract_sha256':cs,'per_file_kernel_no_network_sandbox':True,'all1500_scored':True,'no_outcome_field_exclusions':True}:raise ValueError('root')
  for pin in c['metadata_pins'].values():
   if sha(bounded(pin['path'],2000000))!=pin['sha256']:raise ValueError('actual completed metadata hash')
  for pin in c['source_files'].values():
   if sha(bounded(pin['path'],500000))!=pin['sha256']:raise ValueError('source hash')
  # Exact accepted cost artifact only; no private body is parsed on host.
  if sha(bounded(c['cost_basis_host'],100000))!=root['cost_basis_sha256']or root['cost_basis_sha256']!=c['predecessor_cost_basis_sha256']:raise ValueError('unchanged predecessor cost hash')
  sys.path.insert(0,str(HERE))
  from cohort import protected_output_path
  out=protected_output_path(c['output_host'])
  for x in(*reversed(out.parent.parents),out.parent):
   if not stat.S_ISDIR(x.lstat().st_mode):raise ValueError('output parent')
  out.mkdir(mode=0o700,exist_ok=False)
  a=['/usr/bin/bwrap','--unshare-net','--unshare-pid','--unshare-ipc','--unshare-uts','--die-with-parent','--new-session','--clearenv','--setenv','JEV_NOUL_METHOD','O1S','--proc','/proc','--dev','/dev','--tmpfs','/tmp']
  for x in('/usr','/lib','/lib64','/etc/ld.so.cache'):
   if Path(x).exists():a+=['--ro-bind',x,x]
  for pin in list(c['source_files'].values())+list(c['metadata_pins'].values()):a+=['--ro-bind',pin['path'],pin['path']]
  for n in('score_v16.py','score_v15.py','score_v15_headlineA.py','noul_method_v16.py'):a+=['--ro-bind',c['source_files'][n]['path'],'/score/'+n]
  for n in('completed_field_builder.py','cohort.py','COMPLETED-FIELD-CONTRACT.json'):a+=['--ro-bind',str(HERE/n),str(HERE/n)]
  pr=Path(c['preregistration_host']);a+=['--ro-bind',str(pr),str(pr),'--ro-bind',c['gold_host'],'/custody/gold.jsonl','--ro-bind',c['cost_basis_host'],'/custody/cost-basis.json']
  for r in c['roster']:
   if r['status']=='complete':a+=['--ro-bind',r['raw_path'],'/custody/'+r['key']+'.jsonl']
  a+=['--ro-bind',str(pp),'/approval/source.json','--ro-bind',str(rp),'/approval/root.json','--bind',str(out),'/output','--chdir','/tmp','/usr/bin/python3','-I','-B',str(HERE/'completed_field_builder.py'),'/approval/source.json','/approval/root.json']
  result=subprocess.run(a,env={'PATH':'/usr/bin:/bin','OPENAI_API_KEY':''},capture_output=True,timeout=600)
  if result.returncode or result.stderr or result.stdout!=b'COMPLETED_FIELD_OFFICIAL_RESULTS_PROTECTED_OUTPUT_ONLY\n':raise ValueError('execution')
  print('COMPLETED_FIELD_OFFICIAL_ISOLATED_READY');return 0
 except Exception:
  print('COMPLETED_FIELD_ISOLATED_HELD',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
