// CR-2.4 / CR-3.1 / CR-4.1 / CR-4.2: one preset model for compared models, benchmark rows and
// filters. "Ours" are built in and computed from the data at apply time; "yours" are saved values.
// Pure functions only, so the rules are testable and the account sync (CR-5) can reuse them.

export const PRESET_KINDS = ['models', 'rows', 'filters'];
export const STORE_KEY = 'bh.presets.v1';
const MAX_NAME = 60, MAX_PER_KIND = 50;

const cleanName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
const sameName = (a, b) => a.toLocaleLowerCase('en') === b.toLocaleLowerCase('en');
const stable = (v) => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);

/** Next free name: "Coding", "Coding (2)", "Coding (3)" … */
export function uniqueName(list, name, exceptId = null) {
  const base = cleanName(name);
  const taken = (n) => list.some((p) => p.id !== exceptId && sameName(p.name, n));
  if (!taken(base)) return base;
  for (let i = 2; ; i++) if (!taken(`${base} (${i})`)) return `${base} (${i})`;
}

/** Save under a name. Saving again under an existing name updates that preset (the user asked for
 *  that name), rather than silently creating "Name (2)". Returns the new list. */
export function savePreset(list, name, value, now = Date.now(), id = null) {
  const n = cleanName(name);
  if (!n) return list;
  const hit = list.find((p) => sameName(p.name, n));
  if (hit) return list.map((p) => p === hit ? { ...p, value, updatedAt: now } : p);
  const next = { id: id ?? `p${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`, name: n, value, updatedAt: now };
  return [...list, next].slice(-MAX_PER_KIND);
}

export function renamePreset(list, id, name, now = Date.now()) {
  const n = cleanName(name);
  if (!n) return list;
  return list.map((p) => p.id === id ? { ...p, name: uniqueName(list, n, id), updatedAt: now } : p);
}

export const deletePreset = (list, id) => list.filter((p) => p.id !== id);

/** CR-5.4: merge this browser's presets into the account's. Nothing is lost: identical values
 *  collapse, a same-named preset with a different value is kept as "Name (this browser)". */
export function mergePresets(account, local) {
  let out = [...account];
  for (const p of local) {
    if (out.some((q) => stable(q.value) === stable(p.value) && sameName(q.name, p.name))) continue;
    if (out.some((q) => q.id === p.id)) continue;
    const clash = out.some((q) => sameName(q.name, p.name));
    out.push({ ...p, name: clash ? uniqueName(out, `${p.name} (this browser)`) : p.name });
  }
  return out.slice(-MAX_PER_KIND);
}

/** Only well-formed presets of known kinds survive a load. */
export function sanitizeStore(raw) {
  const out = { models: [], rows: [], filters: [] };
  if (!raw || typeof raw !== 'object') return out;
  for (const kind of PRESET_KINDS) {
    const list = Array.isArray(raw[kind]) ? raw[kind] : [];
    for (const p of list) {
      if (!p || typeof p.id !== 'string' || !cleanName(p.name) || p.value == null) continue;
      if (kind === 'models' && !(Array.isArray(p.value) && p.value.every((x) => typeof x === 'string'))) continue;
      if (kind === 'rows' && !(Array.isArray(p.value) && p.value.every((x) => typeof x === 'string'))) continue;
      if (kind === 'filters' && (typeof p.value !== 'object' || Array.isArray(p.value))) continue;
      out[kind].push({ id: p.id, name: uniqueName(out[kind], p.name), value: p.value, updatedAt: Number(p.updatedAt) || 0 });
    }
    out[kind] = out[kind].slice(-MAX_PER_KIND);
  }
  return out;
}

