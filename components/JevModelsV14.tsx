import { jevV14RowNote, type JevV14Artifact, type JevV14System } from '../lib/jevbench-v14.mjs';
import { JevCompareV14, type JevCompareRow } from './JevCompareV14';
import { shortName, type JevBoardViewRow } from './JevBoardShared';
import { JevScoreChart, JevAxesTable, type JevFairness } from './JevBoardInteractive';

// F-188/F-189: the alternatives guide draws its bars with components/JevScoreBar.tsx; the board re-exports them.
import { JevScoreBar, JevScoreBarHeader, toBarRow } from './JevScoreBar';
export { JevScoreBar, JevScoreBarHeader, toBarRow };

// The artifact's `open` field is not filled consistently (JevK5, for example, has none although code and weights are
// Apache-2.0), so a row without the field counts as open unless its licence says proprietary or closed weights.
const openSource = (row: JevV14System) => {
  const open = row.open as unknown;
  if (open === 'no' || open === false) return false;
  if (open === 'yes' || open === true || open === 'weights') return true;
  return !/proprietary|closed weights|weights not published|hosted service/i.test(row.licence ?? '');
};

/** Only the fields the chart and table render travel to the client, not the per-family aggregates. */
function viewRow(row: JevV14System, note: string | null, previousKeys: Set<string> | null): JevBoardViewRow {
  return {
    key: row.key, display: row.display, author: row.author, repo: row.repo, class: row.class,
    rank: row.rank, ranked: row.ranked, listing: row.listing, not_ranked_because: row.not_ranked_because,
    priority_run: row.priority_run === true, api_flag: row.api_flag === true, api_exposure_note: row.api_exposure_note,
    jevbench_score: row.jevbench_score,
    axes: { intelligence: row.axes?.intelligence ?? null, calibration: row.axes?.calibration ?? null, speed: row.axes?.speed ?? null, cost: row.axes?.cost ?? null },
    public_accuracy: row.public_accuracy, sealed_accuracy: row.sealed_accuracy, public_minus_sealed_gap_pp: row.public_minus_sealed_gap_pp,
    cost: { kind: row.cost?.kind, usd_per_1000: row.cost?.usd_per_1000 ?? null, basis: row.cost?.basis },
    speed: { p50_s_raw: row.speed?.p50_s_raw ?? null, ...(row.speed?.adjustment ? { adjustment: row.speed.adjustment } : {}) },
    endpoint_kind: row.endpoint_kind, endpoint_condition: row.endpoint_condition,
    note, openSource: openSource(row), isNew: previousKeys !== null && !previousKeys.has(row.key),
  };
}

/** Florian 25 Sep 2026: when the #1 is not the strongest reasoner near the top, say so next to the View by switch.
 *  Compared within the top five: instruction-model baselines far down the ranking have higher Intelligence, so a
 *  field-wide "strongest reasoner" would not be the claim the sentence makes. */
function fairnessOf(ranked: JevV14System[]): JevFairness {
  const topFive = ranked.slice(0, 5);
  const [lead] = topFive;
  const top = [...topFive].sort((a, b) => (b.axes.intelligence ?? 0) - (a.axes.intelligence ?? 0))[0];
  if (!lead || !top || top.key === lead.key || lead.axes.intelligence == null || top.axes.intelligence == null) return null;
  const leadsOn = (['calibration', 'speed', 'cost'] as const).filter((axis) => (lead.axes[axis] ?? -1) > (top.axes[axis] ?? -1));
  return { leadName: shortName(lead.display), topName: shortName(top.display), leadInt: lead.axes.intelligence, topInt: top.axes.intelligence, leadsOn };
}

function compareRow(row: JevV14System): JevCompareRow {
  const hard = (row.hard as { by_family?: Record<string, { accuracy: number | null; n: number }> } | null)?.by_family ?? null;
  const sealed = (row.sealed_aggregate as { by_family?: Record<string, number | null> } | null)?.by_family ?? null;
  const tiers = (row.tiers ?? {}) as Record<string, number | null>;
  return {
    key: row.key, name: shortName(row.display), cls: row.class, rank: row.rank, listing: row.listing, score: row.jevbench_score,
    axes: row.axes, tiers: { easy: tiers.easy ?? null, standard: tiers.standard ?? null, judge: tiers.judge ?? null, hard: tiers.hard ?? null, sealed: row.sealed_accuracy },
    hard: hard ? Object.fromEntries(Object.entries(hard).map(([k, v]) => [k, { accuracy: v.accuracy, n: v.n }])) : null,
    sealed,
  };
}

