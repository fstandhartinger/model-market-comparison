// F-54: registry versions are identities (`family::snapshot-2026-09-13 (unversioned)`), not copy.
// Data and ids keep the raw string; everything a reader sees goes through these helpers.

export type HumanVersion = { kind: "snapshot" | "semantic"; label: string; date?: string };

export function humanVersion(version: string): HumanVersion {
  const snapshot = /^snapshot-(\d{4}-\d{2}-\d{2})/.exec(version);
  if (snapshot) return { kind: "snapshot", date: snapshot[1], label: `published ${snapshot[1]}` };
  // A date-only release name (LiveBench `2026-06-25`) reads as the date, never `v2026-06-25`.
  if (/^\d{4}-\d{2}-\d{2}$/.test(version)) return { kind: "semantic", label: version };
  return { kind: "semantic", label: /^v/i.test(version) ? version : `v${version}` };
}

/** Sentence-start form for "Version …" positions: "Published 2026-09-13" or "Version 2". */
export function versionHeading(version: string): string {
  const v = humanVersion(version);
  return v.kind === "snapshot" ? `Published ${v.date}` : `Version ${version.replace(/^v/i, "")}`;
}
