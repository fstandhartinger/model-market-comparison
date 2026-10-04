"""CR-283 (combined): add the two paid public fast-lane orders of 4 Oct 2026 to the held v1.5.8 built by build.py.
torchcast-decision-12b (order b113eac1) and the five Quyet 1.0 systems (order 3643732b) join as ranked rows on the
unchanged frozen v1.5 protocol. No inference: every raw output is hash-checked against its delivered OFFICIAL-SCORE
and re-scored offline once with the pinned official scorer; the projection must reproduce the delivered aggregate.
Run after build.py; rewrites the v1.5.8 results file and TOP-FIVE.json (v1.5.7 -> combined v1.5.8)."""
import copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]; D = R / 'data/raw/benchmarks/jevbench/v1.5'; HERE = Path(__file__).parent
F = Path('/home/flori/jobs/fastlane-sla-20261004')
sys.path.insert(0, str(R / 'ops/priority-evaluation')); import official_scoring as O
h = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
spec = importlib.util.spec_from_file_location('convert', '/home/flori/jobs/jevbench-v15-measure-20260925/site-preview/convert_v15.py')
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)

POD = ('evaluator-owned Lium GPU pod, 1x NVIDIA H100 80GB, weights fetched in a separate model-only container, scored run '
       'inside docker --network none (loopback only, no secrets, label-free inputs); pod destroyed afterwards; paid public '
       'fast-lane evaluation, 4 Oct 2026')
QUYET_CODE = 'github.com/ncchinh/quyet@f9bddb97bf0e39c8c965a85c0c6c5d1295224b6a (quyet 1.0.0 runtime; differs from tag v1.0.0 only in LICENSE)'
SYSTEMS = [
    dict(key='torchcast-decision-12b', src=F/'results/torchcast', meta=F/'meta/torchcast.json', addendum='A10',
         display='torchcast-decision-12b (Torchcast AI, Gemma-4-12B fine-tune, option-letter logprob readout)',
         author='Torchcast AI', repo='https://huggingface.co/torchcast-ai/torchcast-decision-12b', licence='cc-by-nc-4.0',
         underlying='google/gemma-4-12B-it', order='b113eac1',
         pin='torchcast-ai/torchcast-decision-12b@49107b5589bf2dc4ec3f5acd54316971dd5978b1 + github.com/Torchcast-AI/torchcast-decision-12b@d7f84468f7c4a21c8aeed52df845d98c59afae04 (serving/torchcast_shim.py), vLLM v0.30.0 BF16',
         note=None),
]
for name, rev, base, note in [
        ('Large', 'e1ecbbe761b12a11ab68e772a5dea9e84d147184', 'google/gemma-4-31B-it', 'Gemma-4-31B decoder, option-letter logits'),
        ('Medium', '3f8e1d9d1e85d23af1756155fc4431dd08303018', 'Qwen/Qwen3.5-4B', 'Qwen3.5-4B decoder, option-letter logits'),
        ('Small', '0d328cfecef2122310a4102bfd8dd5344106e58e', 'aisingapore/SEA-LION-ModernBERT-300M', 'SEA-LION-ModernBERT-300M encoder with fixed heads'),
        ('Small-EN', 'b98d87024e179f54fc364e4831aa17835ab06409', 'answerdotai/ModernBERT-base', 'ModernBERT-base encoder with fixed heads'),
        ('Tiny', 'ad8ba6abb07ebacdb306eb6f6c0ab373d5c9d4e1', 'jhu-clsp/mmBERT-small', 'mmBERT-small encoder (16 layers kept) with fixed heads')]:
    SYSTEMS.append(dict(key='quyet-1-0-'+name.lower(), src=F/f'results/quyet/Quyet-1.0-{name}', meta=F/f'meta/Quyet-1.0-{name}.json',
                        addendum='A11', display=f'Quyet-1.0-{name} (Chinh Nguyen, {note})', author='Chinh Nguyen (ncchinh)',
                        repo=f'https://huggingface.co/chinhnc/Quyet-1.0-{name}', licence='apache-2.0', underlying=base,
                        order='3643732b', pin=f'chinhnc/Quyet-1.0-{name}@{rev} + {QUYET_CODE}', note=None))

