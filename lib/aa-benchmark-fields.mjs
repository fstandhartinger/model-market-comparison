import { flightRecords, objects, resolveFlight } from './aa-rsc.mjs';
import { isDeepStrictEqual } from 'node:util';

// Preserve source units. Normalization and attachment to model rankings are phase 05.
export const AA_BENCHMARK_FIELDS = ['aime25', 'analystAgent', 'apexAgents', 'automationBenchPartialScore', 'briefcaseBreakdown', 'briefcaseTotalCost', 'critpt', 'enterpriseOpsGym', 'gdpPdfAllPass', 'gdpval', 'gdpvalBreakdown', 'gdpvalNormalized', 'gpqa', 'harveyLab', 'hle', 'ifbench', 'itBenchSre', 'lcr', 'livecodebench', 'mlcrOverall', 'mmmuPro', 'omniscience', 'omniscienceBreakdown', 'scicode', 'tau2', 'tauBanking', 'terminalbenchHard', 'terminalbenchV21', 'terminalbenchV40', 'indexCompute', 'timescaleData'];
const STRUCTURED_FIELDS = new Set(['briefcaseBreakdown', 'gdpvalBreakdown', 'omniscienceBreakdown', 'indexCompute', 'timescaleData']);

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
    for (const key of AA_BENCHMARK_FIELDS) if (Object.hasOwn(o, key)) {
      const value = resolved(o[key], records);
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

export function assertAaBenchmarkContinuity(previous, snapshot) {
  if (!previous) return;
  if (!Number.isInteger(previous.count) || !Array.isArray(previous.inventory)) throw new Error('AA previous snapshot is invalid');
  if (snapshot.count < previous.count) throw new Error('AA benchmark row coverage shrank');
  for (const prior of previous.inventory) {
    const next = snapshot.inventory.find((f) => f.field === prior.field);
    if (!next || ['present', 'numeric', 'structured'].some((key) => next[key] < prior[key])) throw new Error(`AA benchmark field coverage shrank: ${prior.field}; manual source review required`);
  }
}
