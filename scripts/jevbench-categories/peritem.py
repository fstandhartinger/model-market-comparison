"""Per-item scored outcomes for every v1.5.4 system, verified cell-by-cell against the published artifact.
Writes /home/flori/jevbench-sealed/v1.5/radars-20261001/peritem.json (stays on Sandy). Prints only aggregates."""
import json, sys, glob, os
from pathlib import Path
H = Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness'); sys.path.insert(0, str(H))
os.chdir(H)
import score_v15 as S
import score_all_v15 as A
V = Path('/home/flori/jevbench-sealed/v1.5')
GOLD = S.load_gold(V / 'frozen/all-1624.jsonl'); A.GOLD = GOLD; A.N = len(GOLD)
ART = json.load(open('/home/flori/wt/bench-radars-usecases-20261001/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json'))
EXTRA = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}   # key -> raw jsonl path (addenda)

def rows_for(key):
    if key in EXTRA:
        rows = [json.loads(l) for l in open(EXTRA[key]) if l.strip()]
        return rows, EXTRA[key]
    if key in A.REG:
        try:
            r = A.load_rows(key)
        except SystemExit as e:
            return None, f'ambiguous: {e}'
        return r, 'registry'
    return None, 'no source'

def verify(key, scored, support, pub):
    comp = S.competence(scored, support)
    bad = 0
    for cell, v in pub['intelligence']['per_type_split'].items():
        split, typ = cell.split('|')
        mine = comp['per'][(split, typ)]
        for t, x in v['tiers'].items():
            y = mine['tiers'][t]
            if (x is None) != (y is None) or (x is not None and abs(x - y) > 1e-6): bad += 1
            if v['n'][t] != mine['n'][t]: bad += 1
    return bad

out, report = {}, {}
for s in ART['systems']:
    k = s['key']
    if not s.get('intelligence') or not s['intelligence'].get('per_type_split'):
        report[k] = 'no published cells'; continue
    rows, src = rows_for(k)
    if rows is None:
        report[k] = src; continue
    by = {}
    for r in rows:
        by[r.get('task_id') or r.get('id')] = r
    support = s['support']
    scored, items = [], {}
    for oid, g in GOLD.items():
        if support.get(g.type, 'unsupported') == 'unsupported': continue
        sc = S.score_item(g, by.get(oid), label_only=support[g.type] == 'label')
        scored.append((g, sc))
        items[oid] = {'c': (1 if sc['correct'] else 0) if g.type != 'score' else None,
                      'err': sc.get('err'), 'ec': sc.get('err_chance'), 'v': sc['valid']}
    bad = verify(k, scored, support, s)
    report[k] = f'{"OK" if bad == 0 else "MISMATCH %d" % bad} ({src if src=="registry" else "extra"})'
    if bad == 0: out[k] = {'support': support, 'items': items}
Path(V / 'radars-20261001/peritem.json').write_text(json.dumps(out))
ok = sum(1 for v in report.values() if v.startswith('OK'))
print('verified', ok, 'of', len(ART['systems']))
for k, v in report.items():
    if not v.startswith('OK'): print(' ', k, '->', v)
