#!/usr/bin/env python3
"""Build the PRIVATE overnight JevBench v1.6.0 preview data (4/5 Oct 2026 full re-measure) from a scoring round.

Reuses the provisional preview builder (scripts/build-jevbench-v16-preview.py) for the v1.6-measured rows and the
category artifact, then rebuilds the dated carry against the live v1.5.7 board (origin/main) plus the held v1.5.8
fast-lane rows (marked as unpublished candidates), and stamps the data as an overnight preview (never a release).

Usage: python3 scripts/build-jevbench-v16-overnight.py <round-dir> <v1.5.8-held-results.json> <overnight-notes.json>
  <round-dir>      e.g. $R/score-overnight-2 (needs out-O1S/{jevbench-v1.6.0-results.json,categories-with-topics.json,noul-decisive.json}, runs/)
  overnight-notes  JSON with {round, scored_utc, a2_note, exposure: {key: {...}}, notes: [..]} for the method section
"""
import importlib.util
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('prev', os.path.join(ROOT, 'scripts/build-jevbench-v16-preview.py'))
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
OUT = P.OUT
V15 = ['1.5.0', '1.5.1', '1.5.2', '1.5.3', '1.5.4', '1.5.5', '1.5.6', '1.5.7']
REF = 'origin/main'


def git_json(path):
    return json.loads(subprocess.run(['git', 'show', f'{REF}:{path}'], cwd=ROOT, check=True, capture_output=True, text=True).stdout)


def publication(rev):
    path = f'data/raw/benchmarks/jevbench/v1.5/jevbench-v{rev}-results.json'
    out = subprocess.run(['git', 'log', '--first-parent', REF, '--format=%H', '--', path], cwd=ROOT, check=True,
                         capture_output=True, text=True).stdout.split()
    commit = out[-1]
    day = subprocess.run(['git', 'show', '-s', '--format=%cd', '--date=format-local:%Y-%m-%d', commit], cwd=ROOT, check=True,
                         capture_output=True, text=True, env={**os.environ, 'TZ': 'UTC'}).stdout.strip()
    raw = subprocess.run(['git', 'show', f'{REF}:{path}'], cwd=ROOT, check=True, capture_output=True).stdout
    return {'revision': f'v{rev}', 'published_on': day, 'main_commit': commit, 'path': path, 'sha256': P.hashlib.sha256(raw).hexdigest()}


def carry_row(row, revision, label, basis, carried_from, note=None, unpublished=False):
    axes = row['axes']
    return {
        'key': row['key'], 'display': row['display'], 'author': row.get('author'), 'class': row.get('class'), 'open': row.get('open'),
        'licence': row.get('licence'), 'repo': row.get('repo'), 'endpoint_kind': row.get('endpoint_kind'), 'api_flag': row.get('api_flag'),
        'axes': axes, 'capability': (axes['intelligence'] + axes['calibration']) / 2, 'composite_v15': row['jevbench_score'],
        'v156_rank': row.get('rank'), 'cost': row.get('cost'),
        'speed': {k: (row.get('speed') or {}).get(k) for k in ['p50_s_adjusted', 'p95_s_adjusted', 'n', 'adjustment']},
        'measured_revision': revision, 'measured_label': label, 'date_basis': basis, 'carried_from': carried_from,
        'unpublished_candidate': unpublished, 'note': note,
    }


