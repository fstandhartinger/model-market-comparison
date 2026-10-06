'use client';
import { useEffect } from 'react';

// Review 6 Oct 2026: anchors into the closed v0.1.5 archive <details> now open it (on load and on hashchange).
export function ImageJevArchiveOpener() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      let opened = false;
      for (let el: Element | null = target; el; el = el.parentElement) {
        if (el instanceof HTMLDetailsElement && !el.open) { el.open = true; opened = true; }
      }
      if (opened) target.scrollIntoView();
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}
