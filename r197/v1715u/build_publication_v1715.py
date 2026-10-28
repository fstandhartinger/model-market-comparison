"""v1.7.15 (unranked variant): same-draw addendum on the 27 Oct 2026 regular draw (v1.6-regular-20261027), stacked on the flipped,
sealed v1.7.14 (PASS). One new row, Microsoft-Decision-1 with updated weights (paid public evaluation, hosted API, scored on 1,493
items), measured but UNRANKED like every row on that draw; and the public not-ranked note of the draw's six carried rows is replaced
with the d1027 note (decision d1027-strong-anchors-needed: the 12-anchor equating is not strong enough for rows at this level, so the
draw stays unequated, offset 0, and its rows stay unranked). No equating, no order-list change: every predecessor row is immutable,
ranks included, except exactly the not_ranked_because text of the six draw rows (pinned by sha256 in the proof and the loader)."""
import os, pathlib, json, hashlib, copy, shutil, re, argparse
from pricing_reference_v1715 import reference, PIN
from rows_v1715 import KEY as MSFT, NOT_RANKED_BECAUSE, H2O_KEY, H2O_EXTRA, note_for
ap = argparse.ArgumentParser(); ap.add_argument('--comparison-only', action='store_true'); A = ap.parse_args()
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1]))); V = W / 'data/raw/benchmarks/jevbench/v1.7'; REV = 'v1.7.15'; PREV = 'v1.7.14'
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest(); cp = copy.deepcopy
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
h = lambda t: hashlib.sha256(t.encode()).hexdigest()
DRAW_ID = 'v1.6-regular-20261027'
NULL_RANKS = {'A': None, 'B': None, 'C': None, 'capability': None}
NOTE_FIELD = 'not_ranked_because'
old = {n: L(V / f'jevbench-{PREV}-{n}.json') for n in ['results', 'categories', 'carry', 'proof', 'publication']}
assert old['publication']['review']['verdict'] == 'PASS' and old['results']['revision'] == PREV
res = cp(old['results']); out = {s['key']: s for s in res['systems']}; prev = cp(out)
# The draw block comes from the predecessor's rows on the same draw (status/offset/label as published there: not yet equated, offset 0).
DRAW_ROWS = sorted(k for k, s in prev.items() if (s.get('draw') or {}).get('id') == DRAW_ID)
assert DRAW_ROWS == ['arcbright-elf-1-12b-r2', 'decisio-gemma-4-12b-tuned-commit-think', H2O_KEY, 'jeff_1_1_large', 'jeff_1_1_qwen_4b', 'torchcast-decision-31b-v1.0']
DRAW = {f: prev[H2O_KEY]['draw'][f] for f in ['id', 'label', 'drawn_on', 'status', 'offset', 'offset_ci95']}
assert DRAW['id'] == DRAW_ID and DRAW['status'] == 'anchor-runs-pending' and DRAW['offset'] == {'C': 0, 'I': 0}
# H2O's extra sentence is the published v1.7.13 comparison, re-derived from the two rows' public-item Intelligence.
h2o_i, v11_i = prev[H2O_KEY]['intelligence']['I_open'], prev['h2o-lightning-4b']['intelligence']['I_open']
assert H2O_EXTRA == f'On the 300 public items every draw shares, this version scores {h2o_i:.1f} Intelligence vs {v11_i:.1f} for H2O-Lightning-4B v1.1.'
assert H2O_EXTRA.rstrip('.') in prev[H2O_KEY][NOTE_FIELD].replace(';', '.'), 'H2O keeps its published comparison sentence'
# ---- the six carried rows of the draw: only the public not-ranked note changes
exceptions = {}
for k in DRAW_ROWS:
    s = prev[k]
    assert s['ranked'] is False and s['rank'] is None and s['ranks'] == NULL_RANKS and s['listing'] == 'unranked' and s['draw'] == {**s['draw'], **DRAW}
    assert s[NOTE_FIELD].startswith('Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale.'), k
    out[k] = {**s, NOTE_FIELD: note_for(k)}
    exceptions[k] = {NOTE_FIELD: {'before_sha256': h(s[NOTE_FIELD]), 'after_sha256': h(out[k][NOTE_FIELD])}}
