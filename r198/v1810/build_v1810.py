"""v1.8.10: EQUATE the 27 Oct 2026 regular draw (v1.6-regular-20261027) with four STRONG anchor systems and RANK its rows.

The draw's anchor offset (inputs/EQUATING-STRONG4-D1027.json, pinned by sha256) is applied as the equating table's "method" text says and as
lib/jevbench-cohort-merge.mjs equateCohortRow does: a row of the draw is shown as published plus the offset (Intelligence and Calibration,
clipped to 0..100); Capability = mean of the equated axes; every composite and sort view follows from the equated axes by the frozen
score_v15.composite. The published numbers stay in published_scores. Confidence intervals stay as measured on the draw; the offset's own
95% interval is published in the draw entry. No sealed byte is read: the equating receipt holds aggregates only.

Every other v1.8.9 row is unchanged in every field except rank/ranks, which move only because the newly ranked rows join the order
lists (stable insertion; removing them gives back v1.8.9's order lists exactly, asserted below).

Rows of the draw that stay unranked are still equated (axes shown on the reference scale): the two without a price keep that reason, and four rows
whose top-five places lie within the uncertainty of the draw shift (or, for H2O-Lightning-4B v1.4.1, depend on the draw's item mix) are HELD unranked
(FAIR_SUBSET, independent fairness review r276-v1810-fair, recommendation b). Renamed display names (vendor request) change display fields only.

Combined candidate (r278): ONE added hosted-API row on the same draw, Gemini Decision 1 (Google), built by gemini_v1810.py from pinned aggregate
inputs, shown the same way (measured + the draw's offset) and ranked on the API board; the carried rows move only where it now sits above them.
The frozen pricing module is re-frozen 2f52370f -> 1b3c52fb (adds only subq-snap-1.2 and gemini-decision-1; no carried row's pricing path changes)."""
import os, pathlib, json, hashlib, copy, shutil, re, sys, importlib.util, subprocess
J = pathlib.Path(__file__).resolve().parent
W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
V = W / 'data/raw/benchmarks/jevbench/v1.8'
REV, PREV = 'v1.8.10', 'v1.8.9'
L = lambda p: json.loads(pathlib.Path(p).read_text())
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
shab = lambda b: hashlib.sha256(b).hexdigest()
cp = copy.deepcopy
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
DRAW_ID = 'v1.6-regular-20261027'
GMED = 2.573387642438244
# ---- equating input, pinned by full sha256 (STOP on mismatch)
EQ_FILE = J / 'inputs/EQUATING-STRONG4-D1027.json'
EQ_SHA = '7888a0803466daac872f46809b12015af6c3686109276ab89e1028c206103146'
assert sha(EQ_FILE) == EQ_SHA, 'EQUATING HASH MISMATCH'
JOB_COPY = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r276/equating/EQUATING-STRONG4-D1027.json')
if JOB_COPY.exists():
    assert sha(JOB_COPY) == EQ_SHA, 'job copy differs from the pinned repo copy'
