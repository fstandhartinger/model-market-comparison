// 2026-09-15: reviewed exact identity rules for measured coding leaderboards whose labels are not
// catalog display names (DeepSWE via Epoch AI, Scale SWE Atlas). A label joins a catalog configuration
// only when it states the exact model and effort that exists in the catalog; a label without an effort
// joins only a family with a single catalog configuration. A configuration listed more than once on
// the same board (e.g. under two harnesses) joins neither row. No fuzzy matching, no effort guessing.

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
  const counts = new Map();
  for (const p of proposed) if (p.model_id) counts.set(p.model_id, (counts.get(p.model_id) ?? 0) + 1);
  return proposed.map((p) => p.model_id && counts.get(p.model_id) > 1
    ? { row: p.row, model_id: null, reason: `configuration ${p.model_id} appears ${counts.get(p.model_id)} times on this board (different harnesses); neither row is joined` }
    : p);
}
