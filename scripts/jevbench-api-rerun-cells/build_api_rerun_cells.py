#!/usr/bin/env python3
"""Per-category + per-type/tier aggregates for the live-board overlay rows of data/jevbench-api-a4-equated.json
(A4 u P re-runs, A5 u P re-runs, full-set API rows such as Liquid d1) — the rows the v1.6.1 category artifact lacks.

Same scorer and method as every published cell: score_v16 build_systems/group_stats (chance-corrected competence per
request type, mean over types present), MIN_N 15 per cell, topic/use-case labels from the Winnow r13 recipe
(ruled r13 for S u P, r14 for L1/L2, r15 for A4/A5; uc1 authoring use case wins), families and
languages from authoring metadata. Values are RAW (never equated), like every category value. Runs on Sandy; only
aggregates are written.

    build_api_rerun_cells.py EQUATED_JSON CATEGORIES_SUPPLEMENT_JSON OUT_JSON [--pool NAME=DIR ...] [--label-file PATH ...]
"""
import argparse, collections, hashlib, json, os, sys
from pathlib import Path
from answered_coverage import CoverageRegistry
COVERAGE = CoverageRegistry()

H = Path('/home/flori/jobs/jevbench-v16-run-20261001/harness')
SEALED = Path('/home/flori/jevbench-sealed/v1.6-run')
R = SEALED / 'v1.6.0'
LABELS = [SEALED / 'topic-categories-v1/labels-r13-ruled.jsonl', SEALED / 'topic-categories-v1/labels-r14-ruled.jsonl', SEALED / 'topic-categories-v1/labels-r15-ruled.jsonl']
os.environ['JEV_NOUL_METHOD'] = 'O1S'  # every published v1.6.1 round is scored with O1S
sys.path.insert(0, str(H))
import score_v16 as V  # noqa: E402

MIN_N = 15
UC_LONG = {"ecommerce": "ecommerce_marketplaces", "moderation": "moderation_trust_safety"}
SUBSET_DIR = {'A4': SEALED / 'v1.6.0-A4', 'A5': SEALED / 'v1.6.0-A5'}


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def load_labels(paths):
    lab = collections.defaultdict(dict)
    used = {}
    for p in paths:
        if not p.exists():
            raise FileNotFoundError(f'label file missing: {p}')
        used[p.name] = sha(p)
        for line in p.open():
            r = json.loads(line)
            oid, q = r['id'].split('::')
            choice = UC_LONG.get(r['choice'], r['choice']) if q == 'usecase' else r['choice']
            assert oid not in lab[q] or lab[q][oid] == choice, 'conflicting labels for opaque id'
            lab[q][oid] = choice
    return lab, used


def load_pool(rd):
    gold = V.load_gold(rd / 'frozen/gold.jsonl')
    idmap = json.loads((rd / 'frozen/id-map.json').read_text())
    assert set(gold) == set(idmap), 'frozen map/gold membership mismatch'
    assert len({g.item_id for g in gold.values()}) == len(gold), 'duplicate stable identities'
    for oid, g in gold.items():
        assert g.item_id and idmap[oid]['item_id'] == g.item_id and idmap[oid]['split'] == g.split, 'frozen identity mismatch'
    return gold


def stable_labels(pools, lab):
    out = {}
    for gold in pools:
        for oid, g in gold.items():
            if oid not in lab['topic'] or oid not in lab['usecase']:
                continue
            # Same ruled-label recipe: authoring use case takes precedence.
            uc = UC_LONG.get(g.usecase, g.usecase) if g.usecase else lab['usecase'][oid]
            labels = (lab['topic'][oid], uc)
            assert g.item_id not in out or out[g.item_id] == labels, 'conflicting stable labels'
            out[g.item_id] = labels
    return out


def answered(gold, key, meta, run):
    rows = V.read_rows(run)
    ids = [r.get('task_id') or r.get('id') for r in rows]
    assert len(ids) == len(set(ids)) and set(ids) <= set(gold), f'{key}: duplicate or unjoined ids'
    m = {**meta, 'api_subset': 'S'}
    systems, _ = V.build_systems(gold, {key: m}, {key: rows})
    seen = set(ids)
    items = [(g, x) for g, x in systems[key].scored if g.oid in seen]
    COVERAGE.bind(items, rows)
    return items