# ---- the new row (hosted API, paid public), unranked like every row on the draw
inputs = L(J / 'src/inputs.json'); pins = L(J / 'receipts/INPUTS.json'); cells = L(J / 'src/cells.json'); entries = L(J / 'inputs/ENTRIES.json'); keys = sorted(inputs)
assert keys == [MSFT] and MSFT not in prev and pins[MSFT]['raw_verified_in_place']
source_inputs = {n: sha(J / p) for n, p in {'scored_rows_sha256': 'src/inputs.json', 'entry_sha256': 'inputs/ENTRIES.json', 'cells_sha256': 'src/cells.json'}.items()}
source_sha = hashlib.sha256(json.dumps(source_inputs, sort_keys=True).encode()).hexdigest()
d = inputs[MSFT]; en = entries[MSFT]['entry']
ns = cp(d['v17-share']); assert ns['endpoint_kind'] == 'api' and ns['api_flag'] is True
for f in ['display', 'author', 'repo', 'provider', 'endpoint_condition', 'disclosure', 'model_pin']: ns[f] = cp(en[f])
ns.update(method='v1.7', new_in=REV, measured_in=REV, last_measured_on=d['measured_on'], measurement_date_status='measured', paid_fast_lane=True)
ns['cost']['basis'] = en['cost_basis']
ns['draw'] = {**DRAW, 'release': REV, 'measured_on': d['measured_on'], 'g_med': res['G_med'], 'results_sha256': pins[MSFT]['v17-share']['sha256']}
ns['noul_decisive'] = {f: cells[MSFT]['noul_share'][f] for f in ['acc_among_decisive', 'decisive', 'decisive_rate', 'n', 'supported', 'valid']}
for f in ['axes', 'scores', 'views', 'jevbench_score', 'capability', 'composite_ci95', 'intelligence', 'calibration', 'validity', 'status', 'support', 'speed', 'v16', 'decision_limit']: assert ns[f] == d['v17-share'][f], f
assert ns['v16']['g_med_used'] == res['G_med'] == 2.573387642438244 and ns['v16']['equating_offset'] is None
ns.update(ranked=False, rank=None, ranks=dict(NULL_RANKS), listing='unranked', not_ranked_because=note_for(MSFT))
BANNED = re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|\blead\b|custody|deputy|auto-intake|d2b677de|9cde338c|d1027-|(?-i:DECISIONS)|\{[A-Za-z_][A-Za-z0-9_]*\}', re.I)
hit = BANNED.search(json.dumps({f: ns.get(f) for f in ['display', 'author', 'licence', 'disclosure', 'code_revision', 'endpoint_condition', 'cost']}))
assert not hit, ('internal public text', MSFT, hit.group())
for k in DRAW_ROWS + [MSFT]:
    row = out.get(k, ns); hit = BANNED.search(row[NOTE_FIELD].replace('unranked', '')); assert not hit, ('internal public text', k, hit.group())
out[MSFT] = ns
# Unranked: the board (every order list) is the predecessor's, byte for byte, and the new row is in no order list.
assert res['board'] == old['results']['board'] and not any(MSFT in res['board'][m]['order'] for m in res['board'])
for k, row in prev.items():
    if k in DRAW_ROWS: assert {f: v for f, v in out[k].items() if f != NOTE_FIELD} == {f: v for f, v in row.items() if f != NOTE_FIELD}, k
    else: assert out[k] == row, ('carried row changed', k)
HIST = ("Added Microsoft-Decision-1 with updated weights (paid evaluation) on the 27 Oct regular draw; that draw's rows stay unranked "
        "until stronger anchors are measured.")
res.update(revision=REV, label='JevBench v1.7.15: Microsoft-Decision-1 with updated weights on the 27 Oct regular draw',
           systems=sorted(out.values(), key=lambda s: s['key']), n_ranked=sum(bool(s['ranked']) for s in out.values()), roster_count=len(out),
           run_kind='same-draw-addendum', source_sha256=source_sha, source_note=HIST)
