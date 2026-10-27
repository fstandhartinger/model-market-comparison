#!/usr/bin/env python3
"""Release-owner helper: bind the independent fairness receipt workers/r197-v1713-fair/RESULT.json into inputs/APPROVAL.json
and rebuild (proof, manifest and loader hashes follow). --dry-run inspects only. Refuses a non-FAIR or missing receipt."""
import argparse,hashlib,json,pathlib,subprocess
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--dry-run',action='store_true');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;JOB=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');REL='workers/r197-v1713-fair/RESULT.json'
fp=JOB/REL
if not fp.is_file():ap.error('REFUSED: fairness receipt missing: '+str(fp))
r=json.loads(fp.read_text());v=r.get('fairness',r.get('verdict'))
if v!='FAIR':ap.error(f'REFUSED: fairness verdict {v!r} is not FAIR')
p=J/'inputs/APPROVAL.json';a=json.loads(p.read_text())
a['fairness_check']={'path':REL,'sha256':hashlib.sha256(fp.read_bytes()).hexdigest(),'verdict':'FAIR','engine':r.get('engine') or 'see receipt'}
if A.dry_run:print(json.dumps({'dry_run':True,'would_bind':a['fairness_check']},indent=1));raise SystemExit
p.write_text(json.dumps(a,indent=1,sort_keys=True)+'\n');subprocess.run(['bash',str(J/'rebuild_v1713.sh')],check=True)
print(json.dumps({'bound':a['fairness_check'],'rebuilt':True},indent=1))
