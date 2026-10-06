#!/usr/bin/env python3
"""Add new self-hosted rows to the published JevBench v1.6.1 board without changing any published row.

The new rows were measured on the same frozen v1.6 pool as the published field (same items, same scorer, same fixed G_med), so
they are added to jevbench-v1.6.1-results.json / -categories.json as an addendum (revision stays v1.6.1; v1.6.2 is reserved for
a fresh sealed draw). Only system-level aggregates are copied; item text, ids, gold and per-item results never enter the repo.

    jevbench-add-rows.py --scorer-out DIR --meta META.json [--post-registry R --post-runs D] [--dry-run] KEY...

DIR is a score_v16.py output (jevbench-v1.6.0-results.json). It also needs categories-with-topics.json and noul-decisive.json:
pass --post-registry/--post-runs to build them first (build_categories_v16, build_topics_v16, decisive_v16, all run on Sandy
against the sealed release dir), or put them in DIR yourself. META.json maps every KEY to its presentation metadata
(see scripts/jevbench-add-rows.meta.example.json). The published rows are the single source of truth for every number they carry:
the scorer output is only used for the new keys, and the script refuses when the scorer round does not reproduce the published
scores, axes, capability, cost, speed or category cells of a published row (bootstrap intervals are exempt: the scorer reseeds).
Ranks and board orders are recomputed for the enlarged field with the release rule; the script checks that the same rule
reproduces the published ranks on the published field first.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V16 = ROOT / 'data/raw/benchmarks/jevbench/v1.6'
RESULTS = V16 / 'jevbench-v1.6.1-results.json'
CATEGORIES = V16 / 'jevbench-v1.6.1-categories.json'
ARCHITECTURE = ROOT / 'data/jevbench-architecture.json'
BASE_MODELS = ROOT / 'data/jevbench-base-models.json'
V154_CATEGORIES = ROOT / 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json'
HARNESS = Path(os.environ.get('JEV_HARNESS', '/home/flori/jobs/jevbench-v16-run-20261001/harness'))
RELEASE_DIR = Path(os.environ.get('JEV_RELEASE_DIR', '/home/flori/jevbench-sealed/v1.6-run/v1.6.0'))
LABELS = Path(os.environ.get('JEV_LABELS', '/home/flori/jevbench-sealed/v1.6-run/topic-categories-v1/labels-r13-ruled.jsonl'))
ITEM_LEVEL = {'item_id', 'item_ids', 'item_text', 'question', 'question_text', 'expected', 'gold', 'golds', 'prediction', 'predicted',
              'per_item', 'item_results', 'prompt', 'task_id'}
# Fields of a published row that a re-score must reproduce exactly. composite_ci95 and v16.ci95 are bootstrap intervals (reseeded
# by every scorer run) and are deliberately not compared; ranks are recomputed for the new field.
FROZEN_FIELDS = ['jevbench_score', 'scores', 'axes', 'capability', 'intelligence', 'calibration', 'cost', 'speed', 'status', 'validity']
META_FIELDS = ['class', 'open', 'licence', 'repo', 'gpu', 'endpoint_condition', 'underlying', 'model_pin', 'last_measured_on']
CATEGORY_DIMS = ['families', 'usecases', 'languages', 'topics']
ARCH_CLASSES = {'open-llm-decoder', 'open-diffusion-lm', 'open-encoder', 'open-reranker', 'base-control', 'system'}


def fail(message):
    raise SystemExit(f'jevbench-add-rows: {message}')


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def dump(value, indent, ensure_ascii):
    return json.dumps(value, indent=indent, ensure_ascii=ensure_ascii) + '\n'


def sha_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def baseline_sha(fn, value):
    """Baseline hashes come from lib/jevbench-add-rows-baseline.mjs (through node), the same code the test uses."""
    code = (f"import {{ {fn} as f }} from {json.dumps((ROOT / 'lib/jevbench-add-rows-baseline.mjs').as_uri())};"
            "let t='';for await (const c of process.stdin) t+=c;console.log(f(JSON.parse(t)));")
    return subprocess.run(['node', '--input-type=module', '-e', code], input=json.dumps(value), capture_output=True, text=True,
                          check=True).stdout.strip()


def check_aggregate_only(value, path='row'):
    if isinstance(value, list):
        for i, v in enumerate(value):
            check_aggregate_only(v, f'{path}[{i}]')
    elif isinstance(value, dict):
        for k, v in value.items():
            if k in ITEM_LEVEL:
                fail(f'item-level field at {path}.{k}')
            check_aggregate_only(v, f'{path}.{k}')


def rank_rows(systems, headline):
    """The release rule (build-jevbench-v16-preview.py): sort by (-score, key) per option, capability by (-capability, key)."""
    ranked = [s for s in systems if s.get('ranked')]
    ranks = {s['key']: {} for s in ranked}
    board = {}
    for o in ['A', 'B', 'C']:
        order = sorted(ranked, key=lambda s: (-s['scores'][o], s['key']))
        board[o] = [s['key'] for s in order]
        for i, s in enumerate(order):
            ranks[s['key']][o] = i + 1
    for i, s in enumerate(sorted(ranked, key=lambda s: (-s['capability'], s['key']))):
        ranks[s['key']]['capability'] = i + 1
    return ranks, board


def apply_ranks(systems, headline):
    ranks, board = rank_rows(systems, headline)
    for s in systems:
        if s.get('ranked'):
            s['ranks'] = {**ranks[s['key']]}
            s['rank'] = s['ranks'][headline]
    systems.sort(key=lambda s: (s.get('rank') or 999, s['key']))
    return board


def post_chain(scorer_out, registry, runs):
    """Category/topic/use-case cells and Noul decisiveness for the scorer round (sealed inputs stay on Sandy; counts only)."""
    out = Path(scorer_out)
    results = out / 'jevbench-v1.6.0-results.json'
    steps = [
        [HARNESS / 'build_categories_v16.py', results, RELEASE_DIR / 'frozen/gold.jsonl', V154_CATEGORIES, out / 'categories.json'],
        [HARNESS / 'build_topics_v16.py', RELEASE_DIR, registry, runs, LABELS, out / 'categories.json', out / 'categories-with-topics.json', V154_CATEGORIES],
        [HARNESS / 'decisive_v16.py', RELEASE_DIR, registry, runs, out / 'noul-decisive.json'],
    ]
    for cmd in steps:
        subprocess.run([sys.executable, *map(str, cmd)], cwd=HARNESS, env={**os.environ, 'JEV_NOUL_METHOD': 'O1S'}, check=True)


def check_reproduction(pub, scorer, pub_cats, scorer_cats):
    """The scorer round must reproduce every published row's frozen numbers and category cells, or the new rows are not comparable."""
    sc = {s['key']: s for s in scorer['systems']}
    bad = []
    for s in pub['systems']:
        o = sc.get(s['key'])
        if o is None:
            bad.append(f'{s["key"]}: missing from the scorer round')
            continue
        for f in FROZEN_FIELDS:
            if s.get(f) != o.get(f):
                bad.append(f'{s["key"]}.{f}')
    for f in ['G_med', 'options', 'tier_weights', 'types', 'sealed_share_of_intelligence']:
        if pub.get(f) != scorer.get(f):
            bad.append(f'top-level {f}')
    for k, cells in pub_cats['systems'].items():
        if scorer_cats['systems'].get(k) != cells:
            bad.append(f'categories.{k}')
    for d in CATEGORY_DIMS:
        if pub_cats[d] != scorer_cats[d]:
            bad.append(f'category definitions {d}')
    return bad


