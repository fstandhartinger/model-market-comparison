// F-165(a), the rekey half — the rule, in one place, so the verifier and the test share it.
//
// Every vendor launch row ends "Replace with an independently measured matching-version result
// when available". This decides when that condition is met. It is a per-row protocol match, not
// a name match: a shared benchmark name is a candidate, never a join.
//
// A vendor row is superseded exactly when all three hold:
//   (1) a counterpart board (same benchmark, not itself vendor-scoped) holds a `measured` row for
//       the same model configuration — the independent result is *available*;
//   (2) the vendor row's own protocol names that counterpart's registry `maintainer` as having
//       run the evaluation — so it is the same measurement, not a second one by someone else;
//   (3) the vendor's printed value is that measured value rounded to the precision the vendor
//       printed — the two numbers are one number.
// Condition (1) alone is deliberately not enough. Anthropic's Terminal-Bench 4.0 row has a
// measured counterpart on Vals AI's board, but Anthropic names its own harness rather than Vals
// AI and prints 66.4 where Vals measured 61.616: a different runner and a different number.

export const VENDOR_ROW = /^Vendor-reported by ([A-Za-z0-9 .&-]+?) for /;

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
// "1822" prints no decimals, "66.4" prints one: round the counterpart to the vendor's own precision.
const decimals = (n) => (String(n).split('.')[1] ?? '').length;
export const sameNumber = (vendor, measured) => Number(Number(measured).toFixed(decimals(vendor))) === Number(vendor);

const namesRunner = (protocol, maintainer) => !!maintainer
  && new RegExp(`run independently by ${String(maintainer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(protocol || '');

/**
 * Split every vendor launch row into the ones superseded by an independent measurement and the
 * ones that stay separate. Reads only the snapshot; no board id is hard-coded.
 */
export function partitionVendorRows({ registry, observations }) {
  const byId = new Map(registry.map((e) => [e.id, e]));
  const vendorScoped = new Set(observations.filter((o) => VENDOR_ROW.test(o.protocol || '')).map((o) => o.benchmark_id));
  const superseded = [], separate = [];
  for (const o of observations) {
    if (!VENDOR_ROW.test(o.protocol || '')) continue;
    const entry = byId.get(o.benchmark_id);
    if (!entry) continue;
    const stem = norm(String(entry.family ?? o.benchmark_id.split('::')[0]).replace(/^[a-z0-9]+-/i, ''));
    const counterparts = registry.filter((c) => c.id !== entry.id && !vendorScoped.has(c.id)
      && (norm(c.family) === stem || norm(c.name) === norm(entry.name)));
    let match = null;
    for (const c of counterparts) {
      for (const m of observations) {
        if (m.benchmark_id !== c.id || m.subject.model_id !== o.subject.model_id) continue;
        if ((m.source_basis ?? m.basis) !== 'measured') continue;                         // (1)
        if (!namesRunner(o.protocol, c.maintainer)) continue;                             // (2)
        if (!sameNumber(o.value, m.value)) continue;                                      // (3)
        match = { counterpart: c.id, maintainer: c.maintainer, measured: m.value, measured_id: m.id };
      }
    }
    const row = { id: o.id, benchmark_id: o.benchmark_id, model_id: o.subject.model_id, value: o.value };
    (match ? superseded : separate).push(match ? { ...row, ...match } : row);
  }
  return { superseded, separate, vendorBoards: [...vendorScoped] };
}

/** Vendor rows that satisfy (1) but are kept anyway — the cases that prove (2) and (3) do work. */
export function counterExamples({ registry, observations }, separate) {
  const byId = new Map(registry.map((e) => [e.id, e]));
  return separate.filter((r) => {
    const entry = byId.get(r.benchmark_id);
    return observations.some((m) => m.subject.model_id === r.model_id && (m.source_basis ?? m.basis) === 'measured'
      && m.benchmark_id !== r.benchmark_id && byId.get(m.benchmark_id)?.name === entry?.name);
  });
}
