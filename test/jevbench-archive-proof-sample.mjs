// Gate cost (ledger N122, reliability #84031): proving all 86 frozen archive boards re-assembles every predecessor
// chain and took ~1,100-1,300 s in one file, which pushed a merge-queue test shard past its 2,400 s limit.
// The queue suite proves a fixed sample that covers both original page kinds (release route v1.6.0/v1.6.1 and the
// direct board), the What-changed-note exception span (v1.6.22-v1.6.43) and each minor line's first, middle and
// last archive. The exhaustive proof stays one switch away: JEV_ARCHIVE_FULL_PROOF=1 runs every version, and a
// release that changes archive code must attach that run.
export const JEV_ARCHIVE_PROOF_SAMPLE = Object.freeze([
  'v1.6.0', 'v1.6.1', 'v1.6.2', 'v1.6.22', 'v1.6.30', 'v1.6.43',
  'v1.7.1', 'v1.7.13', 'v1.7.23', 'v1.8.0', 'v1.8.10', 'v1.8.20',
]);
export const JEV_ARCHIVE_FULL_PROOF = process.env.JEV_ARCHIVE_FULL_PROOF === '1';
export function archiveProofVersions(all) {
  const missing = JEV_ARCHIVE_PROOF_SAMPLE.filter(version => !all.includes(version));
  if (missing.length) throw new Error(`archive proof sample names versions outside the archive set: ${missing.join(', ')}`);
  return JEV_ARCHIVE_FULL_PROOF ? [...all] : all.filter(version => JEV_ARCHIVE_PROOF_SAMPLE.includes(version));
}
