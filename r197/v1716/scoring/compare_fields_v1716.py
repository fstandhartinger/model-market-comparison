"""v1.7.16: compare every carried d1027 row's three scorer views (new common-cost field vs the field that produced the published
values). Prints differing key paths only (numbers of aggregates; no item data). python3 -I compare_fields_v1716.py <fields-dir>"""
import json, pathlib, sys
L = lambda p: json.loads(pathlib.Path(p).read_text())
R = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r197'); FS = pathlib.Path(sys.argv[1])
OLD = {'f13': R / 'v1713/score/field', 'f14': R / 'v1714/score/field', 'fms': R / 'msft/score/field/A-tariff'}
def diff(a, b, p, out):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)): diff(a.get(k, '<absent>'), b.get(k, '<absent>'), f'{p}.{k}', out)
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)): diff(x, y, f'{p}[{i}]', out)
    elif a != b: out.append(p)
rep = {}
for f, od in OLD.items():
    for mode in ['frozen', 'v17-off', 'v17-share']:
        o = L(od / f'out-{mode}/jevbench-v1.6.0-results.json'); n = L(FS / f / f'out-{mode}/jevbench-v1.6.0-results.json')
        top = []; diff({k: v for k, v in o.items() if k != 'systems'}, {k: v for k, v in n.items() if k != 'systems'}, '$', top)
        rep[f'{f}/{mode}/_top'] = top
        os_ = {s['key']: s for s in o['systems']}; ns_ = {s['key']: s for s in n['systems']}; assert set(os_) == set(ns_)
        for k in os_:
            d = []; diff(os_[k], ns_[k], '', d); rep[f'{f}/{mode}/{k}'] = d
print(json.dumps(rep, indent=1))
