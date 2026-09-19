"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { useSettings } from './SettingsContext';
import { AccountButton, AccountMenuLink } from './AccountButton';
import { useEffect, useRef, useState } from "react";

const BETA_NOTE = "This site is under construction; data and features change daily.";

/** CR-35.2 (Florian 2026-09-15): a prominent BETA / Work in progress tag beside the logo on every page. The note
 *  shows on hover, keyboard focus or tap, in an opaque popup; Escape or a tap elsewhere closes it. */
function BetaTag() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return <span ref={box} className="relative ml-1 inline-flex shrink-0 items-center"
    // Hover only for real mice: on touch, mouseenter fires before click and the toggle would close the note it opened.
    onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(true); }} onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}>
    <button type="button" className="bh-beta-tag" aria-expanded={open} aria-describedby={open ? "bh-beta-note" : undefined} data-beta-tag
      onClick={() => setOpen((o) => !o)}
      // Keyboard focus opens the note; a tap also focuses the button, and opening there would let the click close it again.
      onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setOpen(true); }} onBlur={() => setOpen(false)}>
      {/* The long form used to appear at md (768 px), where the header then needed ~808 px and the
          whole page scrolled sideways (measured 768–819 px). It fits from ~820 px, so it starts there. */}
      BETA<span className="hidden min-[830px]:inline">&nbsp;— Work in progress</span>
    </button>
    {open && <span id="bh-beta-note" role="tooltip" className="absolute left-0 top-full z-50 mt-2 w-60 rounded-lg border border-line bg-[var(--surface)] p-2.5 text-xs font-normal text-[var(--text)] shadow-xl">{BETA_NOTE}</span>}
  </span>;
}

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
  ["/jev-models", "Jev-class models"],
];
// CR-63.1 (Florian 2026-09-16): Benchmaxxing is second, after Overview, on every breakpoint.
const PRIMARY = [LINKS[0], LINKS[4], LINKS[1], LINKS[2], LINKS[3]];
// CR-84: our own JevBench page sits in More, before About.
const MORE = [LINKS[6], LINKS[7], LINKS[8], LINKS[9], LINKS[10], LINKS[12], LINKS[11]];
const PHONE_MORE = [LINKS[0], LINKS[4], LINKS[2], LINKS[3], ...MORE];

