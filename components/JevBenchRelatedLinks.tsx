import Link from 'next/link';

const PAIR_LINKS: Record<string, Array<{ href: string; label: string }>> = {
  'jev-1.13.0': [
    { href: '/jev-models/jev-vs-jevk5', label: 'Jev vs JevK5' },
    { href: '/jev-models/jev-vs-hopper', label: 'Jev vs Hopper' },
    { href: '/jev-models/jev-vs-winnow-12b-q8', label: 'Jev vs Winnow-12B Q8' },
    { href: '/jev-models/jev-vs-reflex-4b', label: 'Jev vs reflex 4B' },
  ],
  'jevk5-v02': [{ href: '/jev-models/jev-vs-jevk5', label: 'Jev vs JevK5' }],
  hopper: [{ href: '/jev-models/jev-vs-hopper', label: 'Jev vs Hopper' }],
  'winnow-12b': [{ href: '/jev-models/jev-vs-winnow-12b-q8', label: 'Jev vs Winnow-12B Q8' }],
  'reflex-4b': [{ href: '/jev-models/jev-vs-reflex-4b', label: 'Jev vs reflex 4B' }],
};

export function JevBenchRelatedLinks({ systemKey }: { systemKey: string }) {
  const pairs = PAIR_LINKS[systemKey] ?? [];
  return (
    <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="JevBench model guides and comparisons">
      <Link className="text-accent underline" href="/jev-models/alternatives">Jev alternatives</Link>
      <Link className="text-accent underline" href="/jev-models/how-to-choose">How to choose</Link>
      {pairs.map((pair) => <Link className="text-accent underline" href={pair.href} key={pair.href}>{pair.label}</Link>)}
    </nav>
  );
}
