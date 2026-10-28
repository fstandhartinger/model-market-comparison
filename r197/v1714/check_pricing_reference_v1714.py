"""Check every new row's named market reference/rates, with mismatch negatives."""
import copy
import json
import pathlib
import re
from pricing_reference_v1714 import PIN, reference

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
rows = {r['key']: r for r in load(V / 'jevbench-v1.7.14-results.json')['systems']}
proof = load(V / 'jevbench-v1.7.14-proof.json')
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
                     ('/%.2f per million' % checked[key]['out'], '/9.99 per million')]:
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
inputs = load(J / 'src/inputs.json')
costs = {}
for k in entries:
    c = rows[k]['cost']['usd_per_1000']; v = inputs[k]
    assert abs(c - 1000 * (v['priced_input_tokens'] * checked[k]['in'] + v['output_tokens'] * checked[k]['out']) / 1e6 / 1500) < 1e-12, k
    costs[k] = {'usd_per_1000': c, 'priced_input_tokens': v['priced_input_tokens'], 'output_tokens': v['output_tokens'], 'basis_items': 1500}
assert costs['decisio-gemma-4-12b-tuned-commit-think']['priced_input_tokens'] == 844031 and costs['torchcast-decision-31b-v1.0']['priced_input_tokens'] == 645268
assert abs(costs['torchcast-decision-31b-v1.0']['usd_per_1000'] - 0.03871608) < 1e-12
# The explicit Gemma-4-12B reference is refused for a listed base, and a listed base never falls back to it.
from pricing_reference_v1714 import EXPLICIT, pricing
assert all(b in pricing.UNLISTED_BASE_MODELS for b in EXPLICIT)
try:
    reference('x', {'base_model': 'google/gemma-4-E2B-it'})
except AssertionError:
    negative_cases += 1
else:
    raise AssertionError('unlisted base without an explicit reference accepted')
receipt = {'status': 'PASS', 'pricing_module_sha256': PIN, 'new_rows': checked, 'costs': costs, 'negative_cases_refused': negative_cases}
(J / 'receipts/PRICING-REFERENCES.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print(f'PASS all {len(checked)} new row references/rates match pricing.reference() (explicit gemma-3-12b-it pair for the unlisted 12B base); {negative_cases} mismatches refused; priced-input costs recomputed')
