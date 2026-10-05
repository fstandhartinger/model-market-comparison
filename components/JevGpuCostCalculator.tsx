'use client';

import { useMemo, useState } from 'react';
import { JEV_GPU_DEFAULT_SETTINGS, JEV_GPU_PRESETS, jevGpuCostRows,
  type JevGpuKey, type JevGpuMode, type JevGpuPreset, type JevGpuSettings, type JevGpuSystem,
} from '../lib/jevbench-gpu-cost.mjs';

const modes: { key: JevGpuMode; label: string }[] = [
  { key: 'own', label: 'Own hardware' }, { key: 'on_demand', label: 'On-demand cloud' },
  { key: 'reserved', label: 'Long-term / reserved' },
];
const gpuKeys = Object.keys(JEV_GPU_PRESETS) as JevGpuKey[];
const money = (value: number | null) => value === null ? '—' : `$${value.toLocaleString('en-US', { maximumSignificantDigits: 4 })}`;
const controlClass = 'w-full rounded border border-line bg-transparent px-3 py-2 text-sm tabular';

function NumberField({ label, value, onChange, min = 0, max, step = 'any' }: {
  label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: string;
}) {
  return <label className="grid gap-1 text-sm"><span className="bh-muted">{label}</span>
    <input type="number" className={controlClass} min={min} max={max} step={step}
      value={Number.isFinite(value) ? value : ''}
      onChange={(event) => onChange(event.target.value === '' ? NaN : event.target.valueAsNumber)} />
  </label>;
}

