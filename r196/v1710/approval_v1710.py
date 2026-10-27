"""Fail-closed approval binding shared by release-owner dry-run helpers."""
import hashlib,json,pathlib

def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']=='GO (fair top-five change, Florian rule 25 Oct 2026; paid public automatic publication)' and a['top_five_effect']=='changed','fair top-five standing GO required'
 assert a['fresh_baseline']=='v1.7.9' and a['go']['quote']=='3 ja' and a['go']['channel']=='laptop chat' and a['go']['date']=='2026-10-25' and a['button_tap'] is False
 assert a['go']['recorded_in']=='DECISIONS.md 2026-10-25 setup-review-open-questions-answered'
 preview=W/a['top_five_preview']['path']
 assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 diff=json.loads(preview.read_text());assert diff['changed'] is True and not diff.get('bootstrap',False),'fresh complete top-five preview required'
 fair=a['fairness_check']
 assert fair.get('sha256')=='0cbbcc7fa4e7404c898a24b0393773567dd7c1f14cbc27ec1455fa0914e0ae3d','wrong FAIR receipt'
 assert a.get('paid_public',{}).get('visibility')=='public' and a['paid_public']['order']=='b6b2b557','paid public rule binding'
 assert fair['verdict']=='FAIR','REFUSED: fairness PENDING or non-FAIR; non-PENDING FAIR required'
 fp=pathlib.Path(fair['path']);fp=fp if fp.is_absolute() else pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')/fp if fp.parts[0]=='workers' else W/fp
 assert fp.is_file() and sha(fp)==fair.get('sha256'),'fairness receipt missing or changed'
 receipt=json.loads(fp.read_text())
 assert receipt.get('fairness',receipt.get('verdict'))=='FAIR','fairness receipt content must be FAIR'
 return a
