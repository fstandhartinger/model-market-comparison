"""v1.7.16 Phase A: scoring fields on draw v1.6-regular-20261027 with the same-items cost rule (scorer flag --cost-basis).
Four fields, each the same cohort as the field that produced the published values, so non-cost outputs can be compared byte for byte:
  f13  h2o-lightning-4b-v1.4.1              (v1.7.13 field)       registry of v1.7.13 minus usd_per_1000_override (token-priced)
  f14  the five v1.7.14 rows                 (v1.7.14 field)       registry of v1.7.14 minus the override, EXCEPT Decisio (engine-recount basis, see below)
  fms  microsoft-decision-1-r2               (v1.7.15 field)       registry unchanged (already token-priced, tariff 0.042/0)
  fst  strike-1                              (new)                 hosted full-set API row, reference() Qwen/Qwen3.5-4B 0.03/0.15
Each row keeps its own price reference and token basis:
  * raw usage = the published priced basis for Torchcast, Elf, Jeff x2, Microsoft and strike-1 -> the scorer re-costs them itself;
  * H2O priced processed tokens after the 32k trim; the only 5 trimmed states are the 5 longest items, all outside the common set
    (asserted), so on the common set processed = raw usage and the scorer re-costs it itself;
  * Decisio priced the ENGINE recount (raw usage = native count). On the common set: engine = recount common_engine (1,495 rows)
    - native of the 6 further excluded rows - 6 x 78 (per-item engine-native delta is 77 or 78; 14 of 1,495 rows have 77; their
    ids are not recorded), so the value is exact up to <= 6 tokens (bounded, disclosed in COMMON-COSTS.json); supplied as
    usd_per_1000_override computed with the scorer's own common_basis_usd formula (tokens on the set / number of items).
Aggregates only; sealed raws are read in place via symlinks, never copied or printed.   python3 -I build_fields_v1716.py <out>"""
import collections, copy, hashlib, importlib.util, json, os, pathlib, sys
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
L = lambda p: json.loads(pathlib.Path(p).read_text())
J = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919'); R = J / 'r197'
HERE = pathlib.Path(__file__).resolve().parent; PRIV = HERE / 'private'
D = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
PRICING = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
SCORER = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')
RECOUNT = pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r47-decisio-think/state/engine-recount-20261027/engine-recount.json')
CONSUMED = D / 'runs-auto-intake/strike-1/CONSUMED.json'
STRIKE_RAW = D / 'runs-auto-intake/strike-1/strike-1.raw.jsonl'; STRIKE_SHA = '4c6c7ab25b11432f8934425a44806ec5a2499241a9c5790216a11651473f2027'
KIT_SHAS = pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r65-strike1/SHAS.txt')
PINS = {R / 'v1713/score/field/REGISTRY.json': '796903ef6d7de1ded43e39eb6f9b32955557b0982208de8c395b440479a24574',
        R / 'v1714/score/field/REGISTRY.json': 'd8282ee5f701997a73d63fb38cee1010cf09b61cc8e36851846d1763664745bd',
        R / 'msft/score/field/A-tariff/REGISTRY.json': '55d969aa3de519039203789a7431caf3c5d6742ab4f0a983705d876185c0a4d5',
        PRICING: '645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4',
        SCORER: '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9',
        RECOUNT: '8c9f4691551a99a23c2763783278727f6f6fd7ca5c9fc24467c2dec8b144b646',
        CONSUMED: '497dfbd9f7703a2497a6d5d1b82f83e6a6891c82609a83e170e230f85933a52b',
        STRIKE_RAW: STRIKE_SHA, KIT_SHAS: '456087be5202ed81464fd2411dc39f68ea4cff0e2c63aafe8cd82d6ce2acb415'}
for p, h in PINS.items(): assert sha(p) == h, ('HASH MISMATCH', str(p))
cs = L(PRIV / 'COMMON-SET.json'); N = cs['common_n']; assert N == 1489
assert sha(PRIV / 'cost-basis-v1716.json') == cs['cost_basis_sha256'] and sha(PRIV / 'cost-basis-v1716-msft.json') == cs['cost_basis_msft_sha256']
excl = set(L(PRIV / 'cost-basis-v1716.json')['exclude_opaque_ids']); assert len(excl) == 11
con = L(CONSUMED); assert con['raw_sha256'] == STRIKE_SHA and con['raw_lines'] == 1500 and con['full_set'] is True
spec_ = importlib.util.spec_from_file_location('score_v16', SCORER)   # the scorer's own common-basis formula
src = SCORER.read_text(); ns = {}
exec(compile(src[src.index('def common_basis_usd'):src.index('def build_systems')], str(SCORER), 'exec'), ns)
common_basis_usd = ns['common_basis_usd']
s_ = importlib.util.spec_from_file_location('pricing_v15', PRICING); pr = importlib.util.module_from_spec(s_); s_.loader.exec_module(pr)
LR = lambda p: [json.loads(l) for l in pathlib.Path(p).read_text().splitlines() if l.strip()]
out = pathlib.Path(sys.argv[1]); assert not out.exists(); out.mkdir(mode=0o700, parents=True)
summary = {}
def field(name, reg, runs):
    F = out / name; F.mkdir(mode=0o700); (F / 'runs').mkdir(mode=0o700)
    for k, target in runs.items(): os.symlink(target, F / 'runs' / f'{k}.jsonl')
    (F / 'REGISTRY.json').write_text(json.dumps(reg, indent=1, sort_keys=True) + '\n')
