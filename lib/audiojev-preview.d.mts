export const AUDIOJEV_PREVIEW_FILE: string;
export const AUDIOJEV_EXAMPLES_FILE: string;
export const AUDIOJEV_JEV_CLASS: { p50AdjS: number; usdPer1000: number };

export type AudioJevGroup = 'full' | 'public-only' | 'partial';
export type AudioJevSlice = { acc: number | null; n: number };
export type AudioJevRobustness = Record<string, AudioJevSlice | number | null | undefined> & {
  audio_lift_vs_text_blind?: Record<string, { acc: number | null; text_blind_acc: number | null; n: number; lift: number | null }>;
};

export type AudioJevRow = {
  key: string; table: string; group: AudioJevGroup; apiFlag: boolean; sealedRoute: boolean;
  families: string[] | null; support: Record<string, string>;
  nItems: number | null; nRows: number | null; nErrors: number | null;
  iPublic: number | null; iPublicCi: [number, number] | null; iSealed: number | null;
  gap: number | null; penalty: number | null;
  intelligence: number | null; calibration: number | null; speed: number | null; cost: number | null;
  p50: number | null; p95: number | null; p50Adj: number | null; p95Adj: number | null; nLatency: number | null;
  usd: number | null; usdEstimate: boolean; usdBasis: string | null; usdSource: string | null;
  headline: number | null; composite: Record<string, number | null>;
  capability: number | null; capabilityProvisional: boolean;
  jevClass: boolean; outsideBecause: string[];
  typed: Record<string, number | null>; typedN: Record<string, number>;
  robustness: AudioJevRobustness | null;
  rank?: number | null; capabilityRank?: number | null;
};

export type AudioJevView = {
  method: string | null; gMed: number | null; gapAllowance: number | null; blend: (number | null)[] | null;
  difficultyMismatch: boolean | null; meta: Record<string, unknown> | null;
  systems: AudioJevRow[]; full: AudioJevRow[]; publicOnly: AudioJevRow[]; partial: AudioJevRow[];
  capability: AudioJevRow[]; withoutCapability: AudioJevRow[];
};

export type AudioJevExample = {
  id: string; family: string; type: string; tier: string; context: string; question: string;
  labels: string[]; descriptions: Record<string, string>; gold: string | null; durationS: number | null;
};

export function tableGroup(table: unknown): AudioJevGroup;
export function jevClassReasons(system: unknown): string[];
export function normalizeSystem(system: unknown): AudioJevRow;
export function audiojevView(scores: unknown): AudioJevView;
export const ROBUSTNESS_SLICES: Array<[string, string]>;
export const ROBUSTNESS_DELTAS: Array<[string, string]>;
export function robustnessColumns(systems: AudioJevRow[]): { slices: Array<[string, string]>; deltas: Array<[string, string]>; lift: string[] };
export function isPublicItem(item: unknown): boolean;
export function publicExamples(raw: unknown): AudioJevExample[];
export function readAudiojevPreview(root?: string): Promise<unknown | null>;
export function readAudiojevExamples(root?: string): Promise<AudioJevExample[]>;
