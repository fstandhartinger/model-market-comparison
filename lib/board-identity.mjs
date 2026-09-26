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
  // 2026-09-26 (bh-gpt6-complete): the 22 Sep releases in MathArena's own spelling; each is the catalog family of that name.
  'gpt-6 sol': 'gpt-6-sol', 'gpt-6 luna': 'gpt-6-luna', 'grok 4.7': 'grok-4.7', 'claude-opus-5.5': 'claude-opus-5.5',
  'claude-fable-5.1': 'claude-fable-5.1', 'claude-fable-5': 'claude-fable-5', 'claude-opus-5': 'claude-opus-5', 'claude-opus-4.8': 'claude-opus-4.8',
  'muse spark 1.3': 'muse-spark-1.3', 'muse spark 1.1': 'muse-spark-1.1', 'qwen3.8-max': 'qwen3.8-max', 'kimi k3': 'kimi-k3',
  'gemini 3.8 flash': 'gemini-3.8-flash', 'gemini 3.7 flash': 'gemini-3.7-flash', 'gemini 3.6 flash': 'gemini-3.6-flash',
  'gemini 3.5 flash': 'gemini-3.5-flash', 'gemini 3.1 pro preview': 'gemini-3.1-pro-preview', 'grok 4.5': 'grok-4.5',
  'glm 5.2': 'glm-5.2', 'deepseek-v4-flash': 'deepseek-v4-flash', 'step 3.7 flash': 'step-3.7-flash',
  // 2026-09-19 (CR-85.2): "DeepSeek-V4.1-Flash (Max)" on the 2026-08 boards is DeepSeek's V4.1 Flash; the stated
  // setting max is the catalog's only configuration (AA "Reasoning, Max Effort"), so it joins exactly.
  'deepseek-v4.1-flash': 'deepseek-v4.1-flash',
  // 2026-09-22 (iteration 161): the deprecated HMMT and Apex competitions carry older models. Each name is the
  // catalog family of the same name; the parenthesis still has to be a catalog configuration (GPT-5.2 joins at
  // xhigh, not at high). Not mapped: "Step 3.5 Flash" and "Gemini 3 Flash" (the catalog also holds a dated or
  // preview family of that name), "Grok 4 Fast R" and the "Qwen3-…-2507-Think" labels (not catalog names).
  // "DeepSeek-v4-Pro (Max)" / "DeepSeek-v4-Flash (Max)" are the original V4 releases, not the later 0813/0731
  // checkpoints: MathArena's own model configs give `date: "2026-04-24"` and the huggingface_id of the original
  // repos (captured in data/raw/benchmarks/daily-evidence/2026-09-22-matharena-config/; codex review, iteration 161).
  'gpt-5.4': 'gpt-5.4', 'gpt-5.4-pro': 'gpt-5.4-pro', 'gpt-5.2': 'gpt-5.2', 'gpt-5.1': 'gpt-5.1', 'gpt-5': 'gpt-5',
  'gpt-5-mini': 'gpt-5-mini', 'gpt-5-nano': 'gpt-5-nano', 'gpt oss 120b': 'gpt-oss-120b',
  'deepseek-v4-pro': 'deepseek-v4-pro', 'deepseek-v3.2-speciale': 'deepseek-v3.2-speciale', 'deepseek-r1-0528': 'deepseek-r1-0528',
  'falcon-h1r-7b': 'falcon-h1r-7b', 'kimi k2 thinking': 'kimi-k2-thinking', 'grok 4': 'grok-4',
}));