export function JevGpuCostCalculator({ systems }: { systems: JevGpuSystem[] }) {
  const [settings, setSettings] = useState<JevGpuSettings>({ ...JEV_GPU_DEFAULT_SETTINGS });
  const [editingGpu, setEditingGpu] = useState<JevGpuKey>('H100');
  const [showAll, setShowAll] = useState(false);
  const selectedGpu = settings.gpu_override === 'as_measured' ? editingGpu : settings.gpu_override;
  const preset = { ...JEV_GPU_PRESETS[selectedGpu], ...settings.preset_overrides?.[selectedGpu] };
  const rows = useMemo(() => jevGpuCostRows(systems, settings), [systems, settings]);
  const setNumber = (key: 'years' | 'usd_per_kwh' | 'utilisation' | 'pue' | 'parallel_streams', value: number) =>
    setSettings((s) => ({ ...s, [key]: value }));
  const setPreset = (key: keyof Pick<JevGpuPreset, 'purchase_usd' | 'watts' | 'on_demand_usd_h' | 'reserved_usd_h'>, value: number) =>
    setSettings((s) => ({ ...s, preset_overrides: { ...s.preset_overrides,
      [selectedGpu]: { ...s.preset_overrides?.[selectedGpu], [key]: value } } }));

  return <section id="jev-gpu-cost" data-bh-jev-gpu-cost className="bh-panel space-y-5 p-4 sm:p-6">
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">What-If: GPU cost calculator</h2>
      <p className="bh-muted text-sm">What-If only — the official Cost axis and all ranks use the method&apos;s reference prices</p>
    </div>
    <fieldset className="space-y-2">
      <legend className="bh-muted text-sm">Hosting mode</legend>
      <div className="flex flex-wrap gap-2">{modes.map((mode) => <label key={mode.key}
        className={`flex cursor-pointer items-center gap-2 rounded border border-line px-3 py-2 text-sm ${settings.mode === mode.key ? 'text-accent' : 'bh-muted'}`}>
        <input type="radio" name="jev-gpu-cost-mode" checked={settings.mode === mode.key}
          onChange={() => setSettings((s) => ({ ...s, mode: mode.key }))} />{mode.label}
      </label>)}</div>
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1 text-sm"><span className="bh-muted">GPU type override</span>
        <select className={controlClass} value={settings.gpu_override}
          onChange={(event) => setSettings((s) => ({ ...s, gpu_override: event.target.value as JevGpuSettings['gpu_override'] }))}>
          <option className="bg-slate-950" value="as_measured">As measured (unknown → H100)</option>
          {gpuKeys.map((gpu) => <option className="bg-slate-950" key={gpu} value={gpu}>{JEV_GPU_PRESETS[gpu].label}</option>)}
        </select>
      </label>
      {settings.gpu_override === 'as_measured' && <label className="grid gap-1 text-sm">
        <span className="bh-muted">Preset to edit (applies to matching rows)</span>
        <select className={controlClass} value={editingGpu} onChange={(event) => setEditingGpu(event.target.value as JevGpuKey)}>
          {gpuKeys.map((gpu) => <option className="bg-slate-950" key={gpu} value={gpu}>{JEV_GPU_PRESETS[gpu].label}</option>)}
        </select>
      </label>}
      <NumberField label="Utilisation (fraction, 0 < u ≤ 1)" value={settings.utilisation} min={0.01} max={1} step="0.01"
        onChange={(value) => setNumber('utilisation', value)} />
      {settings.mode === 'own' ? <>
        <NumberField label={`${preset.label}: purchase (USD)`} value={preset.purchase_usd} onChange={(v) => setPreset('purchase_usd', v)} />
        <NumberField label="Amortisation (years)" value={settings.years} min={0.1} onChange={(v) => setNumber('years', v)} />
        <NumberField label={`${preset.label}: power (watts)`} value={preset.watts} onChange={(v) => setPreset('watts', v)} />
        <NumberField label="Electricity (USD/kWh)" value={settings.usd_per_kwh} onChange={(v) => setNumber('usd_per_kwh', v)} />
        <NumberField label="Power usage effectiveness (PUE)" value={settings.pue} min={1} onChange={(v) => setNumber('pue', v)} />
      </> : <NumberField label={`${preset.label}: ${settings.mode === 'reserved' ? 'reserved' : 'on-demand'} (USD/hour)`}
        value={settings.mode === 'reserved' ? preset.reserved_usd_h : preset.on_demand_usd_h}
        onChange={(v) => setPreset(settings.mode === 'reserved' ? 'reserved_usd_h' : 'on_demand_usd_h', v)} />}
      <label className="grid gap-1 text-sm"><span className="bh-muted">Parallel streams: <span className="tabular">{settings.parallel_streams}</span></span>
        <input type="range" min="1" max="32" step="1" value={settings.parallel_streams}
          onChange={(event) => setNumber('parallel_streams', Number(event.target.value))} />
      </label>
    </div>
    <p className="bh-muted text-sm">One stream uses measured median single-stream latency. More than one assumes linear batching gains that were not measured.
      Hardware overrides change prices only: latency is retained, performance and VRAM fit on other hardware are unverified. Unknown hardware uses H100 assumptions.</p>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Estimated costs sorted lowest first; these are not official ranks.</caption>
        <thead><tr className="border-b border-line">{['System', 'GPU', 'Cost per 1,000 decisions', 'Official cost (reference pricing)', 'Ratio to official'].map((label) =>
          <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead>
        <tbody>{(showAll ? rows : rows.slice(0, 15)).map((row) => <tr key={row.key} className="border-b border-line">
          <th scope="row" className="p-3 font-normal">{row.display}{!row.ranked && <span className="bh-muted"> (unranked)</span>}</th>
          <td className="p-3">{row.gpu ? JEV_GPU_PRESETS[row.gpu].label : 'Unknown'}{row.hardware_assumed && <span className="bh-muted"> (assumed)</span>}</td>
          <td className="p-3 tabular text-accent">{money(row.usd_per_1000)}</td>
          <td className="p-3 tabular">{money(row.officialUsdPer1000)}</td>
          <td className="p-3 tabular">{row.ratio_vs_official === null ? '—' : `${row.ratio_vs_official.toLocaleString('en-US', { maximumSignificantDigits: 3 })}×`}</td>
        </tr>)}</tbody>
      </table>
      {rows.length === 0 && <p className="bh-muted p-3 text-sm">No systems supplied.</p>}
    </div>
    {rows.length > 15 && <button type="button" className="rounded border border-line px-3 py-2 text-sm text-accent"
      aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show top 15' : `Show all (${rows.length})`}</button>}
    <div className="bh-muted space-y-2 text-xs">
      <p>Missing or invalid inputs show —. All costs are per useful hour of dedicated hardware; idle time is paid.
        Own = purchase / (years × 8,760 × utilisation) + watts / 1,000 × USD/kWh × PUE / utilisation.
        Rental = USD/hour / utilisation. Decisions/hour = 3,600 / median seconds × streams.
        Cost/1,000 = useful hourly cost / decisions/hour × 1,000. Ratio = What-If / official cost; a zero official cost has no ratio.</p>
      <p>Own hardware assumes constant power, including idle time; GPU prices exclude host, tax, storage and maintenance. CPU defaults describe an 8-vCPU allocation. Reserved prices are assumptions, not offers.
        Defaults: three years, USD 0.15/kWh, PUE 1.3, utilisation 1, one stream. Edits stay in this page only.</p>
      <details><summary className="cursor-pointer text-accent">Preset sources and assumptions</summary>
        <p className="mt-2"><a href="https://www.runpod.io/pricing" target="_blank" rel="noreferrer" className="text-accent underline">RunPod public pricing</a> (read 2026-10-05; reserved quotes require sales).</p>
        <ul className="mt-2 space-y-2">{gpuKeys.map((gpu) => <li key={gpu}>
          <strong>{JEV_GPU_PRESETS[gpu].label}</strong>: {JEV_GPU_PRESETS[gpu].source_note}
        </li>)}</ul>
      </details>
    </div>
  </section>;
}

export default JevGpuCostCalculator;