def category_union(key, meta, basis, base_items, pools, labels):
    union = {g.item_id: (g, x) for g, x in base_items}
    tags = [basis, 'P']
    receipts = []
    for name, rd, gold in pools:
        run = rd / 'runs/api' / f'{key}.jsonl'
        if not run.exists():
            continue
        receipt = Path(str(run) + '.exposure.json')
        assert receipt.is_file(), f'{key}/{name}: missing exposure receipt'
        json.loads(receipt.read_text())
        if len({r.get('task_id') or r.get('id') for r in V.read_rows(run)}) < 0.98 * len(gold):
            continue  # CR-334: a supplement run below 98 % of its frozen input (in progress or aborted) is not used
        run_hash = sha(run)
        extra = answered(gold, key, meta, run)
        assert sha(run) == run_hash, f'{key}/{name}: run changed during scoring; rebuild snapshot'
        if any(g.split == 'sealed' for g, _ in extra):
            tags.append(name)
        for g, x in extra:
            union.setdefault(g.item_id, (g, x))  # original P wins; each stable item once
        receipts.append({'pool': name, 'run_sha256': run_hash, 'receipt_sha256': sha(receipt)})
    missing = sum(g.item_id not in labels for g, _ in union.values())
    assert not missing, f'{key}: {missing} category items without labels'
    return list(union.values()), '+'.join(tags), receipts


def cells(scored, keyfn, known, coverage=False):
    groups = collections.defaultdict(list)
    for g, x in scored:
        k = keyfn(g)
        if k is not None:
            groups[k].append((g, x))
    out = {}
    for k, items in sorted(groups.items()):
        st = V.group_stats(items)
        if st['score'] is not None and st['n'] >= MIN_N and k in known:
            out[k] = {'n': int(st['n']), 'competence': round(float(st['score']), 2)}
    return COVERAGE.enrich(out, scored, keyfn) if coverage else out


def r2(x): return None if x is None else round(float(x), 4)


