#!/usr/bin/env python3
"""Build the PROVISIONAL public JevBench v1.6.0 preview files from the private provisional scorer output.

Reads (private, Sandy only):  <prov>/<out>/jevbench-v1.6.0-results.json, <prov>/<out>/categories-with-topics.json, <prov>/runs/*.jsonl (mtime only)
Reads (public, this repo):    data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.{0..5}-results.json and their git history
Writes (public aggregates):   data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-results.json
                              data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-categories.json
                              data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json

Rules: only system-level aggregates are copied (no item text, ids, gold or per-item results). Private systems under a
standing exclusion are dropped from every output. Carried rows keep their last published v1.5.x numbers and the
publication day of the release that first published that measurement (merge day on main, from git history); no
per-model measurement timestamp is invented. Everything is marked provisional.

Usage: python3 scripts/build-jevbench-v16-preview.py <prov-dir> [<out-subdir>]   (default out; e.g. out-O1S)
"""
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data/raw/benchmarks/jevbench/v1.6')
V15 = ['1.5.0', '1.5.1', '1.5.2', '1.5.3', '1.5.4', '1.5.5']
# Standing exclusion: private fine-tune (and its thinking-mode variant) and private-only Weiche are listed nowhere.
EXCLUDED = {'djev', 'djev-thinking'}
EXCLUDED_PATTERNS = [re.compile(r'weiche', re.I)]
ITEM_LEVEL = re.compile(r'^(item_id|item_ids|item_text|question|question_text|expected|gold|golds|prediction|predicted|per_item|item_results|prompt|task_id)$', re.I)
# Per-system metadata that the v1.6 scorer output does not carry; joined from the same key's last published v1.5.5 row.
JOIN_FIELDS = ['class', 'open', 'licence', 'repo', 'gpu', 'endpoint_condition', 'underlying', 'adapter_id', 'api_exposure_note', 'alt']


def excluded(key):
    return key in EXCLUDED or any(p.search(key) for p in EXCLUDED_PATTERNS)


def sha_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def check_aggregate_only(value, path='artifact'):
    if isinstance(value, list):
        for i, v in enumerate(value):
            check_aggregate_only(v, f'{path}[{i}]')
    elif isinstance(value, dict):
        for k, v in value.items():
            if ITEM_LEVEL.match(k):
                raise SystemExit(f'item-level field at {path}.{k}')
            check_aggregate_only(v, f'{path}.{k}')


def check_no_excluded(value, path='artifact'):
    text = json.dumps(value)
    for key in EXCLUDED:
        if re.search(r'"%s"' % re.escape(key), text):
            raise SystemExit(f'excluded key {key} leaked into {path}')
    if any(p.search(text) for p in EXCLUDED_PATTERNS):
        raise SystemExit(f'excluded system leaked into {path}')


