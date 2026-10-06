// JevBench v1.7 (Florian, 5 Oct 2026): /jev-models is the open-weights leaderboard, /jev-models/api the
// API-provider leaderboard. Scores are never recomputed here; a scope only selects rows and re-numbers the
// official ranks inside it.
//
// Rule: a system is an API offering when we measured it through an endpoint we do not run ourselves (vendor
// API, author-hosted or third-party-hosted endpoint), even if its base weights are open. Every system we ran on
// our own hardware from published weights is open weights. Jev 1.13.0 stays on the open-weights board as the
// unranked reference row (it defines the Jev-class caps).

export const JEV_REFERENCE_KEY = 'jev-1.13.0';
export const JEV_SCOPES = ['open', 'api', 'all'];
export const JEV_SCOPE_LISTING = { reference: 'reference', api: 'api_offering' };

const HOSTED_ENDPOINTS = new Set(['api', 'demo']);

/** True when the row was measured through a hosted endpoint (v1.6 lane, API flag or endpoint kind). */
export function isJevApiOffering(row) {
  if (!row) return false;
  if (row.v16?.lane) return row.v16.lane === 'api';
  if (row.api_flag === true) return true;
  return HOSTED_ENDPOINTS.has(row.endpoint_kind ?? '');
}

/** Rows without lane/flag fields (not-measured catalogue entries) borrow them from a richer row with the same key. */
export function jevScopeClassifier(...sources) {
  const known = new Map();
  for (const rows of sources) for (const row of rows ?? []) {
    if (!row?.key || known.has(row.key)) continue;
    if (row.v16?.lane || typeof row.api_flag === 'boolean' || row.endpoint_kind) known.set(row.key, isJevApiOffering(row));
  }
  return (row) => known.has(row.key) ? known.get(row.key) : isJevApiOffering(row);
}

/** Which scope a row belongs to: 'reference' (Jev), 'api' or 'open'. */
export function jevRowScope(row, isApi = isJevApiOffering) {
  if (row?.key === JEV_REFERENCE_KEY) return 'reference';
  return isApi(row) ? 'api' : 'open';
}

const inScope = (scope, rowScope) => scope === 'all'
  || (scope === 'open' && rowScope !== 'api')
  || (scope === 'api' && rowScope !== 'open');

/** Rows of `rows` that belong on the board of `scope` (the Jev reference is on both). */
export function jevScopeRows(rows, scope, isApi = isJevApiOffering) {
  if (!JEV_SCOPES.includes(scope)) throw new Error(`unknown JevBench scope ${scope}`);
  return (rows ?? []).filter((row) => inScope(scope, jevRowScope(row, isApi)));
}

function withoutAlt(row) {
  if (!row?.alt) return row;
  const { alt: _alt, ...rest } = row;
  return rest;
}

/**
 * The artifact as seen on one board. 'open' keeps every system and marks API offerings (and the Jev reference)
 * as unranked rows with their own listing, so the "Show API offerings" toggle only changes visibility;
 * 'api' keeps API offerings plus Jev, ranked among themselves; 'all' is the release unchanged.
 * Ranks follow the published board order of each option filtered to the ranked rows of the scope.
 */
