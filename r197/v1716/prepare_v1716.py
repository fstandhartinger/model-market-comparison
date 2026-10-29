"""v1.7.16: capture the trusted aggregate scorer outputs (job dir r197/v1716/score, aggregates only):
  * the new row strike-1 (hosted API, draw v1.6-regular-20261027, all 1,500 items, 5 pre-registered over-limit refusals scored as misses);
  * the same-items cost rule on that draw: the common answered set of all 8 d1027 rows (size + set sha256 only; ids stay private) and
    the re-scored cost of every d1027 row through the scorer flag --cost-basis (four fields, each the cohort that produced the
    published values; FIELD-DIFF proves only cost-dependent paths moved).
The sealed raws are only hashed/aggregated in place, never rendered. Public text comes from rows_v1716.py."""
import copy, hashlib, json, pathlib, re, socket, sys
from pricing_reference_v1716 import PIN, reference
from rows_v1716 import ROW, KEY, DRAW_NOTE, DRAW_ID, CAP
J = pathlib.Path(__file__).resolve().parent; W = J.parents[1]; B = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
GMED = 2.573387642438244; SEALED = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run') / DRAW_ID
assert socket.gethostname() == 'Ubuntu-2204-jammy-amd64-base'
assert sha('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py') == '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(B / 'r160/scorer/score_v17.py') == '6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978'
prev_pub = L(W / 'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-publication.json'); assert prev_pub['revision'] == 'v1.7.15' and prev_pub['review']['verdict'] == 'PASS'
prev_res = L(W / 'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-results.json'); prev = {s['key']: s for s in prev_res['systems']}
MAN = SEALED / 'inputs/manifest.json'; MH = 'f5a5151a1a19923dec1434230dbc451d9ca879ce8ccba8f268b296cac9c1ee35'; assert sha(MAN) == MH
INP = SEALED / 'inputs/input-selfhosted-1500.jsonl'; INPH = '9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'; assert sha(INP) == INPH
GOLD = SEALED / 'frozen/gold.jsonl'; GOLDH = '8aaf8ab4c58fe06e1f7494a965701ffc0c1a7879392b0bc2309f7f1724b5e200'; assert sha(GOLD) == GOLDH
RAW = SEALED / 'runs-auto-intake/strike-1/strike-1.raw.jsonl'; RAWH = '4c6c7ab25b11432f8934425a44806ec5a2499241a9c5790216a11651473f2027'; assert sha(RAW) == RAWH
CONS = SEALED / 'runs-auto-intake/strike-1/CONSUMED.json'; CONSH = '497dfbd9f7703a2497a6d5d1b82f83e6a6891c82609a83e170e230f85933a52b'; assert sha(CONS) == CONSH
con = L(CONS); assert con['raw_sha256'] == RAWH and con['raw_lines'] == 1500 and con['input_sha256'] == INPH and con['full_set'] is True
KIT = pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r65-strike1/SHAS.txt'); KITH = '456087be5202ed81464fd2411dc39f68ea4cff0e2c63aafe8cd82d6ce2acb415'; assert sha(KIT) == KITH
S = B / 'r197/v1716/score'; P = S / 'private'; F = S / 'field'
cs = L(P / 'COMMON-SET.json'); cc = L(F / 'COMMON-COSTS.json')
CB, CBM = P / 'cost-basis-v1716.json', P / 'cost-basis-v1716-msft.json'
assert sha(CB) == cs['cost_basis_sha256'] == cc['cost_basis_sha256'] and sha(CBM) == cs['cost_basis_msft_sha256'] == cc['cost_basis_msft_sha256']
N = cs['common_n']; SET_SHA = cs['common_set_sha256']; assert N == 1489 and cs['excluded_from_1500'] == 11 and cs['excluded_from_msft_view'] == 4
DRAW_KEYS = sorted(k for k, s in prev.items() if (s.get('draw') or {}).get('id') == DRAW_ID)
ALL8 = sorted(DRAW_KEYS + [KEY]); assert sorted(cs['rows']) == ALL8 and len(ALL8) == 8 and all(r['common_subset_of_ok'] for r in cs['rows'].values())
# same-items set: which rows drop which items (counts only); strike-1's 5 refusals are among the 11
assert cs['exclusion_pattern_counts'] == {'microsoft-decision-1-r2': 6, 'microsoft-decision-1-r2,strike-1': 5}
FIELD_OF = {'h2o-lightning-4b-v1.4.1': 'f13', 'microsoft-decision-1-r2': 'fms', KEY: 'fst'}
OLD_FIELD = {'f13': B / 'r197/v1713/score/field', 'f14': B / 'r197/v1714/score/field', 'fms': B / 'r197/msft/score/field/A-tariff'}
fd = L(S / 'FIELD-DIFF.json')
COST_PATHS = re.compile(r'^\.(axes\.cost|composite_ci95\.[ABC]\[\d\]|cost\.common_basis|cost\.usd_per_1000|jevbench_score|scores\.[ABC]|v16\.ci95\.composite\.[ABC]\[\d\]|views\..+)$')
for k, paths in fd.items():
    if k.endswith('/_top'): assert sorted(paths) == ['$.revision', '$.v16.cost_basis'], k
    else: assert all(COST_PATHS.match(p) for p in paths), (k, [p for p in paths if not COST_PATHS.match(p)])
