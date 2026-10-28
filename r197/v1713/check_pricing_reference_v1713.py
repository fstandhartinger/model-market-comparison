"""Check every new row's named market reference/rates, with mismatch negatives."""
import copy
import json
import pathlib
import re
from pricing_reference_v1713 import PIN, reference

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / 'data/raw/benchmarks/jevbench/v1.7'
load = lambda p: json.loads(p.read_text())
pattern = re.compile(r'([^\s]+) at USD ([0-9.]+)/([0-9.]+) per million input/output tokens')


def check(key, entry, row, proof_reference):
    expected = reference(key, entry)
    for text in (entry['cost_basis'], row['cost']['basis']):
        matches = pattern.findall(text)
        assert len(matches) == 1, f'{key}: expected one named market reference'
        listing, tin, tout = matches[0]
        assert (listing, float(tin), float(tout)) == (expected['listing'], expected['in'], expected['out']), f'{key}: named reference/rates mismatch'
    assert proof_reference == expected, f'{key}: proof reference/rates mismatch'
    return expected


entries = load(J / 'inputs/ENTRIES.json')
rows = {r['key']: r for r in load(V / 'jevbench-v1.7.13-results.json')['systems']}
proof = load(V / 'jevbench-v1.7.13-proof.json')
assert set(entries) == set(proof['new_rows'])
checked = {}
negative_cases = 0
for key, value in entries.items():
    entry = value['entry']
    row = rows[key]
    pr = proof['new_rows'][key]['price_reference']
    checked[key] = check(key, entry, row, pr)
    # Independently corrupt the named listing and each rate in public text,
    # then corrupt the proof listing. All must fail closed for every entrant.
    for old, new in [(checked[key]['listing'] + ' at USD', 'wrong-market-reference at USD'),
                     (' at USD ', ' at USD 9'),
                     ('/0.15 per million' if checked[key]['out'] == .15 else '/1.00 per million', '/9.99 per million')]:
        bad = copy.deepcopy(row)
        assert old in bad['cost']['basis']
        bad['cost']['basis'] = bad['cost']['basis'].replace(old, new)
        try:
            check(key, entry, bad, pr)
        except AssertionError:
            negative_cases += 1
        else:
            raise AssertionError(f'{key}: public pricing mismatch accepted')
    bad_pr = {**pr, 'listing': 'wrong-market-reference'}
    try:
        check(key, entry, row, bad_pr)
    except AssertionError:
        negative_cases += 1
    else:
        raise AssertionError(f'{key}: proof pricing mismatch accepted')
k0='h2o-lightning-4b-v1.4.1'
assert abs(rows[k0]['cost']['usd_per_1000'] - 1000 * (711020 * checked[k0]['in'] + 1500 * checked[k0]['out']) / 1e6 / 1500) < 1e-12
receipt = {'status': 'PASS', 'pricing_module_sha256': PIN, 'new_rows': checked,
           'negative_cases_refused': negative_cases, 'processed_input_cost_usd_per_1000': rows[k0]['cost']['usd_per_1000'], 'priced_input_tokens': 711020, 'output_tokens': 1500, 'basis_items': 1500}
(J / 'receipts/PRICING-REFERENCES.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print(f'PASS all {len(checked)} new row references/rates match pricing.reference(); {negative_cases} mismatches refused; processed-input cost recomputed')
