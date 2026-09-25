'use client';

import { useId, useState } from 'react';
import Link from 'next/link';

export function JevBoardGuides({ links }: { links: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <nav aria-label="JevBench decision guides" data-bh-jev-board-guides>
    <button type="button" className="mt-2 flex min-h-11 items-center text-sm font-medium text-accent sm:hidden"
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} data-bh-jev-board-guides-toggle>
      {open ? 'Hide' : 'Explore'} JevBench guides <span className="ml-1" aria-hidden="true">{open ? '↑' : '↓'}</span>
    </button>
    <div id={id} className={`${open ? 'grid' : 'hidden'} mb-1 gap-2 pl-3 text-sm sm:mt-4 sm:mb-0 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:pl-0`}>
      {links.map(({ href, label }) => <Link className="text-accent underline" href={href} key={href}>{label}</Link>)}
    </div>
  </nav>;
}
