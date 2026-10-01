// CR-251: constants and tiny pure helpers shared by the /submit form (browser) and the server. No node imports.
export const FOLLOWUP_BENCHMARKS = Object.freeze(['jevbench', 'imagejevbench', 'audiojevbench']);
export const BENCHMARK_LABELS = Object.freeze({ jevbench: 'JevBench', imagejevbench: 'ImageJevBench', audiojevbench: 'AudioJevBench' });
/** The fast lane covers these two; AudioJevBench joins the regular queue. */
export const FAST_LANE_BENCHMARKS = Object.freeze(['jevbench', 'imagejevbench']);
/** Models ranked below this get the slower-schedule notice. */
export const TOP_RANK_CUTOFF = 10;

export const fastLaneSubset = (benchmarks) => FAST_LANE_BENCHMARKS.filter((b) => Array.isArray(benchmarks) && benchmarks.includes(b));
export const followupValue = (o) => `${o.benchmark}:${o.key}`;

/** True when the earlier version sits outside the top 10 and the slower re-evaluation schedule applies. */
export const outsideTopTen = (rank) => Number.isInteger(rank) && rank > TOP_RANK_CUTOFF;

export function slowScheduleNotice(rank) {
  if (!outsideTopTen(rank)) return null;
  return `Heads-up: the earlier version is ranked #${rank}, outside the top 10 on the composite score. We re-evaluate the top 10 with every release and the rest of the leaderboard on a slower schedule, so the new version may take a while. We apologise — otherwise we couldn't keep up with the number of submissions and our short release cycles. If you need it sooner, choose the fast lane below.`;
}
