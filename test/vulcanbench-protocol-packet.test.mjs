import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { buildPacket, GAUNTLET_LIMITS, normalizeCriteria } from '../ops/daily/gauntlet.mjs';
import { protocolSourceContent, protocolSourceLocator, protocolReviewRow, PROTOCOL_REVIEW_CRITERIA } from '../ops/daily/refresh-benchmarks.mjs';

const root = new URL('..', import.meta.url);
const entry = JSON.parse(readFileSync(new URL('data/raw/benchmarks/registry.json', root))).entries.find(e => e.id === 'vulcanbench-frontier::4');
// A daily capture has one current receipt per URL. Use the newest retained fixture for each URL,
// including old references to today's leaderboard; every immutable source is hash-checked first.
const receipts = new Map(entry.evidence.map(r => [r.url, r]));
const historical = JSON.parse(readFileSync(new URL('test/fixtures/vulcanbench-protocol-packet/pre-repair-evidence.json', root))).evidence;
const extract = (reference, recipe = reference.recipe) => {
  const receipt = receipts.get(reference.url);
  const stored = readFileSync(new URL(receipt.file, root));
  const bytes = stored[0] === 0x1f && stored[1] === 0x8b ? gunzipSync(stored) : stored;
  assert.ok([stored, bytes].some(b => createHash('sha256').update(b).digest('hex') === receipt.sha256),
    `fixture differs from its recorded compressed-file or source-byte digest: ${receipt.url}`);
  return execFileSync('python3', ['ops/daily/public-candidate.py', 'text', receipt.file, ...(recipe ? [recipe] : [])],
    { cwd: root, encoding: 'utf8', maxBuffer: 16_000_000 });
};

test('VulcanBench complete protocol evidence fits the unchanged daily review packet bound', () => {
  const sources = entry.evidence.filter(r => !r.source_sha256 && !/literal field/.test(r.excerpt ?? '')).map(reference => ({
    ...receipts.get(reference.url), content: protocolSourceContent(entry.id, reference, extract(reference)), locator: protocolSourceLocator(reference),
  }));
  const packet = buildPacket({ artifactId: 'protocol-vulcanbench-frontier-4', artifactSha256: '0'.repeat(64), round: 1,
    producers: [], rows: [protocolReviewRow(entry)], sources, criteria: normalizeCriteria(PROTOCOL_REVIEW_CRITERIA), limits: GAUNTLET_LIMITS });
  assert.ok(Buffer.byteLength(packet) <= 262_144);
  console.log(`VulcanBench protocol packet: ${Buffer.byteLength(packet)} bytes; ${sources.length} sources`);
});

test('the original unprojected packet reproduces the exact overflow', () => {
  const sources = historical.map(reference => ({...receipts.get(reference.url),
    content: protocolSourceContent(entry.id, reference, extract(reference, null)), locator: protocolSourceLocator(reference)}));
  assert.throws(() => buildPacket({artifactId:'protocol-vulcanbench-frontier-4',artifactSha256:'0'.repeat(64),round:1,
    producers:[],rows:[protocolReviewRow(entry)],sources,criteria:normalizeCriteria(PROTOCOL_REVIEW_CRITERIA),limits:GAUNTLET_LIMITS}),
    /Frozen packet exceeds the 262144-byte bound/);
});

test('every superseded capture remains retained with its original receipt and digest', () => {
  assert.equal(historical.length, 46);
  for (const reference of historical) {
    const stored=readFileSync(new URL(reference.file,root));
    const native=reference.file.endsWith('.gz') ? gunzipSync(stored) : stored;
    assert.ok([stored,native].some(b => createHash('sha256').update(b).digest('hex') === reference.sha256), reference.file);
  }
});

test('every judge bundle keeps all native fields, including settings, prompts and unknown additions', () => {
  for (const reference of entry.evidence.filter(r => r.url.endsWith('/judge-protocols.json'))) {
    assert.equal(reference.recipe, 'json-compact');
    assert.deepEqual(JSON.parse(extract(reference)), JSON.parse(extract(reference, null)));
  }
});

