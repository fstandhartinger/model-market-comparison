#!/usr/bin/env python3
"""Build the v1.7.12 seal addendum; with --write also copy the release files into the sealed vault (never overwrites)."""
import argparse
import hashlib
import json
import os
import pathlib
import shutil

SEAL = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.7.12')
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument('--output', required=True, type=pathlib.Path, help='addendum JSON file (dry-run copy)')
ap.add_argument('--write', action='store_true')
A = ap.parse_args()
W = pathlib.Path(__file__).resolve().parents[2]
V = W / 'data/raw/benchmarks/jevbench/v1.7'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
man = json.loads((V / 'jevbench-v1.7.12-publication.json').read_text())
proof = json.loads((V / 'jevbench-v1.7.12-proof.json').read_text())
assert man['revision'] == proof['revision'] == 'v1.7.12'
for k, f in man['files'].items():
    assert sha(W / f['path']) == f['sha256'], f'{k}: manifest bytes differ'
pred_path = V / 'jevbench-v1.7.11-publication.json'
pred = json.loads(pred_path.read_text())
assert man['predecessor'] == proof['predecessor'] == {'revision': 'v1.7.11', 'publication_sha256': sha(pred_path)}
assert pred['revision'] == 'v1.7.11' and pred['review']['verdict'] == 'PASS'
assert man['review']['verdict'] == 'PASS', 'REFUSED: publication review PENDING or non-PASS'
a = proof['publication_approval']
assert a['top_five_effect'] == 'unchanged' and a['status'].startswith('GO (standing')
add = {'release': 'v1.7.12', 'method': proof['method'], 'predecessor': proof['predecessor'],
       'files': {k: f['sha256'] for k, f in man['files'].items()},
       'text_only_rows': proof['text_only_rows'], 'new_rows': proof['new_rows'], 'remeasured_rows': proof['remeasured_rows'],
       'repriced_rows': proof['repriced_rows'], 'link_fixed_rows': proof['link_fixed_rows'],
       'carried_rows': proof['carried_rows'], 'carried_rows_equal_except': proof['carried_rows_equal_except'],
       'release_owner_rulings': proof['release_owner_rulings'], 'topfive_diff_sha256': proof['topfive_diff_sha256'],
       'publication_approval': a, 'publication_review': man['review'], 'publication_sha256': sha(V / 'jevbench-v1.7.12-publication.json')}
out = A.output.resolve()
assert out.is_relative_to(W / 'r197/v1712/receipts') and not out.exists()
out.write_text(json.dumps(add, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
print('addendum', out, sha(out))
if A.write:
    assert not SEAL.exists(), 'REFUSED: seal already exists'
    SEAL.mkdir(mode=0o700)
    for f in man['files'].values():
        shutil.copyfile(W / f['path'], SEAL / pathlib.Path(f['path']).name)
    shutil.copyfile(V / 'jevbench-v1.7.12-publication.json', SEAL / 'jevbench-v1.7.12-publication.json')
    shutil.copyfile(out, SEAL / 'addendum.json')
    for p in SEAL.iterdir():
        p.chmod(0o600)
    for k, f in man['files'].items():
        assert sha(SEAL / pathlib.Path(f['path']).name) == f['sha256']
    print('sealed', SEAL, 'addendum.json', sha(SEAL / 'addendum.json'))
