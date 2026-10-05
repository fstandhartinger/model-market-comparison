#!/usr/bin/env python3
"""Finalize reviewed JevBench v1.6.0 aggregates without changing measured scores.

Adds the current v1.5.6 public roster baseline as separately dated carry or
not-measured catalogue rows. It never reads or changes sealed item content.
"""
import argparse
import hashlib
import json
import os
import sqlite3
import subprocess
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'data/raw/benchmarks/jevbench/v1.6'
PREVIOUS = ROOT / 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.6-results.json'
PREVIOUS_PATH = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.6-results.json'
SOURCE_SHA256 = '9ac0853fc8ee333f232eccc62930639eb37226198d06580ce717de8cb7cbc7ec'
PREVIEW_CARD_ID = '16238'
TIMING_ONLY_REPLY_ID = '16243'
RELEASE_NOT_BEFORE = date(2026, 10, 5)
JOB_DIR = Path('/home/flori/jobs/jevbench-v16-run-20261001')
NOTIFY_REPLY_DB = Path('/home/flori/.notify/reply-actions.sqlite3')
PRIVATE_KEYS = {'djev', 'djev-thinking'}
FILES = {
    'results': DIR / 'jevbench-v1.6.0-results.json',
    'categories': DIR / 'jevbench-v1.6.0-categories.json',
    'carry': DIR / 'jevbench-v1.6.0-dated-carry.json',
}


