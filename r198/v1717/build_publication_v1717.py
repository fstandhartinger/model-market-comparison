"""Add Jev-Style-2B unranked; the nine-raw common set is unchanged and all carried rows are immutable."""
import os, pathlib, json, hashlib, copy, shutil, re, argparse
from pricing_reference_v1717 import reference, PIN
from rows_v1717 import KEY as STRIKE, NOT_RANKED_BECAUSE, H2O_KEY, note_for, DRAW_ID, CAP
ap = argparse.ArgumentParser(); ap.add_argument('--comparison-only', action='store_true'); A = ap.parse_args()
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1]))); V = W / 'data/raw/benchmarks/jevbench/v1.7'; REV = 'v1.7.17'; PREV = 'v1.7.16'
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest(); cp = copy.deepcopy
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
h = lambda t: hashlib.sha256(t.encode()).hexdigest()
hj = lambda v: hashlib.sha256(json.dumps(v, sort_keys=True, ensure_ascii=False).encode()).hexdigest()   # canonical JSON field hash
NULL_RANKS = {'A': None, 'B': None, 'C': None, 'capability': None}
COST_FIELDS = ['axes', 'composite_ci95', 'cost', 'jevbench_score', 'scores', 'v16', 'views']
old = {n: L(V / f'jevbench-{PREV}-{n}.json') for n in ['results', 'categories', 'carry', 'proof', 'publication']}
assert old['publication']['review']['verdict'] in ['PASS','PENDING'] and old['results']['revision'] == PREV
res = cp(old['results']); out = {s['key']: s for s in res['systems']}; prev = cp(out)
DRAW_ROWS = sorted(k for k, s in prev.items() if (s.get('draw') or {}).get('id') == DRAW_ID)
assert DRAW_ROWS == ['arcbright-elf-1-12b-r2', 'decisio-gemma-4-12b-tuned-commit-think', H2O_KEY, 'jeff_1_1_large', 'jeff_1_1_qwen_4b', 'microsoft-decision-1-r2', 'strike-1', 'torchcast-decision-31b-v1.0']
DRAW = {f: prev[H2O_KEY]['draw'][f] for f in ['id', 'label', 'drawn_on', 'status', 'offset', 'offset_ci95']}
assert DRAW['id'] == DRAW_ID and DRAW['status'] == 'anchor-runs-pending' and DRAW['offset'] == {'C': 0, 'I': 0}
inputs = L(J / 'src/inputs.json'); recost = L(J / 'src/recost.json'); pins = L(J / 'receipts/INPUTS.json'); cells = L(J / 'src/cells.json'); entries = L(J / 'inputs/ENTRIES.json')
CS = pins['common_set']; N = CS['n']; assert N == 1489 and recost == {} and sorted(inputs) == [STRIKE]
# Every carried row is byte-equal: the nine-raw common set is unchanged.
exceptions, before_after = {}, {}
# ---- 2. the new row (hosted API), unranked like every row on the draw
assert STRIKE not in prev and pins[STRIKE]['raw_verified_in_place']
source_inputs = {n: sha(J / p) for n, p in {'scored_rows_sha256': 'src/inputs.json', 'entry_sha256': 'inputs/ENTRIES.json', 'cells_sha256': 'src/cells.json', 'recost_sha256': 'src/recost.json'}.items()}
source_sha = hashlib.sha256(json.dumps(source_inputs, sort_keys=True).encode()).hexdigest()
d = inputs[STRIKE]; en = entries[STRIKE]['entry']
ns = cp(d['v17-share']); assert ns['endpoint_kind'] == 'gpu' and ns['api_flag'] is False
for f in ['display', 'author', 'repo', 'provider', 'endpoint_condition', 'disclosure', 'model_pin', 'licence']: ns[f] = cp(en[f])
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
    assert out[k] == row, ('carried row changed', k)
HIST = "Added Jev-Style-2B (self-hosted) on the 27 Oct regular draw, shown unranked."
res.update(revision=REV, label='JevBench v1.7.17: Jev-Style-2B on the 27 Oct regular draw, shown unranked',
           systems=sorted(out.values(), key=lambda s: s['key']), n_ranked=sum(bool(s['ranked']) for s in out.values()), roster_count=len(out),
           run_kind='same-draw-addendum', source_sha256=source_sha, source_note=HIST)
assert res['n_ranked'] == old['results']['n_ranked'] and res['roster_count'] == len(prev) + 1
res['measurement_notes'] = old['results']['measurement_notes'] + [HIST+' '+ns['disclosure']+' '+ns['not_ranked_because']]
res['addendum'] = {'predecessor': PREV, 'new_keys': [STRIKE], 'remeasured_keys': [], 'repriced_keys': [], 'link_fixed_keys': [], 'text_fixed_keys': [], 'method_change': False, 'same_draw': DRAW_ID,
                   'cost_basis': {'rule': 'same-items (common answered set of every row on the draw)', 'n_items': N, 'set_sha256': CS['set_sha256']}}
