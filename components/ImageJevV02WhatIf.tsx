"use client";

import { useEffect, useMemo, useState } from 'react';
import { isOfficialWeights, OFFICIAL_WEIGHTS, weightedJevScore, type JevWeights } from '../lib/jevbench-axis-weights.mjs';
import { imageJevV02WhatIfRows, imageJevV02WeightsFromUrl, imageJevV02WeightsToUrl } from '../lib/imagejev-v02-explorer.mjs';

type ImageV02System = {
  key: string;
  name: string;
  score: number;
  rank: number;
  tracks: Record<string, any>;
};

const axes = ['intelligence', 'calibration', 'speed', 'cost'] as const;
type Axis = typeof axes[number];
const labels: Record<Axis, string> = { intelligence: 'Intelligence', calibration: 'Calibration', speed: 'Speed', cost: 'Cost' };
const presets: Array<{ name: string; weights: JevWeights }> = [
  { name: 'Balanced · official', weights: OFFICIAL_WEIGHTS },
  { name: 'Intelligence only', weights: { intelligence: 100, calibration: 0, speed: 0, cost: 0 } },
  { name: 'Intelligence focus', weights: { intelligence: 40, calibration: 20, speed: 20, cost: 20 } },
  { name: 'Calibration focus', weights: { intelligence: 20, calibration: 40, speed: 20, cost: 20 } },
  { name: 'Speed focus', weights: { intelligence: 20, calibration: 20, speed: 40, cost: 20 } },
  { name: 'Cost focus', weights: { intelligence: 20, calibration: 20, speed: 20, cost: 40 } },
];

const weightKey = (weights: JevWeights) => axes.map((axis) => weights[axis]).join(':');

export function ImageJevV02WhatIf({ systems }: { systems: ImageV02System[] }) {
  const [weights, setWeights] = useState<JevWeights>(OFFICIAL_WEIGHTS);
  const official = isOfficialWeights(weights);
  const officialFormulaMatches = systems.every((system) => {
    const calculated = weightedJevScore(system.tracks.core.axes, OFFICIAL_WEIGHTS);
    return Number.isFinite(calculated) && Math.abs((calculated as number) - system.score) < 0.005;
  });
  const presetName = presets.find((preset) => weightKey(preset.weights) === weightKey(weights))?.name ?? 'Custom weights';
  const rescored = useMemo(() => imageJevV02WhatIfRows(systems, weights), [systems, weights]);

  useEffect(() => {
    const readWeights = () => {
      const next = imageJevV02WeightsFromUrl(window.location.href);
      setWeights(next);
      window.dispatchEvent(new CustomEvent('jevbench-weights-change', { detail: { weights: next } }));
    };
    readWeights();
    window.addEventListener('popstate', readWeights);
    return () => window.removeEventListener('popstate', readWeights);
  }, []);

  const choose = (next: JevWeights) => {
    setWeights({ ...next });
    window.history.replaceState(window.history.state, '', imageJevV02WeightsToUrl(window.location.href, next));
    window.dispatchEvent(new CustomEvent('jevbench-weights-change', { detail: { weights: next } }));
  };
  const change = (axis: Axis, value: number) => {
    const next = { ...weights, [axis]: value };
    if (axes.some((item) => next[item] > 0)) choose(next);
  };
  if (!officialFormulaMatches) return <section className="mt-10 max-w-6xl" aria-labelledby="imagejev-v02-whatif-heading" data-bh-imagejev-v02-whatif data-bh-imagejev-v02-whatif-disabled>
    <h2 id="imagejev-v02-whatif-heading" className="text-2xl font-semibold">Presets and What-If</h2>
    <p className="bh-panel mt-4 p-4 text-sm" role="note">Weight controls are unavailable because the official CORE scores do not reproduce from the published axis aggregates within 0.005 points.</p>
  </section>;
  return <section className="mt-10 max-w-6xl" aria-labelledby="imagejev-v02-whatif-heading" data-bh-imagejev-v02-whatif>
    <h2 id="imagejev-v02-whatif-heading" className="text-2xl font-semibold">Presets and What-If</h2>
    <p className="bh-muted mt-2 max-w-5xl text-sm">Choose another axis mix to explore how the same measured CORE rows sort. Balanced weights reproduce the published v0.2 score and rank; other views are exploratory and do not change the official ranking.</p>
    <div className="bh-panel mt-4 p-4 sm:p-5">
      <p className="bh-eyebrow">Weight presets</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="CORE axis weight presets">
        {presets.map((preset) => <button type="button" key={preset.name} className="bh-jev-preset"
          aria-pressed={weightKey(preset.weights) === weightKey(weights)} onClick={() => choose(preset.weights)} data-bh-imagejev-v02-preset={preset.name}>
          {preset.name}
        </button>)}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {axes.map((axis) => <label key={axis} className="bh-panel p-3 text-sm">
          <span className="flex items-center justify-between gap-2 font-semibold"><span>{labels[axis]}</span><span className="tabular-nums">{weights[axis]}%</span></span>
          <input type="range" min="0" max="100" step="5" value={weights[axis]} onChange={(event) => change(axis, Number(event.currentTarget.value))}
            className="mt-2 w-full accent-[rgb(var(--accent))]" aria-label={`${labels[axis]} weight`} data-bh-imagejev-v02-weight={axis} />
        </label>)}
      </div>
      <p className="bh-muted mt-3 text-xs" aria-live="polite" data-bh-imagejev-v02-weight-summary>
        {presetName}: {axes.map((axis) => `${labels[axis]} ${weights[axis]}%`).join(' · ')}. Weights are normalized to their sum for the exploratory composite.
      </p>
      <p className="bh-muted mt-2 text-xs" data-bh-imagejev-v02-gates-method>Penalties applied: Intelligence, Speed and Cost below 50 each multiply the weighted harmonic mean by (axis / 50)², including when that axis has weight 0. Intelligence only can therefore sort differently from the Intelligence column. Capability eligibility caps are separate from these composite penalties.</p>
      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[540px] text-left text-sm" data-bh-imagejev-v02-whatif-ranking>
          <thead><tr><th scope="col" className="p-3">What-If rank</th><th scope="col" className="p-3">System</th><th scope="col" className="p-3 text-right">{official ? 'Published CORE composite' : 'Exploratory composite'}</th><th scope="col" className="p-3 text-right">Published rank</th></tr></thead>
          <tbody>{rescored.map(({ system, score, penalties }, index) => <tr key={system.key} className="border-t border-line" data-bh-imagejev-v02-whatif-row={system.key}>
            <td className="p-3 tabular-nums">{index + 1}</td><th scope="row" className="p-3 text-left font-semibold">{system.name}
              {penalties.gates.length > 0 && <span className="bh-muted mt-1 block text-xs font-normal" data-bh-imagejev-v02-gate={system.key}>
                Before penalties {penalties.ungated?.toFixed(2)} · gate ×{penalties.factor.toFixed(3)}: {penalties.gates.map((gate) => `${labels[gate.axis]} ${gate.value.toFixed(2)} ×${gate.factor.toFixed(3)}${gate.weighted ? '' : ' (applies although its weight is 0)'}`).join(' · ')}
              </span>}
            </th>
            <td className="p-3 text-right font-bold tabular-nums">{score.toFixed(2)}</td><td className="p-3 text-right tabular-nums">{system.rank ?? '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {!rescored.length && <p className="bh-muted mt-3 text-sm">No measured CORE systems are available for What-If yet.</p>}
    </div>
  </section>;
}