def build_row(key, srow, meta, decisive, scorer_sha, label):
    row = json.loads(json.dumps(srow))
    check_aggregate_only(row, key)
    v16 = row['v16']
    v16.pop('breakdowns', None)  # the per-category aggregates ship in the categories file
    if v16.get('full_set_api') is False:
        v16.pop('full_set_api')  # published self-hosted rows do not carry the key
    if v16.get('lane') != 'selfhosted' or row.get('api_flag') or row.get('status', {}).get('rows') != 1500:
        fail(f'{key}: only complete self-hosted rows (1,500 items) can be added')
    for f in META_FIELDS:
        if f not in meta:
            fail(f'{key}: meta lacks {f}')
        row[f] = meta[f]
    row['adapter_id'] = meta.get('adapter_id')
    row['addendum'] = None
    row['alt'] = None
    row['measurement_date_status'] = 'run output completion day (UTC)'
    row['measured_in'] = 'v1.6.1'
    row['not_ranked_because'] = None if row.get('ranked') else row.get('not_ranked_because')
    d = decisive.get(key)
    row['noul_decisive'] = None if d is None else {k: d.get(k) for k in ['supported', 'decisive_rate', 'acc_among_decisive', 'valid']}
    row['provenance'] = {'kind': f'v1.6.1 addendum {label} (scorer output sha256 {scorer_sha[:12]}, method option B / O1S)',
                         'carried_metadata_from': meta.get('metadata_from')}
    return row


