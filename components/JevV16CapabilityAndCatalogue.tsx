"use client";
import { useEffect, useId, useMemo, useState } from "react";
import type { V16RegistryProjection, V16ProjectedRow, V16PriceBar } from "../lib/jevbench-registry-v16.mjs";
import { v16CapView, v16TrafficZone, v16MeasuredLabel, type V16CapItem } from "../lib/jevbench-presentation-v16.mjs";
import { parseCaps, serialiseCaps, formatCap, clampCap } from "../lib/jevbench-class-caps.mjs";
const value = (n: number | null | undefined, suffix = "") => n == null ? "Unavailable" : `${n.toFixed(3)}${suffix}`;
const width = (ratio: number) => Math.max(0, Math.min(100, Math.log2(Math.max(.25, ratio) / .25) / 8 * 100));
function Traffic({ ratio, cap, label }: { ratio: number | null; cap: number; label: string }) {
  const zone = v16TrafficZone(ratio, cap);
  return <span className="mt-1 block text-xs" data-bh-jev16-traffic={zone}>
    <span className="bh-muted">{label}: {ratio === null ? "unavailable" : `${ratio.toFixed(2)}× reference · ${zone}`}</span>
    <span role="img" aria-label={`${label}: ${ratio === null ? "unavailable" : `${ratio.toFixed(2)} times reference; ${zone}`}`} className="relative mt-0.5 block h-1 rounded bg-surface">
      {ratio !== null && <span className={`bh-tl-${zone} absolute inset-y-0 left-0 rounded`} style={{ width: `${width(ratio)}%` }} />}
    </span>
  </span>;
}
const roles: Record<V16PriceBar["role"], string> = { served_cost: "Served cost used for ranking", developer_api_list: "Developer API list-price scenario", base_model_reference: "Base-model price reference" };
const priceLabel = (bar: V16PriceBar) => bar.role === "served_cost" && !bar.ranking_eligible ? "Served cost (not admitted for ranking)" : roles[bar.role];
function PriceBars({ row, reference }: { row: V16ProjectedRow; reference: number }) {
  return <div data-bh-jev16-price-bars={row.key}>{row.cost.bars.length ? row.cost.bars.map(bar => <div key={bar.role} className="mt-1 text-xs" data-bh-jev16-price-role={bar.role}>
    <span>{priceLabel(bar)}: {value(bar.usd_per_1000, " USD / 1,000")} · {bar.kind}</span>
    <span className="bh-muted block">{bar.basis}{bar.role !== "served_cost" ? " · disclosure only; no alternative score or hosted latency measured here" : ""}</span>
    {bar.usd_per_1000 !== null && <span className="relative mt-1 block h-1.5 rounded bg-surface" role="img" aria-label={`${priceLabel(bar)}: ${bar.usd_per_1000} USD per 1,000 decisions; ${bar.basis}`}>
      <span data-bh-jev16-price-striped={bar.role === "base_model_reference" ? "true" : undefined} className="absolute inset-y-0 left-0 rounded bg-accent" style={{ width: `${width(bar.usd_per_1000 / reference)}%`, ...(bar.role === "base_model_reference" ? { backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,.6) 3px, rgba(255,255,255,.6) 5px)" } : {}) }} />
    </span>}
  </div>) : <span className="bh-muted text-xs">Current price unavailable</span>}</div>;
}
function CapabilityRow({ item, rank, costCap, latencyCap }: { item: V16CapItem; rank?: number; costCap: number; latencyCap: number }) {
  return <li className="border-t border-line py-2" data-bh-jev16-cap-row={item.row.key}>
    <div className="flex justify-between gap-4"><b>{rank ? `${rank}. ` : ""}{item.row.display}</b><span className="tabular">{value(item.row.capability)}</span></div>
    {item.row.capability !== null && <span className="mt-1 block h-2 rounded bg-surface"><span className="block h-full rounded bg-accent" style={{ width: `${Math.max(0, Math.min(100,item.row.capability))}%` }} /></span>}
    <Traffic ratio={item.costRatio} cap={costCap} label="Cost" /><Traffic ratio={item.latencyRatio} cap={latencyCap} label="Measured median latency" />
    {!item.eligible && <p className="bh-muted text-xs">{item.reasons.join(" ")}</p>}
  </li>;
}
/** Prepared presentation slice only; NO route/loader imports it yet.
 * Parent supplies its hash-authenticated final public projection. It does not
 * replace the still-required charts/comparison/method/revision sections. */
export function JevV16CapabilityAndCatalogue({ projection }: { projection: V16RegistryProjection }) {
  const [caps,setCaps] = useState({ costFactor: 2, latencyFactor: 2 });
  const [search,setSearch] = useState(""); const [lane,setLane] = useState("all"); const id=useId();
  useEffect(() => { const read=() => setCaps(parseCaps(new URLSearchParams(window.location.search))); read(); window.addEventListener("popstate",read); return () => window.removeEventListener("popstate",read); },[]);
  const view=useMemo(() => v16CapView(projection,caps),[projection,caps]);
  const update = (next: typeof caps) => { setCaps(next); const url=new URL(window.location.href); url.search=serialiseCaps(url.searchParams,next).toString(); window.history.replaceState(window.history.state,"",url); };
  const visible = (row: V16ProjectedRow) => (lane === "all" || row.registration?.lane === lane) && `${row.key} ${row.display}`.toLowerCase().includes(search.toLowerCase());
  const eligible=view.eligible.filter(item => visible(item.row)),outside=view.outside.filter(item => visible(item.row));
  const compositeRanks=new Map(projection.composite_order.map((key,i) => [key,i+1]));
  return <>
    <section id="jev16-capability" data-bh-jev16-capability-ranking>
      <h2 className="text-2xl font-bold">JevBench Capability Score</h2>
      <p className="bh-muted text-sm">Mean of Intelligence and Calibration; admitted cost and measured adjusted median inside the frozen Jev 1.13.0 envelope.</p>
      <p role="status" className="mt-2 text-sm">{view.official ? "Official 2× caps" : "Custom caps — not the official ranking"}</p>
      <div className="mt-3 grid max-w-xl grid-cols-2 gap-4">{([["costFactor","Max cost"],["latencyFactor","Max median latency"]] as const).map(([axis,label]) => <label htmlFor={`${id}-${axis}`} key={axis} className="text-sm">{label}: {formatCap(caps[axis])}
        <input id={`${id}-${axis}`} type="range" min="1" max="10.1" step="0.1" value={caps[axis]===Infinity ? 10.1 : caps[axis]} aria-valuetext={formatCap(caps[axis])} className="mt-1 block w-full" onChange={event => update({ ...caps,[axis]:Number(event.target.value)>10 ? Infinity : clampCap(Number(event.target.value)) })} />
      </label>)}</div>
      <button type="button" className="mt-2 text-accent underline" disabled={view.official} onClick={() => update({costFactor:2,latencyFactor:2})}>Reset to official caps</button>
      <div className="mt-4 flex flex-wrap gap-3"><label className="text-sm">Find a system <input value={search} onChange={event => setSearch(event.target.value)} className="ml-2 rounded border border-line bg-surface p-1" /></label>
        <label className="text-sm">Serving <select value={lane} onChange={event => setLane(event.target.value)} className="ml-2 rounded border border-line bg-surface p-1"><option value="all">All</option><option value="selfhosted">Self-hosted</option><option value="api">API</option></select></label></div>
      <ol className="mt-4">{eligible.map((item,i) => <CapabilityRow key={item.row.key} item={item} rank={view.eligible.findIndex(other => other.row.key === item.row.key)+1} costCap={caps.costFactor} latencyCap={caps.latencyFactor} />)}</ol>
      {!eligible.length && <p className="bh-muted mt-3">No complete admitted systems qualify in this view.</p>}
      <details className="mt-3"><summary className="cursor-pointer">Outside selected limits or unranked · {outside.length}</summary><ul>{outside.map(item => <CapabilityRow key={item.row.key} item={item} costCap={caps.costFactor} latencyCap={caps.latencyFactor} />)}</ul></details>
      <p className="bh-muted mt-2 text-xs">Green ≤ reference, amber ≤ selected cap, red beyond. Turning a cap off still requires admitted cost and an actual measured median. Search and serving filters do not change the frozen reference. Custom caps do not alter official Composite order.</p>
    </section>
    <section className="mt-8" data-bh-jev16-full-catalogue><h2 className="text-xl font-semibold">Full catalogue · {projection.catalogue_count} systems</h2>
      <p className="bh-muted mt-1 text-sm">Unmeasured and unranked systems stay listed. Historical cost estimates retain their original method/date disclosure and are not current measured prices.</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">JevBench v1.6.0 catalogue, measurement dates, cost and serving provenance</caption>
        <thead><tr>{["System / status","Official Composite","Capability","Measurement","Serving / median","Cost / scenarios","Historical estimate"].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{view.rows.filter(item => visible(item.row)).map(({row,median}) => <tr key={row.key} className="border-t border-line" data-bh-jev16-catalogue-row={row.key}>
          <th scope="row" className="p-2 font-normal"><b>{row.display}</b><span className="bh-muted block">{row.key} · {row.status}{row.ranked ? "" : " · unranked"}</span></th>
          <td className="p-2 tabular">{row.ranked ? `#${compositeRanks.get(row.key) ?? "?"} · ${value(row.composite)}` : "Unranked"}</td><td className="p-2 tabular">{value(row.capability)}</td>
          <td className="p-2">{v16MeasuredLabel(row)}{row.measurement && <span className="bh-muted block text-xs">{row.measurement.model_version} · {row.measurement.model_pin}</span>}</td>
          <td className="p-2">{row.measurement?.serving.lane ?? row.registration?.lane ?? "Serving unknown"}<span className="bh-muted block">{value(median," s median")}</span><span className="bh-muted block text-xs">{row.measurement?.serving.endpoint_condition}</span></td>
          <td className="p-2"><PriceBars row={row} reference={view.reference.usd_per_1000} /></td>
          <td className="p-2">{value(row.historical_price?.usd_per_1000," USD / 1,000")}<span className="bh-muted block text-xs">{row.historical_price?.basis ?? "No historical price provenance"}</span></td>
        </tr>)}</tbody></table></div>
    </section>
  </>;
}
