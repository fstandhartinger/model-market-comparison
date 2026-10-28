"""v1.7.14: same-draw addendum on the 27 Oct 2026 regular draw (v1.6-regular-20261027), stacked on v1.7.13 — five new self-hosted
rows (one paid public order), all measured but UNRANKED (provisional: the draw is not yet equated; decision
v1713-h2o141-unranked-provisional, "the same treatment applies to the other rows on that draw"). Every predecessor row is immutable,
ranks included; no order list changes. Every predecessor dependency (v1.7.13 results/categories/carry/history bytes, its publication
sha256, scorer pins, draw entry) is read from the files at build time, so restack_v1714.sh can rebuild after v1.7.13's flip."""
import os, pathlib, json, hashlib, copy, shutil, re, argparse
from pricing_reference_v1714 import reference, PIN
ap = argparse.ArgumentParser(); ap.add_argument('--comparison-only', action='store_true'); A = ap.parse_args()
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1]))); V = W / 'data/raw/benchmarks/jevbench/v1.7'; REV = 'v1.7.14'; PREV = 'v1.7.13'
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest(); cp = copy.deepcopy
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
# Same mechanism and public note as v1.7.13 uses for its unranked row, without the H2O-specific v1.1 comparison sentence.
NOT_RANKED_BECAUSE = ('Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale. '
                      'This draw differs strongly from earlier draws (72% multilingual items). Shown unranked until the draw is equated.')
NULL_RANKS = {'A': None, 'B': None, 'C': None, 'capability': None}
PAID_KEY = 'torchcast-decision-31b-v1.0'
old = {n: L(V / f'jevbench-{PREV}-{n}.json') for n in ['results', 'categories', 'carry', 'proof', 'publication']}
assert old['publication']['review']['verdict'] in ('PENDING', 'PASS') and old['results']['revision'] == PREV
# The draw block comes from v1.7.13's own row on the same draw (status/offset/label as published there).
h2o = next(s for s in old['results']['systems'] if s['key'] == 'h2o-lightning-4b-v1.4.1')
DRAW = {f: h2o['draw'][f] for f in ['id', 'label', 'drawn_on', 'status', 'offset', 'offset_ci95']}
assert DRAW['id'] == 'v1.6-regular-20261027' and DRAW['offset'] == {'C': 0, 'I': 0}
inputs = L(J / 'src/inputs.json'); pins = L(J / 'receipts/INPUTS.json'); cells = L(J / 'src/cells.json'); entries = L(J / 'inputs/ENTRIES.json'); keys = sorted(inputs)
assert keys == ['arcbright-elf-1-12b-r2', 'decisio-gemma-4-12b-tuned-commit-think', 'jeff_1_1_large', 'jeff_1_1_qwen_4b', 'torchcast-decision-31b-v1.0']
source_inputs = {n: sha(J / p) for n, p in {'scored_rows_sha256': 'src/inputs.json', 'entry_sha256': 'inputs/ENTRIES.json', 'cells_sha256': 'src/cells.json'}.items()}
source_sha = hashlib.sha256(json.dumps(source_inputs, sort_keys=True).encode()).hexdigest()
res = cp(old['results']); out = {s['key']: s for s in res['systems']}; prev = cp(out); new = {}
BANNED = re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|\blead\b|custody|deputy|auto-intake|\br59\b|69f7a75d|54575fd5|h2o141|tc31b|(?-i:DECISIONS)|\{[A-Za-z_][A-Za-z0-9_]*\}', re.I)
for k in keys:
    assert k not in out and pins[k]['raw_verified_in_place']; d = inputs[k]; e = entries[k]['entry']
    ns = cp(d['v17-share']); ns.update(method='v1.7', new_in=REV, measured_in=REV, last_measured_on=d['measured_on'], measurement_date_status='measured', paid_fast_lane=(k == PAID_KEY))
    for fld in ['display', 'author', 'repo', 'licence', 'endpoint_kind', 'endpoint_condition', 'disclosure', 'code_revision']: ns[fld] = e[fld]
    ns['base_model'] = e['base_model']; ns['gpu'] = d['gpu']
    ns['model_pin'] = d['model_pin']; assert '@' + e['revision'] in ns['model_pin']
    ns['cost']['basis'] = e['cost_basis']
    ns['draw'] = {**DRAW, 'release': REV, 'measured_on': d['measured_on'], 'g_med': res['G_med'], 'results_sha256': pins[k]['v17-share']['sha256']}
    ns['noul_decisive'] = {f: cells[k]['noul_share'][f] for f in ['acc_among_decisive', 'decisive', 'decisive_rate', 'n', 'supported', 'valid']}
    hit = BANNED.search(json.dumps({f: ns.get(f) for f in ['display', 'author', 'licence', 'disclosure', 'code_revision', 'endpoint_condition', 'cost']}))
    assert not hit, ('internal public text', k, hit.group())
    for f in ['axes', 'scores', 'views', 'jevbench_score', 'capability', 'composite_ci95', 'intelligence', 'calibration', 'validity', 'status', 'support', 'speed', 'v16', 'decision_limit']: assert ns[f] == d['v17-share'][f], f
    assert ns['v16']['g_med_used'] == res['G_med'] == 2.573387642438244
    ns.update(ranked=False, rank=None, ranks=dict(NULL_RANKS), listing='unranked', not_ranked_because=NOT_RANKED_BECAUSE)
    out[k] = ns; new[k] = ns