def main():
    parser = argparse.ArgumentParser()
    for name in ('equated', 'supplement', 'output'):
        parser.add_argument(name, type=Path)
    parser.add_argument('--label-file', action='append', type=Path, default=[])
    parser.add_argument('--pool', action='append', default=[], help='NAME=release-dir; defaults L1/L2')
    args = parser.parse_args()
    eq_p, supp_p, out_p = args.equated, args.supplement, args.output
    eq = json.loads(eq_p.read_text())
    supp = json.loads(supp_p.read_text())
    known = {d: {c['key']: c['n'] for c in supp[d]} for d in ('families', 'usecases', 'languages', 'topics')}
    lab, labels_used = load_labels([*LABELS, *args.label_file])
    base_gold = load_pool(R)
    spec = args.pool or [f'L1={SEALED / "v1.6.0-L1"}', f'L2={SEALED / "v1.6.0-L2"}']
    pools = []
    for entry in spec:
        name, path = entry.split('=', 1)
        assert name in ('L1', 'L2', 'L3', 'C1') and name not in [p[0] for p in pools], 'invalid/duplicate pool'
        rd = Path(path)
        pools.append((name, rd, load_pool(rd)))
    labels = stable_labels([base_gold, *[load_pool(p) for p in SUBSET_DIR.values()], *[p[2] for p in pools]], lab)

    jobs = []  # (key, subset, round_dir)
    a4_round = R / eq['round']
    for r in eq['rows']:
        jobs.append((r, 'A4', a4_round))
    a5_round = R / eq['a5']['round']
    for r in eq.get('a5_rows', []):
        jobs.append((r, 'A5', a5_round))

    systems, checks = {}, []
    for row, subset, rd in jobs:
        key = row['key']
        reg = json.loads((rd / f"REGISTRY-{rd.name.removeprefix('score-')}.json").read_text())
        meta = reg[key]
        assert meta.get('api_subset') == 'A2', f'{key}: not an A-slot row in {rd.name}'
        run = rd / 'runs-a2' / meta.get('a2_file', f'{key}.jsonl')
        run_sha = sha(os.path.realpath(run))
        assert run_sha == row['run_sha256'], f'{key}: run sha {run_sha} != published {row["run_sha256"]}'
        per = json.loads((rd / 'out-O1S' / f'{key}.json').read_text())
        intel = per['intelligence']
        for f in ('I_open', 'I_sealed'):
            assert round(intel[f], 2) == round(row[f], 2), f'{key}: {f} {intel[f]} != published {row[f]}'
        gold = load_pool(SUBSET_DIR[subset])
        sysm, status = V.build_systems(gold, {key: meta}, {key: V.read_rows(run)})
        s = sysm[key]
        assert len(s.scored) == row['n_rows'] == 600, f'{key}: scored {len(s.scored)}'
        # the item-level rescore must reproduce the scorer's own breakdowns exactly
        fam = cells(s.scored, lambda g: g.family, known['families'])
        lang = cells(s.scored, lambda g: g.lang, known['languages'])
        ref_fam = {k: {'n': int(c['n']), 'competence': round(float(c['score']), 2)} for k, c in per['v16']['breakdowns']['family'].items()
                   if c.get('score') is not None and int(c['n']) >= MIN_N and k in known['families']}
        ref_lang = {k: {'n': int(c['n']), 'competence': round(float(c['score']), 2)} for k, c in per['v16']['breakdowns']['lang'].items()
                    if c.get('score') is not None and int(c['n']) >= MIN_N and k in known['languages']}
        if fam != ref_fam or lang != ref_lang:
            print('DIFF', key, [(k, fam.get(k), ref_fam.get(k)) for k in set(fam) | set(ref_fam) if fam.get(k) != ref_fam.get(k)][:4], [(k, lang.get(k), ref_lang.get(k)) for k in set(lang) | set(ref_lang) if lang.get(k) != ref_lang.get(k)][:4]); raise SystemExit(1)
        items, tag, receipts = category_union(key, meta, subset, answered(gold, key, meta, run), pools, labels)
        cell = {'coverage': f'{subset}+P', 'n_items': len(s.scored), 'answered_ok': row.get('answered_ok'),
                'category_pools': tag, 'category_n_items': len(items),
                'per_type_split': {k: {'cc': r2(v['cc']), 'n': v['n'], 'tiers': {t: r2(c) for t, c in v['tiers'].items()}}
                                   for k, v in intel['per_type_split'].items()},
                'families': cells(items, lambda g: g.family, known['families'], coverage=True),
                'topics': cells(items, lambda g: labels[g.item_id][0], known['topics'], coverage=True),
                'usecases': cells(items, lambda g: labels[g.item_id][1], known['usecases'], coverage=True)}
        systems[key] = cell
        checks.append({'key': key, 'round': rd.name, 'run_sha256': run_sha, 'I_open_I_sealed': 'match', 'breakdowns_rescore': 'match', 'category_pools': tag, 'supplement_receipts': receipts})

    # full-set API rows (S u P, not equated): cells exactly like base v1.6.1 rows, from their own scorer round
    for row in eq.get('full_rows', []):
        key = row['key']
        rd = R / 'score-d1prov-2'
        per = json.loads((rd / 'out-O1S' / f'{key}.json').read_text())
        assert per['axes'] == row['axes'], f'{key}: axes differ from {rd.name}'
        meta = json.loads((rd / 'REGISTRY-d1prov-2.json').read_text())[key]
        run = rd / 'runs' / meta.get('file', f'{key}.jsonl')
        items, tag, receipts = category_union(key, meta, 'S', answered(base_gold, key, meta, run), pools, labels)
        systems[key] = {'coverage': 'S+P', 'n_items': 1500, 'category_pools': tag, 'category_n_items': len(items),
                        'families': cells(items, lambda g: g.family, known['families'], coverage=True),
                        'topics': cells(items, lambda g: labels[g.item_id][0], known['topics'], coverage=True),
                        'usecases': cells(items, lambda g: labels[g.item_id][1], known['usecases'], coverage=True)}
        checks.append({'key': key, 'round': rd.name, 'axes': 'match', 'source': 'out-O1S/categories-with-topics.json', 'category_pools': tag, 'supplement_receipts': receipts, 'run_sha256': sha(run)})

    for key, c in systems.items():
        for d in ('families', 'usecases', 'languages', 'topics'):
            for k, v in c.get(d, {}).items():
                assert v['n'] <= known[d][k] or c['category_pools'] != 'S+P', f'{key}.{d}.{k}'
    art = {
        'benchmark': 'JevBench', 'revision': 'v1.6.1', 'kind': 'api-rerun-cells',
        'equated_rows_sha256': sha(eq_p), 'supplement_sha256': sha(supp_p),
        'metric': supp.get('metric') or 'Chance-corrected competence (0 = chance, 100 = perfect), per request type then the mean over the types present.',
        'min_n': MIN_N,
        'note': ('Category cells pool each answered stable item once from the row’s original sealed basis plus P and '
                 'the labelled supplements listed in category_pools. Original answers take precedence over repeated P. '
                 'Per-type/tier splits stay on the original basis; all category values are raw, never equated.'),
        'labelling': ('Topic and use case per item by Winnow-12B Q8 on our own GPU pod (the r13 recipe used for every v1.6 item; '
                      'uc1 items keep their authoring use case); the A4/A5 sealed items were labelled with the same recipe (r15). '
                      'Family and language are authoring metadata.'),
        'labels_sha256': labels_used,
        'category_pool_sources': {name: {'gold_sha256': sha(rd / 'frozen/gold.jsonl'), 'id_map_sha256': sha(rd / 'frozen/id-map.json')} for name, rd, _ in pools},
        'sources': {'a4_round': eq['round'], 'a5_round': eq['a5']['round'], 'full_rows_round': 'score-d1prov-2'},
        'systems': systems,
    }
    out_p.write_text(json.dumps(art, indent=1) + '\n')
    (out_p.parent / (out_p.stem + '.checks.json')).write_text(json.dumps(checks, indent=1) + '\n')
    print(out_p, len(systems), 'systems;', sum('topics' in c for c in systems.values()), 'with topics')


if __name__ == '__main__':
    main()
