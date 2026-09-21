import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseToolathlonVerifiedLabel } from '../lib/board-identity.mjs';

// 2026-09-20 (iteration 126, CR-30.2). The source is the committed capture of toolathlon.xyz's
// leaderboard page and its Verified release post; every mutation below is a synthetic failure probe,
// never a source claim.
test('Toolathlon-Verified parser scores only the maintainers\' own rows, keeps the run statistics, and never touches the archived board', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,re
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['toolathlon-verified::2026-06-30']
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
page=load(e['source'])
rows=m.parse(page,e['parser'],load)
assert len(rows)==25,len(rows)
got={r['id']:r for r in rows}
assert abs(got['Kimi K3 (max)']['pass_1']-76.5)<1e-9
assert got['Kimi K3 (max)']['context']=={'model':'Kimi K3 (max)','model_type':'Open-Weights','agent':'Default','evaluated_at':'2026-07-16',
  'pass_1':76.5,'stddev_across_runs':1.9,'pass_3':83.3,'pass_cubed':68.5,'mean_turns':22.8,'mean_tool_calls':39.1,'independently_evaluated':True}
# a row the board has not filled in is missing, never zero
assert got['GLM 5.3 Flash (max)']['context']['pass_3'] is None and got['GLM 5.3 Flash (max)']['pass_1']==78.4
assert all(r['context']['independently_evaluated'] for r in rows)
# the archived pre-Verified board is on the same page and must contribute nothing
archive=re.search(r'<table class="performance-table leaderboard-history-table">(.*?)</table>',page,re.S)[1]
assert len(re.findall(r'<tr',archive))>=50, 'the archived board is still on the page'
assert 'GPT-5.4-xhigh' in archive and 'GPT-5.4-xhigh' not in got, 'an archived-only row is never scored'
assert not any(r['context']['evaluated_at']<'2026-06-30' for r in rows), 'no pre-Verified row is scored'
def fails(text,why,src=None):
  try: m.parse(text,e['parser'],load if src is None else src)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(page.replace('<div class="stat-number">108</div>','<div class="stat-number">96</div>'),'task count changed')
fails(page.replace('Released June 30, 2026','Released August 1, 2026'),'release identity changed')
fails(page.replace('leaderboard-history-table','leaderboard-old-table'),'the archived board vanished from the page')
fails(page.replace('<th>Pass@3</th>','<th>Pass@2</th>'),'columns changed')
fails(page.replace('data-label="Agent">Default<','data-label="Agent">Custom<'),'unlisted agent configuration')
fails(page.replace('data-label="Model Type">Open-Weights<','data-label="Model Type">Hybrid<'),'unlisted model type')
fails(page.replace('data-label="Pass@1">76.5','data-label="Pass@1">96.5'),'the board is no longer ranked by Pass@1')
fails(page.replace('Results bearing this badge were independently evaluated by us.','Results were evaluated.'),'badge legend gone')
post=load(e['parser']['method_source'])
fails(page,'release statement changed',lambda src:post.replace('mean Pass@1 across the three runs','mean Pass@1 across the five runs'))
# a row whose check is removed is a submission, not a measurement: it is skipped, and the shrunken board fails closed
stripped=page.replace('<span class="verified-badge" aria-hidden="true" title="Evaluated by us">✓</span>','',3)
fails(stripped,'three rows lost their independent-evaluation check')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('Toolathlon-Verified joins: exact catalog configurations only, the agent configuration never enters the identity', () => {
  assert.deepEqual(parseToolathlonVerifiedLabel('Kimi K3 (max)'), { family: 'kimi-k3', effort: 'max' });
  assert.deepEqual(parseToolathlonVerifiedLabel('Qwen3.5 397B-A17B'), { family: 'qwen3.5-397b-a17b', effort: null });
  assert.deepEqual(parseToolathlonVerifiedLabel('Claude Opus 4.8 (max)'), { family: 'claude-opus-4.8', effort: 'max' });
  assert.deepEqual(parseToolathlonVerifiedLabel('anthropic/claude-opus-5'), { family: null, effort: null }, 'a slug-shaped label is not this board\'s format');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries
    .filter((e) => e.benchmark_id === 'toolathlon-verified::2026-06-30');
  // Iteration 160: 18 → 17 — `Nemotron 3 Ultra` states no setting and its family's only configuration is `::reasoning`.
  assert.equal(map.length, 17, 'seventeen of the twenty-five rows join an exact catalog configuration');
  const ids = new Set(map.map((e) => e.model_id));
  assert.ok(ids.has('kimi-k3::max') && ids.has('deepseek-v4-pro-0813::max') && ids.has('inkling::xhigh'));
  // The eight refusals: a stated setting the catalog does not hold for that family, or no setting at
  // all where the family has more than one configuration or only a non-default one. None of them is guessed.
  assert.ok(![...ids].some((id) => /^(glm-5\.3-flash|gemini-3\.5-flash-lite|hy3|inkling-small|kimi-k2\.6|kimi-k2\.5|qwen3\.5-397b-a17b|nemotron-3-ultra(-550b-a55b)?)::/.test(id)));
});

test('Toolathlon-Verified is registered as its own series, separate from the archived board', () => {
  const entry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8')).entries.find((e) => e.id === 'toolathlon-verified::2026-06-30');
  assert.ok(entry);
  assert.equal(entry.category, 'Tool-use');
  assert.equal(entry.scoring.unit, 'percent');
  assert.match(entry.scoring.notes, /not comparable|not directly comparable|different score series/);
  assert.match(entry.scoring.notes, /green check/, 'the rule that only maintainer-evaluated rows count is written down');
  assert.equal(JSON.parse(readFileSync('data/benchmark-taxonomy.json', 'utf8')).benchmark_kinds['toolathlon-verified'], 'capability');
  assert.equal(JSON.parse(readFileSync('data/benchmaxxing-tiers.json', 'utf8')).tiers['toolathlon-verified'].tier, 'headline');
});
