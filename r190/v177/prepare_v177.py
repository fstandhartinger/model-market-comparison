"""Verify scored sources in place and retain only aggregate inputs and public prose."""
import copy,hashlib,json,pathlib,re
J=pathlib.Path(__file__).resolve().parent;I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');F=I/'field-r15a'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
ep=I/'ENTRIES-R15A-LEAD.json';assert sha(ep)=='57ad28f17f36d9a55acbcd402738a09900dc7ce12a9c4e16782a36d145f49f8d'
source=L(ep);local=L(J/'inputs/ENTRY-D1A.json') if (J/'inputs/ENTRY-D1A.json').exists() else copy.deepcopy(source)
prereg=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r41-d1a/PREREG-D1A.md').read_text()
D={};R={}
for k,e in source.items():
 size='E4B' if k.endswith('e4b') else 'E2B';base={'E4B':'411aa17b749aa952df1359d2dcea73917a544d9a','E2B':'d29ff6b45f081a49ee2733a859c9c9c2d95d1a6f'}[size]
 raw=pathlib.Path(e['raw']);expected={'E4B':'b36371977e3f42a468661b344adad52f90e47f5329c8d68173e09106c5875fc9','E2B':'096aa845907522066407d999951a499c4b66e3782d9d83b09a823e9219af0877'}[size];assert sha(raw)==expected
 en=local[k]['entry'];assert 'base_model' not in en and e['entry']['revision'] in prereg and base in prereg
 # Use the scorer's substituted basis, then remove internal workflow terminology.
 basis=L(F/f'out-v17-share/{k}.json')['cost']['basis']
 basis=basis.replace(' (release-owner ruling, the AUBIN shape)','').replace('r168 re-freeze','re-freeze').replace('identity line authorised by the release owner; ','')
 en['cost_basis']=basis
 en['licence']=f'Apache-2.0 declared on the pinned Hugging Face card and metadata; no standalone LICENSE file in the pinned tree. The author GitHub code declares Apache-2.0. Base google/gemma-4-{size} and dataset obligations also apply.'
 en['code_revision']=f"Author server jonpol01/d1a@aa35ec9928157bba999ccdcf1f4929403ebb0789, run unmodified using its native /v1/systemone endpoint and PyTorch BF16. JohnP1/d1a-{size.lower()}@{en['revision']} is an unmerged LoRA with adapter dimension 16 plus a fp32 pointer head and learned temperature on google/gemma-4-{size}@{base}. No quantisation, vLLM or SGLang. The checkpoint's learned temperature and server defaults were used; feedback, learning, prefix cache, CUDA graphs, fused kernels, date facts and chat logging were disabled. No request use_case was injected. Dependencies were pinned and installed offline; author source and weights ran on isolated rented hardware with networking disabled."
 maxsec='20.6' if size=='E4B' else '16.2'
 en['disclosure']=f"First measurement of JohnP1/d1a-{size.lower()}, a Jev-compatible model. The native server returns probabilities for choice, noul and score using a pointer head, without text generation. Adapter and head hashes differ from the other measured Gemma 4 E2B/E4B siblings checked; byte distinctness does not establish independent training. The pinned card and training metadata describe general decisions, developer-tool tasks, long documents, Japanese JGLUE, routing and pull-request labels, with calibration fitted on decision-v7 calibration data and PR-label development data. These are author statements. Training examples and overlap with JevBench were not independently checked. Apache-2.0 is declared on the pinned cards and metadata; no standalone LICENSE file is present in the pinned model trees. The author's server truncates state to its first 65,536 tokens (including BOS and the state delimiter; a question row may use up to 73,728 tokens). Exactly 15 items were answered using a truncated prompt. All 1,500 requests returned HTTP 200 with probability answers; no refusals or errors occurred. Exactly those 15 truncated items exceeded 10 s (maximum {maxsec} s); the v1.7 share view counts them as wrong answers with zero calibration. Frozen/off views have no time limit. Server-native input usage after truncation matched the independent tokenizer count on every request; native nonzero output usage counts the serialized probability answer and is priced as reported. Cost is an ESTIMATE, not charged usage or a host quote. The common cost basis excludes the same 15 long items for every row. Self-hosted latency uses the common assumption 2 times measured p50 plus 0.15 s. A 50-request repeat check had identical probabilities and zero argmax flips."
 en['endpoint_condition']='Measured 26 Oct 2026 on one rented NVIDIA RTX PRO 6000 Blackwell Server Edition 96 GB in Finland over loopback. The two models ran sequentially in fresh isolated containers with source, weights and inputs read-only, no credentials and networking disabled. GPU rental is separate from the estimated model tariff.'
 d={'registry':{f:v for f,v in L(F/'REGISTRY.json')[k].items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']},'measured_on':'2026-10-26','raw_sha256':expected,'model_pin':en['repo'].removeprefix('https://huggingface.co/')+'@'+en['revision']+f' + google/gemma-4-{size}@{base}'}
 d['registry']['licence']=en['licence']
 r={'entry_path':str(ep),'entry_sha256':sha(ep),'raw_sha256':expected,'raw_verified_in_place':True,'registry_sha256':sha(F/'REGISTRY.json'),'prereg_sha256':sha(pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r41-d1a/PREREG-D1A.md'))}
 expectednums={'E4B':[[51.68,20.31,83.05,92.60,60.61,7.45],[51.11,19.91,82.30,92.43,60.61,7.07]],'E2B':[[45.93,8.98,82.87,93.31,60.62,0.86],[45.49,8.86,82.13,93.27,60.62,0.82]]}[size]
 for mode in ['frozen','v17-off','v17-share']:
  p=F/f'out-{mode}/jevbench-v1.6.0-results.json';s=copy.deepcopy(next(s for s in L(p)['systems'] if s['key']==k))
  assert [round(x,2) for x in [s['capability'],s['axes']['intelligence'],s['axes']['calibration'],s['axes']['speed'],s['axes']['cost'],s['scores']['A']]]==expectednums[mode=='v17-share'],'STOP scored numbers differ'
  assert s['status']['rows']==s['status']['answered_ok']==1500 and s['cost']['kind']=='estimate'
  assert 'base_model' not in s
  s['cost']['basis']=en['cost_basis'];s.update({f:en[f] for f in ['display','author','licence','disclosure','code_revision','endpoint_condition'] if f in s});d[mode]=s;r[mode]={'path':str(p),'sha256':sha(p)}
 assert d['v17-share']['decision_limit']['n_over_limit']==15
 for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','validity','cost','status','support']:assert d['frozen'][f]==d['v17-off'][f],f
 D[k]=d;R[k]=r
assert not re.search(r'\{[A-Za-z_][A-Za-z0-9_]*\}',json.dumps([local,D]))
put(J/'inputs/ENTRY-D1A.json',local);put(J/'src/inputs.json',D);put(J/'receipts/INPUTS.json',R)
print('PASS two source/raw SHA pins, prereg model/base revisions, exact required scores, 1500 answers each, 15 timeouts each, frozen/off parity, substituted public cost text')
