import artifact from "../../data/raw/benchmarks/jevbench/v1/jevbench-v1-results.json";
import availability from "../../data/raw/benchmarks/jevbench/v1/availability.json";
import { jevbenchView, JEVBENCH_HARNESS, JEVBENCH_HARNESS_COMMIT, JEVBENCH_SHA256 } from "../../lib/jevbench.mjs";
import { previewMetadata } from "../../lib/seo";
import { JevTable } from "../../components/jevbench/JevTable";
import { JevScatter } from "../../components/jevbench/JevScatter";
import { JevCalibration } from "../../components/jevbench/JevCalibration";
import { cohortLabel, dec3, pct, secs, usd } from "../../components/jevbench/format";
import type { JevRow, JevView } from "../../components/jevbench/types";

// CR-84 (Florian, 18 Sep 2026: "we need a Jev benchmark - to see which of the Jevs is actually good => smart + cheap
// + fast + reliable + ideally open"). Every number below comes from the committed artifact through lib/jevbench.mjs.
export const metadata = previewMetadata({ path: "/jev-models", documentTitle: "Jev-class decision models — JevBench v1",
  title: "Jev-class models — JevBench v1 — Benchmark Heaven",
  description: "Our own benchmark: typed decision models compared on accuracy, cost, latency, reliability and openness over 242 decisions. No combined winner." });

const view = jevbenchView(artifact) as unknown as JevView;

function findings(v: JevView) {
  const r = v.ranked;
  const by = (f: (x: JevRow) => number | null, low = false) => [...r].filter((x) => f(x) != null).sort((a, b) => (low ? f(a)! - f(b)! : f(b)! - f(a)!));
  const [top, second] = by((x) => x.accuracy);
  const cheapest = by((x) => x.cost, true)[0];
  // Medians within 5% of the fastest are a tie at this sample size; name them together.
  const fast = by((x) => x.p50, true), fastest = fast.filter((x) => x.p50! <= fast[0].p50! * 1.05);
  const calib = by((x) => x.ece, true)[0];
  const rebuild = by((x) => (x.cls === "jev-rebuild" ? x.accuracy : null))[0];
  const renorm = [...r, ...v.partial].filter((x) => x.renormalized > 0);
  const overlap = top && second && second.ciHi! >= top.ciLo!;
  return [
    top && <><b>Top accuracy is close.</b> {top.short} {pct(top.accuracy)}, {second.short} {pct(second.accuracy)}{overlap ? "; their 95% intervals overlap — read the first rows as a group, not a podium." : "."}</>,
    rebuild && <><b>Best open rebuild:</b> {rebuild.short} at {pct(rebuild.accuracy)}.</>,
    cheapest && <><b>Cheapest metered route:</b> {cheapest.short} at {usd(cheapest.cost)} per 1,000 decisions. <b>Fastest median:</b> {fastest.length > 1 ? <>{fastest.map((x) => x.short).join(", ")}, within 5% of each other at {secs(fastest[0].p50)}–{secs(fastest[fastest.length - 1].p50)}</> : <>{fastest[0].short} at {secs(fastest[0].p50)}</>}.</>,
    calib && <><b>Best calibrated:</b> {calib.short} (ECE {dec3(calib.ece)}).{renorm.length > 0 && <> Only models that <i>write</i> their probabilities needed renormalizing ({renorm.map((x) => `${x.short} ${x.renormalized}`).join(", ")}); a native distribution sums to 1 by construction.</>}</>,
  ].filter(Boolean);
}

const Th = ({ children, left }: { children: React.ReactNode; left?: boolean }) => <th scope="col" className={`px-3 py-2 text-xs font-normal text-gray-400 ${left ? "text-left" : "text-right"}`}>{children}</th>;

function Breakdown({ v, kind }: { v: JevView; kind: "families" | "cohorts" }) {
  const names = kind === "families" ? v.familyNames : v.cohortNames;
  const ns = kind === "families" ? v.familyN : v.cohortN;
  const rows = [...v.ranked, ...v.partial];
  const floor = v.ranked[0];
  return <div className="card overflow-x-auto"><table className="dtable w-full text-sm tabular-nums">
    <thead><tr><Th left>System</Th>{names.map((n) => <Th key={n}>{kind === "cohorts" ? cohortLabel(n) : n} ({ns[n]})</Th>)}</tr></thead>
    <tbody>
      {rows.map((r) => <tr key={r.key}><td className="px-3 py-1.5">{r.short}{!r.complete && <span className="text-xs text-gray-500"> · stopped early</span>}</td>{names.map((n) => <td key={n} className="px-3 py-1.5 text-right">{pct(r[kind][n]?.accuracy)}</td>)}</tr>)}
      <tr><td className="px-3 py-1.5 text-xs italic text-gray-400">always the commonest label</td>{names.map((n) => <td key={n} className="px-3 py-1.5 text-right text-xs italic text-gray-400">{pct(floor[kind][n]?.majority)}</td>)}</tr>
    </tbody></table></div>;
}

