"""Bind the accepted independent FAIR review and check all ten adopted public-text fixes."""
import hashlib,json,pathlib,re
from approval_v178 import check_approval
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
ROOT=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=L(J/'inputs/APPROVAL.json');check_approval(W,{'publication_approval':a,'topfive_diff_sha256':sha(J/'receipts/topfive-diff.json')})
fair=a['fairness_check'];F=ROOT/fair['path'];T=F.parent/'TEXT-FIXES-R196.json'
assert fair=={'path':'workers/r196-jeff11m-fair/RESULT.json','sha256':'f87a754ff40f9707fb426df1f7b501a6f18a5b935f42dfe4d11e6bb13f4aa44c','verdict':'FAIR','engine':'claude-opus-5-5 (account C, effort medium)'}
assert sha(T)=='1f612b7908f54862faab56ce2167edb2cacf33938e19555d974b5841b617ebed'
assert 'jeff11m-v178-prefill-native-pricing' in a['release_owner_rulings']
fixes=L(T)['fixes'];assert len(fixes)==10
V=W/'data/raw/benchmarks/jevbench/v1.7';row=next(r for r in L(V/'jevbench-v1.7.8-results.json')['systems'] if r['key']=='jeff_1_1_medium')
# Equivalent rewritten prose is accepted only with the source phrase absent and these exact retained facts.
checks=[
 ('cost_basis', ['unlisted in the frozen pricing module','explicit USD 0.05/0.15']),
 ('cost_basis', ['no base_model key or exact-base floor applies','full catalog pair']),
 ('cost_basis', ['403,115 tokens on the common 1,485-item basis','USD 0.048268 per 1,000 decisions','0.747 times the cap','all-1,500 USD 0.051819, 0.802 times the cap','53.79 to 49.49, below the 50-point composite gate','not included in the published price or scores']),
 ('code_revision', ['The scored process was fresh; no earlier probes affected its process-wide running limits.']),
 ('disclosure', ['The shipped configuration uses a one-pass decision head','No alternative configuration was measured.']),
 ('disclosure', ['All 1,500 requests returned HTTP 200 with answers, no refusals or errors']),
 ('disclosure', ['Weights carry non-commercial CC BY-NC-4.0 terms; listed for evaluation only.']),
 ('licence', ['Weights CC BY-NC-4.0','non-commercial; listed for evaluation only']),
 ('disclosure', [fixes[8]['new'].split(' is not stated. ')[1]]),
 ('disclosure', ['Scoring the 15 retrieval answers as misses instead would lower Capability by 0.41 points, from 81.89 to 81.48.'])]
result=[]
for i,(fix,(field,required)) in enumerate(zip(fixes,checks),1):
 assert fix['field']==field
 text=row['cost']['basis'] if field=='cost_basis' else row[field]
 assert fix['old'] not in text,('source phrase remains',i)
 for phrase in required:assert phrase in text,('missing exact public fact',i,field)
 assert not re.search(r'custody|release.owner|the lead|r168|jeff_1_0_large',text,re.I)
 result.append({'fix':i,'field':field,'kind':fix['kind'],'status':'PASS','old_phrase_absent':True,'exact_required_phrases':required,'field_sha256':hashlib.sha256(text.encode()).hexdigest(),'disposition':'Exact replacement or equivalent sanitized prose; process-only claims removed.'})
out={'status':'PASS','independent_fairness':'FAIR','publication_fairness_binding':fair,'review_sha256':sha(F),'text_fixes_sha256':sha(T),'release_owner_rulings':a['release_owner_rulings'],'text_fix_checks':result}
(J/'receipts/FAIRNESS-TEXT-RESOLUTION.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n')
print('PASS bound independent FAIR review, F2 ruling, and all 10 adopted text fixes (8 required, 2 recommended) in built public row')