eq = L(EQ_FILE)
ANCHORS = sorted(['quyet-1-0-large', 'torchcast-decision-27b', 'decider-12b', 'h2o-lightning-4b-v1.1'])
assert eq['draw'] == DRAW_ID and eq['status'] == 'equated' and eq['n_anchors'] == 4 and sorted(eq['anchors']) == ANCHORS
OFFSET = {'I': eq['offset']['I'], 'C': eq['offset']['C']}
assert OFFSET == {'I': -2.884891186577587, 'C': -1.8542447151797177}
OFFSET_CI = {'I': eq['offset_ci95']['I'], 'C': eq['offset_ci95']['C']}
assert eq['g_med']['reference'] == GMED and eq['g_med']['new_draw_rel'] == GMED and eq['bootstrap']['B'] == 1000 and eq['bootstrap']['seed'] == 16
LOO = eq['sensitivity_leave_one_out']
I1, C1 = f'{OFFSET["I"]:.1f}', f'{OFFSET["C"]:.1f}'
assert (I1, C1) == ('-2.9', '-1.9')
POINTS = f'Intelligence {I1}, Calibration {C1} points'
CI_TXT = f'{OFFSET_CI["I"][0]:.1f} to {OFFSET_CI["I"][1]:+.1f}'
assert CI_TXT == '-5.9 to +1.1'
NOTE_UNPRICED = f'Measured on the 27 Oct 2026 draw; shown on the reference scale by anchor equating with four strong anchor systems ({POINTS}).'
NOTE = f'Measured on the 27 Oct 2026 draw; shown on the reference scale by anchor equating with four strong anchor systems ({POINTS}; 95% interval of the Intelligence shift {CI_TXT}).'
HELD = ['h2o-lightning-4b-v1.4.1', 'jeff_1_1_large', 'visionjev-1.0.0-27b', 'wemm-jev']
HELD_BASIS = f'Measured on the 27 Oct 2026 draw and shown on the reference scale by anchor equating with four strong anchor systems ({POINTS}).'
HELD_TEXT = HELD_BASIS + f' Not ranked yet: its top-five places lie within the uncertainty of that shift (95% interval {CI_TXT} Intelligence points). Ranking follows when more anchor runs narrow the interval.'
H2O_HELD_TEXT = HELD_BASIS + ' Not ranked: on that draw it scores 5.8 points above H2O-Lightning-4B v1.1 on the sealed items but 4.2 points below it on the 300 public items both answered, so its higher score there depends on how that draw\'s items are built, which the anchor shift cannot correct.'
BOUNDARY = {'karpo_decision_31b': 'Its #5 place on Composite B among all systems is within the uncertainty of the draw shift.',
            'arcbright-elf-1-12b-r2': 'Its #4 place on the open-weights Composite A and C lists is within the uncertainty of the draw shift.'}
META_NOTE = ('On this draw it scores 13.3 points higher on the sealed items than on the 300 public items, more than any row measured on the reference draw; '
             'its #2 Capability places hold even if that gap is set to the reference-draw median.')
META_KEY = 'metadecision-31b-rain'
RENAMES = {'JEV-27B (AutoTrust, Qwen3.8-27B)': 'AutoTrust-Decider-Pro-27B (AutoTrust, Qwen3.8-27B)', 'JEV-9B': 'AutoTrust-Decider-Mini-9B', 'JEV-27B-VL': 'AutoTrust-Decider-Pro-Vision-27B'}
# r278 corrections (DECISIONS jevbench-v1810-preview-corrections-1112): the preliminary, unranked A2 re-run listing of Microsoft-Decision-1 leaves every
# board view of v1.8.10; its data stays in v1.8.9 and every earlier release (frozen files). It is unranked, so no rank or order list changes.
REMOVED = {'microsoft-decision-1-a2-20261012': 'Removed from the boards: a preliminary, unranked A2 re-run listing of Microsoft-Decision-1 shown next to its regular ranked rows; its data stays in v1.8.9 and earlier releases.'}
# r278 pre-flip T4: the release sentence names the display change and the sourced base models.
T4_HIST = '; all published breakdown cells are now shown, small samples marked; 18 API base models added with sources'
REMOVED_HIST = 'removed the preliminary A2 re-run listing of Microsoft-Decision-1 (its regular rows stay)'
HIST = (f'Equated the 27 Oct regular draw with four strong anchor systems ({POINTS}) and ranked 31 of its rows; four stay unranked because their top-five places lie within the uncertainty of the shift; '
        'renamed AutoTrust\'s JEV-27B to AutoTrust-Decider-Pro-27B at the vendor\'s request; added Gemini Decision 1 (Google, hosted API) on the same draw; ' + REMOVED_HIST + T4_HIST + '.')
MEASURE_NOTE = ('The anchors are scored without the 10-second rule on both draws, so the shift measures only the difference between the draws; with the rule applied on both draws it would be Intelligence -3.3, Calibration -2.4. '
                'Places of four rows from that draw are within the shift\'s uncertainty and they stay unranked until more anchor runs narrow it. '
                'Gemini Decision 1 (Google, hosted API) was measured on the same draw on 11 Nov 2026 (all 1,500 items, one per request, Google\'s native probabilities) and is shown and ranked the same way.')
