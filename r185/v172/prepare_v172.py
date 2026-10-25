"""Capture scored aggregates only. Raw verification is mandatory for a build.

--aggregate-only permits host-independent preview preparation without raw access;
it records raw_verified_in_place=false and cannot produce a release candidate.
"""
import argparse,copy,hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent
I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score')
P=argparse.ArgumentParser(description=__doc__);P.add_argument('--aggregate-only',action='store_true');A=P.parse_args()
L=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
k='jeetu-decider-2b';ep=I/'ENTRIES-R11A-LEAD.json'
assert sha(ep)=='318c039d19d2c659388e596e9372ae4d7a1ad2e410c460749a3e77a00fdbcdbd'
e=L(ep)[k];field=I/'field-r11a2';scored=I/'field-r11a';reg=L(field/'REGISTRY.json')[k]
assert e['entry']['ranked'] and e['price_output_zero']=='#25647' and e['zero_output'] and e['treatment']=='auto'
raw_sha='ef1f249dfbf156fb53f38028fe4d6b421b32760588a5b929f753573a8f326384'
if not A.aggregate_only:assert sha(pathlib.Path(e['raw']))==raw_sha
r={'entry_sha256':sha(ep),'registry_sha256':sha(field/'REGISTRY.json'),'raw_sha256':raw_sha,'raw_verified_in_place':not A.aggregate_only,'raw_hash_source':'in-place verification' if not A.aggregate_only else 'HANDOFF-R11A.md; NOT independently verified on this host'}
d={'entry':{f:v for f,v in e['entry'].items() if f in ['author','base_model','display','repo','revision','licence','endpoint_kind','lane','support','ranked']},'registry':{f:v for f,v in reg.items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']},'measured_on':'2026-10-25','raw_sha256':raw_sha}
prior=L(scored/'REGISTRY.json')[k]
for f in set(prior)|set(reg):
 if f not in ['cost_basis','disclosure','code_revision','endpoint_condition','licence']:assert prior.get(f)==reg.get(f),(k,f)
for mode in ['frozen','v17-off','v17-share']:
 p=scored/f'out-{mode}/jevbench-v1.6.0-results.json'
 d[mode]=copy.deepcopy(next(s for s in L(p)['systems'] if s['key']==k))
 r[mode]={'path':str(p),'sha256':sha(p)}
 d[mode]['cost']['basis']='Original source prose pinned by scorer-file hash; public cost explanation supplied separately.'
for f in ['axes','scores','views','composite_ci95','intelligence','calibration','validity','cost','status','support']:assert d['frozen'][f]==d['v17-off'][f],f
assert d['v17-share']['v16']['ci95']['B']==1000 and d['v17-share']['decision_limit']['n_over_limit']==0
review=I.parent/'workers/prescore-r11a/RESULT.md';assert 'PASS WITH FINDINGS' in review.read_text()
r.update(pre_score_review_sha256=sha(review),pre_score_review_status='PASS_WITH_FINDINGS')
put(J/'src/inputs.json',{k:d});put(J/'receipts/INPUTS.json',{k:r})
print('Captured 1 scored aggregate row; entry SHA verified; frozen/off parity; B=1000; raw_verified_in_place='+str(not A.aggregate_only))
