/** Shared URL and display rules for the Capability ranking's two independent caps. */
export const DEFAULT_CAP = 2;
export const MIN_CAP = 1;
export const MAX_CAP = 10;

/** Slider values are bounded and rounded to one decimal; Infinity means no cap. */
export function clampCap(value) {
  return value === Infinity ? Infinity : Number.isFinite(value)
    ? Math.round(Math.max(MIN_CAP, Math.min(MAX_CAP, value)) * 10) / 10 : DEFAULT_CAP;
}

export function parseCap(value) {
  if (typeof value !== 'string') return DEFAULT_CAP;
  const text = value.trim().toLowerCase();
  if (['none', 'off', 'inf'].includes(text)) return Infinity;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return DEFAULT_CAP;
  const number = Number(text);
  return Number.isFinite(number) && number >= MIN_CAP && number <= MAX_CAP ? clampCap(number) : DEFAULT_CAP;
}

export function parseCaps(params) {
  return { costFactor: parseCap(params.get('costcap')), latencyFactor: parseCap(params.get('latcap')) };
}

/** Copy the query, modifying only our own keys so composite weights/views survive. */
export function serialiseCaps(params, caps) {
  const result = new URLSearchParams(params);
  for (const [key, value] of [['costcap', caps.costFactor], ['latcap', caps.latencyFactor]]) {
    const cap = clampCap(value);
    if (cap === DEFAULT_CAP) result.delete(key);
    else result.set(key, cap === Infinity ? 'none' : String(cap));
  }
  return result;
}

export const formatCap = (cap) => cap === Infinity ? 'no cap' : `${cap}×`;
export const isOfficialCaps = ({ costFactor, latencyFactor }) => costFactor === DEFAULT_CAP && latencyFactor === DEFAULT_CAP;