recost, pins = {}, {'common_set': {'n': N, 'set_sha256': SET_SHA, 'set_hash_rule': cs['set_hash_rule'], 'cost_basis_sha256': cs['cost_basis_sha256'],
                                   'cost_basis_msft_view_sha256': cs['cost_basis_msft_sha256'], 'common_set_receipt_sha256': sha(P / 'COMMON-SET.json'),
                                   'common_costs_sha256': sha(F / 'COMMON-COSTS.json'), 'field_diff_sha256': sha(S / 'FIELD-DIFF.json'),
                                   'per_row_membership': {k: {'answered_ok': v['ok'], 'rows': v['rows'], 'answered_not_in_common': v['answered_not_in_common'], 'raw_sha256': v['raw_sha256']} for k, v in cs['rows'].items()}}}
for k in ALL8:
    f = FIELD_OF.get(k, 'f14'); c = cc['rows'][k]; d = {'field': f, 'common': c}
    for mode in ['frozen', 'v17-off', 'v17-share']:
        p = F / f / f'out-{mode}/jevbench-v1.6.0-results.json'; res = L(p)
        assert res['G_med'] == GMED and res['bootstrap']['B'] == 1000 and res['bootstrap']['bootstrap_seed'] == 16
        cbk = res['v16']['cost_basis']; assert cbk['file_sha256'] == (cs['cost_basis_msft_sha256'] if f == 'fms' else cs['cost_basis_sha256'])
        s = copy.deepcopy(next(x for x in res['systems'] if x['key'] == k)); assert abs(s['cost']['usd_per_1000'] - c['usd_per_1000_common']) < 1e-15, (k, mode)
        d[mode] = s; pins.setdefault(k, {})[mode] = {'path': str(p), 'sha256': sha(p)}
        if k != KEY:   # the old view, for the carried-row identity checks
            op = OLD_FIELD[f] / f'out-{mode}/jevbench-v1.6.0-results.json'; old = next(x for x in L(op)['systems'] if x['key'] == k)
            pins[k][mode]['old'] = {'path': str(op), 'sha256': sha(op)}
            for fl in ['intelligence', 'calibration', 'speed', 'validity', 'status', 'support', 'decision_limit', 'capability']: assert (fl in old) == (fl in s) and old.get(fl) == s.get(fl), (k, mode, fl)
            assert {x: y for x, y in old['v16'].items() if x != 'ci95'} == {x: y for x, y in s['v16'].items() if x != 'ci95'}, (k, mode)
            assert {x: y for x, y in old['v16']['ci95'].items() if x != 'composite'} == {x: y for x, y in s['v16']['ci95'].items() if x != 'composite'}, (k, mode)
            assert old['axes']['intelligence'] == s['axes']['intelligence'] and old['axes']['calibration'] == s['axes']['calibration'] and old['axes']['speed'] == s['axes']['speed']
    if k != KEY:
        sh = d['v17-share']; pv = prev[k]
        # the published share-view payload of the predecessor equals the old scorer output (the source of truth we re-score)
        oldsh = next(x for x in L(OLD_FIELD[FIELD_OF.get(k, 'f14')] / 'out-v17-share/jevbench-v1.6.0-results.json')['systems'] if x['key'] == k)
        for fl in ['axes', 'scores', 'views', 'jevbench_score', 'capability', 'composite_ci95', 'intelligence', 'calibration', 'speed', 'validity', 'status', 'decision_limit']:
            assert pv[fl] == oldsh[fl], (k, fl, 'predecessor = old scorer view')
        assert abs(pv['cost']['usd_per_1000'] - c['usd_per_1000_all_items_published']) < 1e-15, (k, 'published all-items figure')
        assert pv['cost']['usd_per_1000'] == oldsh['cost']['usd_per_1000'] and pv['cost']['kind'] == oldsh['cost']['kind']
    recost[k] = d
