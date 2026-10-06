import { readJevbenchSeoData, JEV_SEO_PATHS } from './jevbench-seo.mjs';
import { jevSystemPath } from './jev-system-slug.mjs';
const SITE = 'https://benchmarkheaven.com';
const cell = (v) => String(v ?? 'not published').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
export async function jevbenchLlmsFull() {
  const data = await readJevbenchSeoData();
  // Review 6 Oct 2026: the page ranks open weights only; API offerings are ranked on /jev-models/api (their ranks are not reproduced here).
  const listed = data.systems.filter((r) => r.ranked && r.listing === 'ranked');
  const byComposite = (a,b) => (a.composite_rank ?? Infinity)-(b.composite_rank ?? Infinity);
  const open = listed.filter((r) => r.board === 'open').sort((a,b) => (a.open_board_rank ?? Infinity)-(b.open_board_rank ?? Infinity) || byComposite(a,b));
  const rows = [...listed.filter((r) => r.board === 'reference'), ...open];
  const api = listed.filter((r) => r.board === 'api').sort((a,b) => (b.capability ?? -Infinity)-(a.capability ?? -Infinity));
  const row = (r, rank) => `| ${[rank,r.display,r.key,r.capability,r.axes.intelligence,r.axes.calibration,r.axes.speed,r.axes.cost,r.cost?.usd_per_1000,r.cost?.kind,r.cost?.basis,r.speed?.p50_s_adjusted ?? r.speed?.p50_s_raw,r.source_url ?? r.repo].map(cell).join(' | ')} |`;
  return [ '# JevBench by Benchmark Heaven', '',
    'JevBench measures Jev-class decision models: state and a bounded rubric in, a typed answer out.',
    `Data: JevBench ${data.artifact.revision}, published ${data.date.slice(0,10)}. Release: ${SITE}${data.releasePage}`, '',
    '## Method',
    `Capability = mean of Intelligence and Calibration, with official ranks only within the cost (${data.feed.capability_policy.cost_cap_usd_per_1000} USD/1,000 decisions) and median-latency (${data.feed.capability_policy.median_latency_cap_s} seconds) caps. Reference: Jev 1.13.0. Composite is secondary.`,
    'Axes are benchmark measures, not guarantees. Prices are measured, estimated or self-reported announced values; retain the basis kind. Wrappers and subsidised listings never enter the ranking. Missing values are not published.', '',
    '## Open-weights board (/jev-models)',
    `Systems we ran ourselves from published weights, ranked by Capability. ${data.openQualifying} systems qualify within the caps (Jev 1.13.0 is the unranked reference). Rows outside the caps have no rank.`,
    '| Capability rank | Name | Key | Capability | Intelligence | Calibration | Speed | Cost axis | USD per 1,000 decisions | Basis kind | Basis | p50 latency (s) | Source URL |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => row(r, r.board === 'reference' ? 'reference, not ranked' : r.open_board_rank ?? 'outside caps')), '',
    `## API offerings (ranked separately on ${SITE}/jev-models/api)`,
    'Hosted endpoints we do not run ourselves. They are not ranked on the open-weights board; ranks are on the API leaderboard.',
    '| Capability rank | Name | Key | Capability | Intelligence | Calibration | Speed | Cost axis | USD per 1,000 decisions | Basis kind | Basis | p50 latency (s) | Source URL |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...api.map((r) => row(r, 'see API leaderboard')), '',
    '## Guides and comparisons',
    ...Object.values(JEV_SEO_PATHS).map((p) => `- ${SITE}${p}`),
    ...data.comparisons.map((p) => `- [Jev vs ${p.label}](${SITE}/jev-models/${p.slug})`),
    '## Model pages', ...data.modelKeys.map((key) => `- ${SITE}${jevSystemPath(key)}`), '',
    '## API', `- ${SITE}/api/jevbench/latest`, `- ${SITE}/api/jevbench/${data.artifact.revision}`, `- ${SITE}/llms.txt`, '',
  ].join('\n');
}
