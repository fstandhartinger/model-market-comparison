// Pure client adapters for the unpublished v0.2 explorer. Never mutate release rows or tariffs.
import { JEV_AXES, OFFICIAL_WEIGHTS, isOfficialWeights, jevGatePenalties } from './jevbench-axis-weights.mjs';
import { jevV15BoardScore } from './jevbench-v15-board.mjs';
import { speedFromLatency } from './jevbench-jev-class.mjs';

export function imageJevV02WhatIfRows(systems, weights) {
  const official = isOfficialWeights(weights);
  return systems.flatMap((system) => {
    const axes = system.tracks?.core?.axes;
    // A zero slider must never turn an unmeasured NULL composite into a ranked score.
    if (!Number.isFinite(system.score) || !Number.isInteger(system.rank)
      || !JEV_AXES.every((axis) => Number.isFinite(axes?.[axis]))) return [];
    const penalties = jevGatePenalties(axes, weights, { gatesAlways: true });
    const score = official ? system.score : jevV15BoardScore(axes, weights);
    return Number.isFinite(score) ? [{ system, score, penalties }] : [];
  }).sort((a, b) => b.score - a.score || (official ? a.system.rank - b.system.rank
    : a.system.name.localeCompare(b.system.name) || a.system.key.localeCompare(b.system.key)));
}

/** Match the shared board's w=I-C-S-C grammar; invalid/all-zero mixes restore official weights. */
export function imageJevV02WeightsFromUrl(href) {
  const value = new URL(href).searchParams.get('w');
  if (!value || !/^\d+(?:\.\d+)?(?:[-,]\d+(?:\.\d+)?){3}$/.test(value)) return { ...OFFICIAL_WEIGHTS };
  const values = value.split(/[-,]/).map(Number);
  if (values.some((number) => !Number.isFinite(number) || number > 100) || values.every((number) => number === 0)) return { ...OFFICIAL_WEIGHTS };
  return Object.fromEntries(JEV_AXES.map((axis, index) => [axis, values[index]]));
}

export function imageJevV02WeightsToUrl(href, weights) {
  const url = new URL(href);
  if (isOfficialWeights(weights)) url.searchParams.delete('w');
  else url.searchParams.set('w', JEV_AXES.map((axis) => weights[axis]).join('-'));
  return url.toString();
}

/** Actual 2D scatter geometry. The supplied caps are the frozen official envelope, independent of sliders. */
export function imageJevV02ScatterScale(kind, points, caps) {
  const plotted = points.filter((point) => kind === 'cost' ? point.cost != null && point.cost > 0 : point.speed != null);
  const cap = kind === 'cost' ? caps?.cost : caps?.latency;
  const hasCap = Number.isFinite(cap) && cap > 0;
  const costs = [...plotted.flatMap((point) => point.cost != null && point.cost > 0 ? [point.cost] : []),
    ...(kind === 'cost' && hasCap ? [cap] : [])];
  const low = costs.length ? Math.log10(Math.min(...costs)) : -3;
  const high = costs.length ? Math.log10(Math.max(...costs)) : 0;
  const minCost = low === high ? low - 0.5 : low;
  const maxCost = low === high ? high + 0.5 : high;
  const costX = (cost) => 44 + 294 * (maxCost - Math.log10(cost)) / (maxCost - minCost);
  const speedX = (speed) => 44 + 294 * speed / 100;
  return { plotted, minCost, maxCost,
    capX: !hasCap ? null : kind === 'cost' ? costX(cap) : speedX(speedFromLatency(cap)),
    xAt: (point) => kind === 'cost' ? costX(point.cost) : speedX(point.speed),
  };
}
