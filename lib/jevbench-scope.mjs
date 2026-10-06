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
  const systems = keep.map((s) => {
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

/** Dated carry rows of one scope (carry rows are never ranked, so nothing is re-numbered). */
export function jevbenchScopeCarry(carry, scope, isApi = isJevApiOffering) {
  if (scope === 'all') return carry;
  return { ...carry, rows: jevScopeRows(carry.rows, scope, isApi) };
}

/** Keys hidden on the open-weights board until "Show API offerings" is switched on. */
export function jevApiOfferingKeys(rows, isApi = isJevApiOffering) {
  return [...new Set((rows ?? []).filter((row) => jevRowScope(row, isApi) === 'api').map((row) => row.key))];
}
