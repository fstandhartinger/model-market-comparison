"""PRIVATE PREVIEW (not published): add the five scored-but-unpublished add-requests rows that reach the top 5
to the held v1.5.8 artifact, on a preview branch only. Sources: add-requests runs 43/46/47 headline-A RESULTS
files (frozen v1.5 1,624 protocol, G_med 5.186627500079243). No inference and no re-scoring: the delivered
system-level aggregates are projected verbatim; raw outputs are hash-checked against each file's pin_records and
strict_completeness, never copied. Existing rows keep every value except ranks. Writes TOP-FIVE.json via the real
jevClassRows classifier. Job: jevbench-next-release-review-20261004."""
import copy, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]; D = R / 'data/raw/benchmarks/jevbench/v1.5'; HERE = Path(__file__).parent
J = Path('/home/flori/jobs/jevbench-add-requests-20260919')
h = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
spec = importlib.util.spec_from_file_location('convert', '/home/flori/jobs/jevbench-v15-measure-20260925/site-preview/convert_v15.py')
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)

TARGET = D / 'jevbench-v1.5.8-results.json'
a = load(TARGET); assert a['revision'] == 'v1.5.8' and a['status'] == 'released'
before = copy.deepcopy(a)
by0 = {s['key']: s for s in before['systems']}
# Order rule check: score-descending (previous position as tie-break) must reproduce the current board orders.
for o in 'ABC':
    pos = {k: i for i, k in enumerate(before['board'][o]['order'])}
    repro = sorted(before['board'][o]['order'], key=lambda k: (-by0[k]['scores'][o], pos[k], k))
    assert repro == before['board'][o]['order'], f'board {o} not reproduced before edits'

# (results_file, row_key, run label, last_measured_on); all fields below are copied from the run's own files.
ROWS = [
    ('r43', 'h2o-lightning-4b', 43, '2026-10-03'),
    ('r46', 'decider-12b', 46, '2026-10-03'),
    ('r46', 'decider-12b-v1', 46, '2026-10-03'),
    ('r46', 'xor-26b-a4b-nvfp4', 46, '2026-10-04'),
    ('r47', 'janus-4b', 47, '2026-10-04'),
]
# Author names appear verbatim inside each run's display/licence/requester text (model-repo owners):
AUTHORS = {'h2o-lightning-4b': 'H2O.ai', 'decider-12b': 'Mapika', 'decider-12b-v1': 'Mapika',
           'xor-26b-a4b-nvfp4': 'Juspay', 'janus-4b': 'Icarus AI / cmxu'}
ADDENDUM_ID = 'A12'

existing = {s['key'] for s in a['systems'] + a['not_measured']}
new = []
for run, K, NN, measured_on in ROWS:
    zp = J / run / 'outputs' / f'RESULTS-{run}-A3-candidates-headlineA.json'
    z = load(zp); pin = z['pin_records'][K]; reg = z['registry_entries'][K]
    meta_path = Path(z['meta_sha256'][K]['path']); meta = load(meta_path)
    assert z['G_med_frozen'] == a['G_med'] == 5.186627500079243, K
    assert K not in existing, K + ' already present'
    assert h(pin['raw']) == pin['raw_sha256'] == z['strict_completeness'][K]['raw_sha256'], K + ': raw sha'
    assert z['strict_completeness'][K]['strictly_complete'] and z['strict_completeness'][K]['rows'] == 1624, K
    assert h(meta_path) == z['meta_sha256'][K]['sha256'], K + ': meta sha'
    s = copy.deepcopy(z['rows'][K]); s['addendum'] = ADDENDUM_ID
    metadata = {'author': AUTHORS[K], 'repo': f"https://huggingface.co/{meta['model_repo']}",
                'licence': meta.get('licence'), 'underlying': meta.get('base_model')}
    row = C.project_row(K, s, metadata)  # class/open fall back to 'unclassified'/'unknown': no such field in the source
    assert row['axes'] == s['axes'] and row['scores'] == s['scores'] and row['cost']['usd_per_1000'] == s['cost']['usd_per_1000'], K
    row['addendum'] = {'id': ADDENDUM_ID, 'release': 'v1.5',
                       'label': f"PREVIEW candidate (add-requests run {NN}), not published, pending Florian's GO"}
    row.update(ranked=True, listing='ranked', not_ranked_because=None, ranks={}, rank=None,
               last_measured_on=measured_on, model_pin=meta.get('revision'),
               endpoint_condition=meta.get('endpoint_condition'))
    row['cost'] = {'kind': row['cost']['kind'], 'usd_per_1000': row['cost']['usd_per_1000'], 'basis': reg.get('cost_basis')}
    row['provenance'] = {'raw_sha256': pin['raw_sha256'], 'result_sha256': h(zp), 'pins_sha256': z['pins_sha256'],
                         'meta_sha256': z['meta_sha256'][K]['sha256'], 'scorer_manifest_sha256': z['scorer_manifest']['sha256'],
                         'verified_harness_sha256': z['verified_harness_sha256'], 'revision': row['model_pin']}
    new.append(row); a['addendum_sources_sha256'][f'{ADDENDUM_ID}_preview_{K}'] = h(zp)
    existing.add(K)

