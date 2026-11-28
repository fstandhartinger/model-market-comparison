// Published legacy archive inputs only. Selects the same public readers and views as the frozen pages.
import { readJevbenchV14, jevbenchV14View } from './jevbench-v14.mjs';
import { readJevbenchV141, jevbenchV141View } from './jevbench-v141.mjs';
import { readJevbenchV142, jevbenchV142View } from './jevbench-v142.mjs';
import { readJevbenchV142WithFamilies } from './jevbench-v142-families.mjs';
import { readJevbenchV1421, jevbenchV1421View } from './jevbench-v1421.mjs';
import { readJevbenchV1421WithFamilies } from './jevbench-v1421-families.mjs';
import { readJevbenchV1422, jevbenchV1422View } from './jevbench-v1422.mjs';
import { readJevbenchV1422WithFamilies } from './jevbench-v1422-families.mjs';
import { readJevbenchV150Release, readJevbenchV151Release, readJevbenchV152Release, readJevbenchV153Release, readJevbenchV154Release, readJevbenchV155Release, readJevbenchV156Release, readJevbenchV157Release, withPublicAdapterIds } from './jevbench-v15-release.mjs';
import { readHistoricalJevbenchSupplement } from './jevbench-history-supplement.mjs';
import { readJevbenchV170ForBoard } from './jevbench-v170-release.mjs';
import { readJevBoardGuideLinks } from './jevbench-guide-links.mjs';
// The bubble points use the existing view helper, loaded by Next/tsx-loader from the server entry below.

const old = {
  'v1.4': { read: readJevbenchV14, view: jevbenchV14View },
  'v1.4.1': { read: readJevbenchV141, view: jevbenchV141View, chart: true, capabilityHref: '#jev14-capability-views' },
  'v1.4.2': { read: readJevbenchV142WithFamilies, view: jevbenchV142View, previous: readJevbenchV141, previousVersion: 'v1.4.1', chart: true, families: true },
  'v1.4.2.1': { read: readJevbenchV1421WithFamilies, view: jevbenchV1421View, previous: readJevbenchV142, previousVersion: 'v1.4.2', chart: true, families: true },
  'v1.4.2.2': { read: readJevbenchV1422WithFamilies, view: jevbenchV1422View, previous: readJevbenchV1421, families: true, headline: true },
};
const v15 = [readJevbenchV150Release, readJevbenchV151Release, readJevbenchV152Release, readJevbenchV153Release, readJevbenchV154Release, readJevbenchV155Release, readJevbenchV156Release, readJevbenchV157Release];
export const JEV_LEGACY_ARCHIVE_VERSIONS = Object.freeze([...Object.keys(old), ...v15.map((_, i) => `v1.5.${i}`), 'v1.7.0']);
export async function readJevLegacyArchivePayload(version, root = process.cwd(), classView) {
  if (Object.hasOwn(old, version)) {
    const entry = old[version], release = await entry.read(root), view = entry.view(release);
    const props = { artifact: view.artifact, sha256: view.sha256 };
    if (entry.previous) {
      const previous = (await entry.previous(root)).artifact;
      props.previous = { revision: entry.previousVersion ?? previous.revision, keys: previous.systems.map(r => r.key) };
    }
    if (entry.capabilityHref) props.capabilityHref = entry.capabilityHref;
    if (entry.families) props.sealedFamilyN = release.sealedFamilyN;
    if (entry.headline) { props.capabilityHref = '#jev-capability'; props.compactMobile = true; }
    const widgets = { board: { component: 'v14-board', props } };
    if (entry.chart) widgets.capability = { component: 'capability-chart', props: { systems: view.systems, revision: view.revision } };
    if (entry.headline) {
      const classified = classView(view.systems);
      widgets.capability = { component: 'capability-ranking', props: { systems: view.systems, revision: view.revision, officialHref: '#jev14-chart-title' } };
      widgets.bubbles = { component: 'bubbles', props: { points: classified.points, costLimit: classified.limits.cost, referenceName: 'Jev' } };
    }
    return { version, kind: 'v14', props, widgets };
  }
  const match = /^v1\.5\.([0-7])$/.exec(version);
  if (match) {
    const index = Number(match[1]), release = await v15[index](root);
    const previous = await (index ? v15[index - 1](root) : readJevbenchV1422(root));
    const props = { artifact: withPublicAdapterIds(release.artifact), sha256: release.sha256, previousKeys: previous.artifact.systems.map(r => r.key) };
    const widgets = { board: { component: 'v15-board', props } };
    if (index === 7) {
      const supplement = await readHistoricalJevbenchSupplement(root);
      widgets.supplement = { component: 'historical-supplement', props: { artifact: supplement.artifact, sha256: supplement.sha256 } };
    }
    return { version, kind: 'v15', props, widgets, render: { guides: await readJevBoardGuideLinks() } };
  }
  if (version === 'v1.7.0') {
    const release = await readJevbenchV170ForBoard(root); if (!release) return null;
    const props = { systems: release.artifact.systems, carryRows: release.carry.rows, carryLabel: release.carry.label, previousRelease: release.artifact.restates.board_release };
    return { version, kind: 'v170', props, sha256: release.sha256, widgets: { board: { component: 'old-new', props } } };
  }
  return null;
}