/** MathArena labels: `<Model>` or `<Model> (<setting>)`. */
export function parseMathArenaLabel(sourceId) {
  const m = /^(.*?)(?:\s*\(([^()]+)\))?\s*$/.exec(String(sourceId));
  return { family: MATHARENA_MODELS.get(m[1].trim().toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : null };
}

// 2026-09-18 (CR-81, iteration 113): WeirdML v3 labels models by product name with the setting in
// parentheses ("GPT-6 Astra (xhigh)", "DeepSeek V4.1 Flash (high, Novita)"); spaces are the source's own
// spelling (MathArena writes hyphens). Same reviewed rule as MathArena: only exact names are recognised,
// the parenthesis is the stated setting, and an unreviewed setting is refused — never approximated.
const WEIRDML_V3_MODELS = new Map(Object.entries({
  'gpt-6 astra': 'gpt-6-astra', 'claude fable 5.1': 'claude-fable-5.1', 'gpt-5.6 sol': 'gpt-5.6-sol',
  'gemini 3.8 flash': 'gemini-3.8-flash',
}));

/** WeirdML v3 labels: `<Model> (<setting>[, <provider note>])`. */
export function parseWeirdmlV3Label(sourceId, name = '') {
  const m = /^(.*?)(?:\s*\(([^()]+)\))?\s*$/.exec(String(name || sourceId));
  return { family: WEIRDML_V3_MODELS.get(m[1].trim().toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : null };
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

// 2026-09-18 (iteration 114, CR-82.3): VulcanBench Frontier v4 (Morgan Linton) labels models by product
// name with the effort in brackets ("Fable 5.1 [max]", "GPT-5.5 [extra-high]"). Only these reviewed names are
// recognised. VulcanBench's own spelling for the top effort tier is "extra-high"; the catalog spells the same
// tier "xhigh" (all four reviewed editors agree the tiers are the ladder low < medium < high < extra-high/xhigh
// < max). A label without brackets states no setting and never joins.
const VULCANBENCH_FRONTIER_MODELS = new Map(Object.entries({
  'fable 5.1': 'claude-fable-5.1', 'gpt-6 astra': 'gpt-6-astra',
  'gpt-5.6 terra': 'gpt-5.6-terra', 'gpt-5.6 luna': 'gpt-5.6-luna', 'gpt-5.5': 'gpt-5.5',
}));

/** VulcanBench Frontier labels: `<Model> [<effort>]`; the source spells xhigh "extra-high". */
export function parseVulcanbenchFrontierLabel(sourceId) {
  const m = /^(.*?)(?:\s*\[([^\]]+)\])?\s*$/.exec(String(sourceId));
  if (!m || !m[1].trim()) return { family: null, effort: null };
  let effort = m[2] ? m[2].trim().toLowerCase() : null;
  if (effort === 'extra-high') effort = 'xhigh';
  return { family: VULCANBENCH_FRONTIER_MODELS.get(m[1].trim().toLowerCase()) ?? null, effort };
}

// 2026-09-18 (iteration 114, CR-82.4): KernelBench-CUDA (Elliot Arledge, kernelbench.com) labels are the run
// ids of the measurement harness: `<harness>/<vendor>/<slug> [<effort>]` (e.g.
// "or-opus/anthropic/claude-opus-5 [max]") or `<harness>/<slug>` ("agy/gemini-3.8-flash-high") or a bare
// `<harness>/<slug>` ("zai-claude/glm-5.3"). The model half is normalised like any slug board; three labels
// are the site author's own display slugs and are mapped only after being verified on the site's model pages.
// Everything else stays unjoined: "ultra" is not a reviewed setting, a bare label of a multi-configuration
// family names no configuration, and a single-configuration family whose only catalog entry is not the
// default (glm-5.3, grok-4.5, deepseek-v4.1-flash, deepseek-v4-flash-0731) is never guessed.
const KERNELBENCH_CUDA_MODELS = new Map(Object.entries({
  // kernelbench.com/models/ox-alpha displays this stealth run as "GLM-5.3 Flash".
  'ox-alpha': { family: 'glm-5.3-flash', effort: null },
  // kernelbench.com/models/deepseek-flash spells the slug "DeepSeek V4.1 Flash".
  'deepseek-flash': { family: 'deepseek-v4.1-flash', effort: null },
  // agy embeds the reasoning tier in the slug ("gemini-3.8-flash-high").
  'gemini-3.8-flash-high': { family: 'gemini-3.8-flash', effort: 'high' },
}));

/** KernelBench-CUDA labels: `<harness>/<...>/<slug>[ [<effort>]]` — last path segment carries the model. */
export function parseKernelbenchCudaLabel(sourceId) {
  const raw = String(sourceId);
  const label = raw.slice(raw.lastIndexOf('/') + 1);
  const m = /^(.*?)(?:\s*\[([^\]]+)\])?\s*$/.exec(label);
  const name = m ? m[1].trim().toLowerCase() : '';
  const bracket = m && m[2] ? m[2].trim().toLowerCase() : null;
  if (!name || /[:@/]/.test(name)) return { family: null, effort: null };
  const reviewed = KERNELBENCH_CUDA_MODELS.get(name);
  const family = reviewed ? reviewed.family : normaliseSlug(name);
  const effort = bracket !== null ? bracket : reviewed ? reviewed.effort : null;
  return { family, effort };
}

// 2026-09-19 (iteration 117, CR-30.2): FrontierSWE v2 (Proximal team, frontierswe.com) labels rows
// by product name and states no reasoning effort anywhere on the site. The per-model effort is
// stated by Epoch AI's FrontierSWE relay CSV (frontierswe_external.csv in the Benchmarking Hub
// archive; every row's Source column is the site's own leaderboard URL), which restates exactly the
// site's mean@5 values — the parser byte-checks relay/site agreement, so the relay can only confirm
// or fail, never drift. The effort is read live from the observation's own protocol (the parser
// copies the relay's `<slug>_<effort>` suffix into every covered row), so a changed relay can never
// be joined under a stale assumption. Only labels the relay covers are reviewed here; every other
// label (the five later site additions, incl. GPT-6 Astra) states no setting and joins nothing.
const FRONTIERSWE_V2_FAMILIES = new Map(Object.entries({
  'claude fable 5.1': 'claude-fable-5.1',
  'gpt-5.6': 'gpt-5.6-sol',
  'glm-5.3': 'glm-5.3',
  'kimi k3': 'kimi-k3',
  'grok 4.6': 'grok-4.6',
  'gemini 3.7 flash': 'gemini-3.7-flash',
  'qwen3.8-max': 'qwen3.8-max',
  'muse spark 1.2': 'muse-spark-1.2',
  'inkling': 'inkling',
}));

// 2026-09-21 (iteration 142, CR-38.1): ProgramBench (Princeton & Meta, programbench.com) labels each
// board row with the site's product name; six rows state the reasoning effort in parentheses
// ("Claude Opus 5 (xhigh)", "GPT 5.5 (high)") where every other row states none. The effort is the
// source's own label statement — the same statement the registered submission.yaml carries
// ("GPT-5.5 (high reasoning)"). Only these reviewed names are recognised. A stated effort with no
// catalog configuration (Claude Opus 4.7 xhigh: the catalog carries max/non-reasoning-high/medium)
// is refused, never reinterpreted; a row without an effort joins only a family the catalog holds
// as a single default configuration (the policy behind every boardJoins board), so the effort-less
// multi-configuration rows are honestly refused.
const PROGRAMBENCH_FAMILIES = new Map(Object.entries({
  'claude opus 5': 'claude-opus-5',
  'claude opus 4.8': 'claude-opus-4.8',
  'claude opus 4.7': 'claude-opus-4.7',
  'claude opus 4.6': 'claude-opus-4.6',
  'claude sonnet 4.6': 'claude-sonnet-4.6',
  'claude haiku 4.5': 'claude-haiku-4.5',
  'gpt-5.6 sol': 'gpt-5.6-sol',
  'gpt 5.5': 'gpt-5.5',
  'gpt 5.4': 'gpt-5.4',
  'gpt 5.4 mini': 'gpt-5.4-mini',
  'gpt 5 mini': 'gpt-5-mini',
  'gemini 3.7 flash': 'gemini-3.7-flash',
  'gemini 3.6 flash': 'gemini-3.6-flash',
  'gemini 3.5 flash': 'gemini-3.5-flash',
  'gemini 3.1 pro': 'gemini-3.1-pro',
  'gemini 3 flash': 'gemini-3-flash',
  'glm-5.2': 'glm-5.2',
}));

/** ProgramBench labels: `<Model>` or `<Model> (<setting>)`. */
export function parseProgrambenchLabel(sourceId, name = '') {
  const m = /^(.*?)(?:\s*\(([^()]+)\))?\s*$/.exec(String(name || sourceId));
  return { family: PROGRAMBENCH_FAMILIES.get(m[1].trim().toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : null };
}

/** FrontierSWE v2 labels: the site's product name; effort live from the relay statement in the protocol. */
export function parseFrontiersweV2Label(sourceId, name = '', protocol = '') {
  const family = FRONTIERSWE_V2_FAMILIES.get(String(sourceId).trim().toLowerCase()) ?? null;
  if (family === null) return { family: null, effort: null };
  const m = /"epoch_relay_effort":"([^"]*)"/.exec(String(protocol));
  const stated = m ? m[1].trim().toLowerCase() : '';
  if (!stated) return { family, effort: null };
  if (stated === 'extra-high') return { family, effort: 'xhigh' };
  return { family, effort: stated };
}

// 2026-09-19 (iteration 117, CR-30.2): PostTrainBench v1.1 (aisa-group, posttrainbench.com) labels
// rows by agent key; config.js states each agent's display name, CLI scaffold and reasoning effort
// (reasoningEffort: "Max"/"xHigh"/"High"/…), which is the site's own per-agent setting statement.
// The effort is read live from the observation's own protocol (the parser copies the config value
// into every row), so a changed site setting can never be joined under a stale assumption. Only
// agents whose stated effort is a catalog configuration join; an unstated effort joins nothing
// (locus is an external system, not a catalog model, and the OpenCode Gemini run and the Kimi K3
// and Opus 5 Claude Code runs state no effort), and a stated effort with no catalog configuration
// (Opus 4.7 xHigh, GPT 5.4 High) is refused rather than reinterpreted.
const POSTTRAINBENCH_FAMILIES = new Map(Object.entries({
  'fable-5': 'claude-fable-5',
  'gpt-5.6-sol': 'gpt-5.6-sol',
  'opus-4.8': 'claude-opus-4.8',
  'opus-4.8-max': 'claude-opus-4.8',
  'glm-5.2': 'glm-5.2',
  'gpt-5.5-xhigh': 'gpt-5.5',
  'grok-4.5-high': 'grok-4.5',
  'opus-4.7': 'claude-opus-4.7',
  'gpt-5.4-high': 'gpt-5.4',
  'opus-5': 'claude-opus-5',
  'kimi-k3': 'kimi-k3',
  'gemini-3.1-pro': 'gemini-3.1-pro',
  'locus': null,
}));

const POSTTRAINBENCH_EFFORTS = new Map(Object.entries({ max: 'max', xhigh: 'xhigh', high: 'high', medium: 'medium', med: 'medium', low: 'low', minimal: 'minimal' }));

/** PostTrainBench v1.1 labels: the site's agent key; effort live from the protocol's stated value. */
export function parsePosttrainbenchLabel(sourceId, name = '', protocol = '') {
  const family = POSTTRAINBENCH_FAMILIES.get(String(sourceId).trim().toLowerCase()) ?? null;
  if (family === null) return { family: null, effort: null };
  const m = /"reasoning_effort":"([^"]*)"/.exec(String(protocol));
  const stated = m ? m[1].split(',')[0].trim().toLowerCase() : '';
  if (!stated || stated === 'not stated') return { family, effort: null };
  return { family, effort: POSTTRAINBENCH_EFFORTS.get(stated) ?? stated };
}

