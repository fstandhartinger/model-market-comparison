#!/usr/bin/env python3
"""Package the reviewed full re-measure as a v1.6.0 release candidate.

Usage: build-jevbench-v16-overnight.py ROUND HELD_METADATA NOTES
Reads only scorer/category aggregates and run completion dates, never sealed item
content. HELD_METADATA supplies author/source metadata only, never dated carry.
Release authorization and publication stay with the release owner.
"""
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('preview', ROOT / 'scripts/build-jevbench-v16-preview.py')
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
V15 = [f'1.5.{n}' for n in range(8)]
# Hashes keep private/internal names out of shipped implementation and artifacts.
EXCLUDED_KEY_SHA256 = {'c76efc06ebec6a554f6d01d5bf159966d047d306dba25354d1ea2bc4b2f5c62e', '8ececd7f4ca275e8e9bf109e75fef21be3a666983178af5ca2d3e26d618bc281', 'a6b6bd48bc3f4dc73139283d50dff07b8e8b60978e25a87a21a36dcee13328f4', '8421608a101442b0b3f452287e5d8a1a17c390738d632632d9bd4032000720e6', '4e6ac4c9317205dd896997b1cdca84651bf38a2b1ad2ac9d4b5739887814dda0', '557b3558498974e344f6f302b435ded0f6d40ca774647b089c05c1c669822e4f'}
EXCLUDED_NAME_SHA256 = {'365df158b3cca9475c541e89692b5e472d9e2c52b07ce447d9b57ccc18d54654', '850ca8e0ec3f2106b6a230cd36a86cf163b3b005dd2b6c94eafaf604cbdf03a8', '4b8de1dae7294b9c9545bf15917418bf811c05973373f132b9642fb891652452', '37a068536b430cf7ceb9cd44d4cf245446cb17bbcc44acaca0379d008ff2aef4'}
ORIGINAL_EXCLUDED = P.excluded


def excluded(key):
    return ORIGINAL_EXCLUDED(key) or P.hashlib.sha256(key.lower().encode()).hexdigest() in EXCLUDED_KEY_SHA256


def private_name(text):
    return P.mentions_private(text) or any(P.hashlib.sha256(t.encode()).hexdigest() in EXCLUDED_NAME_SHA256
                                         for t in P.re.findall(r'[a-z0-9]+', text.lower()))


def publication(rev):
    path = f'data/raw/benchmarks/jevbench/v1.5/jevbench-v{rev}-results.json'
    commits = subprocess.check_output(['git', 'log', '--first-parent', 'origin/main', '--format=%H', '--', path], cwd=ROOT, text=True).split()
    if not commits:
        raise SystemExit(f'no publication history for {path}')
    day = subprocess.check_output(['git', 'show', '-s', '--format=%cd', '--date=format-local:%Y-%m-%d', commits[-1]],
                                  cwd=ROOT, text=True, env={**os.environ, 'TZ': 'UTC'}).strip()
    return {'revision': f'v{rev}', 'published_on': day, 'main_commit': commits[-1], 'path': path,
            'sha256': P.sha_file(ROOT / path)}


def link(row, base_models):
    if row['key'] == 'deck31b':
        return 'https://github.com/krishna-gogineni-765/deck31b'
    if row['key'] == 'deck-4b-v1-0':
        return 'https://github.com/krishna-gogineni-765/deck'
    if row['key'].startswith('wity-1'):
        return 'https://wity.alphanimble.com/'
    if row.get('repo'):
        return row['repo']
    if row['key'] == 'fastino-gliner-2-5-decide':
        return 'https://fastino.ai/'
    sources = base_models.get(row['key'], {}).get('sources', [])
    if sources:
        return sources[0]['url'].split('/blob/')[0]
    # Source unavailable in old addendum metadata: link the existing public system
    # detail page, rather than inventing a model repository.
    return 'https://benchmarkheaven.com/jev-models/' + row['key']


