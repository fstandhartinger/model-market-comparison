// 2026-09-16: reviewed exact identity rules for measured public boards whose labels are not catalog
// display names (BullshitBench, ApprenticeBench, the Vals Index family). Same policy as
// lib/coding-identity.mjs and the same refusal rule: a row joins only when its label states the exact
// model and a setting that exists as a catalog configuration; a label that states no setting joins only
// a family whose catalog has exactly one configuration, and only when that configuration is the
// default; a configuration named twice on one board joins neither row. No fuzzy matching.
//
// These boards label a model with a slug rather than a product name, so the model half of the rule is
// "the slug, after one documented normalisation, is *exactly* a catalog family key". The normalisation
// is deliberately small: lower-case, `_` → `-`, and a trailing `-<digit>-<digit>` (a version written
// with dashes, `claude-opus-4-8`) → `-<digit>.<digit>`. A slug that still does not match a family key
// — an OpenRouter suffix (`claude-3.7-sonnet:thinking`), a dated checkpoint
// (`claude-haiku-4-5-20251001-thinking`), a model we do not carry — is refused, never approximated.

const EFFORTS = new Set(['minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

/** `muse_spark_1_3` → `muse-spark-1.3`, `claude-opus-4-8` → `claude-opus-4.8`, `GPT-5.5` → `gpt-5.5`. */
export function normaliseSlug(raw) {
  return String(raw).trim().toLowerCase().replace(/_/g, '-').replace(/-(\d)-(\d)$/, '-$1.$2');
}

/** A stated reasoning setting → the catalog variant that may carry it.
 *  `none` is a *stated* setting, not a missing one — BullshitBench publishes "one row per model x
 *  reasoning label", so `none` and `default` are different runs of the same model. It therefore joins a
 *  `non-reasoning` configuration and nothing else: attaching a reasoning-off run to a model's default
 *  entry would assert an equivalence the source itself distinguishes. */
function variantsFor(effort) {
  if (effort === null || effort === undefined) return null;
  if (EFFORTS.has(effort)) return [effort];
  if (effort === 'none') return ['non-reasoning'];
  if (effort === 'default') return ['default'];
  return [];
}

/** BullshitBench (Peter Gostev's public CSV): `<vendor>/<slug>@reasoning=<setting>`. */
export function parseBullshitBenchId(sourceId) {
  const [left, setting] = String(sourceId).split('@reasoning=');
  const slug = left.includes('/') ? left.slice(left.indexOf('/') + 1) : left;
  if (slug.includes('/') || /[:@]/.test(slug)) return { family: null, effort: setting ?? null };
  return { family: normaliseSlug(slug), effort: setting === undefined ? null : setting.toLowerCase() };
}

/** ApprenticeBench: `<slug>|<harness>|<effort>` — model, harness and effort all stated. */
export function parseApprenticeBenchId(sourceId) {
  const [slug, harness, effort] = String(sourceId).split('|');
  if (!slug || /[:@/]/.test(slug)) return { family: null, effort: null };
  return { family: normaliseSlug(slug), effort: effort ? effort.toLowerCase() : null, harness: harness ?? null };
}

/** Vals Index boards: `<vendor>/<slug>`, occasionally with the effort appended (`meta/muse_spark_1_3_max`).
 *  Vals publishes the setting it ran in its own row — `reasoning_effort` for most labs, `compute_effort`
 *  for Anthropic's — and our collector retains that row verbatim in the observation's protocol, so the
 *  setting is read from the source rather than guessed. A row whose two fields state different settings,
 *  or whose field holds something that is not an effort (`"0.99"`), states no setting. */
export function parseValsIndexId(sourceId, name = '', protocol = '') {
  const raw = String(sourceId);
  const slug = raw.includes('/') ? raw.slice(raw.indexOf('/') + 1) : raw;
  if (slug.includes('/') || /[:@]/.test(slug)) return { family: null, effort: null };
  const parts = normaliseSlug(slug).split('-');
  const last = parts[parts.length - 1];
  const fromSlug = EFFORTS.has(last) && parts.length > 1 ? last : null;
  const family = fromSlug ? normaliseSlug(parts.slice(0, -1).join('-')) : normaliseSlug(slug);
  const row = /source row: (\{.*\})\s*$/.exec(String(protocol));
  let published = [];
  if (row) {
    try {
      const fields = JSON.parse(row[1]);
      published = [fields.reasoning_effort, fields.compute_effort]
        .map((v) => (typeof v === 'string' ? v.toLowerCase() : null)).filter((v) => v && EFFORTS.has(v));
    } catch { published = []; }
  }
  const stated = [...new Set([...published, ...(fromSlug ? [fromSlug] : [])])];
  return { family, effort: stated.length === 1 ? stated[0] : null };
}

/** Shared with lib/coding-identity.mjs: a catalog configuration named twice on one board joins neither row. */
export function refuseRepeats(proposed, why = null) {
  const counts = new Map();
  for (const p of proposed) if (p.model_id) counts.set(p.model_id, (counts.get(p.model_id) ?? 0) + 1);
  return proposed.map((p) => p.model_id && counts.get(p.model_id) > 1
    ? { row: p.row, model_id: null, reason: `configuration ${p.model_id} appears ${counts.get(p.model_id)} times on this board${why ? ` (${why})` : ''}; neither row is joined` }
    : p);
}

/** One board's rows → reviewed joins, for labels that are slugs. `catalog`: [{ id, family_key, variant }]. */
export function boardJoins(rows, parse, catalog) {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const byFamily = new Map();
  for (const m of catalog) byFamily.set(m.family_key, [...(byFamily.get(m.family_key) ?? []), m]);
  const singleDefault = (family) => {
    const configs = byFamily.get(family) ?? [];
    return configs.length === 1 && configs[0].variant === 'default' ? configs[0] : null;
  };
  const proposed = rows.map((row) => {
    const { family, effort } = parse(row.source_id, row.name, row.protocol);
    if (!family) return { row, model_id: null, reason: 'label is not a catalog model slug' };
    if (!byFamily.has(family)) return { row, model_id: null, reason: `slug ${family} is not a catalog family` };
    const variants = variantsFor(effort);
    if (variants === null) {
      // No setting stated: only a family the catalog holds as a single default configuration joins.
      const only = singleDefault(family);
      return only ? { row, model_id: only.id, rule: `label names ${family} without a setting; the catalog has exactly one configuration, the default (${only.id})` }
        : { row, model_id: null, reason: `setting not stated and ${family} has ${(byFamily.get(family) ?? []).length} catalog configurations` };
    }
    for (const v of variants) {
      const id = `${family}::${v}`;
      if (byId.has(id)) return { row, model_id: id, rule: `label states model ${family} and setting ${effort}; exact catalog configuration ${id}` };
    }
    return { row, model_id: null, reason: variants.length ? `no catalog configuration for ${family} with setting ${effort}` : `setting ${effort} is not a reviewed setting` };
  });
  return refuseRepeats(proposed);
}

// 2026-09-16 (iteration 80): OSWorld 2.0 labels models by product name and states the reasoning setting in its own
// field. Only these reviewed names are recognised. `enabled` (MiniMax M3, Kimi 2.6) says reasoning is on without a
// level, so it states no setting; `thinking` is not a reviewed setting and is refused.
const OSWORLD2_MODELS = new Map(Object.entries({
  'claude opus 5': 'claude-opus-5', 'claude opus 4.8': 'claude-opus-4.8', 'claude opus 4.7': 'claude-opus-4.7',
  'claude sonnet 4.6': 'claude-sonnet-4.6', 'gpt-5.6 sol': 'gpt-5.6-sol', 'gpt-5.5': 'gpt-5.5',
  'qwen 3.7-plus': 'qwen3.7-plus', 'minimax m3': 'minimax-m3',
}));

/** OSWorld 2.0 ids: `<Model>|<reasoning>|<tool setting>|<release>`. */
export function parseOsworld2Id(sourceId) {
  const [model, reasoning] = String(sourceId).split('|');
  const r = reasoning?.trim().toLowerCase();
  return { family: OSWORLD2_MODELS.get(model?.trim().toLowerCase()) ?? null, effort: !r || r === 'enabled' ? null : r };
}

// 2026-09-16 (iteration 80): MathArena labels models by product name with the setting in parentheses
// ("GPT-6 Astra (max)", "Kimi K3 (Think)"). Only these reviewed names are recognised; a parenthesis that is not a
// reviewed effort ("Think") is a stated but unreviewed setting and is refused.
const MATHARENA_MODELS = new Map(Object.entries({
  'gpt-6 astra': 'gpt-6-astra', 'gpt-5.6-sol': 'gpt-5.6-sol', 'gpt-5.5': 'gpt-5.5',
  'claude-fable-5.1': 'claude-fable-5.1', 'claude-fable-5': 'claude-fable-5', 'claude-opus-5': 'claude-opus-5', 'claude-opus-4.8': 'claude-opus-4.8',
  'muse spark 1.3': 'muse-spark-1.3', 'muse spark 1.1': 'muse-spark-1.1', 'qwen3.8-max': 'qwen3.8-max', 'kimi k3': 'kimi-k3',
  'gemini 3.8 flash': 'gemini-3.8-flash', 'gemini 3.7 flash': 'gemini-3.7-flash', 'gemini 3.6 flash': 'gemini-3.6-flash',
  'gemini 3.5 flash': 'gemini-3.5-flash', 'gemini 3.1 pro preview': 'gemini-3.1-pro-preview', 'grok 4.5': 'grok-4.5',
  'glm 5.2': 'glm-5.2', 'deepseek-v4-flash': 'deepseek-v4-flash', 'step 3.7 flash': 'step-3.7-flash',
}));

/** MathArena labels: `<Model>` or `<Model> (<setting>)`. */
export function parseMathArenaLabel(sourceId) {
  const m = /^(.*?)(?:\s*\(([^()]+)\))?\s*$/.exec(String(sourceId));
  return { family: MATHARENA_MODELS.get(m[1].trim().toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : null };
}

// 2026-09-16 (iteration 81): SWE-rebench labels models by product name with the setting in brackets
// ("Fable 5 [high]", "GPT-5.6 Sol [medium]"); a label without brackets states no setting. Only these reviewed names
// are recognised ("Qwen3.6-27B" is reviewed: the catalog holds reasoning and non-reasoning, so no setting joins neither).
const SWE_REBENCH_MODELS = new Map(Object.entries({
  'fable 5': 'claude-fable-5', 'opus 5': 'claude-opus-5', 'sonnet 5': 'claude-sonnet-5',
  'gpt-5.6 sol': 'gpt-5.6-sol', 'gpt-5.6 luna': 'gpt-5.6-luna', 'grok 4.5': 'grok-4.5', 'glm-5.2': 'glm-5.2',
  'minimax m3': 'minimax-m3', 'mimo v2.5 pro': 'mimo-v2.5-pro', 'deepseek-v4 pro': 'deepseek-v4-pro',
  'qwen3.6-27b': 'qwen3.6-27b', 'qwen3.6-35b-a3b': 'qwen3.6-35b-a3b', 'qwen3.5-35b-a3b': 'qwen3.5-35b-a3b',
}));

/** SWE-rebench ids: `<Model>[ [<setting>]]__<mode>`. */
export function parseSweRebenchLabel(sourceId) {
  const m = /^(.*?)(?:\s*\[([^\][]+)\])?__[a-z]+$/.exec(String(sourceId));
  if (!m) return { family: null, effort: null };
  return { family: SWE_REBENCH_MODELS.get(m[1].trim().toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : null };
}

// 2026-09-16 (iteration 81): GSO labels models by product name with the reasoning effort in its own field (empty
// when the row states none). Reviewed names only. "Gemini 3 Flash" / "Gemini 3 Pro" are not mapped: the catalog
// carries both a preview and a release family under those names, and the source does not say which it ran.
// "Qwen3 Coder" is not mapped either: several Qwen3 Coder checkpoints exist.
const GSO_MODELS = new Map(Object.entries({
  'claude opus 4.8': 'claude-opus-4.8', 'claude sonnet 5': 'claude-sonnet-5', 'claude opus 4.7': 'claude-opus-4.7',
  'claude opus 4.6': 'claude-opus-4.6', 'claude opus 4.5': 'claude-opus-4.5', 'claude sonnet 4.5': 'claude-sonnet-4.5',
  'gpt 5.5': 'gpt-5.5', 'gpt 5.4': 'gpt-5.4', 'gpt 5.2': 'gpt-5.2', 'gpt 5.1': 'gpt-5.1', 'gpt 5': 'gpt-5',
  'gemini 3.1 pro': 'gemini-3.1-pro', 'o3': 'o3', 'o4 mini': 'o4-mini', 'o3 mini': 'o3-mini',
  'glm 4.5 air': 'glm-4.5-air', 'kimi k2 instruct': 'kimi-k2',
}));

/** GSO ids: `<Model>|<reasoning effort or empty>|<scaffold>|<run date>`. */
export function parseGsoId(sourceId) {
  const [model, effort] = String(sourceId).split('|');
  const e = effort?.trim().toLowerCase();
  return { family: GSO_MODELS.get(model?.trim().toLowerCase()) ?? null, effort: e ? e : null };
}

// 2026-09-16 (iteration 81): τ^τ-bench submissions name the Developer model by product name and the effort in its
// own field. Reviewed names only. One model under two harnesses (Kimi K3 in Kimi Code and in OpenCode) is one
// configuration named twice, so the repeat rule joins neither row.
const HYPER_TAU_MODELS = new Map(Object.entries({
  'gpt-5.6-sol': 'gpt-5.6-sol', 'gpt-5.6-terra': 'gpt-5.6-terra', 'claude opus 5': 'claude-opus-5',
  'claude sonnet 5': 'claude-sonnet-5', 'kimi k3': 'kimi-k3',
}));

/** τ^τ-bench ids: `<Model>|<reasoning effort>|<harness>`. */
export function parseHyperTauId(sourceId) {
  const [model, effort] = String(sourceId).split('|');
  const e = effort?.trim().toLowerCase();
  return { family: HYPER_TAU_MODELS.get(model?.trim().toLowerCase()) ?? null, effort: e ? e : null };
}

// 2026-09-16 (iteration 88, CR-52): LisanBench ids are the maintainer's OpenRouter-style slugs with the reasoning
// setting as a suffix (`claude-opus-5:thinking-high`, `gpt-5.6-sol:thinking-none`); rows without a suffix state the
// setting in the label's parentheses instead (`gpt-5` → "GPT 5 (medium)"). The model half is the slug after
// normaliseSlug and must be exactly a catalog family key. Budgets (`:thinking-16k`), a bare `:thinking`, `:free`
// and label words such as "(thinking)" or "(16k)" are not reviewed settings and are refused by boardJoins.
export function parseLisanBenchId(sourceId, name) {
  const [slug, suffix] = String(sourceId).split(':');
  const family = /[/@]/.test(slug) ? null : normaliseSlug(slug);
  if (suffix !== undefined) {
    const m = /^thinking-(.+)$/.exec(suffix);
    return { family, effort: m ? m[1].toLowerCase() : suffix.toLowerCase() };
  }
  const label = /\(([^()]+)\)\s*$/.exec(String(name ?? ''));
  return { family, effort: label ? label[1].trim().toLowerCase() : null };
}
