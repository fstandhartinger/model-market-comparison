"""Bind aggregate audits and existing raws in place; never output item fields."""
import json,pathlib,hashlib,copy,re
from pricing_reference_v1711 import reference
from recount_gate_v1711 import check_recount
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];R=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake')
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
old={s['key']:s for s in L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-results.json')['systems']};entries={};pins={}
for k in L(J/'inputs/KEYS.json'):
 tuned=k.endswith('tuned-commit');s=old[k];ap=I/f'workers/locate-decisio-gemma/out-lead/audit-{k}.json';a=L(ap);check_recount(k,a)
 assert a['items_with_nonzero_residual']==a['pad_sum']==0
 n=1485 if tuned else 1477;native=715443 if tuned else 664759;eng=831272 if tuned else 779965
 assert a['native_usage_sum']==native and a['native_output_sum']==n
 assert a['engine_sum_common_1485' if tuned else 'engine_sum_common']==eng
 assert s['cost']['common_basis']['n_items']==n and s['cost']['kind']=='estimate'
 assert abs(s['cost']['usd_per_1000']-a['usd_per_1000']['published_native_common'])<1e-15
 allold=a['usd_per_1000']['published_native_all_1500' if tuned else 'published_native_all_items'];assert abs(allold-s['cost']['common_basis']['usd_per_1000_all_items'])<1e-15
 if tuned:
  en=copy.deepcopy(L(I/'r24-score/field-r14a/REGISTRY.json')[k]);raw=pathlib.Path(L(I/'r24-score/ENTRIES-R14A-LEAD.json')[k]['raw']);draw='v1.6-regular-20261012'
 else:
  en=copy.deepcopy(L(R/'r160/v170/bases/pool/registry.json')[k]);raw=R/f'r160/v170/bases/pool/runs/{k}.jsonl';draw='v1.6.0'
 # Preserve the explicit sibling listing from the published basis; do not register a base key.
 if '12b' in k:en['explicit_reference']=re.search(r'google/gemma-3-12b-it',s['cost']['basis']).group()
 ref=reference(k,en);cost=(eng*ref['in']+n*ref['out'])/1e6/n*1000;allcost=(eng*ref['in']+n*ref['out'])/1e6/1500*1000
 assert abs(cost-a['usd_per_1000']['engine_common'])<1e-15
 assert abs(allcost-a['usd_per_1000']['engine_all_1500' if tuned else 'engine_all_items'])<1e-15
 label=f"reference {ref['listing']} (nearest listed 12B Gemma sibling; google/gemma-4-12B-it has no listing)" if '12b' in k else ref['listing']
 text=f"ESTIMATE; {label} at USD {ref['in']:.2f}/{ref['out']:.2f} per million input/output tokens. Billed on engine-processed input (decisio adds a system turn and chat template, +78 tokens per answered item, that its own usage does not report); offline per-item recount, residual 0; corrected in v1.7.11 from the earlier usage-based USD {s['cost']['usd_per_1000']:.6f}/1k. Exact engine input {eng:,} tokens and output {n:,} tokens on this row's own {n:,}-item common basis; USD {cost:.6f}/1k common and USD {allcost:.6f}/1k all 1,500."
 if tuned:text+=' The exact recount includes one token-boundary merge: 1,484 increments of 78 tokens and one of 77.'
 if tuned or k.endswith('v090'):
  wt=a['warmup_tokens_est'];wc=a['usd_per_1000']['engine_incl_warmup_est_common'];text+=f' Decisio also sends one registration prefill per new state boundary; an offline estimate (about {wt:,} tokens; USD {wc:.6f}/1k if billed) is not exact and not a lower bound, so it is disclosed, not priced.'
 text+=' Estimated model tariff, not charged usage or a host quote.'
 en.update(price_in_per_m=ref['in'],price_out_per_m=ref['out'],cost_kind='estimate',cost_basis=text,source='pod')
 en.pop('usd_per_1000_override',None)
 entries[k]={'entry':en,'raw':str(raw),'release_dir':f'/home/flori/jevbench-sealed/v1.6-run/{draw}','seed':s['v16']['ci95']['seed'],'g_med':s['v16']['g_med_used'],'engine_input':eng,'output':n,'common_n':n,'common_cost':cost,'all_cost':allcost}
 pins[k]={'audit_path':str(ap),'audit_sha256':sha(ap),'raw_path':str(raw),'raw_sha256':sha(raw),'raw_verified_in_place':True,'price_reference':ref,'published_cost':s['cost'],'draw':draw,'engine_input':eng,'output':n,'native_input':native,'answered':n}
put(J/'inputs/ENTRIES.json',entries);put(J/'receipts/INPUTS.json',pins)
print('PASS four audit bindings, exact engine totals, published cost denominators and resolved references; raws hashed in place')
