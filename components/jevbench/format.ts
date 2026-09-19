// CR-84: number formatting for /jev-models. A null is never printed as zero.
export const pct = (v: number | null | undefined, d = 1) => (v == null ? "–" : `${(v * 100).toFixed(d)}%`);
export const usd = (v: number | null | undefined) => (v == null ? "–" : `$${v.toFixed(3)}`);
export const secs = (v: number | null | undefined) => (v == null ? "–" : `${v < 10 ? v.toFixed(2) : v.toFixed(1)} s`);
export const dec3 = (v: number | null | undefined) => (v == null ? "–" : v.toFixed(3));
export const cohortLabel = (k: string) => ({ "heldout-private": "held-out (private)", "imported-public-source": "imported (auto-router tasks)", "original-public": "original (published)" } as Record<string, string>)[k] ?? k;
