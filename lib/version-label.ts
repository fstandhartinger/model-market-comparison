// F-54: registry versions are identities (`family::snapshot-2026-09-13 (unversioned)`), not copy.
// Data and ids keep the raw string; everything a reader sees goes through these helpers.

import { isPin } from "./version-pin.mjs";
export { isPin };

export type HumanVersion = { kind: "snapshot" | "semantic" | "pin"; label: string; date?: string };

export function humanVersion(version: string): HumanVersion {
  if (isPin(version)) return { kind: "pin", label: `pinned revision ${version.toLowerCase()}` };
  const snapshot = /^snapshot-(\d{4}-\d{2}-\d{2})/.exec(version);
  if (snapshot) return { kind: "snapshot", date: snapshot[1], label: `published ${snapshot[1]}` };
  // A date-only release name (LiveBench `2026-06-25`) reads as the date, never `v2026-06-25`.
  if (/^\d{4}-\d{2}-\d{2}$/.test(version)) return { kind: "semantic", label: version };
  // Named release identities (`8-needle`, `opt1-102`, `release-v1`) are not semantic
  // versions. Prefixing them with `v` makes the UI claim a release convention the source
  // did not publish. Keep the `v` shorthand only for numeric release versions.
  const numericRelease = /^(?:v)?\d+(?:\.\d+)*$/i.test(version);
  return { kind: "semantic", label: numericRelease && !/^v/i.test(version) ? `v${version}` : version };
}

/** Sentence-start form for "Version …" positions: "Published 2026-09-13" or "Version 2". */
export function versionHeading(version: string): string {
  const v = humanVersion(version);
  if (v.kind === "pin") return `Pinned revision ${version.toLowerCase()}`;
  return v.kind === "snapshot" ? `Published ${v.date}` : `Version ${version.replace(/^v(?=\d)/i, "")}`;
}

/** F-61: the version as a suffix after a benchmark name — or nothing when the name already
 *  carries it ("AA-LCR v1.1", "GDPval-AA v2", "Terminal-Bench v4.0 (AA)") or the version is a
 *  retention snapshot (the date column says that). Word-bounded so "v2" does not hide inside "v2.1". */
export function versionSuffix(name: string, version: string): string | null {
  const v = humanVersion(version);
  if (v.kind === "snapshot" || v.kind === "pin") return null;
  const escaped = v.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s(])${escaped}(?=$|[\\s)])`, "i").test(name) ? null : v.label;
}
