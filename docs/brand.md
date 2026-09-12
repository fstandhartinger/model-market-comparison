# Benchmark Heaven brand

Use **Benchmark Heaven**, two title-case words. The domain is **benchmarkheaven.com**. Do not abbreviate the product to MMC. The GitHub repository and on-disk project paths retain `model-market-comparison` for compatibility.

**Every benchmark result for every model — and what each one actually costs.**

## Direction: Stairway (2026-09-12)

The mark is Florian's own artwork, delivered on 2026-09-12 and kept in the repository at
`ops/ux-2026-09-12/assets/benchmark-heaven-logo-light.jpg`: a staircase of white treads
climbing through a blue-to-cyan cloud, with a seven-ray sun rising behind it. Benchmarks are
steps, each one measured; the climb is the point, not any single rung.

It replaces the earlier **Observatory** arch. The three concepts that led to Observatory are
kept for the record in [variants.svg](../public/brand/variants.svg); they are history, not
the current identity.

The production SVG is **re-drawn from the artwork, not traced or embedded**: the cloud is
three circles cut off at a flat bottom edge, the staircase is seven treads and the rays use
the endpoints measured in the JPEG. Every coordinate and the measurement transform are
documented in `scripts/build-brand-assets.mjs`, which is the single generator for the
navigation mark, the favicon, the touch icon, the PWA icons, the README wordmark and the
social image. Re-run it after any change to the artwork:

```
node scripts/build-brand-assets.mjs --png
```

One deliberate departure from the artwork: the rays are drawn 1.8 units wide in a 64-unit
viewBox where the original measures 1.25. At 1254 px the original rays are 16 px; at a 36 px
navigation logo that is half a pixel and they disappear. The heavier stroke keeps the mark
recognisable down to 16 px.

**Dark mode.** The artwork is a light-background logo. The dark variant is ours: the cloud
gradient and the rays are lifted in luminance (`#2a68ff → #5ae6ff`, rays `#ffd95c`, treads
pure white) so the mark keeps the weight it has on white instead of sinking into the page.
Both palettes live in `--brand-*` CSS variables in `app/globals.css`, so `BrandMark` switches
with the theme without a second component.

## Color and typography

The existing accessible chart palette becomes part of a coherent editorial identity. These values are implemented in `app/globals.css`; color never replaces score labels, units, source flags or chart line patterns.

| Role | Dark | Light |
| --- | --- | --- |
| Canvas | `#0e131b` | `#f5f8fc` |
| Panel | `#171e29` | `#ffffff` |
| Text | `#edf2f8` | `#182639` |
| Muted text | `#adb9ca` | `#4c5e75` |
| Sky / links and focus | `#6caeff` | `#1d4eb9` |
| Sea glass / supporting emphasis | `#67e0c1` | `#046d5b` |
| Amber / caveats | `#ffc56f` | `#914509` |

Use Georgia, then Times New Roman/serif, for the wordmark and display headings. Use the operating system sans-serif stack for navigation, controls and data; retain tabular numerals. No font request or remote font dependency. Platform font fallbacks can change letterforms. Social artwork is rasterized once from the checked-in SVG for predictable sharing.

## Mark and assets

All of these are written by `scripts/build-brand-assets.mjs`; edit the generator, not the files.

- [Light mark](../public/brand/mark.svg) and [dark mark](../public/brand/mark-dark.svg), mirrored in `components/BrandMark.tsx` (which uses the CSS variables instead of fixed colours).
- `app/icon.svg`: the favicon — the mark on the brand ink square, so it keeps a silhouette on a white tab strip.
- `app/apple-icon.png` (180 × 180) and `public/brand/icon-192.png` / `icon-512.png` for the web manifest.
- [README wordmark](../public/brand/wordmark.svg) with a dark backplate, plus [a light-backplate variant](../public/brand/wordmark-light.svg).
- [Social source](../public/brand/og-image.svg) and 1200 × 630 [PNG](../public/brand/og-image.png).
- `public/brand/mark-light-512.png` / `mark-dark-512.png` for places that cannot take an SVG.

The wordmark sets **Benchmark** in ink and **Heaven** in brand blue, as the artwork does; the
navigation applies the same split with `.bh-wordmark-accent`.

Keep the mark square and undistorted. Leave at least one quarter of its width as clear space in standalone artwork. Decorative SVGs are hidden from assistive technology when adjacent text supplies the name. Use meaningful alt text on standalone images.

## Voice

Calm, precise and curious. Explain what a comparison can establish and make its limits easy to find. Use “estimated task cost”, “source”, “observed on” and “not published” where applicable. Distinguish vendor claims from measurements. Avoid “definitive”, “most accurate”, “verified daily” or “best model” without evidence. Never decorate a brand asset with made-up scores.

The product says “Find the model that meets your benchmark threshold”; a result explains the threshold, price inputs and original source dates. The README and API notices state exactly what moved. German Telegram templates use Benchmark Heaven and retain the quiet notification policy.
