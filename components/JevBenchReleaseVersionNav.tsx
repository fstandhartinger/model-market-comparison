type JevRelease = 'v1.6.0' | 'v1.5.7' | 'v1.5.6' | 'v1.5.5';

export function JevBenchReleaseVersionNav({ active }: { active: JevRelease }) {
  const versions: Array<{ version: JevRelease; href: string }> = [
    { version: 'v1.6.0', href: '/jev-models' },
    { version: 'v1.5.7', href: '/jev-models/v1.5.7' },
    { version: 'v1.5.6', href: '/jev-models/v1.5.6' },
    { version: 'v1.5.5', href: '/jev-models/v1.5.5' },
  ];
  return <nav aria-label="JevBench release versions" className="mb-5 flex flex-wrap gap-2" data-bh-jev-version-tabs>
    {versions.map(({ version, href }) => <a key={version} href={href}
      aria-current={active === version ? 'page' : undefined}
      className={`rounded border px-3 py-1.5 text-sm ${active === version ? 'border-accent bg-accent text-white' : 'border-line text-accent hover:bg-panel'}`}>
      JevBench {version}{active === version ? ' · selected' : ''}
    </a>)}
  </nav>;
}