export default function JevModelsPage() {
  const v = view;
  const split = (name: string) => v.splits.find((s) => s.name === name)?.n ?? 0;
  const rep = v.repeatability;
  return <div className="max-w-6xl">
    <header className="bh-page-head">
      <p className="bh-eyebrow">Our own benchmark · JevBench v1</p>
      <h1 className="text-3xl font-bold tracking-tight">Jev-class models</h1>
      <p className="bh-muted mt-3 max-w-3xl">Typed decisions compared on accuracy, cost, latency, reliability and openness. <b className="text-gray-200">JevBench v1 is our own benchmark</b>, built and run by Benchmark Heaven; these results describe the tested configurations and tasks, not every application or a vendor-wide ranking.</p>
      <p className="mt-2 text-xs text-gray-500" data-bh-jev-meta>Measured {v.measuredOn} · protocol jevbench::v1{v.pilot ? " (pilot)" : ""} · {v.nDecisions} decisions per system: {split("original")} published, {split("heldout")} held-out, {split("router") + split("judge")} imported · one request at a time from a {v.hardware.origin.replace("Sandy ", "")} in Germany · <a className="text-accent underline" href={JEVBENCH_HARNESS} target="_blank" rel="noopener">harness (MIT)</a> · <a className="text-accent underline" href="/api/jevbench">results JSON</a></p>
    </header>

    <JevTable view={v} />

    <ul className="mt-5 max-w-4xl space-y-1.5 text-sm text-gray-300" data-bh-jev-findings>{findings(v).map((f, i) => <li key={i}>• {f}</li>)}</ul>

    <div className="mt-8 grid gap-5 lg:grid-cols-[3fr_2fr]">
      <section className="card min-w-0 p-4"><h2 className="font-semibold">Accuracy against cost</h2><p className="mb-3 text-xs text-gray-400">Up is smarter, left is cheaper. Complete runs only.</p><JevScatter rows={v.ranked} partial={v.partial} /></section>
      <section className="card min-w-0 p-4"><h2 className="font-semibold">Calibration</h2><p className="mb-3 text-xs text-gray-400">Does a stated probability match how often the answer is right?</p><JevCalibration view={v} /></section>
    </div>

    <h2 className="mt-8 mb-2 text-lg font-semibold">By family</h2>
    <Breakdown v={v} kind="families" />
    <h2 className="mt-6 mb-2 text-lg font-semibold">By cohort</h2>
    <p className="mb-2 max-w-3xl text-sm text-gray-400">{v.cohorts["original-public"]}; {v.cohorts["heldout-private"]}; {v.cohorts["imported-public-source"]}.</p>
    <Breakdown v={v} kind="cohorts" />

    <h2 className="mt-8 mb-2 text-lg font-semibold">Not measured, and why</h2>
    <p className="mb-3 max-w-3xl text-sm text-gray-400">An exclusion is a fact about our access and hardware (a CPU server, no GPU), never a verdict on the project.</p>
    <ul className="max-w-4xl space-y-2 text-sm" data-bh-jev-unavailable>
      {v.tooShort.map((r) => <li key={r.key}><b>{r.display}</b> <span className="text-gray-500">({r.author})</span> — answered {r.nAttempted} of {r.nPlanned} decisions before it stopped ({r.stopReason?.split(" - ")[0]}); a handful of answers is not a measurement.</li>)}
      {availability.not_measured.filter((a) => !v.tooShort.some((r) => r.short === a.name)).map((a, i) => <li key={i}><b>{a.name}</b> <span className="text-gray-500">({a.author})</span> — <span className="text-gray-400">{a.reason}</span></li>)}
    </ul>

    <details className="bh-panel mt-8 p-5" id="method"><summary className="cursor-pointer text-sm font-semibold">Method</summary><div className="bh-muted mt-3 max-w-4xl space-y-3 text-sm">
      <p>Every system sees the same state, instructions, rubric and exact label set; only the transport differs. Native adapters read the model&apos;s own probability distribution in a single pass. Instruction models are asked to <i>write</i> a distribution under a JSON schema. The two are labelled <b>native</b> and <b>verbalized</b> everywhere and never pooled into one calibration claim; token log-probabilities are not used.</p>
      <p>Requests go out one at a time from a server in Germany, with no retries and no concurrency, so latency includes the network. The first request to each system is reported apart, because a scale-to-zero endpoint bills its cold start to whoever knocks first.</p>
      <p>Accuracy is argmax over the exact label set; a failed or invalid answer counts as wrong. Intervals resample whole scenarios, because a rephrasing pair is one scenario asked twice. Brier is the multi-class sum over the label set; ECE is top-label confidence in ten equal-width bins, empty bins absent rather than zero.</p>
      <p>Price is each provider&apos;s published tariff, read on {v.measuredOn}, times the token usage it reported — derived, not an invoice. A route with no billable account (a public demo, our own CPU, a flat-rate subscription) has no price, and the page says so instead of printing $0.</p>
      <p>One protocol change, stated openly: v1 froze a 0.001 tolerance on &ldquo;probabilities sum to 1&rdquo;. Models that write three decimals land on 0.999 for a nine-option question, so the headline renormalizes any distribution within 2% of 1, uniformly for every system; the exact-sum rate is in each row&apos;s details. Outside the 2% band an answer is still invalid and still wrong.</p>
      <p><b>How much of a gap is noise?</b> {rep.system.replace("jev-", "Jev ")} answered the same {rep.n_compared} decisions twice; {rep.n_different_prediction} answers changed ({pct(rep.disagreement_rate)}, all in {rep.families_of_differences.join(", ")}) and accuracy moved from {pct(rep.accuracy_run_1)} to {pct(rep.accuracy_run_2)}. Read a one-point gap between two rows as noise and use the intervals.</p>
      <p>The {split("heldout")} held-out decisions stay private, and the public artifact holds aggregates only — no item text, label or per-decision answer. Held-out items are still sent to the services under test to get their answers: not public is not the same as not seen, and this is not a contamination proof.</p>
    </div></details>

    <details className="bh-panel mt-3 p-5" id="limits"><summary className="cursor-pointer text-sm font-semibold">Limits</summary><ul className="bh-muted mt-3 max-w-4xl list-disc space-y-1.5 pl-5 text-sm">
      <li>{v.nDecisions} decisions is a pilot, not a census, and it is English-only, written or collected by the benchmark&apos;s own authors.</li>
      <li>The answer-adequacy family is mostly &ldquo;yes&rdquo;: answering &ldquo;yes&rdquo; every time scores {pct(v.ranked[0].families.adequacy?.majority)}, so read that family against its floor (shown in the family table).</li>
      <li>Two instruction-model baselines judge some of their own earlier answers in the imported cohort, because the saved answers came from four models and two of them are measured here.</li>
      <li>Latency is one origin at one time of day. A hosted endpoint and a local CPU are different kinds of latency; public demo endpoints are shared with everyone else using them.</li>
      <li>Some rebuilds see only part of a long request (a 256-token encoder window cuts the state); the row details say how often.</li>
      <li>Older reused protocols (for example our earlier Needle 3 head-to-head) are a different identity and are not ranked here. New entrants become v1.1 rather than silently changing v1.</li>
    </ul></details>

    <section className="mt-8 max-w-4xl text-sm text-gray-400">
      <h2 className="mb-2 text-lg font-semibold text-gray-100">Credit</h2>
      <p>Every open rebuild here is someone&apos;s project published for free, several running on their author&apos;s own money. Authors: if we tested the wrong configuration, tell us and we will rerun it.</p>
      <ul className="mt-2 space-y-1">{[...v.ranked, ...v.partial, ...v.tooShort].filter((r) => r.repo).map((r) => <li key={r.key}><b className="text-gray-300">{r.display}</b> — {r.author}, {r.licence} — <a className="text-accent underline" href={r.repo!} target="_blank" rel="noopener">{r.repo!.replace("https://", "")}</a></li>)}</ul>
      <p className="mt-3 break-all text-xs text-gray-500" data-bh-jev-provenance>Artifact sha256 {JEVBENCH_SHA256} · identical to results/jevbench-v1-results.json at harness commit {JEVBENCH_HARNESS_COMMIT.slice(0, 7)} · generated {v.generated.slice(0, 16).replace("T", " ")} UTC · split hashes {v.splits.map((s) => `${s.name} ${s.sha256.slice(0, 12)}`).join(", ")}</p>
    </section>
  </div>;
}