assert res['n_ranked'] == old['results']['n_ranked'] and res['roster_count'] == len(prev) + 1
res['measurement_notes'] = old['results']['measurement_notes'] + [HIST + ' Microsoft-Decision-1 (updated weights) answered 1,489 of 1,493 items of the draw: '
    '7 items its provider had seen in an earlier evaluation are excluded, and 4 requests over its 32,768-token context limit count as wrong; none took longer than 10 s. '
    'The served model id is unchanged from the first measurement; the weights update is Microsoft\'s statement. '
    'Its cost uses the advertised Azure Foundry tariff (USD 0.042 per million input tokens, output free), as for the first Microsoft-Decision-1 row, which stays unchanged. '
    'The draw is not equated to the reference scale, so its numbers are shown as published (offset 0) with the reference gap-penalty median. '
    'This draw has no subject-topic labels yet, so the row has no topic cells; its use-case and language cells are measured on its own 1,493 items. '
    'NOT RANKED: every row on that draw now carries the note "' + NOT_RANKED_BECAUSE + '" No existing score, rank or ranking changed.']
res['addendum'] = {'predecessor': PREV, 'new_keys': keys, 'remeasured_keys': [], 'repriced_keys': [], 'link_fixed_keys': [], 'text_fixed_keys': DRAW_ROWS, 'method_change': False, 'same_draw': DRAW_ID}
put(V / f'jevbench-{REV}-results.json', res)
cat = cp(old['categories'])
c = cp(cells[MSFT]['cells_share']); assert 'topics' not in c   # the draw has no topic labels (topics optional)
cat['systems'][MSFT] = c; cat['lanes'][MSFT] = d['registry']['lane']
cat.update(revision=REV, results_sha256=sha(V / f'jevbench-{REV}-results.json'), source_results_sha256=res['source_sha256'], results_sha256_note='Bound to v1.7.15 results; all carried cells retained; the new row\'s cells are computed with unchanged frozen tools on its own 1,493 items of the draw (no topic labels on that draw).')
put(V / f'jevbench-{REV}-categories.json', cat)
for n in ['carry', 'history', 'history-carry']: shutil.copyfile(V / f'jevbench-{PREV}-{n}.json', V / f'jevbench-{REV}-{n}.json')
# Scorer pins: v1.7.14's (= v1.7.11's tools); prove every tool used here is byte-identical on disk.
scorers = old['proof']['scorers']; H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness'); S17 = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
TOOLS = {'a2_cells_v16': H / 'a2_cells_v16.py', 'build_categories_v16': H / 'build_categories_v16.py', 'build_topics_v16': H / 'build_topics_v16.py', 'decisive_v16': H / 'decisive_v16.py', 'noul_method_v16': H / 'noul_method_v16.py', 'pins_v17': S17 / 'PINS-v17.json', 'run_under_v17': S17 / 'run_under_v17.py', 'score_v15': H / 'score_v15.py', 'score_v15_headlineA': H / 'score_v15_headlineA.py', 'score_v16': H / 'score_v16.py', 'score_v17': S17 / 'score_v17.py'}
assert set(TOOLS) == set(scorers) and all(sha(p) == scorers[n] for n, p in TOOLS.items()), 'scorer tool bytes differ from the v1.7.14 pins'
tf = J / 'receipts/topfive-diff.json'; a = L(J / 'inputs/APPROVAL.json')
if tf.exists() and not A.comparison_only: assert not L(tf).get('bootstrap')
if A.comparison_only and not tf.exists(): a['top_five_preview']['sha256'] = hashlib.sha256(b'comparison bootstrap').hexdigest()
bounds = {MSFT: {dim: cells[MSFT]['pool_share'][dim] for dim in ['usecases', 'languages']} | {'topics': {}}}
EXCEPT = [', '.join(DRAW_ROWS) + ': not_ranked_because only (the public note of the 27 Oct draw rows; numbers, ranks, listing, disclosures and cells unchanged)']
proof = {'source_inputs': source_inputs, 'schema_version': 1, 'revision': REV, 'predecessor': {'revision': PREV, 'publication_sha256': sha(V / f'jevbench-{PREV}-publication.json')}, 'method': res['method'], 'pricing_module_sha256': PIN, 'scorers': scorers,
         'carried_rows': len(prev), 'carried_rows_equal_except': EXCEPT, 'exceptions': exceptions,
         'same_draw': {**DRAW, 'g_med_used': res['G_med'], 'g_med_rule': 'reference G_med of the merged board (penalty 1.0 for the new row under the reference)', 'manifest_sha256': pins[MSFT]['manifest_sha256'], 'equating': 'not applied (draw stays anchor-runs-pending, offset 0)'},
         'new_rows': {MSFT: {'raw_sha256': d['raw_sha256'], 'scored_input_sha256': pins[MSFT]['v17-share']['sha256'], 'source_sha256': pins[MSFT], 'model_pin': ns['model_pin'], 'price_reference': reference(MSFT, d['registry']),
                             'axes': ns['axes'], 'composite_ci95': ns['composite_ci95'], 'decision_limit': ns['decision_limit'], 'treatment': 'unranked',
                             'n_items': 1493, 'n_excluded': 7, 'excluded_because': 'provider had seen them in an earlier evaluation',
                             'cost': {'usd_per_1000': d['usd_per_1000'], 'input_tokens': d['input_tokens'], 'output_tokens': d['output_tokens'], 'basis_items': 1493, 'kind': 'tariff'},
                             'equated': {'offset': DRAW['offset'], 'intelligence': ns['axes']['intelligence'], 'calibration': ns['axes']['calibration'], 'capability': ns['capability'], 'scores': ns['scores']},
                             'category_pool_bounds': bounds[MSFT]}},
         'remeasured_rows': {}, 'repriced_rows': {}, 'link_fixed_rows': [], 'text_fixed_rows': DRAW_ROWS, 'publication_approval': a, 'topfive_diff_sha256': sha(tf) if tf.exists() else a['top_five_preview']['sha256']}
