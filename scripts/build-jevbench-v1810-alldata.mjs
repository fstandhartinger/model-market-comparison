// Rebuild the frozen v1.8.10 All-data category view from the validated release and its board chain.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readJevbenchV1810ForBoard, v1810BoardInput, V1810_MANIFEST } from '../lib/jevbench-v1810-release.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { assembleJevBoard } from '../lib/jevbench-live-board.mjs';
import { withPublicAdapterIds } from '../lib/jevbench-v15-release.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import apiA4 from '../data/jevbench-api-a4-equated.json' with { type: 'json' };

export async function buildV1810AllDataView(root = process.cwd()) {
  const [release, base, previous] = await Promise.all([readJevbenchV1810ForBoard(root), readJevbenchV161Release(root), readJevbenchV157Release(root)]);
  if (!release) throw new Error('v1.8.10 release is not published');
  const chain = await assembleJevBoard({ release: { artifact: base.artifact, categories: base.categories, carry: base.carry }, previous, live: true, apiA4, root });
  const { artifact, categories } = v1810BoardInput(release, chain);
  const keys = [...new Set([...artifact.systems, ...artifact.not_measured].map(row => row.key))];
  const categoryView = jevbenchCategoryView(artifact.revision, keys, { artifact: categories });
  const previousKeys = artifact.systems.filter(row => row.new_in !== 'v1.8.10' && row.remeasured_in !== 'v1.8.10').map(row => row.key);
  const manifestSha256 = createHash('sha256').update(await readFile(`${root}/${V1810_MANIFEST}`)).digest('hex');
  return { manifestSha256, artifact: withPublicAdapterIds(artifact), categoryView, previousKeys, extra: [], live: false };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const output = process.argv[2] ?? 'data/jevbench-v1.8.10-alldata.json';
  await writeFile(output, JSON.stringify(await buildV1810AllDataView()) + '\n');
  console.log(`Wrote ${output}`);
}