# ---- the new row: strike-1
d = recost[KEY]; reg = L(F / 'fst/REGISTRY.json')[KEY]; ref = reference(KEY, reg)
assert (F / 'fst/runs' / f'{KEY}.jsonl').resolve() == RAW and reg['lane'] == 'api' and reg['api_subset'] == 'S' and reg['cost_kind'] == 'estimate'
assert abs(ref['in'] - reg['price_in_per_m']) < 1e-12 and abs(ref['out'] - reg['price_out_per_m']) < 1e-12 and ref['listing'] == 'deepinfra:Qwen/Qwen3.5-4B'
rows = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
ids = [json.loads(l)['task_id'] for l in INP.read_text().splitlines() if l.strip()]
assert [r['task_id'] for r in rows] == ids, 'raw in sealed input order'
codes = {}; [codes.__setitem__(str(r['status_code']), codes.get(str(r['status_code']), 0) + 1) for r in rows]; assert codes == {'200': 1495, '400': 5}
ok = [r for r in rows if r['status_code'] == 200]
assert all(r['ok'] and r['error'] is None and r['served_model'] == 'strike-1' and r['probs_source'] == 'native' and r['usage']['output_tokens'] == 0 for r in ok)
assert all((not r['ok']) and r['error'] and r['probs_as_returned'] is None for r in rows if r['status_code'] == 400)
tin_all = sum(r['usage']['input_tokens'] for r in ok); lat = sorted(r['latency_s'] for r in rows); assert sum(v > 10 for v in lat) == 0
c = cc['rows'][KEY]; assert c['all_items_input_tokens'] == tin_all and c['common_output_tokens'] == 0 and c['common_n'] == N
usd_all = 1000 * tin_all * reg['price_in_per_m'] / 1e6 / 1500; assert abs(usd_all - c['usd_per_1000_all_items_published']) < 1e-15
usd = c['usd_per_1000_common']; assert abs(usd - 1000 * c['common_input_tokens'] * reg['price_in_per_m'] / 1e6 / N) < 1e-15
for mode in ['frozen', 'v17-off', 'v17-share']:
    s = d[mode]; assert len(L(pins[KEY][mode]['path'])['systems']) == 1
    assert s['status'] == {'answered_ok': 1495, 'missing': 0, 'rows': 1500, 'status': 'complete'} and s['cost']['kind'] == 'estimate'
    assert s['v16']['g_med_used'] == GMED and s['intelligence']['penalty'] == 1.0 and s['v16']['full_set_api'] and s['v16']['equating_offset'] is None and s['v16']['n_items'] == 1500
    assert s['cost']['common_basis'] == {'n_items': N, 'rule': 'common', 'usd_per_1000_all_items': usd_all}
sh = d['v17-share']; assert sh['decision_limit']['n_over_limit'] == 0 and sh['decision_limit']['treatment'] == 'share' and sh['decision_limit']['speed_n'] == 1500
from rows_v1716 import cost_figures
quoted = {'P50': f"{sh['speed']['p50_s_raw']:.3f} s", 'P95': f"{sh['speed']['p95_s_raw']:.3f} s", 'MAX': f"{lat[-1]:.3f} s"}
en = copy.deepcopy(ROW); en['disclosure'] = en['disclosure'].format(**quoted)
en['cost_basis'] = en['cost_basis'].replace('{TIN}', f"{c['common_input_tokens']:,}").replace('{N}', f'{N:,}').replace('{FIG}', cost_figures(usd, N, usd_all))
BANNED = re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|\blead\b|custody|deputy|\bboard #|auto-intake|9D88ECFA|r65|\bkit\b|(?-i:DECISIONS)|\bworker\b|\{[A-Za-z_][A-Za-z0-9_]*\}', re.I)
for f in ['display', 'author', 'disclosure', 'endpoint_condition', 'cost_basis', 'licence']:
    hit = BANNED.search(en[f]); assert not hit, ('internal public text', f, hit.group())
