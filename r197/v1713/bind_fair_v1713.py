#!/usr/bin/env python3
"""Release-owner helper (v1.7.13 unranked release): verify that the independent fairness receipt workers/r197-v1713-fair/RESULT.json
is the one bound as evidence in inputs/APPROVAL.json. Its verdict SUSPICIOUS is handled by publishing the row unranked
(decision v1713-h2o141-unranked-provisional), so there is nothing to bind or rebuild; any other receipt or verdict is refused."""
import argparse,hashlib,json,pathlib
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--dry-run',action='store_true');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;JOB=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');REL='workers/r197-v1713-fair/RESULT.json'
fp=JOB/REL
if not fp.is_file():ap.error('REFUSED: fairness receipt missing: '+str(fp))
r=json.loads(fp.read_text());v=r.get('fairness',r.get('verdict'));a=json.loads((J/'inputs/APPROVAL.json').read_text())['fairness_check']
if v!='SUSPICIOUS' or a.get('verdict')!=v or a.get('path')!=REL or a.get('sha256')!=hashlib.sha256(fp.read_bytes()).hexdigest():ap.error(f'REFUSED: receipt verdict {v!r} or bytes differ from the bound evidence; the unranked release needs a new review')
print(json.dumps({'bound_evidence':a,'receipt_matches':True,'action':'none (row is unranked)'},indent=1))
