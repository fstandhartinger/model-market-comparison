// Server-only: category artifacts must never enter a client component's import graph.
import { readJevAllDataInput } from './jevbench-alldata-input.mjs';
import { jevbenchCategoryView, isFreshJevbenchV16Revision } from './jevbench-categories.mjs';
import { hasApiFullAddendumCategories } from './jevbench-api-full-addenda.mjs';
import { baseModelFamilies } from './jev-base-model.mjs';
import { jevV15BoardSystem } from './jevbench-v15-board.mjs';
import { JEV_V16_CLASS_OPTIONS } from './jevbench-jev-class.mjs';
import { jevClassView } from '../components/jevClassView';
import type { JevV15Artifact } from './jevbench-v15-preview.mjs';
import type { JevV16Categories } from './jevbench-v16-release.mjs';

export function buildJevAllDataProps({ artifact, categories, previousKeys, extra = [], live = false }: {
  artifact: JevV15Artifact; categories: JevV16Categories; previousKeys: string[]; extra?: JevV15Artifact['systems']; live?: boolean;
}) {
  const keys = [...new Set([...artifact.systems, ...artifact.not_measured].map((row) => row.key))];
  return {
    artifact,
    categoryView: jevbenchCategoryView(artifact.revision, keys, { supplement: Boolean(categories.supplement),
      artifact: isFreshJevbenchV16Revision(artifact.revision) || hasApiFullAddendumCategories(categories) ? categories : undefined }),
    previousKeys,
    eligibility: jevClassView([...artifact.systems, ...extra].map(jevV15BoardSystem), { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true }),
    metadata: { families: baseModelFamilies('jevbench', artifact.systems) },
    links: { method: '#jev16-method', pricing: live ? '#jev-costs' : '#jev16-method', revisionNotes: '#jev16-method', addenda: {} },
  };
}

export async function readJevAllDataProps(version: string) {
  const input = await readJevAllDataInput(version);
  return input ? buildJevAllDataProps(input) : null;
}
