# Checks-only evidence for root draft PR #258 at exact head abea5464fd1c4652a40c44a38c08fd269a9cc450

No app source or benchmark artifact edits. Earlier evidence in ../pr258-63d0c1ed is preserved.

## Delta 63d0c1ed..abea5464
3 files, +10/−6. The exact diff is in `delta-63d0c1ed-abea5464.diff`.

- `JevHistoricalSupplement` now passes `domain={RADAR_SIGNED_DOMAIN}` and plots `cell.competence` directly instead of `Math.max(0, …)`. The desc text is updated.
- `JevRadars`: the spoke line runs to `at(i, domain[1])`, which is identical for every existing domain because the top is always 100.
- The scope checks in the last test are updated.

## Logs
Full logs are in `logs/` and the exit codes in `exits.txt`.

| Check | Result |
| --- | --- |
| Targeted tests | 31/31 pass, exit 0 |
| `tsc` | exit 0 |
| `build` | exit 0 |
| Full `npm test` after the build | 2288 tests: 2287 pass, 0 fail, 1 skipped, exit 0 |

## Screenshots
Taken with `next start` on localhost:3918 and headless Chrome via Python Playwright (`shoot2.py`), at 390×844 and 1440×1000.

- The priority banner was first captured over the page as it normally loads (`banner-visible-*.png`). It was then dismissed with its real close button (aria-label "Close priority evaluation banner for this session"), not hidden with CSS.
- /jev-models/v1.5.7 historical supplement rows checked: XOR 26B-A4B NVFP4 and Wald Q4B v1.1, as requested. janus-08b-gpu and decision2-kai-0.6b were added because XOR and Wald have no negative or zero cells.

## Observations (all pre-existing, not changed by this delta)
- The supplement uses its own `category_min_n` = 15, not 30.
- In the single-series supplement key, gap spokes (n < 15 or no cell) print no value text at all, neither n=… nor n/a.
- The historical data contains no exact-zero cells.
