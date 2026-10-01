# Cited base models (CR-254)

`data/jevbench-base-models.json` records the base model for each evaluated system key, scoped to `jevbench` or `imagejevbench`. Every disclosed value has a public model card, author statement, README or configuration citation and a short evidence paraphrase. The renderer shows `undisclosed` when no verified base identity is recorded. An inspected source may still be linked for an undisclosed entry.

The initial review on 1 October 2026 covers all 109 current text systems and three incomplete or unmeasured listings and all 50 current image entries: 86 text and 36 image bases are disclosed. A separate historical image key, `imajev_4b_20260926`, remains undisclosed; it must not inherit the current Imajev checkpoint's metadata. Hosted operator disclosures are labelled as operator-reported where weights cannot be verified publicly.

Check the evaluated variant before updating an entry. A later model card can describe a different base: the evaluated `kev-4b` uses the author's `qwen3` card, rather than the newer main card. Names, architectures, benchmark-maintainer pricing assumptions and unrelated comparison models are insufficient evidence. Do not infer a parent from them. Keep the original public evidence receipt and record conflicts in the job report.

Both leaderboards, capability information panels and detail pages use `BaseModelDisplay` and `lib/jev-base-model.mjs`. Image details live at `/image-jev-bench/<system-key>`. The provenance endpoint `/api/jevbench/base-models` exposes both scopes. Existing content-hashed result APIs and frozen benchmark artifacts remain unchanged; this metadata does not enter score, rank, cost or latency calculations.

Validation: `node --test test/cr-254-base-model-display.test.mjs`; the release queue also runs TypeScript, the production build and the complete test suite. A new benchmark artifact requires reviewing its distinct system keys and the current-artifact expectations in this regression test.
