"""v1.7.16 (unranked): same-draw addendum on the 27 Oct 2026 regular draw (v1.6-regular-20261027), stacked on the flipped, sealed
v1.7.15 (PASS). Two changes:
 1. One new row, Strike-1 (hosted API, EU), measured but UNRANKED like every row on that draw (the draw is not equated, offset 0).
 2. The same-items cost rule on that draw (v1.6.30 precedent on v1.6-regular-20261012): strike-1 refuses the 5 longest items and
    Microsoft-Decision-1 r2 ran on 1,493 items, so every d1027 row is costed on the COMMON answered set (1,489 items; ids private,
    set sha256 pinned) through the scorer flag --cost-basis, each row with its own price reference and token basis. Only the cost
    fields, the Cost axis, the composites (scores, views, jevbench_score, composite CIs) and the cost basis text move (pinned per
    field by sha256 in the proof and the loader); Intelligence, Calibration, Speed, Capability, cells, ranks, listing and notes are
    byte-equal. Microsoft-Decision-1 r2's disclosure ITEMS sentence is aligned (its cost no longer uses all 1,493 items).
No ranking change: every order list equals v1.7.15's; no d1027 row is in any order list."""
import os, pathlib, json, hashlib, copy, shutil, re, argparse
from pricing_reference_v1716 import reference, PIN
from rows_v1716 import (KEY as STRIKE, NOT_RANKED_BECAUSE, H2O_KEY, MSFT_KEY, DECISIO_KEY, note_for, cost_figures, OLD_FIGURES, H2O_OLD_UNTRIM,
                        H2O_NEW_UNTRIM, DECISIO_EXTRA, MSFT_OLD_TAIL, MSFT_NEW_TAIL, MSFT_OLD_ITEMS, MSFT_NEW_ITEMS, DRAW_ID, CAP)
