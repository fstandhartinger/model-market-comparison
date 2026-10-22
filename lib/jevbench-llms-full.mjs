import { readJevbenchSeoData, JEV_SEO_PATHS } from './jevbench-seo.mjs';
import { jevLatencyText } from './jev-latency.mjs';
import { jevSystemPath } from './jev-system-slug.mjs';
import { jevDecisionLimitView } from './jev-decision-limit.mjs';
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
  // v1.7.0: two extra columns (measured p95, decisions over 10 s) once the board carries the method; older boards keep the exact table.
  const limit = Boolean(data.feed.method);
  const extra = (r) => { const v = jevDecisionLimitView(r); return limit ? [v?.p95Raw ?? (r.listing === 'remeasure-pending' ? 'remeasure pending' : null), v?.countText ?? null] : []; };
  const row = (r, rank) => `| ${[rank,r.display,r.key,r.capability,r.axes.intelligence,r.axes.calibration,r.axes.speed,r.axes.cost,r.cost?.usd_per_1000,r.cost?.kind,r.cost?.basis,jevLatencyText(r.speed, r.speed?.p50_s_adjusted ?? r.speed?.p50_s_raw, { unit: false, kind: r.endpoint_kind }),...extra(r),r.source_url ?? r.repo].map(cell).join(' | ')} |`;
  const head = `| Capability rank | Name | Key | Capability | Intelligence | Calibration | Speed | Cost axis | USD per 1,000 decisions | Basis kind | Basis | p50 latency (s) |${limit ? ' p95 measured (s) | Decisions over 10 s |' : ''} Source URL |`;
  const rule = `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |${limit ? ' --- | --- |' : ''} --- |`;
  return [ '# JevBench by Benchmark Heaven', '',
    'JevBench measures Jev-class decision models: state and a bounded rubric in, a typed answer out.',
    `Data: JevBench ${data.artifact.revision}, published ${data.date.slice(0,10)}. Release: ${SITE}${data.releasePage}`, '',
    '## Method',
    `Capability = mean of Intelligence and Calibration, with official ranks only within the cost (${data.feed.capability_policy.cost_cap_usd_per_1000} USD/1,000 decisions) and median-latency (${data.feed.capability_policy.median_latency_cap_s} seconds) caps. Reference: Jev 1.13.0. Composite is secondary.`,
    `Latency: API rows are timed end to end, network included. Self-hosted rows are timed on our own hardware over loopback; the ranking and the median-latency cap use an estimate that adds the network round trip (2 x measured p50 + 150 ms), and the latency column shows measured value and estimate. Model authors can ask us to time a hosted endpoint instead (on request).`,
    ...(data.feed.method ? [`Method v1.7 (10 s rule): a decision that takes longer than 10 seconds (measured time) counts as a wrong answer and as zero calibration for that item; Speed uses all decisions. Columns p95 and over 10 s give the measured 95th-percentile time and the decisions over the limit. Rows marked remeasure-pending keep their v1.6 values and are not ranked.`] : []),
    'Axes are benchmark measures, not guarantees. Prices are measured, estimated or self-reported announced values; retain the basis kind. Wrappers and subsidised listings never enter the ranking. Missing values are not published.', '',
    '## Open-weights board (/jev-models)',
    `Systems we ran ourselves from published weights, ranked by Capability. ${data.openQualifying} systems qualify within the caps (Jev 1.13.0 is the unranked reference). Rows outside the caps have no rank.`,
    head, rule,
    ...rows.map((r) => row(r, r.board === 'reference' ? 'reference, not ranked' : r.open_board_rank ?? 'outside caps')), '',
    `## API offerings (ranked separately on ${SITE}/jev-models/api)`,
    'Hosted endpoints we do not run ourselves. They are not ranked on the open-weights board; ranks are on the API leaderboard.',
    head, rule,
    ...api.map((r) => row(r, 'see API leaderboard')), '',
    '## Guides and comparisons',
    ...Object.values(JEV_SEO_PATHS).map((p) => `- ${SITE}${p}`),
    ...data.comparisons.map((p) => `- [Jev vs ${p.label}](${SITE}/jev-models/${p.slug})`),
    '## Model pages', ...data.modelKeys.map((key) => `- ${SITE}${jevSystemPath(key)}`), '',
    '## API', `- ${SITE}/api/jevbench/latest`, `- ${SITE}/api/jevbench/${data.artifact.revision}`, `- ${SITE}/llms.txt`, '',
  ].join('\n');
}
