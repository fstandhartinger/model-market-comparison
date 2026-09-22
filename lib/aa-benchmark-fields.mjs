import { flightRecords, objects, resolveFlight } from './aa-rsc.mjs';
import { isDeepStrictEqual } from 'node:util';

// Preserve source units. Normalization and attachment to model rankings are phase 05.
export const AA_BENCHMARK_FIELDS = ['aime25', 'analystAgent', 'apexAgents', 'automationBenchPartialScore', 'briefcaseBreakdown', 'briefcaseTotalCost', 'critpt', 'enterpriseOpsGym', 'gdpPdfAllPass', 'gdpval', 'gdpvalBreakdown', 'gdpvalNormalized', 'gpqa', 'harveyLab', 'hle', 'ifbench', 'itBenchSre', 'lcr', 'livecodebench', 'mlcrOverall', 'mmmuPro', 'omniscience', 'omniscienceBreakdown', 'omniscienceAccuracy', 'omniscienceHallucinationRate', 'scicode', 'tau2', 'tauBanking', 'terminalbenchHard', 'terminalbenchV21', 'terminalbenchV40', 'indexCompute', 'timescaleData'];
const STRUCTURED_FIELDS = new Set(['briefcaseBreakdown', 'gdpvalBreakdown', 'omniscienceBreakdown', 'indexCompute', 'timescaleData']);
// Reviewed source renames: AA's current name → the field name the registry maps. 2026-09-16 (iteration 81): AA renamed
// terminalbenchV21 → terminalBench21 and terminalbenchV40 → terminalBench40. Checked on the 2026-09-16 capture against
// the 2026-09-10 snapshot: all 645 shared rows carry the identical Terminal-Bench 2.1 value, 638 the identical 4.0
// value, and the other 7 are 4.0 results that were null before. A page that carries both names fails.
export const AA_FIELD_RENAMES = { terminalBench21: 'terminalbenchV21', terminalBench40: 'terminalbenchV40' };
const SOURCE_NAME = Object.fromEntries(Object.entries(AA_FIELD_RENAMES).map(([source, field]) => [field, source]));
// Reviewed source restructures: a raw discovery field AA retired in favour of named successor fields. Continuity
// accepts the retired field falling to zero only while every successor carries it forward within the ordinary
// attrition bound. 2026-09-22 (iteration 166): AA replaced the object `omniscienceBreakdown` {accuracy,
// hallucinationRate} with the scalars `omniscienceAccuracy` and `omniscienceHallucinationRate`; checked on the
// 2026-09-22 05:17 capture against the 2026-09-10 snapshot (see the iteration-166 ledger entry). Neither name is
// mapped to a board; the AA-Omniscience board reads `omniscience`, which is unchanged.
export const AA_FIELD_RESTRUCTURES = { omniscienceBreakdown: ['omniscienceAccuracy', 'omniscienceHallucinationRate'] };

function resolved(value, records) {
  const v = resolveFlight(value, records);
  if (Array.isArray(v)) return v.map((x) => resolved(x, records));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolved(x, records)]));
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Nonfinite AA field');
  return v;
}

