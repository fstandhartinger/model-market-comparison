"""CR-281: aggregate-only v1.5.7 projection; no inference or existing score changes."""
import copy, hashlib, importlib.util, json, subprocess
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = R / 'data/raw/benchmarks/jevbench/v1.5'
Z = Path('/home/flori/jobs/jevbench-add-requests-20260919/r45')
h = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
zp = Z / 'outputs/RESULTS-r45-A3-candidates-headlineA.json'
z = load(zp); pin = z['pin_records']['open-jev-zefan-27b-v1.1']
assert h(pin['raw']) == pin['raw_sha256']
assert h(Z / 'PINS-R45-SCORING.json') == z['pins_sha256']
assert z['rows']['open-jev-zefan-27b-v1.1']['scores'] == load(Z / 'receipts/SCORES-R45.json')['open-jev-zefan-27b-v1.1']
meta = load(Z / 'outputs/meta/open-jev-zefan-27b-v1.1.json')
assert h(Z / 'outputs/meta/open-jev-zefan-27b-v1.1.json') == z['meta_sha256']['open-jev-zefan-27b-v1.1']['sha256']
spec = importlib.util.spec_from_file_location('convert', '/home/flori/jobs/jevbench-v15-measure-20260925/site-preview/convert_v15.py')
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)
parent = D / 'jevbench-v1.5.6-results.json'; old = load(parent); a = copy.deepcopy(old)
a.update(revision='v1.5.7', parent_release={'revision': 'v1.5.6', 'sha256': h(parent)})
assert z['G_med_frozen'] == a['G_med'] == 5.186627500079243
new = []
for k, source, metadata in [
    ('open-jev-zefan-27b-v1.1', z, {'author':'Zefan Cai', 'repo':'https://huggingface.co/ZefanCai/Open-Jev-27B-v1.1', 'class':'jev-rebuild', 'licence':'Apache-2.0', 'open':'open weights', 'underlying':'Qwen3.8-27B (lineage verified by architecture)'})]:
    assert k not in {s['key'] for s in a['systems'] + a['not_measured']}
    s = copy.deepcopy(source['rows'][k]); s['addendum'] = 'A8'
    row = C.project_row(k, s, metadata)
    row.update(ranked=True, listing='ranked', not_ranked_because=None, ranks={}, rank=None, last_measured_on='2026-10-03')
    assert row['axes'] == s['axes'] and row['scores'] == s['scores'] and row['cost']['usd_per_1000'] == s['cost']['usd_per_1000']
    row['model_pin'] = 'HF ZefanCai/Open-Jev-27B-v1.1@28cf73067d5b337860bbef3c85b8b82ba8730956; base Qwen/Qwen3.8-27B@1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0; author loader Zefan-Cai/Open-Jev@3308a15ccd7eea1df7a37d6ddc39b023b801ba16'
    row['endpoint_condition'] = 'Self-hosted author loader, Transformers reference path on RTX PRO 6000 Blackwell; speed is a LOWER BOUND: flash-linear-attention and causal-conv1d kernels were not installed. The author documents the kernel path as answer-identical. Each candidate is encoded independently, producing high input-token usage.'
    row['cost']['basis'] = 'Frozen BASE_REFERENCES Qwen/Qwen3.8-27B market price (USD 0.42/M input, 3.00/M output) applied to 2,767,510 input tokens and zero output tokens over 1,624 decisions; self-hosted estimate, not measured hosted billing. Lineage verified by architecture; no pricing gate. The author method encodes each candidate independently.'
    row['provenance'] = {'raw_sha256':pin['raw_sha256'], 'result_sha256':h(zp), 'pins_sha256':z['pins_sha256'], 'meta_sha256':z['meta_sha256'][k]['sha256'], 'scorer_manifest_sha256':z['scorer_manifest']['sha256'], 'verified_harness_sha256':z['verified_harness_sha256'], 'revision':row['model_pin']}
    new.append(row)
a['systems'].extend(new); by = {s['key']:s for s in a['systems']}
for o in 'ABC':
    pos = {k:i for i,k in enumerate(a['board'][o]['order'])}
    order = sorted([s['key'] for s in a['systems'] if s['listing']=='ranked'], key=lambda k:(-by[k]['scores'][o],pos.get(k,100000),k))
    for i,k in enumerate(order):
        by[k]['ranks'][o]=i+1
        if o=='A':by[k]['rank']=i+1
    adj=set(zip(order,order[1:]));a['board'][o]['order']=order
    a['board'][o]['markers']=[m for m in a['board'][o]['markers'] if (m['upper'],m['lower']) in adj]
a['n_ranked']=sum(s['listing']=='ranked' for s in a['systems']);a['roster_count']=len(a['systems'])+len(a['not_measured'])
a['addendum_sources_sha256'].update(A8_open_jev_run45=h(zp))
a['revision_note']="One row joins on the unchanged frozen v1.5 protocol: Open-Jev-27B-v1.1 from add-requests run 45, self-hosted at the frozen Qwen3.8-27B reference price. Open-Jev speed is a lower bound on the Transformers reference path without flash-linear-attention/causal-conv1d kernels; independent candidate encoding increases input tokens. All existing rows, scores, intervals, prices and method are unchanged."
a['paired_comparison_note']='No new paired-bootstrap comparisons for the Open-Jev-27B-v1.1 addendum from add-requests run 45. Prior markers remain only for still-adjacent pairs; missing markers imply neither tie nor separation.'
# Use the actual UI classifier for eligibility, including its fallback for older rows.
js = "import {jevClassRows} from './lib/jevbench-jev-class.mjs'; import fs from 'node:fs'; const a=JSON.parse(fs.readFileSync(0,'utf8')); const c=jevClassRows(a.systems.filter(r=>r.ranked)); console.log(JSON.stringify({order:c.rows.filter(r=>r.inClass).map(r=>r.row.key), limits:c.limits, rows:c.rows.filter(r=>['open-jev-zefan-27b-v1.1'].includes(r.row.key)).map(({row,...rest})=>({key:row.key,...rest}))}));"
def cap(x):return json.loads(subprocess.check_output(['node','--input-type=module','-e',js],input=json.dumps(x).encode(),cwd=R))
bc,ac=cap(old),cap(a)
before={o:old['board'][o]['order'][:5] for o in 'ABC'};after={o:a['board'][o]['order'][:5] for o in 'ABC'}
before['Capability']=bc['order'][:5];after['Capability']=ac['order'][:5]
top={'before_v1.5.6':before,'after_v1.5.7':after,'changed':{o:before[o]!=after[o] for o in before}, 'ranks':{s['key']:dict(s['ranks'],Capability=ac['order'].index(s['key'])+1 if s['key'] in ac['order'] else None) for s in new},'capability':ac, 'n_ranked':a['n_ranked'],'rule':'No top-five change; not a paid fast-lane run; no Florian GO needed (AGENTS rule)'}
(Path(__file__).parent/'TOP-FIVE.json').write_text(json.dumps(top,indent=2)+'\n')
assert top['changed'] == {'A': False, 'B': False, 'C': False, 'Capability': False}, 'Unexpected top-five change'
(D/'jevbench-v1.5.7-results.json').write_text(json.dumps(a,indent=2)+'\n')
print(json.dumps(top))