// 2026-09-20 (iteration 126, CR-83.1): RSI-Exam (aiming-lab, rsi-exam.ai) labels each row
// `<product name> [<agent harness> · <reasoning effort>]`. The agent harness is part of the
// measured system and stays in the protocol; only the product name and the stated effort decide
// the identity, so a model run under Claude Code joins the model, never a harness variant. Only
// these reviewed names are recognised — "Seed Evolving-0909" is a model we do not carry and is
// refused rather than approximated.
const RSI_EXAM_FAMILIES = new Map(Object.entries({
  'gpt-6-astra': 'gpt-6-astra',
  'fable 5.1': 'claude-fable-5.1',
  'opus 5': 'claude-opus-5',
  'gpt-5.6-sol': 'gpt-5.6-sol',
  'glm 5.3': 'glm-5.3',
  'qwen3.8 max-0902': 'qwen3.8-max-0902',
  'muse spark 1.3': 'muse-spark-1.3',
  'kimi k3': 'kimi-k3',
  'grok 4.6': 'grok-4.6',
  'gemini 3.8 flash': 'gemini-3.8-flash',
  'gpt-5.5': 'gpt-5.5',
  'deepseek v4 pro': 'deepseek-v4-pro',
  'qwen3.8 max': 'qwen3.8-max',
  'gemini 3.7 flash': 'gemini-3.7-flash',
}));

// The one row whose setting the source states twice and differently: the leaderboard label reads
// "kimi cli · max", while the release write-up's own experimental-setup table reads "Not specified"
// for Kimi K3 and its resource-chart id (`kimi-cli-k3`) carries no effort suffix where every other
// id does. A contradicted setting is not a stated setting, so the row joins nothing.
const RSI_EXAM_EFFORT_CONTRADICTED = new Set(['kimi k3']);

/** RSI-Exam labels: `<product name> [<harness> · <effort>]`; the harness never enters the identity. */
export function parseRsiExamLabel(sourceId) {
  const m = /^(.*?)\s*\[([^\]]*)\]\s*$/.exec(String(sourceId));
  if (!m || !m[1].trim()) return { family: null, effort: null };
  const name = m[1].trim().toLowerCase();
  const family = RSI_EXAM_FAMILIES.get(name) ?? null;
  if (!family) return { family: null, effort: null };
  if (RSI_EXAM_EFFORT_CONTRADICTED.has(name)) return { family, effort: null };
  const stated = m[2].split('·').pop().trim().toLowerCase();
  return { family, effort: stated || null };
}

// 2026-09-20 (iteration 126, CR-30.2): Toolathlon-Verified (HKUST NLP) labels a row with the product
// name and the reasoning setting in parentheses ("Kimi K3 (max)", "Qwen3.5 397B-A17B"). The names are
// the catalog's own display names, so the model half uses the documented slug normalisation rather
// than a hand-kept list — a row the maintainers add tomorrow joins on the same exact rule instead of
// waiting for an edit, and a name that is not exactly a catalog family key still joins nothing. The
// agent configuration ("Default") is part of the measured system, not of the model identity.
/** Toolathlon-Verified labels: `<product name>[ (<effort>)]`. */
export function parseToolathlonVerifiedLabel(sourceId) {
  const m = /^(.*?)(?:\s*\(([^)]+)\))?\s*$/.exec(String(sourceId));
  if (!m || !m[1].trim()) return { family: null, effort: null };
  const name = m[1].trim();
  if (/[:@/]/.test(name)) return { family: null, effort: null };
  return { family: normaliseSlug(name.replace(/\s+/g, '-')), effort: m[2] ? m[2].trim().toLowerCase() : null };
}

// 2026-09-21 (iteration 156, CR-37.1): the archived pre-Verified Toolathlon board writes hyphenated product
// names and states a setting only as a trailing effort word — after a space ("DeepSeek-V4-Pro Max") or a
// hyphen ("GPT-5.2-xhigh"). Only the reviewed effort words count as a setting; every other suffix stays part of
// the name, so "Kimi-K2-thinking" is the catalog family kimi-k2-thinking and "DeepSeek-V3.2-Thinking" names no
// catalog family and joins nothing (thinking is not a reviewed setting). The page's ‡ mark is stripped by the
// collector and kept in the row's protocol.
/** Toolathlon archive labels: `<Hyphenated-Name>[ <effort>|-<effort>]`. */
export function parseToolathlonArchiveLabel(sourceId) {
  const label = String(sourceId).trim();
  if (!label || /[:@/()]/.test(label)) return { family: null, effort: null };
  const m = /^(.+?)(?:[\s-](minimal|low|medium|high|xhigh|max))?$/i.exec(label);
  if (!m || /\s/.test(m[1])) return { family: null, effort: null };
  return { family: normaliseSlug(m[1]), effort: m[2] ? m[2].toLowerCase() : null };
}

// 2026-09-20 (iteration 139, CR-85.2): LiveBench (the release CSV on livebench.ai) labels rows by run
// slug. Two stated-setting forms exist: `<family>-<effort>` ("gpt-6-astra-max") and Anthropic's
// `<family>-<effort>-effort` ("claude-opus-5-max-effort"); rows without either ("glm-5.2",
// "deepseek-v4-pro-0813") state no setting and follow the shared rule (only a family the catalog holds
// as exactly one configuration, the default, joins). A slug that is exactly a catalog family key is read
// as the model name first — Qwen's "Max" is part of the model's name, so "qwen3.8-max" is never
// "qwen3.8 at max" — but a slug that fits both readings (family-max where family-max *and* family are
// catalog families) is ambiguous and joins nothing. Dated checkpoints ("gpt-5.2-2025-12-11-high",
// "claude-opus-4-5-20251101-thinking-64k-high-effort"), the unreviewed setting "thinking"
// ("kimi-k2.6-thinking"), composition words ("thinking-auto", "-64k") and models we do not carry join
// nothing — never approximated. A slug board needs no reviewed-names list: the slug, after the one
// documented normalisation, must be exactly a catalog family key, exactly as on the other slug boards.
const LIVEBENCH_SUFFIXES = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

/** LiveBench rows → reviewed joins. Signature matches boardJoins so the identity-map builder can call it. */
const LIVEBENCH_HELD = new Set(['union-alpha']);
export function livebenchJoins(rows, _parse, catalog) {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const byFamily = new Map();
  for (const m of catalog) byFamily.set(m.family_key, [...(byFamily.get(m.family_key) ?? []), m]);
  const singleDefault = (family) => {
    const configs = byFamily.get(family) ?? [];
    return configs.length === 1 && configs[0].variant === 'default' ? configs[0] : null;
  };
  const statedJoin = (row, family, effort) => {
    for (const v of variantsFor(effort) ?? []) {
      const id = `${family}::${v}`;
      if (byId.has(id)) return { row, model_id: id, rule: `label states model ${family} and setting ${effort}; exact catalog configuration ${id}` };
    }
    return { row, model_id: null, reason: `no catalog configuration for ${family} with setting ${effort}` };
  };
  const proposed = rows.map((row) => {
    const raw = String(row.source_id).trim();
    if (!raw || /[:@/]/.test(raw)) return { row, model_id: null, reason: 'label is not a catalog model slug' };
    const slug = normaliseSlug(raw);
    if (/-20\d{6}($|-)/.test(slug) || /-20\d{2}-\d{2}-\d{2}($|-)/.test(slug))
      return { row, model_id: null, reason: `label names a dated checkpoint (${slug}); dated checkpoints are never joined` };
    // 2026-09-26 (CR-173): Union Alpha is carried as a preliminary-only family (CR-60); a board row naming it is left
    // for an explicit review of that decision rather than joined by the slug rule.
    if (LIVEBENCH_HELD.has(slug)) return { row, model_id: null, reason: `${slug} is held for a separate review (preliminary-only family)` };
    // An exact family key is the model name itself (qwen3.8-max, minimax-m3), never name-minus-setting —
    // unless the effort reading names a different real family too, which is ambiguous and joins nothing.
    if (byFamily.has(slug)) {
      for (const eff of LIVEBENCH_SUFFIXES) {
        if (slug.endsWith(`-${eff}`)) {
          const base = normaliseSlug(slug.slice(0, slug.length - eff.length - 1));
          if (byFamily.has(base)) return { row, model_id: null, reason: `label fits both ${slug} and ${base} at setting ${eff}; ambiguous, joins nothing` };
        }
      }
      const only = singleDefault(slug);
      return only
        ? { row, model_id: only.id, rule: `label names ${slug} without a setting; the catalog has exactly one configuration, the default (${only.id})` }
        : { row, model_id: null, reason: `setting not stated and ${slug} has ${(byFamily.get(slug) ?? []).length} catalog configurations` };
    }
    // Anthropic's form: <family>-<effort>-effort.
    const anthropic = /^(.*)-([a-z]+)-effort$/.exec(slug);
    if (anthropic && EFFORTS.has(anthropic[2])) {
      const family = normaliseSlug(anthropic[1]);
      return byFamily.has(family) ? statedJoin(row, family, anthropic[2])
        : { row, model_id: null, reason: `slug ${family} is not a catalog family` };
    }
    // <family>-<effort>.
    for (const eff of LIVEBENCH_SUFFIXES) {
      if (slug.endsWith(`-${eff}`)) {
        const family = normaliseSlug(slug.slice(0, slug.length - eff.length - 1));
        if (byFamily.has(family)) return statedJoin(row, family, eff);
      }
    }
    // "thinking" is a stated but unreviewed setting (kimi-k2.6-thinking): never a join, never the family either.
    if (slug.endsWith('-thinking'))
      return { row, model_id: null, reason: `label states setting thinking, which is not a reviewed setting` };
    return { row, model_id: null, reason: 'label is not a catalog model slug' };
  });
  return refuseRepeats(proposed);
}