export function jevbenchScopeArtifact(artifact, scope, isApi = isJevApiOffering) {
  if (!JEV_SCOPES.includes(scope)) throw new Error(`unknown JevBench scope ${scope}`);
  if (scope === 'all') return artifact;
  const keep = scope === 'api' ? jevScopeRows(artifact.systems, 'api', isApi) : artifact.systems;
  const stillRanked = (s) => s.ranked && (scope === 'api' || jevRowScope(s, isApi) === 'open');
  const rankedKeys = new Set(keep.filter(stillRanked).map((s) => s.key));
  const options = Object.keys(artifact.board ?? {});
  const board = Object.fromEntries(options.map((o) => {
    const order = artifact.board[o].order.filter((key) => rankedKeys.has(key));
    const markers = (artifact.board[o].markers ?? []).filter((m) => rankedKeys.has(m?.upper) && rankedKeys.has(m?.lower));
    return [o, { ...artifact.board[o], order, markers, leader_wording: scope === 'open' && order[0] === artifact.board[o].order[0] ? artifact.board[o].leader_wording : null }];
  }));
  const position = Object.fromEntries(options.map((o) => [o, new Map(board[o].order.map((key, i) => [key, i + 1]))]));
  const capabilityOrder = keep.filter((s) => rankedKeys.has(s.key) && s.ranks?.capability != null)
    .sort((x, y) => x.ranks.capability - y.ranks.capability).map((s) => s.key);
  const systems = keep.map((row) => {
    // v1.7.3 (Florian 6 Oct 2026): the base-model reference price only guarded API rows against open weights; on the
    // API board offerings are compared among themselves at their own list price, so the alternative is dropped there.
    const s = scope === 'api' ? withoutAlt(row) : row;
    if (rankedKeys.has(s.key)) {
      const ranks = { ...(s.ranks ?? {}) };
      for (const o of options) if (o in ranks) ranks[o] = position[o].get(s.key) ?? null;
      if ('capability' in ranks) ranks.capability = ranks.capability == null ? null : capabilityOrder.indexOf(s.key) + 1;
      return { ...s, rank: position[artifact.headline]?.get(s.key) ?? null, ranks, scope: jevRowScope(s, isApi) };
    }
    if (!s.ranked) return { ...s, scope: jevRowScope(s, isApi) };
    const reference = jevRowScope(s, isApi) === 'reference';
    return {
      ...s, ranked: false, rank: null, scope: jevRowScope(s, isApi),
      ranks: Object.fromEntries(Object.keys(s.ranks ?? {}).map((k) => [k, null])),
      listing: reference ? JEV_SCOPE_LISTING.reference : JEV_SCOPE_LISTING.api,
      not_ranked_because: reference
        ? 'Reference row: Jev 1.13.0 is a hosted API and defines the Jev-class caps; it is shown for comparison and is not ranked among open-weights systems.'
        : 'Hosted API offering: shown for comparison only. API offerings are ranked on the API leaderboard (/jev-models/api).',
    };
  });
  const notMeasured = scope === 'api' ? jevScopeRows(artifact.not_measured, 'api', isApi) : artifact.not_measured;
  return { ...artifact, scope, systems, not_measured: notMeasured, n_ranked: rankedKeys.size, roster_count: systems.length + notMeasured.length, board };
}

/** Listings of unranked rows that sit at their score position among the ranked rows (not at the bottom). */
export const JEV_PRELIMINARY_LISTING = 'preliminary';
export const JEV_PENDING_LISTING = 'pending';
export const JEV_INTERLEAVED_LISTINGS = new Set([...Object.values(JEV_SCOPE_LISTING), JEV_PRELIMINARY_LISTING]);

/**
 * v1.7.5 (Florian 6 Oct 2026, Part 12): on /jev-models/api every API offering with a v1.6 public-set figure is drawn in
 * the Composite and Capability charts as an unranked, hatched "preliminary" row at its score position; rows without any
 * v1.6 figure are greyed "pending" rows (no bar) with their dated v1.5 value. The full sealed re-run replaces them.
 * `meta` maps key -> carried/catalogue row (display, author, class, licence, endpoint). Nothing here is ranked.
 */
