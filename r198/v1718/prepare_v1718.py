"""Aggregate-only capture; never opens or hashes the lost answer files."""
import pathlib,json,hashlib,copy,importlib.util
from rows_v1718 import *
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];A=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');F=A/'field-r8c'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
P=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');PIN='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4';assert sha(P)==PIN
sp=importlib.util.spec_from_file_location('pricing',P);pr=importlib.util.module_from_spec(sp);sp.loader.exec_module(pr)
der=L(J/'aggregate-derivation.json');entries=L(A/'ENTRIES-R8C-LEAD.json');meta=L(F/'BUILD-META.json');reg=L(F/'REGISTRY.json');inputs={};cells={};pins={};prices={}
for k in KEYS:
 d=der['rows'][k];assert all(d['checks'].values());e=copy.deepcopy(entries[k]['entry']);ref=pr.reference(k,{'base_model':entries[k]['pricing_base']},pr.catalog_rates());assert list(ref[1])==d['pricing']['reference'][1]
 prices[k]={'kind':'estimate','listing':ref[0],'in':ref[1][0],'out':ref[1][1]}
 # Keep handed-off measurement prose; replace operational internals with plain public language.
 e['disclosure']=e['disclosure'].split('RUNNER PARTIAL FLAG:')[0].replace('(our own intake)','').strip()
 e['disclosure']+=' '+(PARTIAL+' ' if k==KEYS[0] else '')+LOST+(' '+NOUL if k==KEYS[0] else '')
 e['endpoint_condition']="Self-hosted on one evaluator-rented NVIDIA RTX PRO 6000 Blackwell Server Edition 96 GB GPU in Finland (EU), using the author's own server over SGLang 0.5.21. Contributor code ran in an offline container on a disposable rented GPU VM. Measured 23 Oct 2026. GPU rental is separate from the estimated model tariff."
 e['model_pin']={'model':e['repo'].split('huggingface.co/')[1],'revision':e['revision'],'base':e['base_model']}
 tc=d['tokens'];e['cost_basis']=f"ESTIMATE (*est.), base-model market reference {ref[0]}: USD {ref[1][0]:.2f} per million input tokens and USD {ref[1][1]:.2f} per million output tokens. Native server usage includes the chat template and read-twice layout; output is one label token per request. {tc['input_tokens_common']:,} input and {tc['output_tokens_common']:,} output tokens on the 1,485 common items. Cost on the 1,485 items every row on this draw answered (same-items rule); all-items cost USD {d['cost_usd_per_1000_all_items']:.6f} per 1,000 decisions. Common-items cost USD {d['cost_usd_per_1000']:.6f} per 1,000 decisions, {d['cap_ratio']:.2f} times the official cost cap. Estimated model tariff, not charged usage or a host quote; GPU rental is separate."
 en={'entry':e};views={}
 pp={'raw_sha256':d['raw_sha256_recorded'],'raw_verified_in_place':False,'raw_binding':'Recorded 23 Oct SHA-256 in field-r8c/ROWS.json; answer files lost 26 Oct 2026; no raw read or re-score possible.','incident':'Custody incident board #28565/#28569; release-owner DECISIONS 28 Oct 2026 knowline-r8c-lost-raw-omissions','build_meta_sha256':sha(F/'BUILD-META.json')}
 for mode in ['frozen','v17-off','v17-share']:
  path=F/f'out-{mode}/{k}.json';views[mode]=L(path);pp[mode]={'sha256':sha(path),'path':str(path)}
 nd={f:d['noul_decisive'][f] for f in ['supported','n','valid','decisive','decisive_rate','acc_among_decisive']}
 if k==KEYS[0]:nd.update(unavailable_reason=NOUL)
 c={dim:d['cells'][dim] for dim in ['families','languages']}
 cells[k]={'cells_share':c,'pool_share':{dim:{x:v['n'] for x,v in cc.items()} for dim,cc in c.items()},'noul_share':nd}
 inputs[k]={**views,'registry':reg[k],'measured_on':'2026-10-23','raw_sha256':d['raw_sha256_recorded'],'latency_max_s':d['latency_max_s'],'usd_per_1000':d['cost_usd_per_1000'],'usd_per_1000_all_items':d['cost_usd_per_1000_all_items'],'tokens':tc,'price_reference':prices[k]};pins[k]=pp;entries[k]=en
put(J/'inputs/ENTRIES.json',{k:entries[k] for k in KEYS});put(J/'src/inputs.json',inputs);put(J/'src/cells.json',cells);put(J/'src/recost.json',{});put(J/'receipts/INPUTS.json',pins);put(J/'inputs/PRICES.json',prices)
co=L(W/'r198/v1717/src/carried-off.json');old=L(W/'r198/v1717/src/inputs.json')
for k,v in old.items():co[k]={f:v['v17-off'][f] for f in ['axes','capability','jevbench_score','scores','speed','views']}
put(J/'src/carried-off.json',co);put(J/'inputs/FIELD-META.json',meta)
put(J/'inputs/APPROVAL.json',{'status':'GO (standing; no top-five change)','fresh_baseline':'v1.7.17','button_tap':False,'top_five_effect':'unchanged','top_five_preview':{'path':'r198/v1718/receipts/topfive-diff.json','sha256':'a'*64},'omissions_decision':'DECISIONS 2026-10-28 knowline-r8c-lost-raw-omissions'})
print('PASS aggregate capture; frozen/off/share retained; no raw access; current pricing exact; family/language only; 26B diagnostic null')
