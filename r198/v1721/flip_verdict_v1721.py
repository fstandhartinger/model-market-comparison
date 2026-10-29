#!/usr/bin/env python3
"""Release-owner helper: bind an independent PASS receipt to v1.7.21. Use --dry-run to inspect only.
Refuses unless v1.7.20 is PASS, v1.7.21 is bound to its current manifest bytes and the standing-GO approval (no top-five change) holds."""
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
MAN = V / 'jevbench-v1.7.21-publication.json'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
rec = json.loads(A.receipt.read_text())
if rec.get('verdict') != 'PASS':
    ap.error(f"REFUSED: independent review verdict {rec.get('verdict')!r} is not PASS")
if not isinstance(rec.get('engine'), str) or not rec['engine'].strip() or rec['engine'].strip().lower().startswith(('synthetic', 'pending')):
    ap.error('REFUSED: a real independent review engine is required')
if rec['engine'].strip().lower().startswith(('fixture', 'dry-run')) and not A.dry_run:
    ap.error('REFUSED: fixture receipts are dry-run only')
m = json.loads(MAN.read_text())
assert m['revision'] == 'v1.7.21'
assert m['review'] == {'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None}
for k, f in m['files'].items():
    assert sha(W / f['path']) == f['sha256'], f'{k}: manifest bytes differ'
pred_path = V / 'jevbench-v1.7.20-publication.json'
pred = json.loads(pred_path.read_text())
if pred['revision'] != 'v1.7.20' or (pred['review']['verdict'] != 'PASS' and not A.dry_run):
    ap.error('REFUSED: predecessor v1.7.20 must be PASS first ')
if m['predecessor'] != {'revision': 'v1.7.20', 'publication_sha256': sha(pred_path)}:
    ap.error('REFUSED: v1.7.21 is bound to an older v1.7.20 manifest; rebuild v1.7.21 first')
proof = json.loads((V / 'jevbench-v1.7.21-proof.json').read_text())
assert proof['predecessor'] == m['predecessor']
assert 'PLACEHOLDER' not in json.dumps(proof) and 'PLACEHOLDER' not in (V / 'jevbench-v1.7.21-results.json').read_text()
from approval_v1721 import check_approval
check_approval(W, proof)
m['review'] = {'engine': rec.get('engine') or 'synthetic-dry-run', 'verdict': 'PASS', 'receipt_sha256': sha(A.receipt)}
data = json.dumps(m, indent=1, sort_keys=True, ensure_ascii=False) + '\n'
if A.dry_run:
    print(json.dumps({'dry_run': True, 'manifest': str(MAN), 'would_set_review': m['review'],
                      'predecessor_pass_and_bound': pred['review']['verdict']=='PASS', 'manifest_sha256_after': hashlib.sha256(data.encode()).hexdigest(),
                      'manifest_unchanged_on_disk_sha256': sha(MAN)}, indent=1))
else:
    MAN.write_text(data)
    import subprocess, sys
    subprocess.run([sys.executable, '-B', str(pathlib.Path(__file__).resolve().parent / 'wire_v1721.py'), '--set-release-date'] + ([os.environ['V1721_RELEASE_DATE']] if os.environ.get('V1721_RELEASE_DATE') else []), check=True, env={**os.environ, 'WT': str(W)})
    print(json.dumps({'manifest': str(MAN), 'review': m['review'], 'manifest_sha256': sha(MAN)}, indent=1))
