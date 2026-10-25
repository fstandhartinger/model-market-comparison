"""Exercise dry-run release helpers against isolated aggregates; never flips or seals."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

J = Path(__file__).resolve().parent
W = J.parents[1]
V = Path('data/raw/benchmarks/jevbench/v1.7')
checks = []
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
with tempfile.TemporaryDirectory(prefix='.helper-check-', dir=J) as temp:
    T = Path(temp)
    (T / V).mkdir(parents=True)
    (T / 'r181/v171/receipts').mkdir(parents=True)
    for p in (W / V).glob('jevbench-v1.7.[01]-*.json'):
        shutil.copyfile(p, T / V / p.name)
    shutil.copyfile(J / 'receipts/topfive-diff.json', T / 'r181/v171/receipts/topfive-diff.json')
    receipt = T / 'synthetic-dry-run-only.json'
    receipt.write_text(json.dumps({'verdict': 'PASS', 'engine': 'synthetic-helper-test-only'}))
    manifest = T / V / 'jevbench-v1.7.1-publication.json'
    initial = sha(manifest)
    def run(script, args, ok):
        r = subprocess.run(['python3', '-B', str(J / script), *map(str, args)], env={**os.environ, 'WT': str(T)}, text=True, capture_output=True)
        assert (r.returncode == 0) == ok, (script, r.stdout, r.stderr)
        assert sha(manifest) == initial, 'dry run changed manifest'
        return r
    run('flip_verdict_v171.py', [receipt, '--dry-run'], True)
    checks.append('PASS dry-run flip leaves manifest byte-identical')
    receipt.write_text(json.dumps({'verdict': 'PASS_WITH_CONDITIONS', 'engine': 'critic'}))
    run('flip_verdict_v171.py', [receipt, '--dry-run'], False)
    checks.append('conditional critic refused even in dry run')
    output = T / 'r181/v171/receipts/dry.json'
    run('freeze_v171.py', ['--wt', T, '--output', output], True)
    add = json.loads(output.read_text())
    proof = json.loads((T / V / 'jevbench-v1.7.1-proof.json').read_text())
    assert add['new_rows'] == proof['new_rows'] and add['publication_approval'] == proof['publication_approval']
    assert len(output.read_bytes()) > 3000
    checks.append('full freeze JSON parses and contains all new rows and approval, beyond old 3000-byte truncation')
    pred = T / V / 'jevbench-v1.7.0-publication.json'
    old = pred.read_bytes()
    p = json.loads(old); p['review']['verdict'] = 'PENDING'; pred.write_text(json.dumps(p))
    receipt.write_text(json.dumps({'verdict': 'PASS', 'engine': 'synthetic-helper-test-only'}))
    for script,args in [('flip_verdict_v171.py',[receipt,'--dry-run']),('freeze_v171.py',['--wt',T,'--output',output.with_name('invalid.json')])]:
        run(script,args,False)
    checks.append('both dry-run helpers reject a changed/non-PASS predecessor')
    pred.write_bytes(old)
    # A PASS predecessor with altered bytes must fail binding too.
    pred.write_bytes(old + b'\n')
    for script,args in [('flip_verdict_v171.py',[receipt,'--dry-run']),('freeze_v171.py',['--wt',T,'--output',output.with_name('unbound.json')])]:
        run(script,args,False)
    checks.append('both dry-run helpers reject an unbound PASS predecessor')
assert json.loads((W / V / 'jevbench-v1.7.1-publication.json').read_text())['review']['verdict'] == 'PENDING'
(J / 'receipts/fix-helper-checks.json').write_text(json.dumps({'status':'PASS','checks':checks},indent=1)+'\n')
print('\n'.join(checks))
