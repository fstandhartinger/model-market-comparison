"""CR-283: aggregate-only held v1.5.8; one ranked row and two configuration variants."""
import copy, hashlib, importlib.util, json, subprocess
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = R / 'data/raw/benchmarks/jevbench/v1.5'
J = Path('/home/flori/jobs/wity-jevbench-results-20261003')
W = Path('/home/flori/jevbench-sealed/v1.5/scoring/wity-f65ce826a455-20261004')
h = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
receipt_path = J / 'receipts/WITY-f65ce826a455-RUN-RECEIPT.json'
receipt = load(receipt_path)
assert receipt['build_id'] == 'f65ce826a455'
checks = {}
def verify(name, path, want):
    actual = h(path)
    assert actual == want, name
    checks[name] = {'sha256': actual, 'verified': True}
verify('adapter', J/'run/wity_reasoning_adapter.py', receipt['adapter_sha256'])
verify('runner', Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/run_v15.py'), receipt['runner_sha256'])
verify('input', receipt['input']['path'], receipt['input']['sha256'])
for mode, rec in receipt['modes'].items():
    verify(mode+'_spec', J/f'run/wity-1-{mode}.spec.json', rec['spec_sha256'])
    verify(mode+'_raw', rec['output'], rec['output_sha256'])
    for price in ['api', 'base']:
        verify(mode+'_'+price, W/f'RESULTS-wity-1-f65ce826a455-{mode}-{price}.json', rec[f'result_{price}_sha256'])
    assert rec['rows'] == rec['unique_ids'] == rec['ok'] == 1624 and rec['exit'] == 0
    assert rec['x_wity_build_counts'] == {'f65ce826a455': 1624}
    for when in ['pre', 'post']:
        health = json.loads(rec[f'health_{when}'])
        assert health['build'] == receipt['build_id'] and health['default_reasoning'] == 'off'
spec = importlib.util.spec_from_file_location('convert', '/home/flori/jobs/jevbench-v15-measure-20260925/site-preview/convert_v15.py')
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)
parent = D / 'jevbench-v1.5.7-results.json'; old = load(parent); a = copy.deepcopy(old)
a.update(revision='v1.5.8', parent_release={'revision': 'v1.5.7', 'sha256': h(parent)})
new = []
for mode in ['auto', 'always', 'off']:
    k = 'wity-1' if mode == 'auto' else 'wity-1-'+mode
    assert k not in {s['key'] for s in a['systems'] + a['not_measured']}
    api_path = W/f'RESULTS-wity-1-f65ce826a455-{mode}-api.json'
    base_path = W/f'RESULTS-wity-1-f65ce826a455-{mode}-base.json'
    w, b = load(api_path), load(base_path); rec = receipt['modes'][mode]
    assert w['G_med_frozen'] == b['G_med_frozen'] == a['G_med'] == 5.186627500079243
    for name, sha in w['scorer_sources_sha256'].items():
        p = J/'run'/name if name == 'score_wity_fresh.py' else Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness')/name
        verify('scorer_'+name, p, sha)
    s = copy.deepcopy(w['rows']['wity-1']); s['addendum'] = 'A9'; s['key'] = k
    row = C.project_row(k, s, {'author':'Wity (alphanimble)', 'repo':'https://wity.alphanimble.com', 'class':'decision-api', 'licence':'proprietary hosted API', 'open':'no', 'underlying':'Qwen3.6-35B-A3B (operator self-reported; not independently verified)'})
    row.update(display=f'wity-1 (Wity, reasoning {mode})', ranked=mode=='auto', listing='ranked' if mode=='auto' else 'variant', not_ranked_because=None if mode=='auto' else f"Configuration variant of wity-1 (request field reasoning={mode}); wity-1 (reasoning auto) is the operator's main row.", ranks={}, rank=None, last_measured_on='2026-10-04')
    # The projection may carry historical placement hints; variants have no rank in any view.
    row.pop('would_place_A', None)
    row['adapter_id'] = f'run/wity-1-{mode}.spec.json:wity_reasoning_adapter.WityReasoningAdapter'
    assert row['axes'] == s['axes'] and row['scores'] == s['scores'] and row['cost']['usd_per_1000'] == s['cost']['usd_per_1000']
    times = rec['started_utc'][11:16]+'–'+rec['ended_utc'][11:16]
    row['model_pin'] = f"wity-1 build f65ce826a455 (X-Wity-Build header on all 1,624 responses; /health build f65ce826a455), request field reasoning={mode}, hosted production API https://wity-proxy-production-2c33.up.railway.app, measured 2026-10-04 {times} UTC"
    row['endpoint_condition'] = "operator's hosted production API, measured as is; API default is off, our request sets reasoning="+mode+(" as the operator asked for their main row." if mode=='auto' else "; labelled configuration variant.")
    if mode == 'off':
        row['endpoint_condition'] += ' The first approximately 70 decisions ran alongside two other streams; the remainder ran alone.'
    row['cost'].update(kind='estimate', basis="Wity's stated API tariff: USD 0.042 per 1M input tokens, output free; measured 944,200 input tokens over 1,624 decisions. API models with a known base are ranked at their own API price (1 Oct 2026 rule). The striped bar uses the frozen Qwen3.6-35B-A3B base-model reference.")
    br = b['rows']['wity-1']
    row['alt'] = {'label':'Qwen3.6-35B-A3B base-model reference price', 'note':'Operator self-reported base, not independently verified; frozen Qwen/Qwen3.6-35B-A3B reference USD 0.15/M input and 1.00/M output, applied to the same measured tokens.', 'usd_per_1000':br['cost']['usd_per_1000'], 'axes':br['axes']}
    row['provenance'] = {'raw_sha256':rec['output_sha256'], 'result_sha256':h(api_path), 'base_reference_result_sha256':h(base_path), 'run_receipt_sha256':h(receipt_path), 'scorer_sources_sha256':w['scorer_sources_sha256'], 'revision':row['model_pin']}
    new.append(row)
    a['addendum_sources_sha256']['A9_wity_'+mode] = h(api_path)
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
a['revision_note']="One ranked row joins on the unchanged frozen v1.5 protocol: wity-1 build f65ce826a455 with reasoning=auto, at Wity's API price with a striped self-reported base-model reference. reasoning=always and reasoning=off are labelled configuration variants, listed without ranks. All existing rows, scores, intervals, prices and method are unchanged."
a['paired_comparison_note']='No new paired-bootstrap comparisons for the wity-1 build f65ce826a455 addendum. Prior markers remain only for still-adjacent pairs; missing markers imply neither tie nor separation.'
for prior in old['systems']:
    assert {k:v for k,v in prior.items() if k not in ['rank','ranks']} == {k:v for k,v in by[prior['key']].items() if k not in ['rank','ranks']}
