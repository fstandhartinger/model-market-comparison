#!/usr/bin/env python3
"""Inspect the complete v1.7.18 seal addendum; never writes a seal, even with --write."""
import argparse
import hashlib
import json
import pathlib

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument('--wt', required=True, type=pathlib.Path)
ap.add_argument('--output', required=True, type=pathlib.Path, help='Full dry-run addendum JSON file (outside the seal vault)')
ap.add_argument('--write', action='store_true')
A = ap.parse_args()
W = A.wt.resolve()
V = W / 'data/raw/benchmarks/jevbench/v1.7'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
man = json.loads((V / 'jevbench-v1.7.18-publication.json').read_text())
proof = json.loads((V / 'jevbench-v1.7.18-proof.json').read_text())
assert man['revision'] == proof['revision'] == 'v1.7.18'
for k, f in man['files'].items():
    assert sha(W / f['path']) == f['sha256'], f'{k}: manifest bytes differ'
pred_path = V / 'jevbench-v1.7.17-publication.json'
pred = json.loads(pred_path.read_text())
assert man['predecessor'] == proof['predecessor'] == {'revision': 'v1.7.17', 'publication_sha256': sha(pred_path)}, 'v1.7.18 not bound to the current v1.7.17 manifest'
assert man['review']['verdict']=='PASS', 'REFUSED: publication review PENDING or non-PASS'
assert pred['revision'] == 'v1.7.17' and pred['review']['verdict'] == 'PASS', 'predecessor must be PASS'
a = proof['publication_approval']
from approval_v1718 import check_approval
check_approval(W,proof)
assert man['review']['verdict']=='PASS', 'REFUSED: publication review PENDING or non-PASS'
if A.write:
    ap.error('REFUSED: this helper never writes a seal; release owner must review the dry-run addendum')
# Keep every same-draw provenance row; v1.7.18 has per-row raw pins, not v1.7.17 raw_sha256.
add = {'release': 'v1.7.18', 'method': proof['method'], 'predecessor': proof['predecessor'],
       'files': {k: f['sha256'] for k, f in man['files'].items()}, 'scorers': proof['scorers'],
       'pricing_module_sha256': proof['pricing_module_sha256'], 'new_rows': proof['new_rows'], 'remeasured_rows': proof['remeasured_rows'], 'repriced_rows': proof['repriced_rows'], 'link_fixed_rows': proof['link_fixed_rows'],
       'carried_rows': proof['carried_rows'], 'carried_rows_equal_except': proof['carried_rows_equal_except'], 'text_fixed_rows': proof['text_fixed_rows'], 'exceptions': proof['exceptions'], 'cost_basis': proof['cost_basis'],
       'publication_approval': a, 'publication_review': man['review'], 'publication_sha256': sha(V / 'jevbench-v1.7.18-publication.json')}
output = A.output.resolve()
assert output.is_relative_to(W / 'r198/v1718/receipts'), 'dry-run output must stay in this job receipts directory'
assert not output.exists(), 'refuse to overwrite an existing receipt'
output.write_text(json.dumps(add, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
print(f'DRY RUN: full addendum JSON at {output}; no seal written; review {man["review"]["verdict"]}')
