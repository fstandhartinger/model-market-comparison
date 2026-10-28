"""v1.7.14: capture the trusted aggregate scorer outputs for the five new rows (same-draw addendum on draw v1.6-regular-20261027,
stacked on v1.7.13). The sealed raws are only hashed in place, never rendered. Public text comes from rows_v1714.py (entry drafts with
internal ids, board numbers, roles, job names, order ids and ranking language removed); every rewrite is recorded in
receipts/TEXT-CHANGES.json and every number quoted in a text is re-derived here from the scorer outputs, raws or the engine recount."""
import copy, hashlib, json, pathlib, re, shutil, socket
from pricing_reference_v1714 import PIN, reference, reference_text
from rows_v1714 import ROWS, DRAW_NOTE
J = pathlib.Path(__file__).resolve().parent; W = J.parents[1]; B = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
DRAW = 'v1.6-regular-20261027'; CAP = 0.06459465517241379; GMED = 2.573387642438244
V = W / 'data/raw/benchmarks/jevbench/v1.7'
assert socket.gethostname() == 'Ubuntu-2204-jammy-amd64-base'
assert sha('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py') == PIN
assert sha('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py') == '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(B / 'r160/scorer/score_v17.py') == '6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978'
# Predecessor: v1.7.13 is read from the files at build time (PENDING or PASS; restack_v1714.sh rebuilds after its flip).
prev_pub = L(V / 'jevbench-v1.7.13-publication.json'); assert prev_pub['revision'] == 'v1.7.13' and prev_pub['review']['verdict'] in ('PENDING', 'PASS')
assert L(V / 'jevbench-v1.7.12-publication.json')['review']['verdict'] == 'PASS'
REQ = pathlib.Path('/home/flori/jobs/fastlane-evaluations/69f7a75d-f84a-4dbf-83d3-7afa84822853/request.json')
rq = L(REQ); assert rq['visibility'] == 'public', 'paid order must be public'
MAN = pathlib.Path(f'/home/flori/jevbench-sealed/v1.6-run/{DRAW}/inputs/manifest.json'); MH = 'f5a5151a1a19923dec1434230dbc451d9ca879ce8ccba8f268b296cac9c1ee35'
INH = '9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
F = B / 'r197/v1714/score/field'
assert sha(MAN) == MH and L(MAN)['input_sha256']['selfhosted'] == INH
field = L(F / 'ROWS.json'); reg_all = L(F / 'REGISTRY.json')
assert sorted(field['rows']) == sorted(ROWS) == sorted(reg_all)
for p, h in field['hashes'].items(): assert sha(p) == h, ('HASH MISMATCH', p)
gm = L(F.parent / 'GMED-CHECK.json'); assert gm['cohort_independent'] and gm['own_median_point_values_identical']
BANNED = re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|\blead\b|custody|deputy|\bboard #|\br59\b|auto-intake|69f7a75d|54575fd5|h2o141|tc31b|(?-i:DECISIONS)|fast-lane order|paid order|\bworker\b|\{[A-Za-z_][A-Za-z0-9_]*\}', re.I)
PUBLIC = ['display', 'author', 'licence', 'disclosure', 'code_revision', 'endpoint_condition', 'cost_basis']
fmt_usd = lambda x: f'{x:.6f}'
text_changes, entries, inputs_all, cells_all, pins_all = [], {}, {}, {}, {}
for k, spec in sorted(ROWS.items()):
    fr = field['rows'][k]; ep = pathlib.Path(fr['entry_path']); assert sha(ep) == fr['entry_sha256']
    v = L(ep)[k]; assert v.get('raw_sha256', fr['raw_sha256']) == fr['raw_sha256']
    raw = pathlib.Path(v['raw']); assert sha(raw) == fr['raw_sha256'] and pathlib.Path(F / 'runs' / f'{k}.jsonl').resolve() == raw
    reg = reg_all[k]; en = copy.deepcopy(v['entry'])
    ref = reference(k, en); assert ref == fr['price_reference'], (k, ref)
    tin, tout = fr['priced_input_tokens'], fr['output_tokens']
    usd = 1000 * (tin * ref['in'] + tout * ref['out']) / 1e6 / 1500
    assert reg['usd_per_1000_override'] == usd == fr['usd_per_1000']
    def rewrite(field_, new, why):
        old = en.get(field_, '')
        if old == new: return
        en[field_] = new; text_changes.append({'key': k, 'field': field_, 'before_sha256': hashlib.sha256(old.encode()).hexdigest(), 'after_sha256': hashlib.sha256(new.encode()).hexdigest(), 'why': why})
    rewrite('display', spec['display'], 'display name consistent with the author\'s earlier rows')
    rewrite('author', spec['author'], 'public text: no order id')
    if 'licence' in spec: rewrite('licence', spec['licence'], 'public text: release-process wording removed')
    for f in ['code_revision', 'disclosure', 'endpoint_condition']:
        if f in spec: rewrite(f, spec[f], 'public text: internal ids/roles/ranking language removed, draw sentence added')
    for f, reps in spec.get('replace', {}).items():
        t = en[f]
        for a, b_ in reps:
            assert t.count(a) == 1, (k, f, a[:60]); t = t.replace(a, b_)
        rewrite(f, t, 'public text: exact replacements of internal ids/roles')
    sens = ''
    if 'sens_input_extra' in spec: sens = fmt_usd(1000 * ((tin + spec['sens_input_extra']) * ref['in'] + tout * ref['out']) / 1e6 / 1500)
    cb = (spec['cost_basis'].replace('{REF}', reference_text(k, en)).replace('{PIN}', PIN).replace('{USD}', fmt_usd(usd))
          .replace('{CAPX}', f'{usd / CAP:.2f}').replace('{CAP}', f'{CAP:.6f}').replace('{SENS}', sens))
    rewrite('cost_basis', cb, 'public text: frozen reference filled, all-1,500 basis, internal wording removed')
    for f in PUBLIC:
        hit = BANNED.search(en[f]); assert not hit, ('internal public text', k, f, hit.group())
    blob = ' '.join(en[f] for f in PUBLIC)
    for frag in spec['must'] + ['RTX PRO 6000']: assert frag in blob, (k, frag)
    assert DRAW_NOTE in en['disclosure'] and 'RTX PRO 6000' in en['endpoint_condition'] + en['disclosure']
    # Every quoted latency figure reproduces from the scorer's own speed block and the raw maximum.
    sh = L(F / f'out-v17-share/{k}.json'); lat = fr['latency']
    quoted = {'p50': f"{sh['speed']['p50_s_raw']:.3f} s", 'p95': f"{sh['speed']['p95_s_raw']:.3f} s", 'max': f"{lat['max']:.3f} s"}
    for name, q in quoted.items(): assert q in en['disclosure'], (k, name, q)
    assert lat['over_10s'] == 0 and sh['decision_limit']['n_over_limit'] == 0
    for tok in [tin, tout]: assert f'{tok:,}' in en['cost_basis'], (k, tok)
    pin = spec['repo_id'] + '@' + en['revision']; assert en['repo'] == 'https://huggingface.co/' + spec['repo_id']
    d = {'registry': reg, 'measured_on': '2026-10-27', 'raw_sha256': fr['raw_sha256'], 'model_pin': pin, 'usd_per_1000': usd, 'cap_ratio': usd / CAP,
         'priced_input_tokens': tin, 'native_input_tokens': fr['native_input_tokens'], 'output_tokens': tout, 'paid_public': spec['paid'], 'gpu': spec['gpu']}
    if sens: d['usd_per_1000_if_uncounted_prefills_priced'] = float(sens)
    pins = {'entry_path': str(ep), 'entry_sha256': fr['entry_sha256'], 'raw_sha256': fr['raw_sha256'], 'raw_verified_in_place': True, 'registry_sha256': sha(F / 'REGISTRY.json'), 'manifest_sha256': MH, 'input_sha256': INH}
    if 'engine_recount' in fr: pins['engine_recount'] = fr['engine_recount']; assert fr['engine_recount']['answered_engine_input_tokens'] == tin
    for mode in ['frozen', 'v17-off', 'v17-share']:
        p = F / f'out-{mode}/jevbench-v1.6.0-results.json'; res = L(p)
        assert res['G_med'] == GMED and res['bootstrap']['B'] == 1000 and res['bootstrap']['bootstrap_seed'] == 16
        s = copy.deepcopy(next(x for x in res['systems'] if x['key'] == k))
        assert s['status'] == {'answered_ok': 1500, 'missing': 0, 'rows': 1500, 'status': 'complete'} and s['cost']['usd_per_1000'] == usd and s['cost']['kind'] == 'estimate'
        assert s['v16']['g_med_used'] == GMED and s['intelligence']['penalty'] == 1.0
        for f in ['display', 'author', 'licence', 'disclosure', 'code_revision', 'endpoint_condition']: s[f] = en[f]
        s['cost']['basis'] = en['cost_basis']; d[mode] = s; pins[mode] = {'path': str(p), 'sha256': sha(p)}
    assert d['v17-share']['decision_limit']['n_over_limit'] == 0 and d['v17-share']['decision_limit']['treatment'] == 'share'
    cells = {}
    for mode in ['off', 'share']:
        cp_ = F / f'cells/{mode}/categories.json'; dp = F / f'cells/{mode}/decisive.json'
        c = L(cp_); assert c['source_results_sha256'] == pins['v17-' + mode]['sha256']
        cells['cells_' + mode] = c['systems'][k]; cells['noul_' + mode] = L(dp)[k]
        cells['pool_' + mode] = {dim: {x['key']: x['n'] for x in c[dim]} for dim in ['families', 'usecases', 'languages']}
        pins['cells_' + mode] = {'categories_sha256': sha(cp_), 'decisive_sha256': sha(dp)}
    assert cells['pool_off'] == cells['pool_share']
    entries[k] = {'tokens': v['tokens'], 'treatment': v['treatment'], 'entry': en}
    inputs_all[k] = d; cells_all[k] = cells; pins_all[k] = pins
