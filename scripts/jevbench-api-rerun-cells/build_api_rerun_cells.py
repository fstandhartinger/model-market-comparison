#!/usr/bin/env python3
"""Per-category + per-type/tier aggregates for the live-board overlay rows of data/jevbench-api-a4-equated.json
(A4 u P re-runs, A5 u P re-runs, full-set API rows such as Liquid d1) — the rows the v1.6.1 category artifact lacks.

Same scorer and method as every published cell: score_v16 build_systems/group_stats (chance-corrected competence per
request type, mean over types present), MIN_N 15 per cell, topic/use-case labels from the Winnow r13 recipe
(labels-r13-ruled for S u P, labels-r15-ruled for the new A4/A5 sealed items; uc1 authoring use case wins), families and
languages from authoring metadata. Values are RAW (never equated), like every category value. Runs on Sandy; only
aggregates are written.

    build_api_rerun_cells.py EQUATED_JSON CATEGORIES_SUPPLEMENT_JSON OUT_JSON [--allow-missing-labels]
"""
import collections, hashlib, json, os, sys
from pathlib import Path

H = Path('/home/flori/jobs/jevbench-v16-run-20261001/harness')
SEALED = Path('/home/flori/jevbench-sealed/v1.6-run')
R = SEALED / 'v1.6.0'
LABELS = [SEALED / 'topic-categories-v1/labels-r13-ruled.jsonl', SEALED / 'topic-categories-v1/labels-r15-ruled.jsonl']
os.environ['JEV_NOUL_METHOD'] = 'O1S'  # every published v1.6.1 round is scored with O1S
sys.path.insert(0, str(H))
import score_v16 as V  # noqa: E402

MIN_N = 15
UC_LONG = {"ecommerce": "ecommerce_marketplaces", "moderation": "moderation_trust_safety"}
SUBSET_DIR = {'A4': SEALED / 'v1.6.0-A4', 'A5': SEALED / 'v1.6.0-A5'}


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def load_labels():
    lab = collections.defaultdict(dict)
    used = {}
    for p in LABELS:
        if not p.exists():
            continue
        used[p.name] = sha(p)
        for line in p.open():
            r = json.loads(line)
            oid, q = r['id'].split('::')
            lab[q][oid] = UC_LONG.get(r['choice'], r['choice']) if q == 'usecase' else r['choice']
    return lab, used


def item_labels(gold, lab, base_by_item):
    """oid -> (topic, usecase) for a subset gold; P items reuse their v1.6.0 labels via item_id."""
    out, missing = {}, 0
    for oid, g in gold.items():
        src = oid if oid in lab['topic'] else base_by_item.get(g.item_id)
        if src is None or src not in lab['topic'] or src not in lab['usecase']:
            missing += 1
            continue
        out[oid] = (lab['topic'][src], lab['usecase'][src])
    return out, missing


def cells(scored, keyfn, known):
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
    return out


def r2(x): return None if x is None else round(float(x), 4)


def main():
    eq_p, supp_p, out_p = map(Path, sys.argv[1:4])
    allow_missing = '--allow-missing-labels' in sys.argv
    eq = json.loads(eq_p.read_text())
    supp = json.loads(supp_p.read_text())
    known = {d: {c['key']: c['n'] for c in supp[d]} for d in ('families', 'usecases', 'languages', 'topics')}
    lab, labels_used = load_labels()
    base_gold = V.load_gold(R / 'frozen/gold.jsonl')
    base_by_item = {g.item_id: oid for oid, g in base_gold.items()}

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
        gold = V.load_gold(SUBSET_DIR[subset] / 'frozen/gold.jsonl')
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
        il, missing = item_labels(gold, lab, base_by_item)
        if missing and not allow_missing:
            raise SystemExit(f'{key}: {missing} items without topic/use-case labels')
        cell = {'coverage': f'{subset}+P', 'n_items': len(s.scored), 'answered_ok': row.get('answered_ok'),
                'per_type_split': {k: {'cc': r2(v['cc']), 'n': v['n'], 'tiers': {t: r2(c) for t, c in v['tiers'].items()}}
                                   for k, v in intel['per_type_split'].items()},
                'families': fam}  # languages: owned by jevbench-languages-full-20261007 (board #11048), not published here
        if not missing:
            cell['topics'] = cells(s.scored, lambda g: il[g.oid][0], known['topics'])
            cell['usecases'] = cells(s.scored, lambda g: il[g.oid][1], known['usecases'])
        else:
            cell['labels_missing'] = missing
        systems[key] = cell
        checks.append({'key': key, 'round': rd.name, 'run_sha256': run_sha, 'I_open_I_sealed': 'match', 'breakdowns_rescore': 'match'})

    # full-set API rows (S u P, not equated): cells exactly like base v1.6.1 rows, from their own scorer round
    for row in eq.get('full_rows', []):
        key = row['key']
        rd = R / 'score-d1prov-2'
        cat = json.loads((rd / 'out-O1S/categories-with-topics.json').read_text())['systems'][key]
        per = json.loads((rd / 'out-O1S' / f'{key}.json').read_text())
        assert per['axes'] == row['axes'], f'{key}: axes differ from {rd.name}'
        systems[key] = {'coverage': 'S+P', 'n_items': 1500,
                        **{d: {k: v for k, v in cat.get(d, {}).items() if k in known[d]} for d in ('families', 'topics', 'usecases')}}
        checks.append({'key': key, 'round': rd.name, 'axes': 'match', 'source': 'out-O1S/categories-with-topics.json'})

    for key, c in systems.items():
        for d in ('families', 'usecases', 'languages', 'topics'):
            for k, v in c.get(d, {}).items():
                assert v['n'] <= known[d][k] or c['coverage'] != 'S+P', f'{key}.{d}.{k}'
    art = {
        'benchmark': 'JevBench', 'revision': 'v1.6.1', 'kind': 'api-rerun-cells',
        'equated_rows_sha256': sha(eq_p), 'supplement_sha256': sha(supp_p),
        'metric': supp.get('metric') or 'Chance-corrected competence (0 = chance, 100 = perfect), per request type then the mean over the types present.',
        'min_n': MIN_N,
        'note': ('Breakdowns for the API rows re-run on a 600-item set (A4 u P or A5 u P: 300 sealed + 300 public) and for full-set '
                 'API rows added after the v1.6.1 category artifact. Same scorer, labels recipe and minimum cell size as every other row; '
                 'values are raw (never equated). A 600-item row has only 300 sealed items, so its cells cover fewer items and carry '
                 'wider uncertainty; compare them with care.'),
        'labelling': ('Topic and use case per item by Winnow-12B Q8 on our own GPU pod (the r13 recipe used for every v1.6 item; '
                      'uc1 items keep their authoring use case); the A4/A5 sealed items were labelled with the same recipe (r15). '
                      'Family and language are authoring metadata.'),
        'labels_sha256': labels_used,
        'sources': {'a4_round': eq['round'], 'a5_round': eq['a5']['round'], 'full_rows_round': 'score-d1prov-2'},
        'systems': systems,
    }
    out_p.write_text(json.dumps(art, indent=1) + '\n')
    (out_p.parent / (out_p.stem + '.checks.json')).write_text(json.dumps(checks, indent=1) + '\n')
    print(out_p, len(systems), 'systems;', sum('topics' in c for c in systems.values()), 'with topics')


if __name__ == '__main__':
    main()
