import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readJevbenchV142 } from './jevbench-v142.mjs';

// CR-153 (Florian 25 Sep 2026): the compare view's family radar reads the current v1.4 question set — the 220 hard-tier
// and 308 sealed decisions — for every system. Nine v1.4.2 additions had no hard-tier family breakdown in the pinned
// artifact; this supplement adds it (recomputed from the same official runs, totals equal to the published hard-tier
// accuracy) plus the sealed decisions per family, without touching the release artifact or its SHA-256.
export const JEVBENCH_V142_FAMILIES = 'data/raw/benchmarks/jevbench/v1.4.2/jevbench-v1.4.2-family-supplement.json';
export const JEVBENCH_V142_FAMILIES_SHA256 = 'b73fd3fc7674360c070ea6ed1c0a45234382c56d2e0265f69de82bc50fa6cb4b';

const fail = (message) => { throw new Error(`Invalid JevBench v1.4.2 family supplement: ${message}`); };

export function validateJevbenchV142Families(s, artifact) {
  if (!s || s.benchmark !== 'JevBench' || s.revision !== 'v1.4.2' || s.kind !== 'family-supplement') fail('identity');
  const sealedN = s.sealed_family_n ?? {};
  if (Object.values(sealedN).reduce((a, b) => a + b, 0) !== artifact.tiers.sealed) fail('sealed family sizes must sum to the sealed tier');
  const hardN = artifact.hard_dataset?.families ?? {};
  const byKey = new Map(artifact.systems.map((row) => [row.key, row]));
  for (const [key, families] of Object.entries(s.hard_by_family ?? {})) {
    const row = byKey.get(key);
    if (!row) fail(`unknown system ${key}`);
    if (row.hard?.by_family) fail(`${key} already has a published hard-tier breakdown`);
    let correct = 0;
    for (const [family, v] of Object.entries(families)) {
      if (hardN[family] !== v.n || !Number.isInteger(v.correct) || v.correct < 0 || v.correct > v.n) fail(`${key}.${family}`);
      correct += v.correct;
    }
    if (Object.keys(families).length !== Object.keys(hardN).length) fail(`${key} must cover every hard family`);
    if (correct !== Math.round(row.tiers.hard * artifact.tiers.hard)) fail(`${key} does not add up to its published hard-tier accuracy`);
  }
  if (JSON.stringify(s).match(/"(item_id|item_text|question_text|expected|gold|prediction|per_item|item_results)"/i)) fail('item-level field');
  return s;
}

export async function readJevbenchV142Families(root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_V142_FAMILIES}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== JEVBENCH_V142_FAMILIES_SHA256) fail('bytes do not match the pinned supplement');
  return { supplement: JSON.parse(bytes.toString('utf8')), bytes, sha256 };
}

/** The pinned v1.4.2 result (bytes and SHA-256 unchanged) with the supplement's hard-tier families filled in. */
export async function readJevbenchV142WithFamilies(root = process.cwd()) {
  const result = await readJevbenchV142(root);
  const { supplement, sha256: familiesSha256 } = await readJevbenchV142Families(root);
  validateJevbenchV142Families(supplement, result.artifact);
  const systems = result.artifact.systems.map((row) => supplement.hard_by_family[row.key]
    ? { ...row, hard: { ...(row.hard ?? {}), by_family: supplement.hard_by_family[row.key], by_family_source: 'family-supplement' } }
    : row);
  return { ...result, artifact: { ...result.artifact, systems }, sealedFamilyN: supplement.sealed_family_n, familiesSha256 };
}
