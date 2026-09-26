'use client';

import { useId, useState } from 'react';
import Link from 'next/link';

export function JevBoardGuides({ links }: { links: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // F-197 (pass 36): the guides fold behind the toggle at every width ('hidden sm:flex' always showed them
  // above 640 px); the links stay in the HTML for crawlers and screen readers.
  return <nav aria-label="JevBench decision guides" data-bh-jev-board-guides>
    <button type="button" className="mt-2 flex min-h-11 items-center text-sm font-medium text-accent"
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} data-bh-jev-board-guides-toggle>
      {open ? 'Hide' : 'Explore'} JevBench guides <span className="ml-1" aria-hidden="true">{open ? '↑' : '↓'}</span>
    </button>
    <div id={id} className={open ? 'mb-1 mt-3 grid gap-2 pl-3 text-sm sm:mt-4 sm:mb-0 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:pl-0' : 'hidden'}>
      {links.map(({ href, label }) => <Link className="text-accent underline" href={href} key={href}>{label}</Link>)}
    </div>
  </nav>;
}
