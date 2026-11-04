# r252-v187-critic: independent review of the JevBench v1.8.7 candidate

**Verdict: PASS** (no MUST fixes; three non-blocking notes in section 4).
Reviewed commit `0d3770043cf63dc2c4ff3523c3ea1065254476f4` (branch `jobs/jevbench-add-requests-20260919-v187`) on base `0d8675604`, via `git diff 0d8675604..0d3770043`. I changed nothing in the worktree; `git status` is still clean. I did not commit, push, flip, seal, contact anyone or call a model API.

## 1. What I did
I rebuilt the scoring independently on Sandy. I read the builder's `score.sh`, `setup_score.py` and `prepare.py`, but I did not use `setup_score.py`: it writes into the worktree. I wrote my own score tree, copied the sealed raw, the frozen cost basis and the registry, and ran the builder's `score.sh` with the paths pointed at my dir. The rest of the review ran against a read-only copy of the candidate (a public-only copy of the worktree, git-free), which I deleted afterwards.

## 2. Evidence by check
1. **Re-score: all numbers match.**
   - Raw sha256 `5b54e44b…bb`, 1,500 rows, verified before use. Scorer hashes: score_v16 `02132271…`, score_v17 `6363458d…`, pricing_v15 `2f52370f…`. O1S, B 1000, seed 16, g-med-fixed 2.573387642438244, 10 s limit in share and off views.
   - My share-view row against the published `nvidia/nemotron-3.5-super-vl` row, compared field by field (every nested numeric leaf, tolerance 1e-12): only 3 differences, all expected public-text replacements (`cost.basis`, `listing`, `not_ranked_because`).

   | Axis | My value | CI |
   |---|---|---|
   | Intelligence | 60.3746 | 53.78–65.46 |
   | Calibration | 58.7629 | 54.19–62.56 |
   | Speed | 81.9775 | p50 0.6273 s, p95 1.0111 s |
   | Capability | 59.5687 | 54.73–63.51 |
   | Composite A | 53.285 | 51.01–54.98 |
   | Composite B | 53.397 | 50.45–55.58 |
   | Composite C | 53.285 | 41.14–54.98 |

   - The off view and frozen view also run (off: Intelligence 60.46, Speed 81.52), consistent with how v1.8.6 rows carry them.
2. **Cost: correct.**
   - (a) From the raw, with my own code: 1,015,566 in / 62,716 out. Full set: 0.10×1,015,566 + 0.40×62,716 = USD 126.6428 per 1M-unit batch, so 0.084428667 USD/1k over 1,500 items. Common set (1,489 items; the 11 excluded ids from the frozen `cost-basis` sha `b83bdfd1…`, which holds 408,428 input and 644 output tokens): 607,138 in / 62,072 out, giving 0.057449698 USD/1k, equal to the scorer's own figure.
   - (b) The common set and basis match the other hosted rows on d1027. `microsoft-decision-1-r2` (tariff, 1,489-item common set, all-items 0.013138, published 0.013173) and `decide-1.1` (tariff) use the same set. `proof.cost_basis` is identical to v1.8.6 (`set_sha256 4e912731…`, 1,489, frozen at v1.7.16). Strike-1 also states common and all-items costs.
   - (c) No GPU-time min(). `pricing_v15.resolve()` gives `counting_list_price` True, `floor_binds` False, `market_reference` None, `candidate == usd == 0.0844287`.
   - (d) Cost axis 47.22: it sits on the same log-linear curve as microsoft (0.0132 → 66.41) and strike-1 (0.0340 → 54.06); the fitted slope predicts 47.21.
   - The brief's ≈0.0844 is the full-set figure; the published 0.0574 is the common-set figure, and the row text states both. This is the same convention as the other rows.
3. **Row facts: correct.**
   - Key `nvidia/nemotron-3.5-super-vl`, `api_flag` true, `endpoint_kind` api, `ranked` false, `listing` unranked, `rank` null and all `ranks` (A/B/C/capability) null.
   - The unranked note string equals strike-1's exactly. `repo` and `model_pin` are `https://openrouter.ai/nvidia/nemotron-3.5-super-vl`, with no `{REF}` and no other row's pin.
   - Cross-checked against the dispatch receipt (1,500 ok, 56 dropped 429s, guard_stop false), the validate receipt (VALID, tokens, zero reasoning tokens) and the spec (reasoning off, provider order Crusoe, no fallbacks, bf16 only, 0.10/0.40).
4. **Slash-key alias: correct.**
   - `JEV_SYSTEM_SLUG_ALIASES` gains the key → `nemotron-3.5-super-vl`, so the page is `/jev-models/nemotron-3.5-super-vl`, with a permanent redirect from `/jev-models/nvidia/nemotron-3.5-super-vl`.
   - No collision: no key equals the slug or contains it or is contained by it. The only other Nemotron keys are `nemotron-deciffusion-8b-v2` and `nemotron-diffusion-8b`, and the ImageJev lane has no such slug.
   - The captured page has the canonical link `https://benchmarkheaven.com/jev-models/nemotron-3.5-super-vl`. The sitemap and llms-full use `jevSystemPath` (I confirmed `jevSystemPath(key)` yields the slug path from the SEO data) and `isRedirectedJevPath` keeps the redirect source out of the sitemap.
   - The `jevbench-system-pages` change is a tight `deepEqual` with the added second redirect. It is the correct expectation, not a loosened one. This test is not in the builder's own heavy-run list, but it passed in my PENDING and PASS runs.