CI_LABEL = 'measured on the draw before equating'
METHOD_OLD = 'with fixed anchor systems measured on both draws'
METHOD_NEW = 'with anchor systems measured on both draws (each draw lists its own anchor set)'
EQ_PHRASE = f'equated to the reference scale with four strong anchor systems ({POINTS})'
NO_PRICE = ('Not ranked because it has no price: under the frozen pricing rules a hosted model\'s own tariff counts only once it is admitted to the '
            'frozen list-price set, and this model declares no base model, so it has no cost axis and no composite.')
H2O, H2O_V11 = 'h2o-lightning-4b-v1.4.1', 'h2o-lightning-4b'
# ---- frozen composite (harness score_v15.py, pinned in the predecessor proof)
H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness')
spec = importlib.util.spec_from_file_location('score_v15_frozen', H / 'score_v15.py')
S15 = importlib.util.module_from_spec(spec); sys.modules['score_v15_frozen'] = S15; spec.loader.exec_module(S15)
sys.path.insert(0, str(J)); import gemini_v1810 as GEM; GK = GEM.GK
old = {n: L(V / f'jevbench-{PREV}-{n}.json') for n in ['results', 'categories', 'carry', 'proof', 'publication']}
assert old['publication']['review']['verdict'] == 'PASS' and old['results']['revision'] == PREV
assert sha(H / 'score_v15.py') == old['proof']['scorers']['score_v15']
assert eq['scorer']['sha256'] == old['proof']['scorers']['score_v16']
OPTIONS = old['results']['options']; AX = ('intelligence', 'calibration', 'speed', 'cost')
clip = lambda x: min(100.0, max(0.0, x))
def derived(axes):
    scores = {o: S15.composite(axes, {a: v['weights'][a] / 100 for a in AX}, float(v['intelligence_floor'])) for o, v in OPTIONS.items()}
    views = {n: S15.composite(axes, dict(zip(AX, w)), 50.0) for n, w in S15.SORT_VIEWS.items()}
    return scores, views, (None if axes['intelligence'] is None or axes['calibration'] is None else (axes['intelligence'] + axes['calibration']) / 2)
def close(a, b, tol): return (a is None and b is None) or (a is not None and b is not None and abs(a - b) < tol)
def equate(row):
    pub = {'axes': row['axes'], 'scores': row['scores'], 'capability': row['capability']}
    s0, v0, c0 = derived(row['axes'])   # the frozen formula reproduces the published numbers exactly at offset 0
    assert all(close(s0[o], row['scores'][o], 1e-9) for o in OPTIONS) and close(c0, row['capability'], 1e-12) and close(row['jevbench_score'], row['scores']['A'], 1e-12), row['key']
    assert sorted(v0) == sorted(row['views']) and all(close(v0[n], row['views'][n], 1e-9) for n in row['views']), row['key']
    axes = {**row['axes'], 'intelligence': clip(row['axes']['intelligence'] + OFFSET['I']), 'calibration': clip(row['axes']['calibration'] + OFFSET['C'])}
    scores, views, cap = derived(axes)
    return {**row, 'axes': axes, 'scores': scores, 'views': views, 'jevbench_score': scores['A'], 'capability': cap, 'published_scores': pub}
