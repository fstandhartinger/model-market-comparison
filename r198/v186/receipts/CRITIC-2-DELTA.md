# v1.8.6 delta review: PASS

Reviewed only `dc1fe2b616a75e3f35c037dd0aece5976168df32..81cfab681162dc14327ccf2a60bdd276f88d00fb`. Both C1 and C2 are satisfied. No blocking finding.

Actual reviewer: **Codex**, not Claude. `RESULT.json` reports the actual engine; the brief's requested Claude label is retained separately as requested_engine_label.

## What I checked

- **C1:** independently read the sealed raw's usage aggregates and verified sha256 `468550e45a233ea1182e61c564bc3d60a92e05b6545a392db0283739ff15477a`; 1,500 items, 753,547 in / 72,602 out; common 1,489, 717,572 in / 72,041 out. No sealed item text or ids printed or copied. At exactly USD 1.5235/h, 10,106.516129 tok/s and 70% load, rate = 0.059819178473256074 USD/M. Common GPU-time = **0.03172196170033791 USD/1k**, all = **0.03294636965100135**; list common = 0.059822310275352585; min still selects GPU-time. No 1.52354 or 999/730 remains in current v186 scripts/source/data or the delta worker's setup script. Historical original-builder scripts are outside this delta.
- All 69 changed scored numeric leaves are expected cost effects; maximum change 0.0003713584583948659. Intelligence, calibration, speed and capability remain exact in frozen/off/share. All two-decimal values remain identical. Directly recomputed all nine A/B/C composites and all weighted views; verified every composite CI endpoint with the constant-cost reciprocal shift from the frozen harmonic formula, maximum error **5.69e-14**. All duplicate CI fields agree. Share cost axis 54.959198906753414, A 73.80660695738636, B 76.25695957781033; C=A. No fresh private re-score claimed.
- **C2:** exact requested text appears at the end of both disclosure and endpoint_condition, with only `leaderboard` changed to `benchmark`. The public-text gate indeed forbids substring `lead`. Checked the final sentence against the original brief and the customer's DISCLOSURE.md: W4A16 QAT base, unmerged rank-16 LoRA, 49% stateful drafting quota, fuse from decision 101, USD 0.0646/1k limit and USD 0.0598/M pricing all agree. Verified script-stripped rendered HTML and viewed the PNG: the sentence is visible in both sections.
- All 35 changed files are confined to v186 data, loader, scripts, receipts and previews. All 336 carried rows match both the first candidate and v1.8.5, including 184,764 numeric/bool/null leaves; 590 historical files unchanged, zero text exceptions. Category cells and board ordering unchanged; only their expected source/result hash bindings changed.
- Publication manifest file hashes match actual bytes. REMOTE-SOURCE-BINDING and FINAL-TRANSPORT-BINDING each match all 81 source files, and the inventory equals every changed behavior source since v1.8.5. ACTUAL-FIXTURE-SOURCE-BINDING matches all 84 root files and the actual built fixture outside its explicit synthetic publication/overlay exceptions. Every preview HTML/PNG hash (six files) and results hash matches the preview manifest. These bind the committed LeChonk build/capture receipts to this candidate. I ran no production build.

## Commands and real results

All mutating gates ran in **one disposable public-only checkout**; the reviewed worktree remained untouched.

| Check | Command / evidence | Result |
|---|---|---|
| Independent numeric and raw aggregate checks | `python3 audit.py`, `python3 all_numeric.py`, `python3 -B cost_check.py` | PASS; AUDIT.json, all-numeric.log, raw-usage-check.log |
| Delta structure and source inventory | `python3 delta_structure.py`, `python3 source_scope.py` | PASS; STRUCTURE.json, source-scope.log |
| Validator | `node r198/v186/validate_v186.mjs` | PASS; 61 negative controls rejected; validator.log |
| Source invariance | `python3 -B r198/v186/check_source_v186.py` | PASS; 336 / 184764 / 590; source.log |
| Public text / reference pin | check_public_text_v186.py / check_ref_pin_v186.py | PASS; public-text.log, ref-pin.log |
| Primary and supplementary top-five | topfive_v186.mjs before/after, extended_preview_v186.mjs, slider_preview_v186.mjs, custom_preview_v186.mjs, compare_v186.py | **0/580 lists; 0/76 sliders; 0/368 grid**, custom unchanged; compare.log and topfive-diff.json |
| Deterministic double rebuild | `python3 -B r198/v186/check_repro_v186.py` plus compare each generated hash to reviewed worktree | PASS; all 15 hashes match commit; rebuild.log, REBUILD.json |
| TypeScript | `tsc --noEmit --incremental false` | exit 0; tsc.log |
| PENDING suite | same 16 test files as heavy_v186.sh, node --test --test-concurrency=4 | **145 tests, 144 pass, 0 fail, 1 known historical skip**; pending-tests.log |

Gate wrappers: gates.py and resume_gates.py. Owned bounded units: v186-delta-critic-public-gates (stopped at missing dependency path before TSC), v186-delta-critic-remaining-gates (TSC and PENDING suite completed). The missing dependency path was repaired only in the disposable copy by linking the existing shared install; no download or source fix was needed. The complete synthetic PASS test suite was not rerun by me; its committed builder receipt is 145/144/0/1. Synthetic PASS primary assembly was independently rerun.

## Files changed / cleanup / limits

Only this worker directory contains new files: RESULT.md, RESULT.json, CLEANUP.json, STATE.md, audit and gate scripts, public JSON evidence and logs. No reviewed worktree file was edited, committed or pushed. One ~4.5 GB disposable checkout was deleted; shared dependencies retained. CLEANUP.json records deletion. No private scorer output or raw copy was created, so there was nothing private to shred. No spend, model calls, contact, board posts, publication, seal, flip or deployment.

The two committed scoring helper scripts still refer to the delta worker's private score directory, whose inputs were shredded. That existing worker-local setup pattern is disclosed and not a delta blocker: recreate private inputs before rerunning those helpers. Approval, sealing and publication remain the lead's responsibility.
