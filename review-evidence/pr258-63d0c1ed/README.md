# Checks-only evidence for root draft PR #258 at exact head 63d0c1ed7e4e3e670b9f5cd31659e1c8b588461a

No app source in this bundle. Recorded in a cloud VM working copy (detached at the exact head); the owner branch was not modified.

- The original PR #257 commit 1093d480 has the same tree (f0b33366…) as root's 3e2dd719, so the original change is preserved.
- Delta 1093d480..63d0c1ed: 4 files, +18/−12.
  - New caption wording.
  - Request-type and both tier competence figures also pass the fixed [−100, 100] domain.
  - The last test now checks those 3 figures.
  - No data, rank, count, min-n or gap changes.

| Check | Result |
| --- | --- |
| Targeted tests: 6 new signed-domain tests, radar-display-fix, fable-pass25, radar | 31/31 pass, exit 0 |
| `tsc --noEmit` | exit 0, no output |
| `npm run build` | exit 0 |
| Full suite on the head, after the build | 2288 tests: 2287 pass, 0 fail, 1 skipped, exit 0 |
| Full suite on the head, with `.next` moved away | 3 fail, exit 1 |
| Full suite on main 0889ec3d, not built (same VM) | 2282 tests: 2278 pass, 3 fail, 1 skipped, exit 1 (the same 3) |
| Full suite on main 0889ec3d, after its build | 2281 pass, 0 fail, 1 skipped, exit 0 |

The 3 tests that fail without a build are `benchmark-model-links`, `imagejev-page-structure` and `jevbench-mcp-endpoint`. They read the production build output, so they fail only when no build exists.

Screenshots come from `next start` on localhost:3917 and headless Chrome (`/usr/bin/google-chrome`) driven by Python Playwright (`shoot.py`), at 390×844 and 1440×1000. The fast-lane banner was hidden with CSS during capture. Measured values are in `results.json`.