export function jevApiPreliminaryRows(publicSet, meta) {
  const info = (key) => meta.get(key) ?? {};
  const prelim = (publicSet?.rows ?? []).filter((r) => (r.role === 'carried' || r.role === 'new') && r.composite?.A != null).map((r) => {
    const m = info(r.key);
    return {
      key: r.key, display: r.display, author: m.author ?? r.author ?? '', class: m.class ?? 'decision-api', open: m.open ?? 'no',
      licence: m.licence ?? 'hosted API', repo: r.href ?? m.repo ?? null, endpoint_kind: m.endpoint_kind ?? 'api',
      endpoint_condition: m.endpoint_condition ?? undefined, api_flag: true, v16: { lane: 'api' }, scope: 'api',
      ranked: false, rank: null, ranks: { A: null, B: null, C: null, capability: null }, listing: JEV_PRELIMINARY_LISTING,
      not_ranked_because: r.not_ranked_because ?? `Preliminary: v1.6 public set only (300 public items, measured ${r.measured_on}); full re-evaluation running.`,
      jevbench_score: r.composite.A, scores: { ...r.composite }, capability: r.capability, axes: { ...r.axes },
      intelligence: { base: r.intelligence, I_open: r.intelligence }, calibration: { score: r.calibration },
      cost: { kind: r.cost_kind === 'estimate' ? 'estimate' : 'tariff', usd_per_1000: r.usd_per_1000,
        basis: r.cost_kind === 'estimate' ? 'Documented v1.5 estimate (same basis as the rankings)' : 'List price x tokens measured on the 300 public items' },
      speed: { p50_s_raw: r.p50_s, p95_s_raw: r.p95_s ?? null, p50_s_adjusted: r.p50_s_adjusted ?? r.p50_s, p95_s_adjusted: r.p95_s_adjusted ?? r.p95_s ?? null,
        adjustment: r.latency_adjustment ?? 'none (API)', n: r.n_ok },
      preliminary: { measured_on: r.measured_on, n_ok: r.n_ok, n_items: r.n_items },
    };
  });
  const pending = (publicSet?.pending ?? []).map((p) => {
    const m = info(p.key);
    const old = m.composite_v15 != null ? ` Last: Composite ${Number(m.composite_v15).toFixed(1)}, ${m.measured_label ?? 'v1.5'}, older method.` : '';
    return {
      key: p.key, display: m.display ?? p.display, author: m.author ?? '', class: m.class ?? 'decision-api', open: m.open ?? 'no',
      licence: m.licence ?? 'hosted API', repo: m.source_url ?? m.repo ?? null, endpoint_kind: m.endpoint_kind ?? 'api', api_flag: true,
      v16: { lane: 'api' }, scope: 'api', ranked: false, rank: null, ranks: { A: null, B: null, C: null, capability: null },
      listing: JEV_PENDING_LISTING, not_ranked_because: `Pending: no v1.6 figure yet (${p.reason}).${old}`,
      jevbench_score: null, scores: { A: null, B: null, C: null }, capability: null,
      axes: { intelligence: null, calibration: null, speed: null, cost: null }, cost: { kind: 'unpriced', usd_per_1000: null, basis: '' },
      speed: { p50_s_raw: null, p50_s_adjusted: null, adjustment: undefined },
    };
  });
  return { prelim, pending };
}

/**
 * v1.7.3 (Marco De Rossi via Florian, 6 Oct 2026): display order of a scoped board. Ranked rows keep their official
 * order; the unranked Jev reference and toggled-in API offerings are placed by score among them, so "Show API
 * offerings" shows them in every ranking section instead of folding them under "more". Ranks are unchanged.
 */
export function jevScopeDisplayOrder(rows) {
  const score = (r) => Number.isFinite(r.jevbench_score) ? r.jevbench_score : -Infinity;
  const ranked = rows.filter((r) => r.ranked).sort((x, y) => (x.rank ?? 999) - (y.rank ?? 999));
  const extra = rows.filter((r) => !r.ranked).sort((x, y) => score(y) - score(x));
  const out = [];
  let i = 0;
  for (const r of ranked) {
    while (i < extra.length && score(extra[i]) > score(r)) out.push(extra[i++]);
    out.push(r);
  }
  return [...out, ...extra.slice(i)];
}

