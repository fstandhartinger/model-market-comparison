"""v1.7.15: capture the trusted aggregate scorer outputs for the one new row, microsoft-decision-1-r2 (hosted API, paid public, draw
v1.6-regular-20261027, scored on its 1,493 items through the private 1,493-item gold view). The sealed raw and gold view are only
hashed in place, never rendered. Public text comes from rows_v1715.py; every quoted number is re-derived here from the scorer
outputs or the validation receipt. The six carried rows of the draw need no new scoring (v1.7.15 only replaces their public not-ranked note)."""
import copy, hashlib, json, pathlib, re, socket
from pricing_reference_v1715 import PIN, reference
from rows_v1715 import ROW, KEY, DRAW_NOTE
J = pathlib.Path(__file__).resolve().parent; W = J.parents[1]; B = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
DRAW = 'v1.6-regular-20261027'; GMED = 2.573387642438244; SEALED = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run') / DRAW
assert socket.gethostname() == 'Ubuntu-2204-jammy-amd64-base'
assert sha('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py') == '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(B / 'r160/scorer/score_v17.py') == '6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978'
prev_pub = L(W / 'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-publication.json'); assert prev_pub['revision'] == 'v1.7.14' and prev_pub['review']['verdict'] == 'PASS'
MAN = SEALED / 'inputs/manifest.json'; MH = 'f5a5151a1a19923dec1434230dbc451d9ca879ce8ccba8f268b296cac9c1ee35'; assert sha(MAN) == MH
RAW = SEALED / 'runs-fastlane/microsoft-decision-1-r2/microsoft-decision-1-r2.jsonl'; RAWH = '1f069818cdc069a532a4c4965d306fbd302bb819dde4aa3c48a9bd676c4a981e'
VIEW = SEALED / 'runs-fastlane/microsoft-decision-1-r2-scoreview-1493/frozen/gold.jsonl'; VIEWH = '120d0ba782186a0ebc78e8a71b0caf7ff60d49d30cdbd650ae0d2afe297d96b5'
GOLD = SEALED / 'frozen/gold.jsonl'; GOLDH = '8aaf8ab4c58fe06e1f7494a965701ffc0c1a7879392b0bc2309f7f1724b5e200'
for p, h in [(RAW, RAWH), (VIEW, VIEWH), (GOLD, GOLDH)]: assert sha(p) == h, ('HASH MISMATCH', p)
PRIV = B / 'r197/msft/RESULT-PRIVATE-MSFT-R2.json'; PRIVH = '9a147bfed78e72153b97da9ff75c3e34ff6e91c45f23cded0f1da092b0ba72aa'; assert sha(PRIV) == PRIVH
VAL = B / 'r197/msft/VALIDATION-R197.json'; val = L(VAL); assert val['pass'] and val['raw_sha256'] == RAWH and val['rows'] == 1493 and val['ok'] == 1489 and val['latency_s']['over_10s'] == 0
F = B / 'r197/v1715/score/field'; reg = L(F / 'REGISTRY.json')[KEY]
assert (F / 'runs' / f'{KEY}.jsonl').resolve() == RAW and reg['cost_kind'] == 'tariff' and reg['price_in_per_m'] == 0.042 and reg['price_out_per_m'] == 0.0 and reg['lane'] == 'api'
priv = L(PRIV); A = priv['A_live_row_basis_tariff']; assert priv['n'] == 1493
REQ = pathlib.Path('/home/flori/jobs/fastlane-evaluations/d2b677de-4a8d-47f9-9f76-3c50d20c7714/request.json'); rq = L(REQ)
assert rq['visibility'] == 'public' and rq['model_name'] == 'Microsoft-Decision-1', 'paid order must be public'
ref = reference(KEY, reg); assert ref['in'] == reg['price_in_per_m'] and ref['out'] == reg['price_out_per_m']
fields = L(B / 'r197/msft/score/field/FIELDS.json'); tin, tout = fields['input_tokens'], fields['output_tokens']
assert (tin, tout) == (val['input_tokens'], val['output_tokens']) == (467021, 1489)
usd = 1000 * (tin * ref['in'] + tout * ref['out']) / 1e6 / 1493
assert abs(usd - A['usd_per_1000']) < 1e-15 and abs(usd - fields['usd_per_1000_A']) < 1e-15
d = {'registry': reg, 'measured_on': '2026-10-28', 'raw_sha256': RAWH, 'usd_per_1000': usd, 'input_tokens': tin, 'output_tokens': tout, 'n_items': 1493, 'paid_public': True}
pins = {'raw_sha256': RAWH, 'raw_verified_in_place': True, 'gold_view_sha256': VIEWH, 'gold_sha256': GOLDH, 'manifest_sha256': MH, 'registry_sha256': sha(F / 'REGISTRY.json'),
        'private_result_sha256': PRIVH, 'validation_sha256': sha(VAL), 'input_sha256': val['input_sha256']}
