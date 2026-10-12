// Dated v1.5-method rows measured after the frozen v1.6.0 dated carry and listed publicly at the owner's request
// (12 Oct 2026: Drex v1.5, order a35a4546). They join the live boards' dated carry from
// data/jevbench-carry-additions.json; the frozen carry artifacts are never edited, archived release pages never call
// this, and nothing here is ranked, re-scored or enters a median.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const CARRY_ADDITIONS_PATH = 'data/jevbench-carry-additions.json';
const REQUIRED = ['key', 'display', 'author', 'class', 'open', 'licence', 'endpoint_kind', 'api_flag', 'axes', 'capability', 'composite_v15',
  'cost', 'speed', 'measured_revision', 'measured_label', 'date_basis', 'carried_from'];
const PRIVATE = /[a-z]+_sk_[A-Za-z0-9]|sk-[A-Za-z0-9]{20}|api[_-]?key|secret|password|bearer |\/v1\/|\/home\//i;

export async function readCarryAdditions(root = process.cwd()) {
  const file = JSON.parse(await readFile(path.join(root, CARRY_ADDITIONS_PATH), 'utf8'));
  if (file.schema_version !== 1 || file.kind !== 'jevbench-carry-additions' || !Array.isArray(file.rows)) throw new Error('carry additions: schema');
  const seen = new Set();
  for (const r of file.rows) {
    for (const k of REQUIRED) if (r[k] === undefined) throw new Error(`carry additions ${r.key}: missing ${k}`);
    if (seen.has(r.key)) throw new Error(`carry additions ${r.key}: duplicate`);
    seen.add(r.key);
    if (PRIVATE.test(JSON.stringify(r))) throw new Error(`carry additions ${r.key}: private material`);
    for (const v of [r.composite_v15, r.capability, ...Object.values(r.axes)]) if (!Number.isFinite(v)) throw new Error(`carry additions ${r.key}: numbers`);
  }
  return file.rows;
}

/** The carry with the additions appended; a key that is already measured or carried is never duplicated or replaced. */
export function withCarryAdditions(carry, additions, measuredKeys = new Set()) {
  const have = new Set([...carry.rows.map((r) => r.key), ...measuredKeys]);
  const rows = additions.filter((r) => !have.has(r.key));
  if (!rows.length) return carry;
  const known = new Set(carry.releases.map((r) => r.revision));
  const missing = rows.filter((r) => !known.has(r.measured_revision));
  if (missing.length) throw new Error(`carry additions: unknown release ${missing.map((r) => r.measured_revision).join(', ')}`);
  return { ...carry, rows: [...carry.rows, ...rows] };
}
