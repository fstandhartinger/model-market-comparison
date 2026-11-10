#!/usr/bin/env python3
"""Fold the private scorer aggregates (three views + share/off cells) into r198/v188/src/{scored,cells}.json. Aggregates only."""
from pathlib import Path
import copy, hashlib, json
W = Path('/home/flori/wt/jevbench-v188-20261110'); J = W / 'r198/v188'; S = Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r265b-v188-build/score')
KEY = 'sd-jev-4b-v12.1.0-aligned-s42-step0256'; GMED = 2.573387642438244
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
L = lambda p: json.loads(Path(p).read_text())
def put(p, v): Path(p).write_text(json.dumps(v, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
usage = L(J / 'src/usage.json')[KEY]
scored = {'cost_basis_sha256': usage['cost_basis_sha256'], 'pins': {}}
for mode, out in [('frozen', 'out-frozen'), ('v17-off', 'out-v17-off'), ('v17-share', 'out-v17-share')]:
    p = S / out / 'jevbench-v1.6.0-results.json'; res = L(p)
    assert res['G_med'] == GMED and res['bootstrap']['B'] == 1000 and res['bootstrap']['bootstrap_seed'] == 16
    assert [x['key'] for x in res['systems']] == [KEY]
    s = copy.deepcopy(res['systems'][0])
    assert s['v16']['n_items']==1500, 'STOP scorer dropped failed rows'
    assert s['status'] == {'answered_ok': 1495, 'missing': 0, 'rows': 1500, 'status': 'complete'} and s['v16']['g_med_used'] == GMED
    assert s['cost']['kind'] == 'estimate' and s['cost']['usd_per_1000'] == usage['cost_common'] and s['cost']['common_basis']['n_items'] == 1489
    assert abs(s['cost']['common_basis']['usd_per_1000_all_items'] - usage['cost_all']) < 1e-12
    scored[mode] = s; scored['pins'][mode] = sha(p)
cells = {}
for mode in ['off', 'share']:
    c = L(S / f'cells/{mode}/categories.json'); d = L(S / f'cells/{mode}/decisive.json')
    assert c['source_results_sha256'] == scored['pins']['v17-' + mode]
    cells['cells_' + mode] = c['systems'][KEY]; cells['noul_' + mode] = d[KEY]
    cells['pool_' + mode] = {dim: {x['key']: x['n'] for x in c[dim]} for dim in ['families', 'usecases', 'languages']}
assert cells['pool_off'] == cells['pool_share']
put(J / 'src/scored.json', {KEY: scored}); put(J / 'src/cells.json', {KEY: cells})
for n in ('scored', 'cells'): (J / f'src/{n}.json').chmod(0o600)
print('PASS aggregates folded; pins', scored['pins'])
