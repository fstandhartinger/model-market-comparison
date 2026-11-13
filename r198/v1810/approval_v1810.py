"""Fail-closed approval binding shared by release-owner helpers (flip, freeze, seal).
v1.8.10 ranks the 27 Oct draw's priced rows, so top fives change: the fair top-five GO (Florian rule 25 Oct 2026, '3 ja') applies only with a bound
independent FAIR fairness receipt (workers/r276-v1810-recheck/RESULT.json, bound by bind_fair_v1810.py). While the receipt is PENDING (or not FAIR)
every helper refuses."""
import hashlib,json,os,pathlib
# JEV_FAIR_ROOT exists only for the synthetic .pass tree's dry runs; the default is the job directory.
JOB=pathlib.Path(os.environ.get('JEV_FAIR_ROOT','/home/flori/jobs/jevbench-add-requests-20260919'))
STATUS='GO (fair top-five change, Florian rule 25 Oct 2026; strong-anchor equating of the 27 Oct draw)'
REL='workers/r276-v1810-recheck/RESULT.json'
REL_DELTA='workers/r278-delta-fair/RESULT.json'
def fair_ok(W,receipt):
 """FAIR, or FAIR_SUBSET whose reviewed configuration is exactly this build's (31 ranked rows of the draw, the same four held rows): the
 independent re-check's verdict for the accepted subset configuration."""
 v=receipt.get('fairness',receipt.get('verdict'))
 if v=='FAIR':return True
 if v!='FAIR_SUBSET':return False
 c=receipt.get('configuration') or {}
 held=json.loads((W/'r198/v1810/src/held-keys.json').read_text());ranked=json.loads((W/'r198/v1810/src/ranked-keys.json').read_text())
 return sorted(c.get('held') or [])==sorted(held) and c.get('ranked_d1027')==len(ranked)==31
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
 assert sorted(proof['equated_rows'])==sorted(json.loads((W/'r198/v1810/src/equated-keys.json').read_text())) and sorted(proof['new_rows'])==json.loads((W/'r198/v1810/src/new-keys.json').read_text())==['gemini-decision-1']
 fair=a['fairness_check']
 assert fair.get('path')==REL,'fairness receipt path'
 assert fair.get('verdict')=='FAIR','REFUSED: fairness check PENDING or non-FAIR; bind a FAIR receipt with bind_fair_v1810.py first'
 fp=JOB/fair['path'];assert fp.is_file() and sha(fp)==fair.get('sha256'),'fairness receipt missing or changed'
 receipt=json.loads(fp.read_text());assert fair_ok(W,receipt),'fairness receipt content must be FAIR (or FAIR_SUBSET of exactly this configuration)'
 # The added row (gemini-decision-1) needs its own bound FAIR delta review on top of the reviewed configuration.
 d=a.get('fairness_check_delta') or {}
 assert d.get('path')==REL_DELTA,'delta fairness receipt path'
 assert d.get('verdict')=='FAIR','REFUSED: delta fairness check (added row) PENDING or non-FAIR; bind it with bind_fair_v1810.py --which delta first'
 dp=JOB/d['path'];assert dp.is_file() and sha(dp)==d.get('sha256'),'delta fairness receipt missing or changed'
 dr=json.loads(dp.read_text());assert dr.get('fairness',dr.get('verdict'))=='FAIR','delta fairness receipt content must be FAIR'
 return a
