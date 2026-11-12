"""Fail-closed approval binding shared by release-owner helpers (flip, freeze, seal).
v1.8.10 ranks the 27 Oct draw's priced rows, so top fives change: the fair top-five GO (Florian rule 25 Oct 2026, '3 ja') applies only with a bound
independent FAIR fairness receipt (workers/r276-v1810-fair/RESULT.json, bound by bind_fair_v1810.py). While the receipt is PENDING (or not FAIR)
every helper refuses."""
import hashlib,json,os,pathlib
# JEV_FAIR_ROOT exists only for the synthetic .pass tree's dry runs; the default is the job directory.
JOB=pathlib.Path(os.environ.get('JEV_FAIR_ROOT','/home/flori/jobs/jevbench-add-requests-20260919'))
STATUS='GO (fair top-five change, Florian rule 25 Oct 2026; strong-anchor equating of the 27 Oct draw)'
REL='workers/r276-v1810-fair/RESULT.json'
def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']==STATUS and a['top_five_effect']=='changed','fair top-five GO required'
 assert a['fresh_baseline']=='v1.8.9' and a['button_tap'] is False
 assert a['go']=={'channel':'laptop chat','date':'2026-10-25','quote':'3 ja','recorded_in':'DECISIONS.md 2026-10-25 setup-review-open-questions-answered'}
 assert a['equating_basis']['decision']=='d1027-equated-strong4-57394','release basis'
 preview=W/a['top_five_preview']['path']
 assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 diff=json.loads(preview.read_text());assert not diff.get('bootstrap',False) and diff['changed'] is True and diff['lists']==580,'fresh complete top-five preview required'
 assert sorted(proof['equated_rows'])==sorted(json.loads((W/'r198/v1810/src/equated-keys.json').read_text())) and proof['new_rows']=={}
 fair=a['fairness_check']
 assert fair.get('path')==REL,'fairness receipt path'
 assert fair.get('verdict')=='FAIR','REFUSED: fairness check PENDING or non-FAIR; bind a FAIR receipt with bind_fair_v1810.py first'
 fp=JOB/fair['path'];assert fp.is_file() and sha(fp)==fair.get('sha256'),'fairness receipt missing or changed'
 receipt=json.loads(fp.read_text());assert receipt.get('fairness',receipt.get('verdict'))=='FAIR','fairness receipt content must be FAIR'
 return a