test('each historical run export retains every native task/protocol pair and its count', () => {
  for (const reference of entry.evidence.filter(r => r.url.endsWith('/runs.csv'))) {
    assert.equal(reference.recipe, 'vulcanbench-task-protocols');
    const actual = JSON.parse(extract(reference)).native_task_protocol_counts;
    const raw = execFileSync('python3', ['-c', `import csv,gzip,json,collections,sys
from pathlib import Path
p=Path(sys.argv[1]); b=p.read_bytes(); b=gzip.decompress(b) if p.suffix=='.gz' else b
rows=list(csv.DictReader(b.decode('utf-8-sig').splitlines()))
counts=collections.Counter((r['task'],r['judged_under']) for r in rows)
print(json.dumps([{'task':t,'judged_under':p,'run_count':n} for (t,p),n in counts.items()]))`, reference.file], {cwd: root, encoding: 'utf8'});
    assert.deepEqual(actual, JSON.parse(raw));
    assert.equal(new Set(actual.map(r => r.task)).size, 23);
  }
});

test('new tasks and changed protocols survive the projection; malformed exports fail closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vulcan-protocol-'));
  const path = join(dir, 'runs.csv');
  const project = body => {
    writeFileSync(path, body);
    return execFileSync('python3', ['ops/daily/public-candidate.py', 'text', path, 'vulcanbench-task-protocols'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  };
  try {
    assert.deepEqual(JSON.parse(project('task,judged_under,score\na,v3.29,10\na,v3.29,20\na,v3.30,30\nb,v3.29,40\n')).native_task_protocol_counts,
      [{task:'a',judged_under:'v3.29',run_count:2},{task:'a',judged_under:'v3.30',run_count:1},{task:'b',judged_under:'v3.29',run_count:1}]);
    for (const body of ['task,score\na,1\n', 'task,judged_under\na,\n', 'task,judged_under\n', 'task,judged_under\na,v3.29,surplus\n']) assert.throws(() => project(body));
    assert.equal(JSON.parse(project('task,judged_under,judged\na,v3.29,False\na,v3.29,True\n')).native_task_protocol_counts[0].run_count,2);
    writeFileSync(path, JSON.stringify({known:{seed:42}, future:{judge:'changed'}, array:[1,2]}));
    assert.deepEqual(JSON.parse(execFileSync('python3', ['ops/daily/public-candidate.py','text',path,'json-compact'], {cwd:root,encoding:'utf8'})),
      {known:{seed:42}, future:{judge:'changed'}, array:[1,2]});
  } finally { rmSync(dir, {recursive:true,force:true}); }
});

test('every bounded report excerpt is checked against its capture and rejects changed text', () => {
  for (const reference of entry.evidence.filter(r => r.review_content === 'excerpt')) {
    assert.equal(protocolSourceContent(entry.id, reference, extract(reference)), reference.excerpt.replace(/\s+/g,' ').trim());
    assert.throws(() => protocolSourceContent(entry.id, reference, 'changed primary page'), /methodology passage changed/);
  }
});

test('Frontier notes include all current coverage/fallback/judge footnotes and reject a missing boundary', () => {
  const reference=entry.evidence.find(r => r.recipe==='vulcanbench-frontier-notes');
  const notes=extract(reference);
  for (const text of ['71.94','67.26','11 disclosed Opus 4.8 fallbacks','not strictly comparable','v3.29','formerly VulcanBench-SWE v4']) assert.ok(notes.includes(text),text);
  const dir=mkdtempSync(join(tmpdir(),'vulcan-notes-')); const path=join(dir,'page.html');
  const project=html => {writeFileSync(path,html);return execFileSync('python3',['ops/daily/public-candidate.py','text',path,reference.recipe],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});};
  const html='<p class="byline">VulcanBench Frontier v4</p><p class="lb-context">Combined score; Code quality judged. NEW JUDGE CLAIM</p><section id="routine-v1-board"><p class="lb-context">UNRELATED ROUTINE</p></section>';
  try {
    const projected=project(html); assert.ok(projected.includes('NEW JUDGE CLAIM')); assert.ok(!projected.includes('UNRELATED ROUTINE'));
    assert.throws(() => project(html.replace('routine-v1-board','changed-board')));
  } finally {rmSync(dir,{recursive:true,force:true});}
});
