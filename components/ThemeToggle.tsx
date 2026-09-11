"use client";
import { useState, useEffect } from 'react';
export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme || 'dark'), []);
  return <button type="button" className="bh-button w-[88px] text-sm" aria-label="Toggle color theme" onClick={() => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next; setTheme(next);
    try { localStorage.setItem('bh-theme', next); } catch { /* The active theme still works without storage. */ }
  }}><span aria-hidden="true">◐ </span>{theme === 'light' ? 'Dark' : theme === 'dark' ? 'Light' : 'Theme'}</button>;
}
