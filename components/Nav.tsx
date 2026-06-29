"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Overview"],
  ["/compare", "Compare"],
  ["/scatter", "Cost vs Capability"],
  ["/charts", "Charts"],
  ["/providers", "Providers per Model"],
  ["/provider-explorer", "Provider explorer"],
  ["/gateways", "Gateways"],
  ["/eu", "EU & Sovereign"],
  ["/about", "About"],
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-[#12161c]">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-accent">◆</span> Model Market Comparison
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 ${active ? "bg-accent/15 text-accent" : "text-gray-300 hover:bg-white/5"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
