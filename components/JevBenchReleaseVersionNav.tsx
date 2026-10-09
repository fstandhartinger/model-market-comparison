import { hasPublishedJevbenchV162Release } from '../lib/jevbench-v162-release.mjs';
type JevRelease = 'v1.6.2' | 'v1.6.1' | 'v1.6.0' | 'v1.5.7' | 'v1.5.6' | 'v1.5.5';

export async function JevBenchReleaseVersionNav({ active, fresh }: { active: JevRelease; fresh?: boolean }) {
  const visible = fresh ?? await hasPublishedJevbenchV162Release();
  const versions: Array<{ version: JevRelease; href: string }> = [
    ...(visible ? [{ version: 'v1.6.2' as const, href: '/jev-models/v1.6.2' }] : []),
    { version: 'v1.6.1', href: '/jev-models' },
    { version: 'v1.6.0', href: '/jev-models/v1.6.0' },
    { version: 'v1.5.7', href: '/jev-models/v1.5.7' },
    { version: 'v1.5.6', href: '/jev-models/v1.5.6' },
    { version: 'v1.5.5', href: '/jev-models/v1.5.5' },
  ];
  return <nav aria-label="JevBench release versions" className="mb-5 flex flex-wrap gap-2" data-bh-jev-version-tabs>
    {versions.map(({ version, href }) => <a key={version} href={href}
      aria-current={active === version ? 'page' : undefined}
      className={`rounded border px-3 py-1.5 text-sm ${active === version ? 'bh-release-tab-active border-accent bg-accent' : 'border-line text-accent hover:bg-panel'}`}>
      JevBench {version}{active === version ? ' · selected' : ''}
    </a>)}
  </nav>;
}