# ---- the draw's not-yet-equated wording (every variant found in the 36 rows) and its equated replacement
SENT = [
    (re.compile(r'Measured on the 27 Oct 2026 draw and shown unranked until that draw is equated to the reference scale\.'),
     lambda m: f'Measured on the 27 Oct 2026 draw and {EQ_PHRASE}.'),
    (re.compile(r'DRAW: (first row )?measured on the 27 Oct 2026 regular draw \(fresh sealed items; not yet equated to the reference scale, so its numbers are shown as published, offset 0\)\.'),
     lambda m: f'DRAW: {m.group(1) or ""}measured on the 27 Oct 2026 regular draw (fresh sealed items), {EQ_PHRASE}.'),
    (re.compile(r'Measured on the 27 Oct 2026 regular draw, not yet equated to the reference scale \(offset 0\)\.'),
     lambda m: f'Measured on the 27 Oct 2026 regular draw, {EQ_PHRASE}.'),
    (re.compile(r'The 27 Oct 2026 draw is not yet equated to the reference scale \(offset 0\)\.'),
     lambda m: f'The 27 Oct 2026 draw is {EQ_PHRASE}.'),
]
STALE = re.compile(r'not yet equated|until (?:that|the) draw is equated|shown as published, offset 0|\(offset 0\)|stronger anchor|first anchor runs|Shown unranked until', re.I)
res = cp(old['results']); out = {s['key']: s for s in res['systems']}; prev = cp(out)
DRAW_ROWS = sorted(k for k, s in prev.items() if (s.get('draw') or {}).get('id') == DRAW_ID)
assert len(DRAW_ROWS) >= 7 and {H2O, 'karpo_decision_31b', 'microsoft-decision-1-r2', 'torchcast-decision-31b-v1.0', META_KEY, *HELD, *BOUNDARY} <= set(DRAW_ROWS)
h2o_i, v11_i = prev[H2O]['intelligence']['I_open'], prev[H2O_V11]['intelligence']['I_open']
H2O_EXTRA = f'On the 300 public items every draw shares, this version scores {h2o_i:.1f} Intelligence vs {v11_i:.1f} for H2O-Lightning-4B v1.1.'
H2O_HELD_TEXT += ' ' + H2O_EXTRA
assert H2O_EXTRA == 'On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.' and prev[H2O_V11]['display'].startswith('H2O-Lightning-4B v1.1')
EQ_DRAW = {'status': 'equated', 'offset': dict(OFFSET), 'offset_ci95': cp(OFFSET_CI), 'ci_basis': CI_LABEL}
EQ_ROW_FIELDS = ['axes', 'scores', 'views', 'jevbench_score', 'capability', 'published_scores', 'ranked', 'rank', 'ranks', 'listing', 'not_ranked_because', 'listing_note', 'disclosure', 'underlying', 'draw']
RANKED, STAY, SENT_PIN = [], {}, {}
for k in DRAW_ROWS:
    s = prev[k]
    assert s['ranked'] is False and s['listing'] == 'unranked' and s['draw']['status'] == 'anchor-runs-pending' and s['draw']['offset'] == {'C': 0, 'I': 0}, k
    assert s['v16']['g_med_used'] == res['G_med'] == GMED and s.get('rank') is None and s['ranks'] == {'A': None, 'B': None, 'C': None, 'capability': None}, k
    assert s['not_ranked_because'].startswith('Measured on the 27 Oct 2026 draw, which is not yet equated'), k
    e = equate(s); pins = {}
    for f in ['disclosure', 'underlying']:
        if f not in e: continue
        text = e[f]
        for rx, fn in SENT:
            for m in rx.finditer(text):
                new = fn(m); pins.setdefault(f, []).append({'before_sha256': shab(m.group(0).encode()), 'after_sha256': shab(new.encode())})
            text = rx.sub(fn, text)
        e[f] = text
    for f, v in e.items():
        if f in ('not_ranked_because', 'published_scores'): continue
        def walk(x, p):
            if isinstance(x, str): assert not STALE.search(x), ('stale not-yet-equated wording', k, p)
            elif isinstance(x, dict): [walk(y, p + '.' + a) for a, y in x.items()]
            elif isinstance(x, list): [walk(y, p) for y in x]
        walk(v, f)
    SENT_PIN[k] = pins
    e['draw'] = {**s['draw'], **cp(EQ_DRAW)}
    priced = all(e['scores'][o] is not None for o in OPTIONS)
    if priced and k in HELD:
        e['not_ranked_because'] = H2O_HELD_TEXT if k == H2O else HELD_TEXT; e.pop('listing_note', None)
        STAY[k] = ('held: row-specific draw-mix signature that no offset can remove (FAIR_SUBSET)' if k == H2O else 'held: top-five places within the uncertainty of the draw shift (FAIR_SUBSET)')
    elif priced:
        e['listing_note'] = ' '.join([NOTE] + ([BOUNDARY[k]] if k in BOUNDARY else []) + ([META_NOTE] if k == META_KEY else []))
        e.pop('not_ranked_because'); e.update(ranked=True, listing='ranked'); RANKED.append(k)
    else:
        assert k not in HELD and e['cost']['kind'] == 'unpriced' and e['axes']['cost'] is None and 'NOT PRICED' in e['cost']['basis'], k
        e['listing_note'] = NOTE_UNPRICED
        e['not_ranked_because'] = NO_PRICE; STAY[k] = 'unpriced: no cost axis, no composite'
    out[k] = e