for mode in ['frozen', 'v17-off', 'v17-share']:
    p = F / f'out-{mode}/jevbench-v1.6.0-results.json'; res = L(p)
    assert res['G_med'] == GMED and res['bootstrap']['B'] == 1000 and res['bootstrap']['bootstrap_seed'] == 16 and len(res['systems']) == 1
    s = copy.deepcopy(res['systems'][0]); assert s['key'] == KEY
    assert s['status'] == {'answered_ok': 1489, 'missing': 0, 'rows': 1493, 'status': 'complete'} and s['cost']['kind'] == 'tariff' and abs(s['cost']['usd_per_1000'] - usd) < 1e-15
    assert s['v16']['g_med_used'] == GMED and s['intelligence']['penalty'] == 1.0 and s['v16']['full_set_api'] and s['v16']['equating_offset'] is None and s['v16']['n_items'] == 1493
    d[mode] = s; pins[mode] = {'path': str(p), 'sha256': sha(p)}
sh = d['v17-share']
# The published (share) view equals the private result the lead reviewed.
assert sh['axes'] == A['axes'] and sh['scores'] == A['scores'] and sh['capability'] == A['capability'] and sh['composite_ci95'] == A['ci95']['composite']
assert sh['decision_limit']['n_over_limit'] == 0 and sh['decision_limit']['treatment'] == 'share' and sh['decision_limit']['speed_n'] == 1493
quoted = {'P50': f"{sh['speed']['p50_s_raw']:.3f} s", 'P95': f"{sh['speed']['p95_s_raw']:.3f} s", 'MAX': f"{val['latency_s']['max']:.3f} s"}
en = copy.deepcopy(ROW); en['disclosure'] = en['disclosure'].format(**quoted)
en['cost_basis'] = en['cost_basis'].replace('{TIN}', f'{tin:,}').replace('{TOUT}', f'{tout:,}').replace('{USD}', f'{usd:.6f}')
BANNED = re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|\blead\b|custody|deputy|\bboard #|auto-intake|d2b677de|9cde338c|Anna|Roth|Gmail|(?-i:DECISIONS)|fast-lane order|paid order|\bworker\b|\{[A-Za-z_][A-Za-z0-9_]*\}', re.I)
for f in ['display', 'author', 'disclosure', 'endpoint_condition', 'cost_basis']:
    hit = BANNED.search(en[f]); assert not hit, ('internal public text', f, hit.group())
assert DRAW_NOTE in en['disclosure'] and 'n = 1,493' in en['disclosure'] and 'n = 1,493' in en['cost_basis'] and '467,021' in en['cost_basis']
for mode in ['frozen', 'v17-off', 'v17-share']:   # public text on every captured view (the scorer copies the registry's internal draft)
    for f in ['display', 'author', 'disclosure', 'endpoint_condition']: d[mode][f] = en[f]
    d[mode]['cost']['basis'] = en['cost_basis']
cells = {}
for mode in ['off', 'share']:
    cp_ = F / f'cells/{mode}/categories.json'; dp = F / f'cells/{mode}/decisive.json'; c = L(cp_)
    assert c['source_results_sha256'] == pins['v17-' + mode]['sha256'] and 'topics' not in c['systems'][KEY]
    cells['cells_' + mode] = c['systems'][KEY]; cells['noul_' + mode] = L(dp)[KEY]
    cells['pool_' + mode] = {dim: {x['key']: x['n'] for x in c[dim]} for dim in ['families', 'usecases', 'languages']}
    pins['cells_' + mode] = {'categories_sha256': sha(cp_), 'decisive_sha256': sha(dp)}
assert cells['pool_off'] == cells['pool_share'] and sum(cells['pool_share']['languages'].values()) == 1493
# The 1,493-item pools are bounded by the full draw's pools (v1.7.13's pinned bounds for the same draw).
prev_bounds = L(J.parent / 'v1713/receipts/NEW-ROW-BOUNDS.json')['h2o-lightning-4b-v1.4.1']
for dim in ['usecases', 'languages']:
    for c_, n in cells['pool_share'][dim].items(): assert n <= prev_bounds[dim].get(c_, 0), (dim, c_)
for p in [J / 'inputs', J / 'src', J / 'receipts']: p.mkdir(parents=True, exist_ok=True)
put(J / 'inputs/ENTRIES.json', {KEY: {'entry': en}}); put(J / 'src/inputs.json', {KEY: d}); put(J / 'src/cells.json', {KEY: cells}); put(J / 'receipts/INPUTS.json', {KEY: pins})
# Off/frozen blocks of every predecessor row for the supplementary comparison: v1.7.14's carried set plus v1.7.14's own new rows.
co = L(J.parent / 'v1714/src/carried-off.json'); i14 = L(J.parent / 'v1714/src/inputs.json'); i13 = L(J.parent / 'v1713/src/inputs.json')
FLD = ['axes', 'capability', 'jevbench_score', 'scores', 'speed', 'views']
for src in [i13, i14]:
    for k, v in src.items():
        if k not in co: co[k] = {f: v['v17-off'][f] for f in FLD}
put(J / 'src/carried-off.json', co)
put(J / 'receipts/PRECONDITIONS.json', {'hostname': socket.gethostname(), 'pricing_sha256': PIN, 'predecessor': 'v1.7.14', 'predecessor_review_at_build': prev_pub['review']['verdict'], 'paid_visibility': 'public', 'paid_request_sha256': sha(REQ), 'draw': DRAW, 'g_med_fixed': GMED, 'cost_decision': ref['decision']})
print('PASS host, scorer, raw/gold-view/manifest/private-result pins; three-view scores for', KEY, '; cost', round(usd, 6), 'USD/1k (tariff); cells pooled on 1,493 items')