// 2026-09-21 (iteration 143, CR-30.2): MCP Atlas (Scale Labs). The board labels a model either by slug
// (`claude-opus-4-8 (max)`, `glm-5p2`) or by product name (`Muse Spark 1.1`, `Gemini 3.5 Flash (high)`),
// with the reasoning setting in parentheses. Every label below is a reviewed mapping to a catalog family —
// nothing is derived by normalising the string, because two of the board's spellings are board-specific:
// it writes a minor version with `p` (`glm-5p2` is GLM 5.2, `kimi-k2p5` is Kimi K2.5), and in
// `gpt-5.6 (sol)` the parenthesis is part of the model's name, not a setting.
// Deliberately absent: `Nemotron 3 Ultra` — since iteration 160 the catalog holds it once, as
// `nemotron-3-ultra-550b-a55b`, whose only configuration is `::reasoning`; a label without a stated
// setting joins only a single default configuration, so it still joins nothing.
const MCP_ATLAS_MODELS = new Map(Object.entries({
  'muse spark 1.1': 'muse-spark-1.1', 'muse spark': 'muse-spark', 'fable 5.1': 'claude-fable-5.1',
  'claude fable 5': 'claude-fable-5', 'claude-opus-5': 'claude-opus-5', 'claude-opus-4-8': 'claude-opus-4.8',
  'claude-opus-4-7': 'claude-opus-4.7', 'claude-opus-4-6': 'claude-opus-4.6', 'claude-opus-4-5': 'claude-opus-4.5',
  'claude-sonnet-4-6': 'claude-sonnet-4.6', 'claude-sonnet-4-5': 'claude-sonnet-4.5', 'claude-haiku-4-5': 'claude-haiku-4.5',
  'gpt-5.6 sol': 'gpt-5.6-sol', 'gpt-5.5': 'gpt-5.5', 'gpt-5.4': 'gpt-5.4', 'gpt-5.4-mini': 'gpt-5.4-mini',
  'gpt-5.2': 'gpt-5.2', 'gpt-5.1': 'gpt-5.1', 'o3-pro': 'o3-pro',
  'gemini 3.5 flash': 'gemini-3.5-flash', 'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite', 'gemini-3-pro-preview': 'gemini-3-pro-preview',
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
  'glm 5.3': 'glm-5.3', 'glm-5p2': 'glm-5.2', 'glm-5p1': 'glm-5.1', 'glm-4p7': 'glm-4.7',
  'kimi-k3': 'kimi-k3', 'kimi-k2p5': 'kimi-k2.5',
  'qwen3.8-2.4t-a95b': 'qwen3.8-2.4t-a95b', 'inkling': 'inkling', 'inkling-small': 'inkling-small',
}));

/** MCP Atlas labels: `<Model>` or `<Model> (<setting>)`, where the parenthesis is the setting unless the
 *  whole label is a reviewed model name (`gpt-5.6 (sol)`). A parenthesis that is neither is a stated but
 *  unreviewed setting (`thinking`) and is refused rather than dropped. */
export function parseMcpAtlasLabel(sourceId) {
  const label = String(sourceId).replace(/\s+/g, ' ').trim();
  const paren = /\(([^()]+)\)$/.exec(label);
  if (!paren) return { family: MCP_ATLAS_MODELS.get(label.toLowerCase()) ?? null, effort: null };
  const inner = paren[1].trim().toLowerCase();
  const base = label.slice(0, paren.index).trim().toLowerCase();
  if (EFFORTS.has(inner) || inner === 'none' || inner === 'default')
    return { family: MCP_ATLAS_MODELS.get(base) ?? null, effort: inner };
  const named = `${base} ${inner}`;
  if (MCP_ATLAS_MODELS.has(named)) return { family: MCP_ATLAS_MODELS.get(named), effort: null };
  return { family: MCP_ATLAS_MODELS.get(base) ?? null, effort: inner };
}

// 2026-09-21 (iteration 154, CR-37.1): Context Arena (MRCR v2) names a row by the OpenRouter-style slug
// its runs use plus the reasoning mode it ran with; the collector writes `<vendor>/<slug>@reasoning=<mode>`,
// or the bare slug when the site states no mode. The model half follows the documented slug normalisation
// (an OpenRouter-only slug, e.g. a dated checkpoint, simply joins nothing). `enabled` says reasoning was on
// without a level, so, as on OSWorld 2.0, it states no setting.
/** Context Arena ids: `<vendor>/<slug>[@reasoning=<mode>]`. */
export function parseContextArenaId(sourceId) {
  const [left, mode] = String(sourceId).split('@reasoning=');
  const slash = left.indexOf('/');
  const slug = slash < 0 ? '' : left.slice(slash + 1);
  if (!slug || /[:@/]/.test(slug)) return { family: null, effort: null };
  const m = mode?.trim().toLowerCase();
  return { family: normaliseSlug(slug), effort: !m || m === 'enabled' ? null : m };
}

// 2026-09-21 (iteration 155, CR-37.1): Andon Labs' Blueprint-Bench 2 table names models by product name only
// and states no reasoning setting anywhere on the page, so every label reads as "no setting": only a family the
// catalog holds as a single default configuration joins (boardJoins). Only these reviewed names are recognised.
// "Gemini 3 Flash" is the GA model (the catalog's `gemini-3-flash`), not `gemini-3-flash-preview`; "Grok 4.20
// Reasoning" is xAI's own model name `grok-4.20-reasoning`, not a dated 0309 checkpoint. Deliberately absent:
// Gemini Robotics-ER 1.6 (not in the catalog) and the page's human baseline (not a model; never collected).
const BLUEPRINT_BENCH_MODELS = new Map(Object.entries({
  'gpt-6 astra': 'gpt-6-astra', 'claude fable 5.1': 'claude-fable-5.1', 'claude fable 5': 'claude-fable-5',
  'gemini 3.8 flash': 'gemini-3.8-flash', 'gpt-5.5': 'gpt-5.5', 'gemini 3.5 flash': 'gemini-3.5-flash',
  'gpt-5.6 sol': 'gpt-5.6-sol', 'grok 4.6': 'grok-4.6', 'gemini 3.6 flash': 'gemini-3.6-flash',
  'gpt-5.6 terra': 'gpt-5.6-terra', 'claude opus 5': 'claude-opus-5', 'kimi k3': 'kimi-k3', 'grok 4.5': 'grok-4.5',
  'gpt-5.4': 'gpt-5.4', 'gemini 3.1 pro': 'gemini-3.1-pro', 'claude sonnet 5': 'claude-sonnet-5',
  'claude opus 4.7': 'claude-opus-4.7', 'gpt-5.6 luna': 'gpt-5.6-luna', 'claude opus 4.8': 'claude-opus-4.8',
  'claude sonnet 4.6': 'claude-sonnet-4.6', 'kimi k2.6': 'kimi-k2.6', 'gemini 3 flash': 'gemini-3-flash',
  'grok 4.3': 'grok-4.3', 'claude haiku 4.5': 'claude-haiku-4.5', 'grok 4.20 reasoning': 'grok-4.20-reasoning',
}));

