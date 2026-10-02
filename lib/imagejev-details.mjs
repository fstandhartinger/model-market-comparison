import { readMultimodalPreview, readMultimodalPreviewV02, readArchivedMultimodalPreviewV014 } from './jevbench-multimodal-preview.mjs';
import { imageJevBoardSystems } from './imagejev-board.mjs';
import { IMAGE_JEV_DETAIL_VERSIONS, imageJevSourceUrl } from './imagejev-system-links.mjs';

/** Aggregate-only detail representation: references never become current measured scores. */
export function imageJevDetailsFromArtifact(artifact) {
  const revision = artifact.version ?? artifact.revision;
  if (!IMAGE_JEV_DETAIL_VERSIONS.includes(revision)) throw new Error(`Unsupported ImageJev revision: ${revision}`);
  const track = artifact.headline_track ?? 'all';
  const measured = [...artifact.ranking, ...(artifact.measured_unrankable_rows ?? [])];
  const keys = new Set(measured.map((row) => row.key));
  if (keys.size !== measured.length) throw new Error('Duplicate ImageJev measured identity');
  const references = artifact.reference_rows ?? [];
  const historical = references.filter((row) => !keys.has(row.key)).map((row) => ({
    ...row, ranked: false, rank: null, score: null, listing: 'historical-reference',
    tracks: { [track]: { axes: { intelligence: null, calibration: null, speed: null, cost: null }, composite: null } },
  }));
  const originals = [...measured, ...historical];
  const systems = imageJevBoardSystems({ ...artifact, ranking: originals });
  if (new Set(systems.map((row) => row.key)).size !== systems.length) throw new Error('Duplicate ImageJev reference identity');
  return systems.map((row, index) => {
    const original = originals[index];
    const reference = references.find((candidate) => candidate.key === row.key);
    const historicalOnly = row.listing === 'historical-reference';
    const status = historicalOnly ? 'historical-reference' : row.rank == null ? 'measured-unrankable' : 'ranked';
    return {
      ...row, revision, track, status,
      endpoint_condition: historicalOnly ? 'No v0.2 measurement; the exact historical revision was unavailable.' : row.endpoint_condition,
      reason: original.reason ?? original.not_ranked_because ?? null,
      inference_setting: original.inference_setting ?? null,
      prior_exposure: original.prior_exposure ?? null,
      measurement_source: original.measurement_source ?? null,
      reference: reference ? { revision: reference.reference_revision, score: reference.reference_score, reason: reference.reason } : null,
      previous: original.previous_rank != null || original.previous_score != null
        ? { rank: original.previous_rank ?? null, score: original.previous_score ?? null } : null,
      pricing_alternative: original.pricing_alternative ?? null,
      source_url: historicalOnly ? null : imageJevSourceUrl(row.key, row.repo, revision),
      source_note: historicalOnly ? 'Historical provenance only; the exact pinned revision was unavailable for v0.2. See the reason below.'
        : row.key === 'imajev_4b_20260926' ? 'Historical 26 Sep configuration; do not substitute the current Imajev adapter or source.' : 'Cited model/base-model provenance; this link does not certify availability of the exact tested revision.',
    };
  });
}

export async function readImageJevDetails(revision = 'v0.2.0') {
  if (!IMAGE_JEV_DETAIL_VERSIONS.includes(revision)) return null;
  const artifact = revision === 'v0.2.0' ? (await readMultimodalPreviewV02()).artifact
    : revision === 'v0.1.4' ? (await readArchivedMultimodalPreviewV014()).artifact : await readMultimodalPreview();
  return { artifact, revision, systems: imageJevDetailsFromArtifact(artifact) };
}
export async function findImageJevDetail(key, revision = 'v0.2.0') {
  const bundle = await readImageJevDetails(revision);
  const row = bundle?.systems.find((candidate) => candidate.key === key);
  return row ? { ...bundle, row } : null;
}
