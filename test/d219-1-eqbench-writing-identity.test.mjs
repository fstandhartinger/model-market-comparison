import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eqbenchWritingJoins } from '../lib/board-identity.mjs';

// 2026-09-26 (iteration 242, D219.1). Every label below is a real row of the committed EQ-Bench captures
// (`creative_writing.js`, `creative_writing_longform.js`); only the catalog is a small synthetic mirror of the
// real shapes. The board publishes `model_name,elo_score,creative_writing_score,avg_length,vocab_complexity,
// slop_score,repetition_score` and no reasoning setting, so the rule is the standing exact-join policy: a
// setting-less label joins only a family whose catalog holds exactly one configuration, the default.
const catalog = [
  // The guard's reason for existing: our catalog carries this model twice — once as a dated family that
  // retains the Hugging Face repository, once as a separate undated family key equal to the board's slug.
  { id: 'deepseek-r1-jan-25::default', family_key: 'deepseek-r1-jan-25', variant: 'default', huggingface_url: 'https://huggingface.co/deepseek-ai/DeepSeek-R1' },
  { id: 'deepseek-r1::default', family_key: 'deepseek-r1', variant: 'default', huggingface_url: null },
  // Frontier families split by effort with no setting-less configuration at all.
  { id: 'claude-opus-5::max', family_key: 'claude-opus-5', variant: 'max', huggingface_url: null },
  { id: 'claude-opus-5::non-reasoning', family_key: 'claude-opus-5', variant: 'non-reasoning', huggingface_url: null },
  { id: 'gemini-3.8-flash::high', family_key: 'gemini-3.8-flash', variant: 'high', huggingface_url: null },
  // A single configuration that is not a default: still no identity for a setting-less label.
  { id: 'muse-spark-1.1::xhigh', family_key: 'muse-spark-1.1', variant: 'xhigh', huggingface_url: null },
  // Single-default families, the only shape that joins.
  { id: 'gpt-4.1-mini::default', family_key: 'gpt-4.1-mini', variant: 'default', huggingface_url: null },
  { id: 'claude-3-haiku::default', family_key: 'claude-3-haiku', variant: 'default', huggingface_url: null },
  { id: 'qwq-32b::default', family_key: 'qwq-32b', variant: 'default', huggingface_url: 'https://huggingface.co/Qwen/QwQ-32B' },
  { id: 'kimi-k2-thinking::default', family_key: 'kimi-k2-thinking', variant: 'default', huggingface_url: null },
  { id: 'claude-opus-4.5::default', family_key: 'claude-opus-4.5', variant: 'default', huggingface_url: null },
  // The same weights retained under two configurations: the repository names the weights, not the run.
  { id: 'glm-5.2::max', family_key: 'glm-5.2', variant: 'max', huggingface_url: 'https://huggingface.co/zai-org/GLM-5.2' },
  { id: 'glm-5.2::non-reasoning', family_key: 'glm-5.2', variant: 'non-reasoning', huggingface_url: 'https://huggingface.co/zai-org/GLM-5.2' },
];
const join = (sourceId) => eqbenchWritingJoins(
  [{ benchmark_id: 'eqbench-creative-writing::3', source_id: sourceId, name: sourceId, protocol: 'Elo Score column in the leaderboard' }],
  undefined, catalog)[0];

test('D219.1: a setting-less EQ-Bench slug joins only a single-default catalog family', () => {
  assert.equal(join('gpt-4.1-mini').model_id, 'gpt-4.1-mini::default');
  assert.match(join('gpt-4.1-mini').rule, /states no setting; the catalog has exactly one configuration, the default/);
  // One `<org>/` or `<provider>/` segment is dropped: these are OpenRouter routes, not repositories.
  assert.equal(join('anthropic/claude-3-haiku').model_id, 'claude-3-haiku::default');
});

test('D219.1: a label naming a retained Hugging Face repository is left to the exact-checkpoint route', () => {
  // Without this guard the slug rule reaches `deepseek-r1::default` and — because a reviewed map entry
  // outranks the checkpoint bridge in scripts/ingest-benchmark-scores.mjs — would move the row off the
  // checkpoint it was collected from onto a different catalog family.
  const r = join('deepseek-ai/DeepSeek-R1');
  assert.equal(r.model_id, null);
  assert.match(r.reason, /exactly one catalog configuration retains; that identity belongs to the exact-checkpoint route/);
  // Retained under several configurations the checkpoint route refuses it too (it needs a unique candidate), so
  // the recorded reason must name the real obstacle — the missing setting — not a route that will not join it.
  const many = join('zai-org/GLM-5.2');
  assert.equal(many.model_id, null);
  assert.match(many.reason, /setting not stated and the catalog retains repository zai-org\/GLM-5\.2 under 2 configurations/);
  // The guard is about the repository, not about slashes: a route whose repository we do not retain still joins.
  assert.equal(join('anthropic/claude-3-haiku').model_id, 'claude-3-haiku::default');
});