def release_publication(rev):
    """Merge day on main of the commit that first added the release's results file (first-parent history)."""
    path = f'data/raw/benchmarks/jevbench/v1.5/jevbench-v{rev}-results.json'
    out = subprocess.run(['git', 'log', '--first-parent', 'main', '--format=%H %cI', '--', path],
                         cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip().splitlines()
    if not out:
        raise SystemExit(f'no main history for {path}')
    commit, when = out[-1].split(' ', 1)
    # Calendar day in UTC of the merge into main.
    utc = subprocess.run(['git', 'show', '-s', '--format=%cd', '--date=format-local:%Y-%m-%d', commit],
                         cwd=ROOT, check=True, capture_output=True, text=True, env={**os.environ, 'TZ': 'UTC'}).stdout.strip()
    return {'revision': f'v{rev}', 'published_on': utc, 'main_commit': commit, 'path': path, 'sha256': sha_file(os.path.join(ROOT, path))}


def signature(row):
    """Raw measurement aggregates that do not depend on the rest of the field (unlike gap penalty or ranks)."""
    i = row.get('intelligence') or {}
    return (i.get('I_open'), i.get('I_sealed'), (row.get('calibration') or {}).get('score'), (row.get('speed') or {}).get('p50_s_raw'))


def measured_on(prov, key):
    """UTC day the system's run output file was completed (mtime of the resolved runs/<key>.jsonl), or None."""
    path = os.path.join(prov, 'runs', f'{key}.jsonl')
    if not os.path.exists(path):
        return None
    t = os.stat(os.path.realpath(path)).st_mtime
    return subprocess.run(['date', '-u', '-d', f'@{t}', '+%Y-%m-%d'], check=True, capture_output=True, text=True).stdout.strip()


def main(prov, out_dir='out'):
    src_results = os.path.join(prov, out_dir, 'jevbench-v1.6.0-results.json')
    src_categories = os.path.join(prov, out_dir, 'categories-with-topics.json')
    src_label = f'{os.path.basename(os.path.normpath(prov))}/{out_dir}'
    res = json.load(open(src_results))
    cats = json.load(open(src_categories))
    v15 = {rev: json.load(open(os.path.join(ROOT, f'data/raw/benchmarks/jevbench/v1.5/jevbench-v{rev}-results.json'))) for rev in V15}
    live = v15['1.5.5']
    live_rows = {s['key']: s for s in live['systems']}
    assert res['revision'] == 'v1.6.0' and res['protocol'] == 'jevbench::v1.6'

    # ---- v1.6-measured systems -------------------------------------------------------------------------------------
    systems = []
    for s in res['systems']:
        if excluded(s['key']):
            continue
        row = json.loads(json.dumps(s))
        v16 = row.get('v16') or {}
        v16.pop('breakdowns', None)  # the per-category aggregates ship in the categories file
        row['v16'] = v16
        prior = live_rows.get(s['key'])
        for f in JOIN_FIELDS:
            if prior is not None and f in prior and f not in row:
                row[f] = prior[f]
        if prior is None and s['key'] == 'fastino-gliner-2-5-decide':
            row.setdefault('class', 'decision-api')
            row.setdefault('open', 'no')
            row.setdefault('licence', 'proprietary hosted API')
            row.setdefault('repo', None)
            row.setdefault('endpoint_condition', 'external hosted API (Fastino); received the 300-item API subset and the 300 public items')
            row.setdefault('api_exposure_note', "API measurement: the operator's endpoint received sealed item text, without answers.")
        row['model_pin'] = prior.get('model_pin') if prior else None
        # Completion day of the run output; the per-record output has no timestamps.
        row['last_measured_on'] = measured_on(prov, s['key'])
        row['measurement_date_status'] = 'run output completion day (UTC)' if row['last_measured_on'] else 'unknown'
        row['measured_in'] = 'v1.6.0'
        row['not_ranked_because'] = None if row.get('ranked') else row.get('not_ranked_because')
        row['provenance'] = {'kind': f'v1.6.0 provisional scorer output ({src_label})', 'carried_metadata_from': 'v1.5.5' if prior else None}
        systems.append(row)

    # Ranks and board orders recomputed on the published (exclusion-applied) roster; scores are unchanged.
    ranked = [s for s in systems if s.get('ranked')]
    board = {}
    for o in ['A', 'B', 'C']:
        order = sorted(ranked, key=lambda s: (-s['scores'][o], s['key']))
        board[o] = {'order': [s['key'] for s in order], 'leader_wording': None, 'markers': []}
        for i, s in enumerate(order):
            s['ranks'][o] = i + 1
    for i, s in enumerate(sorted(ranked, key=lambda s: (-s['capability'], s['key']))):
        s['ranks']['capability'] = i + 1
    for s in ranked:
        s['rank'] = s['ranks'][res['headline']]
    systems.sort(key=lambda s: (s.get('rank') or 999, s['key']))

    not_measured = []
    for n in res['not_measured']:
        if excluded(n['key']):
            continue
        prior = live_rows.get(n['key'])
        not_measured.append({'key': n['key'], 'display': (prior or {}).get('display', n['key']), 'author': (prior or {}).get('author'),
                             'addendum': None, 'status': 'not measured', 'reason': 'Not measured on the v1.6.0 pool in this provisional run.'})

    v16 = json.loads(json.dumps(res['v16']))
    eq = v16.get('equating') or {}
    # Pool membership lists are not published (one pool member is a private system under a standing exclusion).
    eq.pop('pool', None)
    eq.pop('pool_n', None)
    v16.pop('ranked_selfhosted', None)
    eq['pool_note'] = 'Median over the complete full-coverage self-hosted systems of this run (at least five required).'
    v16['equating'] = eq
    counts = v16['counts']
    # Type split per item set (from the published per-type item counts of a complete self-hosted row and an API row).
    def type_counts(row, side):
        split = (row.get('intelligence') or {}).get('per_type_split') or {}
        return {t: sum((split.get(f'{side}|{t}') or {}).get('n', {}).values()) for t in ['choice', 'noul', 'score']}
    sh = next(s for s in systems if s.get('v16', {}).get('lane') == 'selfhosted' and s.get('full_coverage'))
    api = next(s for s in systems if s.get('v16', {}).get('lane') == 'api')
    v16['item_sets'] = [
        {'set': 'S', 'name': 'Sealed release draw', 'items': counts['S'], 'by_type': type_counts(sh, 'sealed'), 'answered_by': 'self-hosted systems only (run offline on our own GPU pods or Sandy)'},
        {'set': 'A', 'name': 'API subset (part of S)', 'items': counts['A'], 'by_type': type_counts(api, 'sealed'), 'answered_by': 'self-hosted systems and externally hosted APIs'},
        {'set': 'P', 'name': 'Public set', 'items': counts['P'], 'by_type': type_counts(sh, 'open'), 'answered_by': 'every system'},
    ]

    artifact = {
        'benchmark': 'JevBench', 'revision': 'v1.6.0', 'protocol': res['protocol'],
        'provisional': True,
        'status': 'preview-not-published', 'run_kind': 'diagnostic',
        'label': 'v1.6.0 preview, provisional',
        'source_sha256': sha_file(src_results),
        'source_note': f'Provisional scorer output {src_label} (3 Oct 2026). Not a release; numbers can change before GO.',
        'sample': {'open': counts['P'], 'sealed': counts['S'], 'total': counts['selfhosted_input'], 'published_open': counts['P']},
        'types': res['types'], 'tier_weights': res['tier_weights'], 'sealed_share_of_intelligence': res['sealed_share_of_intelligence'],
        'G_med': res['G_med'], 'G_med_api_basis_P_vs_A': res['G_med_api_basis_P_vs_A'], 'G_med_flag_gt10': res['G_med_flag_gt10'],
        'headline': res['headline'], 'options': res['options'], 'views': res['views'], 'bootstrap': res['bootstrap'],
        'n_ranked': len(ranked), 'board': board, 'v16': v16,
        'systems': systems, 'not_measured': not_measured, 'roster_count': len(systems) + len(not_measured),
    }

    # ---- categories (topics, use cases, families, languages) --------------------------------------------------------
    categories = json.loads(json.dumps(cats))
    categories['systems'] = {k: v for k, v in cats['systems'].items() if not excluded(k)}
    categories['unavailable'] = {k: v for k, v in (cats.get('unavailable') or {}).items() if not excluded(k)}
    categories['provisional'] = True
    categories['source_sha256'] = sha_file(src_categories)
    categories['results_sha256_note'] = 'source_results_sha256 refers to the private provisional scorer output, not to the public results file.'
    categories['lanes'] = {k: ('api' if (next((s for s in systems if s['key'] == k), {}).get('v16') or {}).get('lane') == 'api' else 'selfhosted') for k in categories['systems']}
    categories['lane_note'] = 'Self-hosted cells pool S 1,200 + P 300 (1,500 items); hosted-API cells pool A 300 + P 300 (600 items). Raw and unequated: compare systems of the same lane within a category.'

    # ---- dated carry: ranked live v1.5.5 rows not measured on v1.6 --------------------------------------------------
    pubs = {rev: release_publication(rev) for rev in V15}
    measured_keys = {s['key'] for s in res['systems']}
    carry_rows = []
    for row in live['systems']:
        if row.get('listing') != 'ranked' or row['key'] in measured_keys or excluded(row['key']):
            continue
        first = None
        for rev in V15:
            prior = {s['key']: s for s in v15[rev]['systems']}.get(row['key'])
            if prior is not None and signature(prior) == signature(row):
                first = rev
                break
        if first is None:
            raise SystemExit(f'no publication found for {row["key"]}')
        axes = row['axes']
        cap = (axes['intelligence'] + axes['calibration']) / 2
        pub = pubs[first]
        carry_rows.append({
            'key': row['key'], 'display': row['display'], 'author': row.get('author'), 'class': row.get('class'), 'open': row.get('open'),
            'licence': row.get('licence'), 'repo': row.get('repo'), 'endpoint_kind': row.get('endpoint_kind'), 'api_flag': row.get('api_flag'),
            'axes': axes, 'capability': cap, 'composite_v15': row['jevbench_score'], 'v155_rank': row.get('rank'),
            'cost': row.get('cost'), 'speed': {k: (row.get('speed') or {}).get(k) for k in ['p50_s_adjusted', 'p95_s_adjusted', 'n', 'adjustment']},
            'measured_revision': pub['revision'], 'measured_label': f"measured on {pub['revision']} ({pub['published_on']})",
            'date_basis': 'publication day of the release that first published this measurement (merge into main)',
            'carried_from': 'v1.5.5',
            'note': 'Not yet measured on the v1.6 pool.' if row['key'].startswith('surogate-rune') else None,
        })
    carry_rows.sort(key=lambda r: (-r['capability'], r['key']))
    carry = {
        'benchmark': 'JevBench', 'revision': 'v1.6.0', 'kind': 'dated-carry', 'provisional': True,
        'carried_from': {'revision': 'v1.5.5', 'path': pubs['1.5.5']['path'], 'sha256': pubs['1.5.5']['sha256']},
        'method': 'v1.5 protocol (1,624 decisions: 904 open + 720 sealed); scores are on the v1.5 scale and are not comparable with v1.6-measured rows.',
        'rule': 'Every ranked system of the live v1.5.5 board that is not measured on the v1.6.0 pool keeps its last published score, '
                'marked with the release that first published that measurement and that release\'s publication day. Carried rows are listed '
                'separately and never ranked together with v1.6-measured rows.',
        'releases': [pubs[r] for r in V15],
        'rows': carry_rows,
    }

    for name, value in [('results', artifact), ('categories', categories), ('carry', carry)]:
        check_aggregate_only(value, name)
        check_no_excluded(value, name)

    os.makedirs(OUT, exist_ok=True)
    for fname, value in [('jevbench-v1.6.0-results.json', artifact), ('jevbench-v1.6.0-categories.json', categories), ('jevbench-v1.6.0-dated-carry.json', carry)]:
        with open(os.path.join(OUT, fname), 'w') as f:
            json.dump(value, f, indent=1, ensure_ascii=False)
            f.write('\n')
    print(f'measured {len(systems)} (ranked {len(ranked)}), not measured {len(not_measured)}, carried {len(carry_rows)}')
    by_rev = {}
    for r in carry_rows:
        by_rev[r['measured_label']] = by_rev.get(r['measured_label'], 0) + 1
    print(json.dumps(by_rev, indent=1))


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