export function JevModelsV14Board({ artifact, sha256, previous, capabilityHref }: { artifact: JevV14Artifact; sha256: string; previous?: { revision: string; keys: string[] }; capabilityHref?: string }) {
  const ranked = artifact.systems.filter((row) => row.listing === 'ranked').sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const unranked = artifact.systems.filter((row) => row.listing !== 'ranked').sort((a, b) => (b.jevbench_score ?? -1) - (a.jevbench_score ?? -1));
  const rows = [...ranked, ...unranked];
  const noteOf = new Map(rows.map((row) => [row.key, jevV14RowNote(artifact.footnotes?.[row.key])]));
  const notes = rows.filter((row) => noteOf.get(row.key));
  const previousKeys = previous ? new Set(previous.keys) : null;
  const viewRows = rows.map((row) => viewRow(row, noteOf.get(row.key) ?? null, previousKeys));
  const newLabel = previousKeys && viewRows.some((row) => row.isNew) ? artifact.revision : null;
  const publicDecisions = artifact.tiers.easy + artifact.tiers.standard + artifact.tiers.judge + artifact.tiers.hard;
  const sealedDecisions = artifact.tiers.sealed;
  return <section className="mt-8" aria-labelledby="jev14-board" data-bh-jevbench-v14>
    <h2 id="jev14-board" className="sr-only">JevBench {artifact.revision} ranking</h2>
    <JevScoreChart revision={artifact.revision} rows={viewRows} rankedCount={ranked.length} newLabel={newLabel} fairness={fairnessOf(ranked)} approvedNote={typeof artifact.top_five_note === 'string' ? artifact.top_five_note : null} capabilityHref={capabilityHref ?? null} />

    <JevCompareV14 rows={rows.map(compareRow)} sealedDecisions={sealedDecisions} hardDecisions={artifact.tiers.hard} />

    {/* CR-151 (Florian 25 Sep 2026): the numeric table follows the compare view; it sorts, filters and shades like the chart. */}
    <h2 id="jev14-table" className="mt-10 scroll-mt-6 text-xl font-semibold">Axes, accuracy, latency and cost</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">Every system with its four axes, public and sealed accuracy and the gap between them. Click a column heading to sort; filter by name, type, openness, API flag{newLabel ? ' or release' : ''}. On a phone the name column stays put while the table scrolls sideways. <span className="whitespace-nowrap">† = a note on that system</span> — tap it to read.</p>
    <JevAxesTable rows={viewRows} publicDecisions={publicDecisions} sealedDecisions={sealedDecisions} newLabel={newLabel} />
    <p className="bh-muted mt-2 text-xs" data-bh-jev14-api-note>API = the operator's endpoint received sealed item text during evaluation; the answers and item-level results are not published. The sealed text and answers remain private; only system-level aggregates appear here. Cost is per 1,000 decisions. Hover endpoint, cost and API labels for their recorded details.</p>
    <details className="mt-3 text-xs" data-bh-jev14-notes>
      <summary className="cursor-pointer text-accent">All {notes.length} system notes and disclosures</summary>
      <ul className="bh-muted mt-2 space-y-1">{notes.map((row) => <li key={row.key} id={`jev14-note-${row.key}`}>† <b className="text-gray-200">{row.display}</b>: {noteOf.get(row.key)}</li>)}</ul>
      <p className="bh-muted mt-2">Rows without a † have no note beyond the shared provenance: every row was measured or re-run with its recorded recipe, and deviations are in its run manifest.</p>
    </details>
    <p className="bh-muted mt-2 text-xs">Artifact: <a className="text-accent underline" href={`/api/jevbench/${artifact.revision.slice(1)}`}>{artifact.revision} results JSON</a> · SHA-256 <code title={sha256}>{sha256.slice(0, 12)}…</code> · <a className="text-accent underline" href={`https://github.com/fstandhartinger/jevbench/releases/tag/${artifact.revision}`}>JevBench {artifact.revision} release and method</a></p>

    <section id="jev14-changes" className="bh-panel mt-10 max-w-5xl scroll-mt-6 p-5" aria-labelledby="jev14-changes-head" data-bh-jev14-changes>
      <h3 id="jev14-changes-head" className="text-lg font-semibold">What changed in v1.4</h3>
      <ul className="bh-muted mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>Fresh sealed decisions keep the benchmark moving as public items saturate. Sealed items contribute 20% of Intelligence: <code>I = 0.8 × I_v1.3 + 0.2 × I_sealed</code>, where <code>I_sealed = 100 × max(0, (acc_sealed − 0.293) / (1 − 0.293))</code>. Public and sealed scores are published only as aggregates.</li>
        <li>Calibration blends toward the sealed-inclusive result at the approved weight: <code>C = C_v1.3 + (C_v1.4 − C_v1.3) × min(1, 0.2 / 0.35)</code>.</li>
        <li>The <code>k = 1</code> generalization penalty reduces Intelligence when public accuracy exceeds sealed accuracy by more than 25 percentage points: <code>I × (1 − max(0, gap − 25) / 100)</code>. It rewards systems that generalize beyond the public half.</li>
        <li>The four axes use an equal-weight harmonic mean (<code>p = −1</code>). Intelligence below 50 keeps its quadratic penalty; Speed and Cost each have a separate Jev-class gate below 50. Speed and Cost axis calculations are unchanged from v1.3.0.</li>
        <li>The visible <b className="text-gray-200">API</b> flag discloses when an operator endpoint received held-out item text, without answers. Existing system notes preserve disclosures such as Hopper's public-half development and JevK5's public-set selection.</li>
      </ul>
    </section>
  </section>;
}
