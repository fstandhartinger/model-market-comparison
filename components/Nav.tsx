"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
  ["/", "Overview"],
  ["/compare", "Compare"],
  ["/benchmarks", "Benchmarks"],
  ["/benchmaxxing", "Benchmaxxing"],
  ["/radar", "Radar"],
  ["/scatter", "Cost vs Capability"],
  ["/charts", "Charts"],
  ["/providers", "Providers per Model"],
  ["/provider-explorer", "Provider explorer"],
  ["/gateways", "Gateways"],
  ["/eu", "EU & Sovereign"],
  ["/about", "About"],
];
const PRIMARY = [LINKS[0], LINKS[2], LINKS[3], LINKS[1], LINKS[4]];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="bh-brand-link flex min-h-11 items-center gap-2.5"><BrandMark className="h-9 w-9 shrink-0" /><span className="bh-wordmark">Benchmark Heaven</span></Link>
        <nav aria-label="Primary" className="relative order-3 flex w-full flex-wrap gap-1 text-sm lg:order-none lg:w-auto">
          {PRIMARY.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 py-1.5 ${active ? "bg-accent/15 text-accent" : "text-gray-300 hover:bg-accent/5"}`}
              >
                {label}
              </Link>
            );
          })}
          <details><summary className="flex min-h-11 cursor-pointer items-center rounded-md px-3 text-gray-300">More ▾</summary><div className="absolute left-0 top-full z-30 mt-2 grid w-64 max-w-full gap-1 rounded-xl border border-line bg-panel p-2 shadow-lg">{LINKS.slice(5).map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`rounded-md px-3 py-3 ${path === href ? 'text-accent bg-accent/10' : 'hover:bg-accent/5'}`} onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}>{label}</Link>)}</div></details>
        </nav>
        <div className="ml-auto"><ThemeToggle /></div>
      </div>
    </header>
  );
}