assert set(RANKED) | set(STAY) == set(DRAW_ROWS) and not set(RANKED) & set(STAY)
# ---- the added hosted-API row (Gemini Decision 1): same equating rule, same ranked note as the draw's ranked rows plus its self-reported figure
assert GK not in prev
g = equate(GEM.measured_row(prev['decide-1.1']['draw']))
g['draw'] = {**g['draw'], **cp(EQ_DRAW)}; g.update(ranked=True, listing='ranked', listing_note=NOTE + ' ' + GEM.SELF_REPORT)
assert all(g['scores'][o] is not None for o in OPTIONS) and 'not_ranked_because' not in g and GEM.cost_gate(g)
for f, v in g.items():
    if isinstance(v, str): assert not STALE.search(v), ('stale wording on the added row', f)
out[GK] = g; NEW_KEYS = [GK]; NEWLY = RANKED + NEW_KEYS
for k in REMOVED:
    p = prev[k]
    assert p['ranked'] is False and p.get('rank') is None and p['listing'] == 'preliminary' and k not in DRAW_ROWS and all(k not in old['results']['board'][m]['order'] for m in ['A', 'B', 'C', 'capability']), k
    del out[k]
# ---- ranks: stable insertion of the newly ranked rows into every order list of the merged field (v1.7.10/v1.7.15 rule)
for metric in ['A', 'B', 'C', 'capability']:
    order0 = list(old['results']['board'][metric]['order'])
    val = (lambda k: out[k]['capability']) if metric == 'capability' else (lambda k, m=metric: out[k]['scores'][m])
    assert all(val(a) >= val(b) for a, b in zip(order0, order0[1:])), 'predecessor order must be sorted'
    order = sorted(order0 + sorted(NEWLY, key=lambda k: -val(k)), key=lambda k: -val(k))   # stable: predecessor ties kept, new rows after equal scores
    assert [k for k in order if k not in NEWLY] == order0, 'removing the newly ranked rows must give v1.8.9 back'
    res['board'][metric] = {**res['board'][metric], 'order': order}
RENAMED = {}
for k, row in out.items():
    for old_name, new_name in RENAMES.items():
        if row['display'] == old_name or row['display'].startswith(old_name + ' ('):
            RENAMED[k] = {'before': row['display'], 'after': new_name + row['display'][len(old_name):]}; row['display'] = RENAMED[k]['after']
assert list(RENAMED) == ['jev-27b-autotrust'] and RENAMED['jev-27b-autotrust']['after'] == 'AutoTrust-Decider-Pro-27B (AutoTrust, Qwen3.8-27B)', RENAMED
assert not [k for k, r in out.items() if re.match(r'JEV-(9B|27B)', r['display'])]
for k, row in out.items():
    if row['ranked']:
        row['ranks'] = {m: res['board'][m]['order'].index(k) + 1 for m in ['A', 'B', 'C', 'capability']}; row['rank'] = row['ranks']['A']
    else: assert row.get('rank') is None
# ---- carried-row equality
rank_shift = {}
for k, p in prev.items():
    if k in REMOVED: continue
    a = {f: v for f, v in out[k].items() if f not in ('rank', 'ranks') and not (k in RENAMED and f == 'display')}; b = {f: v for f, v in p.items() if f not in ('rank', 'ranks') and not (k in RENAMED and f == 'display')}
    if k in DRAW_ROWS:
        assert {f: v for f, v in a.items() if f not in EQ_ROW_FIELDS} == {f: v for f, v in b.items() if f not in EQ_ROW_FIELDS}, k
        continue
    assert a == b, ('carried row changed', k)
    if p['ranked']:
        back = {m: [x for x in res['board'][m]['order'] if x not in NEWLY].index(k) + 1 for m in ['A', 'B', 'C', 'capability']}
        assert back == p['ranks'] and back['A'] == p['rank'], ('rank not explained by the inserted rows', k)
        if out[k]['ranks'] != p['ranks']: rank_shift[k] = {'before': p['ranks'], 'after': out[k]['ranks']}
    else: assert out[k].get('rank') == p.get('rank') and out[k].get('ranks') == p.get('ranks')