hit = BANNED.search(NOT_RANKED_BECAUSE.replace('unranked', '')); assert not hit, ('internal public text', hit.group())
# Unranked: no order list and no carried rank changes (the board is the predecessor's, byte for byte).
assert res['board'] == old['results']['board'] and not any(k in res['board'][m]['order'] for m in res['board'] for k in keys)
for k, row in prev.items(): assert row == out[k], k
note = ("Five more rows on the 27 Oct regular draw (Torchcast Decision 31B v1.0, paid evaluation; Arcbright Elf 1 12B (r2); Jeff-1.1-Qwen-4B; "
        "Decisio 12B tuned commit-think; Jeff-1.1-Large), shown unranked until the draw is equated to the reference scale.")
res.update(revision=REV, label='JevBench v1.7.14: five more rows on the 27 Oct regular draw', systems=sorted(out.values(), key=lambda s: s['key']), n_ranked=sum(bool(s['ranked']) for s in out.values()), roster_count=len(out), run_kind='same-draw-addendum', source_sha256=source_sha, source_note=note)
res['measurement_notes'] = old['results']['measurement_notes'] + [note + ' Each answered all 1,500 requests of the draw (the draw\'s 5 long states shortened by each model\'s own documented rule and answered), none over 10 s. '
    'Their draw is not yet equated to the reference scale, so their numbers are shown as published (offset 0) with the reference gap-penalty median. '
    'Cost is an ESTIMATE from the base model price on the prompt tokens each model processed, over all 1,500 items. This draw has no subject-topic labels yet, so the rows have no topic cells; '
    'their use-case and language cells are measured on their own draw. NOT RANKED: ' + NOT_RANKED_BECAUSE + ' No existing row, rank or ranking changed.']
res['addendum'] = {'predecessor': PREV, 'new_keys': keys, 'remeasured_keys': [], 'repriced_keys': [], 'link_fixed_keys': [], 'method_change': False, 'same_draw': DRAW['id']}
put(V / f'jevbench-{REV}-results.json', res)
cat = cp(old['categories'])
for k in keys:
    c = cp(cells[k]['cells_share']); assert 'topics' not in c   # the draw has no topic labels (topics optional)
    cat['systems'][k] = c; cat['lanes'][k] = inputs[k]['registry']['lane']
