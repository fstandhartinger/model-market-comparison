/**
 * CR-122 (Florian 2026-09-22, launch sniper): a compare link may name a model that is not in the data yet.
 *
 * A model-release post is answered within seconds, before the release is collected. The link
 * `/compare?model=<known id>&model=<expected id>` must therefore stay valid: the known model shows its
 * numbers, the unknown id is kept, named readably and marked "coming soon", and the very same URL shows
 * real numbers once that id is ingested. No value is ever invented for the unknown model.
 *
 * Nothing here reads the dataset; it only maps URL ids onto the catalog's own family list, so it is the
 * one place the page, the metadata and the preview image agree on.
 */

const VENDOR_PREFIXES = ['openai', 'anthropic', 'google', 'x-ai', 'xai', 'meta-llama', 'meta', 'mistralai', 'deepseek', 'qwen', 'alibaba', 'moonshotai', 'z-ai', 'zhipu'];
/** Ids a bot may write for the same model: `Claude-Opus-5.5`, `claude-opus-5-5-20261101`, `anthropic/claude-opus-5.5`. */
export function normalizeModelKey(raw) {
  let s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  s = s.split('::')[0];                       // catalog ids are `family::variant`
  const slash = s.lastIndexOf('/');
  if (slash >= 0) s = s.slice(slash + 1);     // `anthropic/claude-opus-5.5`, `openai/gpt-6`
  s = s.replace(/[^a-z0-9]+/g, '-');          // dots, spaces, underscores are all separators
  s = s.replace(/([a-z])(\d)/g, '$1-$2').replace(/(\d)([a-z])/g, '$1-$2'); // gpt6 == gpt-6
  s = s.replace(/-(?:19|20)\d{6}$/, '');      // vendor date suffixes (claude-opus-4-5-20251101)
  s = s.replace(/-(latest|preview|beta)$/, '');
  return s.replace(/^-+|-+$/g, '');
}

/** The same key without its vendor word, so `opus-5.5` still finds `claude-opus-5.5`. */
export function looseModelKey(raw) {
  const key = normalizeModelKey(raw);
  if (!key) return '';
  for (const vendor of [...VENDOR_PREFIXES, 'claude']) if (key.startsWith(`${vendor}-`)) return key.slice(vendor.length + 1);
  return key;
}

const WORD_CASE = new Map([['gpt', 'GPT'], ['glm', 'GLM'], ['oss', 'OSS'], ['ai', 'AI'], ['llm', 'LLM'], ['vl', 'VL'], ['moe', 'MoE'], ['xl', 'XL'], ['ui', 'UI'], ['r', 'R'], ['v', 'V']]);
const isNumeric = (t) => /^\d+(\.\d+)?$/.test(t);

