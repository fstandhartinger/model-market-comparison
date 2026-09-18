// CR-34.4: the Artificial Analysis Agentic Index, relayed by OpenRouter's documented
// Benchmarks API (GET /api/v1/benchmarks, source=artificial-analysis rows). AA's own free
// v2 API has no agentic field (checked 2026-09-18), so this relay is the only route.
//
// AA measures the Agentic Index ONCE per model, on its primary configuration (e.g.
// "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)"). It is therefore
// attached at family scope — exactly once per catalog family, on the deterministic family
// representative row, with an attachment note naming the measured configuration — the same
// discipline lib/family-representative.mjs documents for family-scope evidence (Epoch ECI,
// OpenRouter's own runs).
//
// Join discipline (fail-closed, never fuzzy):
//   1. exact AA display name  → AA model id;
//   2. normalized name (case/space/dash-insensitive) → exactly ONE candidate AA model;
//   3. OpenRouter permaslug → unique catalog family (familyIndex) → exactly ONE
//      same-family normalized-name candidate (decides dated AA aliases such as
//      "DeepSeek V4 Pro (…)" → "DeepSeek V4 Pro 0813 (…)").
// Everything else is recorded as rejected with its reason; nothing is guessed.

import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync, readFileSync as readJSONFile } from 'node:fs';
import { deterministicFamilyRepresentative } from './family-representative.mjs';
import { familyIndex } from './openrouter-benchmark-scores.mjs';

export const AGENTIC_BENCHMARK_KIND = 'aa-agentic-index::snapshot';

export function normalizeAaName(name) {
  return String(name ?? '').toLowerCase().replace(/[-_\s]+/g, ' ').trim();
}

/** Rows of the relay response that carry a numeric Agentic Index. Throws on duplicate names. */
export function agenticRowsFromRelay(relay) {
  const rows = new Map();
  for (const row of relay?.data ?? []) {
    if (row?.source !== 'artificial-analysis') continue;
    const value = row.agentic_index;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const name = String(row.display_name ?? '');
    if (!name) throw new Error('OpenRouter AA relay: agentic row without a display name');
    if (rows.has(name)) throw new Error(`OpenRouter AA relay: duplicate agentic row for "${name}"`);
    rows.set(name, { name, value, permaslug: row.model_permaslug ?? null });
  }
  return rows;
}

/** name → AA model id maps; throws on duplicated exact or normalized names. */
export function aaNameIndex(aaModels) {
  const exact = new Map();
  const normalized = new Map();
  for (const model of aaModels ?? []) {
    if (!model?.id || !model?.name) continue;
    if (exact.has(model.name)) throw new Error(`AA snapshot: duplicate display name "${model.name}"`);
    exact.set(model.name, model.id);
    const key = normalizeAaName(model.name);
    const bucket = normalized.get(key) ?? [];
    bucket.push(model.id);
    normalized.set(key, bucket);
  }
  return { exact, normalized, exactEntries: [...exact.entries()] };
}

/**
 * Join one relay row to an AA model id. `permaslugFamilies` is slug → family key | null
 * from familyIndex(); an AA candidate joins through it when the catalog row carrying that
 * AA id belongs to the slug's single family. Returns { aaId, via } or { aaId: null, reason }.
 */
export function joinAgenticRow(row, { exact, normalized }, { permasplugNote } = {}) {
  if (exact.has(row.name)) return { aaId: exact.get(row.name), via: 'exact-name' };
  const key = normalizeAaName(row.name);
  const bucket = normalized.get(key) ?? [];
  if (bucket.length === 1) return { aaId: bucket[0], via: 'normalized-name' };
  if (!bucket.length) return { aaId: null, reason: `AA name "${row.name}" not in the current AA snapshot` };
  return { aaId: null, reason: `ambiguous AA name "${row.name}" (${bucket.length} candidates)`, candidates: bucket };
}

/** Normalized content of a name's trailing parenthetical (the effort suffix), '' when absent. */
export function effortSuffix(name) {
  const m = String(name ?? '').match(/\(([^()]*)\)\s*$/);
  return m ? normalizeAaName(m[1]) : '';
}

/**
 * The full agentic attachment: one value per catalog family on its deterministic
 * representative row. Inputs:
 *   relay            — parsed locked capture (unfiltered /api/v1/benchmarks response)
 *   aaModels         — current AA API models (id + name)
 *   familyOfAaId     — (aaId) → family key | null (built from catalog rows; must be unique)
 *   familyRows       — (familyKey) → catalog rows of that family
 *   aaFamilyOfSlug   — (permaslug) → family key | null (familyIndex map) — tie-break only
 * History keeps the measured identity (the AA configuration id); the display attachment
 * lands on the family representative.
 */