assert DRAW_NOTE in en['disclosure'] and '1,489 items every row on this draw answered (same-items rule)' in en['cost_basis']
d.update(registry=reg, measured_on='2026-10-28', raw_sha256=RAWH, usd_per_1000=usd, usd_per_1000_all_items=usd_all, input_tokens_all=tin_all,
         input_tokens_common=c['common_input_tokens'], output_tokens=0, n_items=1500, n_answered=1495, n_refused=5, latency_max_s=lat[-1])
for mode in ['frozen', 'v17-off', 'v17-share']:   # public text on every captured view (the scorer copies the registry's draft)
    for f in ['display', 'author', 'disclosure', 'endpoint_condition']: d[mode][f] = en[f]
    d[mode]['cost']['basis'] = en['cost_basis']
pins[KEY].update(raw_sha256=RAWH, raw_verified_in_place=True, consumed_sha256=CONSH, kit_shas_sha256=KITH, gold_sha256=GOLDH, manifest_sha256=MH, input_sha256=INPH,
                 registry_sha256=sha(F / 'fst/REGISTRY.json'))
cells = {}
for mode in ['off', 'share']:
    cp_ = F / f'fst/cells/{mode}/categories.json'; dp = F / f'fst/cells/{mode}/decisive.json'; cj = L(cp_)
    assert cj['source_results_sha256'] == pins[KEY]['v17-' + mode]['sha256'] and 'topics' not in cj['systems'][KEY]
    cells['cells_' + mode] = cj['systems'][KEY]; cells['noul_' + mode] = L(dp)[KEY]
    cells['pool_' + mode] = {dim: {x['key']: x['n'] for x in cj[dim]} for dim in ['families', 'usecases', 'languages']}
    pins[KEY]['cells_' + mode] = {'categories_sha256': sha(cp_), 'decisive_sha256': sha(dp)}
assert cells['pool_off'] == cells['pool_share'] and sum(cells['pool_share']['languages'].values()) == 1500
prev_bounds = L(J.parent / 'v1713/receipts/NEW-ROW-BOUNDS.json')['h2o-lightning-4b-v1.4.1']   # the full draw's pools (v1.7.13)
for dim in ['usecases', 'languages']: assert cells['pool_share'][dim] == prev_bounds[dim], dim
for p in [J / 'inputs', J / 'src', J / 'receipts']: p.mkdir(parents=True, exist_ok=True)
put(J / 'inputs/ENTRIES.json', {KEY: {'entry': en}}); put(J / 'src/inputs.json', {KEY: d}); put(J / 'src/cells.json', {KEY: cells})
put(J / 'src/recost.json', {k: {'field': v['field'], 'common': v['common'], **{m: {f: v[m][f] for f in ['axes', 'scores', 'views', 'jevbench_score', 'composite_ci95', 'cost', 'v16']} for m in ['frozen', 'v17-off', 'v17-share']}} for k, v in recost.items() if k != KEY})
put(J / 'receipts/INPUTS.json', pins)
# Off blocks of every predecessor row for the supplementary comparison: v1.7.15's carried set + its new row, with the d1027 rows' re-costed off view.
co = L(J.parent / 'v1715u/src/carried-off.json'); i15 = L(J.parent / 'v1715u/src/inputs.json')
FLD = ['axes', 'capability', 'jevbench_score', 'scores', 'speed', 'views']
for k, v in i15.items():
    if k not in co: co[k] = {f: v['v17-off'][f] for f in FLD}
for k in DRAW_KEYS:
    assert k in co, k
    co[k] = {f: recost[k]['v17-off'][f] for f in FLD}
put(J / 'src/carried-off.json', co)
put(J / 'receipts/PRECONDITIONS.json', {'hostname': socket.gethostname(), 'pricing_sha256': PIN, 'predecessor': 'v1.7.15', 'predecessor_review_at_build': prev_pub['review']['verdict'],
                                         'draw': DRAW_ID, 'g_med_fixed': GMED, 'common_set': {'n': N, 'set_sha256': SET_SHA}, 'strike_raw_sha256': RAWH, 'strike_consumed_sha256': CONSH})
print('PASS host, scorer, raw/consumed/manifest pins; strike-1 three views (1,495/1,500, 5 x 400) cost', round(usd, 6), 'USD/1k on', N, 'common items (all-items', round(usd_all, 6), ');',
      len(DRAW_KEYS), 'carried d1027 rows re-costed through --cost-basis (only cost-dependent paths moved); set sha', SET_SHA[:8])
