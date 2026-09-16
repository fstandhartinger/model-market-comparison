import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseMathArenaLabel } from '../lib/board-identity.mjs';

// 2026-09-16 (iteration 80, CR-38.1). The sources are the committed captures of MathArena's competition tables for
// ArXivMath 06/2026 and BrokenArXiv 06/2026; mutations below are synthetic failure probes, never source claims.
test('MathArena parser reads the leaderboard, keeps the release-date flag and fails closed on columns or problem count', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
def load(bid):
  e=entries[bid];raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
  return raw.decode('utf-8'),e['parser']
source,spec=load('matharena-arxivmath::2026-06')
rows=m.parse(source,spec,None)
assert len(rows)==22,len(rows)
got={r['id']:r for r in rows}
assert m.numeric(got['GPT-6 Astra (max)']['accuracy'])==94.44
assert got['GPT-6 Astra (max)']['context']['released_after_competition'] is True
assert got['GPT-5.5 (xhigh)']['context']['released_after_competition'] is False
assert all('⚠' not in r['name'] for r in rows)
source2,spec2=load('matharena-brokenarxiv::2026-06')
rows2=m.parse(source2,spec2,None)
assert len(rows2)==22 and m.numeric({r['id']:r for r in rows2}['Claude-Opus-5 (max)']['accuracy'])==90.74
data=json.loads(source)
def fails(d,s,why):
  try: m.parse(json.dumps(d),s,None)
  except ValueError: return
  raise AssertionError('accepted: '+why)
d=copy.deepcopy(data);d['table']=d['table'].replace('Accuracy (± 95% CI)','Accuracy',1);fails(d,spec,'changed column')
d=copy.deepcopy(data);d['problem_table']=d['problem_table'].replace('data-problem-index="47"','data-x="47"');fails(d,spec,'47 problems')
s3=copy.deepcopy(spec);s3['require_problems']=40;fails(data,s3,'edition with another problem count')
d=copy.deepcopy(data);del d['problem_table'];fails(d,spec,'schema')
d=copy.deepcopy(data);d['table']=d['table'].replace('Model was released after competition release.','x');fails(d,spec,'unexplained warning sign')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('MathArena joins: reviewed names only, the parenthesis is the stated setting', () => {
  assert.deepEqual(parseMathArenaLabel('GPT-6 Astra (max)'), { family: 'gpt-6-astra', effort: 'max' });
  assert.deepEqual(parseMathArenaLabel('DeepSeek-v4-Flash (Max)'), { family: 'deepseek-v4-flash', effort: 'max' });
  assert.deepEqual(parseMathArenaLabel('Qwen3.8-Max'), { family: 'qwen3.8-max', effort: null }, 'a name ending in Max is a name, not a setting');
  assert.deepEqual(parseMathArenaLabel('Kimi K3 (Think)'), { family: 'kimi-k3', effort: 'think' });
  assert.deepEqual(parseMathArenaLabel('Qwen3.6-35B'), { family: null, effort: null }, 'not approximated to qwen3.6-35b-a3b');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  const arxiv = map.filter((e) => e.benchmark_id === 'matharena-arxivmath::2026-06');
  assert.equal(arxiv.length, 11);
  assert.ok(!map.some((e) => e.benchmark_id.startsWith('matharena-') && /Think|Grok 4\.5|Qwen3\.6/.test(e.source_id)), 'unreviewed settings and non-default single configurations stay unjoined');
});
