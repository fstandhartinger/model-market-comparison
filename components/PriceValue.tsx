"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PriceResult } from "../lib/cost";

export function priceNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "$0";
  return `$${value < 0.0001 ? value.toPrecision(3) : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 5 : 3 })}`;
}

/** Native modal: usable from keyboard/touch, outside table/chart overflow, with
 * Escape dismissal and browser-managed focus return. Contents mount on demand. */
export function PriceValue({ price, compact = false }: { price: PriceResult; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const e = price.effective;
  const assumedTask = !!e?.assumptions.some((note) => note.startsWith("AA tokens/task missing"));
  return <>
    <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(true); }}
      data-task-assumed={assumedTask || undefined} aria-haspopup="dialog" aria-label={`${priceNumber(price.value)} ${price.unit}: show cost inputs for ${price.model || "model"}, ${price.provider || "reference"}`}
      title="Show cost inputs, sources and assumptions"
      className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-1 rounded text-right tabular underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
      <span>{priceNumber(price.value)}</span>{!compact && <span className="text-[10px] font-normal text-gray-400">{price.unit === "$/task" ? "/task" : "/1M"}</span>}
      {price.assumptions.length > 0 && <span className="text-[10px] font-normal text-amber-300">{assumedTask ? "assumed task" : "est."}</span>}
    </button>
    {open && createPortal(<dialog ref={dialog} onClose={() => setOpen(false)} onClick={(event) => event.stopPropagation()}
      aria-label="Cost inputs and assumptions"
      className="m-auto max-h-[85vh] w-[min(620px,92vw)] overflow-y-auto rounded-xl border border-line bg-[#161b22] p-5 text-left text-sm text-gray-200 shadow-xl backdrop:bg-black/70">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h2 className="font-semibold">{price.label}: {priceNumber(price.value)}</h2><p className="text-xs text-gray-400">{price.model} · {price.provider}</p></div>
        <button autoFocus type="button" className="rounded border border-line px-3 py-1 focus-visible:outline focus-visible:outline-accent" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      {e && <>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular">
          <dt>Input tokens/task (derived)</dt><dd>{e.inputs.input_tokens_per_task.toLocaleString("en-US", { maximumFractionDigits: 2 })}</dd>
          <dt>Output tokens/task</dt><dd>{e.inputs.output_tokens_per_task?.toLocaleString("en-US", { maximumFractionDigits: 2 })}</dd>
          <dt>Input:output ratio</dt><dd>{e.inputs.input_output_ratio?.toFixed(3)}:1</dd>
          <dt>Cache-hit rate applied to input</dt><dd>{((e.inputs.cache_hit_rate ?? 0) * 100).toFixed(2)}%</dd>
          <dt>Additional cache-write tokens</dt><dd>{e.inputs.cache_write_tokens}</dd>
          <dt>Input / output list $/1M</dt><dd>{priceNumber(e.inputs.input_per_1m)} / {priceNumber(e.inputs.output_per_1m)}</dd>
          <dt>Cache read / write $/1M</dt><dd>{priceNumber(e.inputs.cache_read_per_1m)} / {priceNumber(e.inputs.cache_write_per_1m)}</dd>
          <dt>Equivalent $/1M workload tokens</dt><dd>{priceNumber(e.effective_cost_per_1m_tokens)}</dd>
        </dl>
        <p className="mt-3 text-xs text-gray-300">USD/task = [input × (1 − hit) × input price + input × hit × cache-read price + additional writes × write price + output × output price] ÷ 1,000,000.</p>
        {e.terms && <p className="mt-2 text-xs tabular">Terms (USD): uncached {priceNumber(e.terms.uncached_input)} + cached {priceNumber(e.terms.cached_input)} + writes {priceNumber(e.terms.cache_write)} + output {priceNumber(e.terms.output)}.</p>}
        <p className="mt-2 text-xs text-gray-400">The equivalent divides cost by this model’s own input + output tokens; rankings use $/task so output verbosity still counts.</p>
      </>}
      {price.assumptions.length > 0 && <><h3 className="mt-4 font-semibold text-amber-300">Assumptions and limitations</h3><ul className="mt-1 list-disc space-y-1 pl-4 text-xs">{price.assumptions.map((note, i) => <li key={i}>{note}</li>)}</ul></>}
      <h3 className="mt-4 font-semibold">Source inputs</h3>
      <ul className="mt-1 space-y-2 text-xs">{price.sources.map((source, i) => <li key={i}>
        <b>{source.label}: </b>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-accent underline">{source.source}</a> : source.source}
        {source.date && <> · {source.date}</>}{source.basis && <> · {source.basis}</>}
        {source.note && <p className="text-gray-400">{source.note}</p>}
      </li>)}</ul>
    </dialog>, document.body)}
  </>;
}

export function PriceAssumptions() {
  return <p className="my-2 max-w-4xl text-xs leading-relaxed text-gray-400" data-testid="price-assumptions">
    Adjusted costs are modeled USD per task: AA output tokens × OpenRouter usage I/O (Chutes global fallback).
    These are general usage and benchmark proxies for coding-agent work. Missing AA data assumes 1,000 output tokens/task;
    unknown cache hit assumes 0%; unmeasured additional cache writes assume 0 tokens. Click any underlined price for exact inputs,
    dates and assumptions. Raw list prices use the selected fixed input/output blend, in USD per million tokens.
  </p>;
}
