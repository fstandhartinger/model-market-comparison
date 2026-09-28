// Endpoints a worker model must not be served from, and the measurement that says why.
//
// D249.5 (2026-09-28). Pinning a model does not pin a provider: OpenRouter serves one model id
// from dozens of endpoints, and they do not behave alike. The 05:17 daily run of 2026-09-28 sent
// 86 of 94 critic calls for `z-ai/glm-5.3-flash` to one of them and overran its 140-minute step
// by 175 ms, publishing nothing. `provider.ignore` is the only place a request can say which
// endpoint it will not accept — `require_parameters` cannot, because all 33 endpoints of that
// model advertise `reasoning` support.
//
// The bar for an entry is deliberately high, because a provider blocklist is a maintenance
// burden and goes stale silently:
//
//   * the entry names one model id and one provider tag, never a provider outright;
//   * `measurement` states what was measured, against which other endpoint, on which date;
//   * it is a property of the endpoint that our request cannot change. A slow answer under load
//     is not one; a different interpretation of a parameter we send is.
//
// A ceiling on price was measured as the alternative and rejected: OpenRouter's catalog price is
// the cheapest endpoint for some models and a middle price for others, so the same ceiling that
// admits 29 of 33 endpoints for this critic admits 2 of 30 for `deepseek/deepseek-v4-flash-0731`,
// which makes half the run's calls. A multiple of it is an unmeasured constant. See PROGRESS.md
// D249.4 — the cost-integrity question it raises is still open and is not what this file answers.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../../daily/worker-endpoint-exclusions.json', import.meta.url));

export function validateExclusions(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.exclusions)) {
    throw new Error('worker-endpoint-exclusions.json must hold an `exclusions` array');
  }
  for (const entry of doc.exclusions) {
    for (const field of ['model', 'provider', 'measured_at', 'measurement', 'recorded_by']) {
      if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
        throw new Error(`worker endpoint exclusion needs a non-empty ${field}: ${JSON.stringify(entry)}`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.measured_at)) {
      throw new Error(`worker endpoint exclusion measured_at must be a YYYY-MM-DD date: ${entry.measured_at}`);
    }
  }
  return doc;
}

/**
 * Provider tags this model must not be served from, in file order. Any other model is unaffected:
 * an exclusion is never global, because the behaviour it records was measured on one model.
 */
export function ignoredProvidersFor(doc, modelId) {
  return (doc?.exclusions ?? []).filter((e) => e.model === modelId).map((e) => e.provider);
}

export async function loadExclusions(path = FILE) {
  // A missing or unreadable list must never take the daily run down: it is a refinement of the
  // request, not a precondition for making one. A malformed one is a different matter and throws.
  const text = await readFile(path, 'utf8').catch(() => null);
  if (text === null) return { exclusions: [] };
  return validateExclusions(JSON.parse(text));
}