/** Blueprint-Bench 2 labels: a product name, never a setting. */
export function parseBlueprintBenchLabel(sourceId) {
  const label = String(sourceId).replace(/\s+/g, ' ').trim().toLowerCase();
  return { family: BLUEPRINT_BENCH_MODELS.get(label) ?? null, effort: null };
}

// 2026-09-21 (iteration 157, CR-37.1): Long-Horizon Terminal-Bench's community board names models by product name
// only; neither the board nor the submissions' metadata.yaml / job config.json state a reasoning setting, so every
// label reads as "no setting": only a family the catalog holds as a single default configuration joins (boardJoins).
// Only these reviewed names are recognised. "Grok 4.20" is xAI's API model `grok-4.20` (the submission's model string
// `xai/grok-4.20`), not a dated 0309 checkpoint and not the separately named `grok-4.20-reasoning`. Deliberately
// absent: Doubao Seed 2.1 Pro (not in the catalog).
const LHTB_MODELS = new Map(Object.entries({
  'grok 4.5': 'grok-4.5', 'claude sonnet 5': 'claude-sonnet-5', 'claude opus 4.8': 'claude-opus-4.8',
  'claude fable 5': 'claude-fable-5', 'gpt-5.6-sol': 'gpt-5.6-sol', 'gpt-5.5': 'gpt-5.5', 'minimax m3': 'minimax-m3',
  'claude sonnet 4.6': 'claude-sonnet-4.6', 'kimi k2.7 code': 'kimi-k2.7-code', 'glm 5.2': 'glm-5.2',
  'qwen3.6 plus': 'qwen3.6-plus', 'deepseek v4 pro': 'deepseek-v4-pro', 'qwen3.7 max': 'qwen3.7-max', 'hy3': 'hy3',
  'gemini 3.1 pro': 'gemini-3.1-pro', 'gpt-5.4': 'gpt-5.4', 'glm 5.1': 'glm-5.1', 'kimi k2.6': 'kimi-k2.6',
  'gpt-5.3 codex': 'gpt-5.3-codex', 'grok 4.20': 'grok-4.20', 'kimi k3': 'kimi-k3',
}));

/** Long-Horizon Terminal-Bench labels: a product name, never a setting. */
export function parseLhtbLabel(sourceId) {
  const label = String(sourceId).replace(/\s+/g, ' ').trim().toLowerCase();
  return { family: LHTB_MODELS.get(label) ?? null, effort: null };
}

// 2026-09-21 (iteration 158, CR-37.1): React Native Evals (Callstack) names models by product name and a gateway route
// (`vercel/openai/gpt-5.6-sol`) and states no reasoning setting, so every label reads as "no setting": only a family the
// catalog holds as a single default configuration joins (boardJoins). Only these reviewed labels are recognised; each
// family is the catalog key the row's own route names. Deliberately absent: Apex (Callstack's own agent, not a model),
// Ox Alpha (an unnamed OpenRouter stealth model), and the three Nemotron rows — Nemotron 3 Ultra is one catalog family
// since iteration 160 (`nemotron-3-ultra-550b-a55b`), but its only configuration is `::reasoning`, not a default, and
// these labels state no setting.
const RN_EVALS_MODELS = new Map(Object.entries({
  'claude opus 5': 'claude-opus-5', 'claude fable 5': 'claude-fable-5', 'gpt 5.6 sol': 'gpt-5.6-sol', 'gpt 5.5': 'gpt-5.5',
  'grok 4.5': 'grok-4.5', 'grok 4.6': 'grok-4.6', 'claude opus 4.8': 'claude-opus-4.8', 'gpt 5.6 terra': 'gpt-5.6-terra',
  'claude sonnet 5': 'claude-sonnet-5', 'gpt 5.6 luna': 'gpt-5.6-luna', 'muse spark 1.1': 'muse-spark-1.1',
  'gemini 3.1 pro preview': 'gemini-3.1-pro-preview', 'glm 5.2': 'glm-5.2', 'minimax m3': 'minimax-m3', 'kimi k2.6': 'kimi-k2.6',
  'gemini 3.5 flash': 'gemini-3.5-flash', 'gemma 4 31b it': 'gemma-4-31b-it', 'deepseek v4 flash': 'deepseek-v4-flash',
  'mimo v2.5 pro': 'mimo-v2.5-pro', 'gpt oss 120b': 'gpt-oss-120b', 'gpt oss 20b': 'gpt-oss-20b', 'mistral large 3': 'mistral-large-3',
}));

/** React Native Evals labels: a product name, never a setting. The board's row label is the observation name. */
export function parseRnEvalsLabel(sourceId, name) {
  const label = String(name ?? sourceId).replace(/\s+/g, ' ').trim().toLowerCase();
  return { family: RN_EVALS_MODELS.get(label) ?? null, effort: null };
}

// 2026-09-21 (iteration 158, CR-37.1): ResearchClawBench's ResearchHarness rows name a model by product name inside the
// agent label ("ResearchHarness (MiniMax-M3)") and state no reasoning setting, so every label reads as "no setting":
// only a family the catalog holds as a single default configuration joins (boardJoins). Only these reviewed names are
// recognised. Deliberately absent: Grok-4.1 (no catalog family of that name) and Hy3-Preview, which the maintainers
// call a preview model; `hy3-preview` holds two configurations anyway.
const RESEARCHCLAWBENCH_MODELS = new Map(Object.entries({
  'claude-opus-4.6': 'claude-opus-4.6', 'claude-opus-4.7': 'claude-opus-4.7', 'claude-opus-4.8': 'claude-opus-4.8',
  'deepseek-v4-pro': 'deepseek-v4-pro', 'glm-5.1': 'glm-5.1', 'glm-5.2': 'glm-5.2', 'gpt-5.4': 'gpt-5.4', 'gpt-5.5': 'gpt-5.5',
  'gemini-3.1-pro': 'gemini-3.1-pro', 'gemini-3.5-flash': 'gemini-3.5-flash', 'grok-4.3': 'grok-4.3', 'kimi-k2.5': 'kimi-k2.5',
  'kimi-k2.6': 'kimi-k2.6', 'mimo-v2-pro': 'mimo-v2-pro', 'mimo-v2.5': 'mimo-v2.5', 'minimax-m3': 'minimax-m3',
  'qwen3.5-397b-a17b': 'qwen3.5-397b-a17b', 'qwen3.6-plus': 'qwen3.6-plus', 'qwen3.7-max': 'qwen3.7-max',
}));

/** ResearchClawBench ResearchHarness labels: a product name, never a setting. */
export function parseResearchClawBenchLabel(sourceId) {
  const label = String(sourceId).replace(/\s+/g, ' ').trim().toLowerCase();
  return { family: RESEARCHCLAWBENCH_MODELS.get(label) ?? null, effort: null };
}