res.update(revision=REV, label='JevBench v1.8.10: the 27 Oct regular draw equated with four strong anchors and ranked; Gemini Decision 1 added',
           systems=sorted(out.values(), key=lambda s: s['key']), n_ranked=sum(bool(s['ranked']) for s in out.values()),
           roster_count=len(out), run_kind='same-draw-addendum', source_sha256=EQ_SHA, source_note=HIST)
assert res['n_ranked'] == old['results']['n_ranked'] + len(RANKED) + len(NEW_KEYS) and res['roster_count'] == len(prev) + len(NEW_KEYS) - len(REMOVED) and len(RANKED) == 31 and len(DRAW_ROWS) == 37 and sorted(STAY) == sorted(HELD + ['decisionnode-flash-0.9.1-rc1', 'decisionnode-main-0.9.1-rc1'])
res['measurement_notes'] = old['results']['measurement_notes'] + [HIST + ' Four strong anchor systems answered both the reference draw and the 27 Oct draw; '
    f'the offset is the median over anchors of (reference minus new draw): Intelligence {OFFSET["I"]:.2f} (95% CI {OFFSET_CI["I"][0]:.2f} to {OFFSET_CI["I"][1]:+.2f}), '
    f'Calibration {OFFSET["C"]:.2f} (95% CI {OFFSET_CI["C"][0]:.2f} to {OFFSET_CI["C"][1]:+.2f}). '
    f'Every row on that draw is shown as published plus the offset; Capability and the composites follow from the equated axes; confidence intervals are the ones {CI_LABEL}. '
    f'{len(RANKED)} of its {len(DRAW_ROWS)} earlier rows are now ranked; two rows have no price and stay unranked, and four rows are held unranked. Every other score is unchanged and other rows move down only where a newly ranked row now sits above them. ' + MEASURE_NOTE]
res['addendum'] = {**old['results']['addendum'], 'predecessor': PREV, 'new_keys': list(NEW_KEYS), 'remeasured_keys': [], 'repriced_keys': [], 'link_fixed_keys': [],
                   'text_fixed_keys': sorted(k for k in DRAW_ROWS if SENT_PIN[k]), 'method_change': False, 'same_draw': DRAW_ID,
                   'equated_keys': DRAW_ROWS, 'equated_draw': DRAW_ID, 'ranked_keys': sorted(RANKED), 'unranked_keys': sorted(STAY), 'held_keys': sorted(HELD), 'display_renamed_keys': sorted(RENAMED), 'removed_keys': sorted(REMOVED)}