put(V / f'jevbench-{REV}-proof.json', proof); pub = cp(old['publication']); pub.update(revision=REV, predecessor=proof['predecessor'], review={'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None})
pub['files'] = {n: {'path': f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json', 'sha256': sha(V / f'jevbench-{REV}-{n}.json')} for n in ['results', 'categories', 'carry', 'proof', 'history', 'history-carry']}
put(V / f'jevbench-{REV}-publication.json', pub)
put(J / 'receipts/NEW-ROW-SPEC.json', {MSFT: out[MSFT]}); put(J / 'receipts/NEW-ROW-BOUNDS.json', bounds)
put(J / 'receipts/TEXT-CHANGES.json', {k: {'before': prev[k][NOTE_FIELD], 'after': out[k][NOTE_FIELD], **exceptions[k][NOTE_FIELD]} for k in DRAW_ROWS})
put(J / 'receipts/BUILD.json', {'revision': REV, 'base': PREV, 'base_publication_sha256': proof['predecessor']['publication_sha256'], 'base_review_at_build': old['publication']['review']['verdict'], 'carried_equal': len(prev) - len(DRAW_ROWS),
                                'carried_note_replaced': DRAW_ROWS, 'new_rows_unranked': keys, 'new_keys': keys, 'same_draw': DRAW_ID, 'draw_status': DRAW['status'], 'roster_count': len(out), 'n_ranked': res['n_ranked'], 'files': pub['files']})
print('Built PENDING', REV, len(out), 'rows;', len(prev), 'carried (', len(prev) - len(DRAW_ROWS), 'fully equal incl. ranks;', len(DRAW_ROWS), 'draw rows differ only in not_ranked_because); new row unranked:', keys, '; board unchanged; n_ranked', res['n_ranked'], '; comparison_only', A.comparison_only)