a['systems'].extend(new); by = {s['key']: s for s in a['systems']}
for o in 'ABC':
    pos = {k: i for i, k in enumerate(a['board'][o]['order'])}
    order = sorted([s['key'] for s in a['systems'] if s['listing'] == 'ranked'], key=lambda k: (-by[k]['scores'][o], pos.get(k, 100000), k))
    for i, k in enumerate(order):
        by[k]['ranks'][o] = i + 1
        if o == 'A': by[k]['rank'] = i + 1
    adj = set(zip(order, order[1:])); a['board'][o]['order'] = order
    a['board'][o]['markers'] = [m for m in a['board'][o]['markers'] if (m['upper'], m['lower']) in adj]
a['n_ranked'] = sum(s['listing'] == 'ranked' for s in a['systems']); a['roster_count'] = len(a['systems']) + len(a['not_measured'])
a['revision_note'] = (before['revision_note'] + ' PRIVATE PREVIEW (not published, pending Florian\'s GO): five ranked candidate rows '
                      'from add-requests runs 43/46/47 on the same frozen protocol — h2o-lightning-4b, decider-12b, decider-12b-v1, '
                      'xor-26b-a4b-nvfp4 and janus-4b.')
a['paired_comparison_note'] = (before['paired_comparison_note'] + ' No new paired-bootstrap comparisons for the A12 preview candidates.')

joined = {r['key'] for r in new}
for prior in before['systems']:
    assert {k: v for k, v in prior.items() if k not in ['rank', 'ranks']} == \
           {k: v for k, v in by[prior['key']].items() if k not in ['rank', 'ranks']}, prior['key']

js = ("import {jevClassRows} from './lib/jevbench-jev-class.mjs'; import fs from 'node:fs'; const a=JSON.parse(fs.readFileSync(0,'utf8'));"
      " const c=jevClassRows(a.systems.filter(r=>r.ranked));"
      " console.log(JSON.stringify({order:c.rows.filter(r=>r.inClass).map(r=>r.row.key),"
      " scores:Object.fromEntries(c.rows.filter(r=>r.inClass).map(r=>[r.row.key,r.capability])), limits:c.limits}));")
cap = lambda x: json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], input=json.dumps(x).encode(), cwd=R))
bc, ac = cap(before), cap(a)
b5 = {o: before['board'][o]['order'][:5] for o in 'ABC'}; a5 = {o: a['board'][o]['order'][:5] for o in 'ABC'}
b5['Capability'] = bc['order'][:5]; a5['Capability'] = ac['order'][:5]
for o in b5:
    assert [k for k in a5[o] if k not in joined] == [k for k in b5[o] if k in a5[o]], o
top = {'before_v1.5.8': b5, 'after_preview': a5, 'changed': {o: b5[o] != a5[o] for o in b5},
       'capability_top7': [(k, round(ac['scores'][k], 2)) for k in ac['order'][:7]],
       'ranks': {k: dict(by[k]['ranks'], Capability=ac['order'].index(k) + 1 if k in ac['order'] else None) for k in sorted(joined)},
       'capability_limits': ac['limits'], 'n_ranked': a['n_ranked'],
       'rule': 'PRIVATE PREVIEW only — not published, pending Florian\'s GO (job jevbench-next-release-review-20261004).'}
# Independent expectation supplied by the lead (computed with jevClassRows); hard gate.
assert a['n_ranked'] == 123, a['n_ranked']
assert ac['order'][:7] == ['wity-1', 'quyet-1-0-large', 'decider-12b', 'h2o-lightning-4b',
                           'torchcast-decision-12b', 'xor-26b-a4b-nvfp4', 'jev-1.13.0'], ac['order'][:7]
assert a5['A'] == ['h2o-lightning-4b', 'decider-12b', 'torchcast-decision-12b', 'decider-12b-v1', 'wity-1'], a5['A']
assert [round(ac['scores'][k], 2) for k in ac['order'][:7]] == [84.51, 82.89, 81.79, 81.13, 80.88, 80.84, 80.01]
assert [round(by[k]['scores']['A'], 3) for k in a5['A']] == [76.499, 75.680, 75.092, 74.684, 73.749]
(HERE / 'TOP-FIVE.json').write_text(json.dumps(top, indent=2) + '\n')
TARGET.write_text(json.dumps(a, indent=2) + '\n')
print(json.dumps(top, indent=1))