js = "import {jevClassRows} from './lib/jevbench-jev-class.mjs'; import fs from 'node:fs'; const a=JSON.parse(fs.readFileSync(0,'utf8')); const c=jevClassRows(a.systems.filter(r=>r.ranked)); console.log(JSON.stringify({order:c.rows.filter(r=>r.inClass).map(r=>r.row.key), limits:c.limits, rows:c.rows.filter(r=>r.row.key==='wity-1').map(({row,...rest})=>({key:row.key,...rest}))}));"
def cap(x):return json.loads(subprocess.check_output(['node','--input-type=module','-e',js],input=json.dumps(x).encode(),cwd=R))
bc,ac=cap(old),cap(a)
before={o:old['board'][o]['order'][:5] for o in 'ABC'};after={o:a['board'][o]['order'][:5] for o in 'ABC'}
before['Capability']=bc['order'][:5];after['Capability']=ac['order'][:5]
variants={s['key'] for s in new if not s['ranked']}
for o in before:
    assert set(after[o])-set(before[o]) <= {'wity-1'}, o
    assert [k for k in after[o] if k!='wity-1'] == [k for k in before[o] if k in after[o]], o
for order in [a['board'][o]['order'] for o in 'ABC']+[ac['order']]:
    assert not variants.intersection(order)
assert after['A'][0] == after['Capability'][0] == 'wity-1'
top={'before_v1.5.7':before,'after_v1.5.8':after,'changed':{o:before[o]!=after[o] for o in before}, 'ranks':{s['key']:dict(s['ranks'],Capability=ac['order'].index(s['key'])+1 if s['key'] in ac['order'] else None) for s in new},'capability':ac, 'n_ranked':a['n_ranked'],'rule':"Top-five change. Held for Florian's GO on the screenshot preview (lead job wity-jevbench-results-20261003)."}
(Path(__file__).parent/'TOP-FIVE.json').write_text(json.dumps(top,indent=2)+'\n')
(Path(__file__).parent/'HASH-VERIFICATION.json').write_text(json.dumps(checks,indent=2)+'\n')
(D/'jevbench-v1.5.8-results.json').write_text(json.dumps(a,indent=2)+'\n')
print(json.dumps(top))