ap = argparse.ArgumentParser(); ap.add_argument('--comparison-only', action='store_true'); A = ap.parse_args()
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1]))); V = W / 'data/raw/benchmarks/jevbench/v1.7'; REV = 'v1.7.16'; PREV = 'v1.7.15'
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest(); cp = copy.deepcopy
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
h = lambda t: hashlib.sha256(t.encode()).hexdigest()
hj = lambda v: hashlib.sha256(json.dumps(v, sort_keys=True, ensure_ascii=False).encode()).hexdigest()   # canonical JSON field hash
NULL_RANKS = {'A': None, 'B': None, 'C': None, 'capability': None}
COST_FIELDS = ['axes', 'composite_ci95', 'cost', 'jevbench_score', 'scores', 'v16', 'views']
old = {n: L(V / f'jevbench-{PREV}-{n}.json') for n in ['results', 'categories', 'carry', 'proof', 'publication']}
assert old['publication']['review']['verdict'] == 'PASS' and old['results']['revision'] == PREV
res = cp(old['results']); out = {s['key']: s for s in res['systems']}; prev = cp(out)
DRAW_ROWS = sorted(k for k, s in prev.items() if (s.get('draw') or {}).get('id') == DRAW_ID)
assert DRAW_ROWS == ['arcbright-elf-1-12b-r2', 'decisio-gemma-4-12b-tuned-commit-think', H2O_KEY, 'jeff_1_1_large', 'jeff_1_1_qwen_4b', MSFT_KEY, 'torchcast-decision-31b-v1.0']
DRAW = {f: prev[H2O_KEY]['draw'][f] for f in ['id', 'label', 'drawn_on', 'status', 'offset', 'offset_ci95']}
assert DRAW['id'] == DRAW_ID and DRAW['status'] == 'anchor-runs-pending' and DRAW['offset'] == {'C': 0, 'I': 0}
inputs = L(J / 'src/inputs.json'); recost = L(J / 'src/recost.json'); pins = L(J / 'receipts/INPUTS.json'); cells = L(J / 'src/cells.json'); entries = L(J / 'inputs/ENTRIES.json')
CS = pins['common_set']; N = CS['n']; assert N == 1489 and sorted(recost) == DRAW_ROWS and sorted(inputs) == [STRIKE]
# ---- 1. the same-items cost rule on the seven carried rows of the draw
exceptions, before_after = {}, {}
for k in DRAW_ROWS:
    s = prev[k]; r = recost[k]['v17-share']; c = recost[k]['common']
    assert s['ranked'] is False and s['rank'] is None and s['ranks'] == NULL_RANKS and s['listing'] == 'unranked' and s['not_ranked_because'] == note_for(k)
    assert s['cost']['common_basis'] is None and abs(s['cost']['usd_per_1000'] - c['usd_per_1000_all_items_published']) < 1e-15
    for f in ['intelligence', 'calibration', 'speed']: assert s['axes'][f] == r['axes'][f], (k, f)
    n = cp(s)
    for f in ['axes', 'scores', 'views', 'jevbench_score', 'composite_ci95']: n[f] = cp(r[f])
    assert {x: y for x, y in s['v16'].items() if x != 'ci95'} == {x: y for x, y in r['v16'].items() if x != 'ci95'}, k
    n['v16'] = cp(s['v16']); n['v16']['ci95']['composite'] = cp(r['v16']['ci95']['composite'])
    assert n['v16']['ci95'] == r['v16']['ci95'] and n['v16']['ci95']['composite'] == n['composite_ci95'], k
    usd, usd_all = r['cost']['usd_per_1000'], s['cost']['usd_per_1000']; assert abs(usd - c['usd_per_1000_common']) < 1e-15
    basis = s['cost']['basis']; fig = cost_figures(usd, N, usd_all)
    if k == MSFT_KEY:
        assert MSFT_OLD_TAIL.search(basis) and float(MSFT_OLD_TAIL.search(basis).group(1)) == round(usd_all, 6)
        basis = MSFT_OLD_TAIL.sub(lambda m: MSFT_NEW_TAIL.replace('{FIG}', fig), basis)
        assert s['disclosure'].count(MSFT_OLD_ITEMS) == 1; n['disclosure'] = s['disclosure'].replace(MSFT_OLD_ITEMS, MSFT_NEW_ITEMS)
    else:
        m = OLD_FIGURES.search(basis); assert m and float(m.group(1)) == round(usd_all, 6) and m.group(2) == f'{usd_all / CAP:.2f}', k
        basis = basis.replace(m.group(), fig)
        if k == H2O_KEY: assert basis.count(H2O_OLD_UNTRIM) == 1; basis = basis.replace(H2O_OLD_UNTRIM, H2O_NEW_UNTRIM)
        if k == DECISIO_KEY: basis = basis.replace(fig, fig + ' ' + DECISIO_EXTRA.replace('{ENG}', f"{c['common_input_tokens']:,}").replace('{OUT}', f"{c['common_output_tokens']:,}"))
    assert 'all 1,500 items of the draw (every row' not in basis and 'no common cost basis applies' not in basis and fig in basis
    n['cost'] = {**s['cost'], 'usd_per_1000': usd, 'basis': basis, 'common_basis': {'n_items': N, 'rule': 'common', 'usd_per_1000_all_items': usd_all}}
    changed = sorted(f for f in set(s) | set(n) if s.get(f) != n.get(f))
    assert set(changed) <= set(COST_FIELDS) | ({'disclosure'} if k == MSFT_KEY else set()), (k, changed)
    out[k] = n
    exceptions[k] = {f: {'before_sha256': hj(s.get(f)), 'after_sha256': hj(n.get(f))} for f in changed}
    before_after[k] = {'usd_per_1000_before_all_items': usd_all, 'usd_per_1000_after_common': usd, 'cost_axis_before': s['axes']['cost'], 'cost_axis_after': n['axes']['cost'],
                       'scores_before': s['scores'], 'scores_after': n['scores'], 'common_input_tokens': c['common_input_tokens'], 'common_output_tokens': c['common_output_tokens'],
                       'token_basis': c['token_basis'], 'field': recost[k]['field'], 'changed_fields': changed}
    if k == DECISIO_KEY: before_after[k]['engine_tokens_bound'] = c['engine_tokens_bound']; before_after[k]['usd_per_1000_bound'] = c['usd_per_1000_bound']
