// CR-439 (2026-10-11): display helper for self-hosted latency. Self-hosted (open-weights) rows are measured over
// loopback on our GPU, so the ranking and the latency cap use an estimate that adds the network round trip an API
// call would include: 2 x measured p50 + 0.15 s. This module only labels and formats; it never changes a number.

export const JEV_LATENCY_LABEL = 'est. incl. network (2x + 150 ms)';
export const JEV_LATENCY_SHORT_LABEL = 'est.';
export const JEV_LATENCY_NOTE_EN = 'Self-hosted models are timed on our own hardware over loopback, without a network. The ranking and the latency cap use an estimate that adds the network round trip an API call includes: 2 × measured p50 + 150 ms.';
export const JEV_LATENCY_HOSTED_OPTION = 'Model authors can ask us to time a hosted endpoint instead (on request).';

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** Self-hosted rows carry "x2 + 0.15 s (...)"; API rows carry "none (API)" or nothing. Demo-endpoint rows ("x2 ..."
 * without + 0.15 s) are API endpoints with a different assumption and keep their own existing display. */
export function isSelfHostedAdjustment(adjustment) {
  return typeof adjustment === 'string' && /^x2\s*\+\s*0\.15\s*s/i.test(adjustment.trim());
}

/** Formats seconds like the surrounding component: seconds with `digits` decimals, or "—". */
export function latencySeconds(value, digits = 2) {
  return isNumber(value) ? `${value.toFixed(digits)} s` : '—';
}

/**
 * Describes a row's `speed` object for display.
 * Returns { adjusted, measured, estimate, label, tooltip, basis, note }.
 * `endpointKind` ('gpu' | 'cpu') only names the hardware in the tooltip; it never decides `adjusted`.
 * `adjusted` is true only for self-hosted rows (adjustment starts with "x2") that carry both a measured and an
 * adjusted p50 that differ. API rows return adjusted=false and measured=estimate=their p50.
 */
export function jevLatencyView(speed, digits = 2, endpointKind = null) {
  const raw = isNumber(speed?.p50_s_raw) ? speed.p50_s_raw : null;
  const adj = isNumber(speed?.p50_s_adjusted) ? speed.p50_s_adjusted : null;
  const adjusted = isSelfHostedAdjustment(speed?.adjustment) && raw != null && adj != null && Math.abs(adj - raw) > 1e-9;
  if (!adjusted) {
    return { adjusted: false, measured: raw ?? adj, estimate: adj ?? raw, label: null, tooltip: null,
      basis: /^x2/i.test(String(speed?.adjustment ?? '').trim()) ? 'demo-endpoint-x2' : 'api-end-to-end', note: null };
  }
  const measured = latencySeconds(raw, digits === 2 ? 3 : digits);
  const estimate = latencySeconds(adj, digits);
  const where = endpointKind === 'gpu' ? 'our GPU' : endpointKind === 'cpu' ? 'our CPU host' : 'our own hardware';
  const tooltip = `Self-hosted model: measured p50 ${measured} on ${where} over loopback (no network). For comparison with API models, whose latency includes the network round trip, the ranking and latency cap use an estimate: 2 × measured + 150 ms = ${estimate}. ${JEV_LATENCY_HOSTED_OPTION}`;
  return { adjusted: true, measured: raw, estimate: adj, label: JEV_LATENCY_LABEL, tooltip,
    basis: 'measured-loopback', note: JEV_LATENCY_NOTE_EN };
}

/** Additive JSON fields for a speed object (never replaces existing fields). */
export function jevLatencyJsonFields(speed, endpointKind = null) {
  const v = jevLatencyView(speed, 2, endpointKind);
  if (v.measured == null && v.estimate == null) return {};
  return {
    p50_s_measured: v.measured,
    latency_basis: v.basis,
    ...(v.adjusted ? { latency_note: v.note } : {}),
  };
}

/** One-line text for plain-string tables: `plain` for rows without an estimate, else "measured · estimate label". */
export function jevLatencyText(speed, plain, { unit = true } = {}) {
  const v = jevLatencyView(speed);
  if (!v.adjusted) return plain;
  const u = unit ? ' s' : '';
  return `${v.measured.toFixed(3)}${u} measured · ${v.estimate.toFixed(2)}${u} ${JEV_LATENCY_LABEL}`;
}
