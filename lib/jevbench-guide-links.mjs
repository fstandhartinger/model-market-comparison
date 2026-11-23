import { readJevbenchComparisonLinks } from './jevbench-seo.mjs';
const buildCache = new Map();
async function readLinks() {
  const comparisons = await readJevbenchComparisonLinks();
  return [
    { href: '/jev-models/alternatives', label: 'Compare Jev-compatible alternatives' },
    { href: '/jev-models/how-to-choose', label: 'Choose a Jev-compatible model by use case' },
    { href: '/jev-models/open-source-jev', label: 'Is Jev open source? Open-weight options' },
    ...comparisons.map(pair => ({ href: `/jev-models/${pair.slug}`, label: `Jev vs ${pair.label}` })),
  ];
}
export async function readJevBoardGuideLinks() {
  if (process.env.NEXT_PHASE !== 'phase-production-build') return readLinks();
  const key = process.cwd();
  if (!buildCache.has(key)) { const promise = readLinks(); buildCache.set(key, promise); promise.catch(() => buildCache.delete(key)); }
  return structuredClone(await buildCache.get(key));
}
