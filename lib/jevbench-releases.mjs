// Florian 10 Oct 2026: release numbers no longer sit as tabs on top of the board; they are a dated release history.
// Every archived release page keeps its URL and shows a short bar pointing to the current merged board.
export const JEVBENCH_RELEASES = Object.freeze([
  { version: 'v1.6.17', date: '2026-10-13', href: '/jev-models/v1.6.17', text: 'Second regular draw, + 6 systems (4 ranked, 2 listed but not ranked; 17 full-draw rows, same frozen field median): Amos 1 large (Scira), Amos 1 medium (Scira), metask-jev-rain-31B-trained service v3, pjev-2b, Sage 1.4 (Levanto Labs), SubQ Snap (preview, SubQ). One paid fast-lane re-submission is disclosed as such; hosted rows above the Jev-class cost cap are ranked and disclosed. Metask service v3 (paid) enters the default Capability top five at #3. Amos 1 large enters the API cost-off Capability top five at #1 with Florian GO. The unranked Microsoft A2 measurement is carried through unchanged.' },
  { version: 'v1.6.16', date: '2026-10-13', href: '/jev-models/v1.6.16', text: 'Second regular draw, + vLLM-SR d3 (11 full-draw rows, same frozen field median). Highest Capability of the draw, but its estimated cost is far above the Jev-class cap, so it is outside the default Capability ranking and its composite is small. Restated by v1.6.17.' },
  { version: 'v1.6.15', date: '2026-10-13', href: '/jev-models/v1.6.15', text: 'Second regular draw, + three self-hosted CPU systems (10 full-draw rows; one of them listed but not ranked because its Speed figure is not official). The unranked Microsoft A2 measurement is carried through unchanged. Restated by v1.6.16.' },
  { version: 'v1.6.14', date: '2026-10-12', href: '/jev-models/v1.6.14', text: 'Seven official rows unchanged, plus a separate unranked Microsoft A2 preliminary measurement (equating pool 4 of 6). Restated by v1.6.15.' },
  { version: 'v1.6.13', date: '2026-10-12', href: '/jev-models/v1.6.13', text: 'Second regular draw, + attest-31B-v1.0 (7 systems, same frozen field median). Merged into the live board.' },
  { version: 'v1.6.12', date: '2026-10-12', href: '/jev-models/v1.6.12', text: 'Second regular draw, + Torchcast Decision 4B (v1.1) (6 systems, same frozen field median). Restated by v1.6.13.' },
  { version: 'v1.6.11', date: '2026-10-12', href: '/jev-models/v1.6.11', text: 'Second regular draw, + Uniphore-4B-Decider (5 systems, same frozen field median). Restated by v1.6.12.' },
  { version: 'v1.6.10', date: '2026-10-12', href: '/jev-models/v1.6.10', text: 'Second fresh regular draw: 4 paid self-hosted rows (own field median); restated by v1.6.11.' },
  { version: 'v1.6.9', date: '2026-10-10', href: '/jev-models/v1.6.9', text: 'Regular draw, + jiwo 0.8b/4b and ClassOne Qwen 3.5 2B/4B and Gemma 4 E4B (16 systems, same frozen field median). Merged into the live board.' },
  { version: 'v1.6.8', date: '2026-10-10', href: '/jev-models/v1.6.8', text: 'Regular draw, + modernbert-jev v2 (11 systems); restated by v1.6.9.' },
  { version: 'v1.6.7', date: '2026-10-10', href: '/jev-models/v1.6.7', text: 'Regular draw, + Blink v0.3 26B-A4B (10 systems); restated by v1.6.8.' },
  { version: 'v1.6.6', date: '2026-10-10', href: '/jev-models/v1.6.6', text: 'Regular draw, + Clef-omni (9 systems); restated by v1.6.7.' },
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