# ---- 2. the new row (hosted API), unranked like every row on the draw
assert STRIKE not in prev and pins[STRIKE]['raw_verified_in_place']
source_inputs = {n: sha(J / p) for n, p in {'scored_rows_sha256': 'src/inputs.json', 'entry_sha256': 'inputs/ENTRIES.json', 'cells_sha256': 'src/cells.json', 'recost_sha256': 'src/recost.json'}.items()}
source_sha = hashlib.sha256(json.dumps(source_inputs, sort_keys=True).encode()).hexdigest()
d = inputs[STRIKE]; en = entries[STRIKE]['entry']
ns = cp(d['v17-share']); assert ns['endpoint_kind'] == 'api' and ns['api_flag'] is True
for f in ['display', 'author', 'repo', 'provider', 'endpoint_condition', 'disclosure', 'model_pin']: ns[f] = cp(en[f])
ns.update(method='v1.7', new_in=REV, measured_in=REV, last_measured_on=d['measured_on'], measurement_date_status='measured', paid_fast_lane=False)
ns['cost']['basis'] = en['cost_basis']
ns['draw'] = {**DRAW, 'release': REV, 'measured_on': d['measured_on'], 'g_med': res['G_med'], 'results_sha256': pins[STRIKE]['v17-share']['sha256']}
ns['noul_decisive'] = {f: cells[STRIKE]['noul_share'][f] for f in ['acc_among_decisive', 'decisive', 'decisive_rate', 'n', 'supported', 'valid']}
for f in ['axes', 'scores', 'views', 'jevbench_score', 'capability', 'composite_ci95', 'intelligence', 'calibration', 'validity', 'status', 'support', 'speed', 'v16', 'decision_limit']: assert ns[f] == d['v17-share'][f], f
assert ns['v16']['g_med_used'] == res['G_med'] == 2.573387642438244 and ns['v16']['equating_offset'] is None
assert ns['cost']['common_basis'] == {'n_items': N, 'rule': 'common', 'usd_per_1000_all_items': d['usd_per_1000_all_items']}
ns.update(ranked=False, rank=None, ranks=dict(NULL_RANKS), listing='unranked', not_ranked_because=note_for(STRIKE))
BANNED = re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|\blead\b|custody|deputy|auto-intake|9D88ECFA|d1027-|(?-i:DECISIONS)|\{[A-Za-z_][A-Za-z0-9_]*\}', re.I)
for k in DRAW_ROWS + [STRIKE]:
    row = out.get(k, ns)
    hit = BANNED.search(json.dumps({f: row.get(f) for f in ['display', 'author', 'licence', 'disclosure', 'endpoint_condition', 'cost']}) if k == STRIKE else row['cost']['basis'])
    assert not hit, ('internal public text', k, hit.group())
    hit = BANNED.search(row['not_ranked_because'].replace('unranked', '')); assert not hit, ('internal public text', k, hit.group())
out[STRIKE] = ns
# Unranked: the board (every order list) is the predecessor's, byte for byte, and no d1027 row is in any order list.
assert res['board'] == old['results']['board'] and not any(x in res['board'][m]['order'] for m in res['board'] for x in DRAW_ROWS + [STRIKE])
for k, row in prev.items():
    if k in DRAW_ROWS: assert {f: v for f, v in out[k].items() if f not in exceptions[k]} == {f: v for f, v in row.items() if f not in exceptions[k]}, k
    else: assert out[k] == row, ('carried row changed', k)
HIST = "Added Strike-1 (hosted) on the 27 Oct regular draw, shown unranked; costs on that draw now use the items every row answered."
res.update(revision=REV, label='JevBench v1.7.16: Strike-1 on the 27 Oct regular draw; same-items cost on that draw',
           systems=sorted(out.values(), key=lambda s: s['key']), n_ranked=sum(bool(s['ranked']) for s in out.values()), roster_count=len(out),
           run_kind='same-draw-addendum', source_sha256=source_sha, source_note=HIST)
assert res['n_ranked'] == old['results']['n_ranked'] and res['roster_count'] == len(prev) + 1
res['measurement_notes'] = old['results']['measurement_notes'] + [HIST + ' Strike-1 is a hosted decision API (EU, OVH Gravelines); it answered 1,495 of the draw\'s 1,500 items: '
    '5 items over the provider\'s input limit were refused and count as wrong; none took longer than 10 s. The vendor reports 0 output tokens (no text is generated) and describes '
    'the model as a fine-tune of Qwen/Qwen3.5-4B, whose market reference prices its cost (estimate). SAME-ITEMS COST: because Strike-1 refuses the 5 longest items and '
    'Microsoft-Decision-1 (updated weights) ran on 1,493 items, every row on that draw is now costed on the ' + f'{N:,}' + ' items every row answered, with its own price '
    'reference and token basis; its all-items cost is stated next to it. Only cost, the Cost axis and the composites of those rows change; Intelligence, Calibration, Speed '
    'and every category cell are unchanged. The draw is not equated to the reference scale, so its numbers are shown as published (offset 0). '
    'NOT RANKED: the carried rows on that draw keep their notes, based on "' + NOT_RANKED_BECAUSE + '" Strike-1 carries the note "' + note_for(STRIKE) + '" No existing rank or ranking changed.']
