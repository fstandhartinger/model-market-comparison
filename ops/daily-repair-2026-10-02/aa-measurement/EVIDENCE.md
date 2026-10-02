# CR-261 — AA coding-index withdrawal for Gemma 4 E4B (Reasoning), 2026-10-02

- Failing runs: `/opt/benchmarkheaven-daily/runs/2026-10-02T05-17-01-738Z-2835041` and
  `/opt/benchmarkheaven-daily/runs/2026-10-02T05-48-28-078Z-3064657` (base `1c3c7e4a`), step `fetch-aa`:
  `AA d80eb0f1-…: prior measurement artificial_analysis_coding_index absent; partial response or withdrawal requires review`.
- Primary: `GET https://artificialanalysis.ai/api/v2/data/llms/models`, HTTP 200, both runs byte-identical,
  sha256 `12994e0589f4938846bdc01a692e17656550d31414ce92df51c5d6978c08fa71` (kept in `evidence/`).
- Prior snapshot: committed `data/raw/artificialanalysis.json` (collected 2026-10-01), sha256
  `49d7158d1449a5fa8e2f093e4d2b823835058b5bc40620f0d88703517be524ad`, coding index 9.4.
- Completeness: 689 models; all 688 prior identities present, one new (Grok 4.7 Low). Across all models, the only
  prior numeric evaluation that became null is this one field. Same model newly reports `scicode` 0.244 (a coding-index
  component); intelligence index 8.9 and prices unchanged. AA's leaderboard payload carries no coding index for any
  model, so the API is the only primary for the field.
- Decision: one-field, one-model approval in `data/raw/source-change-approvals.json` (`aa_measurements`), expiring
  2026-10-05T06:00Z. The coding index is published as unknown, not carried forward. Guard code unchanged.
- Regression: real `scripts/fetch-live.mjs aa` replayed offline against the two captured bodies with a fetch hook
  (no live AA request): base approvals → same error; patched approvals → passes the guard and enrichment (689 models).
