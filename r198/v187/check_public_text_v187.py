"""Check the candidate row's required disclosures and reject internal wording."""
import json, pathlib, re
from public_text_exception import check

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
data = json.loads((W / 'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.7-results.json').read_text())
rows = {r['key']: r for r in data['systems'] if r.get('new_in') == 'v1.8.7'}
assert set(rows) == {'nvidia/nemotron-3.5-super-vl'}
forbidden = re.compile(
    r'worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|'
    r'\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r251-v187|Disposition is for|'
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
    all_text = json.dumps(row, ensure_ascii=False)
    required = [
        'REASONING DISABLED', 'reasoning.enabled=false', 'a reasoning-on configuration could score differently',
        'as required by the holder of the sealed items',
        'provider Crusoe', 'bf16', 'fallbacks off', 'Every one of the 1,500 responses', 'exact model id nvidia/nemotron-3.5-super-vl',
        'Strict json_schema', 'temperature 0', 'max_tokens 4096',
        'You are a calibration engine. You never answer in prose. You output only a JSON object with the key \'probabilities\' mapping every given option to a probability, all options included, values in [0,1], summing to 1.',
        'from our server in Germany over OpenRouter', 'network round trip included', 'maximum 31.2 s',
        '56 upstream rate-limit responses (HTTP 429) were re-sent and are not counted as answers',
        '1,015,566 input and 62,716 output tokens',
        'USD 0.10 per million input tokens', 'USD 0.40 per million output tokens', 'published OpenRouter tariff',
        'fetched 2026-11-03T05:45:33Z', 'frozen pricing module sha256 2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b',
        'launch list price', 'no GPU-time estimate applies', 'same-items rule', 'not a bill',
        'https://openrouter.ai/nvidia/nemotron-3.5-super-vl',
    ]
    for term in required:
        assert term in all_text, term
    assert row['paid_fast_lane'] is False and row['ranked'] is False
    assert row['model_pin'] == 'https://openrouter.ai/nvidia/nemotron-3.5-super-vl' == row['repo']
    assert row['cost']['kind'] == 'tariff' and 'PENDING' not in row['cost']['basis'] and 'GPU-time estimate from' not in row['cost']['basis']
    assert row['display'] == 'NVIDIA Nemotron 3.5 Super VL' and row['author'] == 'NVIDIA'
    assert '#' not in row['cost']['basis'] and 'deputy' not in all_text.lower()

allec = next(r for r in data['systems'] if r['key'] == 'allec-oavg')
exception = check({'allec-oavg': allec}, forbidden)
receipt = {
    'status': 'PASS', 'rows': sorted(rows), 'all_required_disclosures_visible_in_artifact': True,
    'forbidden_hits': 0, 'carried_allec_exact_span': exception,
}
(J / 'receipts/PUBLIC-TEXT.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print('PASS one hosted unranked row; reasoning-off, Crusoe pinning, prompt, latency, 429, tariff cost and carried allec text')
