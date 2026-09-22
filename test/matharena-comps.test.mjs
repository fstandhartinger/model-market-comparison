import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { parseMathArenaLabel } from '../lib/board-identity.mjs';

// 2026-09-22 (iteration 161, CR-37.1): MathArena's HMMT and Apex competitions, the primary boards behind
// Lumina's aggregator-only HMMT/Apex families. The sources are the committed captures of 2026-09-22; the
// mutations below are synthetic failure probes, never source claims.
const BOARDS = {
  'matharena-hmmt::2026-02': { rows: 31, refused: ['Qwen3.5-4B'], joins: 7 },
  'matharena-hmmt::2025-11': { rows: 23, refused: [], joins: 10 },
  'matharena-apex::2025': { rows: 48, refused: [], joins: 16 },
  'matharena-apex-shortlist::2025': { rows: 38, refused: ['Qwen3.5-4B', 'Qwen3.5-2B'], joins: 13 },
  // 2026-09-22 (iteration 162): AIME 2026, the independent board behind Lumina's aime-2026 family.
  'matharena-aime::2026': { rows: 31, refused: ['Qwen3.5-4B'], joins: 7 },
  // USAMO 2026: proofs graded by MathArena's LLM judges, so the board is Judged.
  'matharena-usamo::2026': { rows: 9, refused: [], joins: 4 },
};

