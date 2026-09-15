# Florian directive — mobile portrait table tags

**Decision recorded:** 2026-09-15 UTC

## Problem

In the **Simple** overview table, the comparison tag/bubble can overlap adjacent table content in mobile portrait view. Example: `↓ 11× cheaper`.

## Required behaviour

- Preserve the desktop/tablet presentation exactly as it is.
- In mobile portrait only, render a compact tag such as **`↓11×`** (no “cheaper” text and no space).
- The compact mobile tag must remain understandable and accessible: preserve an explanatory accessible label and/or tooltip such as “11× cheaper”.
- Do not hide or truncate the underlying price, score, rank, or other table cells.
- It must work for up/down and other relevant comparison directions, without horizontal page overflow or overlap at common portrait widths, including 320 px, 375 px, and 390 px.

## Acceptance evidence

1. Visual checks of Simple overview at 320×844, 375×844, and 390×844 portrait show no tag overlap or clipped cell content.
2. Desktop/tablet captures demonstrate the full existing tag text remains unchanged.
3. Automated tests cover the responsive label/accessible-name behaviour where feasible; build, typecheck, and live production verification pass.