5. **Disclosures 1–5: all visible on the rendered model page** (`preview/nemotron-3.5-super-vl.html`).
   - The row's disclosure and endpoint-condition text cover: reasoning disabled (item holder's requirement), Crusoe bf16 via OpenRouter with every response checked, and strict json_schema, temperature 0 and max_tokens 4096.
   - The quoted system prompt matches `vendor/jevbench/adapters/openai_compat.py` `_SYSTEM` word for word, and temperature 0, max_tokens 4096 and `strict: True` json_schema are in that adapter.
   - Germany-origin latency (p50 0.63 s, p95 1.01 s, max 31.2 s, 2 decisions over 10 s) matches my values, and the 56 re-sent 429s are stated.
   - Tariff, engine usage, pricing sha `2f52370f…` and fetch time `2026-11-03T05:45:33Z` are all on the page.
   - Deviation 2 (the forbidden words "custodian", "deputy" and `#id` replaced by "holder of the sealed items" and "launch-list-price interpretation (I-1; authority recorded in the release proof)") is acceptable. The authority is kept in `proof.pricing_authority` = "deputy #27032/#27088 …".
   - Deviation 3 (licence "Hosted API through OpenRouter; the weights licence is not assessed here (see the model page)") is honest and not invented. Other hosted rows have None or a short note.
6. **Invariance: confirmed.**
   - 337 carried rows: zero leaf differences against v1.8.6 (exact equality, my own walk). `board.A/B/C/capability` order lists, `n_ranked` and `G_med` are equal. Only `roster_count` and release metadata differ at top level.
   - The diff has 145 added files (`100644`) and no deletions. The only edits to existing non-test files are the wiring files and the two additive data edits (architecture +1 entry, draw-equating v1.8.7 release plus latest_release), so no historical artifact is changed.
   - Pricing 455ee38b → 2f52370f: I loaded both modules. The only differing constant is `LAUNCH_LIST_PRICE_API` (+1 member, the new key); the catalog is equal; the file diff is a comment plus that member.
   - Top five, my own run of the builder's scripts on my copy: 580 lists compared, 0 changed; 0 of 76 sliders; 0 of 368 grid states; custom weightings unchanged.
7. **Gates: all re-run here, all pass.**
   - Validator: PASS, 64 negative controls.
   - Focused PENDING suite (the heavy-run list plus `jevbench-system-pages`): 172 tests, 171 pass, 0 fail, 1 skipped. The skip is the "unreviewed build is not published" test.
   - Synthetic-PASS (post-flip) tree: same 172 tests, 171 pass, 0 fail, 1 skipped.
   - TSC: exit 0.
   - Deterministic rebuild: two rebuilds are byte-equal, and the rebuilt outputs match the committed bytes.
   - `check_public_text`, `check_ref_pin` and the public-text exception unit tests pass. `check_raw_pricing` passes against my raw copy (the builder's copy was removed).
   - Pin grep: every older release test that pins the latest release uses the same helper pattern, and v187 appears in all of them (`jevbench-feed-live-board`, `v170`, `v1637`, `cr-205`). Older release tests (v180–v186) are prefix-invariant. Both PENDING and PASS runs of v180–v186 pass.
   - LeChonk build binding: `FINAL-TRANSPORT-BINDING.json` lists 78 files. I hashed each against the git blob at `0d3770043` and all 78 match. They cover every changed non-test, non-r198 file. I did not run a full build on Sandy.
8. **Privacy: clean.**
   - No `.jsonl`, key or env files in the diff and no symlinks (all modes are 100644).
   - None of the 1,500 sealed task ids or the 11 excluded ids appears in any added or modified file.
   - The diff names the sealed directory only as paths (scripts, pins and the transport audit) and as sha256 pins, the same as the v1.8.6 pattern. No sealed content was copied in.
9. **Flip readiness: no non-version change.** I compared `approval`, `flip_verdict`, `freeze` and `seal` `_v187.py` against the v186 ones with version substitution.
   - `flip_verdict`, `freeze` and `seal` are identical after substitution.
   - `approval` differs only in the new-row key and the approval text, which is exactly `GO (standing; no top-five change; Florian work order #20965)`.
   - `proof.publication_approval` = `{fresh_baseline: v1.8.6, status: <that text>, top_five_effect: unchanged}`. `publication.json` is PENDING and unpublished, as it should be before the flip.

## 3. Files I changed
None in the worktree. My worker dir holds `RESULT.md`, `RESULT.json`, `CLEANUP.json`, `score.sh`, `score.log`, `tsc.log`, `pending-tests.log`, `postflip-tests.log`, `before.sha` and `mine/` (aggregates and logs only, no sealed rows).

## 4. Non-blocking notes (none changes the verdict)
- The row publishes the common-set cost (0.0574) while the brief's ≈0.0844 is the full-set figure. This follows the d1027 convention and the row states both, so I agree with the builder's reading. Whoever flips should expect 0.0574 on the board.
- `check_raw_pricing_v187.py:7` hard-codes the builder's private `score/runs` path, which is deleted. A later re-run needs the raw copy regenerated, or a path change; the receipt result I reproduced (PASS) is correct.
- The flip approval relies on the standing GO. The proof's `pricing_authority` still says "independent review and v1.8.6 merge required"; v1.8.6 is already merged. This review satisfies the independent-review half.

## 5. Cleanup
All private copies (sealed raw copy, cost-basis copy, scorer outputs, cells, registry; 20 files) were shredded, and my read-only tree copy (785 MB; symlinks only unlinked) was removed. See `CLEANUP.json`.