// ── Rows (CR-3.1) ────────────────────────────────────────────────────────────────────────────
const HEADLINE = new Set(['headline', 'aa', 'arena']);
/** Built-in row presets. `match(row, present, total)`: `present` = values among the compared models. */
export const ROW_PRESETS = [
  { id: 'all', name: 'All', hint: 'every benchmark with a result', match: () => true },
  { id: 'important', name: 'Important', hint: 'indices and headline benchmarks', match: (r) => r.group === 'indices' || r.tags.some((t) => HEADLINE.has(t)) },
  { id: 'aa', name: 'AA Intelligence Index', hint: 'the index and every component', match: (r) => r.tags.includes('aa') },
  { id: 'coding', name: 'Coding', match: (r) => r.group === 'coding' || /coding|eci_software/i.test(r.key) },
  { id: 'agentic', name: 'Agentic & tool use', match: (r) => r.group === 'agentic' },
  { id: 'math-science', name: 'Math & science', match: (r) => r.group === 'math' || r.group === 'science' },
  { id: 'community', name: 'Community & niche', hint: 'boards beyond the headline set', match: (r) => r.tags.includes('niche') || r.tags.includes('community') },
  { id: 'complete', name: 'Full coverage only', hint: 'rows where every compared model has a value', match: (_, present, total) => present === total },
];

/** A row preset value is a built-in id or a saved list of benchmark keys. */
export function rowFilter(selection) {
  if (Array.isArray(selection)) { const keys = new Set(selection); return (r) => keys.has(r.key); }
  return (ROW_PRESETS.find((p) => p.id === selection) ?? ROW_PRESETS[0]).match;
}

// ── Models (CR-2.4) ──────────────────────────────────────────────────────────────────────────
/** Built-in model lists, each applied to the candidates that already pass the filters, in score order.
 *  `m`: { id, org, open_weights, eu, cost (adjusted $/task or null), scores }. */
export const MODEL_PRESETS = [
  { id: 'top', name: 'Frontier top 5', hint: 'highest score under your filters' },
  { id: 'open', name: 'Best open-weight', hint: 'downloadable weights only' },
  { id: 'value', name: 'Best value', hint: 'score per adjusted $ per task' },
  { id: 'coding', name: 'Coding leaders', hint: 'by AA Coding Index' },
  { id: 'labs', name: 'Flagships by lab', hint: 'each lab’s strongest model' },
  { id: 'eu', name: 'EU-hostable', hint: 'at least one EU-hosted route' },
];

export function modelsForPreset(id, candidates, score, n) {
  const by = (key) => (a, b) => (b.scores[key] ?? -Infinity) - (a.scores[key] ?? -Infinity) || a.id.localeCompare(b.id);
  const ranked = candidates.filter((m) => m.scores[score] != null).sort(by(score));
  switch (id) {
    case 'open': return ranked.filter((m) => m.open_weights).slice(0, n).map((m) => m.id);
    case 'eu': return ranked.filter((m) => m.eu).slice(0, n).map((m) => m.id);
    case 'coding': return candidates.filter((m) => m.scores.aa_coding_index != null).sort(by('aa_coding_index')).slice(0, n).map((m) => m.id);
    case 'value': return ranked.filter((m) => m.cost != null && m.cost > 0)
      .map((m) => ({ m, v: m.scores[score] / m.cost }))
      .sort((a, b) => b.v - a.v || a.m.id.localeCompare(b.m.id)).slice(0, n).map((x) => x.m.id);
    case 'labs': {
      const seen = new Set(), out = [];
      for (const m of ranked) { const lab = m.org.toLocaleLowerCase('en'); if (seen.has(lab)) continue; seen.add(lab); out.push(m.id); if (out.length === n) break; }
      return out;
    }
    default: return ranked.slice(0, n).map((m) => m.id);
  }
}

// ── Filters (CR-4.1) ─────────────────────────────────────────────────────────────────────────
/** The settings a filter preset captures and restores. Simple's own slider pair is not a filter. */
export const FILTER_KEYS = ['score', 'collapse', 'featured', 'featuredTouched', 'hideDeprecated', 'excludeChinese', 'euHostedOnly', 'nonUsOnly', 'openOnly',
  'allowDataTraining', 'isCompany', 'advancedMinScore', 'maxCost', 'minIntelligence', 'minCoding', 'providersExcluded', 'families', 'priceMode', 'inputWeight'];