cat.update(revision=REV, results_sha256=sha(V / f'jevbench-{REV}-results.json'), source_results_sha256=res['source_sha256'], results_sha256_note='Bound to v1.7.14 results; all carried cells retained; the five new rows\' cells are computed with unchanged frozen tools on their own draw (no topic labels on that draw).')
put(V / f'jevbench-{REV}-categories.json', cat)
for n in ['carry', 'history', 'history-carry']: shutil.copyfile(V / f'jevbench-{PREV}-{n}.json', V / f'jevbench-{REV}-{n}.json')
# Scorer pins: v1.7.13's (= v1.7.11's tools); prove every tool used here is byte-identical on disk.
scorers = old['proof']['scorers']; H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness'); S17 = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
TOOLS = {'a2_cells_v16': H / 'a2_cells_v16.py', 'build_categories_v16': H / 'build_categories_v16.py', 'build_topics_v16': H / 'build_topics_v16.py', 'decisive_v16': H / 'decisive_v16.py', 'noul_method_v16': H / 'noul_method_v16.py', 'pins_v17': S17 / 'PINS-v17.json', 'run_under_v17': S17 / 'run_under_v17.py', 'score_v15': H / 'score_v15.py', 'score_v15_headlineA': H / 'score_v15_headlineA.py', 'score_v16': H / 'score_v16.py', 'score_v17': S17 / 'score_v17.py'}
assert set(TOOLS) == set(scorers) and all(sha(p) == scorers[n] for n, p in TOOLS.items()), 'scorer tool bytes differ from the v1.7.13 pins'
tf = J / 'receipts/topfive-diff.json'; a = L(J / 'inputs/APPROVAL.json')
if tf.exists() and not A.comparison_only: assert not L(tf).get('bootstrap')
if A.comparison_only and not tf.exists(): a['top_five_preview']['sha256'] = hashlib.sha256(b'comparison bootstrap').hexdigest()
bounds = {k: {dim: cells[k]['pool_share'][dim] for dim in ['usecases', 'languages']} | {'topics': {}} for k in keys}
proof = {'source_inputs': source_inputs, 'schema_version': 1, 'revision': REV, 'predecessor': {'revision': PREV, 'publication_sha256': sha(V / f'jevbench-{PREV}-publication.json')}, 'method': res['method'], 'pricing_module_sha256': PIN, 'scorers': scorers, 'carried_rows': len(prev), 'carried_rows_equal_except': [], 'exceptions': {},
         'same_draw': {**DRAW, 'g_med_used': res['G_med'], 'g_med_rule': 'reference G_med of the merged board (every row\'s gap - G_med is below 8, so penalty 1.0 under the reference or the field median; GMED-CHECK in the scoring receipts)', 'manifest_sha256': pins[keys[0]]['manifest_sha256'], 'selfhosted_input_sha256': pins[keys[0]]['input_sha256']},
         'new_rows': {k: {'raw_sha256': inputs[k]['raw_sha256'], 'scored_input_sha256': pins[k]['v17-share']['sha256'], 'source_sha256': pins[k], 'model_pin': new[k]['model_pin'], 'price_reference': reference(k, entries[k]['entry']), 'axes': new[k]['axes'], 'composite_ci95': new[k]['composite_ci95'], 'decision_limit': new[k]['decision_limit'], 'treatment': new[k]['listing'],
                          'cost': {'usd_per_1000': inputs[k]['usd_per_1000'], 'priced_input_tokens': inputs[k]['priced_input_tokens'], 'native_input_tokens': inputs[k]['native_input_tokens'], 'output_tokens': inputs[k]['output_tokens'], 'basis_items': 1500, 'kind': 'estimate', **({'usd_per_1000_if_uncounted_prefills_priced': inputs[k]['usd_per_1000_if_uncounted_prefills_priced']} if 'usd_per_1000_if_uncounted_prefills_priced' in inputs[k] else {})},
                          'equated': {'offset': DRAW['offset'], 'intelligence': new[k]['axes']['intelligence'], 'calibration': new[k]['axes']['calibration'], 'capability': new[k]['capability'], 'scores': new[k]['scores']},
                          'category_pool_bounds': bounds[k]} for k in keys},
         'remeasured_rows': {}, 'repriced_rows': {}, 'link_fixed_rows': [], 'publication_approval': a, 'topfive_diff_sha256': sha(tf) if tf.exists() else a['top_five_preview']['sha256']}
put(V / f'jevbench-{REV}-proof.json', proof); pub = cp(old['publication']); pub.update(revision=REV, predecessor=proof['predecessor'], review={'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None})
pub['files'] = {n: {'path': f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json', 'sha256': sha(V / f'jevbench-{REV}-{n}.json')} for n in ['results', 'categories', 'carry', 'proof', 'history', 'history-carry']}
put(V / f'jevbench-{REV}-publication.json', pub); put(J / 'receipts/NEW-ROW-SPEC.json', new); put(J / 'receipts/NEW-ROW-BOUNDS.json', bounds)
put(J / 'receipts/BUILD.json', {'revision': REV, 'base': PREV, 'base_publication_sha256': proof['predecessor']['publication_sha256'], 'base_review_at_build': old['publication']['review']['verdict'], 'carried_equal': len(prev), 'new_rows_unranked': keys, 'new_keys': keys, 'same_draw': DRAW['id'], 'roster_count': len(out), 'n_ranked': res['n_ranked'], 'files': pub['files']})
print('Built PENDING', REV, len(out), 'rows;', len(prev), 'carried (fully equal, ranks included); new rows unranked:', keys, '; predecessor', PREV, old['publication']['review']['verdict'], proof['predecessor']['publication_sha256'][:12], '; comparison_only', A.comparison_only)
