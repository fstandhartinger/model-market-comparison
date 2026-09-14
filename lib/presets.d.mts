export type PresetKind = 'models' | 'rows' | 'filters';
export interface SavedPreset<V = unknown> { id: string; name: string; value: V; updatedAt: number }
export interface PresetStore { models: SavedPreset<string[]>[]; rows: SavedPreset<string[]>[]; filters: SavedPreset<Record<string, unknown>>[] }
export const PRESET_KINDS: PresetKind[];
export const STORE_KEY: string;
export function uniqueName(list: SavedPreset[], name: string, exceptId?: string | null): string;
export function savePreset<V>(list: SavedPreset<V>[], name: string, value: V, now?: number, id?: string | null): SavedPreset<V>[];
export function renamePreset<V>(list: SavedPreset<V>[], id: string, name: string, now?: number): SavedPreset<V>[];
export function deletePreset<V>(list: SavedPreset<V>[], id: string): SavedPreset<V>[];
export function mergePresets<V>(account: SavedPreset<V>[], local: SavedPreset<V>[]): SavedPreset<V>[];
export function sanitizeStore(raw: unknown): PresetStore;

export interface RowLike { key: string; group: string; tags: string[] }
export interface BuiltinRowPreset { id: string; name: string; hint?: string; match: (row: RowLike, present: number, total: number) => boolean }
export const ROW_PRESETS: BuiltinRowPreset[];
export function rowFilter(selection: string | string[]): (row: RowLike, present: number, total: number) => boolean;

export interface PresetCandidate { id: string; org: string; open_weights: boolean; eu: boolean; cost: number | null; scores: Record<string, number | null | undefined> }
export const MODEL_PRESETS: { id: string; name: string; hint?: string }[];
export function modelsForPreset(id: string, candidates: PresetCandidate[], score: string, n: number): string[];

export const FILTER_KEYS: string[];
export const FILTER_PRESETS: { id: string; name: string; hint?: string; patch: Record<string, unknown> }[];
export function pickFilters(state: object): Record<string, unknown>;
export function resolveFilterPatch(patch: Record<string, unknown>, defaults: object, scoreDefault: (score: string) => number): Record<string, unknown>;
export function encodeFilters(state: object, defaults: object): string;
export function decodeFilters(text: string | null | undefined): Record<string, unknown>;
export function matchingFilterPreset(state: object, defaults: object, scoreDefault: (score: string) => number, custom?: SavedPreset<Record<string, unknown>>[]): string | null;