export function parseAaBenchmarkFields(html, { source_url, collected_at, source_sha256, minimumRows = 400 } = {}) {
  if (!/^https:\/\/artificialanalysis\.ai\//.test(source_url || '') || !Number.isFinite(Date.parse(collected_at)) || !/^[a-f0-9]{64}$/.test(source_sha256 || '')) throw new Error('AA benchmark source provenance required');
  const records = flightRecords(html);
  const rows = new Map();
  for (const record of records.values()) for (const o of objects(record)) {
    if (!/^[a-f0-9]{8}-[a-f0-9-]{27,}$/.test(o.id || '') || typeof o.slug !== 'string' || !Object.hasOwn(o, 'intelligenceIndex')) continue;
    if (typeof o.name !== 'string' || !o.name.trim()) throw new Error(`AA benchmark missing name ${o.id}`);
    const effort = resolved(o.effort ?? null, records);
    if (effort !== null && (!effort || typeof effort !== 'object' || typeof effort.slug !== 'string' || !effort.slug.trim())) throw new Error(`AA invalid effort ${o.id}`);
    const row = { source_id: o.id, slug: o.slug, name: o.name, variant: effort?.slug ?? null, fields: {} };
    for (const [retired, successors] of Object.entries(AA_FIELD_RESTRUCTURES)) {
      if (Object.hasOwn(o, retired) && successors.some((f) => Object.hasOwn(o, f))) throw new Error(`AA carries both ${retired} and its successors on ${o.id}`);
    }
    for (const key of AA_BENCHMARK_FIELDS) {
      const renamed = SOURCE_NAME[key];
      if (renamed && Object.hasOwn(o, renamed) && Object.hasOwn(o, key)) throw new Error(`AA carries both ${key} and ${renamed} on ${o.id}`);
      const sourceKey = renamed && Object.hasOwn(o, renamed) ? renamed : key;
      if (!Object.hasOwn(o, sourceKey)) continue;
      const value = resolved(o[sourceKey], records);
      if (value !== null && !['number', 'object'].includes(typeof value)) throw new Error(`AA unexpected benchmark field ${key} on ${o.id}`);
      if (value !== null && !STRUCTURED_FIELDS.has(key) && typeof value !== 'number') throw new Error(`AA unexpected scalar benchmark field ${key} on ${o.id}`);
      row.fields[key] = value;
    }
    const prior = rows.get(o.id);
    if (prior && !isDeepStrictEqual(prior, row)) throw new Error(`AA conflicting benchmark row ${o.id}`);
    rows.set(o.id, row);
  }
  if (rows.size < minimumRows) throw new Error(`AA benchmark incomplete payload: ${rows.size} rows, minimum ${minimumRows}`);
  const inventory = AA_BENCHMARK_FIELDS.map((field) => ({ field,
    present: [...rows.values()].filter((r) => Object.hasOwn(r.fields, field)).length,
    numeric: [...rows.values()].filter((r) => typeof r.fields[field] === 'number').length,
    structured: [...rows.values()].filter((r) => r.fields[field] !== null && typeof r.fields[field] === 'object').length,
    null: [...rows.values()].filter((r) => r.fields[field] === null).length,
  }));
  if (!inventory.some((f) => f.numeric > 0)) throw new Error('AA benchmark payload has no numeric observations');
  return { schema_version: 1, source_url, collected_at, source_sha256, status: 'raw_discovery',
    note: 'Exact observed AA fields in source units, including explicit nulls. Only registry-mapped fields identify benchmarks. Costs, normalized inputs, breakdowns and telemetry are retained for audit; these rows are not normalized or joined to rankings.',
    count: rows.size, inventory, rows: [...rows.values()].sort((a, b) => a.source_id.localeCompare(b.source_id)) };
}

// CR-65.14: Artificial Analysis withdraws individual results as it maintains a board — a model is
// deprecated, one run is pulled. Until 2026-09-18 any fall in any field's count failed the whole AA
// arm closed, so the component boards stood still from 11 Sep on while the headline indices moved.
// A small fall is ordinary attrition and is recorded instead; a field emptied, or a fall past the
// bound, is a retirement (the way τ³-Banking left Intelligence Index v4.3) and still fails closed
// for a manual source review. The bound is our own policy, not a promise Artificial Analysis made.
export const AA_COVERAGE_DROP = { fraction: 0.05, rows: 3 };

/** Returns the bounded drops it accepted, so the run report can carry them; throws on the rest. */
export function assertAaBenchmarkContinuity(previous, snapshot) {
  if (!previous) return [];
  if (!Number.isInteger(previous.count) || !Array.isArray(previous.inventory)) throw new Error('AA previous snapshot is invalid');
  if (snapshot.count < previous.count) throw new Error('AA benchmark row coverage shrank');
  const drops = [];
  const within = (from, to) => from - to <= Math.max(AA_COVERAGE_DROP.rows, Math.floor(from * AA_COVERAGE_DROP.fraction));
  for (const prior of previous.inventory) {
    const next = snapshot.inventory.find((f) => f.field === prior.field);
    const successors = AA_FIELD_RESTRUCTURES[prior.field];
    if (successors && next && next.present === 0) {
      for (const field of successors) {
        // Counted as numbers, not mere presence: a successor published as nulls carries nothing.
        const carried = snapshot.inventory.find((f) => f.field === field);
        if (!carried || !within(prior.structured, carried.numeric)) throw new Error(`AA benchmark field ${prior.field} retired but successor ${field} does not carry it (${prior.structured}→${carried?.numeric ?? 0}); manual source review required`);
      }
      drops.push({ field: prior.field, measure: 'retired', from: prior.present, to: 0, successors });
      continue;
    }
    if (!next) throw new Error(`AA benchmark field disappeared: ${prior.field}; manual source review required`);
    for (const key of ['present', 'numeric', 'structured']) {
      const fall = prior[key] - next[key];
      if (fall <= 0) continue;
      const allowed = Math.max(AA_COVERAGE_DROP.rows, Math.floor(prior[key] * AA_COVERAGE_DROP.fraction));
      if (next[key] === 0 || fall > allowed) throw new Error(`AA benchmark field coverage shrank: ${prior.field} ${key} ${prior[key]}→${next[key]}; manual source review required`);
      drops.push({ field: prior.field, measure: key, from: prior[key], to: next[key] });
    }
  }
  return drops;
}
