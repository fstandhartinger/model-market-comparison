# JevBench v1.6.43 candidate: SubQ Snap 1.1

Base: `1da05e6fc76807aad3287524dc0edbee7317b956` (live v1.6.42). Worker branch: `fusion/jevbench-add-requests-20260919-v1643-build`. Engine recorded by the worker runner: `codex gpt-6.1-sol medium`. Candidate only: independent review PENDING and publication authority PENDING. No seal, authority flip, CR, push, PR, merge, deployment, author message, provider dispatch, pod or spending.

## Release and measurement

79 listed / 68 ranked rows. The 78 published predecessor rows are preserved exactly except `rank`/`ranks`, including confidence intervals, costs, diagnostics and last-measured dates. Their categories are preserved exactly. The hosted GLiDE row is carried from its derived-gold release without attempting to score it on the real gold. Its raw hash and frozen registry entry are verified as part of the predecessor.

One unmodified frozen-scorer field run uses 74 carried same-draw rows plus SubQ Snap 1.1 on the original 1,500-item gold, O1S, B=1000, seed 16, fixed G_med 9.839526770355711 and frozen 1,485-item common cost basis. All 74 carried scores, axes, capability, cost, speed, intelligence, calibration, Noul decisive diagnostics, category cells and topic/use-case cells reproduce exactly. Published predecessor intervals stay exact; the new row uses the new full-field bootstrap seed.

New-row computational spec is pinned to `r168/v1641/batch/REGISTRY-SUBQ11.json` SHA `b35e419b13135db0004585fad2fc05c31cf2c034b3a4217ddf31af23f858d3ff`. That preliminary spec copied stale preview provenance; only public explanatory metadata is replaced. Lane, endpoint kind, support, price/price kind, rankability, base model and other computational fields remain exact. Point estimates and all category cells are also compared independently with the earlier single-row run.

Raw SHA `5c00dc93acc4afe74679b55d1eb512bc51822d1772cf9d1f3590264127d77584`: 1,500 unique answered rows, exact gold membership, HTTP 200 throughout, native probabilities, served model subq-snap-1.1 throughout, usage present throughout, 1,939,205 input tokens / 0 output. Raw stays outside Git, symlinked only. Price uses unchanged frozen pricing module `aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7`, own usage, USD 0.04/M input and free output. Common-basis 759,310 input / 0 output tokens, USD 0.020452794612794613 per 1,000 decisions; all-item USD 0.051712133333333334. Total measured all-item charge at the tariff is USD 0.0775682. No promotional credit is counted. The pinned spec's `cost_kind`/`price_kind` remain unchanged.

Public row text discloses the capacity-limited public preview and waitlist, same-author second use, prior sealed exposure on 13 Oct, preview name now pointing to the same version, historical preview's unchanged USD 0.05/M tariff, and S/P results: sealed -0.75 pp, public +1.67 pp, gain gap -2.42 pp, 95% CI [-6.00,+1.17] pp, not flagged. No job path, board number, card number or item identifier appears in new public row text. All 1,500 answered once; permission errors never reached the model. No decision exceeds 10 seconds; the v1.6 method does not apply a 10-second cutoff.

Prior independent review evidence is hashed in `receipts/PRICING-DECISIONS.json`. Scope matters: `r168-review` is overall FAIL because of the separate hosted GLiDE driver, but its SubQ source/pricing section is PASS_WITH_CONDITIONS and independently confirms both vendor sources and unchanged-code pricing equivalence. `r168-review4` is the subsequent GLiDE-driver PASS, not a new SubQ release review. The installed pricing receipt confirms the live re-freeze and 9/9 tests; the current preparation checks the exact installed module SHA. This candidate's independent release review remains PENDING.

## Fresh top-five comparison: refreshed GO required

Both the approved v1.6.40 preview and this v1.6.42-based candidate change the same 14/40 lists. SubQ is the only cause; open-weights lists remain unchanged. On combined and release composite A/C, SubQ now enters at #5 rather than #4, displacing Nimble-v4-max rather than Drex Max. Composite B and all affected API lists retain #4. These four differences are material to the earlier approved preview. Approval comparison conservatively requires a refreshed GO.

Exact before/after rankings: `receipts/topfive-before.json`, `topfive-after.json`, `topfive-diff.json`, `TOPFIVE-V1643.md`. Historical comparison: `receipts/APPROVAL-COMPARISON.json` and `preview/APPROVAL-COMPARISON.md`. Interactive full rankings, 40 comparisons and axis/topic/use-case radars: `preview/preview-full-ranking.html`. The preview visibly states that a refreshed GO is required.

The historical card and button details are recorded only in internal proof/receipt fields. Real `publication_approval.status` is PENDING. The new reader requires authority PASS independently of manifest review PASS; a synthetic review alone cannot authorize publication. `make_passtree_v1643.sh` changes both gates and the resulting proof hash bindings only in a disposable, ignored test copy. No actual approval is asserted.

## Site changes

New release results, categories, proof, immutable history and history-carry copies, PENDING manifest, release reader/validator, API route, archived page, rank fixture and release tests. Wire scripts update release list, nav, history availability, category revision lists, cohort reader, draw-equating latest-release metadata and architecture provenance. The closed API has no disclosed base model; no base-model claim is invented. Test changes update only latest-release expectations, counts and the merged-board fixture.

Older topic readers for v1.6.38/39/40 accept the new supplement stamp only under their existing carried-cell hashes. v1.6.42 receives the same protection with independently derived JavaScript-canonical hash `5c21c371d522c43684e3132acc8a40962402ce657466dd13023fc1733cb744f1`. No old publication/result/proof/category file is changed.

## Verification

See `receipts/GATES.txt` and `GATES-run.log` for actual exit codes and per-gate logs. `VERIFY.log` checks deterministic aggregate rebuilding, source hashes, manifest bindings, all carried rows and pending authority. `VERIFY-PRIOR.log` checks the prior SubQ row numerics and cells. `REAL-PENDING.log` covers real-tree refusal and mutation validation; synthetic tests run in `pass/`. `SCORE-REPRO.log` records a second complete frozen-scorer pass; reproducibility receipts compare exact output bytes. `IMPLEMENTATION-FIXES.md` retains intermediate failures and corrections.

## Remaining gates and cleanup

A fresh top-five GO and independent release review are required before any publication. They are outside this worker's authority. The parent owns broader asks; this slice does not close any parent ask. Re-run current-base checks if origin/main changes before merge. Final logs remain; cleanup is listed in the worker RESULT.

## Final gate outcomes

- TypeScript: rc 0.
- Synthetic release tests: 17/17; final metadata regeneration revalidated 17/17.
- Real candidate: 16 pass, 1 intentional skip; PENDING refusal verified.
- Targeted regression tests: 279/279, rc 0.
- Production build: rc 0 (552 pages).
- Full suite: 3,655 tests, 3,654 pass, 1 skipped, 0 fail; 546.9 seconds, rc 0. Includes all 17 v1.6.43 tests.
- Repeated frozen field outputs: results, categories and Noul diagnostics byte-identical (FIELD-REPRO.json).
- Deterministic publication rebuild and final hash bindings: PASS.
- Real loader refusal / synthetic 79-row load: PASS.
- Preview JavaScript syntax, required refreshed-GO banner and default SubQ-versus-preview comparison: PASS.
- git diff --check: PASS.

The broad gates used the same final implementation; a subsequent explanatory-only endpoint correction removed the stale geography claim from old registry prose. Its regenerated JSON/proof/hash pins were checked by the final real and synthetic release validators and loader gates. Computational results and field-reproduction outputs did not change.
