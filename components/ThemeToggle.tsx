"use client";
import { useState, useEffect } from 'react';

/** F-15: an icon-only 40×40 toggle. The label lives in aria-label/title, not in the header,
 *  where the boxed "◐ Dark" button was the heaviest element on the page. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme || 'dark'), []);
  const light = theme === 'light';
  const label = theme == null ? 'Switch color theme' : light ? 'Switch to dark theme' : 'Switch to light theme';
  return <button type="button" className="bh-nav-button inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-300 hover:bg-accent/10 hover:text-accent max-[359px]:w-9" aria-label={label} title={label} onClick={() => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next; setTheme(next);
    try { localStorage.setItem('bh-theme', next); } catch { /* The active theme still works without storage. */ }
  }}>
    {light
      ? <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
      : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
  </button>;
}
