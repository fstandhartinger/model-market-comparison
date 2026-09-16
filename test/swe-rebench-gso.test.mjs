import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseSweRebenchLabel, parseGsoId, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-16 (iteration 81, CR-38.1). Sources are the committed SWE-rebench one-window extraction (page captured
// 2026-09-16) and GSO's leaderboard.json; mutations below are synthetic failure probes, never source claims.
const pyParse = (benchmarkId, body) => execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entry=next(e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id']==${JSON.stringify(benchmarkId)})
raw=gzip.decompress(Path(entry['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==entry['source']['sha256']
source=raw.decode('utf-8');spec=entry['parser'];data=json.loads(source)
rows=m.parse(source,spec,None)
def fails(d,why):
  try: m.parse(json.dumps(d),spec,None)
  except ValueError: return
  raise AssertionError('accepted: '+why)
${body}
print('ok')
`]).toString().trim();

test('SWE-rebench parser reads exactly the pinned window, skips agent products and re-derives the contamination marker', () => {
  assert.equal(pyParse('swe-rebench::2026-05-15..2026-07-01', String.raw`
assert len(rows)==13,len(rows)
got={r['name']:r['resolved_rate'] for r in rows}
# The page's default table at capture: Fable 5 [high] 64.5, Opus 5 [high] 63.4, GPT-5.6 Sol [medium] 62.3, Qwen3.5-35B-A3B 17.1.
assert got['Fable 5 [high]']==64.5 and got['Opus 5 [high]']==63.4 and got['GPT-5.6 Sol [medium]']==62.3 and got['Qwen3.5-35B-A3B']==17.1
assert not any(n in got for n in ['Claude Code','Codex','Junie','Cursor'])
ctx={r['name']:r['context'] for r in rows}
assert ctx['Fable 5 [high]']['potential_contamination'] is True and ctx['DeepSeek-V4 Pro [high]']['potential_contamination'] is False
assert all(c['tasks']==111 and c['window']=='2026-05-15..2026-07-01' for c in ctx.values())
d=copy.deepcopy(data);d['problems']=d['problems'][:-1];fails(d,'problem count')
d=copy.deepcopy(data);d['window']['from']='2026-06-01';fails(d,'another window')
d=copy.deepcopy(data);d['window']['default_window']=False;fails(d,'not the rendered window')
d=copy.deepcopy(data);next(r for r in d['rendered_rows'] if r['name']=='Fable 5 [high]')['markers']=[];fails(d,'contamination marker disagreement')
d=copy.deepcopy(data);next(r for r in d['rendered_rows'] if r['name']=='Codex')['markers']=[];fails(d,'agent without external-system marker')
d=copy.deepcopy(data);del next(i for i in d['items'] if i['meta']['instance_type']=='model')['window_stats']['resolvedRate'];fails(d,'missing resolved rate')
`), 'ok');
});

test('GSO parser keeps Opt@1 rows only and fails closed on a changed task count or an unknown setting', () => {
  assert.equal(pyParse('gso::opt1-102', String.raw`
assert len(rows)==28,len(rows)
assert len({r['id'] for r in rows})==28
got={r['id']:r['score'] for r in rows}
assert got['Claude Opus 4.8|xhigh|OpenHands|2026-07-12']==47.06
assert got['GPT 5.4|high|OpenHands|2026-03-10']==25.49
# Opt@10 (Claude Sonnet 3.5 V2 15.7, O4 Mini 12.7) is another protocol.
assert 15.7 not in got.values() and 12.7 not in got.values()
assert next(r for r in rows if r['id'].startswith('Claude Sonnet 5|'))['context']['score_hack_adjusted']==36.27
d=copy.deepcopy(data);d['metadata']['total_tasks']=120;fails(d,'task count')
d=copy.deepcopy(data);d['models'][0]['setting']='Opt@5';fails(d,'unknown setting')
d=copy.deepcopy(data);del d['models'][0]['date'];fails(d,'missing run date')
`), 'ok');
});

test('SWE-rebench and GSO joins: exact stated setting, no setting only for a single default, unreviewed names refused', () => {
  assert.deepEqual(parseSweRebenchLabel('Fable 5 [high]__tools'), { family: 'claude-fable-5', effort: 'high' });
  assert.deepEqual(parseSweRebenchLabel('MiniMax M3__tools'), { family: 'minimax-m3', effort: null });
  assert.deepEqual(parseSweRebenchLabel('Kimi K2.6__tools'), { family: null, effort: null });
  assert.deepEqual(parseGsoId('GPT 5.4|xhigh|OpenHands|2026-03-10'), { family: 'gpt-5.4', effort: 'xhigh' });
  assert.deepEqual(parseGsoId('Gemini 3 Flash||OpenHands|2025-12-19'), { family: null, effort: null }, 'preview vs release is not guessed');
  const catalog = [
    { id: 'glm-5.2::max', family_key: 'glm-5.2', variant: 'max' },
    { id: 'minimax-m3::default', family_key: 'minimax-m3', variant: 'default' },
    { id: 'qwen3.6-27b::reasoning', family_key: 'qwen3.6-27b', variant: 'reasoning' },
    { id: 'qwen3.6-27b::non-reasoning', family_key: 'qwen3.6-27b', variant: 'non-reasoning' },
  ];
  const rows = ['GLM-5.2 [high]__tools', 'MiniMax M3__tools', 'Qwen3.6-27B__tools'].map((source_id) => ({ source_id }));
  assert.deepEqual(boardJoins(rows, parseSweRebenchLabel, catalog).map((j) => j.model_id), [null, 'minimax-m3::default', null]);
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  assert.equal(map.filter((e) => e.benchmark_id === 'swe-rebench::2026-05-15..2026-07-01').length, 8);
  assert.equal(map.filter((e) => e.benchmark_id === 'gso::opt1-102').length, 10);
  assert.ok(map.some((e) => e.source_id === 'Opus 5 [high]__tools' && e.model_id === 'claude-opus-5::high'));
});