def write_json(path, value):
    fd, tmp = tempfile.mkstemp(prefix=f'.{path.name}.', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(value, f, indent=1, ensure_ascii=False)
            f.write('\n')
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def score_signature(results):
    return [
        (row['key'], row.get('scores'), row.get('axes'), row.get('capability'),
         row.get('ranks'), row.get('rank'))
        for row in results['systems']
    ]


def published_release(revision):
    path = f'data/raw/benchmarks/jevbench/v1.5/jevbench-v{revision}-results.json'
    history = subprocess.run(
        ['git', 'log', '--first-parent', 'origin/main', '--format=%H', '--', path],
        cwd=ROOT, check=True, capture_output=True, text=True,
    ).stdout.splitlines()
    if not history:
        raise SystemExit(f'no published first-parent history for {path}')
    commit = history[-1]
    timestamp = subprocess.run(
        ['git', 'show', '-s', '--format=%cI', commit], cwd=ROOT,
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    published_on = datetime.fromisoformat(timestamp).astimezone(timezone.utc).date().isoformat()
    raw = (ROOT / path).read_bytes()
    return {
        'revision': f'v{revision}', 'published_on': published_on, 'main_commit': commit,
        'path': path, 'sha256': hashlib.sha256(raw).hexdigest(),
    }


def validate_release_go_record(row, ask_id, now=None):
    """Validate a matched reply row read from notify's trusted SQLite action ledger."""
    if row is None:
        raise ValueError('no authenticated Telegram reply is recorded for that release ask')
    if row['ask_id'] != ask_id or row['channel'] != 'telegram' or row['job_dir'] != str(JOB_DIR):
        raise ValueError('Telegram reply belongs to a different ask or job')
    if row['status'] not in {'acknowledged', 'resuming', 'matched'} or row['ack_at'] is None or row['matched_reply_id'] is None:
        raise ValueError('release GO reply has not completed the notify acknowledgement flow')
    if str(row['matched_reply_id']) == TIMING_ONLY_REPLY_ID or (row['reply_text'] or '').strip() != 'GO':
        raise ValueError('trusted notification record contains no exact GO reply')
    ask_text = (row['ask_text'] or '').lower()
    if (f'jevbench v1.6.0' not in ask_text or f'preview card #{PREVIEW_CARD_ID}' not in ask_text or
            SOURCE_SHA256 not in ask_text):
        raise ValueError('release ask does not bind the approved preview and reviewed result source')
    try:
        matched_at = datetime.fromtimestamp(float(row['matched_at']), timezone.utc)
    except (TypeError, ValueError, OverflowError, OSError):
        raise ValueError('trusted notification record has no valid reply timestamp')
    now = now or datetime.now(timezone.utc)
    if matched_at.date() < RELEASE_NOT_BEFORE or now.date() < RELEASE_NOT_BEFORE:
        raise ValueError('v1.6.0 cannot be finalized for release before Monday 5 October 2026')
    if matched_at > now:
        raise ValueError('trusted notification reply timestamp is in the future')
    return row['matched_reply_id']


def load_release_go(ask_id):
    try:
        db = sqlite3.connect(f'file:{NOTIFY_REPLY_DB}?mode=ro', uri=True)
        db.row_factory = sqlite3.Row
        try:
            row = db.execute(
                'SELECT ask_id, channel, status, job_dir, ask_text, matched_reply_id, matched_at, reply_text, ack_at '
                'FROM actions WHERE ask_id = ?', (ask_id,),
            ).fetchone()
            return validate_release_go_record(row, ask_id)
        finally:
            db.close()
    except sqlite3.Error as exc:
        raise ValueError('cannot read the trusted notify reply ledger') from exc


def make_carry_row(row, pub):
    axes = row['axes']
    return {
        'key': row['key'], 'display': row['display'], 'author': row.get('author'),
        'class': row.get('class'), 'open': row.get('open'), 'licence': row.get('licence'),
        'repo': row.get('repo'), 'endpoint_kind': row.get('endpoint_kind'),
        'api_flag': row.get('api_flag'), 'axes': axes,
        'capability': (axes['intelligence'] + axes['calibration']) / 2,
        'composite_v15': row['jevbench_score'], 'v156_rank': row.get('rank'),
        'cost': row.get('cost'),
        'speed': {k: (row.get('speed') or {}).get(k) for k in ['p50_s_adjusted', 'p95_s_adjusted', 'n', 'adjustment']},
        'measured_revision': pub['revision'],
        'measured_label': f"measured on {pub['revision']} ({pub['published_on']})",
        'date_basis': 'publication day of the release that first published this measurement (merge into main)',
        'carried_from': 'v1.5.6',
        'note': 'Hosted API retained at its v1.5.6 score; it was not sent the v1.6.0 API subset under the three-refresh exposure cadence.',
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--release-go-ask-id', type=int, required=True,
                        help='Telegram ask id; reply is verified from the trusted notify action ledger')
    args = parser.parse_args()
    try:
        reply_id = load_release_go(args.release_go_ask_id)
    except ValueError as exc:
        raise SystemExit(str(exc))

    values = {name: json.loads(path.read_text(encoding='utf-8')) for name, path in FILES.items()}
    results, categories, carry = values['results'], values['categories'], values['carry']
    previous = json.loads(PREVIOUS.read_text(encoding='utf-8'))
    if (results.get('benchmark'), results.get('revision'), results.get('protocol')) != ('JevBench', 'v1.6.0', 'jevbench::v1.6'):
        raise SystemExit('unexpected results identity')
    if (results.get('provisional'), results.get('status'), results.get('run_kind')) != (True, 'preview-not-published', 'diagnostic'):
        raise SystemExit('results are not the reviewed pre-release candidate')
    if results.get('source_sha256') != SOURCE_SHA256 or results.get('noul_method', {}).get('applied') != 'O1S':
        raise SystemExit('scorer source or selected method changed; require a new review')
    if categories.get('revision') != 'v1.6.0' or categories.get('provisional') is not True:
        raise SystemExit('unexpected category artifact identity')
    if categories.get('source_results_sha256') != SOURCE_SHA256:
        raise SystemExit('category source hash does not match the reviewed scorer result')
    if carry.get('kind') != 'dated-carry' or carry.get('revision') != 'v1.6.0' or carry.get('provisional') is not True:
        raise SystemExit('unexpected dated-carry identity')
    languages = categories.get('languages', [])
    if len(languages) != 23 or len([row for row in languages if row.get('key') != 'mixed']) != 22:
        raise SystemExit('language descriptors changed; require a new review')

    before = score_signature(results)
    measured = {row['key'] for row in results['systems']}
    carry_by_key = {row['key']: row for row in carry['rows']}
    previous_ranked = {row['key']: row for row in previous['systems'] if row.get('listing') == 'ranked' and row['key'] not in PRIVATE_KEYS}
    current_carry_keys = set(carry_by_key)
    new_carries = [row for key, row in previous_ranked.items() if key not in measured and key not in current_carry_keys]
    if {row['key'] for row in new_carries} != {'vansa-3.4'}:
        raise SystemExit(f'unexpected new v1.5.6 carry rows: {[row["key"] for row in new_carries]}')

    pub156 = published_release('1.5.6')
    carry['releases'] = [row for row in carry['releases'] if row.get('revision') != 'v1.5.6'] + [pub156]
    carry['releases'].sort(key=lambda row: row['revision'])
    carry['carried_from'] = {'revision': 'v1.5.6', 'path': pub156['path'], 'sha256': pub156['sha256']}
    carry['rule'] = ('Every ranked system of the live v1.5.6 board that is not measured on the v1.6.0 pool keeps its last published score, '
                     'marked with the release that first published that measurement and that release\'s publication day. Carried rows are listed '
                     'separately and never ranked together with v1.6-measured rows.')
    rank156 = {row['key']: row.get('rank') for row in previous['systems'] if row.get('listing') == 'ranked'}
    for row in carry['rows']:
        row['carried_from'] = 'v1.5.6'
        row['v156_rank'] = rank156.get(row['key'])
    carry['rows'].extend(make_carry_row(row, pub156) for row in new_carries)
    carry['rows'].sort(key=lambda row: (-row['capability'], row['key']))

    carry_keys = {row['key'] for row in carry['rows']}
    not_measured = {row['key']: row for row in results['not_measured']}
    for row in previous.get('not_measured', []):
        key = row['key']
        if key in PRIVATE_KEYS or key in measured or key in carry_keys or key in not_measured:
            continue
        cause = row.get('reason')
        if not cause:
            cause = 'No official score was published on v1.5.6; no v1.6.0 pool result exists.'
        not_measured[key] = {
            'key': key, 'display': row.get('display', key), 'author': row.get('author'),
            'addendum': row.get('addendum'), 'status': 'not measured',
            'reason': f'No v1.6.0 score. Prior v1.5.6 catalogue: {cause}',
        }
    for row in carry['rows']:
        key = row['key']
        if key in measured or key in not_measured:
            continue
        not_measured[key] = {
            'key': key, 'display': row['display'], 'author': row.get('author'),
            'addendum': None, 'status': 'not measured',
            'reason': 'Not measured on v1.6.0; the latest published score is shown separately with its date.',
        }
    vansa = next(row for row in new_carries if row['key'] == 'vansa-3.4')
    not_measured[vansa['key']]['reason'] = 'Not sent the v1.6.0 API subset under the three-refresh exposure cadence; its v1.5.6 score is shown separately with its date.'
    results['not_measured'] = sorted(not_measured.values(), key=lambda row: row['key'])
    results['roster_count'] = len(results['systems']) + len(results['not_measured'])

    previous_public = {row['key'] for row in previous['systems'] + previous.get('not_measured', []) if row['key'] not in PRIVATE_KEYS}
    public_v16 = measured | {row['key'] for row in results['not_measured']} | carry_keys
    missing = previous_public - public_v16
    if missing:
        raise SystemExit(f'v1.6.0 release catalogue would omit public v1.5.6 rows: {sorted(missing)}')

    results.update({
        'provisional': False,
        'status': 'published',
        'run_kind': 'scheduled-refresh',
        'label': 'JevBench v1.6.0',
        'source_note': 'Official v1.6.0 scorer output from 3 Oct 2026, measured with method option B (O1S); source SHA-256 is listed.',
        'release_note': 'The language breakdown describes the main v1.6 pool. Low-count cells are flagged. Expanded uc1.1 coverage is not included and would require a separate release decision.',
    })
    for row in results['systems']:
        provenance = row.get('provenance')
        if isinstance(provenance, dict) and provenance.get('kind') == 'v1.6.0 provisional scorer output (score-provisional-3/out-O1S)':
            provenance['kind'] = 'v1.6.0 scorer output (method option B, 3 Oct 2026)'
    carry_set = {row['key'] for row in carry['rows']}
    previous_unmeasured = {row['key']: row for row in previous.get('not_measured', [])}
    for row in results['not_measured']:
        if row['key'] == 'vansa-3.4':
            row['reason'] = 'Not sent the v1.6.0 API subset under the three-refresh exposure cadence; its v1.5.6 score is shown separately with its date.'
        elif row['key'] in carry_set:
            row['reason'] = 'Not measured on v1.6.0; the latest published score is listed separately with its original date.'
        elif row['key'] in previous_unmeasured:
            cause = previous_unmeasured[row['key']].get('reason') or 'No official score was published on v1.5.6.'
            row['reason'] = f'No v1.6.0 score. Prior v1.5.6 catalogue: {cause}'
        else:
            row['reason'] = 'Not measured on v1.6.0; no official previous-release score is available to carry.'
    categories['provisional'] = False
    categories['source_results_sha256_note'] = 'SHA-256 of the scored v1.6.0 source aggregate before release packaging; the public results file has its own SHA-256.'
    categories['release_note'] = results['release_note']
    carry['provisional'] = False

    if score_signature(results) != before:
        raise SystemExit('finalization changed a score, axis, rank or capability value')
    for name, value in [('results', results), ('categories', categories), ('carry', carry)]:
        write_json(FILES[name], value)
    print(f'Finalized v1.6.0 metadata: {results["n_ranked"]} ranked; {results["roster_count"]} catalogue rows; {len(carry["rows"])} dated carries; v1.5.6 roster coverage verified.')
    print(f'v1.5.6 carry: {len(new_carries)} new ranked row(s); publication day {pub156["published_on"]}; v1.5.6 SHA-256 {pub156["sha256"]}.')


if __name__ == '__main__':
    main()
