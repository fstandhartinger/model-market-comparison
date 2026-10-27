"""v1.7.13 Phase A: one-row scoring field for h2o-lightning-4b-v1.4.1 on the fresh draw v1.6-regular-20261027.
Verifies every pinned hash, the sealed input order, the frozen pricing reference, and writes REGISTRY.json (+ runs/ symlink
to the sealed raw, read in place, never copied). Prints aggregates only, never item fields.
  python3 -I build_field_h2o141.py <out-field-dir>"""
import collections, hashlib, importlib.util, json, os, pathlib, sys
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
KEY = 'h2o-lightning-4b-v1.4.1'
CAP = 0.06459465517241379
D = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
ENT = pathlib.Path('/home/flori/jobs/fastlane-native-54575fd5/score/ENTRIES-H2O141.json')
RAW = D / 'runs-fastlane/h2o-lightning-4b-v1.4.1.raw.jsonl'
INP = D / 'inputs/input-selfhosted-1500.jsonl'
MAN = D / 'inputs/manifest.json'
PRICING = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
SCORER = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')
REQ = pathlib.Path('/home/flori/jobs/fastlane-evaluations/54575fd5-306e-4257-9fb6-964beeec7cfe/request.json')
PINS = {ENT: '62f71cdc1b376b2b402d0935bbff7fae10c9237df76761a706116abf0396e551',
        RAW: '96d26bb3c0486ecbee832e309db4099b3a616b1540b4a92eff09dec81b719335',
        INP: '9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426',
        MAN: 'f5a5151a1a19923dec1434230dbc451d9ca879ce8ccba8f268b296cac9c1ee35',
        PRICING: '645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4',
        SCORER: '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'}
for p, h in PINS.items():
    assert sha(p) == h, ('HASH MISMATCH', str(p))
man = json.loads(MAN.read_text())
assert man['release'] == 'v1.6-regular-20261027' and man['input_sha256']['selfhosted'] == PINS[INP]
assert json.loads(REQ.read_text()).get('visibility') == 'public'
spec = json.loads(ENT.read_text())[KEY]
assert spec['raw'] == str(RAW) and spec['raw_sha256'] == PINS[RAW] and spec['pricing_base'] == 'Qwen/Qwen3.5-4B'
rows = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
ids = [json.loads(l)['task_id'] for l in INP.read_text().splitlines() if l.strip()]
assert len(rows) == 1500 and [r['task_id'] for r in rows] == ids, 'raw is not in sealed input order'
for r in rows:
    assert r['ok'] and r['status_code'] == 200 and r['probs_source'] == 'native' and r['error'] is None
    pv = list(r['probs_as_returned'].values()); assert all(0 <= v <= 1 for v in pv) and abs(sum(pv) - 1) < 2e-3
    assert isinstance(r['latency_s'], float)
untrim = sum(r['usage']['input_tokens'] for r in rows); tout = sum(r['usage']['output_tokens'] for r in rows)
e = spec['expect']
assert (untrim, tout, e['untrimmed_input_tokens'], e['output_tokens']) == (944694, 1500, 944694, 1500)
tin = e['input_tokens']; assert tin == 711020
# processed (post-trim) count: verify against the kit's usage-concordance audit
aud = json.loads(pathlib.Path('/home/flori/jobs/fastlane-native-54575fd5/kit/out/h2o141/usage-concordance-audit.json').read_text())
assert aud['scored_processed_input_tokens_total'] == tin and aud['scored_untrimmed_input_tokens_total'] == untrim
assert aud['processed_mismatches'] == 0 and aud['input_mismatches'] == 0
s_ = importlib.util.spec_from_file_location('pricing_v15', PRICING); pr = importlib.util.module_from_spec(s_); s_.loader.exec_module(pr)
ref = pr.reference(KEY, {'base_model': 'Qwen/Qwen3.5-4B'}, pr.catalog_rates())
assert ref is not None and ref[0] == 'deepinfra:Qwen/Qwen3.5-4B', ref
pin, pout = ref[1]; assert abs(pin - 0.03) < 1e-12 and abs(pout - 0.15) < 1e-12, ref
usd = 1000 * (tin * pin + tout * pout) / 1e6 / len(rows)
usd_untrim = 1000 * (untrim * pin + tout * pout) / 1e6 / len(rows)
lat = sorted(r['latency_s'] for r in rows)
d = dict(spec['entry'])
d.update(price_in_per_m=pin, price_out_per_m=pout, cost_kind='estimate', price_kind='estimate', ranked=True,
         usd_per_1000_override=usd)
B = pathlib.Path(sys.argv[1]); assert not B.exists(); B.mkdir(mode=0o700, parents=True)
(B / 'runs').mkdir(mode=0o700); os.symlink(RAW, B / 'runs' / f'{KEY}.jsonl')
(B / 'REGISTRY.json').write_text(json.dumps({KEY: d}, indent=1, sort_keys=True) + '\n')
summ = dict(key=KEY, rows=len(rows), ok=sum(r['ok'] for r in rows), status_counts=dict(collections.Counter(str(r['status_code']) for r in rows)),
            processed_input_tokens=tin, untrimmed_input_tokens=untrim, output_tokens=tout, ref=[ref[0], [pin, pout]],
            usd_per_1000=usd, cap=CAP, cap_ratio=usd / CAP, usd_per_1000_if_untrimmed_priced=usd_untrim, basis_items=len(rows),
            latency=dict(n=len(lat), p50_mid=(lat[749] + lat[750]) / 2, max=lat[-1], over_10s=sum(1 for v in lat if v > 10.0)),
            hashes={str(p): h for p, h in PINS.items()}, input_order_asserted=True, visibility='public')
(B / 'ROWS.json').write_text(json.dumps(summ, indent=1, sort_keys=True) + '\n')
print(json.dumps(summ, indent=1))
