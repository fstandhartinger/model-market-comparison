// Florian 10 Oct 2026: release numbers no longer sit as tabs on top of the board; they are a dated release history.
// Every archived release page keeps its URL and shows a short bar pointing to the current merged board.
export const JEVBENCH_RELEASES = Object.freeze([
  { version: 'v1.6.6', date: '2026-10-10', href: '/jev-models/v1.6.6', text: 'Regular draw, + Clef-omni (9 systems, same frozen field median). Merged into the live board.' },
  { version: 'v1.6.5', date: '2026-10-10', href: '/jev-models/v1.6.5', text: 'Regular draw (v1.6-regular-20261010-a2): 8 new open-weights systems; restated by v1.6.6.' },
  { version: 'v1.6.4', date: '2026-10-10', href: '/jev-models/v1.6.4', text: 'Fast-lane draw (v1.6-fastlane-20261009), completed: 6 systems incl. 2 wrappers. Merged into the live board.' },
  { version: 'v1.6.3', date: '2026-10-10', href: '/jev-models/v1.6.3', text: 'Fast-lane draw, 5 systems; superseded by v1.6.4.' },
  { version: 'v1.6.2', date: '2026-10-09', href: '/jev-models/v1.6.2', text: 'Fast-lane draw, first 4 systems; superseded by v1.6.4.' },
  { version: 'v1.6.1', date: '2026-10-06', href: '/jev-models/v1.6.1', text: 'Full re-measure on the v1.6.0 draw: hosted APIs on the full set. The reference scale of the live board.' },
  { version: 'v1.6.0', date: '2026-10-05', href: '/jev-models/v1.6.0', text: 'Rotating sealed item sets, API-exposure rule, Noul decisiveness, language view, dated carry.' },
  { version: 'v1.5.7', date: '2026-10-04', href: '/jev-models/v1.5.7', text: 'Last v1.5 point release.' },
  { version: 'v1.5.6', date: '2026-10-03', href: '/jev-models/v1.5.6', text: 'v1.5 point release.' },
  { version: 'v1.5.5', date: '2026-10-02', href: '/jev-models/v1.5.5', text: 'v1.5 point release.' },
  { version: 'v1.5.0–v1.5.4', date: '2026-09-28', href: '/jev-models/v1.5.4', text: 'v1.5 method (Composite, Capability Score, Jev-class caps); v1.5.1–v1.5.4 on 29 Sep.' },
  { version: 'v1.4–v1.4.2.2', date: '2026-09-23', href: '/jev-models/v1.4.2.2', text: 'v1.4 series.' },
  { version: 'v1.0', date: '2026-09-19', href: '/jev-models/v1', text: 'First JevBench board.' },
]);

export const jevbenchRelease = (version) => JEVBENCH_RELEASES.find((r) => r.version === version) ?? null;
