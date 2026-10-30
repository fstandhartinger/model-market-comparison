# JevBench v1.8.0 local release build

This pipeline changes the cost basis of self-hosted open weights using their verified original scored token basis. It runs no inference, makes no production API calls and writes no seals during the build.

- `rebuild_v180.sh`: deterministic aggregate-only rebuild and publication-gated site integration. Inputs are frozen under `inputs/`. Every API row is fixed except rank fields; encoders and architectures outside the six calibrated Gemma/Qwen classes keep their costs. Cost-related row changes and board orders have before/after SHA pins.
- `validate_v180.mjs`: actual candidate validation and negative controls, including API/cap/min()/D5/basis/encoder mutations and unbound approval.
- `heavy_v180.sh`: disposable heavy-run gates, production build, real page capture and one full suite. Synthetic PASS/GO exists only in the private `.pass` fixture. The real review and approval stay PENDING.
- `fill_approval_v180.py --card ID --selection TEXT --recorded-at UTC --go-quote VERBATIM`: the release owner binds a real decision to the screenshot manifest, exact results SHA and full list comparison. It changes only the approval/proof binding and loader hashes; previewed result bytes remain unchanged, and review is not flipped.
- `flip_verdict_v180.py RECEIPT --dry-run`: refuses a PENDING or stale approval even in dry-run mode. A real flip remains the release owner's action.
- `freeze_v180.py`: dry inspection only; refuses PENDING approval/review.
- `seal_v180.py`: prepared for the release owner; NEVER executed by the build worker. The vault follows the latest 27 October draw because this restatement spans draws, matching the v1.7.22 convention.

The current `/jev-models` route is the open-weights board; `/jev-models/all` is the combined board. Previews capture both actual pages plus an explicit open view and the methodology page at 1440×900 full-page, marked candidate/PENDING.

`rows-validation.csv` includes all release rows. `topfive-diff.json` includes all 580 primary/supplementary lists with top-five and top-ten comparisons against v1.7.23. Slider transition boundaries include both old and new costs; grid and custom weight comparisons are separate receipts. The reference model snapshot is hash-pinned rather than silently refreshed during the build.

Affected composite intervals are withheld rather than repurposed from the old-cost bootstrap. Intelligence and Calibration intervals remain unchanged. This limitation is explicit in each affected row, methodology and worker result.

The reported eligible-open count excludes the two Jev reference rows: 217 open models, while the open page fold labels 219 in-cap systems including those references. The headline total of ranked open systems also includes rows outside the caps.

The full suite ran once: 3,996 tests, 3,983 pass, three failures, ten skips. The two SEO failures were fixed by following current eligibility instead of historical over-cap labels and resolved by 26 passing targeted tests; SEO-FIXES-EXIT.json binds the source and original log hashes. The expressly accepted Git-less checkout failure remains. The final production build and unobstructed captures use the corrected source.