put(V / f'jevbench-{REV}-results.json', res)
cat = cp(old['categories'])
c = cp(cells[STRIKE]['cells_share']); assert 'topics' not in c   # the draw has no topic labels (topics optional)
cat['systems'][STRIKE] = c; cat['lanes'][STRIKE] = d['registry']['lane']
cat.update(revision=REV, results_sha256=sha(V / f'jevbench-{REV}-results.json'), source_results_sha256=res['source_sha256'], results_sha256_note='Bound to v1.7.17 results; all carried rows and cells retained exactly; the new row\'s cells are computed with unchanged frozen tools on its own draw (no topic labels on that draw).')
put(V / f'jevbench-{REV}-categories.json', cat)
for n in ['carry', 'history', 'history-carry']: shutil.copyfile(V / f'jevbench-{PREV}-{n}.json', V / f'jevbench-{REV}-{n}.json')
# Scorer pins: v1.7.16's (= v1.7.11's tools); prove every tool used here is byte-identical on disk.
scorers = old['proof']['scorers']; H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness'); S17 = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
TOOLS = {'a2_cells_v16': H / 'a2_cells_v16.py', 'build_categories_v16': H / 'build_categories_v16.py', 'build_topics_v16': H / 'build_topics_v16.py', 'decisive_v16': H / 'decisive_v16.py', 'noul_method_v16': H / 'noul_method_v16.py', 'pins_v17': S17 / 'PINS-v17.json', 'run_under_v17': S17 / 'run_under_v17.py', 'score_v15': H / 'score_v15.py', 'score_v15_headlineA': H / 'score_v15_headlineA.py', 'score_v16': H / 'score_v16.py', 'score_v17': S17 / 'score_v17.py'}
assert set(TOOLS) == set(scorers) and all(sha(p) == scorers[n] for n, p in TOOLS.items()), 'scorer tool bytes differ from the v1.7.16 pins'
tf = J / 'receipts/topfive-diff.json'; a = L(J / 'inputs/APPROVAL.json')
if tf.exists() and not A.comparison_only: assert not L(tf).get('bootstrap')
if A.comparison_only and not tf.exists(): a['top_five_preview']['sha256'] = hashlib.sha256(b'comparison bootstrap').hexdigest()
bounds = {STRIKE: {dim: cells[STRIKE]['pool_share'][dim] for dim in ['usecases', 'languages']} | {'topics': {}}}
EXCEPT = []
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
                               'n_items': 1500, 'n_answered': 1495, 'n_refused_over_limit': 5, 'refused_because': 'input over the model limit of 32,768 tokens; scored as misses, kept in the denominator',
                               'cost': {'usd_per_1000': d['usd_per_1000'], 'usd_per_1000_all_items': d['usd_per_1000_all_items'], 'input_tokens_common': d['input_tokens_common'], 'input_tokens_all': d['input_tokens_all'], 'output_tokens': 0, 'basis_items': N, 'kind': 'estimate'},
                               'equated': {'offset': DRAW['offset'], 'intelligence': ns['axes']['intelligence'], 'calibration': ns['axes']['calibration'], 'capability': ns['capability'], 'scores': ns['scores']},
                               'category_pool_bounds': bounds[STRIKE]}},
         'remeasured_rows': {}, 'repriced_rows': {},
         'link_fixed_rows': [], 'text_fixed_rows': [], 'publication_approval': a, 'topfive_diff_sha256': sha(tf) if tf.exists() else a['top_five_preview']['sha256']}
put(V / f'jevbench-{REV}-proof.json', proof); pub = cp(old['publication']); pub.update(revision=REV, predecessor=proof['predecessor'], review={'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None})
pub['files'] = {n: {'path': f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json', 'sha256': sha(V / f'jevbench-{REV}-{n}.json')} for n in ['results', 'categories', 'carry', 'proof', 'history', 'history-carry']}
put(V / f'jevbench-{REV}-publication.json', pub)
put(J / 'receipts/NEW-ROW-SPEC.json', {STRIKE: out[STRIKE]}); put(J / 'receipts/NEW-ROW-BOUNDS.json', bounds)
put(J / 'receipts/COST-CHANGES.json', {})
put(J / 'receipts/BUILD.json', {'revision': REV, 'base': PREV, 'base_publication_sha256': proof['predecessor']['publication_sha256'], 'base_review_at_build': old['publication']['review']['verdict'], 'carried_equal': len(prev),
                                'carried_recosted': [], 'new_rows_unranked': [STRIKE], 'new_keys': [STRIKE], 'same_draw': DRAW_ID, 'draw_status': DRAW['status'], 'common_set': {'n': N, 'set_sha256': CS['set_sha256']},
                                'roster_count': len(out), 'n_ranked': res['n_ranked'], 'files': pub['files']})
print('Built PENDING', REV, len(out), 'rows;', len(prev), 'carried (', len(prev), 'fully equal incl. ranks;', 0, 'draw rows re-costed on', N, 'common items, cost fields only); new row unranked:', STRIKE, '; board unchanged; n_ranked', res['n_ranked'], '; comparison_only', A.comparison_only)