/** CR-63.3: a header <details> menu (CR-74.5: and the Advanced toolbar popovers) closes on a click outside, on Escape (focus back on its summary) and on a route change. */
export function MenuDetails({ className, summary, children }: { className?: string; summary: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { ref.current?.removeAttribute("open"); }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = () => ref.current?.removeAttribute("open");
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { close(); ref.current?.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return <details ref={ref} className={className} onToggle={(e) => setOpen(e.currentTarget.open)}>{summary}{children}</details>;
}

/** F-15 / CR-25.1: Options (was Filters) is one of the three shared 40 px header controls, visible at every
 *  width — on mobile it sits between the logo and Menu. */
function FilterButton() {
  const { filtersOpen, toggleFilters } = useSettings();
  return (
    <button type="button" data-bh-filters-toggle className={`bh-nav-button inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-accent/10 hover:text-accent max-[359px]:px-1 max-[359px]:text-[13px] sm:px-2.5 ${filtersOpen ? "text-accent" : "text-gray-300"}`} aria-controls="global-filters" aria-expanded={filtersOpen} aria-label="Open options" onClick={toggleFilters}>
      <svg aria-hidden="true" className="hidden md:block" width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M5.5 10h9M8 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      <span>Options</span>
    </button>
  );
}

/** CR-7.3: in Simple mode the home page carries its own Benchmarks section — the header button jumps
 *  there instead of leaving the page. Anywhere else (Advanced, Guided, other pages) it opens the full tab. */
function jumpToSimpleBenchmarks(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
  if (path !== "/" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const section = document.getElementById("benchmarks");
  if (!section) return;
  e.preventDefault();
  section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  section.focus({ preventScroll: true });
}

export function Nav() {
  const path = usePathname();
  const { filtersOpen } = useSettings();
  return (
    <header className={`relative border-b border-line bg-panel ${filtersOpen ? "z-50" : ""}`}>
      {/* CR-79 (found while verifying): a phone at the larger-text setting made this row wider than the viewport, so
          the whole page scrolled sideways. The row may wrap when that happens — every label stays visible (CR-6.1
          keeps Benchmarks beside More) and the header simply becomes two lines on those devices; at the default text
          size nothing wraps and the height is the same 58 px. */}
      <div className="mx-auto flex min-h-[58px] max-w-[1400px] flex-wrap items-center gap-1.5 px-2 sm:gap-2 sm:px-3 md:px-4">
        <Link href="/" aria-label="Benchmark Heaven home" className="bh-brand-link flex min-h-10 shrink-0 items-center gap-2.5"><BrandMark className="h-8 w-8 shrink-0" /><span className="bh-wordmark hidden md:inline">Benchmark <span className="bh-wordmark-accent">Heaven</span></span></Link>
        <BetaTag />
        {/* The full primary nav fits the viewport from 1280 px up; 1024–1279 keeps the compact cluster (measured: the desktop bar needs ~1120 px). */}
        <nav aria-label="Primary" className="relative ml-4 hidden flex-1 items-center gap-1 text-sm xl:flex">
          {PRIMARY.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={href === "/benchmarks" ? (e) => jumpToSimpleBenchmarks(e, path) : undefined}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-10 items-center rounded-md px-2.5 ${active ? "border-b-2 border-accent text-accent" : "text-gray-300 hover:bg-accent/5"}`}
              >
                {label}
              </Link>
            );
          })}
          <MenuDetails className="relative" summary={<summary className="flex min-h-10 cursor-pointer items-center rounded-md px-2.5 text-gray-300">More ▾</summary>}><div className="absolute left-0 top-full z-30 mt-2 grid w-64 gap-1 rounded-xl border border-line bg-panel p-2 shadow-lg">{MORE.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`rounded-md px-3 py-3 ${path === href ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5'}`} onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}>{label}</Link>)}</div></MenuDetails>
        </nav>
        <div className="ml-auto flex items-center gap-0.5 max-[359px]:gap-0 sm:gap-1">
          <FilterButton />
          {/* CR-6.1: below xl (1280 px, was lg — the full bar overflowed 1024–1279) the header carries
              Options · Benchmarks · More, Benchmarks left of More. */}
          {/* CR-63.1: Benchmaxxing beside Benchmarks where it fits (from 640 px — measured: at 375–390 px the header needs ~460 px with it); second in More below that. */}
          <Link href="/benchmaxxing" aria-current={path.startsWith("/benchmaxxing") ? 'page' : undefined} className={`bh-nav-button hidden min-h-10 items-center rounded-md px-2.5 text-sm hover:bg-accent/10 hover:text-accent sm:inline-flex xl:hidden ${path.startsWith("/benchmaxxing") ? "text-accent" : "text-gray-300"}`}>Benchmaxxing</Link>
          <Link href="/benchmarks" onClick={(e) => jumpToSimpleBenchmarks(e, path)} aria-current={path.startsWith("/benchmarks") ? 'page' : undefined} className={`bh-nav-button inline-flex min-h-10 items-center rounded-md px-2 text-sm max-[359px]:px-1 max-[359px]:text-[13px] hover:bg-accent/10 hover:text-accent sm:px-2.5 xl:hidden ${path.startsWith("/benchmarks") ? "text-accent" : "text-gray-300"}`}>Benchmarks</Link>
          <div className="relative xl:hidden">
            <MenuDetails summary={<summary className="bh-nav-button flex min-h-10 cursor-pointer list-none items-center rounded-md px-2 text-sm text-gray-300 hover:bg-accent/10 hover:text-accent max-[359px]:px-1 max-[359px]:text-[13px] sm:px-2.5">More</summary>}>
              <div className="absolute right-0 top-full z-30 mt-2 grid w-64 gap-1 rounded-xl border border-line bg-panel p-2 shadow-lg">
                {PHONE_MORE.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`rounded-md px-3 py-3 ${path === href ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5'}`}>{label}</Link>)}
                <AccountMenuLink className={`border-t border-line/70 rounded-md px-3 py-3 ${path === "/account" ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5'}`} />
              </div>
            </MenuDetails>
          </div>
          <AccountButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
