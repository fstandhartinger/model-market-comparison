import Link from 'next/link';

const MODELS = [
  { href: '/jev-models/torchcast-decision-31b-v1.0', label: 'Torchcast Decision 31B v1.0' },
  { href: '/jev-models/h2o-lightning-4b-v1.4.1', label: 'H2O-Lightning-4B v1.4.1' },
  { href: '/jev-models/metadecision-31b-rain', label: 'MetaDecision-31B-Rain' },
  { href: '/jev-models/mammoth-1', label: 'baselabs mammoth-1' },
];

export function PopularModelLinks() {
  return (
    <nav aria-label="Popular Jev-compatible model pages" className="mb-5 border-t border-line pt-4">
      <h2 className="mb-2 text-sm font-semibold text-gray-300">Explore popular Jev-compatible models</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {MODELS.map((model) => (
          <li key={model.href}>
            <Link href={model.href} className="text-accent underline underline-offset-2">
              {model.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
