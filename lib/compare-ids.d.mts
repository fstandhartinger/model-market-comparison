import type { CompareFamily } from './benchmark-view.mjs';

export interface CompareEntry { kind: 'known' | 'pending'; id: string; name: string; org: string | null; score: number | null }
export interface CompareResolution { entries: CompareEntry[]; picks: string[]; pending: CompareEntry[] }

export function normalizeModelKey(raw: unknown): string;
export function looseModelKey(raw: unknown): string;
export function prettyModelName(raw: unknown): string;
export function guessOrg(raw: unknown): string | null;
export function isPlausibleModelId(raw: unknown): boolean;
export function resolveCompareIds(rawIds: readonly string[] | null | undefined, families: readonly CompareFamily[] | null | undefined, options?: { limit?: number }): CompareResolution;
export function compareQuery(entries: readonly { id: string }[]): URLSearchParams;
export function compareHeadline(entries: readonly CompareEntry[]): string;
export function compareDescription(entries: readonly CompareEntry[]): string;
export const COMING_SOON_LINE: string;
