"""PRIVATE PREVIEW: topic and use-case aggregates for the five preview candidate rows, same method as
categories.py / categories_fastlane.py. Raw per-item outputs are read-only at the pin_records paths in each
run's RESULTS file; every one of the 24 split/type/tier cells per row must reproduce before aggregates are
written. Run after build_preview.py."""
import json, sys, hashlib, collections
from pathlib import Path
H = Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness'); sys.path.insert(0, str(H)); import score_v15 as S
R = Path(__file__).resolve().parents[2]; D = R / 'data/raw/benchmarks/jevbench/v1.5'; V = Path('/home/flori/jevbench-sealed/v1.5')
J = Path('/home/flori/jobs/jevbench-add-requests-20260919')
ROWS = [('r43', 'h2o-lightning-4b'), ('r46', 'decider-12b'), ('r46', 'decider-12b-v1'),
        ('r46', 'xor-26b-a4b-nvfp4'), ('r47', 'janus-4b')]
a = json.load(open(D / 'jevbench-v1.5.8-results.json')); cat = json.load(open(D / 'jevbench-v1.5.8-categories.json'))
prior = json.loads(json.dumps(cat['systems']))
labels = json.load(open(V / 'radars-20261001/labels-final.json')); gold = S.load_gold(V / 'frozen/all-1624.jsonl')
report = {}
skipped = {}
for run, k in ROWS:
    z = json.load(open(J / run / 'outputs' / f'RESULTS-{run}-A3-candidates-headlineA.json'))
    raw = Path(z['strict_completeness'][k]['raw_file'])
    if not raw.exists():
        skipped[k] = f'raw file missing: {raw}'; continue
    row = next(s for s in a['systems'] if s['key'] == k)
    assert hashlib.sha256(raw.read_bytes()).hexdigest() == row['provenance']['raw_sha256'], k
    by = {r['task_id']: r for r in (json.loads(l) for l in raw.open() if l.strip())}; assert len(by) == 1624, k
    scored = [(g, S.score_item(g, by.get(oid), False)) for oid, g in gold.items()]; comp = S.competence(scored, row['support'])
    assert sum(len(v['tiers']) for v in row['intelligence']['per_type_split'].values()) == 24
    for cell, v in row['intelligence']['per_type_split'].items():
        split, typ = cell.split('|'); mine = comp['per'][(split, typ)]
        for tier, x in v['tiers'].items(): assert abs(x - mine['tiers'][tier]) < 1e-6 and v['n'][tier] == mine['n'][tier], (k, cell, tier)
    out = {}
    for dim in ['topics', 'usecases']:
        groups = collections.defaultdict(list)
        for oid, g in gold.items():
            sc = S.score_item(g, by.get(oid), False)
            for c in ([labels[oid]['topic']] if dim == 'topics' else labels[oid]['usecases']): groups[c].append((g, sc))
        def cc(v):
            types = collections.defaultdict(list)
            for g, sc in v: types[g.type].append((g, sc))
            return sum(len(vv) * S.cc_cell(vv) for vv in types.values()) / len(v)
        out[dim] = {c: {'n': len(v), 'competence': round(cc(v), 2)} for c, v in groups.items()}
    cat['systems'][k] = out; report[k] = {'verified_per_type_cells': 24, 'raw_sha256': row['provenance']['raw_sha256']}
assert all(cat['systems'][k] == v for k, v in prior.items())
cat['source_results_sha256'] = hashlib.sha256((D / 'jevbench-v1.5.8-results.json').read_bytes()).hexdigest()
(D / 'jevbench-v1.5.8-categories.json').write_text(json.dumps(cat, indent=1) + '\n')
(Path(__file__).parent / 'CATEGORY-VERIFICATION.json').write_text(json.dumps({'verified': report, 'skipped': skipped}, indent=2) + '\n')
print(json.dumps({'verified': report, 'skipped': skipped}))
