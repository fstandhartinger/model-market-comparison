#!/usr/bin/env python3
"""Build the public Part B cell supplement (language/use-case cells with L1 + L2) for the live boards (v1.7.12).

Reads (private, Sandy only): /home/flori/jevbench-sealed/v1.6-run/v1.6.0/cells-partB-1/categories-with-L1-L2.json
Reads (public):              data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json (the frozen S + P cells; unchanged)
Writes (public aggregates):  data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-cells-supplement.json

Cells only: headline scores live in the results file and are not touched. Only rows already on the public artifact and run
on at least one supplement are written (private or unranked rows are never added). lib/jevbench-categories.mjs overlays the
file on the frozen cells for the live boards; rows without an entry keep their S + P cells and show as coverage "S+P".
Usage: python3 scripts/jevbench-merge-partb-cells.py [src]
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json')
DST = os.path.join(ROOT, 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-cells-supplement.json')
SRC = '/home/flori/jevbench-sealed/v1.6-run/v1.6.0/cells-partB-1/categories-with-L1-L2.json'
DIMS = ['families', 'usecases', 'languages', 'topics']
ITEM_LEVEL = re.compile(r'^(item_id|item_ids|item_text|question|question_text|expected|gold|golds|prediction|predicted|per_item|item_results|prompt|task_id)$', re.I)


def check_aggregate_only(value, path='artifact'):
    if isinstance(value, list):
        for i, v in enumerate(value):
            check_aggregate_only(v, f'{path}[{i}]')
    elif isinstance(value, dict):
        for k, v in value.items():
            if ITEM_LEVEL.match(k):
                raise SystemExit(f'item-level field at {path}.{k}')
            check_aggregate_only(v, f'{path}.{k}')


def main(src=SRC):
    pub = json.load(open(BASE))
    new = json.load(open(src))
    assert new['labels_sha256'] == pub['labels_sha256'] and new['min_n'] == pub['min_n']
    rep = new['supplement_report']
    assert rep['supplements'] == ['L1', 'L2']
    systems = {}
    for key in sorted(pub['systems']):
        nrow = new['systems'].get(key)
        sup = (nrow or {}).get('supplements') or []
        if sup:
            systems[key] = {**{d: nrow[d] for d in DIMS}, 'coverage': '+'.join(['S', 'P', *sup])}
    n_pool = sum(l['n'] for l in new['languages'])
    out = {
        'benchmark': 'JevBench', 'revision': pub['revision'], 'kind': 'category-supplement', 'board_revision': 'v1.7.12',
        'base_sha256': hashlib.sha256(open(BASE, 'rb').read()).hexdigest(),
        'source_sha256': hashlib.sha256(open(src, 'rb').read()).hexdigest(),
        'pools': {'S': 1200, 'P': 300, 'L1': 354, 'L2': 33}, 'pool_items': n_pool, 'drawn': '2026-10-06',
        'note': 'Language and use-case cells add two sealed supplements (L1: 354 language items, L2: 33 use-case items, drawn 6 Oct 2026, '
                'reviewed) to the S 1,200 + P 300 pool, so every language and every use case has at least 30 items. Headline scores, ranks '
                'and the Composite are unchanged: they stay on S + P (or the equated API sets). Rows without an entry were not run on the '
                'supplements yet and keep their S + P cells.',
        'lane_note': ('Self-hosted cells and hosted-API cells pool S 1,200 + P 300 plus the sealed supplements L1 354 + L2 33 '
                      f'({n_pool:,} items) where a row answered them; raw and unequated. Cells under 15 items are omitted.'),
        'labelling': ('Family and language are authoring metadata of every item. Each of the 1,500 v1.6 items and each of the 387 supplement '
                      'items (L1 language supplement 354, L2 use-case supplement 33) was labelled with one subject topic (the v1.2 topic list, '
                      'unchanged) and one TypeSafe use-case category by Winnow-12B Q8 on our own GPU pod, with the same model, questions, '
                      'taxonomy and item-group rules (labelling rounds r13 and r14); where a uc1 item was written for a use case, that '
                      'authoring use case is used instead. Sealed items stayed on our own infrastructure. 75 public items (5 %) of the main '
                      'pool were checked by hand (topic agreement before rules 93 %). All non-English uc1 items are machine-authored and not '
                      'native-reviewed. Self-hosted systems and full-set hosted APIs answered S u P (1,500 items) plus the supplements where '
                      'their row is tagged so; API rows re-run on A4/A5 have no cells yet.'),
        'rules': ['Cells with fewer than 15 items are omitted; categories under 30 items are marked low-n.',
                  'Core v1.6 items carry no use case; the use-case view covers the use-case (uc1) items of S u P and the L2 supplement.'],
        **{d: new[d] for d in DIMS},
        'systems': systems,
    }
    check_aggregate_only(out)
    with open(DST, 'w') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    cov = {}
    for r in [*systems.values(), *({'coverage': 'S+P'} for k in pub['systems'] if k not in systems)]:
        cov[r['coverage']] = cov.get(r['coverage'], 0) + 1
    print(json.dumps({'pool_items': n_pool, 'systems': len(systems), 'coverage': cov}))


if __name__ == '__main__':
    main(*sys.argv[1:])