// 2026-09-22 (iteration 165, CR-37.1): MLS-Bench-Lite (the MLS-Bench authors' board) keys each row `<Model>|<Harness>`,
// where the harness parenthesis states the effort the board also gives in its own field (`Claude Code (max effort)`,
// `Codex (xhigh)`, `Kimi-Code (max)`); a harness without a parenthesis states no setting. Only these reviewed names are
// recognised; each family is the catalog key of that exact product name. Deliberately absent: "DeepSeek-V4 Pro Preview"
// (a preview the catalog does not hold). The Claude Fable 5 row ran "max effort, with fallback" — Claude Code switched to
// an unnamed fallback model for part of the run — so its setting is returned verbatim and refused as unreviewed.
const MLS_BENCH_MODELS = new Map(Object.entries({
  'claude fable 5.1': 'claude-fable-5.1', 'claude fable 5': 'claude-fable-5', 'claude opus 5': 'claude-opus-5',
  'claude opus 4.8': 'claude-opus-4.8', 'claude sonnet 5': 'claude-sonnet-5', 'gpt 5.6 sol': 'gpt-5.6-sol', 'gpt-5.5': 'gpt-5.5',
  'kimi k3': 'kimi-k3', 'kimi k2.7 code': 'kimi-k2.7-code', 'kimi k2.6': 'kimi-k2.6', 'glm 5.2': 'glm-5.2',
  'qwen3.8-max-0902': 'qwen3.8-max-0902', 'qwen3.8-max': 'qwen3.8-max', 'qwen3.7-max': 'qwen3.7-max',
}));

/** MLS-Bench-Lite ids: `<Model>|<Harness>`; the harness parenthesis is the setting (`max effort` → `max`). */
export function parseMlsBenchLabel(sourceId) {
  const [model, harness = ''] = String(sourceId).split('|');
  const family = MLS_BENCH_MODELS.get(model.replace(/\s+/g, ' ').trim().toLowerCase()) ?? null;
  const paren = /\(([^()]+)\)\s*$/.exec(harness);
  if (!paren) return { family, effort: null };
  return { family, effort: paren[1].trim().toLowerCase().replace(/ effort$/, '') };
}

// 2026-09-22 (iteration 167, CR-37.1): Surge AI's own boards (Chartography, GDP.pdf) label each row "<brand> <model>
// (<setting>)". `Adaptive/<level>` is Anthropic's adaptive reasoning at that effort — the catalog's "Adaptive Reasoning,
// <level> Effort" configuration. `<level> reasoning` is that effort for the other labs; Anthropic's plain "High reasoning"
// rows sit next to their own Adaptive/Max rows as a second, unexplained mode, so for Claude families the setting is returned
// verbatim and refused as unreviewed. `Thinking on` / `Auto reasoning` state no level (refused likewise). Only these
// reviewed names are recognised. Deliberately absent: "DeepSeek V4 Flash Vision (experimental)" (the catalog splits V4 Flash
// Vision and V4 Flash Vision Exp), "Muse Glimmer 30B" (the catalog's Muse Glimmer states no size), "Nemotron 3 Nano Omni"
// (two catalog families), "Qwen 3.8 Flash" and "Qwen 3.5 Plus" (not catalog families).
const SURGE_MODELS = new Map(Object.entries({
  'claude fable 5.1': 'claude-fable-5.1', 'claude fable 5': 'claude-fable-5', 'claude opus 5': 'claude-opus-5',
  'claude opus 4.8': 'claude-opus-4.8', 'claude opus 4.7': 'claude-opus-4.7', 'claude sonnet 5': 'claude-sonnet-5',
  'claude sonnet 4.6': 'claude-sonnet-4.6', 'gpt 5.6 sol': 'gpt-5.6-sol', 'gpt 5.6 terra': 'gpt-5.6-terra',
  'gpt 5.6 luna': 'gpt-5.6-luna', 'gpt 5.5': 'gpt-5.5', 'gpt 5.4': 'gpt-5.4', 'gemini 3.8 flash': 'gemini-3.8-flash',
  'gemini 3.7 flash': 'gemini-3.7-flash', 'gemini 3.6 flash': 'gemini-3.6-flash', 'gemini 3.5 flash': 'gemini-3.5-flash',
  'gemini 3.5 flash-lite': 'gemini-3.5-flash-lite', 'gemini 3.1 pro': 'gemini-3.1-pro', 'gemini 3 flash': 'gemini-3-flash',
  'grok 4.6': 'grok-4.6', 'grok 4.5': 'grok-4.5', 'grok 4.3': 'grok-4.3', 'kimi k3': 'kimi-k3', 'kimi k2.6': 'kimi-k2.6',
  'kimi k2.5': 'kimi-k2.5', 'muse spark 1.3': 'muse-spark-1.3', 'muse spark 1.2': 'muse-spark-1.2',
  'muse spark 1.1': 'muse-spark-1.1', 'inkling inkling': 'inkling', 'inkling small': 'inkling-small',
  'mistral large 3': 'mistral-large-3', 'glm 5.3 flash': 'glm-5.3-flash', 'qwen 3.8 max': 'qwen3.8-max',
  'qwen 3.7 plus': 'qwen3.7-plus', 'nova 2 pro': 'nova-2.0-pro',
  // 2026-09-26 (bh-gpt6-complete): GPT-6 (Surge writes "GPT 6 <name>"), Grok 4.7 and Claude Opus 5.5, exact catalog families.
  'gpt 6 astra': 'gpt-6-astra', 'gpt 6 sol': 'gpt-6-sol', 'gpt 6 luna': 'gpt-6-luna', 'grok 4.7': 'grok-4.7',
  'claude opus 5.5': 'claude-opus-5.5',
}));
const SURGE_LEVELS = new Set(['max', 'xhigh', 'high', 'medium', 'low', 'minimal']);

/** Surge boards: `<Brand> <Model> (<setting>)`; the last parenthesis is the setting. */
export function parseSurgeLabel(sourceId) {
  const label = String(sourceId).replace(/\s+/g, ' ').trim();
  const paren = /\s*\(([^()]+)\)$/.exec(label);
  const model = (paren ? label.slice(0, paren.index) : label).toLowerCase();
  const family = SURGE_MODELS.get(model) ?? null;
  if (!paren) return { family, effort: null };
  const setting = paren[1].trim().toLowerCase();
  const adaptive = /^adaptive\/(\w+)$/.exec(setting);
  if (adaptive && SURGE_LEVELS.has(adaptive[1])) return { family, effort: adaptive[1] };
  const level = /^(\w+) reasoning$/.exec(setting);
  if (level && SURGE_LEVELS.has(level[1]) && !family?.startsWith('claude-')) return { family, effort: level[1] };
  if (setting === 'no reasoning') return { family, effort: 'none' };
  if (setting === 'default') return { family, effort: 'default' };
  return { family, effort: setting };
}

// 2026-09-22 (iteration 167, CR-37.1): Interfaze's Structured Output Benchmark names models only ("GPT-5.4",
// "GLM-5.1") and states one setting for the whole board: temperature 0, no reasoning/thinking — except the models the page
// itself lists as reasoning-locked, which ran at their lowest reasoning setting. So a mapped row states `none` (joins only an
// exact non-reasoning configuration) and a locked row states an unreviewed setting (never joins). Only exact product names
// are mapped: abbreviations (Qwen3.5-35B, Qwen3-235B, Qwen3-30B, Nemotron-3-Nano-30B, Gemma-4-31B) and Anthropic rows (the
// catalog holds Claude's non-reasoning runs per effort; the board states none) are deliberately absent. "DeepSeek-V4-Pro" is the
// April release (deepseek-v4-pro, 0424): the SOB repository's last result commit is 2026-07-02, before V4 Pro 0813 existed.
const INTERFAZE_SOB_MODELS = new Map(Object.entries({
  'gpt-5.4': 'gpt-5.4', 'gpt-5.5': 'gpt-5.5', 'glm-5.1': 'glm-5.1', 'glm-4.7': 'glm-4.7', 'deepseek-v4-pro': 'deepseek-v4-pro',
  'gpt-5': 'gpt-5', 'gpt-5-mini': 'gpt-5-mini', 'gemini-3.1-pro': 'gemini-3.1-pro', 'gemini-3-flash-preview': 'gemini-3-flash-preview',
}));
const INTERFAZE_SOB_LOCKED = new Set(['gpt-5', 'gpt-5-mini', 'gemini-3.1-pro', 'gemini-3-flash-preview', 'ds-r1-distill-32b']);