put(V / f'jevbench-{REV}-results.json', res)
cat = cp(old['categories'])
assert GK not in cat['systems'] and GK not in cat['lanes']
cat['systems'][GK] = cp(GEM.CELLS); cat['lanes'][GK] = 'api'
for k in REMOVED: cat['systems'].pop(k); cat['lanes'].pop(k, None); (cat.get('unavailable') or {}).pop(k, None)
cat.update(revision=REV, results_sha256=sha(V / f'jevbench-{REV}-results.json'), source_results_sha256=res['source_sha256'])
put(V / f'jevbench-{REV}-categories.json', cat)
for n in ['carry', 'history', 'history-carry']: shutil.copyfile(V / f'jevbench-{PREV}-{n}.json', V / f'jevbench-{REV}-{n}.json')
# ---- proof
equating = {'draw': DRAW_ID, 'status': 'equated', 'offset': OFFSET, 'offset_ci95': OFFSET_CI, 'anchors': ANCHORS, 'n_anchors': 4,
            'offset_ci95_independent_items': eq['offset_ci95_independent_items'], 'sensitivity_leave_one_out': LOO, 'mean_instead_of_median': eq['mean_instead_of_median'],
            'offset_info': eq['offset_info'], 'per_anchor_difference': {k: {m: v['diff'][m] for m in ['I_post_rel', 'C']} for k, v in eq['per_anchor'].items()},
            'anchors_not_used': 'One of the five planned anchor systems could not be staged before any scored item; its pre-registered handling is to skip it with no retry, so the offset uses the four complete anchors.',
            'coverage_note': eq['coverage_note'], 'offset_basis': eq['offset_basis'], 'bootstrap': eq['bootstrap'], 'g_med': eq['g_med'],
            'scorer': {'name': 'score_v16', 'sha256': eq['scorer']['sha256'], 'noul_method': eq['scorer']['noul_method']}, 'equate_tool_sha256': eq['equate_tool']['sha256'],
            'files': {'equating': {'name': 'EQUATING-STRONG4-D1027.json', 'sha256': EQ_SHA}}, 'anchor_output_sha256': {k: v['sha256'] for k, v in eq['inputs']['new_raws'].items()},
            'reference_output_sha256': {k: v['sha256'] for k, v in eq['inputs']['reference_raws'].items()},
            'applied_as': 'published + offset on Intelligence and Calibration (clipped 0..100); Capability = mean of the equated axes; composites and sort views by the frozen score_v15.composite; confidence intervals as ' + CI_LABEL + ' (not shifted); published numbers kept in published_scores',
            'method': L(W / 'data/jevbench-draw-equating.json')['method'].replace(METHOD_OLD, METHOD_NEW)}
eq_rows = {k: {'published': out[k]['published_scores'], 'equated': {'axes': out[k]['axes'], 'scores': out[k]['scores'], 'capability': out[k]['capability']}, 'ranks': out[k]['ranks'],
               'treatment': 'ranked' if k in RANKED else 'held' if k in HELD else 'unranked', 'unranked_reason': STAY.get(k), 'disclosure_draw_sentence': SENT_PIN[k]} for k in DRAW_ROWS}
tf = J / 'receipts/topfive-diff.json'; a = L(J / 'inputs/APPROVAL.json')
a['top_five_preview']['sha256'] = sha(tf) if tf.exists() else shab(b'comparison bootstrap')
a['top_five_effect'] = 'changed'
assert old['proof']['pricing_module_sha256'] == GEM.PRICING_OLD
REFREEZE = {'old_sha256': GEM.PRICING_OLD, 'new_sha256': GEM.PRICING_NEW, 'added_launch_list_price_keys': ['gemini-decision-1', 'subq-snap-1.2'], 'installed_at': '2026-11-12T15:06:36Z',
            'equivalence_receipt_sha256': GEM.EQUIV_SHA, 'install_receipt_sha256': GEM.INSTALL_SHA, 'carried_keys_whose_pricing_path_changes': [],
            'note': 'Only the launch list-price set gains the two keys; every function is byte-identical and no carried row resolves differently (equivalence sweep over every registry entry).'}