def cost_rows(key, raw, reg, tin_all, tout_all, usd_all_published, basis_note):
    rows = LR(raw); m = reg
    usd, n = common_basis_usd(rows, {'price_in_per_m': m['price_in_per_m'], 'price_out_per_m': m['price_out_per_m']}, excl)
    sub = [r for r in rows if r['task_id'] not in excl]
    summary[key] = dict(common_n=n, common_input_tokens=sum(int((r.get('usage') or {}).get('input_tokens') or 0) for r in sub),
                        common_output_tokens=sum(int((r.get('usage') or {}).get('output_tokens') or 0) for r in sub),
                        usd_per_1000_common=usd, usd_per_1000_all_items_published=usd_all_published,
                        all_items_input_tokens=tin_all, all_items_output_tokens=tout_all, price_in_per_m=m['price_in_per_m'], price_out_per_m=m['price_out_per_m'],
                        token_basis=basis_note)
    assert n == N, key
    return rows
# ---- f13: H2O
r13 = L(R / 'v1713/score/field/REGISTRY.json'); h = copy.deepcopy(r13['h2o-lightning-4b-v1.4.1']); pub = h.pop('usd_per_1000_override')
H2O_RAW = D / 'runs-fastlane/h2o-lightning-4b-v1.4.1.raw.jsonl'
rows = cost_rows('h2o-lightning-4b-v1.4.1', H2O_RAW, h, 711020, 1500, pub, 'processed input after the 32k trim; no common-set item is trimmed, so processed = raw usage there')
tin = {r['task_id']: r['usage']['input_tokens'] for r in rows}; top5 = set(sorted(tin, key=lambda t: -tin[t])[:5])
assert top5 <= excl and sorted(tin.values())[-6] < 32768 / 4, 'the 5 trimmed (longest) states must all be outside the common set'
assert abs(1000 * (711020 * h['price_in_per_m'] + 1500 * h['price_out_per_m']) / 1e6 / 1500 - pub) < 1e-15
field('f13', {'h2o-lightning-4b-v1.4.1': h}, {'h2o-lightning-4b-v1.4.1': H2O_RAW})
# ---- f14: five rows
r14 = L(R / 'v1714/score/field/REGISTRY.json'); rows14 = L(R / 'v1714/score/field/ROWS.json')['rows']
reg14, runs14 = {}, {}
for k, m in r14.items():
    m = copy.deepcopy(m); raw = (R / 'v1714/score/field/runs' / f'{k}.jsonl').resolve(); assert sha(raw) == rows14[k]['raw_sha256']
    pub = m['usd_per_1000_override']; ri = rows14[k]
    if k == 'decisio-gemma-4-12b-tuned-commit-think':
        rc = L(RECOUNT); assert rc['common_basis_rows'] == 1495 and rc['truncated_rows'] == 5
        rws = cost_rows(k, raw, m, ri['priced_input_tokens'], ri['output_tokens'], pub, 'ENGINE recount (primary engine prompt), not raw usage')
        nat = {r['task_id']: r['usage']['input_tokens'] for r in rws}
        trunc = set(sorted(nat, key=lambda t: -nat[t])[:5]); assert sum(nat[t] for t in trunc) == rc['truncated_native_input_tokens'] and trunc <= excl
        six = excl - trunc; assert len(six) == 6
        assert sum(v for t, v in nat.items() if t not in trunc) == rc['common_native_input_tokens']
        assert rc['delta_per_item_histogram_common'] == {'77': 14, '78': 1481}
        eng_lo = rc['common_engine_input_tokens'] - sum(nat[t] for t in six) - 6 * 78; eng_hi = eng_lo + 6
        assert eng_lo == summary[k]['common_input_tokens'] + rc['engine_minus_native_common'] - 6 * 78  # consistency
        tout = summary[k]['common_output_tokens']
        usd = 1000 * (eng_lo * m['price_in_per_m'] + tout * m['price_out_per_m']) / 1e6 / N
        usd_hi = 1000 * (eng_hi * m['price_in_per_m'] + tout * m['price_out_per_m']) / 1e6 / N
        summary[k].update(native_common_usd_per_1000=summary[k]['usd_per_1000_common'], usd_per_1000_common=usd, common_input_tokens_native=summary[k]['common_input_tokens'],
                          common_input_tokens=eng_lo, engine_tokens_bound=[eng_lo, eng_hi], usd_per_1000_bound=[usd, usd_hi],
                          engine_rule='recount common_engine - native(6 further excluded) - 6 x 78 (modal delta; <= 6 tokens high if any of the 6 has delta 77)')
        m['usd_per_1000_override'] = usd
    else:
        cost_rows(k, raw, m, ri['priced_input_tokens'], ri['output_tokens'], pub, 'raw usage (= the published priced basis)')
        assert ri['priced_input_tokens'] == ri['native_input_tokens']
        assert abs(1000 * (ri['priced_input_tokens'] * m['price_in_per_m'] + ri['output_tokens'] * m['price_out_per_m']) / 1e6 / 1500 - pub) < 1e-15
        del m['usd_per_1000_override']
    reg14[k] = m; runs14[k] = raw
