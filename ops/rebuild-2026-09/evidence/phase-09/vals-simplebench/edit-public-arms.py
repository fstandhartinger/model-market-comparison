#!/usr/bin/env python3
"""CR-173 (vals-simplebench), 2026-09-26: rebind the Vals Index arm and open the new SimpleBench dated identity.

Run from the repo root. Edits data/raw/benchmarks/{collection-plan,registry}.json in place; idempotent.

1. Vals Index v2 (nine boards, one page). The plan's protocol said "Vals Index v2 (updated 2026-09-10)"; the page
   has since been re-dated by Vals (metadata.updated 2026-09-23, "Updated 9/23/2026") while metadata.version stays
   "2". The 2026-09-25 daily's score critic therefore rejected the changed rows of four sub-boards (EMB, Vibe Code
   Bench, Legal Research, Harvey's Legal Agent Benchmark), which is why GPT-6 Sol/Luna, Grok 4.7 and Opus 5.5 are
   missing there. The identity is the version, not the page date, so the protocol now states the version guard and
   leaves the page date to each row's own capture. Source: our 2026-09-26 capture (bytes identical to 2026-09-25).
2. SimpleBench. simple-bench::snapshot-2026-09-10 is a dated identity; the 2026-09-26 capture adds Claude Opus 5.5,
   GPT-6 Sol and DeepSeek V4.1 Flash (dateAdded 2026-09-12/24). Per CR-34.2 / D202 a newer capture becomes a new
   dated identity: simple-bench::snapshot-2026-09-26. The old identity is retained (superseded_by), its plan entry
   becomes a manual retained snapshot. Maintainer corrected to the primary source's byline "SimpleBench Team"
   (the 2026-09-25 daily protocol critic's only finding).
"""
import json, hashlib, gzip, copy
from pathlib import Path

EV = 'data/raw/benchmarks/daily-evidence/2026-09-26-vals-simplebench'
man = {r['url']: r for r in json.loads(Path(EV + '/capture/manifest.json').read_text())}
def receipt(url):
    r = dict(man[url]); r['file'] = EV + '/' + r['file']
    raw = gzip.decompress(Path(r['file']).read_bytes())
    assert hashlib.sha256(raw).hexdigest() == r['sha256'], url
    return {'url': url, 'file': r['file'], 'sha256': r['sha256'], 'retrieved_at': r['retrieved_at']}

plan_path, reg_path = Path('data/raw/benchmarks/collection-plan.json'), Path('data/raw/benchmarks/registry.json')
plan, reg = json.loads(plan_path.read_text()), json.loads(reg_path.read_text())

# 1. Vals Index
vals = receipt('https://www.vals.ai/benchmarks/vals_index')
OLD = 'Vals Index v2 (updated 2026-09-10), '
NEW = 'Vals Index v2 (source metadata.version "2"; Vals re-dates the page when it adds models, so the page date is carried by each row\'s own capture, not by this identity), '
for e in plan['entries']:
    if e['benchmark_id'].startswith('vals-index'):
        e['source'] = dict(vals)
        if e['protocol'].startswith(OLD): e['protocol'] = NEW + e['protocol'][len(OLD):]
        assert e['protocol'].startswith(NEW), e['benchmark_id']

# 2. SimpleBench
OLD_ID, NEW_ID = 'simple-bench::snapshot-2026-09-10', 'simple-bench::snapshot-2026-09-26'
data = receipt('https://simple-bench.com/static/js/leaderboard-data.js')
home = receipt('https://simple-bench.com/')
home_raw = gzip.decompress(Path(home['file']).read_bytes()).decode()
assert 'SimpleBench Team' in home_raw and 'temperature: 0.7, top-p: 0.95 (except o1 series)' in home_raw

old_entry = next(e for e in reg['entries'] if e['id'] == OLD_ID)
if not any(e['id'] == NEW_ID for e in reg['entries']):
    new = copy.deepcopy(old_entry)
    new.update(id=NEW_ID, version='snapshot-2026-09-26', status='active', superseded_by=None,
               first_seen='2026-09-26', last_verified='2026-09-26', maintainer='SimpleBench Team')
    new['how_to_collect'] = dict(old_entry['how_to_collect'],
        command='python3 scripts/capture-benchmark-sources.py URL_LIST.json CAPTURE_DIR  # URL_LIST: https://simple-bench.com/static/js/leaderboard-data.js and https://simple-bench.com/',
        locator="static/js/leaderboard-data.js, array `leaderboardData` (the MCQ tab; the separately named `openEndedData` board and the human rows are excluded): field `score` per `model`; settings stated on the homepage as 'temperature: 0.7, top-p: 0.95 (except o1 series)'.",
        version_guard='Dated snapshot of the 2026-09-26 capture. Same MCQ AVG@5 protocol as snapshot-2026-09-10; a later capture with new rows becomes a new dated identity in a reviewed change (CR-34.2), a changed task set, metric or settings a new benchmark identity.')
    new['evidence'] = [
        {'url': 'https://simple-bench.com/', 'file': home['file'], 'sha256': hashlib.sha256(Path(home['file']).read_bytes()).hexdigest(),
         'fetched_at': home['retrieved_at'], 'source_sha256': home['sha256'],
         'excerpt': 'SimpleBench Where Everyday Human Reasoning Still Surpasses Frontier Models SimpleBench Team ... benchmark settings temperature: 0.7, top-p: 0.95 (except o1 series)'},
        {'url': data['url'], 'file': data['file'], 'sha256': hashlib.sha256(Path(data['file']).read_bytes()).hexdigest(),
         'fetched_at': data['retrieved_at'], 'source_sha256': data['sha256'],
         'excerpt': '{ rank: "15th", model: "GPT-6 Sol", score: "73.1%", organization: "OpenAI", dateAdded: "2026-09-24" }'},
    ]
    reg['entries'].insert(reg['entries'].index(old_entry) + 1, new)
old_entry.update(status='retained', superseded_by=NEW_ID, maintainer='SimpleBench Team')

old_plan = next(e for e in plan['entries'] if e['benchmark_id'] == OLD_ID)
if not any(e['benchmark_id'] == NEW_ID for e in plan['entries']):
    new_plan = copy.deepcopy(old_plan)
    new_plan.update(benchmark_id=NEW_ID, source=dict(data),
        reason='SimpleBench MCQ leaderboard data file (static/js/leaderboard-data.js), captured 2026-09-26.',
        protocol='SimpleBench MCQ AVG@5 board only (temperature 0.7, top-p 0.95 except o1 series); human baselines and open-ended board excluded.')
    new_plan['recipe'] = dict(old_plan['recipe'], locator=new['how_to_collect']['locator'], version_guard=new['how_to_collect']['version_guard'])
    new_plan['version_guard'] = new['how_to_collect']['version_guard']
    plan['entries'].insert(plan['entries'].index(old_plan) + 1, new_plan)
# The retained identity keeps its 2026-09-10 rows and bytes; the daily must not rewrite a dated snapshot.
old_plan['refresh'] = 'manual'
old_plan['reason'] = 'Retained dated snapshot (2026-09-10 capture), superseded by simple-bench::snapshot-2026-09-26 in CR-173; its rows stay bound to the 2026-09-10 bytes.'

plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
reg_path.write_text(json.dumps(reg, ensure_ascii=False, indent=2) + '\n')
print('ok')