proof = {'schema_version': 1, 'revision': REV, 'predecessor': {'revision': PREV, 'publication_sha256': sha(V / f'jevbench-{PREV}-publication.json')}, 'method': res['method'],
         'pricing_module_sha256': GEM.PRICING_NEW, 'pricing_refreeze': REFREEZE, 'pricing_authority': old['proof']['pricing_authority'], 'scorers': old['proof']['scorers'],
         'carried_rows': len(prev), 'carried_rows_equal_except': [
             'every row: rank and ranks only where a newly ranked row now sits above it (removing the newly ranked rows from the order lists gives back the v1.8.9 lists exactly)',
             f'the {len(DRAW_ROWS)} rows of the 27 Oct draw: equated axes/scores/views/capability (published numbers in published_scores), ranked/rank/ranks/listing, not_ranked_because, listing_note, draw status/offset/interval, and the not-yet-equated sentence of the disclosure/underlying text',
             'the row AutoTrust-Decider-Pro-27B (key jev-27b-autotrust): the display name only (vendor rename of JEV-27B; key, repo, model pin and every score unchanged)',
             'one added row, Gemini Decision 1 (key gemini-decision-1, hosted API, same draw): not a carried row; carried rows move down only where it now sits above them',
             'one removed row, the preliminary unranked A2 re-run listing of Microsoft-Decision-1 (key microsoft-decision-1-a2-20261012): not on any board of this release; it was in no order list, so no rank changes'],
         'exceptions': {}, 'equating': equating, 'equated_rows': eq_rows, 'rank_shifted_rows': len(rank_shift), 'ranked_rows': sorted(RANKED), 'unranked_rows': STAY, 'held_rows': sorted(HELD), 'display_renames': RENAMED, 'fairness_basis': 'FAIR_SUBSET (recommendation b of the independent fairness review): 31 rows ranked, 4 held unranked, 2 unpriced rows unranked',
         'same_draw': {'id': DRAW_ID, 'g_med_used': GMED}, 'new_rows': {GK: GEM.proof_entry(out[GK])}, 'removed_rows': dict(REMOVED), 'remeasured_rows': {}, 'repriced_rows': {}, 'link_fixed_rows': [], 'text_fixed_rows': sorted(k for k in DRAW_ROWS if SENT_PIN[k]),
         'cost_basis': old['proof']['cost_basis'], 'publication_approval': a, 'topfive_diff_sha256': a['top_five_preview']['sha256'],
         'source_inputs': {'equating_sha256': EQ_SHA, 'gemini': {f'inputs/gemini/{n}': h for n, h in GEM.PINS.items()}}}
put(V / f'jevbench-{REV}-proof.json', proof)
pub = cp(old['publication']); pub.update(revision=REV, predecessor=proof['predecessor'], review={'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None})
pub['files'] = {n: {'path': f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json', 'sha256': sha(V / f'jevbench-{REV}-{n}.json')} for n in ['results', 'categories', 'carry', 'proof', 'history', 'history-carry']}
put(V / f'jevbench-{REV}-publication.json', pub)
put(J / 'src/held-keys.json', sorted(HELD)); put(J / 'src/display-renames.json', RENAMED); put(J / 'src/equated-keys.json', DRAW_ROWS); put(J / 'src/ranked-keys.json', sorted(RANKED)); put(J / 'src/unranked-keys.json', STAY)
put(J / 'receipts/EQUATED-ROW-SPEC.json', {k: {f: out[k][f] for f in EQ_ROW_FIELDS if f in out[k]} for k in DRAW_ROWS})
put(J / 'receipts/RANK-SHIFT.json', rank_shift); put(J / 'inputs/history.json', HIST)
put(J / 'src/new-keys.json', NEW_KEYS); put(J / 'src/removed-keys.json', sorted(REMOVED)); put(J / 'receipts/NEW-ROWS.json', {GK: out[GK]}); put(J / 'receipts/BOUNDS.json', GEM.BOUNDS)
put(J / 'receipts/BUILD.json', {'revision': REV, 'base': PREV, 'base_publication_sha256': proof['predecessor']['publication_sha256'], 'equated_rows': DRAW_ROWS, 'ranked_rows': sorted(RANKED), 'new_rows': NEW_KEYS, 'new_row_ranks': {GK: out[GK]['ranks']}, 'unranked_rows': STAY, 'held_rows': sorted(HELD), 'display_renames': RENAMED,
                                'carried_equal_except_ranks': len(prev) - len(DRAW_ROWS), 'rank_shifted_rows': len(rank_shift), 'roster_count': len(out), 'n_ranked': res['n_ranked'], 'files': pub['files']})
subprocess.run([sys.executable, '-B', str(J / 'make_lib_v1810.py')], check=True)
print(f'Built PENDING {REV}: {len(out)} rows; {len(DRAW_ROWS)} equated ({len(RANKED)} ranked, {len(STAY)} stay unranked) + {GK} ranked {out[GK]["ranks"]}; ranks shifted on {len(rank_shift)} carried rows (all explained by the insertion); n_ranked {res["n_ranked"]}')
