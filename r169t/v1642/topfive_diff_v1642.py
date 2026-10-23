import json, pathlib, sys
J = pathlib.Path(__file__).parent; R = J / 'receipts'; load = lambda p: json.loads(pathlib.Path(p).read_text())
b = load(R / 'topfive-before.json'); a = load(R / 'topfive-after.json')
V = pathlib.Path(sys.argv[1]) / 'data/raw/benchmarks/jevbench/v1.6'
old = load(V / 'jevbench-v1.6.40-results.json'); new = load(V / 'jevbench-v1.6.42-results.json')
KEYS = sorted(load(J / 'batch/ROWS.json'))
assert not a['cohort_log'] and not b['cohort_log']
assert 'v1.6.42' in a['cohort_releases'] and 'v1.6.40' in b['cohort_releases'] and 'v1.6.42' not in b['cohort_releases']
assert a['merged_rows'] == b['merged_rows'] + len(KEYS), (a['merged_rows'], b['merged_rows'])   # restated rows replace base rows: no row added to the live boards
at = lambda lst, k: lst.index(k) + 1 if k in lst else None
rows = []
for view, groups in a['full_rankings'].items():
    for group, metrics in groups.items():
        for metric, arr in metrics.items():
            bef = b['full_rankings'][view][group][metric]
            x = [r['key'] for r in bef[:5]]; y = [r['key'] for r in arr[:5]]
            fx = [r['key'] for r in bef]; fy = [r['key'] for r in arr]
            rows.append(dict(view=view, metric=group + '/' + metric, before=x, after=y, changed=x != y, entrants=[k for k in y if k not in x],
                             dropped=[k for k in x if k not in y], causes=[k for k in KEYS if (k in x or k in y) and at(x, k) != at(y, k)],
                             positions_before={k: at(fx, k) for k in KEYS}, positions={k: at(fy, k) for k in KEYS}, field=len(arr)))
assert len(rows) == 36
for metric in ['A', 'B', 'C', 'capability']:
    x = old['board'][metric]['order'][:5]; y = new['board'][metric]['order'][:5]
    fx = old['board'][metric]['order']; fy = new['board'][metric]['order']
    rows.append(dict(view='release', metric=metric, before=x, after=y, changed=x != y, entrants=[k for k in y if k not in x], dropped=[k for k in x if k not in y],
                     causes=[k for k in KEYS if (k in x or k in y) and at(x, k) != at(y, k)], positions_before={k: at(fx, k) for k in KEYS},
                     positions={k: at(fy, k) for k in KEYS}, field=len(fy)))
changed = [r for r in rows if r['changed']]; causes = sorted({k for r in changed for k in r['causes']})
assert set(causes) <= set(KEYS)
assert all(r['causes'] for r in changed), 'a changed list without a restated row among its movers'
by_row = {k: [f"{r['view']}/{r['metric']}" for r in changed if k in r['causes']] for k in causes}
note = (f'Board effect: the paid fast-lane row was compared on the merged-board top fives before/after v1.6.42 over all 36 mixed, open-weights and API variants '
        f'(including 7x/10x cost caps with no latency cap) plus 4 release-board lists: {len(changed)} of 40 top-five lists change. ')
note += ('Top-five changes caused by: ' + ', '.join(causes) + ' (paid fast-lane publication exception). ' if changed else 'No top-five changes; the standing GO applies. ')
d = dict(any_top5_change=bool(changed), entrants_all=causes, by_row=by_row, rows=rows, note=note, merged_variants=36, release_lists=4, changed_lists=len(changed),
         changed_labels=[f"{r['view']}/{r['metric']}" for r in changed])
(R / 'topfive-diff.json').write_text(json.dumps(d, indent=2) + '\n')
L = ['# v1.6.42 top-five diff', '', note, '', '|Scope|Variant|Before|After|Moved by|Position before -> after of new rows (of N)|Changed|', '|---|---|---|---|---|---|---|']
for r in rows:
    L.append('|' + '|'.join([r['view'], r['metric'], ', '.join(r['before']), ', '.join(r['after']), ', '.join(r['causes']) or '-',
                             ' / '.join(f"{r['positions_before'][k]} -> {r['positions'][k]}" for k in KEYS) + f" of {r['field']}", str(r['changed'])]) + '|')
(R / 'TOPFIVE-V1642.md').write_text('\n'.join(L) + '\n'); print(note)
for r in changed: print(' CHANGED', r['view'], r['metric'], r['before'], '->', r['after'])