def main(round_dir, held_path, notes_path):
    # 1. measured rows + categories via the reviewed preview builder (writes the three files; carry is rebuilt below).
    P.V15 = ['1.5.0', '1.5.1', '1.5.2', '1.5.3', '1.5.4', '1.5.5', '1.5.6']
    P.release_publication = publication  # no local main branch in this worktree
    cur = os.path.join(OUT, 'jevbench-v1.6.0-results.json')
    if os.path.exists(cur) and json.load(open(cur)).get('status') == 'published':
        os.remove(cur)  # replace the CR-280 candidate data (git keeps it) with this overnight round
    P.main(round_dir, 'out-O1S')
    res_p, cat_p, carry_p = (os.path.join(OUT, f) for f in ['jevbench-v1.6.0-results.json', 'jevbench-v1.6.0-categories.json', 'jevbench-v1.6.0-dated-carry.json'])
    results, categories = json.load(open(res_p)), json.load(open(cat_p))
    notes = json.load(open(notes_path))
    measured = {s['key'] for s in results['systems']}

    # 2. dated carry against live v1.5.7 + held v1.5.8 candidates
    v15 = {rev: git_json(f'data/raw/benchmarks/jevbench/v1.5/jevbench-v{rev}-results.json') for rev in V15}
    live = v15['1.5.7']
    pubs = {rev: publication(rev) for rev in V15}
    rows = []
    for row in live['systems']:
        if row.get('listing') != 'ranked' or row['key'] in measured or P.excluded(row['key']):
            continue
        first = next((rev for rev in V15 if P.signature({s['key']: s for s in v15[rev]['systems']}.get(row['key']) or {}) == P.signature(row)), None)
        if first is None:
            raise SystemExit(f'no publication for {row["key"]}')
        pub = pubs[first]
        rows.append(carry_row(row, pub['revision'], f"measured on {pub['revision']} ({pub['published_on']})",
                              'publication day of the release that first published this measurement (merge into main)', 'v1.5.7'))
    held = json.load(open(held_path))
    live_keys = {s['key'] for s in live['systems'] if s.get('listing') == 'ranked'}
    for row in held['systems']:
        if row.get('listing') != 'ranked' or row['key'] in live_keys or row['key'] in measured or P.excluded(row['key']):
            continue
        day = row.get('last_measured_on') or 'date n/a'
        rows.append(carry_row(row, 'v1.5.8 (held)', f'measured {day} on v1.5.8 (fast lane, unpublished candidate)',
                              'measurement day of the fast-lane run; v1.5.8 is held and not published', 'v1.5.8 (held)',
                              note='Unpublished candidate: paid fast-lane result on the v1.5 pool, held for v1.5.8; not public yet.', unpublished=True))
    rows.sort(key=lambda r: (-r['capability'], r['key']))
    held_rel = {'revision': 'v1.5.8 (held)', 'published_on': 'not published', 'main_commit': None, 'path': None,
                'sha256': P.sha_file(held_path)}
    carry = {
        'benchmark': 'JevBench', 'revision': 'v1.6.0', 'kind': 'dated-carry', 'provisional': True, 'preview': 'overnight',
        'carried_from': {'revision': 'v1.5.7', 'path': pubs['1.5.7']['path'], 'sha256': pubs['1.5.7']['sha256']},
        'method': 'v1.5 protocol (1,624 decisions: 904 open + 720 sealed); scores are on the v1.5 scale and are not comparable with v1.6-measured rows.',
        'rule': 'Every ranked system of the live v1.5.7 board that is not yet measured on the v1.6.0 pool keeps its last published score, marked with the '
                'release that first published that measurement and that release\'s publication day. Paid fast-lane rows held for v1.5.8 are listed as '
                'unpublished candidates with their measurement day. Carried rows are listed separately and never ranked together with v1.6-measured rows.',
        'releases': [pubs[r] for r in V15] + [held_rel],
        'rows': rows,
    }

    # 3. catalogue: every live v1.5.7 / held v1.5.8 key appears somewhere
    roster = {r['key'] for r in results['systems']} | {r['key'] for r in results['not_measured']}
    for row in list(live.get('not_measured', [])) + [r for r in held.get('not_measured', [])]:
        if P.excluded(row['key']) or row['key'] in roster:
            continue
        results['not_measured'].append({'key': row['key'], 'display': row.get('display', row['key']), 'author': row.get('author'),
                                        'addendum': row.get('addendum'), 'status': 'not measured',
                                        'reason': 'No v1.6.0 score. Prior v1.5.7 catalogue: ' + (row.get('reason') or 'no official score was published.')})
        roster.add(row['key'])
    for row in rows:
        if row['key'] in roster:
            continue
        results['not_measured'].append({'key': row['key'], 'display': row['display'], 'author': row.get('author'), 'addendum': None,
                                        'status': 'not measured',
                                        'reason': 'Not yet measured on v1.6.0; the latest score is listed separately with its date.'})
        roster.add(row['key'])
    carry_keys = {r['key'] for r in rows}
    for row in results['not_measured']:
        if row['key'] in carry_keys:
            row['reason'] = 'Not yet measured on v1.6.0; the latest score is listed separately with its date.'
    results['not_measured'].sort(key=lambda r: r['key'])
    results['roster_count'] = len(results['systems']) + len(results['not_measured'])

    # 3b. measured rows that are not on any public board yet (fast-lane orders, add-request candidates) are marked
    public = {r['key'] for r in live['systems']} | {r['key'] for r in live.get('not_measured', [])}
    approved = {r['key'] for r in json.loads(subprocess.run(['git', 'show', '16c79377:data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-results.json'],
                                                            cwd=ROOT, check=True, capture_output=True, text=True).stdout)['systems']}
    held_keys = {r['key'] for r in held['systems']}
    for s in results['systems']:
        if s['key'] in public or s['key'] in approved:
            continue
        s['unpublished_candidate'] = True
        kind = (notes.get('labels') or {}).get(s['key']) or ('held for v1.5.8, unpublished' if s['key'] in held_keys else 'unpublished candidate')
        if kind not in s['display']:
            s['display'] = f"{s['display']} [{kind}]"

    # 4. overnight preview stamp + method notes
    results.update({'status': 'overnight-preview', 'run_kind': 'diagnostic', 'provisional': True,
                    'label': f"v1.6.0 private overnight preview ({notes['round']})",
                    'source_note': f"Scorer output {notes['round']}/out-O1S, scored {notes['scored_utc']} (method option B, O1S). Private preview, not a release."})
    results['overnight'] = notes
    for s in results['systems']:
        s['provenance']['kind'] = f"v1.6.0 overnight re-measure ({notes['round']}/out-O1S)"
    categories['preview'] = 'overnight'
    # Rows scored on the supplementary API subset A2 have family/language cells from the scorer but no topic/use-case
    # cells (the topic builder reads main-pool runs only); the radar view needs every dimension, so list them as unavailable.
    dims = [d for d in ('topics', 'usecases', 'families', 'languages') if d in categories]
    for k in list(categories['systems']):
        if any(d not in categories['systems'][k] for d in dims):
            categories['systems'].pop(k)
            categories.setdefault('unavailable', {})[k] = 'Measured on the supplementary API subset A2; per-category values are not built for A2 rows in this preview.'

    for name, value in [('results', results), ('categories', categories), ('carry', carry)]:
        P.check_aggregate_only(value, name)
        P.check_no_excluded(value, name)
    for path, value in [(res_p, results), (cat_p, categories), (carry_p, carry)]:
        with open(path, 'w') as f:
            json.dump(value, f, indent=1, ensure_ascii=False)
            f.write('\n')
    print(f"overnight: measured {len(results['systems'])} (ranked {results['n_ranked']}), carried {len(rows)} "
          f"({sum(r['unpublished_candidate'] for r in rows)} unpublished candidates), catalogue {results['roster_count']}")


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
