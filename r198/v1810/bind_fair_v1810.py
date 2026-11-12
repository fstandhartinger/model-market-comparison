#!/usr/bin/env python3
"""Release-owner helper: bind the independent fairness receipt workers/r276-v1810-recheck/RESULT.json into inputs/APPROVAL.json and
rebuild (rebuild_v1810.sh). Only a FAIR verdict binds; PENDING, SUSPICIOUS or anything else is refused (a non-FAIR verdict needs the
release owner's decision, not this helper). --dry-run prints what would be bound and changes nothing."""
import argparse,hashlib,json,os,pathlib,subprocess
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--dry-run',action='store_true');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;JOB=pathlib.Path(os.environ.get('JEV_FAIR_ROOT','/home/flori/jobs/jevbench-add-requests-20260919'));REL='workers/r276-v1810-recheck/RESULT.json'
fp=JOB/REL
if not fp.is_file():ap.error('REFUSED: fairness receipt missing: '+str(fp))
r=json.loads(fp.read_text());v=r.get('fairness',r.get('verdict'))
if v!='FAIR':ap.error(f'REFUSED: fairness verdict {v!r} is not FAIR; nothing bound (release-owner decision needed)')
p=J/'inputs/APPROVAL.json';a=json.loads(p.read_text())
new={'path':REL,'verdict':'FAIR','sha256':hashlib.sha256(fp.read_bytes()).hexdigest(),'engine':str(r.get('engine','unrecorded'))}
if A.dry_run:print(json.dumps({'dry_run':True,'would_bind':new,'current':a['fairness_check']},indent=1));raise SystemExit
a['fairness_check']=new;p.write_text(json.dumps(a,indent=1,sort_keys=True)+'\n')
subprocess.run(['bash',str(J/'rebuild_v1810.sh')],check=True)
print(json.dumps({'bound':new},indent=1))
