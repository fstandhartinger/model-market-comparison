/** Editable What-If defaults, read 2026-10-05; never used by official scoring. */
const runpod = 'RunPod Pods pricing https://www.runpod.io/pricing, read 2026-10-05';
const preset = (label, vram_gb, purchase_usd, watts, on_demand_usd_h, reserved_usd_h) => Object.freeze({
  label, vram_gb, purchase_usd, watts, on_demand_usd_h, reserved_usd_h,
  source_note: `${runpod}: on-demand and VRAM. Purchase, watts and reserved rate are round assumptions, not vendor quotes; GPU-only purchase excludes host, tax and maintenance.`,
});
export const JEV_GPU_PRESETS = Object.freeze({
  H100: preset('H100 PCIe', 80, 30000, 350, 2.89, 2.30),
  RTX6000: preset('RTX 6000 Ada', 48, 7000, 300, 0.84, 0.65),
  RTXPRO6000: preset('RTX PRO 6000 Blackwell', 96, 10000, 600, 2.09, 1.65),
  RTX5090: preset('RTX 5090', 32, 2500, 575, 0.99, 0.80),
  A6000: preset('RTX A6000', 48, 5000, 300, 0.53, 0.40),
  cpu: Object.freeze({ label: 'CPU (8 vCPU)', vram_gb: 0, purchase_usd: 2000, watts: 150,
    on_demand_usd_h: 0.40, reserved_usd_h: 0.30,
    source_note: '8-vCPU server allocation: all prices and watts are round assumptions, set 2026-10-05; CPU — use the on-demand field for your provider quote.',
  }),
});
export const JEV_GPU_DEFAULT_SETTINGS = Object.freeze({
  mode: 'on_demand', gpu_override: 'as_measured', years: 3, usd_per_kwh: 0.15,
  utilisation: 1, pue: 1.3, parallel_streams: 1,
});
export function normaliseJevGpu(gpu) {
  const key = typeof gpu === 'string' ? gpu.trim().replace(/\s+/g, '').toUpperCase() : '';
  return ({ H100: 'H100', RTX6000: 'RTX6000', RTX6000ADA: 'RTX6000',
    RTXPRO6000: 'RTXPRO6000', RTX5090: 'RTX5090', A6000: 'A6000', RTXA6000: 'A6000', CPU: 'cpu' })[key] ?? null;
}
const nonnegative = (n) => Number.isFinite(n) && n >= 0;
const positive = (n) => Number.isFinite(n) && n > 0;
const finiteOrNull = (n) => nonnegative(n) ? n : null;
/**
 * USD per useful dedicated GPU-hour (idle time is paid):
 * own = purchase/(years*8760*utilisation) + watts/1000*USD/kWh*PUE/utilisation.
 * on-demand/reserved = hourly rental/utilisation. Power is assumed constant even idle.
 * Only fields relevant to the selected mode are required. Invalid input returns null.
 */
export function jevGpuHourlyCost(mode, gpu, settings = {}) {
  const s = { ...JEV_GPU_DEFAULT_SETTINGS, ...settings };
  if (!gpu || !positive(s.utilisation) || s.utilisation > 1) return null;
  if (mode === 'own') {
    if (!nonnegative(gpu.purchase_usd) || !nonnegative(gpu.watts) || !positive(s.years)
      || !nonnegative(s.usd_per_kwh) || !positive(s.pue)) return null;
    return finiteOrNull(gpu.purchase_usd / s.years / 8760 / s.utilisation
      + gpu.watts / 1000 * s.usd_per_kwh * s.pue / s.utilisation);
  }
  const price = mode === 'on_demand' ? gpu.on_demand_usd_h : mode === 'reserved' ? gpu.reserved_usd_h : null;
  return nonnegative(price) ? finiteOrNull(price / s.utilisation) : null;
}
/** Streams > 1 assume linear batching scaling, which the single-stream run did not measure. */
export function jevGpuDecisionsPerHour(p50_s_raw, parallel_streams = 1) {
  if (!positive(p50_s_raw) || !Number.isInteger(parallel_streams) || parallel_streams < 1 || parallel_streams > 32) return null;
  const value = 3600 / p50_s_raw * parallel_streams;
  return positive(value) ? value : null;
}
export function jevGpuUsdPer1000(hourly_cost, decisions_per_hour) {
  return nonnegative(hourly_cost) && positive(decisions_per_hour)
    ? finiteOrNull(hourly_cost / decisions_per_hour * 1000) : null;
}
/** Preserve every input system; unknown hardware defaults to H100 and is flagged explicitly. */
export function jevGpuCostRows(systems, settings = {}) {
  const s = { ...JEV_GPU_DEFAULT_SETTINGS, ...settings };
  return systems.map((system) => {
    const measured = normaliseJevGpu(system.gpu);
    const overridden = s.gpu_override !== 'as_measured';
    const gpu = overridden ? normaliseJevGpu(s.gpu_override) : measured ?? 'H100';
    const config = gpu ? { ...JEV_GPU_PRESETS[gpu], ...s.preset_overrides?.[gpu] } : null;
    const throughput = jevGpuDecisionsPerHour(system.p50_s_raw, s.parallel_streams);
    const all_modes = Object.fromEntries(['own', 'on_demand', 'reserved'].map((mode) =>
      [mode, jevGpuUsdPer1000(jevGpuHourlyCost(mode, config, s), throughput)]));
    const usd_per_1000 = all_modes[s.mode] ?? null;
    const official = finiteOrNull(system.officialUsdPer1000);
    return { ...system, gpu, measured_gpu: measured, hardware_assumed: !measured || gpu !== measured,
      officialUsdPer1000: official, usd_per_1000, all_modes,
      ratio_vs_official: usd_per_1000 !== null && positive(official) ? finiteOrNull(usd_per_1000 / official) : null };
  }).sort((a, b) => a.usd_per_1000 === null ? b.usd_per_1000 === null ? 0 : 1
    : b.usd_per_1000 === null ? -1 : a.usd_per_1000 - b.usd_per_1000);
}
