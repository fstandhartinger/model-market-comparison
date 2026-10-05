import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const data = read('data/jevbench-architecture.json');
const classes = new Set(['jev-reference', 'closed-api', 'open-llm-decoder', 'open-diffusion-lm', 'open-encoder', 'open-reranker', 'base-control', 'system']);
const derivations = new Set(['fine-tune', 'merge', 'adapter', 'jev-rebuild', 'distilled', 'base', 'original', 'pipeline', null]);
const kinds = new Set(['config.json', 'model-card', 'repo-readme', 'provider-docs', 'artifact']);

function jsonFiles(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? jsonFiles(path) : entry.name.endsWith('.json') ? [path] : [];
  });
}

// System rows are in these top-level arrays. Category definitions and per-item
// source logs are deliberately excluded; excluded historical system runs count.
function systemKeys(artifact) {
  return ['ranking', 'systems', 'results', 'rows', 'excluded_runs', 'not_measured'].flatMap((field) =>
    Array.isArray(artifact?.[field]) ? artifact[field].flatMap((row) =>
      typeof row?.key === 'string' ? [row.key] : []) : []);
}

test('architecture schema, evidence and badges are valid for every entry', () => {
  assert.equal(data.schema, 'jevbench-architecture/1');
  assert.match(data.checked_utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(Number.isFinite(Date.parse(data.checked_utc)));
  assert.deepEqual(Object.keys(data.benchmarks).sort(), ['imagejevbench', 'jevbench']);
  for (const [benchmark, entries] of Object.entries(data.benchmarks)) {
    assert.ok(Object.keys(entries).length > 0);
    for (const [key, entry] of Object.entries(entries)) {
      const label = `${benchmark}/${key}`;
      assert.ok(classes.has(entry.arch), `${label}: class`);
      assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0, `${label}: evidence`);
      for (const evidence of entry.evidence) {
        const url = new URL(evidence.url);
        assert.equal(url.protocol, 'https:', `${label}: HTTPS`);
        assert.equal(url.username + url.password, '', `${label}: no URL credentials`);
        assert.ok(kinds.has(evidence.kind), `${label}: evidence kind`);
        assert.equal(typeof evidence.fact, 'string');
        assert.ok(evidence.fact.trim().length > 0, `${label}: fact`);
      }
      if (!['closed-api', 'jev-reference'].includes(entry.arch)) {
        assert.ok(entry.evidence.some((e) => e.kind !== 'artifact'), `${label}: external architecture evidence`);
      }
      assert.deepEqual(Object.keys(entry.badges).sort(), ['derivation', 'params', 'quant']);
      assert.ok(derivations.has(entry.badges.derivation), `${label}: derivation`);
      for (const field of ['params', 'quant']) {
        assert.ok(entry.badges[field] === null || (typeof entry.badges[field] === 'string' && entry.badges[field].trim()), `${label}: ${field}`);
      }
      if (entry.note !== undefined) assert.equal(typeof entry.note, 'string');
    }
  }
});

test('all historical and current JevBench and ImageJevBench artifact keys are covered', () => {
  const jevFiles = jsonFiles('data/raw/benchmarks/jevbench');
  const jevKeys = new Set(jevFiles.flatMap((path) => systemKeys(read(path))));
  // lib/jevbench-multimodal-preview.mjs loads preview.json and these versioned
  // previews; lib/imagejev-board.mjs converts their ranking arrays to board rows.
  const imageFiles = jevFiles.filter((path) => /\/multimodal-preview\/preview(?:-v[^/]+)?\.json$/.test(path));
  const imageKeys = new Set(imageFiles.flatMap((path) => systemKeys(read(path))));
  assert.ok(jevKeys.has('open-alternative-jev-reversed-order'));
  assert.ok(imageKeys.has('wity_1'));
  assert.ok(jevFiles.some((path) => path.endsWith('jevbench-v1.6.0-dated-carry.json')));
  for (const [benchmark, keys] of [['jevbench', jevKeys], ['imagejevbench', imageKeys]]) {
    for (const key of keys) assert.ok(data.benchmarks[benchmark][key], `${benchmark}: missing ${key}`);
    assert.deepEqual(Object.keys(data.benchmarks[benchmark]).sort(), [...keys].sort(), `${benchmark}: exact artifact coverage`);
  }
});

test('wity entries preserve the author-requested model-family non-disclosure', () => {
  let checked = 0;
  for (const entries of Object.values(data.benchmarks)) {
    for (const [key, entry] of Object.entries(entries)) {
      if (!/^wity[-_]/i.test(key)) continue;
      checked++;
      assert.equal(entry.arch, 'closed-api');
      assert.deepEqual(entry.badges, { derivation: null, params: null, quant: null });
      assert.doesNotMatch(JSON.stringify(entry), /qwen|gemma|llama|mistral|phi|deepseek|glm|kimi|nemotron|granite/i);
      assert.ok(entry.evidence.every((e) => ['provider-docs', 'artifact'].includes(e.kind)));
    }
  }
  assert.ok(checked >= 5);
});

test('encoder, diffusion, reranker, reference and single-backbone corrections remain explicit', () => {
  const entries = data.benchmarks.jevbench;
  for (const key of ['laya', 'laya-multilingual', 'laya-typed-decisions', 'certo', 'jeff', 'openjev-verdict', 'von-395m', 'quyet-1-0-small', 'quyet-1-0-small-en', 'quyet-1-0-tiny']) assert.equal(entries[key].arch, 'open-encoder', key);
  for (const key of ['djev', 'openjev-razorback16', 'nemotron-diffusion-8b']) assert.equal(entries[key].arch, 'open-diffusion-lm', key);
  for (const key of ['qwen3-reranker-4b', 'mxbai-rerank-base-v2']) assert.equal(entries[key].arch, 'open-reranker', key);
  for (const key of ['system-one-open', 'typecastlm', 'jobe-qwen3.5-4b', 'swanone']) assert.equal(entries[key].arch, 'open-llm-decoder', key);
  assert.equal(entries['jev-1.13.0'].arch, 'jev-reference');
  assert.equal(entries['kushal-gemma4-31b-it-autoloops'].arch, 'closed-api');
  assert.equal(entries['raw-phi-4-mini'].arch, 'base-control');
  assert.equal(data.benchmarks.imagejevbench.djev_distill_v4.arch, 'open-diffusion-lm');
});
