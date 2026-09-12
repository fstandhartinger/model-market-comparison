# Benchmark Heaven brand

Use **Benchmark Heaven**, two title-case words. The domain is **benchmarkheaven.com**. Do not abbreviate the product to MMC. The GitHub repository and on-disk project paths retain `model-market-comparison` for compatibility.

**Every benchmark result for every model — and what each one actually costs.**

## Direction: Observatory

The arch frames a field of measurements; three bars suggest comparison without pretending to be actual data. The baseline anchors the mark. This is an observatory for published evidence, not a promise that any model is best. The final small-size mark omits the concept star to keep its silhouette clear at 16 pixels.

[Three visual concepts](../public/brand/variants.svg) compare Observatory, Cloudline and a BH monogram. Observatory ties the name to the product's analytical purpose. Cloudline feels more like a cloud hosting service; the monogram is compact but tells a new visitor little about the product. The selected production geometry is refined separately in [mark.svg](../public/brand/mark.svg).

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

- [Navigation/favicons master](../public/brand/mark.svg), mirrored in `components/BrandMark.tsx` and `app/icon.svg`.
- [README wordmark](../public/brand/wordmark.svg), with an explicit dark backplate so it works in both GitHub themes.
- [Social source](../public/brand/og-image.svg) and 1200 × 630 [PNG](../public/brand/og-image.png).
- `app/apple-icon.png`: 180 × 180 touch icon.

Keep the mark square and undistorted. Leave at least one quarter of its width as clear space in standalone artwork. Decorative SVGs are hidden from assistive technology when adjacent text supplies the name. Use meaningful alt text on standalone images.

## Voice

Calm, precise and curious. Explain what a comparison can establish and make its limits easy to find. Use “estimated task cost”, “source”, “observed on” and “not published” where applicable. Distinguish vendor claims from measurements. Avoid “definitive”, “most accurate”, “verified daily” or “best model” without evidence. Never decorate a brand asset with made-up scores.

The product says “Find the model that meets your benchmark threshold”; a result explains the threshold, price inputs and original source dates. The README and API notices state exactly what moved. German Telegram templates use Benchmark Heaven and retain the quiet notification policy.
