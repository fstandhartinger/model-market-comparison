"""Check the candidate row's required disclosures and reject internal wording."""
import json, pathlib, re
from public_text_exception import check

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
data = json.loads((W / 'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.8-results.json').read_text())
rows = {r['key']: r for r in data['systems'] if r.get('new_in') == 'v1.8.8'}
assert set(rows) == {'sd-jev-4b-v12.1.0-aligned-s42-step0256'}
forbidden = re.compile(
    r'trycloudflare|5666e730|[\w.+-]+@[\w.-]+\.[a-z]{2,}|rank claim|worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|'
    r'\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r265-v188|Disposition is for|'
    r'code_revision|smoke-stop|0\.0645|x cap|cost cap USD|0\.15 s|\bPREREG\b|\{', re.I)

def walk(value):
    if isinstance(value, str):
        assert not forbidden.search(value), forbidden.search(value).group(0)
    elif isinstance(value, list):
        for item in value: walk(item)
    elif isinstance(value, dict):
        for item in value.values(): walk(item)

for row in rows.values():
    walk(row)
    adapter=json.loads((J/'inputs/PROVENANCE.json').read_text())['declared_adapter_sha256']
    assert adapter not in json.dumps(row), 'adapter hash must stay proof-only'
    all_text = json.dumps(row, ensure_ascii=False)
    required = ["author's own hosted endpoint",'one NVIDIA A10','231 public JevBench items','logs request bodies','16,384-token input limit','raised from 4,096','counted as wrong answers. Calibration is computed on the 1,495 answered items, as for every row with refused requests.','Exactly 5 of 1,500 items (about 76,000-80,000 tokens each) were refused; this count was registered before the run.','10 Nov 2026','09:07-09:29 UTC','Cloudflare tunnel','network included','p50 0.544 s','p95 1.242 s','maximum 10.544 s','min(old list-price estimate, GPU-time cost)','NOT verified (API-only)',"not the author's price",'no public tariff exists','Qwen/Qwen3.5-4B']
    for term in required: assert term in all_text, term
    assert row['paid_fast_lane'] is True and row['ranked'] is False
    assert row['model_pin'] is None and row['repo'] is None
    assert row['cost']['kind']=='estimate' and 'PENDING' not in row['cost']['basis']
    assert row['display']=='SD-JEV-4B-v12.1.0 (Kego, author-hosted API)' and row['author']=='Kego'
    assert '#' not in row['cost']['basis'] and 'deputy' not in all_text.lower()

allec = next(r for r in data['systems'] if r['key'] == 'allec-oavg')
exception = check({'allec-oavg': allec}, forbidden)
receipt = {
    'status': 'PASS', 'rows': sorted(rows), 'all_required_disclosures_visible_in_artifact': True,
    'forbidden_hits': 0, 'carried_allec_exact_span': exception,
}
(J / 'receipts/PUBLIC-TEXT.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print('PASS one hosted unranked row; author disclosure, refusal policy, latency, estimate cost and carried allec text')