res['addendum'] = {'predecessor': PREV, 'new_keys': [STRIKE], 'remeasured_keys': [], 'repriced_keys': DRAW_ROWS, 'link_fixed_keys': [], 'text_fixed_keys': [], 'method_change': False, 'same_draw': DRAW_ID,
                   'cost_basis': {'rule': 'same-items (common answered set of every row on the draw)', 'n_items': N, 'set_sha256': CS['set_sha256']}}
put(V / f'jevbench-{REV}-results.json', res)
cat = cp(old['categories'])
c = cp(cells[STRIKE]['cells_share']); assert 'topics' not in c   # the draw has no topic labels (topics optional)
cat['systems'][STRIKE] = c; cat['lanes'][STRIKE] = d['registry']['lane']
cat.update(revision=REV, results_sha256=sha(V / f'jevbench-{REV}-results.json'), source_results_sha256=res['source_sha256'], results_sha256_note='Bound to v1.7.16 results; all carried cells retained (the same-items cost rule changes no cell); the new row\'s cells are computed with unchanged frozen tools on its own draw (no topic labels on that draw).')
put(V / f'jevbench-{REV}-categories.json', cat)
for n in ['carry', 'history', 'history-carry']: shutil.copyfile(V / f'jevbench-{PREV}-{n}.json', V / f'jevbench-{REV}-{n}.json')
# Scorer pins: v1.7.15's (= v1.7.11's tools); prove every tool used here is byte-identical on disk.
scorers = old['proof']['scorers']; H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness'); S17 = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
TOOLS = {'a2_cells_v16': H / 'a2_cells_v16.py', 'build_categories_v16': H / 'build_categories_v16.py', 'build_topics_v16': H / 'build_topics_v16.py', 'decisive_v16': H / 'decisive_v16.py', 'noul_method_v16': H / 'noul_method_v16.py', 'pins_v17': S17 / 'PINS-v17.json', 'run_under_v17': S17 / 'run_under_v17.py', 'score_v15': H / 'score_v15.py', 'score_v15_headlineA': H / 'score_v15_headlineA.py', 'score_v16': H / 'score_v16.py', 'score_v17': S17 / 'score_v17.py'}
assert set(TOOLS) == set(scorers) and all(sha(p) == scorers[n] for n, p in TOOLS.items()), 'scorer tool bytes differ from the v1.7.15 pins'
tf = J / 'receipts/topfive-diff.json'; a = L(J / 'inputs/APPROVAL.json')
if tf.exists() and not A.comparison_only: assert not L(tf).get('bootstrap')
if A.comparison_only and not tf.exists(): a['top_five_preview']['sha256'] = hashlib.sha256(b'comparison bootstrap').hexdigest()
bounds = {STRIKE: {dim: cells[STRIKE]['pool_share'][dim] for dim in ['usecases', 'languages']} | {'topics': {}}}
EXCEPT = [', '.join(DRAW_ROWS) + ': cost fields only under the same-items cost rule (cost, Cost axis, composites: scores, views, jevbench_score, composite CIs, v16.ci95.composite; '
          'microsoft-decision-1-r2 also its disclosure ITEMS sentence); Intelligence, Calibration, Speed, Capability, cells, ranks, listing and notes unchanged']
COST_RULE = {'rule': 'same-items: cost per 1,000 decisions on the items every row on the draw answered (HTTP 200, ok, no error); refused, failed or not-sent items count for no row\'s cost and still count as wrong answers',
             'precedent': 'v1.6.30 on v1.6-regular-20261012 (scorer flag --cost-basis)', 'scorer_flag': '--cost-basis', 'n_items': N, 'n_excluded_from_1500': 11, 'set_sha256': CS['set_sha256'],
             'set_hash_rule': CS['set_hash_rule'], 'cost_basis_sha256': CS['cost_basis_sha256'], 'cost_basis_msft_view_sha256': CS['cost_basis_msft_view_sha256'],
             'per_row_membership': CS['per_row_membership'], 'rows': before_after,
             'decisio_note': 'Decisio is priced on its engine recount (totals only): the common-set engine count assumes the modal per-item engine-native delta 78 for the 6 further excluded items; exact to within 6 tokens (USD bound in rows)',
             'h2o_note': 'H2O is priced on processed tokens after its 32k trim; its only 5 trimmed states are the 5 longest items, all outside the common set, so processed = raw usage there'}
