import { readJevbenchSeoData, JEV_SEO_PATHS } from './jevbench-seo.mjs';
import { jevSystemPath } from './jev-system-slug.mjs';
const SITE = 'https://benchmarkheaven.com';
const cell = (v) => String(v ?? 'not published').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
export async function jevbenchLlmsFull() {
  const data = await readJevbenchSeoData();
  // Include every composite-ranked current system, with missing Capability ranks explicitly marked.
  const rows = data.systems.filter((r) => r.ranked && r.listing === 'ranked').sort((a,b) => (a.rank ?? Infinity)-(b.rank ?? Infinity) || (a.composite_rank ?? Infinity)-(b.composite_rank ?? Infinity));
  return [ '# JevBench by Benchmark Heaven', '',
    'JevBench measures Jev-class decision models: state and a bounded rubric in, a typed answer out.',
    `Data: JevBench ${data.artifact.revision}, published ${data.date.slice(0,10)}. Release: ${SITE}${data.releasePage}`, '',
    '## Method',
    `Capability = mean of Intelligence and Calibration, with official ranks only within the cost (${data.feed.capability_policy.cost_cap_usd_per_1000} USD/1,000 decisions) and median-latency (${data.feed.capability_policy.median_latency_cap_s} seconds) caps. Reference: Jev 1.13.0. Composite is secondary.`,
    'Axes are benchmark measures, not guarantees. Prices are measured, estimated or self-reported announced values; retain the basis kind. Wrappers and subsidised listings never enter the ranking. Missing values are not published.', '',
    '## Full current ranking',
    '| Capability rank | Name | Key | Capability | Intelligence | Calibration | Speed | Cost axis | USD per 1,000 decisions | Basis kind | Basis | p50 latency (s) | Source URL |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${[r.rank ?? 'outside caps',r.display,r.key,r.capability,r.axes.intelligence,r.axes.calibration,r.axes.speed,r.axes.cost,r.cost?.usd_per_1000,r.cost?.kind,r.cost?.basis,r.speed?.p50_s_adjusted ?? r.speed?.p50_s_raw,r.source_url ?? r.repo].map(cell).join(' | ')} |`), '',
    '## Guides and comparisons',
    ...Object.values(JEV_SEO_PATHS).map((p) => `- ${SITE}${p}`),
    ...data.comparisons.map((p) => `- [Jev vs ${p.label}](${SITE}/jev-models/${p.slug})`),
    '## Model pages', ...data.modelKeys.map((key) => `- ${SITE}${jevSystemPath(key)}`), '',
    '## API', `- ${SITE}/api/jevbench/latest`, `- ${SITE}/api/jevbench/${data.artifact.revision}`, `- ${SITE}/llms.txt`, '',
  ].join('\n');
}
