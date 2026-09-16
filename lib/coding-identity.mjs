// 2026-09-15: reviewed exact identity rules for measured coding leaderboards whose labels are not
// catalog display names (DeepSWE via Epoch AI, Scale SWE Atlas). A label joins a catalog configuration
// only when it states the exact model and effort that exists in the catalog; a label without an effort
// joins only a family with a single catalog configuration. A configuration listed more than once on
// the same board (e.g. under two harnesses) joins neither row. No fuzzy matching, no effort guessing.

import { refuseRepeats } from './board-identity.mjs';

const EFFORTS = new Set(['minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

/** Epoch's "Model version" for DeepSWE: `<model-slug>_<effort>` or a bare slug. A bare slug can still carry
 *  an effort in its label ("gemini-3.1-pro-preview (high)", from the Reasoning effort column); that effort
 *  counts as stated, so such a row can never fall through to a default configuration. */
export function parseDeepSweId(sourceId, name = '') {
  const m = /^(.+?)(?:_(minimal|low|medium|high|xhigh|max))?$/.exec(String(sourceId));
  // claude-opus-4-8 → claude-opus-4.8, only when every earlier token is a word (never a dated snapshot).
  const slug = m[1].replace(/^([a-z]+(?:-[a-z]+)*)-(\d)-(\d)$/, '$1-$2.$3');
  const labelled = /\((minimal|low|medium|high|xhigh|max)\)\s*$/i.exec(String(name))?.[1]?.toLowerCase() ?? null;
  return { family: slug, effort: m[2] ?? labelled };
}

// Scale labels name products in prose; only these reviewed names are recognised.
const SCALE_MODELS = new Map(Object.entries({
  'opus 5': 'claude-opus-5', 'opus 4.8': 'claude-opus-4.8', 'opus 4.7': 'claude-opus-4.7', 'opus 4.6': 'claude-opus-4.6',
  'fable 5.1': 'claude-fable-5.1', 'fable 5': 'claude-fable-5', 'sonnet 4.6': 'claude-sonnet-4.6',
  'gpt 6 astra': 'gpt-6-astra', 'gpt 5.6 sol': 'gpt-5.6-sol', 'gpt 5.5': 'gpt-5.5', 'gpt 5.4': 'gpt-5.4',
  'muse spark 1.1': 'muse-spark-1.1', 'glm 5.2': 'glm-5.2', 'glm 5': 'glm-5', 'gemini 3.8 flash': 'gemini-3.8-flash',
  'deepseek v4 pro': 'deepseek-v4-pro', 'kimi k2.5': 'kimi-k2.5', 'minimax m2.5': 'minimax-m2.5',
}));

/** Scale SWE Atlas labels: "Opus 5 (Claude Code) xHigh", "Gpt 5.4 xHigh (Mini-SWE-Agent)", "Muse Spark". */
export function parseScaleLabel(label) {
  let rest = String(label).replace(/\*/g, ' ').replace(/\s+/g, ' ').trim();
  const harness = /\(([^()]+)\)/.exec(rest)?.[1] ?? null;
  rest = rest.replace(/\([^()]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const words = rest.split(' ');
  const last = words[words.length - 1]?.toLowerCase();
  const effort = EFFORTS.has(last) ? last : null;
  if (effort) words.pop();
  const name = words.join(' ').toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return { family: SCALE_MODELS.get(name) ?? null, effort, harness, name };
}

// 2026-09-15 (iteration 69): self-reported vendor boards. Their values keep the critic approval of the unjoined row;
// the join itself needs its own independent review receipt (see scripts/ingest-benchmark-scores.mjs).
const FRONTIERCODE_MODELS = new Map(Object.entries({
  'claude fable 5.1': 'claude-fable-5.1', 'claude fable 5': 'claude-fable-5', 'claude opus 5': 'claude-opus-5',
  'claude opus 4.8': 'claude-opus-4.8', 'claude opus 4.7': 'claude-opus-4.7', 'claude opus 4.6': 'claude-opus-4.6',
  'claude sonnet 5': 'claude-sonnet-5', 'claude sonnet 4.6': 'claude-sonnet-4.6',
  'gpt-6 astra': 'gpt-6-astra', 'gpt-5.6 sol': 'gpt-5.6-sol', 'gpt-5.6 terra': 'gpt-5.6-terra', 'gpt-5.6 luna': 'gpt-5.6-luna',
  'gpt-5.5': 'gpt-5.5', 'gpt-5.4-mini': 'gpt-5.4-mini', 'grok 4.5': 'grok-4.5', 'grok 4.6': 'grok-4.6',
  'gemini 3.6 flash': 'gemini-3.6-flash', 'gemini 3.7 flash': 'gemini-3.7-flash', 'gemini 3.8 flash': 'gemini-3.8-flash',
  'deepseek v4 pro': 'deepseek-v4-pro', 'deepseek v4 pro 0813': 'deepseek-v4-pro-0813', 'deepseek v4 flash 0731': 'deepseek-v4-flash-0731',
  'glm 5.3': 'glm-5.3', 'glm 5.3 flash': 'glm-5.3-flash', 'glm 5.2': 'glm-5.2', 'kimi k3': 'kimi-k3',
  'minimax m3': 'minimax-m3', 'qwen 3.7 plus': 'qwen3.7-plus', 'composer 2.5': 'composer-2.5',
}));

/** Cognition FrontierCode ids: `<Model>|<effort>`. "none" (and non-effort values like "0.99") state no effort. */
export function parseFrontierCodeId(sourceId) {
  const [model, effort] = String(sourceId).split('|');
  const e = effort?.toLowerCase();
  return { family: FRONTIERCODE_MODELS.get(model.trim().toLowerCase()) ?? null, effort: EFFORTS.has(e) ? e : null };
}

const CURSORBENCH_MODELS = new Map(Object.entries({
  'fable 5.1': 'claude-fable-5.1', 'opus 5': 'claude-opus-5', 'sonnet 5': 'claude-sonnet-5',
  'gpt-5.6 sol': 'gpt-5.6-sol', 'gpt-5.6 terra': 'gpt-5.6-terra', 'gpt-5.6 luna': 'gpt-5.6-luna',
  'muse spark 1.3': 'muse-spark-1.3', 'grok 4.6': 'grok-4.6', 'gemini 3.8 flash': 'gemini-3.8-flash', 'composer 2.5': 'composer-2.5',
}));
const CURSOR_EFFORTS = [['extra high', 'xhigh'], ['minimal', 'minimal'], ['low', 'low'], ['medium', 'medium'], ['high', 'high'], ['max', 'max']];

/** CursorBench labels: "Opus 5 Extra High", "Composer 2.5" (no effort). */
export function parseCursorBenchLabel(label) {
  const text = String(label).trim().toLowerCase().replace(/\s+/g, ' ');
  const hit = CURSOR_EFFORTS.find(([word]) => text.endsWith(` ${word}`));
  const name = hit ? text.slice(0, -hit[0].length - 1) : text;
  return { family: CURSORBENCH_MODELS.get(name) ?? null, effort: hit?.[1] ?? null };
}

// Scale's SWE-Bench Pro Public labels are mostly older API slugs; only these reviewed ones are recognised.
const SWE_BENCH_PRO_MODELS = new Map(Object.entries({
  'gpt-5.4': 'gpt-5.4', 'muse spark': 'muse-spark', 'muse spark 1.1': 'muse-spark-1.1', 'minimax-2.1': 'minimax-m2.1',
  'claude-opus-4-5-20251101': 'claude-opus-4.5', 'claude-4-5-haiku': 'claude-haiku-4.5', 'gpt-oss-120b': 'gpt-oss-120b',
}));

/** SWE-Bench Pro labels: "gpt-5.4 (xHigh)*"; "(thinking)" is not an effort level; the asterisk marks the harness. */
export function parseSweBenchProLabel(label) {
  const text = String(label).replace(/\*/g, '').trim();
  const e = /\(([^()]+)\)\s*$/.exec(text)?.[1]?.toLowerCase() ?? null;
  const name = text.replace(/\([^()]*\)\s*$/, '').trim().toLowerCase();
  return { family: SWE_BENCH_PRO_MODELS.get(name) ?? null, effort: EFFORTS.has(e) ? e : null };
}

/** One board's rows → reviewed joins. `catalog`: [{ id, family_key, variant }]. */
export function identityJoins(rows, parse, catalog) {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const byFamily = new Map();
  for (const m of catalog) byFamily.set(m.family_key, [...(byFamily.get(m.family_key) ?? []), m]);
  const proposed = rows.map((row) => {
    const { family, effort } = parse(row.source_id, row.name);
    if (!family) return { row, model_id: null, reason: 'model name not in the reviewed list' };
    if (effort) {
      const id = `${family}::${effort}`;
      return byId.has(id) ? { row, model_id: id, rule: `label states model ${family} and effort ${effort}; exact catalog configuration ${id}` }
        : { row, model_id: null, reason: `no catalog configuration ${id}` };
    }
    // Without a stated effort only a family's single default configuration joins: joining a lone
    // "xhigh" configuration would still guess the tested effort.
    const configs = byFamily.get(family) ?? [];
    if (configs.length === 1 && configs[0].variant === 'default') return { row, model_id: configs[0].id, rule: `label names ${family} without an effort; the catalog has exactly one configuration, the default (${configs[0].id})` };
    return { row, model_id: null, reason: !configs.length ? `family ${family} not in the catalog`
      : configs.length === 1 ? `effort not stated and the only catalog configuration is ${configs[0].id}, not a default` : `effort not stated and ${family} has ${configs.length} catalog configurations` };
  });
  return refuseRepeats(proposed, 'different harnesses');
}
