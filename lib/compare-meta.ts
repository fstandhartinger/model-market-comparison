import { getBenchmarkView } from "./benchmark-data";
import { compareFamilies } from "./benchmark-view.mjs";
import { compareQuery, resolveCompareIds, type CompareEntry } from "./compare-ids.mjs";

/**
 * CR-122: the server side of a shared compare link. The page, its link-preview tags and the preview
 * image resolve the `model` parameters exactly once, here, so all three name the same models — including
 * one that has only just been announced and is not in the data yet.
 */
export type CompareRequest = { entries: CompareEntry[]; known: CompareEntry[]; pending: CompareEntry[]; query: string; path: string };

export function rawModelParams(params: Record<string, string | string[] | undefined> | URLSearchParams): string[] {
  if (params instanceof URLSearchParams) return params.getAll("model");
  const value = params.model;
  return typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
}

export async function resolveCompareRequest(params: Record<string, string | string[] | undefined> | URLSearchParams): Promise<CompareRequest> {
  const raw = rawModelParams(params);
  if (!raw.length) return { entries: [], known: [], pending: [], query: "", path: "/compare" };
  const { entries } = resolveCompareIds(raw, compareFamilies(await getBenchmarkView()));
  const query = compareQuery(entries).toString();
  return { entries, known: entries.filter((e) => e.kind === "known"), pending: entries.filter((e) => e.kind === "pending"),
    query, path: query ? `/compare?${query}` : "/compare" };
}

export { compareDescription, compareHeadline } from "./compare-ids.mjs";
