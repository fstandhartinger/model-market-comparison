#!/usr/bin/env python3
"""ROOT sole execution, pinned per-file sandbox; no protected parsing on host."""
import hashlib,json,stat,subprocess,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
def digest(b):return hashlib.sha256(b).hexdigest()
def bounded(p,cap=30000000):
 p=Path(p).absolute()
 for x in(*reversed(p.parents),p):
  m=x.lstat().st_mode
  if not(stat.S_ISREG(m)if x==p else stat.S_ISDIR(m)):raise ValueError('custody path')
 if p.stat().st_size>cap:raise ValueError('file cap')
 b=p.read_bytes()
 if len(b)>cap:raise ValueError('changed cap')
 return b

def main():
 try:
  if len(sys.argv)!=3:raise ValueError('approvals')
  cb=bounded(HERE/'CATEGORY-CONTRACT.json',200000);c=json.loads(cb);cs=digest(cb);ss=digest(bounded(HERE/'category_builder.py',100000))
  if digest(bounded(HERE/'cohort.py',100000))!=c['cohort_source_sha256']:raise ValueError('cohort source pin')
  if c['source_sha256']!=ss or c['launcher_sha256']!=digest(bounded(__file__,100000)):raise ValueError('source binding')
  pp,rp=[Path(p).absolute()for p in sys.argv[1:]];peer=json.loads(bounded(pp,10000));root=json.loads(bounded(rp,10000))
  if peer!={'schema_version':1,'verdict':'ACCEPTED_SOURCE_CATEGORY_AGGREGATOR','reviewer_engine':'claude','source_sha256':ss,'contract_sha256':cs,'scope':'fixed_six_completed_addendum_full1500_official_categories_no_publication'}:raise ValueError('peer')
  expected={'owner','scope','source_sha256','contract_sha256','public_handcheck_count','public_handcheck_verdict','raw_labels_sha256','ruled_labels_sha256','validation_sha256','handcheck_receipt_sha256','raw_labels_path','ruled_labels_path','validation_path','handcheck_receipt_path','output_path'}
  if set(root)!=expected or root['owner']!='fastlane-v16-finish-20261009'or root['scope']!='BUILD_ACTUAL_COMPLETED_CATEGORIES'or root['source_sha256']!=ss or root['contract_sha256']!=cs or root['public_handcheck_count']!=75 or root['public_handcheck_verdict']!='PASS':raise ValueError('root')
  refs=[(c['gold_host'],'/custody/gold.jsonl',c['gold_sha256']),(c['public_results_host'],'/custody/public-results.json',c['public_results_sha256'])]
  refs +=[(r['raw_path'],'/custody/'+r['key']+'.jsonl',r['raw_sha256'])for r in c['completed']]
  for n,d in [('raw_labels','raw-labels.jsonl'),('ruled_labels','ruled-labels.jsonl'),('validation','validation.json'),('handcheck_receipt','handcheck.json')]:refs.append((root[n+'_path'],'/custody/'+d,root[n+'_sha256']))
  for p,_,h in refs:
   if not isinstance(h,str)or len(h)!=64 or digest(bounded(p))!=h:raise ValueError('actual input pin')
  for p in c['source_files'].values():
   if digest(bounded(p['path'],500000))!=p['sha256']:raise ValueError('source file')
  sys.path.insert(0,str(HERE))
  from cohort import protected_output_path
  out=protected_output_path(root['output_path'])
  for p in(*reversed(out.parent.parents),out.parent):
   if not stat.S_ISDIR(p.lstat().st_mode):raise ValueError('output parent')
  out.mkdir(mode=0o700,exist_ok=False)
  a=['/usr/bin/bwrap','--unshare-net','--unshare-pid','--unshare-ipc','--unshare-uts','--die-with-parent','--new-session','--clearenv','--setenv','JEV_NOUL_METHOD','O1S','--proc','/proc','--dev','/dev','--tmpfs','/tmp']
  for p in('/usr','/lib','/lib64','/etc/ld.so.cache'):
   if Path(p).exists():a+=['--ro-bind',p,p]
  for name,p in c['source_files'].items():
   target='/label/'+name if name in('protected_transform.py','taxonomy.py')else '/score/'+name
   a+=['--ro-bind',p['path'],p['path'],'--ro-bind',p['path'],target]
  for n in('category_builder.py','cohort.py','CATEGORY-CONTRACT.json'):a+=['--ro-bind',str(HERE/n),str(HERE/n)]
  for p,target,_ in refs:a+=['--ro-bind',p,target]
  a+=['--ro-bind',str(pp),'/approval/peer.json','--ro-bind',str(rp),'/approval/root.json','--bind',str(out),'/output','--chdir','/tmp','/usr/bin/python3','-I','-B',str(HERE/'category_builder.py'),'/approval/peer.json','/approval/root.json']
  r=subprocess.run(a,env={'PATH':'/usr/bin:/bin','OPENAI_API_KEY':''},capture_output=True,timeout=180)
  if r.returncode or r.stderr or r.stdout!=b'ACTUAL_CATEGORIES_PROTECTED_OUTPUT_READY\n':raise ValueError('isolated execution')
  print('ACTUAL_CATEGORY_AGGREGATION_READY');return 0
 except Exception:
  print('ACTUAL_CATEGORY_AGGREGATION_HELD',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