def check_entries(key, meta, architecture, base_models):
    arch = meta.get('architecture')
    if not arch or arch.get('arch') not in ARCH_CLASSES or not arch.get('evidence') or set(arch.get('badges', {})) != {'derivation', 'params', 'quant'}:
        fail(f'{key}: meta.architecture needs arch, evidence[] and badges{{derivation,params,quant}}')
    if not any(e.get('kind') != 'artifact' for e in arch['evidence']):
        fail(f'{key}: architecture needs external (non-artifact) evidence')
    if key in architecture['benchmarks']['jevbench']:
        fail(f'{key}: architecture entry already exists')
    base = meta.get('base_model')
    if not base or not base.get('label') or base.get('status') not in ('disclosed', 'undisclosed') or not base.get('sources'):
        fail(f'{key}: meta.base_model needs label, status and sources[]')
    if key in base_models['benchmarks']['jevbench']:
        fail(f'{key}: base-model entry already exists')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('keys', nargs='+')
    ap.add_argument('--scorer-out', required=True)
    ap.add_argument('--meta', required=True)
    ap.add_argument('--label', default='a6', help='addendum label recorded in the provenance of the new rows')
    ap.add_argument('--date', required=True, help='UTC date of the addendum, YYYY-MM-DD')
    ap.add_argument('--note', required=True, help='one-sentence public description of the addendum')
    ap.add_argument('--post-registry')
    ap.add_argument('--post-runs')
    ap.add_argument('--dry-run', action='store_true', help='validate and report, write nothing')
    args = ap.parse_args()
    keys = args.keys
    if len(set(keys)) != len(keys):
        fail('duplicate keys')
    out = Path(args.scorer_out)
    if args.post_registry:
        post_chain(out, args.post_registry, args.post_runs)
    scorer_results_path = out / 'jevbench-v1.6.0-results.json'
    scorer, scorer_cats, decisive = load(scorer_results_path), load(out / 'categories-with-topics.json'), load(out / 'noul-decisive.json')
    metas = load(args.meta)
    pub, pub_cats = load(RESULTS), load(CATEGORIES)
    architecture, base_models = load(ARCHITECTURE), load(BASE_MODELS)
    scorer_sha = sha_file(scorer_results_path)

    if (pub['revision'], pub['protocol'], scorer['protocol']) != ('v1.6.1', 'jevbench::v1.6', 'jevbench::v1.6'):
        fail('unexpected release identity')
    pub_keys = {s['key'] for s in pub['systems']}
    scorer_rows = {s['key']: s for s in scorer['systems']}
    for k in keys:
        if k in pub_keys:
            fail(f'{k} is already published')
        if k not in scorer_rows:
            fail(f'{k} is not in the scorer output')
        if k not in scorer_cats['systems']:
            fail(f'{k} has no category cells in the scorer output')
        if k not in metas:
            fail(f'{k} has no entry in the meta file')
        check_entries(k, metas[k], architecture, base_models)

    bad = check_reproduction(pub, scorer, pub_cats, scorer_cats)
    if bad:
        fail('the scorer round does not reproduce the published field; refusing:\n  ' + '\n  '.join(bad[:40]))

    # The release rule must reproduce the published ranks and board orders before it is used on the enlarged field.
    probe = json.loads(json.dumps(pub['systems']))
    probe_board = apply_ranks(probe, pub['headline'])
    if [(s['key'], s.get('rank'), s.get('ranks')) for s in probe] != [(s['key'], s.get('rank'), s.get('ranks')) for s in pub['systems']]:
        fail('the rank rule does not reproduce the published ranks')
    if any(probe_board[o] != pub['board'][o]['order'] for o in 'ABC'):
        fail('the rank rule does not reproduce the published board order')

    new_rows = [build_row(k, scorer_rows[k], metas[k], decisive, scorer_sha, args.label) for k in keys]
    baseline = baseline_sha('systemsBaselineSha256', pub['systems'])
    cat_baseline = baseline_sha('categoriesBaselineSha256', pub_cats['systems'])

    res = json.loads(json.dumps(pub))
    res['systems'].extend(new_rows)
    board = apply_ranks(res['systems'], res['headline'])
    for o in 'ABC':
        res['board'][o]['order'] = board[o]
    res['not_measured'] = [n for n in res['not_measured'] if n['key'] not in keys]
    res['n_ranked'] = sum(1 for s in res['systems'] if s.get('ranked'))
    res['roster_count'] = len(res['systems']) + len(res['not_measured'])
    res.setdefault('additions', []).append({
        'date': args.date, 'label': args.label, 'keys': keys, 'note': args.note, 'scorer_source_sha256': scorer_sha,
        'baseline_systems_sha256': baseline, 'baseline_categories_sha256': cat_baseline,
        'rule': 'Same frozen v1.6 pool, scorer, G_med and cost basis as the published rows; every published row is byte-identical apart from its rank.'})

    cats = json.loads(json.dumps(pub_cats))
    for k in keys:
        cats['systems'][k] = scorer_cats['systems'][k]
        cats['lanes'][k] = 'selfhosted'

    for k in keys:
        architecture['benchmarks']['jevbench'][k] = metas[k]['architecture']
        base_models['benchmarks']['jevbench'][k] = {**metas[k]['base_model'], 'checked_utc': f'{args.date}T00:00:00Z'}
    architecture['checked_utc'] = base_models['checked_utc'] = f'{args.date}T00:00:00Z'

    print(f'{len(keys)} rows: ' + ', '.join(f'{k} (rank {next(s for s in res["systems"] if s["key"] == k).get("rank")})' for k in keys))
    print(f'n_ranked {pub["n_ranked"]} -> {res["n_ranked"]}; roster_count {pub["roster_count"]} -> {res["roster_count"]}')
    if args.dry_run:
        print('dry run: nothing written')
        return
    RESULTS.write_text(dump(res, 1, False), encoding='utf-8')
    CATEGORIES.write_text(dump(cats, 1, False), encoding='utf-8')
    ARCHITECTURE.write_text(dump(architecture, 2, False), encoding='utf-8')
    BASE_MODELS.write_text(dump(base_models, 2, False), encoding='utf-8')


if __name__ == '__main__':
    main()
