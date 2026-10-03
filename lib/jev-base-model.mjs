// CR-254 (2026-10-01): a cited "Base model" display for every JevBench and ImageJevBench row. The
// metadata is a separate presentation overlay (data/jevbench-base-models.json) owned by the root
// job — this module only resolves and normalises it. It is a static JSON import with no fs access,
// so both the server pages and the client board components can use it. Nothing here touches a score,
// rank, artifact, price or the scorer; it is strictly presentation metadata.

import metadata from '../data/jevbench-base-models.json' with { type: 'json' };

export const BASE_MODEL_SCHEMA_VERSION = 1;
export const BASE_MODEL_BENCHMARKS = Object.freeze(['jevbench', 'imagejevbench']);
export const BASE_MODEL_METADATA = metadata;

const UNDISCLOSED = Object.freeze({ status: 'undisclosed', label: 'undisclosed' });

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function normaliseSources(sources) {
  if (!Array.isArray(sources)) return [];
  const out = [];
  for (const source of sources) {
    if (!isRecord(source)) continue;
    const url = typeof source.url === 'string' ? source.url.trim() : '';
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) continue;
    } catch { continue; } // a citation requires a usable public URL
    out.push({
      url,
      title: typeof source.title === 'string' && source.title.trim() ? source.title.trim() : '',
      evidence: typeof source.evidence === 'string' ? source.evidence.trim() : '',
    });
  }
  return out;
}

/** A disclosed base model must carry at least one source with a URL and a non-empty label.
 *  Anything else — no key, unknown benchmark, missing/empty label, no usable source — resolves to
 *  "undisclosed" so the display never infers a base model the metadata does not document. */
function entryFor(scope, key) {
  const raw = isRecord(scope) && typeof key === 'string' && Object.hasOwn(scope, key) ? scope[key] : null;
  if (!isRecord(raw)) return { ...UNDISCLOSED, sources: [], note: null };
  const sources = normaliseSources(raw.sources);
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const disclosed = raw.status === 'disclosed' && label !== '' && sources.length > 0;
  // CR-277: a base the developer reported to us privately (no public citation) shows its label as self-reported,
  // with a required note saying where it comes from; it never counts as a cited public disclosure.
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null;
  const selfReported = !disclosed && raw.status === 'self-reported' && label !== '' && label !== 'undisclosed' && note !== null;
  return {
    status: disclosed ? 'disclosed' : selfReported ? 'self-reported' : 'undisclosed',
    label: disclosed ? label : selfReported ? `${label} (self-reported)` : 'undisclosed',
    sources,
    note,
  };
}

/** Resolve the cited base model for one system row of one benchmark. Image and text keys are scoped
 *  separately (the same key string can exist in both benchmarks and means a different model). */
export function baseModelFor(benchmark, key, overlay = metadata) {
  const scope = BASE_MODEL_BENCHMARKS.includes(benchmark) && isRecord(overlay?.benchmarks)
    ? overlay.benchmarks[benchmark] : null;
  const entry = entryFor(scope, key);
  return {
    benchmark: typeof benchmark === 'string' ? benchmark : null,
    key: typeof key === 'string' ? key : null,
    ...entry,
  };
}

export const isBaseModelDisclosed = (entry) => Boolean(entry) && entry.status === 'disclosed' && entry.sources.length > 0;

/** Every system of one benchmark with a normalised entry, so consumers can map rows or serve the overlay. */
export function baseModelsForBenchmark(benchmark) {
  const scope = BASE_MODEL_BENCHMARKS.includes(benchmark) && isRecord(metadata?.benchmarks)
    ? metadata.benchmarks[benchmark] : null;
  const out = {};
  if (isRecord(scope)) {
    for (const key of Object.keys(scope)) out[key] = baseModelFor(benchmark, key);
  }
  return out;
}
