import { hasPublishedJevbenchV167Release } from '../lib/jevbench-v167-release.mjs';
import { hasPublishedJevbenchV166Release } from '../lib/jevbench-v166-release.mjs';
import { hasPublishedJevbenchV165Release } from '../lib/jevbench-v165-release.mjs';
import { hasPublishedJevbenchV164Release } from '../lib/jevbench-v164-release.mjs';
import { hasPublishedJevbenchV162Release } from '../lib/jevbench-v162-release.mjs';
import { hasPublishedJevbenchV163Release } from '../lib/jevbench-v163-release.mjs';
type JevRelease = 'v1.6.7' | 'v1.6.6' | 'v1.6.5' | 'v1.6.4' | 'v1.6.3' | 'v1.6.2' | 'v1.6.1' | 'v1.6.0' | 'v1.5.7' | 'v1.5.6' | 'v1.5.5';

export async function JevBenchReleaseVersionNav({ active, fresh, fresh163, fresh164, fresh165, fresh166, fresh167 }: { active: JevRelease; fresh?: boolean; fresh163?: boolean; fresh164?: boolean; fresh165?: boolean; fresh166?: boolean; fresh167?: boolean }) {
  const visible = fresh ?? await hasPublishedJevbenchV162Release();
  // v1.6.3 is shown only for a validated publication; a failed validation omits the tab and keeps older boards working.
  const visible163 = fresh163 ?? await hasPublishedJevbenchV163Release();
  const visible164 = fresh164 ?? await hasPublishedJevbenchV164Release();
  const visible165 = fresh165 ?? await hasPublishedJevbenchV165Release();
  const visible166 = fresh166 ?? await hasPublishedJevbenchV166Release();
  const visible167 = fresh167 ?? await hasPublishedJevbenchV167Release();
  const versions: Array<{ version: JevRelease; href: string }> = [
    ...(visible167 ? [{ version: 'v1.6.7' as const, href: '/jev-models/v1.6.7' }] : []),
    ...(visible166 ? [{ version: 'v1.6.6' as const, href: '/jev-models/v1.6.6' }] : []),
    ...(visible165 ? [{ version: 'v1.6.5' as const, href: '/jev-models/v1.6.5' }] : []),
    ...(visible164 ? [{ version: 'v1.6.4' as const, href: '/jev-models/v1.6.4' }] : []),
    ...(visible163 ? [{ version: 'v1.6.3' as const, href: '/jev-models/v1.6.3' }] : []),
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
