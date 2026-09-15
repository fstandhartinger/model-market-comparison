import { InfoTip } from "./InfoTip";
import { contextTokens, seconds } from "../lib/format";

// P2-GAP-01: output speed, time to first token and context window, the three facts Artificial
// Analysis leads with next to price. Values come from the dataset only; null means not measured.
export type SpeedFacts = { outputTps?: number | null; ttftS?: number | null; contextTokens?: number | null };

const hasAny = (f: SpeedFacts) => f.outputTps != null || f.ttftS != null || f.contextTokens != null;
const tps = (v: number | null | undefined) => (v == null ? "—" : `${v < 10 ? v.toFixed(1) : Math.round(v)}`);

function SpeedNote({ date }: { date?: string | null }) {
  return (
    <InfoTip title="Speed and context" label="speed and context">
      Output speed (tokens per second) and time to first token are Artificial Analysis&apos; median
      measurements{date ? `, read ${date}` : ""}. A reasoning setting thinks before it answers, so its
      first token can take much longer. The context window comes from Artificial Analysis&apos; model
      metadata. A dash means not measured.
    </InfoTip>
  );
}

/** One muted line under a model title. Renders nothing when no fact is known. */
export function SpeedLine({ facts, date }: { facts: SpeedFacts; date?: string | null }) {
  if (!hasAny(facts)) return null;
  const item = (label: string, value: string, unit: string) => (
    <span className="whitespace-nowrap">{label} <b className="font-semibold tabular text-gray-200">{value}</b>{unit}</span>
  );
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400" aria-label="Speed and context">
      {facts.outputTps != null && item("Output", tps(facts.outputTps), " tokens/s")}
      {facts.ttftS != null && item("First token", seconds(facts.ttftS), "")}
      {facts.contextTokens != null && item("Context", contextTokens(facts.contextTokens), " tokens")}
      <SpeedNote date={date} />
    </p>
  );
}

/** Compare: one row per selected model. Renders nothing when no selected model has a fact. */
export function SpeedTable({ rows, date }: { rows: { id: string; name: string; color: string; facts: SpeedFacts }[]; date?: string | null }) {
  if (!rows.some((r) => hasAny(r.facts))) return null;
  return (
    <section className="bh-panel p-4 sm:p-5" aria-label="Speed and context">
      <div className="flex items-center gap-1"><h2 className="text-lg font-semibold">Speed and context</h2><SpeedNote date={date} /></div>
      <div className="bh-table-wrap mt-3 overflow-x-auto">
        <table className="bh-table w-full text-sm">
          <caption className="sr-only">Output speed, time to first token and context window of the selected models</caption>
          <thead><tr>
            <th scope="col" className="text-left">Model</th>
            <th scope="col" className="text-right">Tokens/s</th>
            <th scope="col" className="text-right">First token</th>
            <th scope="col" className="text-right">Context</th>
          </tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td className="min-w-0"><span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: r.color }} />{r.name}</td>
              <td className="text-right tabular">{tps(r.facts.outputTps)}</td>
              <td className="whitespace-nowrap text-right tabular">{seconds(r.facts.ttftS)}</td>
              <td className="text-right tabular">{contextTokens(r.facts.contextTokens)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
