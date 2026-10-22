// Fake JevBench v1.7.0 board for the S5 UI tests and the local screenshot page (never shipped; no production data).
// Built from r160/v170/ROW-SHAPE.md. Five rows: re-scored GPU, re-scored API equated A4, pending CPU, a row with many
// decisions over 10 s, and a dated-carry row (separate list). v1.6 values sit only under `previous`.

const prev = (over = {}) => ({
  board_release: 'v1.6.37', method: 'v1.6', measured_in: 'v1.6.1',
  axes: { intelligence: 80, calibration: 70, speed: 60, cost: 90 }, scores: { A: 73.73, B: 70, C: 72 }, views: {},
  jevbench_score: 73.73, capability: 75, composite_ci95: { A: [70, 76] },
  speed: { p50_s_raw: 0.21, p95_s_raw: 0.6, p50_s_adjusted: 0.57, p95_s_adjusted: 1.35, adjustment: 'x2 + 0.15 s (assumption, not measured)', n: 124 },
  rank: 12, ranks: { A: 12, B: 11, C: 10, capability: 9 }, open_board_rank: 7, api_board_rank: null,
  capability_rank: 9, capability_open_board_rank: 6, capability_api_board_rank: null, ...over,
});
const base = (key, display, extra) => ({
  key, display, author: 'Fixture Lab', repo: `https://example.invalid/${key}`, class: 'sage', api_flag: false, api_exposure_note: null,
  open: 'yes', licence: 'apache-2.0', cost: { kind: 'measured', usd_per_1000: 0.05, basis: 'fixture' }, draw: null,
  endpoint_kind: 'gpu', measured_in: 'v1.6.1', last_measured_on: '2026-10-01', listed: true, not_ranked_because: null, ...extra,
});
const limit = (nOver, ok, n = 1500) => ({ limit_s: 10, rule: 'latency_s > limit -> failed', treatment: 'share', n_over_limit: nOver, n_over_limit_answered_ok: ok, speed_basis: 'all decisions given', speed_n: n });

export const V170_FIXTURE_SYSTEMS = [
  base('fx-gpu-rescored', 'Fixture GPU Re-scored 4B', {
    method: 'v1.7', rescored_in: 'v1.7.0', ranked: true, rank: 3, listing: 'ranked', ranks: { A: 3, B: 3, C: 3, capability: 3 },
    axes: { intelligence: 79.1, calibration: 68.2, speed: 61.4, cost: 90 }, scores: { A: 72.4, B: 69, C: 71 }, jevbench_score: 72.4, capability: 73.65,
    composite_ci95: { A: [69.9, 74.8] },
    speed: { p50_s_raw: 0.21, p95_s_raw: 0.95, p50_s_adjusted: 0.57, p95_s_adjusted: 2.05, adjustment: 'x2 + 0.15 s (assumption, not measured)', n: 1500, basis: 'all decisions given' },
    decision_limit: limit(0, 0), previous: prev(),
  }),
  base('fx-api-a4', 'Fixture API Equated A4', {
    method: 'v1.7', rescored_in: 'v1.7.0', ranked: true, rank: 5, listing: 'ranked', ranks: { A: 5, B: 5, C: 5, capability: 5 }, api_flag: true, endpoint_kind: 'api',
    class: 'api', a4: true,
    axes: { intelligence: 82.51, calibration: 71.3, speed: 55.2, cost: 70 }, scores: { A: 71.2, B: 68, C: 70 }, jevbench_score: 71.2, capability: 76.91,
    composite_ci95: { A: [68.1, 74.2] },
    speed: { p50_s_raw: 1.2, p95_s_raw: 4.8, p50_s_adjusted: 1.2, p95_s_adjusted: 4.8, adjustment: 'none (API)', n: 600, basis: 'all decisions given' },
    decision_limit: limit(2, 1, 600), previous: prev({ jevbench_score: 70.5, rank: 8, open_board_rank: null, api_board_rank: 3 }),
  }),
  base('fx-cpu-pending', 'Fixture CPU Pending 0.6B', {
    method: 'v1.6', ranked: false, rank: null, listing: 'remeasure-pending', ranks: { A: null, B: null, C: null, capability: null }, endpoint_kind: 'cpu',
    not_ranked_because: 'Re-measure pending under the 10 s rule: this row\'s per-decision times were recorded on a loaded CPU host, so they cannot be scored under the time limit. Shown with its v1.6 values until it is measured again.',
    axes: { intelligence: 55, calibration: 50, speed: 40, cost: 95 }, scores: { A: 52.5, B: 50, C: 51 }, jevbench_score: 52.5, capability: 52.5,
    speed: { p50_s_raw: 3.1, p95_s_raw: 9.9, p50_s_adjusted: 6.35, p95_s_adjusted: 19.95, adjustment: 'x2 + 0.15 s (assumption, not measured)', n: 124 },
    decision_limit: null,
    previous: prev({ axes: { intelligence: 55, calibration: 50, speed: 40, cost: 95 }, jevbench_score: 52.5, capability: 52.5, rank: null, open_board_rank: null,
      speed: { p50_s_raw: 3.1, p95_s_raw: 9.9, p50_s_adjusted: 6.35, p95_s_adjusted: 19.95, n: 124 } }),
  }),
  base('fx-slow-tail', 'Fixture Slow Tail 12B', {
    method: 'v1.7', rescored_in: 'v1.7.0', ranked: true, rank: 11, listing: 'ranked', ranks: { A: 11, B: 12, C: 11, capability: 8 },
    axes: { intelligence: 85, calibration: 60.4, speed: 20.1, cost: 80 }, scores: { A: 61.3, B: 58, C: 60 }, jevbench_score: 61.3, capability: 72.7,
    composite_ci95: { A: [58.1, 64.2] },
    speed: { p50_s_raw: 4.2, p95_s_raw: 31.4, p50_s_adjusted: 8.55, p95_s_adjusted: 62.95, adjustment: 'x2 + 0.15 s (assumption, not measured)', n: 1500, basis: 'all decisions given' },
    decision_limit: limit(212, 140), previous: prev({ jevbench_score: 78.9, capability: 80, rank: 4, axes: { intelligence: 85, calibration: 75, speed: 55, cost: 80 } }),
  }),
];

/** The dated-carry list (separate from `systems`): never ranked, never re-scored. */
export const V170_FIXTURE_CARRY = [
  { key: 'fx-carry', display: 'Fixture Carry 7B', measured_revision: 'v1.5.6', measured_label: 'v1.5.6 (2026-08-01)', capability: 60, composite_v15: 58.2, v156_rank: 40,
    cost: { kind: 'estimate', usd_per_1000: 0.1 }, speed: { p50_s_raw: 0.5, p50_s_adjusted: 0.5 }, repo: 'https://example.invalid/fx-carry', label: 'measured before the 10 s rule (v1.5 method), not re-scored' },
];
export const V170_FIXTURE_CARRY_LABEL = 'measured before the 10 s rule (v1.5 method), not re-scored';
