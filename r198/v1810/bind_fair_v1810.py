#!/usr/bin/env python3
"""Release-owner helper: bind an independent fairness receipt into inputs/APPROVAL.json and rebuild (rebuild_v1810.sh).
--which earlier (default): workers/r276-v1810-recheck/RESULT.json, the re-check of the reviewed configuration (31 ranked, 4 held). It binds on FAIR, or on
  FAIR_SUBSET when the receipt's reviewed configuration is exactly this build's (same four held rows, 31 ranked rows of the draw).
--which delta: workers/r278-delta-fair/RESULT.json, the delta review of the added row gemini-decision-1. Only FAIR binds.
PENDING, SUSPICIOUS or anything else is refused (a non-FAIR verdict needs the release owner's decision, not this helper). Every release-owner helper
(flip, freeze, seal) refuses until BOTH receipts are bound. --dry-run prints what would be bound and changes nothing."""
import argparse,hashlib,json,os,pathlib,subprocess,sys
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--dry-run',action='store_true');ap.add_argument('--which',choices=['earlier','delta'],default='earlier');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];JOB=pathlib.Path(os.environ.get('JEV_FAIR_ROOT','/home/flori/jobs/jevbench-add-requests-20260919'))
sys.path.insert(0,str(J));from approval_v1810 import REL,REL_DELTA,fair_ok
rel,field=(REL,'fairness_check') if A.which=='earlier' else (REL_DELTA,'fairness_check_delta')
fp=JOB/rel
if not fp.is_file():ap.error('REFUSED: fairness receipt missing: '+str(fp))
r=json.loads(fp.read_text());v=r.get('fairness',r.get('verdict'))
ok=fair_ok(W,r) if A.which=='earlier' else v=='FAIR'
if not ok:ap.error(f'REFUSED: {A.which} fairness verdict {v!r} is not bindable; nothing bound (release-owner decision needed)')
p=J/'inputs/APPROVAL.json';a=json.loads(p.read_text())
new={'path':rel,'verdict':'FAIR','sha256':hashlib.sha256(fp.read_bytes()).hexdigest(),'engine':str(r.get('engine','unrecorded'))}
if v!='FAIR':new['receipt_fairness']=v
if A.which=='delta':new['scope']=a[field].get('scope')
if A.dry_run:print(json.dumps({'dry_run':True,'which':A.which,'would_bind':new,'current':a[field]},indent=1));raise SystemExit
a[field]=new;p.write_text(json.dumps(a,indent=1,sort_keys=True)+'\n')
subprocess.run(['bash',str(J/'rebuild_v1810.sh')],check=True)
print(json.dumps({'bound':new,'which':A.which},indent=1))
