import Link from 'next/link';
import { JEV_COMPARISONS } from '../lib/jevbench-seo.mjs';

const pairLink = (pair: { slug: string; label: string }) => ({ href: `/jev-models/${pair.slug}`, label: `Jev vs ${pair.label}` });

const PAIR_LINKS: Record<string, Array<{ href: string; label: string }>> = {
  'jev-1.13.0': JEV_COMPARISONS.map(pairLink),
  ...Object.fromEntries(JEV_COMPARISONS.map((pair) => [pair.key, [pairLink(pair)]])),
};

export function JevBenchRelatedLinks({ systemKey }: { systemKey: string }) {
  const pairs = PAIR_LINKS[systemKey] ?? [];
  return (
    <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="JevBench model guides and comparisons">
      <Link className="text-accent underline" href="/jev-models/alternatives">Jev alternatives</Link>
      <Link className="text-accent underline" href="/jev-models/how-to-choose">How to choose</Link>
      <Link className="text-accent underline" href="/jev-models/open-source-jev">Is Jev open source?</Link>
      {pairs.map((pair) => <Link className="text-accent underline" href={pair.href} key={pair.href}>{pair.label}</Link>)}
    </nav>
  );
}