proof = {'source_inputs': source_inputs, 'schema_version': 1, 'revision': REV, 'predecessor': {'revision': PREV, 'publication_sha256': sha(V / f'jevbench-{PREV}-publication.json')}, 'method': res['method'], 'pricing_module_sha256': PIN, 'scorers': scorers,
         'carried_rows': len(prev), 'carried_rows_equal_except': EXCEPT, 'exceptions': exceptions, 'cost_basis': COST_RULE,
         'same_draw': {**DRAW, 'g_med_used': res['G_med'], 'g_med_rule': 'reference G_med of the merged board (penalty 1.0 for the new row under the reference)', 'manifest_sha256': pins[STRIKE]['manifest_sha256'], 'equating': 'not applied (draw stays anchor-runs-pending, offset 0)'},
         'new_rows': {STRIKE: {'raw_sha256': d['raw_sha256'], 'scored_input_sha256': pins[STRIKE]['v17-share']['sha256'], 'source_sha256': pins[STRIKE], 'model_pin': ns['model_pin'], 'price_reference': reference(STRIKE, d['registry']),
                               'axes': ns['axes'], 'composite_ci95': ns['composite_ci95'], 'decision_limit': ns['decision_limit'], 'treatment': 'unranked',
                               'n_items': 1500, 'n_answered': 1495, 'n_refused_over_limit': 5, 'refused_because': 'input over the provider limit (8,192 tokens or 32,000 characters); scored as misses, kept in the denominator',
                               'cost': {'usd_per_1000': d['usd_per_1000'], 'usd_per_1000_all_items': d['usd_per_1000_all_items'], 'input_tokens_common': d['input_tokens_common'], 'input_tokens_all': d['input_tokens_all'], 'output_tokens': 0, 'basis_items': N, 'kind': 'estimate'},
                               'equated': {'offset': DRAW['offset'], 'intelligence': ns['axes']['intelligence'], 'calibration': ns['axes']['calibration'], 'capability': ns['capability'], 'scores': ns['scores']},
                               'category_pool_bounds': bounds[STRIKE]}},
         'remeasured_rows': {}, 'repriced_rows': {k: {'fields': sorted(exceptions[k]), 'usd_per_1000': before_after[k]['usd_per_1000_after_common'], 'usd_per_1000_all_items': before_after[k]['usd_per_1000_before_all_items']} for k in DRAW_ROWS},
         'link_fixed_rows': [], 'text_fixed_rows': [], 'publication_approval': a, 'topfive_diff_sha256': sha(tf) if tf.exists() else a['top_five_preview']['sha256']}
put(V / f'jevbench-{REV}-proof.json', proof); pub = cp(old['publication']); pub.update(revision=REV, predecessor=proof['predecessor'], review={'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None})
pub['files'] = {n: {'path': f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json', 'sha256': sha(V / f'jevbench-{REV}-{n}.json')} for n in ['results', 'categories', 'carry', 'proof', 'history', 'history-carry']}
put(V / f'jevbench-{REV}-publication.json', pub)
put(J / 'receipts/NEW-ROW-SPEC.json', {STRIKE: out[STRIKE]}); put(J / 'receipts/NEW-ROW-BOUNDS.json', bounds)
put(J / 'receipts/COST-CHANGES.json', {k: {**before_after[k], 'basis_before': prev[k]['cost']['basis'], 'basis_after': out[k]['cost']['basis'], **({'disclosure_before': prev[k]['disclosure'], 'disclosure_after': out[k]['disclosure']} if k == MSFT_KEY else {}), 'exceptions': exceptions[k]} for k in DRAW_ROWS})
put(J / 'receipts/BUILD.json', {'revision': REV, 'base': PREV, 'base_publication_sha256': proof['predecessor']['publication_sha256'], 'base_review_at_build': old['publication']['review']['verdict'], 'carried_equal': len(prev) - len(DRAW_ROWS),
                                'carried_recosted': DRAW_ROWS, 'new_rows_unranked': [STRIKE], 'new_keys': [STRIKE], 'same_draw': DRAW_ID, 'draw_status': DRAW['status'], 'common_set': {'n': N, 'set_sha256': CS['set_sha256']},
                                'roster_count': len(out), 'n_ranked': res['n_ranked'], 'files': pub['files']})
print('Built PENDING', REV, len(out), 'rows;', len(prev), 'carried (', len(prev) - len(DRAW_ROWS), 'fully equal incl. ranks;', len(DRAW_ROWS), 'draw rows re-costed on', N, 'common items, cost fields only); new row unranked:', STRIKE, '; board unchanged; n_ranked', res['n_ranked'], '; comparison_only', A.comparison_only)
