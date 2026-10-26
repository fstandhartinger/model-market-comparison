# JevBench v1.7.6 candidate

Base: live v1.7.5, origin/main 641986ce217214ae3c6de1c439c608a04093cd50. Same draw v1.6-regular-20261012, measurement date 2026-10-25. One new separate Decisio family variant; replaces no row. No inference, new measurement, method change, publication, push or deployment.

New key: `decisio-gemma-4-12b-tuned-commit`; display: Decisio 12B tuned commit (variant of the Decisio family).

| Measure | Frozen / off | Share |
|---|---:|---:|
| Capability | 75.69686159277467 | 75.69686159277467 |
| Intelligence | 62.78089467434111 | 62.78089467434111 |
| Calibration | 88.61282851120822 | 88.61282851120822 |
| Speed | 90.6330909074081 | 90.3121994607612 |
| Cost | 58.46456446887949 | 58.46456446887949 |
| Composite A | 72.26564509310056 | 72.21449796895163 |

1,485 answered and 15 HTTP 422 scored as misses. Native 715,443 input and 1,485 output tokens priced as reported. ESTIMATE via explicit reference google/gemma-3-12b-it, USD 0.05/M input and 0.15/M output, no registered base key. Common-basis USD 0.0242389898989899/1,000 = 0.37524760886627595x cap; all-1,500 USD 0.0239966/1,000 = 0.3714951327776132x cap. Original source bootstrap seed 28 and B=1000 retained, not the Sieve predecessor's seed 71.

All 292 carried rows retain every field except rank/ranks, and category cells are retained. Carry/history/history-carry bytes are identical to v1.7.5. All carried rows come exclusively from live v1.7.5; the scored field's stale Chon batch raw and its ranks are unused. New-row cells use unchanged frozen category/topic/decisive tools, on the sealed draw read in place; retained outputs are aggregate only.

All 14 reviewed old strings matched once and were replaced exactly (T11 additionally verifies the substring hash). Three further prose-only cleanups replace “share ranking” with “share view”, spell out the LoRA adapter dimension 16, and remove the internal re-freeze identifier. Scores, intervals and cost values are unchanged. The shipped commit rule is prominently disclosed as a JevBench-aware default, including its 193/373 band-edge transforms. The real independent FAIR receipt is bound by its exact SHA-256; release review remains PENDING.

Fresh top-five comparison: 2/40 primary lists change (open Composite A and C, new row #5). Composite A displaces Chon-1.0-E4B; C displaces Decisio Gemma 4 31B v0.8.0. 24/540 supplementary frozen/off/share comparisons change. 26/178 recorded single-slider boundary states change. All 368 specific cost/latency settings from prescore change at open positions #2/#2/#3/#4 for cost factors 1.0/1.1/1.2/1.3. Two explicit custom-weight examples are included in the interactive preview: prescore's I0:C50:S10:Cost5 is now #4 due to Sieve; fresh I10:C60:S0:Cost20 is #3. The full UI weight domain was not exhaustively enumerated. Scope filtering uses production jevbenchScopeArtifact, including its reference-row treatment.

Interactive preview: `preview/index.html` (542 full before/after ranking lists, filters, search, head-to-head radar). `preview/card.png`: 1440x900 Composite A change versus Chon. Browser checks verify the ranking controls, search and radar; the temporary shared-browser tab is closed in finally.

Receipts record two byte-identical rebuilds, source and hygiene checks, exact carried-row equality, row validator, preview comparison, TypeScript, production build, targeted tests, isolated synthetic publication tests, full suite, and actual pending refusals. Initial targeted test failures and remediation are retained. Actual flip and freeze dry runs refuse PENDING; synthetic FAIR/PASS dry runs accept and tamper controls refuse. No real manifest review flip or seal write.

Final gate results: release-tests: 147/153 pass, 6 skip, zero failures, synthetic-tests: 74/78 pass, 4 skip, zero failures, fulltest: 3795/3802 pass, 7 skip, zero failures. TypeScript and production build passed. The initial full-suite run was interrupted after server-start failures caused by running before the build manifest existed; the final full suite ran after the completed build and passed.