# The new rows share v1.7.13's draw: their category pool sizes must equal the bounds v1.7.13 pinned for that draw.
prev_bounds = L(J.parent / 'v1713/receipts/NEW-ROW-BOUNDS.json')['h2o-lightning-4b-v1.4.1']
for k in cells_all:
    for dim in ['usecases', 'languages']: assert cells_all[k]['pool_share'][dim] == prev_bounds[dim], (k, dim)
for p in [J / 'inputs', J / 'src', J / 'receipts']: p.mkdir(parents=True, exist_ok=True)
put(J / 'inputs/ENTRIES.json', entries); put(J / 'src/inputs.json', inputs_all); put(J / 'src/cells.json', cells_all); put(J / 'receipts/INPUTS.json', pins_all)
shutil.copyfile(J.parent / 'v1713/src/carried-off.json', J / 'src/carried-off.json')   # carried off/frozen blocks of predecessor rows (read, never edited)
put(J / 'receipts/TEXT-CHANGES.json', text_changes)
put(J / 'receipts/PRECONDITIONS.json', {'hostname': socket.gethostname(), 'pricing_sha256': PIN, 'predecessor': 'v1.7.13', 'predecessor_review_at_build': prev_pub['review']['verdict'], 'v1712_review': 'PASS', 'paid_request_sha256': sha(REQ), 'paid_visibility': 'public', 'draw': DRAW, 'g_med_fixed': GMED, 'gmed_check_sha256': sha(F.parent / 'GMED-CHECK.json'), 'field_rows_sha256': sha(F / 'ROWS.json')})
print('PASS host, pricing, scorer, entry/raw/manifest/recount pins; three-view scores for', len(inputs_all), 'rows; costs', {k: round(v['usd_per_1000'], 6) for k, v in inputs_all.items()}, '; public text rewritten', len(text_changes), 'fields')
