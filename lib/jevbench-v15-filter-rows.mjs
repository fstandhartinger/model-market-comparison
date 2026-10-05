import { baseModelFor } from './jev-base-model.mjs';
import { jevArchFor } from './jevbench-architecture.mjs';
/**
 * Flatten only explicit v1.5 release metadata into the shared filter contract.
 * Unknown parameter counts and prices stay null rather than being guessed from model names.
 */
const finite = (value) => Number.isFinite(value) ? value : null;
const openStatus = (value) => {
  if (value === true || value === 'yes') return 'yes';
  if (value === 'weights' || value === 'open weights') return 'weights';
  if (value === false || value === 'no') return 'no';
  return 'unknown';
};

function metadataFor(row, artifact, previous, eligibilityByKey, revisionHref) {
  const costBasis = String(row.cost?.basis ?? '');
  const costPer1000 = finite(row.cost?.usd_per_1000);
  const isApi = row.api_flag === true;
  const isBaseFloor = /(?:price floor|base[- ]model reference price)/i.test(costBasis)
    && !/no (?:exact )?base[- ]model floor applies/i.test(costBasis);
  const eligibility = eligibilityByKey instanceof Map
    ? eligibilityByKey.get(row.key)
    : eligibilityByKey?.[row.key];
  const status = typeof eligibility === 'string'
    ? eligibility
    : eligibility?.status ?? (typeof eligibility === 'boolean' ? (eligibility ? 'eligible' : 'outside') : 'unknown');
  const reason = typeof eligibility === 'object' && eligibility ? eligibility.reason ?? null : null;
  const isNew = previous.size > 0 && !previous.has(row.key);
  const versionAdded = row.addendum?.release ?? (isNew ? artifact.revision : null);
  const revisionNotesHref = row.addendum || isNew ? `${revisionHref}#jev15-addendum` : `${revisionHref}#jev15-method`;
  const parameterCount = finite(row.parameters_b ?? row.parameter_count_b ?? row.params_b);
  const family = /^wity[-_]1$/.test(row.key) ? baseModelFor('jevbench', row.key).label : [row.underlying, row.family, row.base_model, row.baseModel]
    .find((value) => typeof value === 'string' && value.trim() && value !== 'closed') ?? null;

  return {
    key: row.key,
    display: row.display,
    provider: row.author ?? null,
    family,
    modelType: jevArchFor('jevbench', row).arch,
    openStatus: openStatus(row.open),
    api: isApi,
    newInVersion: isNew,
    parametersB: parameterCount,
    licence: row.licence ?? null,
    apiPricePer1000: isApi && !isBaseFloor ? costPer1000 : null,
    basePricePer1000: isBaseFloor ? costPer1000 : null,
    costPer1000,
    alternativePricePer1000: finite(row.alt?.usd_per_1000),
    p50: finite(row.speed?.p50_s_adjusted),
    p95: finite(row.speed?.p95_s_adjusted),
    eligibility: status,
    eligibilityReason: reason ?? row.not_ranked_because ?? null,
    listing: row.listing ?? 'not measured',
    versionAdded,
    revisionNotesHref,
  };
}

/**
 * Build browser-safe filter metadata from a released v1.5 aggregate. The result
 * includes the artifact's non-measured roster rows so search and provider filters
 * can find them too; those rows keep all score/price/latency values unknown.
 */
export function jevV15FilterRows(artifact, {
  previousKeys = [],
  eligibilityByKey = {},
  revisionHref = `/jev-models/${artifact?.revision ?? ''}`,
} = {}) {
  if (!artifact || !Array.isArray(artifact.systems)) throw new TypeError('A JevBench v1.5 artifact is required');
  const previous = new Set(previousKeys);
  const measured = artifact.systems.map((row) => metadataFor(row, artifact, previous, eligibilityByKey, revisionHref));
  const keys = new Set(measured.map((row) => row.key));
  const notMeasured = (artifact.not_measured ?? []).filter((row) => !keys.has(row.key)).map((row) => ({
    key: row.key,
    display: row.display,
    provider: row.author ?? null,
    family: null,
    modelType: null,
    openStatus: 'unknown',
    api: null,
    newInVersion: previous.size > 0 && !previous.has(row.key),
    parametersB: null,
    licence: null,
    apiPricePer1000: null,
    basePricePer1000: null,
    costPer1000: null,
    alternativePricePer1000: null,
    p50: null,
    p95: null,
    eligibility: 'unknown',
    eligibilityReason: row.reason ?? row.status ?? 'Not measured in this release',
    listing: 'not measured',
    versionAdded: row.addendum?.release ?? null,
    revisionNotesHref: `${revisionHref}#jev15-method`,
  }));
  return [...measured, ...notMeasured];
}
