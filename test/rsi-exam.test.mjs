import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseRsiExamLabel } from '../lib/board-identity.mjs';

// 2026-09-20 (iteration 126, CR-83.1). The source is the committed capture of rsi-exam.ai's
// leaderboard page and its release write-up; every mutation below is a synthetic failure probe,
// never a source claim.
test('RSI-Exam parser reads the Full board, keeps the splits in the protocol and fails closed on the release label, task counts, ranking, vocabulary, the resource cross-check and the method statement', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['rsi-exam::0.1']
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
page=load(e['source'])
rows=m.parse(page,e['parser'],load)
assert len(rows)==15,len(rows)
got={r['id']:r for r in rows}
assert abs(m.numeric(got['GPT-6-astra [codex · max]']['score'])-0.5126)<1e-12
assert got['GPT-6-astra [codex · max]']['context']['rank']==1
# the two split panels of the same runs are protocol, never their own score
assert got['GPT-6-astra [codex · max]']['context']['scope_scores']=={'full':0.5126,'private':0.5002,'public':0.5314}
assert got['GPT-6-astra [codex · max]']['context']['scope_tasks']=={'full':88,'public':35,'private':53}
assert got['Opus 5 [claude code · max]']['context']['mean_spend_usd']==42.33
assert got['Opus 5 [claude code · max]']['harness']=='claude code'
assert got['Opus 5 [claude code · max]']['context']['stated_effort']=='max'
# a model the resource chart does not cover carries no resource figures instead of a guess
assert got['GPT-6-astra [codex · max]']['context']['mean_spend_usd'] is None
assert all(0<=r['score']<=1 for r in rows)
def fails(text,why,src=None):
  try: m.parse(text,e['parser'],load if src is None else src)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(page.replace('RSI-Exam 0.1</span>','RSI-Exam 0.2</span>'),'release label changed')
fails(page.replace('data-board="full">Full<span class="lbn">88</span>','data-board="full">Full<span class="lbn">94</span>'),'task count changed')
fails(page.replace('<text class="hlbmodel" x="56" y="91">Fable 5.1</text>','<text class="hlbmodel" x="56" y="91">Fable 5.2</text>',1),'a panel covers a different system set')
fails(page.replace('>codex · max<','>codex · ultra<'),'unlisted reasoning effort')
fails(page.replace('>claude code · max<','>claude-code · max<'),'unlisted harness')
fails(page.replace('"score": 0.464','"score": 0.474'),'resource chart disagrees with the board')
fails(page.replace('>0.5126<','>0.4126<'),'the panel is no longer ranked by its own value')
fails(page.replace('frontier-calibrated reference','calibrated reference'),'anchor label gone')
blog=load(e['parser']['method_source'])
fails(page,'method statement changed',lambda src:blog.replace('Frontier-calibrated SOTA anchor at 0.60','Frontier-calibrated SOTA anchor at 0.70'))
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('RSI-Exam joins: the agent harness never enters the identity, and a contradicted setting joins nothing', () => {
  assert.deepEqual(parseRsiExamLabel('Opus 5 [claude code · max]'), { family: 'claude-opus-5', effort: 'max' },
    'the model is joined, not the harness it was driven by');
  assert.deepEqual(parseRsiExamLabel('GLM 5.3 [claude code · max]'), { family: 'glm-5.3', effort: 'max' });
  assert.deepEqual(parseRsiExamLabel('Grok 4.6 [grok · xhigh]'), { family: 'grok-4.6', effort: 'xhigh' });
  assert.deepEqual(parseRsiExamLabel('Kimi K3 [kimi cli · max]'), { family: 'kimi-k3', effort: null },
    "the release write-up's setup table says the effort was not specified, so the label's 'max' is not a stated setting");
  assert.deepEqual(parseRsiExamLabel('Seed Evolving-0909 [claude code · max]'), { family: null, effort: null },
    'a model we do not carry is refused, never approximated');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries
    .filter((e) => e.benchmark_id === 'rsi-exam::0.1');
  assert.equal(map.length, 11, 'eleven of the fifteen rows join an exact catalog configuration');
  assert.ok(map.every((e) => /::(low|medium|high|xhigh|max|default)$/.test(e.model_id)), 'every join is an exact configuration');
  assert.ok(!map.some((e) => e.model_id.startsWith('kimi-k3')), 'Kimi K3 stays unjoined');
  assert.ok(!map.some((e) => /^qwen3\.8-max/.test(e.model_id)), 'the two Qwen rows state xhigh, which the catalog does not hold for them');
});

test('RSI-Exam is registered as its own versioned benchmark with an honest scale', () => {
  const entry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8')).entries.find((e) => e.id === 'rsi-exam::0.1');
  assert.ok(entry, 'registry entry exists');
  assert.equal(entry.category, 'Agentic');
  assert.deepEqual(entry.scoring.range, [0, 1]);
  assert.equal(entry.scoring.unit, 'points', 'a 0-1 normalised index, never rendered as a percentage');
  assert.equal(entry.scoring.higher_better, true);
  assert.match(entry.scoring.notes, /0\.60/, 'the frontier-calibrated anchor is documented');
  assert.equal(JSON.parse(readFileSync('data/benchmark-taxonomy.json', 'utf8')).benchmark_kinds['rsi-exam'], 'capability');
  assert.equal(JSON.parse(readFileSync('data/benchmaxxing-tiers.json', 'utf8')).tiers['rsi-exam'].tier, 'heldout');
});

test('RSI-Exam rows read like the rest of the page: a niche tier tag and the harness cohorts a reader knows', async () => {
  const { cohortLabel } = await import('../lib/benchmark-matrix.mjs');
  assert.equal(cohortLabel('claude code'), 'Claude Code', 'the same harness must not appear under two spellings on one page');
  assert.equal(cohortLabel('codex'), 'Codex');
  assert.equal(cohortLabel('kimi cli'), 'Kimi CLI');
  assert.equal(cohortLabel('musecode'), 'musecode', 'an unlisted harness stays as the source spells it');
  assert.equal(JSON.parse(readFileSync('data/benchmark-taxonomy.json', 'utf8')).tiers['rsi-exam'], 'niche');
});

test('RSI-Exam values are shown as the source publishes them, not as a share of tasks solved', async () => {
  const { formatValue, scoreTypeText, compatibleRow } = await import('../lib/benchmark-matrix.mjs');
  const row = { unit: 'points', range: [0, 1], higherBetter: true };
  assert.equal(formatValue(0.5126, 'points'), '0.51');
  assert.match(scoreTypeText(row), /0–1 scale, not a share of tasks solved/);
  assert.equal(compatibleRow(row), false, 'a 0-1 index never averages into a category composite');
  assert.equal(scoreTypeText({ unit: 'points', range: [0, 100], higherBetter: true }), 'Score: an index on a 0–100 scale. Higher is better.');
});
