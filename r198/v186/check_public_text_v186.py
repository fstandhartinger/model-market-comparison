"""Check the candidate row's required disclosures and reject internal wording."""
import json, pathlib, re
from public_text_exception import check

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
data = json.loads((W / 'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.6-results.json').read_text())
rows = {r['key']: r for r in data['systems'] if r.get('new_in') == 'v1.8.6'}
assert set(rows) == {'metadecision-31b-rain'}
forbidden = re.compile(
    r'worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|'
    r'\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r226-v186|Disposition is for|'
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
        'MeTask-Rain/MetaDecision-31B-Rain@068cb1420d40b06e48895f2fc75f29e6da37748b',
        'MeTask-Rain/metask-jev-rain-31B-trained@2feff076f07711fe2fefe7a6fdcedfe4132b773e',
        'only service/ changed', 'per-type temperatures', '840-token drafting-prompt limit',
        '231 public', 'in-sample', '1/50 argmax flip', '9-second', '2,422 seconds',
        '753,547 input', '72,602 output', '597,680 processed tokens', '964,173 untrimmed',
        '5 trimmed items', '6,653 tokens', '60% of the head', '40% of the tail',
        'RTX PRO 6000 Blackwell', 'FIN-03', 'network access cut',
        'vllm/vllm-openai@sha256:a4a4c0437bf7240089da5f08aa370c4aee17ae5290f7a3b468825ee26c4c3a6b',
        'google/gemma-4-31b-it via frozen pricing_v15 reference at USD 0.09/M input and USD 0.34/M output',
        'Applied min(old list-price estimate, GPU-time cost)',
        'W4A16 4-bit QAT checkpoint',
        'unmerged rank-16 LoRA adapter',
        'capped at 49% of all decisions',
        '101st decision',
        'USD 0.0646 per 1,000 decisions',
        'depend on the order of decisions',
    ]
    for term in required:
        assert term in all_text, term
    assert row['paid_fast_lane'] is True and row['ranked'] is False
    assert row['model_pin'] == 'MeTask-Rain/MetaDecision-31B-Rain@068cb1420d40b06e48895f2fc75f29e6da37748b'
    assert row['repo'] == 'https://huggingface.co/MeTask-Rain/MetaDecision-31B-Rain'
    assert row['cost']['kind'] == 'estimate' and 'PENDING' not in row['cost']['basis']
    assert 'zero argmax flips' not in all_text and '0 argmax flips' not in all_text

allec = next(r for r in data['systems'] if r['key'] == 'allec-oavg')
exception = check({'allec-oavg': allec}, forbidden)
receipt = {
    'status': 'PASS', 'rows': sorted(rows), 'all_required_disclosures_visible_in_artifact': True,
    'forbidden_hits': 0, 'carried_allec_exact_span': exception,
}
(J / 'receipts/PUBLIC-TEXT.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print('PASS one paid unranked row; hashes, same-weights note, public tuning, determinism, host, token trimming, GPU cost and carried allec text')
