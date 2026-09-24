"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IO_PROXY_TEXT, type PriceResult, type PriceSource } from "../lib/cost";
import { AaCredit } from "./AaCredit";

export function priceNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "$0";
  // Modeled estimate: three significant figures are all the inputs support (F-49).
  return `$${value < 1 ? Number(value.toPrecision(3)).toString() : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** CR-63.11: chart cost-axis ticks — whole dollars from $1, two decimals below ($0.30, $0.03), one significant figure under a cent. */
export function costTick(value: number): string {
  if (value >= 1) return `$${Math.round(value).toLocaleString("en-US")}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${Number(value.toPrecision(1))}`;
}

const tokens = (n: number) => Math.round(n).toLocaleString("en-US");
const percent = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`;

function SourceLine({ source }: { source: PriceSource }) {
  if (source.proxy) {
    return <li><span className="text-gray-400">{source.label}: </span>{IO_PROXY_TEXT}{" "}
      {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-accent underline" aria-label="[link] to the inference provider's public LLM usage statistics">[link]</a> : "[link]"}
      {source.date && <span className="text-gray-400"> · {source.date.slice(0, 10)}</span>}</li>;
  }
  return <li><span className="text-gray-400">{source.label}: </span>
    {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-accent underline">{source.source}</a> : source.source}
    {source.date && <span className="text-gray-400"> · {source.date.slice(0, 24).replace(/T.*?(?= to |$)/g, "")}</span>}
    {source.note && <span className="text-gray-500"> · {source.note}</span>}</li>;
}

/** Native modal: usable from keyboard/touch, outside table/chart overflow, with
 * Escape dismissal and browser-managed focus return. Contents mount on demand.
 * `context` (overview table): the price is the cheapest route inside the active filters, for the
 * model's representative variant (`strongest`) or for exactly the variant shown. */
export function PriceValue({ price, compact = false, showEstimate = true, context }: { price: PriceResult; compact?: boolean; showEstimate?: boolean; context?: { cheapest: boolean; strongest: boolean } }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const e = price.effective;
  const assumedTask = !!price.assumedTask;
  const cache = price.cache;
  return <>
    <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(true); }}
      data-task-assumed={assumedTask || undefined} aria-haspopup="dialog" aria-label={`${priceNumber(price.value)} ${price.unit}: show how this cost is estimated for ${price.model || "model"}, ${price.provider || "reference"}`}
      title="Show how this cost is estimated"
      className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-1 rounded text-right tabular underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
      <span>{priceNumber(price.value)}</span>{!compact && <span className="text-[10px] font-normal text-gray-400">{price.unit === "$/task" ? "/task" : "/1M"}</span>}
      {price.assumptions.length > 0 && (assumedTask || showEstimate) && <span className="text-[10px] font-normal text-amber-300">{assumedTask ? "assumed task" : "est."}</span>}
    </button>
    {open && createPortal(<dialog ref={dialog} onClose={() => setOpen(false)} onClick={(event) => event.stopPropagation()}
      aria-labelledby="bh-cost-title"
      className="m-auto max-h-[85vh] w-[min(600px,92vw)] overflow-y-auto rounded-xl border border-line bg-[#161b22] p-5 text-left text-sm text-gray-200 shadow-xl backdrop:bg-black/70">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h2 id="bh-cost-title" className="font-semibold">{price.label}: {priceNumber(price.value)}</h2><p className="text-xs text-gray-400">{price.model} · {price.provider}</p></div>
        <button autoFocus type="button" className="rounded border border-line px-3 py-1 focus-visible:outline focus-visible:outline-accent" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      {e ? <>
        <p className="leading-relaxed">This is a modeled cost for a benchmark-sized workload; it is not a typical end-user task price. It combines:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed" data-testid="cost-explanation">
          <li>{assumedTask
            ? <>Artificial Analysis publishes no Intelligence Index task-token measurement for this model, so this scenario uses {tokens(e.inputs.output_tokens_per_task ?? 0)} output tokens.</>
            : <>Output tokens on an Artificial Analysis Intelligence Index task for this exact configuration: {tokens(e.inputs.output_tokens_per_task ?? 0)}, modeled with about {tokens(e.inputs.input_tokens_per_task)} input tokens. This benchmark task length is not a typical user task. <AaCredit /></>}</li>
          {price.priceCondition && <li>Price condition: {price.priceCondition}{price.conditionCheckedAt ? ` · checked ${price.conditionCheckedAt} (UTC)` : ""}. The prices below are the rates used in this estimate.</li>}
          <li>{cache?.kind === "observed"
            ? <>Cache-efficiency data from OpenRouter: {percent(cache.rate)} of input tokens are read from cache on this route.</>
            : cache?.kind === "baseline"
            ? <>Cache efficiency: this route has no measurement of its own, so the typical rate across OpenRouter routes that bill cache reads, {percent(cache.rate)} of input tokens read from cache, is used.</>
            : <>Cache efficiency: no cache data is available, so no cache discount is counted.</>}
            {cache && cache.kind !== "none" && !cache.discounted && <> This provider publishes no cheaper cache-read price, so caching does not lower this cost.</>}
            {e.terms && e.terms.cache_write > 0 && <> This route charges more to write to the cache ({priceNumber(e.inputs.cache_write_per_1m)} per 1M) than for plain input, so the input not read from cache is assumed to be written once at that price — an upper bound.</>}</li>
          {context?.cheapest !== false && <li>{context?.cheapest ? "The cheapest provider that survives your current filters" : "Provider"}: {price.provider}.</li>}
          {context && <li>{context.strongest ? "The strongest reasoning variant of the model present in benchmark data" : "The exact model variant shown"}: {price.model}.</li>}
        </ul>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line/60 pt-3 text-xs tabular">
          <dt className="text-gray-400">Input / output price per 1M tokens</dt><dd>{priceNumber(e.inputs.input_per_1m)} / {priceNumber(e.inputs.output_per_1m)}</dd>
          <dt className="text-gray-400">Cache-read price per 1M tokens</dt><dd>{priceNumber(e.inputs.cache_read_per_1m)}</dd>
          {e.terms && e.terms.cache_write > 0 && <><dt className="text-gray-400">Cache-write price per 1M tokens</dt><dd>{priceNumber(e.inputs.cache_write_per_1m)}</dd></>}
          <dt className="text-gray-400">Input : output ratio</dt><dd>{e.inputs.input_output_ratio == null ? "—" : `${e.inputs.input_output_ratio.toFixed(1)} : 1`}</dd>
          {e.terms && <><dt className="text-gray-400">Cost split</dt><dd>input {priceNumber(e.terms.uncached_input)} + cached {priceNumber(e.terms.cached_input)}{e.terms.cache_write > 0 && <> + cache-write surcharge {priceNumber(e.terms.cache_write)}</>} + output {priceNumber(e.terms.output)}</dd></>}
        </dl>
      </> : <div className="space-y-2 leading-relaxed"><p>This is the provider&apos;s published list price per million tokens, blended at the input : output mix chosen in your settings. It does not use task or cache data.</p>
        {price.conditionalRates?.length ? <p>Conditional rates published for this exact route: {price.conditionalRates.join("; ")}. The raw blend uses the base rate because it has no modeled prompt length or request time.</p> : null}</div>}
      <h3 className="mt-4 font-semibold">Sources</h3>
      <ul className="mt-1 space-y-1 text-xs" data-testid="cost-sources">{price.sources.map((source, i) => <SourceLine key={i} source={source} />)}</ul>
    </dialog>, document.body)}
  </>;
}

/** R1.5: the long modelling paragraph that used to sit above the table is gone — the
 *  column now explains itself through its (i), and the full derivation lives on /about
 *  (R1.6). What stays here is only the one thing a reader needs at the table: every
 *  price is clickable and shows how it is estimated, with its sources. */
export function PriceAssumptions({ inline = false }: { inline?: boolean }) {
  const text = <>
    Click any underlined price to see how it is estimated and where each input comes from.{" "}
    <a href="/about#adjusted-cost" className="text-accent underline underline-offset-2">How we calculate adjusted cost</a>.
  </>;
  // `inline` renders a <span> so the note can sit inside a single footnote paragraph
  // (a <p> nested in a <p> is invalid HTML).
  if (inline) return <span data-testid="price-assumptions">{text}</span>;
  return <p className="my-2 max-w-4xl text-xs leading-relaxed text-gray-500" data-testid="price-assumptions">{text}</p>;
}