/** Interfaze SOB ids: the bare model label; the board-wide setting is "no reasoning" unless the page lists it as locked. */
export function parseInterfazeSobLabel(sourceId) {
  const label = String(sourceId).trim().toLowerCase();
  return { family: INTERFAZE_SOB_MODELS.get(label) ?? null, effort: INTERFAZE_SOB_LOCKED.has(label) ? 'lowest available reasoning' : 'none' };
}

// 2026-09-22 (iteration 168, CR-37.1): VITA-Bench lists each model once per reasoning section ("Thinking Models",
// "Non-thinking Models"), sometimes with a level in parentheses; the collector ids are "<section>|<label>". A parenthesis
// is the stated setting ("GPT-5.2 (xhigh)", "GPT-5.2 (none)"). Without one, a non-thinking row states reasoning off
// (`none`, joins only an exact non-reasoning configuration) and a thinking row states no level (`thinking`, not a
// reviewed setting, never joins). Only exact product names are mapped; "Gemini-3-Pro" and "Gemini-3-Flash" are not
// (the catalog holds a preview and a plain family of each), nor models the catalog lacks (LongCat, Doubao-Seed-1.8).
const VITABENCH_MODELS = new Map(Object.entries({
  'claude-4.5-opus': 'claude-opus-4.5', 'claude-4.5-sonnet': 'claude-sonnet-4.5', 'gpt-5.2': 'gpt-5.2', 'o3': 'o3', 'o4-mini': 'o4-mini',
  'deepseek-v3.2': 'deepseek-v3.2', 'glm-4.7': 'glm-4.7', 'qwen3-32b': 'qwen3-32b', 'qwen3-max': 'qwen3-max', 'kimi-k2-0905': 'kimi-k2-0905',
  'kimi-k2-thinking': 'kimi-k2-thinking', 'qwen3-235b-a22b-thinking-2507': 'qwen3-235b-a22b-thinking-2507',
}));
const VITABENCH_SECTIONS = new Map([['thinking models', 'thinking'], ['non-thinking models', 'none']]);

