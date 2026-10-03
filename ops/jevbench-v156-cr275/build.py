"""CR-275: JevBench v1.5.6 = v1.5.5 plus the existing paid fast-lane Vansa-3.4 measurement (1 Oct 2026).
No inference and no new measurement: the row is projected from the delivered, hash-pinned aggregate. The striped
alternative uses the private RESCORE-RECEIPT.json produced by rescore.py (same raw output, base-model reference)."""
import copy, hashlib, importlib.util, json
from pathlib import Path
R = Path(__file__).resolve().parents[2]; D = R / 'data/raw/benchmarks/jevbench/v1.5'
JOB = Path('/home/flori/jobs/gmail-portfolio-cron-20261001-vansa-publish'); SRC = JOB / 'restored-src'
h = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
PINS = {'result-vansa-3.4.json': '9616f8e433bbcc5f1d06ea8bb5b031cdeb81e1acea1f024c1be610f98bcbae5d',
        'meta-vansa-3.4.json': '2d8ad55d1b67c28f7dba067a7071f2d277a52b18c280e39b75ab27dbce76dd76',
        'DELIVERY-RECEIPT.json': 'e507288cf119dd69fc4061daefcf29c7a97fd40b7b72d15807cf81517d033caa'}
for name, sha in PINS.items(): assert h(SRC / name) == sha, name
res = json.load(open(SRC / 'result-vansa-3.4.json')); g = res['aggregate']
receipt = json.load(open(JOB / 'RESCORE-RECEIPT.json'))
assert receipt['reproduced_delivered_aggregate'] and receipt['official'] == g and receipt['raw_sha256'] == json.load(open(SRC / 'DELIVERY-RECEIPT.json'))['raw_sha256']
spec = importlib.util.spec_from_file_location('convert', '/home/flori/jobs/jevbench-v15-measure-20260925/site-preview/convert_v15.py')
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)

parent = D / 'jevbench-v1.5.5-results.json'
a = json.load(open(parent)); a['revision'] = 'v1.5.6'; a['parent_release'] = {'revision': 'v1.5.5', 'sha256': h(parent)}
K = 'vansa-3.4'; assert K not in {s['key'] for s in a['systems'] + a['not_measured']}
src = {'key': K, 'display': 'Vansa-3.4 (Vansa, hosted System One API)', 'addendum': 'A7', 'status': g['status'],
       'per_type_split': g['intelligence']['per_type_split'], 'calibration': {'C': g['calibration']['score'], 'parts': g['calibration']['parts']},
       'axes': g['axes'], 'scores': g['scores'], 'views': g['views'], 'composite_ci95': g['composite_ci95'],
       'latency': {'p50_raw': g['speed']['p50_s_raw'], 'p95_raw': g['speed']['p95_s_raw'], 'p50_adj': g['speed']['p50_s_adjusted'],
                   'p95_adj': g['speed']['p95_s_adjusted'], 'n': g['speed']['n']},
       'endpoint_kind': 'api', 'gpu': None, 'api_flag': True, 'support': g['support'], 'full_coverage': g['full_coverage'],
       'planned_weight_denominator': g['planned_weight_denominator'], 'validity': g['validity'], 'cost': g['cost'],
       **{k: g['intelligence'][k] for k in ('I_open', 'I_sealed', 'base', 'gap', 'excess', 'penalty')}}
underlying = ("Developer-reported (private correspondence with Benchmark Heaven, 1 Oct 2026; not independently verified): built on "
              "Qwen3.5-4B via an open decision fine-tune, with Vansa's own adapters. The intermediate fine-tune is not named. "
              "Closed-beta hosted API; no immutable model artifact is externally verifiable, so the row pins model ID vansa-3.4 "
              "at api.vansa.org/v1/systemone as served on 1 Oct 2026.")
row = C.project_row(K, src, {'author': 'Vansa', 'repo': 'https://vansa.org', 'class': 'decision-api',
                             'licence': 'proprietary hosted API', 'open': 'no', 'underlying': underlying})
row.update(ranked=True, listing='ranked', not_ranked_because=None, ranks={}, rank=None, last_measured_on='2026-10-01',
           model_pin='vansa-3.4 at https://api.vansa.org/v1/systemone, as served on 2026-10-01',
           endpoint_condition="the operator's hosted API (api.vansa.org, closed beta), paid fast-lane evaluation; production endpoint measured as is")