def main(round_dir, held_path, notes_path):
    round_dir = Path(round_dir)
    P.V15 = V15
    P.excluded = excluded
    P.release_publication = publication
    current = Path(P.OUT) / 'jevbench-v1.6.0-results.json'
    if current.exists():
        current.unlink()  # owned release candidate only; immutable source remains intact
    P.main(str(round_dir), 'out-O1S')
    files = {n: Path(P.OUT) / f'jevbench-v1.6.0-{suffix}.json'
             for n, suffix in [('results', 'results'), ('categories', 'categories'), ('carry', 'dated-carry')]}
    results, categories, carry = [json.loads(files[n].read_text()) for n in files]
    held = json.loads(Path(held_path).read_text())
    live = json.loads((ROOT / 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.7-results.json').read_text())
    prior = {s['key']: s for s in held['systems']}
    prior.update({s['key']: s for s in live['systems']})
    base_models = json.loads((ROOT / 'data/jevbench-base-models.json').read_text())['benchmarks']['jevbench']
    for s in results['systems']:
        old = prior.get(s['key'], {})
        for field in P.JOIN_FIELDS:
            if s.get(field) is None and old.get(field) is not None:
                s[field] = old[field]
        s['repo'] = link(s, base_models)
        s['provenance']['kind'] = f'v1.6.0 full re-measure ({round_dir.name}/out-O1S, O1S)'
        if old:
            s['provenance']['carried_metadata_from'] = 'v1.5.7' if s['key'] in {r['key'] for r in live['systems']} else 'author submission'
        if s['key'] in {'wity-1-off', 'wity-1-always'}:
            if s['ranked']:
                raise SystemExit('reasoning variants must remain unranked')
        for field in ['unpublished_candidate', 'preview']:
            s.pop(field, None)
    for s in results['not_measured']:
        old = prior.get(s['key'], {})
        s['repo'] = link({**old, **s}, base_models)
        s['reason'] = s['reason'].replace(' in this provisional run', '')
    for s in carry['rows']:
        # Preserve exact public carry metadata; a separate source_url provides a link.
        s['source_url'] = link(s, base_models)
        if s['key'] == 'vansa-3.4':
            s['note'] = 'Hosted API retained at its v1.5.6 score under the three-refresh exposure cadence.'
    notes = json.loads(Path(notes_path).read_text())
    notes.pop('labels', None)
    notes['exposure'] = {k: v for k, v in notes.get('exposure', {}).items() if not excluded(k) and not private_name(json.dumps(v))}
    notes['notes'] = [n for n in notes.get('notes', []) if not private_name(n) and not any(t in n for t in ['unpublished candidate', 'review only', 'held for'])]
    source = json.loads((round_dir / 'out-O1S/jevbench-v1.6.0-results.json').read_text())
    excluded_count = sum(excluded(s['key']) for s in source['systems'])
    notes['notes'].extend([
        'GPU-class deviations: reproducible recipes used the hardware listed per row, including H100 for large fast-lane decoders and RTX 6000 for the baseline; hardware differences remain in measured latency. The standard x2 + 0.15 s self-hosted adjustment is an assumption, not a hardware normalization.',
        'Jev-class caps use a fixed reference: Jev 1.13.0 as measured in v1.5 (p50 0.62 s, USD 0.0323 per 1k answers); caps = 2x (1.23 s, USD 0.0646). Jev\'s own v1.6 p50 is 0.24 s. Wity auto remains outside the latency cap and stays ranked in Composite A. OFF and ALWAYS are unranked variants of the AUTO main row.',
        f'{excluded_count} further measured candidates await a separate publication decision.'
    ])
    # A2 retirement concerns all providers, including providers whose private rows
    # are absent here. Preserve the policy/count, omit private identities.
    if notes.get('a2_note'):
        eq = results['v16']['equating_A2']
        notes['a2_note'] = (
            'The original API subset A is retired after exposure to two providers. Newly measured hosted APIs use a fresh '
            'supplementary A2 draw of 300 sealed items (150 Choice, 75 Noul, 75 Score), disjoint from S and P, with the '
            'seed committed before the draw, plus the same public P300. A2 has reached four external entities, including '
            'hosting proxies, and is retired for future draws. API A2 scores are equated using the median S+P minus A2+P '
            f"offset over {eq['pool_n']} self-hosted systems: Intelligence {eq['offsets']['I']:+.2f}, Calibration {eq['offsets']['C']:+.2f}. "
            'That pool leans toward weaker systems; its main-A offset differs from the full-pool offset by about '
            '1.8 Intelligence points, so strong API rows may have roughly ±2 points of equating bias. Bootstrap intervals '
            'cover pool resampling, not this selection effect. A2 topic and use-case radar cells cover P300 only because '
            'sealed A2 items have no topic labels; cells under 15 items are omitted. Family and language cells cover A2+P600.'
        )
    results.update(status='published', provisional=False, run_kind='scheduled-refresh', headline='A', label='JevBench v1.6.0',
                   source_note=f'Full re-measure, {round_dir.name}/out-O1S, scored {notes["scored_utc"]}; O1S (method addendum B).', overnight=notes)
    categories['provisional'] = False
    categories.pop('preview', None)
    categories['results_sha256_note'] = 'source_results_sha256 binds the scorer aggregate before release packaging; the public results have their own hash.'
    categories['lane_note'] += ' Supplementary A2 topic/use-case cells cover P300 only; family/language cells cover A2+P600.'
    carry['provisional'] = False
    # The helper uses the latest V15 source; replace only its older hard-coded
    # provenance/label, never any carried score or measurement date.
    pub = publication('1.5.7')
    carry['carried_from'] = {k: pub[k] for k in ['revision', 'path', 'sha256']}
    carry['rule'] = carry['rule'].replace('live v1.5.6', 'live v1.5.7')
    for row in carry['rows']:
        row['carried_from'] = 'v1.5.7'
    for name, value in [('results', results), ('categories', categories), ('carry', carry)]:
        P.check_aggregate_only(value, name)
        P.check_no_excluded(value, name)
        text = json.dumps(value)
        if private_name(text):
            raise SystemExit(f'private candidate identity leaked into {name}')
        for k in P.re.findall(r'"key":\s*"([^"]+)"', text):
            if excluded(k):
                raise SystemExit(f'excluded key leaked into {name}')
        files[name].write_text(json.dumps(value, indent=1, ensure_ascii=False) + '\n')
    print(f'release: {len(results["systems"])} measured, {results["n_ranked"]} ranked, {len(carry["rows"])} dated carry, {results["roster_count"]} catalogue; {excluded_count} excluded')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
