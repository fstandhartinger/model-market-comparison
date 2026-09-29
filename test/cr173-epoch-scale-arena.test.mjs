// 2026-09-26 (CR-173, lane epoch-scale-arena): Epoch hub refresh by allow-list, SWE-Bench Pro V2, LMArena WebDev /
// Agent Arena and the Terminal-Bench 4.0 effort join.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseTerminalBenchRow, parseLmarenaLabel } from '../lib/board-identity.mjs';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

test('CR-173: an allow-listed later capture adds exactly the listed rows and fails closed when one is missing', () => {
  // Synthetic fixture, not a source claim.
  const out = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,json,tempfile,hashlib
from pathlib import Path
s=importlib.util.spec_from_file_location('c','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory() as t:
 root=Path(t)
 old=b'name,score\na,1\nb,2\n';new=b'name,score\na,1\nb,2\nc,3\nd,4\n'
 (root/'old.csv').write_bytes(old);(root/'new.csv').write_bytes(new)
 src=lambda f,b:{'file':f,'sha256':hashlib.sha256(b).hexdigest(),'url':'https://example.org/x','retrieved_at':'2026-09-26'}
 rule={'kind':'csv','name_field':'name','value_field':'score','plain_text_names':True}
 spec={'benchmark_id':'b::1','source':src('old.csv',old),'protocol':'p','parser':rule,
  'additional_sources':[{'source':src('new.csv',new),'parser':dict(rule,include_field='name',include_values=['c']),'protocol':'p2'}]}
 reg={'entries':[{'id':'b::1','scoring':{'range':[0,10],'unit':'x'}}]}
 r=m.collect({'entries':[spec]},reg,root)
 print(json.dumps(sorted(o['subject']['name'] for o in r['observations'])))
 spec['additional_sources'][0]['parser']['include_values']=['c','zz']
 try: m.collect({'entries':[spec]},reg,root)
 except ValueError as e: print('closed' if 'Listed rows missing' in str(e) else 'other')
`]).toString().trim().split('\n');
  assert.deepEqual(JSON.parse(out[0]), ['a', 'b', 'c']);
  assert.equal(out[1], 'closed');
});

test('CR-173: Terminal-Bench 4.0 reads the effort only from the row\'s own reasoning_effort in the protocol', () => {
  assert.deepEqual(parseTerminalBenchRow('uuid', 'GPT-6 Astra', 'x; source row: {"reasoning_effort":"max"}; effort=max; trials=330'), { family: 'gpt-6-astra', effort: 'max' });
  assert.deepEqual(parseTerminalBenchRow('uuid', 'GPT-6 Astra', 'no effort field'), { family: 'gpt-6-astra', effort: null });
  assert.equal(parseTerminalBenchRow('uuid', 'GPT-6 Astra Pro', '; effort=max').family, null);
  assert.equal(parseTerminalBenchRow('uuid', 'Fable 5', '; effort=high').family, 'claude-fable-5');
});

test('CR-173: LMArena labels join only by reviewed name, and preliminary rows never join', () => {
  assert.deepEqual(parseLmarenaLabel('k', 'gpt-6-astra-max', '"releaseType":null'), { family: 'gpt-6-astra', effort: 'max' });
  assert.deepEqual(parseLmarenaLabel('k', 'GPT 6 Sol (Max)', ''), { family: 'gpt-6-sol', effort: 'max' });
  assert.equal(parseLmarenaLabel('k', 'gemini-3.8-flash-high', '"releaseType":"pre_release"').family, null);
  assert.equal(parseLmarenaLabel('k', 'qwen3.8-max', '"releaseType":"co_release"').family, null);
  assert.equal(parseLmarenaLabel('k', 'claude-opus-4-7', '').family, null);
});

test('CR-173: the new GPT-6 rows are published on their exact configurations', () => {
  const obs = json('data/dataset.json').benchmark_results.observations;
  const v = (b, m) => obs.filter((o) => o.benchmark_id === b && o.subject.model_id === m).map((o) => o.value);
  assert.deepEqual(v('scale-swe-bench-pro-v2-full::snapshot-2026-09-26', 'gpt-6-astra::high'), [96.9]);
  assert.deepEqual(v('ebr-bench::snapshot-2026-09-18', 'gpt-6-sol::max'), [0.5333333333333333]);
  assert.deepEqual(v('furniture-assembly::snapshot-2026-09-26', 'gpt-6-luna::max'), [0.2833333333333333]);
  assert.deepEqual(v('frontiermath-erdos::snapshot-2026-09-26', 'gpt-6-astra::max'), [0.029411764705882353]);
  assert.deepEqual(v('terminal-bench::4.0', 'gpt-6-astra::low'), [50.61]);
  assert.deepEqual(v('lmarena-webdev::snapshot-2026-09-26', 'gpt-6-luna::max'), [1592.646721210178]);
  // HLE on Scale states no effort for GPT 6 Astra, so it stays unjoined.
  assert.ok(!obs.some((o) => o.benchmark_id.startsWith('scale-seal-hle') && String(o.subject.model_id).startsWith('gpt-6-astra')));
});