a = load(D / 'jevbench-v1.5.8-results.json'); assert a['revision'] == 'v1.5.8'
v157 = load(D / 'jevbench-v1.5.7-results.json')
wity_keys = {s['key'] for s in a['systems']} - {s['key'] for s in v157['systems']}
assert wity_keys == {'wity-1', 'wity-1-always', 'wity-1-off'}, wity_keys
pins = O.pins(['jevbench']); rescore = {}; new = []
for m in SYSTEMS:
    K = m['key']; off = load(m['src'] / 'OFFICIAL-SCORE.json'); raw = m['src'] / 'raw.jsonl'; meta = load(m['meta'])
    assert K not in {s['key'] for s in a['systems'] + a['not_measured']}, K
    assert meta['system_key'] == off['result']['system_key'] == K
    assert h(raw) == off['raw_sha256'] and h(m['meta']) == off['meta_sha256'], K
    assert off['scoring_pins'] == pins, K + ': scorer pins differ'
    again = O.run('jevbench', raw, meta, pins)
    assert again['aggregate'] == off['result']['aggregate'] and again['score'] == off['result']['score'], K + ': not reproduced'
    rows = [json.loads(l) for l in raw.open() if l.strip()]
    assert len(rows) == len({r['task_id'] for r in rows}) == 1624, K
    rescore[K] = {'raw_sha256': off['raw_sha256'], 'meta_sha256': off['meta_sha256'], 'official_score_sha256': h(m['src'] / 'OFFICIAL-SCORE.json'),
                  'rows': len(rows), 'ok': sum(bool(r.get('ok')) for r in rows), 'reproduced_delivered_aggregate': True,
                  'input_tokens': sum(int((r.get('usage') or {}).get('input_tokens') or 0) for r in rows),
                  'output_tokens': sum(int((r.get('usage') or {}).get('output_tokens') or 0) for r in rows)}
    g = off['result']['aggregate']
    src = {'key': K, 'display': m['display'], 'addendum': m['addendum'], 'status': g['status'],
           'per_type_split': g['intelligence']['per_type_split'], 'calibration': {'C': g['calibration']['score'], 'parts': g['calibration']['parts']},
           'axes': g['axes'], 'scores': g['scores'], 'views': g['views'], 'composite_ci95': g['composite_ci95'],
           'latency': {'p50_raw': g['speed']['p50_s_raw'], 'p95_raw': g['speed']['p95_s_raw'], 'p50_adj': g['speed']['p50_s_adjusted'],
                       'p95_adj': g['speed']['p95_s_adjusted'], 'n': g['speed']['n']},
           'endpoint_kind': 'gpu', 'gpu': 'H100', 'api_flag': False, 'support': g['support'], 'full_coverage': g['full_coverage'],
           'planned_weight_denominator': g['planned_weight_denominator'], 'validity': g['validity'], 'cost': g['cost'],
           **{k: g['intelligence'][k] for k in ('I_open', 'I_sealed', 'base', 'gap', 'excess', 'penalty')}}
    row = C.project_row(K, src, {'author': m['author'], 'repo': m['repo'], 'class': 'Jev-compatible decision model',
                                 'licence': m['licence'], 'open': 'open weights', 'underlying': m['underlying']})
    row.update(display=m['display'], ranked=True, listing='ranked', not_ranked_because=None, ranks={}, rank=None,
               last_measured_on='2026-10-04', model_pin=m['pin'], endpoint_condition=POD + f' (order {m["order"]})')
    row.pop('would_place_A', None)
    assert row['axes'] == g['axes'] and row['scores'] == g['scores'] and row['cost']['usd_per_1000'] == g['cost']['usd_per_1000'], K
    row['cost'] = {'kind': 'estimate', 'usd_per_1000': g['cost']['usd_per_1000'], 'basis': meta['system']['cost_basis']}
    row['provenance'] = {'raw_sha256': off['raw_sha256'], 'meta_sha256': off['meta_sha256'], 'official_score_sha256': rescore[K]['official_score_sha256'],
                         'scorer_pins': pins, 'revision': m['pin']}
    new.append(row); a['addendum_sources_sha256'][f"{m['addendum']}_{K}"] = rescore[K]['official_score_sha256']

