"""Standing no-change or fair-change approval; real helper refuses unbound FAIR."""
import hashlib,json,pathlib

def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();a=proof['publication_approval']
 assert a['fresh_baseline']=='v1.7.10' and a['button_tap'] is False
 preview=W/a['top_five_preview']['path'];assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 d=json.loads(preview.read_text());assert d['lists']==580 and not d.get('bootstrap')
 assert set(x['key'] for x in a['asks'])==set(proof['repriced_rows'])
 if not d['changed']:
  assert a['status']=='GO (standing, no top-five change)' and a['top_five_effect']=='unchanged';return a
 assert a['status']=='GO (fair top-five change, Florian rule 25 Oct 2026)' and a['top_five_effect']=='changed'
 assert a['go']=={'channel':'laptop chat','date':'2026-10-25','quote':'3 ja','recorded_in':'DECISIONS.md 2026-10-25 setup-review-open-questions-answered'}
 f=a['fairness_check'];assert f['verdict']=='FAIR','REFUSED: fairness PENDING or non-FAIR; bound FAIR required'
 p=pathlib.Path(f['path']);p=p if p.is_absolute() else pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')/p
 assert p.is_file() and sha(p)==f.get('sha256'),'fairness receipt missing or changed'
 r=json.loads(p.read_text());assert r.get('fairness',r.get('verdict'))=='FAIR'
 return a
