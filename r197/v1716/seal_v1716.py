#!/usr/bin/env python3
"""Release-owner step after freeze_v1716.py: copy the reviewed v1.7.16 release files plus the dry-run addendum into the sealed
vault (frozen-release-v1.7.16 on the 27 Oct draw). Same layout as freeze_v1712.py --write. Never overwrites; refuses unless the
manifest is PASS and the addendum names exactly the manifest's file hashes."""
import argparse
import hashlib
import json
import pathlib
import shutil

SEAL = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027/frozen-release-v1.7.16')
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument('--addendum', required=True, type=pathlib.Path, help='dry-run addendum written by freeze_v1716.py')
A = ap.parse_args()
W = pathlib.Path(__file__).resolve().parents[2]
V = W / 'data/raw/benchmarks/jevbench/v1.7'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
man = json.loads((V / 'jevbench-v1.7.16-publication.json').read_text())
assert man['revision'] == 'v1.7.16' and man['review']['verdict'] == 'PASS', 'REFUSED: publication review PENDING or non-PASS'
for k, f in man['files'].items():
    assert sha(W / f['path']) == f['sha256'], f'{k}: manifest bytes differ'
add_path = A.addendum.resolve()
assert add_path.is_relative_to(W / 'r197/v1716/receipts'), 'addendum must be the freeze dry-run receipt'
add = json.loads(add_path.read_text())
assert add['release'] == 'v1.7.16'
assert add['files'] == {k: f['sha256'] for k, f in man['files'].items()}, 'addendum files differ from the manifest'
assert add['publication_sha256'] == sha(V / 'jevbench-v1.7.16-publication.json'), 'addendum is for other manifest bytes'
assert not SEAL.exists(), 'REFUSED: seal already exists'
SEAL.mkdir(mode=0o700)
for f in man['files'].values():
    shutil.copyfile(W / f['path'], SEAL / pathlib.Path(f['path']).name)
shutil.copyfile(V / 'jevbench-v1.7.16-publication.json', SEAL / 'jevbench-v1.7.16-publication.json')
shutil.copyfile(add_path, SEAL / 'addendum.json')
for p in SEAL.iterdir():
    p.chmod(0o600)
for f in man['files'].values():
    assert sha(SEAL / pathlib.Path(f['path']).name) == f['sha256']
print('sealed', SEAL, 'addendum.json', sha(SEAL / 'addendum.json'))