a['systems'].extend(new); by = {s['key']: s for s in a['systems']}
for o in 'ABC':
    pos = {k: i for i, k in enumerate(a['board'][o]['order'])}
    order = sorted([s['key'] for s in a['systems'] if s['listing'] == 'ranked'], key=lambda k: (-by[k]['scores'][o], pos.get(k, 100000), k))
    for i, k in enumerate(order):
        by[k]['ranks'][o] = i + 1
        if o == 'A': by[k]['rank'] = i + 1
    adj = set(zip(order, order[1:])); a['board'][o]['order'] = order
    a['board'][o]['markers'] = [mk for mk in a['board'][o]['markers'] if (mk['upper'], mk['lower']) in adj]
a['n_ranked'] = sum(s['listing'] == 'ranked' for s in a['systems']); a['roster_count'] = len(a['systems']) + len(a['not_measured'])
a['revision_note'] = ("Seven ranked rows join on the unchanged frozen v1.5 protocol (1,624 decisions, same scorer and G_med): wity-1 build "
                      "f65ce826a455 with reasoning=auto, at Wity's API price with a striped self-reported base-model reference "
                      "(reasoning=always and reasoning=off are labelled configuration variants, listed without ranks); and, from two paid "
                      "public fast-lane orders of 4 Oct 2026, torchcast-decision-12b and the five Quyet 1.0 systems, self-hosted open "
                      "weights at base-model reference prices (estimates). All existing rows, scores, intervals, prices and method are unchanged.")
a['paired_comparison_note'] = ('No new paired-bootstrap comparisons for the A9-A11 addenda. Prior markers remain only for still-adjacent pairs; '
                               'missing markers imply neither tie nor separation.')
for prior in v157['systems']:
    assert {k: v for k, v in prior.items() if k not in ['rank', 'ranks']} == {k: v for k, v in by[prior['key']].items() if k not in ['rank', 'ranks']}
js = ("import {jevClassRows} from './lib/jevbench-jev-class.mjs'; import fs from 'node:fs'; const a=JSON.parse(fs.readFileSync(0,'utf8'));"
      " const c=jevClassRows(a.systems.filter(r=>r.ranked)); console.log(JSON.stringify({order:c.rows.filter(r=>r.inClass).map(r=>r.row.key), limits:c.limits}));")
cap = lambda x: json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], input=json.dumps(x).encode(), cwd=R))
bc, ac = cap(v157), cap(a)
before = {o: v157['board'][o]['order'][:5] for o in 'ABC'}; after = {o: a['board'][o]['order'][:5] for o in 'ABC'}
before['Capability'] = bc['order'][:5]; after['Capability'] = ac['order'][:5]
joined = wity_keys | {m['key'] for m in SYSTEMS}; variants = {'wity-1-always', 'wity-1-off'}
for o in before:
    assert [k for k in after[o] if k not in joined] == [k for k in before[o] if k in after[o]], o
for order in [a['board'][o]['order'] for o in 'ABC'] + [ac['order']]:
    assert not variants.intersection(order)
ranks = {k: dict(by[k]['ranks'], Capability=ac['order'].index(k) + 1 if k in ac['order'] else None) for k in sorted(joined - variants)}
top = {'before_v1.5.7': before, 'after_v1.5.8': after, 'changed': {o: before[o] != after[o] for o in before}, 'ranks': ranks,
       'capability_limits': ac['limits'], 'n_ranked': a['n_ranked'],
       'rule': "Top-five change. Held for Florian's GO on the combined screenshot preview (owner jevbench-v16-run-20261001, board #11 #10266)."}
(HERE / 'TOP-FIVE.json').write_text(json.dumps(top, indent=2) + '\n')
(HERE / 'FASTLANE-RESCORE-RECEIPT.json').write_text(json.dumps({'scorer_pins': pins, 'systems': rescore}, indent=2) + '\n')
(D / 'jevbench-v1.5.8-results.json').write_text(json.dumps(a, indent=2) + '\n')
print(json.dumps(top, indent=1))
