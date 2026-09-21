import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseToolathlonArchiveLabel } from '../lib/board-identity.mjs';

// 2026-09-21 (iteration 156, CR-37.1). The source is the committed 21 Sep capture of toolathlon.xyz's
// leaderboard page (the archived "Previous Toolathlon leaderboard") and the Verified release post; every
// mutation below is a synthetic failure probe, never a source claim.
test('Toolathlon archive parser: the maintainers\' own pre-Verified rows only, footnotes kept, the SDK-scaffold row left out', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,re
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['toolathlon::pre-verified']
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
page=load(e['source'])
rows=m.parse(page,e['parser'],load)
assert len(rows)==36,len(rows)
got={r['id']:r for r in rows}
assert got['Gemini-3.5-Flash']['context']=={'model':'Gemini-3.5-Flash','model_type':'Proprietary','agent':'Default','evaluated_at':'2026-05-19',
  'pass_1':56.5,'stddev_across_runs':2.7,'pass_3':68.5,'pass_cubed':43.5,'mean_turns':44.7,'mean_tool_calls':None,'independently_evaluated':True}
# the dagger is the page's single-run footnote, recorded rather than dropped; the double dagger leaves the label
assert got['Claude-Opus-4.7']['pass_1']==52.8 and got['Claude-Opus-4.7']['context']['source_notes'][0].startswith('† ')
assert 'GPT-5.2-xhigh' in got and got['GPT-5.2-xhigh']['context']['source_notes'][0].startswith('‡ ')
assert 'source_notes' not in got['Gemini-3.5-Flash']['context']
# rows sourced from vendor announcements (no check) are not measurements; the Claude Agent SDK row is another system
for name in ['GPT-5.5-xhigh','GPT-5.4-xhigh','Kimi-K2.6','Qwen3.6-Plus','Claude-Opus-4.6']: assert name not in got,name
assert all(r['context']['agent']=='Default' for r in rows)
# nothing from the Verified board leaks in
assert not any(r['context']['evaluated_at']>='2026-06-30' for r in rows)
def fails(text,why,src=None):
  try: m.parse(text,e['parser'],load if src is None else src)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(page.replace('Snapshot before Toolathlon-Verified · 51 models','Snapshot before Toolathlon-Verified · 52 models'),'archive description changed')
fails(page.replace('not directly comparable with the Verified results above','comparable with the Verified results above'),'comparability note changed')
fails(page.replace('Claude-Opus was evaluated once due to budget constraints.','Claude-Opus was evaluated three times.'),'footnote changed')
fails(page.replace('leaderboard-history-table','leaderboard-old-table'),'the archived board vanished')
fails(page.replace('leaderboard-current-table','leaderboard-live-table'),'the page layout changed')
fails(page.replace('<th>Pass^3</th><th># Turns</th></tr></thead><tbody><tr class="rank-1"><td class="model-name-cell" data-label="Model"><svg class="org-icon" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Gemini</title>','<th>Pass^3</th><th># Calls</th></tr></thead><tbody><tr class="rank-1"><td class="model-name-cell" data-label="Model"><svg class="org-icon" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Gemini</title>',1),'archive columns changed')
archive=re.search(r'<table class="performance-table leaderboard-history-table">(.*?)</table>',page,re.S)
mutated=archive[1].replace('data-label="Agent">Default<','data-label="Agent">Custom<',1)
assert mutated!=archive[1]
fails(page.replace(archive[1],mutated),'unlisted agent configuration on a badged row')
mutated=archive[1].replace('data-label="Pass@1">3.7<sub>','data-label="Pass@1">93.7<sub>')
assert mutated!=archive[1]
fails(page.replace(archive[1],mutated),'the archive is no longer ranked by Pass@1')
mutated=archive[1].replace('<span class="verified-badge"','<span class="x"',2)
assert mutated!=archive[1]
fails(page.replace(archive[1],mutated),'two rows lost their check and the archive shrank below its guard')
post=load(e['parser']['method_source'])
fails(page,'release statement changed',lambda src:post.replace('It preserves the original 108-task scope','It replaces the original tasks'))
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('Toolathlon archive joins: exact catalog configurations only, "thinking" is never read as a setting', () => {
  assert.deepEqual(parseToolathlonArchiveLabel('DeepSeek-V4-Pro Max'), { family: 'deepseek-v4-pro', effort: 'max' });
  assert.deepEqual(parseToolathlonArchiveLabel('GPT-5.2-xhigh'), { family: 'gpt-5.2', effort: 'xhigh' });
  assert.deepEqual(parseToolathlonArchiveLabel('GPT-5.4-mini-xhigh'), { family: 'gpt-5.4-mini', effort: 'xhigh' });
  assert.deepEqual(parseToolathlonArchiveLabel('Kimi-K2-thinking'), { family: 'kimi-k2-thinking', effort: null });
  assert.deepEqual(parseToolathlonArchiveLabel('DeepSeek-V3.2-Thinking'), { family: 'deepseek-v3.2-thinking', effort: null });
  assert.deepEqual(parseToolathlonArchiveLabel('o4-mini'), { family: 'o4-mini', effort: null });
  assert.deepEqual(parseToolathlonArchiveLabel('Kimi K3 (max)'), { family: null, effort: null }, 'the Verified board\'s format is not this one');
  assert.deepEqual(parseToolathlonArchiveLabel('anthropic/claude-opus-5'), { family: null, effort: null });
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries
    .filter((e) => e.benchmark_id === 'toolathlon::pre-verified');
  assert.equal(map.length, 13, 'thirteen of the thirty-six rows join an exact catalog configuration');
  const ids = new Set(map.map((e) => e.model_id));
  for (const id of ['deepseek-v4-pro::max', 'deepseek-v4-flash::max', 'gpt-5.2::xhigh', 'gpt-5::high', 'gpt-5.1::high', 'gemini-3-flash::default', 'kimi-k2-thinking::default', 'o3::default']) assert.ok(ids.has(id), id);
  // Refusals, never guesses: a stated setting the catalog lacks, or no setting where the family has several configurations.
  assert.ok(![...ids].some((id) => /^(gpt-5\.2::high|gemini-3\.5-flash|claude-opus-4\.7|gemini-3\.1-pro|deepseek-v3\.2)/.test(id)));
});

test('The pre-Verified board is its own retained identity, never ranked against Toolathlon-Verified', () => {
  const entry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8')).entries.find((e) => e.id === 'toolathlon::pre-verified');
  assert.ok(entry);
  assert.equal(entry.family, 'toolathlon');
  assert.equal(entry.status, 'retained');
  assert.equal(entry.superseded_by, 'toolathlon-verified::2026-06-30');
  assert.match(entry.scoring.notes, /not directly comparable/);
  assert.match(entry.scoring.notes, /green check/);
  const taxonomy = JSON.parse(readFileSync('data/benchmark-taxonomy.json', 'utf8'));
  assert.equal(taxonomy.benchmark_kinds.toolathlon, 'capability');
  assert.equal(taxonomy.tiers.toolathlon, 'headline');
  assert.equal(JSON.parse(readFileSync('data/benchmaxxing-tiers.json', 'utf8')).tiers.toolathlon.tier, 'headline');
  assert.equal(JSON.parse(readFileSync('data/lumina-feed-policy.json', 'utf8')).family_decisions.toolathlon.decision, 'in_registry');
});