export function buildAgenticAttachment({ relay, aaModels, familyOfAaId, familyRows, aaFamilyOfSlug }) {
  const names = aaNameIndex(aaModels);
  const byRepRowId = new Map();
  const measured = [];
  const rejected = [];
  for (const row of agenticRowsFromRelay(relay).values()) {
    let joined = joinAgenticRow(row, names);
    if (!joined.aaId && row.permaslug && aaFamilyOfSlug) {
      // Slug-decided fallback (dated AA aliases such as "DeepSeek V4 Pro (…)" → the
      // family's dated AA name): the slug resolves to exactly one catalog family, and
      // exactly one AA configuration in that family carries the relay row's effort suffix.
      // Anything weaker stays rejected with its reason.
      const slugFamily = aaFamilyOfSlug(row.permaslug);
      if (slugFamily) {
        const suffix = effortSuffix(row.name);
        const sameFamily = names.exactEntries
          .filter(([name, id]) => familyOfAaId(id) === slugFamily && effortSuffix(name) === suffix);
        if (sameFamily.length === 1) joined = { aaId: sameFamily[0][1], via: 'permaslug' };
        else joined = { aaId: null, reason: `${joined.reason}; permaslug family ${slugFamily} has ${sameFamily.length} AA configurations with this effort suffix` };
      }
    }
    if (!joined.aaId) { rejected.push({ name: row.name, value: row.value, reason: joined.reason }); continue; }
    const familyKey = familyOfAaId(joined.aaId);
    if (!familyKey) { rejected.push({ name: row.name, value: row.value, reason: `AA model ${joined.aaId} ("${row.name}") is not in the catalog` }); continue; }
    const rep = deterministicFamilyRepresentative(familyKey, familyRows(familyKey));
    if (!rep) { rejected.push({ name: row.name, value: row.value, reason: `family ${familyKey} has no representative row` }); continue; }
    const note = `Artificial Analysis publishes one Agentic Index per model, measured on "${row.name}"; it is attached once to ${rep.id}, the deterministic family representative used by collapsed comparisons, and does not assert that this exact effort setting was tested. Relayed from AA by OpenRouter's Benchmarks API.`;
    measured.push({ aa_id: joined.aaId, name: row.name, value: row.value, via: joined.via, family_key: familyKey, rep_id: rep.id, note });
    byRepRowId.set(rep.id, { value: row.value, note, measured_aa_id: joined.aa_id, measured_name: row.name, family_key: familyKey });
  }
  return { byRepRowId, measured, rejected, kind: AGENTIC_BENCHMARK_KIND };
}

/**
 * Shared one-call rebuild used by build-dataset, build-benchmark-history and
 * validate-benchmark-scores so all three produce the byte-identical agentic attachment and
 * history rows. `rawDir` holds benchmarks/ingestion-lock.json and artificialanalysis.json.
 */
export async function agenticAttachmentFromFiles({ rawDir, aaModels, modelRows }) {
  const lock = JSON.parse(readJSONFile(`${rawDir}/benchmarks/ingestion-lock.json`, 'utf8'));
  const spec = lock.openrouter_aa_relay;
  if (!spec) throw new Error('ingestion-lock.json has no openrouter_aa_relay entry (run scripts/lock-openrouter-aa-relay.mjs)');
  const { relay, sha256 } = loadLockedAgenticRelay(spec);
  const familyByAaId = new Map();
  const rowsByFamily = new Map();
  for (const r of modelRows) {
    if (r.aa_model_id) {
      const prev = familyByAaId.get(r.aa_model_id);
      if (prev && prev !== r.family_key) throw new Error(`AA model ${r.aa_model_id} spans two catalog families (${prev}, ${r.family_key})`);
      familyByAaId.set(r.aa_model_id, r.family_key);
    }
    if (!rowsByFamily.has(r.family_key)) rowsByFamily.set(r.family_key, []);
    rowsByFamily.get(r.family_key).push(r);
  }
  const slugFamilies = familyIndex(modelRows);
  const attachment = buildAgenticAttachment({
    relay, aaModels,
    familyOfAaId: (id) => familyByAaId.get(id) ?? null,
    familyRows: (familyKey) => rowsByFamily.get(familyKey) ?? [],
    aaFamilyOfSlug: (slug) => slugFamilies.get(slug) ?? null,
  });
  return { ...attachment, retrieved_at: spec.retrieved_at, snapshot_date: spec.snapshot_date, source_file: spec.source_file, sha256 };
}

/** Hash-checking loader for the locked, dated relay capture (same discipline as the own-runs lock). */
export function loadLockedAgenticRelay(spec) {
  const bytes = gunzipSync(readFileSync(spec.source_file));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== spec.source_sha256) throw new Error('OpenRouter AA relay capture no longer matches the locked capture');
  return { relay: JSON.parse(bytes.toString('utf8')), sha256 };
}
