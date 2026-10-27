"""v1.7.13: capture the trusted aggregate scorer outputs for the one new row (first release on draw v1.6-regular-20261027).
The sealed raw is only hashed in place, never rendered. Public text is rewritten explicitly (no internal ids, board numbers,
roles, job names or order ids) and every rewrite is recorded in receipts/TEXT-CHANGES.json."""
import copy, hashlib, json, pathlib, re, socket
from pricing_reference_v1713 import PIN, reference, reference_text
J = pathlib.Path(__file__).resolve().parent; W = J.parents[1]; B = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')
L = lambda p: json.loads(pathlib.Path(p).read_text()); sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put = lambda p, d: pathlib.Path(p).write_text(json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
KEY = 'h2o-lightning-4b-v1.4.1'; DRAW = 'v1.6-regular-20261027'; CAP = 0.06459465517241379; GMED = 2.573387642438244
assert socket.gethostname() == 'Ubuntu-2204-jammy-amd64-base'
assert sha('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py') == PIN
assert sha('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py') == '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(B / 'r160/scorer/score_v17.py') == '6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978'
assert L(W / 'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.12-publication.json')['review']['verdict'] == 'PASS'
rq = pathlib.Path('/home/flori/jobs/fastlane-evaluations/54575fd5-306e-4257-9fb6-964beeec7cfe/request.json'); assert L(rq)['visibility'] == 'public'
EP = pathlib.Path('/home/flori/jobs/fastlane-native-54575fd5/score/ENTRIES-H2O141.json'); EH = '62f71cdc1b376b2b402d0935bbff7fae10c9237df76761a706116abf0396e551'
RAW = pathlib.Path(f'/home/flori/jevbench-sealed/v1.6-run/{DRAW}/runs-fastlane/h2o-lightning-4b-v1.4.1.raw.jsonl'); RH = '96d26bb3c0486ecbee832e309db4099b3a616b1540b4a92eff09dec81b719335'
MAN = pathlib.Path(f'/home/flori/jevbench-sealed/v1.6-run/{DRAW}/inputs/manifest.json'); MH = 'f5a5151a1a19923dec1434230dbc451d9ca879ce8ccba8f268b296cac9c1ee35'
INH = '9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
F = B / 'r197/v1713/score/field'
assert sha(EP) == EH and sha(RAW) == RH and sha(MAN) == MH and L(MAN)['input_sha256']['selfhosted'] == INH
v = L(EP)[KEY]; assert v['raw'] == str(RAW) and v['raw_sha256'] == RH
reg = L(F / 'REGISTRY.json')[KEY]; assert pathlib.Path(F / 'runs' / f'{KEY}.jsonl').resolve() == RAW
rows_meta = L(F / 'ROWS.json'); assert (rows_meta['processed_input_tokens'], rows_meta['untrimmed_input_tokens'], rows_meta['output_tokens'], rows_meta['ok']) == (711020, 944694, 1500, 1500)
ref = reference(KEY, {'base_model': 'Qwen/Qwen3.5-4B'}); assert ref == {'base': 'Qwen/Qwen3.5-4B', 'listing': 'deepinfra:Qwen/Qwen3.5-4B', 'in': 0.03, 'out': 0.15}, ref
usd = 1000 * (711020 * reg['price_in_per_m'] + 1500 * reg['price_out_per_m']) / 1e6 / 1500
usd_untrim = 1000 * (944694 * reg['price_in_per_m'] + 1500 * reg['price_out_per_m']) / 1e6 / 1500
assert reg['usd_per_1000_override'] == usd and abs(usd - 0.0143704) < 1e-9

en = copy.deepcopy(v['entry']); text_changes = []
def rewrite(field, new, must_contain):
    old = en[field]
    for frag in must_contain: assert frag in old, (field, frag)
    en[field] = new; text_changes.append({'key': KEY, 'field': field, 'before_sha256': hashlib.sha256(old.encode()).hexdigest(), 'after_sha256': hashlib.sha256(new.encode()).hexdigest(), 'why': 'public text: internal ids/roles removed, wording per release decision'})
rewrite('display', 'H2O-Lightning-4B v1.4.1', ['H2O-Lightning-4B v1.4.1'])
rewrite('author', 'H2O.ai', ['H2O.ai', '54575fd5'])
rewrite('code_revision', en['code_revision'].replace(" Kit SHAS 99f91ea7 (auto-intake r59 lineage, independent reviews PASS); no trust_remote_code.",
        ' Evaluator kit hash 99f91ea7, independent source reviews PASS; no trust_remote_code.'), ['Kit SHAS 99f91ea7 (auto-intake r59 lineage'])
rewrite('disclosure',
    "FIRST MEASUREMENT of v1.4.1 (paid evaluation, public). FAMILY: new weights (model.safetensors c9b6290d) of a family with an earlier row "
    "(H2O-Lightning-4B v1.1, which stays on the board unchanged); an earlier v1.4.0 measurement attempt stopped before completion because of an "
    "evaluator-side monitoring error and has no row. DRAW: first row measured on the 27 Oct 2026 regular draw (fresh sealed items; anchor runs "
    "pending, so its numbers are shown as published, offset 0). CONTEXT: 5 items whose state exceeds the shipped 32,000-token limit are answered "
    "on the author's own head/tail state trim (pre-registered positions); cost is priced on the trimmed prompt, the untrimmed count is disclosed. "
    "ENGINE: the author's documented JevBench configuration, two-way reading on one engine with the h2oai vLLM overlay (README: the one-way "
    "TWO_WAY=0 setting is not the measured configuration). PROVENANCE, author statements (unverified): fine-tune of Qwen/Qwen3.5-4B. HARDWARE: "
    "one Verda RTX PRO 6000 Blackwell Server Edition 96 GB (FIN-03, EU); latency reflects that card.",
    ['FIRST MEASUREMENT of v1.4.1', 'c9b6290d', '5 items', 'TWO_WAY=0', 'RTX PRO 6000'])
rewrite('cost_basis',
    f"ESTIMATE (*est.), self-hosted open weights, no public tariff: base Qwen/Qwen3.5-4B, {reference_text(KEY, {'base_model': 'Qwen/Qwen3.5-4B'})} "
    f"(frozen 25 Sep 2026 snapshot; listing later deprecated, frozen reference kept; pricing module sha256 {PIN}). "
    "Input is billed on the prompt tokens actually processed by the model: 711,020 tokens after the shipped 32,000-token state trim "
    "(chat template and system turn included). The untrimmed rendered count, 944,694 tokens, is disclosed, not priced; 5 items were trimmed "
    "at pre-registered positions. Output: 1,500 tokens (one per answered question, as reported). "
    f"COST FIGURES: USD {usd:.6f} per 1,000 decisions over all 1,500 items of the draw (the first row on this draw, so no common cost "
    f"basis applies); {usd / CAP:.2f}x the official cost cap USD {CAP:.6f}. Priced on the untrimmed count it would be USD {usd_untrim:.6f} per "
    "1,000 decisions. Estimated model tariff, not charged usage or a host quote.",
    ['ESTIMATE', '711,020', '944,694'])
ec = en['endpoint_condition']
assert 'frozen v16 pod driver' in ec and 'The standard self-hosted adjustment applies.' in ec
rewrite('endpoint_condition', ec.replace('driven one request at a time by the frozen v16 pod driver', 'driven one request at a time by the frozen JevBench pod driver')
        .replace('The standard self-hosted adjustment applies.', 'The standard self-hosted x2 + 0.15 s latency adjustment applies.'), ['Verda', 'FIN-03'])
BANNED = re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|\blead\b|custody|deputy|\bboard #|\br59\b|auto-intake|54575fd5|h2o141|(?-i:DECISIONS)|fast-lane order|\{[A-Za-z_][A-Za-z0-9_]*\}', re.I)
PUBLIC = ['display', 'author', 'licence', 'disclosure', 'code_revision', 'endpoint_condition', 'cost_basis']
for f in PUBLIC:
    assert not BANNED.search(en[f]), ('internal public text', f, BANNED.search(en[f]).group())
pin = 'h2oai/h2o-lightning-4b@' + en['revision']; assert en['revision'] == 'cc18ee330e6895c41b9a60f37a0dd122dc4c3461'
d = {'registry': reg, 'measured_on': '2026-10-27', 'raw_sha256': RH, 'model_pin': pin, 'usd_per_1000': usd, 'usd_per_1000_untrimmed': usd_untrim, 'cap_ratio': usd / CAP}
pins = {'entry_path': str(EP), 'entry_sha256': EH, 'raw_sha256': RH, 'raw_verified_in_place': True, 'registry_sha256': sha(F / 'REGISTRY.json'), 'manifest_sha256': MH, 'input_sha256': INH}
for mode in ['frozen', 'v17-off', 'v17-share']:
    p = F / f'out-{mode}/jevbench-v1.6.0-results.json'; res = L(p)
    assert res['G_med'] == GMED and res['bootstrap']['B'] == 1000 and res['bootstrap']['bootstrap_seed'] == 16
    s = copy.deepcopy(next(x for x in res['systems'] if x['key'] == KEY))
    assert s['status'] == {'answered_ok': 1500, 'missing': 0, 'rows': 1500, 'status': 'complete'} and s['cost']['usd_per_1000'] == usd and s['cost']['kind'] == 'estimate'
    assert s['v16']['g_med_used'] == GMED and s['intelligence']['penalty'] == 1.0
    for f in ['display', 'author', 'licence', 'disclosure', 'code_revision', 'endpoint_condition']: s[f] = en[f]
    s['cost']['basis'] = en['cost_basis']; d[mode] = s; pins[mode] = {'path': str(p), 'sha256': sha(p)}
assert d['v17-share']['decision_limit']['n_over_limit'] == 0 and d['v17-share']['decision_limit']['treatment'] == 'share'
cells = {}
for mode in ['off', 'share']:
    cp_ = F / f'cells/{mode}/categories.json'; dp = F / f'cells/{mode}/decisive.json'
    c = L(cp_); assert c['source_results_sha256'] == pins['v17-' + mode]['sha256']
    cells['cells_' + mode] = c['systems'][KEY]; cells['noul_' + mode] = L(dp)[KEY]
    cells['pool_' + mode] = {dim: {x['key']: x['n'] for x in c[dim]} for dim in ['families', 'usecases', 'languages']}
    pins['cells_' + mode] = {'categories_sha256': sha(cp_), 'decisive_sha256': sha(dp)}
assert cells['pool_off'] == cells['pool_share']
for p in [J / 'inputs', J / 'src', J / 'receipts']: p.mkdir(parents=True, exist_ok=True)
put(J / 'inputs/ENTRIES.json', {KEY: {'tokens': v['tokens'], 'treatment': v['treatment'], 'entry': en}})
put(J / 'src/inputs.json', {KEY: d}); put(J / 'src/cells.json', {KEY: cells}); put(J / 'receipts/INPUTS.json', {KEY: pins})
put(J / 'receipts/TEXT-CHANGES.json', text_changes)
put(J / 'receipts/PRECONDITIONS.json', {'hostname': socket.gethostname(), 'pricing_sha256': PIN, 'predecessor_review': 'PASS', 'paid_request_sha256': sha(rq), 'paid_visibility': 'public', 'draw': DRAW, 'g_med_fixed': GMED, 'gmed_check_sha256': sha(F.parent / 'GMED-CHECK.json')})
print('PASS host, pricing, scorer, entry/raw/manifest pins; three-view scores; processed-input cost', round(usd, 7), '; public text rewritten', len(text_changes), 'fields')
