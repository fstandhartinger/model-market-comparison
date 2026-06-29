"use client";
import { useMemo, useState } from "react";

type Gateway = {
  name: string; url: string; type: string; eu: string; eu_detail: string;
  self_host: string; open_source: string; github: string | null; hq: string;
  pricing: string; notes: string;
};

// EU capability → display badge. Ordered best→worst for sorting.
const EU_RANK: { test: (s: string) => boolean; label: string; cls: string }[] = [
  { test: (s) => s === "EU-native", label: "EU-native", cls: "bg-emerald-500/20 text-emerald-300" },
  { test: (s) => s.startsWith("EU option"), label: "EU option", cls: "bg-teal-500/20 text-teal-300" },
  { test: (s) => s.startsWith("Self-host"), label: "Self-host in EU", cls: "bg-sky-500/20 text-sky-300" },
  { test: (s) => s.startsWith("Logs"), label: "Logs only", cls: "bg-amber-500/20 text-amber-300" },
  { test: (s) => s.startsWith("EU entity"), label: "EU entity only", cls: "bg-amber-500/20 text-amber-300" },
  { test: () => true, label: "No EU", cls: "bg-gray-600/30 text-gray-400" },
];
const euBadge = (s: string) => EU_RANK.find((r) => r.test(s))!;
const euScore = (s: string) => EU_RANK.findIndex((r) => r.test(s));

const isOSS = (s: string) => !/^no/i.test(s.trim());
const isSelfHost = (s: string) => /^(yes|partial)/i.test(s.trim());

export function GatewaysView({ gateways, collectedAt, note }: { gateways: Gateway[]; collectedAt: string; note: string }) {
  const [q, setQ] = useState("");
  const [euOnly, setEuOnly] = useState(false);
  const [selfHostOnly, setSelfHostOnly] = useState(false);
  const [ossOnly, setOssOnly] = useState(false);

  const rows = useMemo(() => {
    let r = gateways.slice();
    const term = q.trim().toLowerCase();
    if (term) r = r.filter((g) => (g.name + g.type + g.hq + g.notes + g.eu_detail).toLowerCase().includes(term));
    if (euOnly) r = r.filter((g) => euScore(g.eu) <= 2); // EU-native / EU option / self-host-in-EU
    if (selfHostOnly) r = r.filter((g) => isSelfHost(g.self_host));
    if (ossOnly) r = r.filter((g) => isOSS(g.open_source));
    return r.sort((a, b) => euScore(a.eu) - euScore(b.eu) || a.name.localeCompare(b.name));
  }, [gateways, q, euOnly, selfHostOnly, ossOnly]);

  const Toggle = ({ on, set, label }: { on: boolean; set: (b: boolean) => void; label: string }) => (
    <button onClick={() => set(!on)} className={`rounded-md border px-2 py-1 text-xs ${on ? "border-accent bg-accent/15 text-accent" : "border-line text-gray-400 hover:text-gray-200"}`}>{on ? "✓ " : ""}{label}</button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gateways…"
          className="rounded-md border border-line bg-[#0c0f14] px-2 py-1 text-sm outline-none focus:border-accent" />
        <Toggle on={euOnly} set={setEuOnly} label="EU routing-capable" />
        <Toggle on={selfHostOnly} set={setSelfHostOnly} label="Self-hostable / local" />
        <Toggle on={ossOnly} set={setOssOnly} label="Open source" />
        <span className="ml-auto text-xs text-gray-500">{rows.length} of {gateways.length}</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="dtable w-full text-sm">
          <thead><tr>
            {["Gateway", "Type", "EU routing", "Self-host / local", "Open source", "HQ", "Pricing"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs text-gray-400">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((g) => {
              const b = euBadge(g.eu);
              return (
                <tr key={g.name} className="align-top">
                  <td className="px-3 py-2">
                    <a href={g.url} target="_blank" rel="noopener" className="font-medium text-accent">{g.name} ↗</a>
                    <div className="mt-0.5 max-w-[28rem] text-[11px] text-gray-500">{g.notes}</div>
                    {g.github && <a href={g.github} target="_blank" rel="noopener" className="text-[11px] text-gray-500 underline hover:text-gray-300">GitHub</a>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">{g.type}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${b.cls}`}>{b.label}</span>
                    <div className="mt-0.5 max-w-[24rem] text-[11px] text-gray-500">{g.eu_detail}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">{g.self_host}</td>
                  <td className="px-3 py-2 text-xs text-gray-300">{g.open_source}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{g.hq}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-400">{g.pricing}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">{note}</p>
      <p className="mt-1 text-[11px] text-gray-600">Collected {collectedAt}. EU rank: EU-native (inference in-EU by design) › EU option (EU endpoint/region, often enterprise) › Self-host in EU (OSS, run it yourself) › Logs only › No.</p>
    </div>
  );
}
