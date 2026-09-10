// The registry is a discovery contract. Scores join by the complete id, never family.
export const BENCHMARK_CATEGORIES = ['Coding', 'Agentic', 'Math', 'Reasoning', 'Knowledge', 'Science', 'Long-context', 'Writing', 'Roleplay', 'Instruction-following', 'Vision', 'Multilingual', 'Safety/Alignment', 'Tool-use', 'Uncensored', 'Efficiency', 'Other'];
const TYPES = ['official_leaderboard', 'vendor_report', 'x_account', 'huggingface', 'github', 'discord'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v) => typeof v === 'string' && DAY.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const url = (v) => { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
const finiteOrNull = (v) => v === null || typeof v === 'number' && Number.isFinite(v);

export function validateBenchmarkRegistry(registry) {
  const fail = (message) => { throw new Error(`Benchmark registry: ${message}`); };
  if (registry?.schema_version !== 1 || !Array.isArray(registry.entries) || !registry.entries.length) fail('missing schema/entries');
  if (!day(registry.verified_at)) fail('verification date');
  const ids = new Set();
  for (const e of registry.entries) {
    if (!nonempty(e.family) || !nonempty(e.version) || e.id !== `${e.family}::${e.version}` || ids.has(e.id)) fail(`duplicate or unversioned identity ${e.id}`);
    ids.add(e.id);
    for (const key of ['name', 'one_sentence_description', 'maintainer']) if (!nonempty(e[key])) fail(`${e.id}: missing ${key}`);
    if (!BENCHMARK_CATEGORIES.includes(e.category) || !TYPES.includes(e.source_type)) fail(`${e.id}: category/source type`);
    if (!['published', 'snapshot', 'retained'].includes(e.version_status)) fail(`${e.id}: version status`);
    if (e.version_status === 'snapshot' && (!e.version.startsWith('snapshot-') || !day(e.version.slice(9)))) fail(`${e.id}: undated unversioned source`);
    if (!['active', 'retained'].includes(e.status)) fail(`${e.id}: status`);
    if (!url(e.primary_url) || !Array.isArray(e.publication_urls) || !e.publication_urls.length || e.publication_urls.some((p) => !url(p.url) || !TYPES.includes(p.type) || !nonempty(p.role))) fail(`${e.id}: publication URLs`);
    if (!e.publication_urls.some((p) => p.url === e.primary_url)) fail(`${e.id}: primary publication missing`);
    const s = e.scoring;
    if (!s || !nonempty(s.metric) || !nonempty(s.unit) || !Array.isArray(s.range) || s.range.length !== 2 || !s.range.every(finiteOrNull) || ![true, false, null].includes(s.higher_better) || !nonempty(s.notes)) fail(`${e.id}: scoring semantics`);
    if (s.range.every((v) => v !== null) && s.range[0] > s.range[1]) fail(`${e.id}: reversed range`);
    const c = e.how_to_collect;
    if (!c || !['command', 'format', 'locator', 'version_guard', 'notes'].every((k) => nonempty(c[k]))) fail(`${e.id}: incomplete executable recipe`);
    if (!e.update_cadence || !nonempty(e.update_cadence.source_schedule) || !nonempty(e.update_cadence.check_recommendation)) fail(`${e.id}: cadence`);
    if (!e.saturated || typeof e.saturated.value !== 'boolean' || !nonempty(e.saturated.note)) fail(`${e.id}: saturation decision`);
    if (!day(e.first_seen) || !day(e.last_verified) || e.first_seen > e.last_verified) fail(`${e.id}: verification dates`);
    if (!Array.isArray(e.evidence) || !e.evidence.length || e.evidence.some((p) => !url(p.url) || !/^[a-f0-9]{64}$/.test(p.sha256) || !nonempty(p.excerpt) || typeof p.fetched_at !== 'string' || !day(p.fetched_at.slice(0, 10)) || !nonempty(p.file))) fail(`${e.id}: source evidence`);
  }
  for (const e of registry.entries) if (e.superseded_by !== null && (!ids.has(e.superseded_by) || e.superseded_by === e.id)) fail(`${e.id}: dangling supersession`);
  if (!Array.isArray(registry.aa_field_map)) fail('missing AA field map');
  const fields = new Set();
  for (const m of registry.aa_field_map) {
    if (!nonempty(m.field) || fields.has(m.field) || !ids.has(m.benchmark_id) || !nonempty(m.notes)) fail(`invalid AA field mapping ${m.field}`);
    fields.add(m.field);
  }
  return registry;
}

export function benchmarkById(registry, id) {
  const entry = registry.entries.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown benchmark version: ${id}`);
  return entry;
}
