"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
  ["/", "Overview"],
  ["/benchmarks", "Benchmarks"],
  ["/compare", "Compare"],
  ["/charts", "Charts"],
  ["/benchmaxxing", "Benchmaxxing"],
  ["/radar", "Radar"],
  ["/scatter", "Cost vs Capability"],
  ["/providers", "Providers per Model"],
  ["/provider-explorer", "Provider explorer"],
  ["/gateways", "Gateways"],
  ["/eu", "EU & Sovereign"],
  ["/about", "About"],
];
const PRIMARY = [LINKS[0], LINKS[1], LINKS[2], LINKS[3], LINKS[4]];
const MORE = [LINKS[6], LINKS[7], LINKS[8], LINKS[9], LINKS[10], LINKS[11]];

function FilterButton({ mobile = false }: { mobile?: boolean }) {
  return <button type="button" className={`${mobile ? "" : "hidden lg:inline-flex"} bh-nav-button inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-sm text-gray-300 hover:bg-accent/10 hover:text-accent`} aria-controls="global-filters" aria-label="Open filters and settings" onClick={() => window.dispatchEvent(new CustomEvent("bh:toggle-filters"))}>
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M5.5 10h9M8 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
    <span>Filters</span>
  </button>;
}

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex h-[58px] max-w-[1400px] items-center gap-2 px-4">
        <Link href="/" aria-label="Benchmark Heaven home" className="bh-brand-link flex min-h-10 shrink-0 items-center gap-2.5"><BrandMark className="h-8 w-8 shrink-0" /><span className="bh-wordmark hidden sm:inline">Benchmark <span className="bh-wordmark-accent">Heaven</span></span></Link>
        <nav aria-label="Primary" className="relative ml-4 hidden flex-1 items-center gap-1 text-sm lg:flex">
          {PRIMARY.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-10 items-center rounded-md px-2.5 ${active ? "bg-accent/15 text-accent" : "text-gray-300 hover:bg-accent/5"}`}
              >
                {label}
              </Link>
            );
          })}
          <details><summary className="flex min-h-10 cursor-pointer items-center rounded-md px-2.5 text-gray-300">More ▾</summary><div className="absolute left-0 top-full z-30 mt-2 grid w-64 max-w-full gap-1 rounded-xl border border-line bg-panel p-2 shadow-lg">{MORE.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`rounded-md px-3 py-3 ${path === href ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5'}`} onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}>{label}</Link>)}</div></details>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <FilterButton />
          <ThemeToggle />
          <div className="relative lg:hidden">
            <details>
              <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-md px-2.5 text-sm text-gray-300 hover:bg-accent/10">Menu</summary>
              <div className="absolute right-0 top-full z-30 mt-2 grid w-64 gap-1 rounded-xl border border-line bg-panel p-2 shadow-lg">
                {LINKS.filter(([href]) => href !== "/radar").map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`rounded-md px-3 py-3 ${path === href ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5'}`}>{label}</Link>)}
              </div>
            </details>
          </div>
          <span className="lg:hidden"><FilterButton mobile /></span>
        </div>
      </div>
    </header>
  );
}