field('f14', reg14, runs14)
# ---- fms: Microsoft r2 (already token-priced; its own 1,493-item view; cost-basis file excludes 4 of its items)
rms = L(R / 'msft/score/field/A-tariff/REGISTRY.json'); MS_RAW = (R / 'msft/score/field/A-tariff/runs/microsoft-decision-1-r2.jsonl').resolve()
assert sha(MS_RAW) == '1f069818cdc069a532a4c4965d306fbd302bb819dde4aa3c48a9bd676c4a981e'
m = rms['microsoft-decision-1-r2']; assert m.get('usd_per_1000_override') is None
cost_rows('microsoft-decision-1-r2', MS_RAW, m, 467021, 1489, 1000 * 467021 * 0.042 / 1e6 / 1493, 'raw usage (= the published priced basis)')
field('fms', rms, {'microsoft-decision-1-r2': MS_RAW})
# ---- fst: strike-1
ref = pr.reference('strike-1', {'base_model': 'Qwen/Qwen3.5-4B'}, pr.catalog_rates())
assert ref is not None and ref[0] == 'deepinfra:Qwen/Qwen3.5-4B' and abs(ref[1][0] - 0.03) < 1e-12 and abs(ref[1][1] - 0.15) < 1e-12, ref
st = {'api_subset': 'S', 'author': 'Strike AI', 'base_model': 'Qwen/Qwen3.5-4B', 'cost_kind': 'estimate', 'price_kind': 'estimate',
      'cost_basis': 'draft (replaced by the public text in the release build)', 'display': 'Strike-1', 'endpoint_condition': 'draft', 'endpoint_kind': 'api',
      'lane': 'api', 'measured_on': '2026-10-28', 'price_in_per_m': ref[1][0], 'price_out_per_m': ref[1][1], 'provider': 'strike', 'ranked': True,
      'repo': 'https://strike-ai.eu', 'support': {'choice': 'native', 'noul': 'native', 'score': 'native'}}
srows = LR(STRIKE_RAW); assert len(srows) == 1500 and collections.Counter(r['status_code'] for r in srows) == {200: 1495, 400: 5}
assert all(r['probs_source'] == 'native' for r in srows) and all((r['served_model'] == 'strike-1') == (r['status_code'] == 200) for r in srows)
assert all(r['usage']['output_tokens'] == 0 for r in srows if r['status_code'] == 200)
s_in = sum(int((r['usage'] or {}).get('input_tokens') or 0) for r in srows)
cost_rows('strike-1', STRIKE_RAW, st, s_in, 0, 1000 * s_in * ref[1][0] / 1e6 / 1500, 'vendor usage input tokens; output reported 0 (9 Oct rule: zero output = 0)')
summary['strike-1']['reference'] = [ref[0], list(ref[1])]
field('fst', {'strike-1': st}, {'strike-1': STRIKE_RAW})
res = dict(common_n=N, common_set_sha256=cs['common_set_sha256'], cost_basis_sha256=cs['cost_basis_sha256'], cost_basis_msft_sha256=cs['cost_basis_msft_sha256'],
           rows=summary, hashes={str(p): h for p, h in PINS.items()}, registries={n: sha(out / n / 'REGISTRY.json') for n in ['f13', 'f14', 'fms', 'fst']})
(out / 'COMMON-COSTS.json').write_text(json.dumps(res, indent=1, sort_keys=True) + '\n')
print(json.dumps({k: {f: v[f] for f in ['common_input_tokens', 'common_output_tokens', 'usd_per_1000_common', 'usd_per_1000_all_items_published']} for k, v in summary.items()}, indent=1))