/** Dated carry rows of one scope (carry rows are never ranked, so nothing is re-numbered). */
export function jevbenchScopeCarry(carry, scope, isApi = isJevApiOffering) {
  if (scope === 'all') return carry;
  return { ...carry, rows: jevScopeRows(carry.rows, scope, isApi) };
}

/** Keys hidden on the open-weights board until "Show API offerings" is switched on. */
export function jevApiOfferingKeys(rows, isApi = isJevApiOffering) {
  return [...new Set((rows ?? []).filter((row) => jevRowScope(row, isApi) === 'api').map((row) => row.key))];
}

/**
 * v1.7.1 (Florian 6 Oct 2026): every API offering for the roster on /jev-models/api, in four groups — ranked on this
 * release, unranked variants measured on it, dated carry rows, and catalogue rows only listed on the previous release
 * (wrappers, partial runs) or not measured yet. Every API-scope key lands in exactly one group; nothing is re-scored.
 */
export function jevApiRoster(apiArtifact, carryRows, previousSystems = [], previousRevision = null) {
  const ranked = apiArtifact.systems.filter((s) => s.ranked).sort((x, y) => (x.rank ?? 999) - (y.rank ?? 999));
  const variants = apiArtifact.systems.filter((s) => !s.ranked);
  const carried = carryRows ?? [];
  const seen = new Set([...apiArtifact.systems, ...carried].map((row) => row.key));
  const previous = new Map(previousSystems.map((s) => [s.key, s]));
  const listed = (apiArtifact.not_measured ?? []).filter((row) => !seen.has(row.key)).map((row) => {
    const p = previous.get(row.key);
    return { key: row.key, display: p?.display ?? row.display, listing: p?.listing ?? null, reason: p?.not_ranked_because ?? row.reason ?? null,
      composite_v15: p?.jevbench_score ?? null, endpoint_kind: p?.endpoint_kind ?? null, href: row.repo ?? null, revision: p ? previousRevision : null };
  });
  return { ranked, variants, carried, listed };
}

/**
 * v1.7.7 (Florian 6 Oct 2026, Part 12b): the API lane's full re-run of every reachable API offering on a fresh sealed draw
 * (A4, 300 sealed + the 300 public items), equated to the S u P scale with the A2/A3 supplement method. These rows replace
 * the preliminary public-set rows and are ranked on the API board. The figures come from the lane's equated rows file
 * unchanged; this function only shapes them like release systems and slots them into each option's published order by
 * score (and into the Capability order by Capability), so scoped boards number them with everything else.
 * `meta` maps key -> carried/catalogue row (class, licence, endpoint, repo). Archived release pages never call this.
 */