/** Built-in filter presets: a patch over the defaults ("$scoreDefault" = the active score's default floor). */
export const FILTER_PRESETS = [
  { id: 'company-eu', name: 'Company, EU-hosted only', patch: { isCompany: true, euHostedOnly: true } },
  { id: 'privacy', name: 'Privacy strict', hint: 'EU-hosted, no training or retention', patch: { euHostedOnly: true, allowDataTraining: false } },
  { id: 'cheapest-capable', name: 'Cheapest capable', hint: 'featured models above the default score floor', patch: { featured: true, featuredTouched: true, advancedMinScore: '$scoreDefault' } },
  { id: 'open', name: 'Open weights only', patch: { openOnly: true } },
  { id: 'frontier', name: 'Frontier regardless of cost', hint: 'featured models, no cost cap', patch: { featured: true, featuredTouched: true, maxCost: null } },
];

export function pickFilters(state) {
  return Object.fromEntries(FILTER_KEYS.filter((k) => k in state).map((k) => [k, state[k]]));
}

/** Defaults + preset patch, with tokens resolved; the result is what the filters become. */
export function resolveFilterPatch(patch, defaults, scoreDefault) {
  const base = pickFilters(defaults);
  const out = { ...base, score: patch.score ?? base.score };
  for (const [k, v] of Object.entries(patch)) if (FILTER_KEYS.includes(k)) out[k] = v === '$scoreDefault' ? scoreDefault(out.score) : v;
  return out;
}

/** CR-2.5: filters in a shareable URL — only the keys that differ from the defaults, as a readable
 *  `key:value` list (`euHostedOnly:1;providersExcluded:a|b`). Unknown keys and malformed values are
 *  dropped on decode; the settings sanitiser still runs when the result is applied. */
export function encodeFilters(state, defaults) {
  const now = pickFilters(state), base = pickFilters(defaults);
  const parts = [];
  for (const k of FILTER_KEYS) {
    if (!(k in now) || stable(now[k]) === stable(base[k])) continue;
    const v = now[k];
    const text = v === null ? '-' : typeof v === 'boolean' ? (v ? '1' : '0') : Array.isArray(v) ? v.map(encodeURIComponent).join('|') : encodeURIComponent(String(v));
    parts.push(`${k}:${text}`);
  }
  return parts.join(';');
}

const BOOL_KEYS = new Set(['collapse', 'featured', 'featuredTouched', 'hideDeprecated', 'excludeChinese', 'euHostedOnly', 'nonUsOnly', 'openOnly', 'allowDataTraining', 'isCompany']);
const NUM_KEYS = new Set(['advancedMinScore', 'maxCost', 'minIntelligence', 'minCoding', 'inputWeight']);
const LIST_KEYS = new Set(['providersExcluded', 'families']);

export function decodeFilters(text) {
  const out = {};
  for (const part of String(text ?? '').split(';')) {
    const at = part.indexOf(':');
    if (at < 1) continue;
    const k = part.slice(0, at), raw = part.slice(at + 1);
    if (!FILTER_KEYS.includes(k)) continue;
    try {
      if (BOOL_KEYS.has(k)) { if (raw === '1' || raw === '0') out[k] = raw === '1'; }
      else if (NUM_KEYS.has(k)) { if (raw === '-') out[k] = null; else if (Number.isFinite(Number(raw)) && raw !== '') out[k] = Number(raw); }
      else if (LIST_KEYS.has(k)) out[k] = raw === '' ? [] : raw.split('|').map(decodeURIComponent);
      else out[k] = decodeURIComponent(raw);
    } catch { /* malformed escape: skip the key */ }
  }
  return out;
}

/** Which preset the current state equals, if any (so the menu can show it as selected). */
export function matchingFilterPreset(state, defaults, scoreDefault, custom = []) {
  const now = stable(pickFilters(state));
  const ours = FILTER_PRESETS.find((p) => stable(resolveFilterPatch(p.patch, defaults, scoreDefault)) === now);
  if (ours) return ours.id;
  return custom.find((p) => stable(resolveFilterPatch(p.value, defaults, scoreDefault)) === now)?.id ?? null;
}
