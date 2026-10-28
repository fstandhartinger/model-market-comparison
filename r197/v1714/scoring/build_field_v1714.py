"""v1.7.14 Phase A: five-row scoring field on draw v1.6-regular-20261027 (same-draw addendum to v1.7.13).
Verifies every pinned hash (entries, raws, input, manifest, pricing module, scorer, Decisio engine recount), the sealed input
order, token totals against each entry's expectation, and the frozen pricing references; writes REGISTRY.json (+ runs/ symlinks
to the sealed raws, read in place, never copied). Prints aggregates only, never item fields.
  python3 -I build_field_v1714.py <out-field-dir>"""
import collections, hashlib, importlib.util, json, os, pathlib, sys
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
L = lambda p: json.loads(pathlib.Path(p).read_text())
CAP = 0.06459465517241379
D = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
INP = D / 'inputs/input-selfhosted-1500.jsonl'; MAN = D / 'inputs/manifest.json'
PRICING = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
SCORER = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')
AI = pathlib.Path('/home/flori/jobs/jevbench-auto-intake')
TC_ENT = pathlib.Path('/home/flori/jobs/fastlane-native-69f7a75d/score/ENTRIES-TC31B.json')
R17 = AI / 'r24-score/ENTRIES-R17-LEAD.json'; R17B = AI / 'r24-score/ENTRIES-R17B-LEAD.json'
RECOUNT = AI / 'r47-decisio-think/state/engine-recount-20261027/engine-recount.json'
RECOUNT_SCRIPT = AI / 'r47-decisio-think/engine_recount.py'; RENDER = AI / 'r47-decisio-think/rendering_decisiothink.py'
TC_REQ = pathlib.Path('/home/flori/jobs/fastlane-evaluations')
# key -> (entry file, raw, raw sha256, priced input tokens, native input, output tokens, price base, explicit listing or None, paid public)
ROWS = {
 'torchcast-decision-31b-v1.0': (TC_ENT, D / 'runs-fastlane/torchcast-decision-31b-v1.0.raw.jsonl', 'e51a1c22336050368336c996d7cb32181bad5e854024f07844b2a8577a0dda7d', 645268, 645268, 0, 'google/gemma-4-31B-it', None, True),
 'arcbright-elf-1-12b-r2': (R17, D / 'runs-auto-intake/arcbright-elf-1-12b-r2.raw.jsonl', '84f08ebb6ff92af453b75cda042f617ea89c5be6a2176c7c69e11f2521da6f08', 610840, 610840, 1500, 'google/gemma-4-12B-it', 'google/gemma-3-12b-it', False),
 'jeff_1_1_qwen_4b': (R17, D / 'runs-auto-intake/jgeuter-jeff-1-1-qwen-4b.raw.jsonl', 'c37fada15a2021cf744b2031acb964508caf48873a2bcda5da6d6ac4a5e7c288', 629951, 629951, 69580, 'Qwen/Qwen3.5-4B', None, False),
 'decisio-gemma-4-12b-tuned-commit-think': (R17, D / 'runs-auto-intake/tachara-ai-decisio-12b-tuned-commit-think.raw.jsonl', 'd7396dd680e13af9ba26c4526007fee3647d03eee7673bf88075ac510f39cc3c', 844031, 727045, 9121, 'google/gemma-4-12B-it', 'google/gemma-3-12b-it', False),
 'jeff_1_1_large': (R17B, D / 'runs-auto-intake/jgeuter-jeff-1-1-large.raw.jsonl', '1f1fdc2df674da00128ae7b47d5ea3429cf1124383a077577e7c68c7d9cc0e72', 620215, 620215, 21830, 'google/gemma-4-31B-it', None, False),
}
PINS = {TC_ENT: 'f36373abe1a01b3fbf0e19e6ebb4fddfe0615f472e1528c9906fa9eb0f2b454a',
        R17: 'bb53dc42a9e16169bd2e7f33e527b8780037cef386263f109e50285cde3be20f',
        R17B: '094aedba39685e9a0949d381746a50dd274ef145c8aadf3d2d4889581d6ea7c0',
        RECOUNT: '8c9f4691551a99a23c2763783278727f6f6fd7ca5c9fc24467c2dec8b144b646',
        RECOUNT_SCRIPT: '07b69b7a71ba53f1e3b6d22d64803c9bfa97496479c0205e613484e673401319',
        RENDER: 'fc4ffec452f3a7034e378cdb9f0d07d34aa6de3f79ae0b70910e923feea2cd17',
        INP: '9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426',
        MAN: 'f5a5151a1a19923dec1434230dbc451d9ca879ce8ccba8f268b296cac9c1ee35',
        PRICING: '645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4',
        SCORER: '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'}
for k, v in ROWS.items(): PINS[v[1]] = v[2]
for p, h in PINS.items():
    assert sha(p) == h, ('HASH MISMATCH', str(p))
