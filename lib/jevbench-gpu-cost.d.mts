export type JevGpuKey = 'H100' | 'RTX6000' | 'RTXPRO6000' | 'RTX5090' | 'A6000' | 'cpu';
export type JevGpuMode = 'own' | 'on_demand' | 'reserved';
export type JevGpuPreset = {
  label: string; vram_gb: number; purchase_usd: number; watts: number;
  on_demand_usd_h: number; reserved_usd_h: number; source_note: string;
};
export type JevGpuSystem = {
  key: string; display: string; gpu: string | null; p50_s_raw: number | null;
  officialUsdPer1000: number | null; ranked: boolean;
};
export type JevGpuSettings = {
  mode: JevGpuMode; gpu_override: 'as_measured' | JevGpuKey; years: number;
  usd_per_kwh: number; utilisation: number; pue: number; parallel_streams: number;
  preset_overrides?: Partial<Record<JevGpuKey, Partial<JevGpuPreset>>>;
};
export type JevGpuCostRow = Omit<JevGpuSystem, 'gpu'> & {
  gpu: JevGpuKey | null; measured_gpu: JevGpuKey | null; hardware_assumed: boolean;
  usd_per_1000: number | null; all_modes: Record<JevGpuMode, number | null>; ratio_vs_official: number | null;
};
export declare const JEV_GPU_PRESETS: Readonly<Record<JevGpuKey, Readonly<JevGpuPreset>>>;
export declare const JEV_GPU_DEFAULT_SETTINGS: Readonly<JevGpuSettings>;
export declare function normaliseJevGpu(gpu: string | null): JevGpuKey | null;
export declare function jevGpuHourlyCost(mode: JevGpuMode, gpu: JevGpuPreset | null, settings?: Partial<JevGpuSettings>): number | null;
export declare function jevGpuDecisionsPerHour(p50_s_raw: number | null, parallel_streams?: number): number | null;
export declare function jevGpuUsdPer1000(hourly_cost: number | null, decisions_per_hour: number | null): number | null;
export declare function jevGpuCostRows(systems: JevGpuSystem[], settings?: Partial<JevGpuSettings>): JevGpuCostRow[];
