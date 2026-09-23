// CR-128.5 — the rank line of the third-party frontier ingest report, re-derived rather than re-read.
//
//   node verify-cr-128-5.mjs [<base> …]        (default: both hosts)
//
// Why this file exists. `RESULT.md` of `bh-thirdparty-ingest-20260922` reported #1 / #6 / #18 / #61 for
// the four models it ingested. Those are not ranks: its helper took `all.findIndex(m => m.id === id) + 1`
// over `/api/models?score=composite`, and that route does no sorting — `app/api/models/route.ts` returns
// `ds.models` in dataset order and the page sorts client-side. The array proves it: a 97.36 sits below a
// 97.20. The corrected line is competition rank (1 + the number of strictly better configurations, ties
// sharing a rank) over every scored configuration, and iteration 179 wrote it into
// `/opt/benchmarkheaven/state/ux-evidence/iter179-cr128/cr128-5-corrected-report.txt`.
//
// That correction was found *and* written by claude-opus, so CR-128.5's remaining debt is one
// independent confirmation. This script is that job in one command, for any engine: it reads each live
// host, re-derives the ranks, and prints them beside the dataset state they hold for — ranks move when
// the dataset does, so a bare number without `generated_at` is not a sign-off.
const BASES = process.argv.slice(2).length ? process.argv.slice(2)
  : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
// The four models the ingest covered. "Luna" is GPT-6 Luna (composite 69.06), not GPT-5.6 Luna
// (77.36) — two live ids one character apart, and picking the wrong one silently returns a real
// rank for the wrong model.
const SUBJECTS = ['claude-opus-5.5::max', 'gpt-6-astra::max', 'gpt-6-sol::max', 'gpt-6-luna::max'];

// The corrected line iteration 179 derived (dataset 2026-09-23T00:55:17.019Z), with the Composite each
// rank belongs to. A rank is only meaningful beside the value it was derived from, so the comparison is
// keyed on the score: same Composite and a different rank is a finding; a moved Composite is a moved
// dataset, which the script reports rather than failing on.
const RECORDED = { dataset: '2026-09-23T00:55:17.019Z', ranks: {
  'claude-opus-5.5::max': { rank: 1, tiedWith: 0, score: 100 },
  'gpt-6-astra::max': { rank: 5, tiedWith: 0, score: 97.20386375190644 },
  'gpt-6-sol::max': { rank: 26, tiedWith: 3, score: 91.685290628707 },
  'gpt-6-luna::max': { rank: 103, tiedWith: 2, score: 69.05776986951366 },
} };
const REPORTED = { 'claude-opus-5.5::max': 1, 'gpt-6-astra::max': 6, 'gpt-6-sol::max': 18, 'gpt-6-luna::max': 61 };

const out = [];
for (const base of BASES) {
  const host = base.replace(/\/$/, '');
  const meta = await (await fetch(`${host}/api/meta`)).json();
  const payload = await (await fetch(`${host}/api/models?score=composite`)).json();
  const rows = payload.models ?? payload.data ?? [];
  const scored = rows.filter((m) => typeof m.score === 'number' && Number.isFinite(m.score));
  const rank = (id) => {
    const me = scored.find((m) => m.id === id);
    if (!me) return null;
    const better = scored.filter((m) => m.score > me.score).length;
    const tied = scored.filter((m) => m.score === me.score).length;
    return { rank: better + 1, tiedWith: tied - 1, score: me.score, indexInPayload: rows.findIndex((m) => m.id === id) + 1 };
  };
  const derived = Object.fromEntries(SUBJECTS.map((id) => [id, rank(id)]));
  // The defect itself, checked rather than asserted: the payload is not sorted, so index ≠ rank.
  const sorted = scored.every((m, i) => i === 0 || scored[i - 1].score >= m.score);
  const report = {
    host, revision: meta.revision, generated_at: meta.generated_at, rows: rows.length, scored: scored.length,
    payload_is_sorted_by_score: sorted, derived,
    matches_recorded_correction: Object.fromEntries(SUBJECTS.map((id) => {
      const want = RECORDED.ranks[id], got = derived[id];
      if (!got) return [id, 'absent from this host'];
      if (got.score !== want.score) return [id, `Composite moved (${want.score} → ${got.score}); this host's own rank is #${got.rank}`];
      return [id, got.rank === want.rank && got.tiedWith === want.tiedWith ? 'confirmed'
        : `MISMATCH: recorded #${want.rank}${want.tiedWith ? ` (tie ${want.tiedWith + 1})` : ''}, this host #${got.rank}${got.tiedWith ? ` (tie ${got.tiedWith + 1})` : ''}`];
    })),
    reported_in_RESULT_md: REPORTED,
  };
  out.push(report);
  console.log(`\n=== ${host} @ ${String(meta.revision).slice(0, 8)} (dataset ${meta.generated_at})`);
  console.log(`payload rows ${rows.length}, scored ${scored.length}, sorted by score: ${sorted}`);
  for (const id of SUBJECTS) {
    const d = derived[id];
    console.log(d ? `  ${id.padEnd(22)} score ${String(d.score).padEnd(18)} competition rank #${d.rank}${d.tiedWith ? ` (tied with ${d.tiedWith})` : ''}   [payload position ${d.indexInPayload}, which RESULT.md reported as the rank: #${REPORTED[id]}]`
      : `  ${id.padEnd(22)} ABSENT from this host`);
  }
  for (const [id, verdict] of Object.entries(report.matches_recorded_correction)) console.log(`  ${id.padEnd(22)} ${verdict}`);
}
console.log(`\n${JSON.stringify(out, null, 2)}`);