/** A readable name for an id that has no catalog entry: `gpt-6-sol` → `GPT-6 Sol`, `claude-opus-5-5` → `Claude Opus 5.5`. */
export function prettyModelName(raw) {
  const base = String(raw ?? '').trim().split('::')[0].replace(/^.*\//, '');
  const tokens = base.split(/[-_\s.]+/).filter(Boolean);
  if (!tokens.length) return String(raw ?? '');
  // `claude-opus-4-5` and `claude-opus-4.5` are the same model: join two short numbers with a dot.
  const merged = [];
  for (const token of tokens) {
    const last = merged[merged.length - 1];
    if (last != null && isNumeric(last) && /^\d{1,2}$/.test(token) && !last.includes('.')) merged[merged.length - 1] = `${last}.${token}`;
    else merged.push(token);
  }
  const words = merged.map((token) => {
    const lower = token.toLowerCase();
    if (WORD_CASE.has(lower)) return WORD_CASE.get(lower);
    if (isNumeric(token)) return token;
    if (/^\d/.test(token)) return token.toLowerCase();                       // 4o, 3b, 120b
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  // A brand word followed by a version number reads as one name: GPT-6 Sol, GLM-5.3 Flash.
  const out = [];
  for (const word of words) {
    const last = out[out.length - 1];
    if (last && (last === 'GPT' || last === 'GLM') && isNumeric(word)) out[out.length - 1] = `${last}-${word}`;
    else out.push(word);
  }
  return out.join(' ');
}

/** The organisation an unknown id most likely belongs to — used in text only, never as a claim about a score. */
export function guessOrg(raw) {
  const key = normalizeModelKey(raw);
  if (/^(gpt|o-\d|codex|sora)/.test(key)) return 'OpenAI';
  if (key.startsWith('claude')) return 'Anthropic';
  if (/^(gemini|gemma)/.test(key)) return 'Google';
  if (key.startsWith('grok')) return 'xAI';
  if (key.startsWith('llama')) return 'Meta';
  if (/^(qwen|deepseek|kimi|glm|minimax|mistral)/.test(key)) return null;
  return null;
}

/** Only ids that could plausibly be a model id are echoed back into the page and its preview tags. */
export const isPlausibleModelId = (raw) => typeof raw === 'string' && raw.length > 0 && raw.length <= 80 && /^[A-Za-z0-9][A-Za-z0-9._:\-/ ]*$/.test(raw);

function familyIndex(families) {
  const exact = new Map(), keys = new Map(), loose = new Map();
  const add = (map, key, family) => {
    if (!key) return;
    const seen = map.get(key);
    // First match wins, except that a current family beats a retired one with the same key.
    if (!seen || (!seen.current && family.current)) map.set(key, family);
  };
  for (const family of families ?? []) {
    exact.set(family.id, family);
    for (const variant of family.variants ?? []) exact.set(variant, family);
    add(keys, normalizeModelKey(family.id), family);
    add(keys, normalizeModelKey(family.name), family);
    add(loose, looseModelKey(family.id), family);
  }
  return { exact, keys, loose };
}

/**
 * Maps the `model` parameters of a compare URL onto catalog families, keeping ids that do not exist yet.
 * Returns the entries in the URL's order; `picks` are catalog ids, `pending` are the unknown ones.
 */
export function resolveCompareIds(rawIds, families, { limit = 4 } = {}) {
  const index = familyIndex(families);
  const entries = [], seen = new Set();
  for (const raw of rawIds ?? []) {
    if (entries.length >= limit) break;
    if (!isPlausibleModelId(raw)) continue;
    const family = index.exact.get(raw) ?? index.keys.get(normalizeModelKey(raw)) ?? index.loose.get(looseModelKey(raw));
    const key = family ? family.id : normalizeModelKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (family) entries.push({ kind: 'known', id: family.id, name: family.name, org: family.org ?? null, score: family.score ?? null });
    else entries.push({ kind: 'pending', id: raw, name: prettyModelName(raw), org: guessOrg(raw), score: null });
  }
  return { entries, picks: entries.filter((e) => e.kind === 'known').map((e) => e.id), pending: entries.filter((e) => e.kind === 'pending') };
}

/** The canonical query for a resolved selection: catalog ids for known models, the id as written for pending ones. */
export function compareQuery(entries) {
  const q = new URLSearchParams();
  for (const entry of entries) q.append('model', entry.id);
  return q;
}

export const COMING_SOON_LINE = 'Coming soon — numbers land here as soon as they are published.';

/** "Claude Fable 5.1 vs GPT-6 Sol" — the models in the order of the URL. */
export const compareHeadline = (entries) => (entries ?? []).map((e) => e.name).join(' vs ');

/**
 * The shared description. It states what is measured and what is not; a pending model never gets a number,
 * an estimate or a hedge that could read as one.
 */
export function compareDescription(entries) {
  const list = entries ?? [];
  const named = list.map((entry) => (entry.kind === 'known' && Number.isFinite(entry.score) ? `${entry.name} (AA Intelligence Index ${entry.score.toFixed(1)})` : entry.name)).join(' vs ');
  const pending = list.filter((entry) => entry.kind === 'pending');
  const soon = pending.length ? ` ${pending.map((p) => p.name).join(' and ')} ${pending.length === 1 ? 'is' : 'are'} not measured yet — the numbers land here as soon as they are published.` : '';
  return `${named} on every benchmark with a published result, each value with its source and date, plus what each model actually costs per task.${soon}`;
}
