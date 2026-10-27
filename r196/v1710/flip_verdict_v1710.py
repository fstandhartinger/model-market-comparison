#!/usr/bin/env python3
"""Release-owner helper: bind an independent PASS receipt. Use --dry-run to inspect only."""
import argparse
import hashlib
import json
import os
import pathlib

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument('receipt', type=pathlib.Path)
ap.add_argument('--dry-run', action='store_true')
A = ap.parse_args()
W = pathlib.Path(os.environ.get('WT', str(pathlib.Path(__file__).resolve().parents[2])))
V = W / 'data/raw/benchmarks/jevbench/v1.7'
MAN = V / 'jevbench-v1.7.10-publication.json'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
rec = json.loads(A.receipt.read_text())
if rec.get('verdict') != 'PASS':
    ap.error(f"REFUSED: independent review verdict {rec.get('verdict')!r} is not PASS")
if not isinstance(rec.get('engine'), str) or not rec['engine'].strip() or rec['engine'].strip().lower().startswith(('synthetic', 'pending')):
    ap.error('REFUSED: a real independent review engine is required')
if rec['engine'].strip().lower().startswith(('fixture', 'dry-run')) and not A.dry_run:
    ap.error('REFUSED: fixture receipts are dry-run only')
m = json.loads(MAN.read_text())
assert m['revision'] == 'v1.7.10'
assert m['review'] == {'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None}
for k, f in m['files'].items():
    assert sha(W / f['path']) == f['sha256'], f'{k}: manifest bytes differ'
pred_path = V / 'jevbench-v1.7.9-publication.json'
pred = json.loads(pred_path.read_text())
assert m['predecessor'] == {'revision': 'v1.7.9', 'publication_sha256': sha(pred_path)}, 'predecessor binding'
assert pred['revision'] == 'v1.7.9' and pred['review']['verdict'] == 'PASS', 'predecessor must be PASS'
proof = json.loads((V / 'jevbench-v1.7.10-proof.json').read_text())
assert proof['predecessor'] == m['predecessor']
a = proof['publication_approval']
assert 'PLACEHOLDER' not in json.dumps(proof) and 'PLACEHOLDER' not in (V / 'jevbench-v1.7.10-results.json').read_text()
from approval_v1710 import check_approval
check_approval(W,proof)
m['review'] = {'engine': rec.get('engine') or 'synthetic-dry-run', 'verdict': 'PASS', 'receipt_sha256': sha(A.receipt)}
data = json.dumps(m, indent=1, sort_keys=True, ensure_ascii=False) + '\n'
if A.dry_run:
    print(json.dumps({'dry_run': True, 'manifest': str(MAN), 'would_set_review': m['review'],
                      'predecessor_pass_and_bound': True, 'manifest_sha256_after': hashlib.sha256(data.encode()).hexdigest(),
                      'manifest_unchanged_on_disk_sha256': sha(MAN)}, indent=1))
else:
    MAN.write_text(data)
    print(json.dumps({'manifest': str(MAN), 'review': m['review'], 'manifest_sha256': sha(MAN)}, indent=1))
