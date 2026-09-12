Round 1 (critic z-ai/glm-5.3-flash, verdict "revise", errors_found 3) raised F1..F5.
Owner responses:

- F1 (major) — **Not a correctness error; wording disambiguated.** F1 asserted the report's
  "8 bridges" contradicts the controlled experiment's 67. They are two different code
  paths and scopes. The 60 live estimates use `crossVersionEstimates`, whose bridge set is
  the configurations measured on BOTH `aa-coding-agent-index::1.4` and `::1.5`; that set is
  exactly 8 and, verified from the dataset, is the same 8 for every cohort axis on that
  version pair (Cursor CLI n=4, Codex n=21, Claude Code n=23, Gemini CLI n=1, Opencode n=6,
  Antigravity/Grok/Muse×2/Devin n=1 each). The 67 belongs to the controlled experiment's
  `datedEstimates` path, which bridges all 67 common rows of two retained states of the SAME
  benchmark id. The report now states both paths and counts explicitly and says they are not
  a contradiction. See the revised "Real dataset facts" sentence.

- F2 (major) — **Accepted and fixed.** `data/SCHEMA.md` now says the `historical` object
  appears "whenever date-provenance is available — at least one retained dated state, or at
  least two versions of a benchmark family among the current observations", and the
  Limitations section now says "With a single retained state only the cross-version bridge
  path is live; dated-state estimates additionally require a second, distinct state."

- F3 (minor) — **Accepted and fixed.** `data/SCHEMA.md` and the report now state that for
  rank shifts the 25 % limit applies to the ABSOLUTE IQR on the 0–1 rank scale
  (`iqr_relative = iqr`), not to an IQR relative to the median as for ratio bridges.

- F4 (minor) — **Accepted and hardened.** `computeRankShift` in `lib/benchmark-history.mjs`
  now filters bridge pairs to those whose `old_value`/`new_value` are present on the
  respective sorted boards, so a missing value can no longer be silently ranked at last
  place. A new test asserts a bogus pair is dropped (`bridge_count` 5, not 7).

- F5 (minor) — **Accepted and fixed.** The report now says **11 tests** and lists all 11,
  including the previously unlisted model-key identity test and the new missing-rank test.

Round-2 task: verify F2, F3, F4, F5 are truly resolved and confirm F1 is correctly
adjudicated (not merely re-worded around) by checking the dataset counts and the two code
paths. Raise only real, unrepaired defects; do not re-raise a repaired point unless the
repair is wrong.