test('D219.1: the frontier rows are refused because no setting-less configuration exists', () => {
  for (const [label, configs] of [['claude-opus-5', 2], ['gemini-3.8-flash', 1]]) {
    const r = join(label);
    assert.equal(r.model_id, null, `${label} must not join`);
    assert.match(r.reason, configs > 1 ? /setting not stated and .* has \d+ catalog configurations/
      : /setting not stated and the only catalog configuration is .*, not a default/);
  }
  // A single configuration that is not the default is not an identity for a label that states no setting.
  assert.match(join('muse-spark-1.1').reason, /the only catalog configuration is muse-spark-1\.1::xhigh, not a default/);
});

test('D219.1: thinking markers, provider suffixes, dated checkpoints and unknown slugs are refused', () => {
  // The board gives a thinking run its own row; "thinking" is not a reviewed setting, so it never joins —
  // not even when the catalog happens to hold a `kimi-k2-thinking` family.
  assert.equal(join('moonshotai/Kimi-K2-Thinking').model_id, null);
  assert.match(join('moonshotai/Kimi-K2-Thinking').reason, /marks a thinking run/);
  assert.match(join('qwen/qwen3-235b-a22b:thinking').reason, /thinking run|provider suffix/);
  assert.match(join('claude-opus-4-5-20251101').reason, /dated checkpoint/);
  assert.match(join('chatgpt-4o-latest-2025-03-27').reason, /dated checkpoint/);
  assert.match(join('ox-alpha').reason, /slug ox-alpha is not a catalog family/);
  assert.match(join('a/b/c').reason, /3 path segments/);
});

test('D219.1: the documented normalisation reads a dashed version, and two labels reaching one configuration join neither', () => {
  // `claude-opus-4-5` is the board's spelling of claude-opus-4.5.
  assert.equal(join('claude-opus-4-5').model_id, 'claude-opus-4.5::default');
  const both = eqbenchWritingJoins([
    { benchmark_id: 'eqbench-creative-writing::3', source_id: 'claude-opus-4-5', name: 'claude-opus-4-5', protocol: '' },
    { benchmark_id: 'eqbench-creative-writing::3', source_id: 'anthropic/claude-opus-4-5', name: 'anthropic/claude-opus-4-5', protocol: '' },
  ], undefined, catalog);
  assert.deepEqual(both.map((r) => r.model_id), [null, null]);
  assert.match(both[0].reason, /appears 2 times on this board/);
});

test('D219.1: the shipped identity map and scores carry the reviewed EQ-Bench joins and only default variants', () => {
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8'));
  const eq = map.entries.filter((e) => e.benchmark_id.startsWith('eqbench-'));
  assert.ok(eq.length >= 30, `expected the EQ-Bench writing joins in the map, found ${eq.length}`);
  for (const e of eq) {
    assert.ok(e.model_id.endsWith('::default'), `${e.source_id} joins ${e.model_id}, which is not a default configuration`);
    assert.match(e.rule, /states no setting/);
    assert.ok(e.reviewed_at, `${e.source_id} has no review date`);
  }
  // No EQ-Bench entry may name a label the catalog retains as a Hugging Face repository.
  const retained = new Set(JSON.parse(readFileSync('data/dataset.json', 'utf8')).models
    .map((m) => m.aa_metadata?.huggingface_url).filter(Boolean));
  for (const e of eq) assert.ok(!retained.has(`https://huggingface.co/${e.source_id}`),
    `${e.source_id} is a retained checkpoint and must not be joined by the slug rule`);
  // And the data actually carries them: the frontier rows stay unjoined, the single-default rows do not.
  const obs = JSON.parse(readFileSync('data/raw/benchmarks/scores.json', 'utf8')).observations
    .filter((o) => o.benchmark_id.startsWith('eqbench-'));
  const byLabel = new Map(obs.map((o) => [`${o.benchmark_id}\0${o.subject.source_id}`, o]));
  assert.equal(byLabel.get('eqbench-creative-writing::3\0gpt-4.1-mini').subject.model_id, 'gpt-4.1-mini::default');
  assert.equal(byLabel.get('eqbench-creative-writing::3\0claude-opus-5').subject.model_id, null);
  assert.equal(byLabel.get('eqbench-creative-writing::3\0gpt-6-astra').subject.model_id, null);
  // The checkpoint route keeps its own row.
  assert.equal(byLabel.get('eqbench-creative-writing::3\0deepseek-ai/DeepSeek-R1').subject.model_id, 'deepseek-r1-jan-25::default');
});
