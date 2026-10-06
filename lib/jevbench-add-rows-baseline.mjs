import { createHash } from 'node:crypto';

// Addendum baselines (scripts/jevbench-add-rows.py): a hash of everything that already existed before rows were added, so a test can
// prove the published rows stayed byte-identical in value. One implementation, used by the script (through node) and the test.
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
    : JSON.stringify(v));
export const canonSha256 = (v) => createHash('sha256').update(canon(v)).digest('hex');

/** Result rows without `rank`/`ranks` (the only fields that move when rows are added), minus the excluded keys. */
export function systemsBaselineSha256(systems, exclude = []) {
  const skip = new Set(exclude);
  return canonSha256(Object.fromEntries(systems.filter((s) => !skip.has(s.key)).map((s) => {
    const { rank, ranks, ...rest } = s;
    return [s.key, rest];
  })));
}

/** Per-system category cells minus the excluded keys. */
export function categoriesBaselineSha256(cells, exclude = []) {
  const skip = new Set(exclude);
  return canonSha256(Object.fromEntries(Object.entries(cells).filter(([k]) => !skip.has(k))));
}