test('MathArena competitions: rows, published values, and item-response-theory estimates refused', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
def load(bid):
  e=entries[bid];raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
  return raw.decode('utf-8'),e['parser']
out={}
for bid in ['matharena-hmmt::2026-02','matharena-hmmt::2025-11','matharena-apex::2025','matharena-apex-shortlist::2025','matharena-aime::2026','matharena-usamo::2026']:
  src,spec=load(bid);rows=m.parse(src,spec,None)
  assert spec['predicted_scores']=='reject'
  out[bid]={'measured':[r['id'] for r in rows if r['accuracy'] is not None],'refused':[r['id'] for r in rows if r['accuracy'] is None],
    'reasons':sorted({r.get('reject_reason','') for r in rows if r['accuracy'] is None}),
    'values':{r['id']:m.numeric(r['accuracy']) for r in rows if r['accuracy'] is not None},
    'flag':{r['id']:r['context']['released_after_competition'] for r in rows}}
# Without the reviewed rule an estimated row still fails the board, as before.
src,spec=load('matharena-hmmt::2026-02');s2=copy.deepcopy(spec);del s2['predicted_scores']
try: m.parse(src,s2,None); raise AssertionError('estimated row accepted without the rule')
except ValueError as e: assert 'estimated score' in str(e)
# The marker and its explanation must agree.
d=json.loads(src);d['table']=d['table'].replace('data-predicted="yes"','data-predicted="no"',1)
try: m.parse(json.dumps(d),spec,None); raise AssertionError('explanation without marker accepted')
except ValueError as e: assert 'disagree' in str(e)
d=json.loads(src);d['problem_table']=d['problem_table'].replace('data-problem-index="32"','data-x="32"')
try: m.parse(json.dumps(d),spec,None); raise AssertionError('33-problem edition accepted with 32')
except ValueError: pass
src,spec=load('matharena-aime::2026');assert spec['require_problems']==30
d=json.loads(src);d['problem_table']=d['problem_table'].replace('data-problem-index="29"','data-x="29"')
try: m.parse(json.dumps(d),spec,None); raise AssertionError('30-problem edition accepted with 29')
except ValueError: pass
# The collector records the refusal with its reason.
col=m.collect({'entries':[entries['matharena-apex-shortlist::2025']]},json.loads(Path('data/raw/benchmarks/registry.json').read_text()))
out['collected']=len(col['observations']);out['rejected']=col['rejected']
print(json.dumps(out))
`]).toString();
  const got = JSON.parse(output);
  for (const [bid, want] of Object.entries(BOARDS)) {
    assert.equal(got[bid].measured.length, want.rows, `${bid} measured rows`);
    assert.deepEqual(got[bid].refused, want.refused, `${bid} refused rows`);
  }
  assert.deepEqual(got['matharena-apex-shortlist::2025'].reasons, ['MathArena did not run this model on every problem; its accuracy includes item-response-theory estimates for the rest, so it is not a measurement.']);
  // Values as the tables print them (re-read from the captures independently of the parser on 2026-09-22).
  assert.equal(got['matharena-hmmt::2026-02'].values['GPT-5.5 (xhigh)'], 98.48);
  assert.equal(got['matharena-hmmt::2026-02'].values['Claude-Opus-4.8 (max)'], 95.45);
  assert.equal(got['matharena-hmmt::2025-11'].values['GPT-5.2 (xhigh)'], 99.17);
  assert.equal(got['matharena-apex::2025'].values['Claude-Opus-4.8 (max)'], 81.25);
  assert.equal(got['matharena-apex::2025'].values['Kimi K2 Thinking'], 0);
  assert.equal(got['matharena-apex-shortlist::2025'].values['GPT-5.5 (xhigh)'], 98.4);
  assert.equal(got['matharena-hmmt::2026-02'].flag['GPT-5.2 (high)'], false);
  assert.equal(got['matharena-hmmt::2026-02'].flag['GPT-5.5 (xhigh)'], true);
  assert.equal(got['matharena-aime::2026'].values['GPT-5.5 (xhigh)'], 100);
  assert.equal(got['matharena-aime::2026'].values['GPT-5.4 (xhigh)'], 99.17);
  assert.equal(got['matharena-aime::2026'].values['Gemini 3.1 Pro Preview'], 98.33);
  assert.equal(got['matharena-aime::2026'].values['Qwen3-4B-2507-Think'], 82.5);
  assert.equal(got['matharena-aime::2026'].flag['GPT-5.2 (high)'], false);
  assert.equal(got['matharena-aime::2026'].flag['Kimi K3 (Think)'], true);
  assert.equal(got['matharena-usamo::2026'].values['GPT-5.5 (xhigh)'], 98.21);
  assert.equal(got['matharena-usamo::2026'].values['GLM 5'], 35.12);
  assert.equal(got.collected, 38);
  assert.deepEqual(got.rejected.map((r) => r.source_id), ['Qwen3.5-4B', 'Qwen3.5-2B']);
});

test('MathArena competitions: exact joins only, deprecated boards are retained', () => {
  assert.deepEqual(parseMathArenaLabel('GPT OSS 120B (high)'), { family: 'gpt-oss-120b', effort: 'high' });
  assert.deepEqual(parseMathArenaLabel('Step 3.5 Flash'), { family: null, effort: null }, 'a dated Step 3.5 Flash family exists too');
  assert.deepEqual(parseMathArenaLabel('Gemini 3 Flash'), { family: null, effort: null }, 'a preview family of that name exists too');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  for (const [bid, want] of Object.entries(BOARDS)) assert.equal(map.filter((e) => e.benchmark_id === bid).length, want.joins, `${bid} joins`);
  const joined = (bid, source) => map.find((e) => e.benchmark_id === bid && e.source_id === source)?.model_id ?? null;
  assert.equal(joined('matharena-hmmt::2025-11', 'GPT-5.2 (xhigh)'), 'gpt-5.2::xhigh');
  assert.equal(joined('matharena-hmmt::2026-02', 'GPT-5.2 (high)'), null, 'the catalog has no gpt-5.2::high');
  assert.equal(joined('matharena-hmmt::2026-02', 'Kimi K3 (Think)'), null, 'Think is not a reviewed setting');
  assert.equal(joined('matharena-apex::2025', 'Claude-Opus-4.7 (xhigh)'), null, 'no claude-opus-4.7::xhigh configuration');
  assert.equal(joined('matharena-apex::2025', 'Grok 4'), 'grok-4::default');
  assert.equal(joined('matharena-aime::2026', 'Gemini 3.1 Pro Preview'), 'gemini-3.1-pro-preview::default');
  assert.equal(joined('matharena-aime::2026', 'Gemini 3.6 Flash'), null, 'no setting stated and the catalog configuration is high, not default');
  assert.equal(joined('matharena-aime::2026', 'Claude-Opus-4.6 (High)'), null, 'no claude-opus-4.6::high configuration');
  assert.equal(joined('matharena-aime::2026', 'DeepSeek-v4-Flash (Max)'), 'deepseek-v4-flash::max');
  assert.equal(joined('matharena-usamo::2026', 'DeepSeek-v4-Pro (Max)'), 'deepseek-v4-pro::max');
  assert.equal(joined('matharena-usamo::2026', 'Kimi K2.6 (Think)'), null, 'Think is not a reviewed setting');
  // The undated DeepSeek labels are the original V4 releases: MathArena's own model configs say so (codex review).
  assert.equal(joined('matharena-apex::2025', 'DeepSeek-v4-Pro (Max)'), 'deepseek-v4-pro::max');
  const cfgDir = 'data/raw/benchmarks/daily-evidence/2026-09-22-matharena-config';
  const configs = readdirSync(cfgDir).filter((f) => f.endsWith('.gz')).map((f) => gunzipSync(readFileSync(`${cfgDir}/${f}`)).toString());
  for (const [label, repo] of [['DeepSeek-v4-Pro (Max)', 'deepseek-ai/DeepSeek-V4-Pro'], ['DeepSeek-v4-Flash (Max)', 'deepseek-ai/DeepSeek-V4-Flash']]) {
    const cfg = configs.find((c) => c.includes(`human_readable_id: ${label}`));
    assert.ok(cfg && cfg.includes('date: "2026-04-24"') && new RegExp(`huggingface_id: ${repo}\\s*$`, 'm').test(cfg), label);
  }
  const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8')).entries;
  const policy = JSON.parse(readFileSync('data/lumina-feed-policy.json', 'utf8')).family_decisions;
  for (const bid of Object.keys(BOARDS)) {
    const e = registry.find((r) => r.id === bid);
    assert.equal(e.status, 'retained', `${bid}: MathArena marks the competition Deprecated`);
    assert.ok(e.evidence.some((p) => /Deprecated/.test(p.excerpt)), `${bid}: the Deprecated badge is quoted`);
  }
  for (const [slug, bid] of [['benchlm-hmmtfeb2026', 'matharena-hmmt::2026-02'], ['benchlm-hmmtnov2025', 'matharena-hmmt::2025-11'],
    ['benchlm-apex', 'matharena-apex::2025'], ['benchlm-apexshortlist', 'matharena-apex-shortlist::2025'], ['aime-2026', 'matharena-aime::2026'], ['usamo-2026', 'matharena-usamo::2026']]) {
    assert.deepEqual(policy[slug].benchmark_ids, [bid]);
    assert.equal(policy[slug].decision, 'in_registry');
  }
});

test('MathArena USAMO 2026: judged, and the grading method is quoted from MathArena configuration', () => {
  const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8')).entries;
  const e = registry.find((r) => r.id === 'matharena-usamo::2026');
  const caveats = JSON.parse(readFileSync('data/benchmark-caveats.json', 'utf8'));
  assert.ok(e.scoring.metric.includes(caveats.judged['matharena-usamo'].quote));
  const tiers = JSON.parse(readFileSync('data/benchmaxxing-tiers.json', 'utf8'));
  assert.equal(JSON.stringify(tiers).includes('"matharena-usamo":{"tier":"judged"'), true);
  const body = (f) => gunzipSync(readFileSync(f)).toString();
  const dir = 'data/raw/benchmarks/daily-evidence/2026-09-22-matharena-usamo';
  for (const p of e.evidence.filter((x) => x.file.startsWith(dir))) {
    assert.ok(body(p.file).replace(/\s+/g, ' ').includes(p.excerpt.replace(/\s+/g, ' ')), `${p.file}: excerpt is in the capture`);
  }
  const all = readdirSync(dir).filter((f) => f.endsWith('.gz')).map((f) => body(`${dir}/${f}`));
  assert.ok(all.some((c) => /judge_configs:\s*- judges\/main_judge/.test(c) && /n_problems: 6/.test(c)), 'usamo_2026.yaml names the main judge');
  assert.ok(all.some((c) => /gemini\/gemini-31-pro\s/.test(c) && /anthropic\/opus_46/.test(c) && /openai\/gpt-54/.test(c)), 'main_judge.yaml names the three judge models');
});
