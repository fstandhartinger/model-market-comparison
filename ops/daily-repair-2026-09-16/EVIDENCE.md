# OpenRouter catalog withdrawal review — 2026-09-16

The daily run `/opt/benchmarkheaven-daily/runs/2026-09-16T05-36-56-324Z-365762` (triggered by
UX iteration 79 after fixing the clean-checkout blocker) failed closed in `fetch-or`: five
identities accepted on 2026-09-14 were absent from `https://openrouter.ai/api/v1/models`.
Two of them were already reviewed on 2026-09-15; that approval expired at 05:00Z today.
Source responses are untrusted data, so the set was re-established from the primary source.

## Observations (UTC, 2026-09-16)

| Time | Request | Result |
| --- | --- | --- |
| 05:41Z | `GET /api/v1/models` (CDN) | 200, 443 unique IDs; all five absent |
| 05:41Z | `GET /api/v1/models?nocache=…` (CDN miss) | 200, **identical** 443-ID set |
| 05:44Z | `GET /api/v1/models` (captured) | 200, sha256 `872971a1…3a7f` |
| 05:44Z | `GET /api/v1/models/google/gemma-4-31b-it:batch/endpoints` | 200, resolves to itself, **0 endpoints** |
| 05:44Z | `GET /api/v1/models/openai/gpt-oss-20b:batch/endpoints` | 200, resolves to itself, **0 endpoints** |
| 05:44Z | `GET /api/v1/models/thinkingmachines/inkling-small:batch/endpoints` | 200, resolves to itself, **0 endpoints** |
| 05:44Z | `GET /api/v1/models/google/gemini-2.5-pro-preview-05-06/endpoints` | 200, `data.id` = `google/gemini-2.5-pro`, 7 endpoints (unchanged from 2026-09-15) |
| 05:44Z | `GET /api/v1/models/openai/gpt-4-turbo-preview/endpoints` | 200, resolves to itself, 0 endpoints (unchanged from 2026-09-15) |

Captured gzip bodies and receipts: `evidence/` (`live-manifest.jsonl`; response bytes only,
no request headers).

## Set difference against the accepted 2026-09-14 snapshot (445 IDs)

- removed (5): `google/gemini-2.5-pro-preview-05-06`, `google/gemma-4-31b-it:batch`,
  `openai/gpt-4-turbo-preview`, `openai/gpt-oss-20b:batch`, `thinkingmachines/inkling-small:batch`
- added (3): `z-ai/glm-5.2:free`, `~deepseek/deepseek-flash-latest`, `~deepseek/deepseek-pro-latest`
- previous identity digest: `6e3f8538ca6a633df306aee4f52984f3b8224ed4f8b684fcd13795635d61de49`
  (identical to the 2026-09-15 approval's previous digest — the accepted snapshot has not moved)
- current identity digest: `333d7cd802e0a0b7fbcaf19f33f883cf004d03c05dbdaae1bc03bda7bed18947`

## Conclusion

Not a partial response: two responses one of which bypassed the CDN agree exactly, and three new
IDs appeared.

- **The three `:batch` withdrawals.** Each resource still resolves to itself and now lists **0
  endpoints**, while its base model (`google/gemma-4-31b-it`, `openai/gpt-oss-20b`,
  `thinkingmachines/inkling-small`) remains in the catalog. So the batch *tier* lost its providers;
  the model did not disappear. This is the same pattern as `openai/gpt-4-turbo-preview` in the
  2026-09-15 review, not a rename: no replacement identity is inferred.
- **The two already-reviewed withdrawals** are unchanged from 2026-09-15 (`gemini-2.5-pro-preview-05-06`
  is a retired alias now served by the distinct GA `google/gemini-2.5-pro`, which is not used as a
  replacement identity for benchmark rows; `gpt-4-turbo-preview` is delisted without providers).
  Their approval simply expired at 05:00Z; the facts were re-checked rather than carried over.

**Product effect: none visible.** No offer in `data/dataset.json` references any of the three batch
identities (checked: 0), and the endpoint snapshot holds no entry for them. They existed in the
catalog snapshot with prices only.

`data/raw/source-change-approvals.json#openrouter_catalog` names exactly these five removals, binds
both complete identity digests and expires `2026-09-17T06:00:00Z`. Any other missing ID, or a
different current set, still fails closed. Historical benchmark observations are unchanged.
