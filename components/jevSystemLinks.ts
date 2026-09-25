import data from '../data/raw/benchmarks/jevbench/jev-system-links.json';

// Florian 25 Sep 2026: every model name links to its best public source. The results row's repo is used where it works;
// this dated list fills the rows without one (closed APIs, a hosted service) and replaces a dead repo link.
const LINKS = (data as { links: Record<string, { url: string }> }).links;

export const jevSourceUrl = (key: string, repo: string | null | undefined): string | null => LINKS[key]?.url ?? repo ?? null;