/** VITA-Bench ids: `<section>|<model label>[ (<level>)]`. */
export function parseVitaBenchLabel(sourceId) {
  const [section, label] = String(sourceId).split('|');
  const sectionSetting = VITABENCH_SECTIONS.get(section?.trim().toLowerCase());
  const m = /^(.*?)(?:\s*\(([^()]+)\))?$/.exec(label?.trim() ?? '');
  if (!sectionSetting || !m) return { family: null, effort: null };
  return { family: VITABENCH_MODELS.get(m[1].toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : sectionSetting };
}

// 2026-09-22 (iteration 169, CR-37.1): MCPMark Verified (EVAL SYS) keys each row by the model slug — the API model name
// with dots as dashes — plus an optional `-<effort>` (`gpt-5-6-sol-max`, `kimi-k2-7-code`). Only these reviewed slugs are
// recognised; each maps to the catalog key of that exact product. "deepseek-v4-pro" is the April 2026 release (the board
// was last updated 2026-07-20, before V4 Pro 0813 existed). A key without an effort states no setting.
const MCPMARK_MODELS = new Map(Object.entries({
  'kimi-k3': 'kimi-k3', 'gpt-5-5': 'gpt-5.5', 'gpt-5-6-sol': 'gpt-5.6-sol', 'claude-fable-5': 'claude-fable-5',
  'kimi-k2-7-code': 'kimi-k2.7-code', 'claude-opus-4-8': 'claude-opus-4.8', 'kimi-k2-6': 'kimi-k2.6', 'deepseek-v4-pro': 'deepseek-v4-pro',
}));

/** MCPMark Verified keys: `<model slug>[-<effort>]`. */
export function parseMcpmarkVerifiedLabel(sourceId) {
  const key = String(sourceId).trim().toLowerCase();
  if (MCPMARK_MODELS.has(key)) return { family: MCPMARK_MODELS.get(key), effort: null };
  const m = /^(.+)-(max|xhigh|high|medium|low)$/.exec(key);
  return m && MCPMARK_MODELS.has(m[1]) ? { family: MCPMARK_MODELS.get(m[1]), effort: m[2] } : { family: null, effort: null };
}

// 2026-09-22 (iteration 170, CR-37.1): CharXiv's leaderboard CSV names models by product label ("GPT 4.1 mini",
// "Llama 3.2 Vision 90B"), a parenthesis stating the reasoning level ("o4 mini (high)"). Only these reviewed labels are
// recognised; a dated label maps to its dated release ("GPT-4o 240513" → gpt-4o-may-24). Deliberately absent: undated
// labels of products with several catalog releases (Claude 3.5 Sonnet, Gemini 1.5 Pro/Flash, Reka Flash), labels the
// catalog holds twice (GPT-4o 241120, GPT-4o Mini), Claude 3.7 Sonnet (reasoning mode not stated on a two-mode family) and
// Reka Edge (the board's is Reka's 2024 proprietary model; the catalog's reka-edge is the open-weight Reka Edge 2603).
const CHARXIV_MODELS = new Map(Object.entries({
  'gpt-4o 240513': 'gpt-4o-may-24', 'claude 3 sonnet': 'claude-3-sonnet', 'claude 3 haiku': 'claude-3-haiku', 'claude 3 opus': 'claude-3-opus',
  'gemini 1.0 pro': 'gemini-1.0-pro', 'o1': 'o1', 'o3': 'o3', 'o4 mini': 'o4-mini', 'llama 3.2 vision 11b': 'llama-3.2-11b-vision-instruct',
  'llama 3.2 vision 90b': 'llama-3.2-instruct-90b-vision', 'molmo 7b d': 'molmo-7b-d', 'pixtral 12b': 'pixtral-12b-2409',
  'qwen2.5-vl 72b': 'qwen2.5-vl-72b-instruct', 'gpt 4.1': 'gpt-4.1', 'gpt 4.1 mini': 'gpt-4.1-mini', 'gpt 4.1 nano': 'gpt-4.1-nano',
  'gpt 4.5': 'gpt-4.5-preview',
}));

/** CharXiv labels: `<product label>[ (<level>)]`. */
export function parseCharxivLabel(sourceId) {
  const m = /^(.*?)(?:\s*\(([^()]+)\))?$/.exec(String(sourceId).trim());
  if (!m) return { family: null, effort: null };
  return { family: CHARXIV_MODELS.get(m[1].toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : null };
}

// 2026-09-26 (CR-173): UGI Leaderboard (DontPlanToEnd) labels rows `<hf-org>/<model>` with an optional
// ` (reasoning_effort=<setting>)` suffix. Most rows are community fine-tunes and re-uploads, so only a model
// published under its own lab's first-party namespace is read, and only the `reasoning_effort=` form states a
// setting; any other parenthesis (`reasoning=enabled`, `thinking=True`, chat templates) and dated checkpoints
// join nothing.
const UGI_FIRST_PARTY = new Set(['openai', 'anthropic', 'google', 'xai', 'x-ai', 'deepseek-ai', 'moonshotai', 'qwen', 'zai-org', 'z-ai', 'mistralai']);
export function parseUgiLabel(sourceId) {
  const m = /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)(?: \(reasoning_effort=([a-z]+)\))?$/.exec(String(sourceId).trim());
  if (!m || !UGI_FIRST_PARTY.has(m[1].toLowerCase())) return { family: null, effort: null };
  const slug = normaliseSlug(m[2]);
  if (/-20\d{2}-?\d{2}-?\d{2}($|-)/.test(slug)) return { family: null, effort: null };
  return { family: slug, effort: m[3] ?? null };
}

// 2026-09-26 (CR-173, vals-simplebench lane): SimpleBench (simple-bench.com, `leaderboardData` in
// static/js/leaderboard-data.js) labels models by product name, sometimes with the setting in parentheses
// ("Kimi K3 (max)", "GPT-5.6 Sol (xhigh)"). Same reviewed rule as MathArena: only these exact names are recognised,
// the parenthesis is the stated setting, and a label without one ("GPT-6 Sol", "Claude Opus 5.5") joins only a
// family whose catalog holds a single default configuration (GPT-6 Astra Pro). Every other label keeps the generic
// exact-display-name bridge of scripts/ingest-benchmark-scores.mjs and nothing more. Not mapped: "Qwen 3.8 2.4T
// A95B" (the board does not say which catalog Qwen 3.8 product that is) and "Claude Fable" (no version).
const SIMPLEBENCH_MODELS = new Map(Object.entries({
  'gpt-6 astra': 'gpt-6-astra', 'gpt-6 astra pro': 'gpt-6-astra-pro', 'gpt-6 sol': 'gpt-6-sol', 'gpt-6 luna': 'gpt-6-luna',
  'claude opus 5.5': 'claude-opus-5.5', 'claude fable 5.1': 'claude-fable-5.1', 'gemini 3.8 flash': 'gemini-3.8-flash',
  'grok 4.7': 'grok-4.7', 'kimi k3': 'kimi-k3', 'deepseek v4.1 flash': 'deepseek-v4.1-flash', 'glm 5.3': 'glm-5.3',
  'qwen 3.8 27b': 'qwen3.8-27b',
}));

/** SimpleBench labels: `<Model>` or `<Model> (<setting>)`. */
export function parseSimpleBenchLabel(sourceId) {
  const m = /^(.*?)(?:\s*\(([^()]+)\))?\s*$/.exec(String(sourceId));
  return { family: SIMPLEBENCH_MODELS.get(m[1].trim().toLowerCase()) ?? null, effort: m[2] ? m[2].trim().toLowerCase() : null };
}

// 2026-09-26 (CR-173): Terminal-Bench 4.0 (tbench.ai). The board's row IDs are UUIDs and its display label names only
// the model ("GPT-6 Astra"); the reasoning effort is the row's own `metadata.reasoning_effort` field, which the
// collector keeps verbatim in the protocol as `; effort=<value>` (parser kind `terminalbench`, context field
// `effort`). Only these reviewed display names are read; the effort must be exactly one stated `effort=` value.
// The agent harness is the row's own field (subject.harness) and never changes the model identity.
const TERMINAL_BENCH_MODELS = new Map(Object.entries({
  'gpt-6 astra': 'gpt-6-astra', 'gpt-6 sol': 'gpt-6-sol', 'gpt-6 luna': 'gpt-6-luna',
  'gpt-5.6 sol': 'gpt-5.6-sol', 'gpt-5.6 terra': 'gpt-5.6-terra', 'gpt-5.6 luna': 'gpt-5.6-luna',
  'opus 5.5': 'claude-opus-5.5', 'opus 5': 'claude-opus-5', 'opus 4.8': 'claude-opus-4.8',
  'fable 5.1': 'claude-fable-5.1', 'fable 5': 'claude-fable-5', 'sonnet 5': 'claude-sonnet-5',
  'glm-5.3': 'glm-5.3', 'grok 4.7': 'grok-4.7', 'grok 4.6': 'grok-4.6', 'grok 4.5': 'grok-4.5',
  'gemini 3.8 flash': 'gemini-3.8-flash', 'gemini 3.7 flash': 'gemini-3.7-flash',
}));
/** Terminal-Bench 4.0 rows: display name + the `effort=` value the collector kept from the source row. */
export function parseTerminalBenchRow(_sourceId, name, protocol = '') {
  const efforts = [...String(protocol).matchAll(/; effort=([A-Za-z]+)(?=;|$)/g)].map((m) => m[1].toLowerCase());
  const family = TERMINAL_BENCH_MODELS.get(String(name).trim().toLowerCase()) ?? null;
  return { family, effort: efforts.length === 1 ? efforts[0] : null };
}

// 2026-09-26 (CR-173): arena.ai (LMArena) WebDev and Agent Arena. Labels are the board's own display names; only these
// reviewed names join, each to the exact configuration the label states ("gpt-6-astra-max", "GPT 6 Astra (Max)").
// A row LMArena marks as a pre-release or co-release entry (`"releaseType":"pre_release"|"co_release"`, kept in the
// protocol) never joins: its votes may belong to a checkpoint other than the released model. Names without a stated
// setting join only a family whose single catalog configuration is the default (shared boardJoins rule).
const LMARENA_LABELS = new Map(Object.entries({
  // WebDev (Code Arena) display names
  'claude-opus-5.5-max': ['claude-opus-5.5', 'max'], 'claude-fable-5.1-max': ['claude-fable-5.1', 'max'],
  'claude-opus-5-max': ['claude-opus-5', 'max'], 'claude-opus-5-high': ['claude-opus-5', 'high'],
  'claude-fable-5-high': ['claude-fable-5', 'high'], 'claude-sonnet-5-high': ['claude-sonnet-5', 'high'],
  'gpt-6-astra-max': ['gpt-6-astra', 'max'], 'gpt-6-sol-max': ['gpt-6-sol', 'max'], 'gpt-6-luna-max': ['gpt-6-luna', 'max'],
  'gpt-5.6-sol-xhigh (codex-harness)': ['gpt-5.6-sol', 'xhigh'], 'gpt-5.6-terra-xhigh (codex-harness)': ['gpt-5.6-terra', 'xhigh'],
  'gpt-5.6-luna-xhigh (codex-harness)': ['gpt-5.6-luna', 'xhigh'],
  'kimi-k3-max': ['kimi-k3', 'max'], 'grok-4.7-xhigh': ['grok-4.7', 'xhigh'], 'grok-4.6-high': ['grok-4.6', 'high'],
  'muse-spark-1.3-max': ['muse-spark-1.3', 'max'], 'muse-spark-1.3 (xhigh)': ['muse-spark-1.3', 'xhigh'],
  'deepseek-v4.1-flash-max': ['deepseek-v4.1-flash', 'max'], 'glm-5.3-max': ['glm-5.3', 'max'], 'glm-5.2-max': ['glm-5.2', 'max'],
  'glm-5.3-flash': ['glm-5.3-flash', null],
  // Agent Arena display names
  'claude fable 5.1 (max)': ['claude-fable-5.1', 'max'], 'claude opus 5 (high)': ['claude-opus-5', 'high'],
  'claude opus 5 (max)': ['claude-opus-5', 'max'], 'claude fable 5 (high)': ['claude-fable-5', 'high'],
  'claude opus 4.8 (high)': ['claude-opus-4.8', 'high'], 'claude sonnet 5 (high)': ['claude-sonnet-5', 'high'],
  'gpt 6 astra (max)': ['gpt-6-astra', 'max'], 'gpt 6 sol (max)': ['gpt-6-sol', 'max'],
  'gpt 5.6 sol (xhigh)': ['gpt-5.6-sol', 'xhigh'], 'gpt 5.6 terra (xhigh)': ['gpt-5.6-terra', 'xhigh'],
  'gpt 5.6 luna (xhigh)': ['gpt-5.6-luna', 'xhigh'], 'gpt 5.5 (xhigh)': ['gpt-5.5', 'xhigh'],
  'kimi k3 (max)': ['kimi-k3', 'max'], 'deepseek v4.1 flash (max)': ['deepseek-v4.1-flash', 'max'],
  'glm 5.2 (max)': ['glm-5.2', 'max'], 'glm 5.3 (max)': ['glm-5.3', 'max'], 'glm 5.3 flash': ['glm-5.3-flash', null],
  'muse spark 1.3 (max)': ['muse-spark-1.3', 'max'], 'grok 4.7 (xhigh)': ['grok-4.7', 'xhigh'], 'grok 4.6 (xhigh)': ['grok-4.6', 'xhigh'],
}));
/** LMArena WebDev / Agent Arena rows: reviewed display names; pre-/co-release rows refused. */
export function parseLmarenaLabel(_sourceId, name, protocol = '') {
  if (/"releaseType":"(pre_release|co_release)"/.test(String(protocol))) return { family: null, effort: null };
  const hit = LMARENA_LABELS.get(String(name).trim().toLowerCase());
  return hit ? { family: hit[0], effort: hit[1] } : { family: null, effort: null };
}
