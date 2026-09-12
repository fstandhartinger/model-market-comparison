/** R7.1 / R7.3 — the mark from Florian's 2026-09-12 artwork, re-drawn as SVG so it stays
 *  crisp at 36 px and follows the theme. The geometry is generated and documented in
 *  `scripts/build-brand-assets.mjs`, which writes the same shape to `public/brand/*.svg`,
 *  the favicon and the OG image; keep the two in step when the artwork changes.
 *
 *  Colours come from CSS variables (`--brand-*` in globals.css), so switching the theme
 *  switches the mark with it — no second component, no flash of the wrong logo. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="Benchmark Heaven" role="img" focusable="false">
      <defs>
        <linearGradient id="bhCloud" gradientUnits="userSpaceOnUse" x1="12" y1="56" x2="52" y2="24">
          <stop stopColor="var(--brand-from)" />
          <stop offset="1" stopColor="var(--brand-to)" />
        </linearGradient>
        <clipPath id="bhCut"><rect x="0" y="0" width="64" height="55.5" /></clipPath>
      </defs>
      <g stroke="var(--brand-ray)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M19.1 26 12.8 21.5" /><path d="M22.8 23 17.7 16.8" /><path d="M27.3 20.9 24.3 13.3" />
        <path d="M32 20.1V8.5" />
        <path d="M36.8 20.9 39.7 13.3" /><path d="M41.2 23 46.3 16.8" /><path d="M44.9 26 51.2 21.5" />
      </g>
      <g clipPath="url(#bhCut)" fill="url(#bhCloud)">
        <circle cx="32" cy="38.6" r="16.2" />
        <circle cx="14.1" cy="45.3" r="11.3" />
        <circle cx="49.9" cy="45.3" r="11.3" />
        <rect x="14.1" y="38.6" width="35.8" height="16.9" />
      </g>
      <g fill="var(--brand-stair)">
        <rect x="33.9" y="33.8" width="7.7" height="1.6" rx="0.6" />
        <rect x="31.8" y="35.9" width="8.8" height="1.4" rx="0.6" />
        <rect x="29.2" y="38.1" width="10.6" height="1.6" rx="0.6" />
        <rect x="26.2" y="40.5" width="12.5" height="2.3" rx="0.6" />
        <rect x="22.5" y="43.6" width="14.9" height="2.9" rx="0.6" />
        <rect x="18.3" y="47.2" width="17.3" height="3.3" rx="0.6" />
        <rect x="13.8" y="51.5" width="19.8" height="4" rx="0.6" />
      </g>
    </svg>
  );
}