man = L(MAN); assert man['release'] == 'v1.6-regular-20261027' and man['input_sha256']['selfhosted'] == PINS[INP]
rc = L(RECOUNT)
assert rc['engine_recount_sha256'] == PINS[RECOUNT_SCRIPT] and rc['rendering_sha256'] == PINS[RENDER] and rc['input_sha256'] == PINS[INP]
assert rc['sealed'] is True and rc['network_cut'] is True and rc['n'] == 1500 and rc['independent_recompute_mismatches'] == 0
assert (rc['answered_engine_input_tokens'], rc['answered_native_input_tokens'], rc['outcomes']) == (844031, 727045, {'answered': 1495, 'truncated': 5})
assert rc['think_eligible_n'] == 746 and rc['think_second_read_prefill_upper_bound_tokens_if_all_eligible_thought'] == 504719
s_ = importlib.util.spec_from_file_location('pricing_v15', PRICING); pr = importlib.util.module_from_spec(s_); s_.loader.exec_module(pr)
cat = pr.catalog_rates()
def price_ref(key, base, explicit):
    if explicit is None:
        r = pr.reference(key, {'base_model': base}, cat); assert r is not None, key
        return {'base': base, 'listing': r[0], 'in': round(r[1][0], 12), 'out': round(r[1][1], 12)}
    # Explicit reference (settled Gemma-4-12B treatment, as the v1.7.11 Decisio rows): the declared base is unlisted.
    assert base in pr.UNLISTED_BASE_MODELS and pr.reference(key, {'base_model': base}, cat) is None, key
    r = cat[explicit]; return {'base': base, 'listing': explicit, 'in': round(r[0], 12), 'out': round(r[1], 12)}
EXPECT_REF = {'google/gemma-4-31B-it': ('google/gemma-4-31b-it', 0.09, 0.34), 'google/gemma-4-12B-it': ('google/gemma-3-12b-it', 0.05, 0.15), 'Qwen/Qwen3.5-4B': ('deepinfra:Qwen/Qwen3.5-4B', 0.03, 0.15)}
ids = [json.loads(l)['task_id'] for l in INP.read_text().splitlines() if l.strip()]
reg, summ = {}, {}
for key, (ep, raw, rh, tin, native_in, tout, base, explicit, paid) in ROWS.items():
    spec = L(ep)[key]
    assert spec['raw'] == str(raw) and spec.get('raw_sha256', rh) == rh and spec['pricing_base'] == base, key
    assert spec['entry']['base_model'] == base and spec['tokens'] == 'server' and spec['treatment'] == 'auto'
    assert (spec.get('explicit_ref') or {}).get('key') == explicit, key
    rows = [json.loads(l) for l in raw.read_text().splitlines() if l.strip()]
    assert len(rows) == 1500 and [r['task_id'] for r in rows] == ids, (key, 'raw is not in sealed input order')
    for r in rows:
        assert r['ok'] and r['status_code'] == 200 and r['probs_source'] == 'native' and r['error'] is None, key
        pv = list(r['probs_as_returned'].values()); assert all(0 <= v <= 1 for v in pv) and abs(sum(pv) - 1) < 2e-3, key
        assert isinstance(r['latency_s'], float)
    nin = sum(r['usage']['input_tokens'] for r in rows); nout = sum(r['usage']['output_tokens'] for r in rows)
    e = spec['expect']
    assert (nin, nout) == (native_in, tout) == (e['input_tokens'], e['output_tokens']), (key, nin, nout)
    assert e['ok'] == 1500 and e['failed'] == 0 and e['status_counts'] == {'200': 1500}
    ref = price_ref(key, base, explicit); assert (ref['listing'], ref['in'], ref['out']) == EXPECT_REF[base], (key, ref)
    usd = 1000 * (tin * ref['in'] + tout * ref['out']) / 1e6 / len(rows)
    lat = sorted(r['latency_s'] for r in rows)
    d = dict(spec['entry'])
    d.update(price_in_per_m=ref['in'], price_out_per_m=ref['out'], cost_kind='estimate', price_kind='estimate', ranked=True, usd_per_1000_override=usd)
    reg[key] = d
    summ[key] = dict(rows=len(rows), ok=sum(r['ok'] for r in rows), status_counts=dict(collections.Counter(str(r['status_code']) for r in rows)),
                     priced_input_tokens=tin, native_input_tokens=nin, output_tokens=nout, price_reference=ref, usd_per_1000=usd, cap=CAP,
                     cap_ratio=usd / CAP, basis_items=len(rows), paid_public=paid, raw_sha256=rh, entry_path=str(ep), entry_sha256=PINS[ep],
                     latency=dict(n=len(lat), p50_mid=(lat[749] + lat[750]) / 2, p95_upper=lat[1424], max=lat[-1], over_10s=sum(1 for v in lat if v > 10.0)))
summ['decisio-gemma-4-12b-tuned-commit-think']['engine_recount'] = {k: rc[k] for k in ['answered_engine_input_tokens', 'answered_native_input_tokens', 'engine_minus_native_total', 'think_eligible_n', 'think_second_read_prefill_upper_bound_tokens_if_all_eligible_thought', 'engine_recount_sha256', 'rendering_sha256', 'independent_recompute_mismatches']} | {'file_sha256': PINS[RECOUNT]}
B = pathlib.Path(sys.argv[1]); assert not B.exists(); B.mkdir(mode=0o700, parents=True)
(B / 'runs').mkdir(mode=0o700)
for key, v in ROWS.items(): os.symlink(v[1], B / 'runs' / f'{key}.jsonl')
(B / 'REGISTRY.json').write_text(json.dumps(reg, indent=1, sort_keys=True) + '\n')
out = dict(rows=summ, hashes={str(p): h for p, h in PINS.items()}, input_order_asserted=True)
(B / 'ROWS.json').write_text(json.dumps(out, indent=1, sort_keys=True) + '\n')
print(json.dumps({k: {f: v[f] for f in ['priced_input_tokens', 'output_tokens', 'usd_per_1000', 'cap_ratio', 'latency']} for k, v in summ.items()}, indent=1))