export function jevWithApiA4Rows(artifact, a4, meta = new Map()) {
  const have = new Set(artifact.systems.map((s) => s.key));
  const rows = (a4?.rows ?? []).filter((r) => !have.has(r.key));
  // v1.7.8: API rows the lane measured later on the full S u P set (not equated, e.g. Liquid d1) come as release-shaped rows.
  const fullRows = (a4?.full_rows ?? []).filter((r) => !have.has(r.key));
  // v1.7.10: rows re-run on the later fresh sealed subset A5 u P (e.g. OpenAI Decisions) carry A5's round and offsets.
  const equated = [...rows.map((r) => ({ r, round: a4.round, offsets: a4.a4_offsets })),
    ...(a4?.a5_rows ?? []).filter((r) => !have.has(r.key)).map((r) => ({ r, round: a4.a5?.round, offsets: a4.a5?.a5_offsets, subset: 'A5' }))];
  if (equated.length === 0 && fullRows.length === 0) return artifact;
  const info = (key) => meta.get(key) ?? {};
  const options = Object.keys(artifact.board ?? {});
  const added = equated.map(({ r, round, offsets, subset = 'A4' }) => {
    const m = info(r.key);
    const ranked = r.ranked ?? r.listing === 'ranked';
    // score-a4-2 rows carry endpoint_kind and latency_adjustment; their p50/p95 are already adjusted (x2 for demo endpoints).
    const adjustment = r.latency_adjustment ?? 'none (API)';
    const raw = (s) => s == null ? null : /^x2/.test(adjustment) ? s / 2 : s;
    return {
      key: r.key, display: r.display, author: r.author ?? m.author ?? '', class: m.class ?? 'decision-api', open: m.open ?? 'no',
      licence: m.licence ?? 'hosted API', repo: m.source_url ?? m.repo ?? null, endpoint_kind: r.endpoint_kind ?? m.endpoint_kind ?? 'api',
      endpoint_condition: m.endpoint_condition ?? undefined, api_flag: true, ranked, rank: null,
      ranks: { A: null, B: null, C: null, capability: null }, listing: ranked ? 'ranked' : 'wrapper',
      not_ranked_because: ranked ? undefined : 'Wrapper that serves Jev: listed, never ranked.',
      jevbench_score: r.composite.A, scores: { ...r.composite }, composite_ci95: r.composite_ci95, capability: r.capability,
      axes: { intelligence: r.intelligence, calibration: r.calibration, speed: r.speed_axis, cost: r.cost_axis },
      intelligence: { base: r.intelligence, I_open: r.I_open, I_sealed: r.I_sealed }, calibration: { score: r.calibration },
      cost: { kind: r.cost_kind === 'estimate' ? 'estimate' : 'tariff', usd_per_1000: r.usd_per_1000, basis: r.cost_basis },
      speed: { p50_s_raw: raw(r.p50_s), p95_s_raw: raw(r.p95_s), p50_s_adjusted: r.p50_s, p95_s_adjusted: r.p95_s, adjustment, n: r.answered_ok },
      status: { answered_ok: r.answered_ok, rows: r.n_rows, status: 'complete' },
      v16: { lane: 'api', full_set_api: false, equated: true, n_items: r.n_rows, metric_basis: r.basis, measured_on: r.measured_on,
        round, equating_offset: offsets, api_subset_tag: subset, run_sha256: r.run_sha256 },
      last_measured_on: r.measured_on, a4: { measured_on: r.measured_on, round, n_ok: r.answered_ok, n_items: r.n_rows, subset },
    };
  });
  for (const r of fullRows) {
    const ranked = r.ranked ?? r.listing === 'ranked';
    added.push({ ...r, api_flag: true, ranked, rank: null, ranks: { A: null, B: null, C: null, capability: null } });
  }
  const rankedAdded = added.filter((s) => s.ranked);
  const score = (s, o) => s.scores?.[o] ?? -Infinity;
  const byKey = new Map([...artifact.systems, ...added].map((s) => [s.key, s]));
  const board = Object.fromEntries(options.map((o) => {
    const order = [...artifact.board[o].order];
    for (const s of [...rankedAdded].sort((x, y) => score(y, o) - score(x, o))) {
      const at = order.findIndex((key) => score(byKey.get(key) ?? {}, o) < score(s, o));
      order.splice(at < 0 ? order.length : at, 0, s.key);
    }
    return [o, { ...artifact.board[o], order }];
  }));
  // Capability ranks: a new row takes a fractional rank just below the last published row with an equal or higher
  // Capability; scoped boards re-number by sorting, so published rows keep their relative order.
  const published = artifact.systems.filter((s) => s.ranked && s.ranks?.capability != null).sort((x, y) => x.ranks.capability - y.ranks.capability);
  const sorted = [...rankedAdded].sort((x, y) => y.capability - x.capability);
  sorted.forEach((s, i) => {
    const above = published.filter((p) => p.capability >= s.capability);
    const base = above.length ? above[above.length - 1].ranks.capability : 0;
    s.ranks.capability = base + (i + 1) / (sorted.length + 1);
  });
  return { ...artifact, systems: [...artifact.systems, ...added], board, n_ranked: (artifact.n_ranked ?? 0) + rankedAdded.length };
}