# Values identical to the delivered aggregate; the projection must not alter any number.
assert row['axes'] == g['axes'] and row['scores'] == g['scores'] and row['cost']['usd_per_1000'] == g['cost']['usd_per_1000']
row['cost'] = {'kind': 'estimate', 'usd_per_1000': g['cost']['usd_per_1000'], 'basis': (
    "Developer's own stated API price: USD 0.034 per 1M input tokens, no output-token charge (docs.vansa.org/pricing, read 1 Oct 2026), "
    "x measured input tokens (921,181 over 1,624 decisions). Standard launch list price counted from day 1 (interpretation I-1); the "
    "closed-beta 'no charges today' is a promotion and is not used. API model with a developer-reported base: ranked at its own API "
    "price (1 Oct 2026 rule); the striped bar shows the Qwen3.5-4B base-model reference.")}
br = receipt['base_reference']
assert br['axes']['intelligence'] == g['axes']['intelligence'] and br['axes']['speed'] == g['axes']['speed']
row['alt'] = {'label': 'Qwen3.5-4B base-model reference price',
              'note': ('Qwen3.5-4B (developer-reported base) at the frozen 25 Sep 2026 DeepInfra list price, USD 0.03 per 1M input and '
                       '0.15 per 1M output tokens, on the same measured tokens (921,181 input, 0 output)'),
              'usd_per_1000': br['usd_per_1000'], 'axes': br['axes']}
row['provenance'] = {'result_sha256': PINS['result-vansa-3.4.json'], 'raw_sha256': receipt['raw_sha256'],
                     'meta_sha256': PINS['meta-vansa-3.4.json'], 'delivery_receipt_sha256': PINS['DELIVERY-RECEIPT.json'],
                     'scorer_pins': {'manifest_sha256': res['pins']['manifest_sha256'], 'adapter_sha256': res['pins']['adapter_sha256']},
                     'revision': row['model_pin']}
a['systems'].append(row); by = {s['key']: s for s in a['systems']}
before = {o: a['board'][o]['order'][:5] for o in 'ABC'}
for o in 'ABC':
    old = a['board'][o]['order']; pos = {k: i for i, k in enumerate(old)}
    order = sorted([s['key'] for s in a['systems'] if s['listing'] == 'ranked'], key=lambda k: (-by[k]['scores'][o], pos.get(k, 100000), k))
    for i, k in enumerate(order):
        by[k]['ranks'][o] = i + 1
        if o == 'A': by[k]['rank'] = i + 1
    adj = set(zip(order, order[1:])); a['board'][o]['order'] = order
    a['board'][o]['markers'] = [m for m in a['board'][o]['markers'] if (m['upper'], m['lower']) in adj]
a['n_ranked'] = sum(s['listing'] == 'ranked' for s in a['systems']); a['roster_count'] = len(a['systems']) + len(a['not_measured'])
a['addendum_sources_sha256']['A7_vansa_fastlane'] = PINS['result-vansa-3.4.json']
a['revision_note'] = ('Vansa-3.4 joins from its complete paid fast-lane run of 1 Oct 2026 (1,624 decisions on the developer\'s hosted API, '
                      'same frozen v1.5 sample, scorer and G_med). All existing scores and the method are unchanged. It is ranked at '
                      'its own stated API price; a striped bar shows the Qwen3.5-4B base-model reference. The base model is '
                      'developer-reported and not independently verified.')
a['paired_comparison_note'] = 'No new paired-bootstrap comparisons for A7. Prior markers remain only for still-adjacent pairs; missing markers imply neither tie nor separation.'
(D / 'jevbench-v1.5.6-results.json').write_text(json.dumps(a, indent=2) + '\n')
after = {o: a['board'][o]['order'][:5] for o in 'ABC'}
top = {'before_v1.5.5': before, 'after_v1.5.6': after, 'changed': {o: before[o] != after[o] for o in 'ABC'},
       'vansa_ranks': by[K]['ranks'], 'n_ranked': a['n_ranked'],
       'rule': 'Paid fast-lane top-five exception plus explicit Florian GO 3 Oct 2026 (USER-GO-20261003.json, card16014 resolved).'}
(Path(__file__).parent / 'TOP-FIVE.json').write_text(json.dumps(top, indent=2) + '\n')
print(json.dumps(top))
