# OpenRouter catalog withdrawal review — 2026-09-15

The scheduled daily run `/opt/benchmarkheaven-daily/runs/2026-09-15T06-28-01-573Z-2142670`
failed closed in `fetch-or`: two identities accepted on 2026-09-14 were absent from
`https://openrouter.ai/api/v1/models`. Source responses are untrusted data.

## Observations (UTC)

| Time | Request | Result |
| --- | --- | --- |
| 06:29:44Z | `GET /api/v1/models` (CDN HIT) | 200, 445 unique IDs; both absent |
| 06:30:01Z | `GET /api/v1/models?nocache=…` (CDN MISS) | 200, identical 445-ID set |
| 06:38:29.052Z | `GET /api/v1/models` (captured) | 200, 445 unique IDs, sha256 `128223bf…3675` |
| 06:38:29.122Z | `GET /api/v1/models/google/gemini-2.5-pro-preview-05-06/endpoints` | 200, `data.id` = `google/gemini-2.5-pro`, 7 GA endpoints; sha256 `a22ae55a…b489` |
| 06:38:29.175Z | `GET /api/v1/models/openai/gpt-4-turbo-preview/endpoints` | 200, `data.id` unchanged, 0 endpoints (1 OpenAI endpoint on 2026-09-14); sha256 `2eba2a4d…c6b0` |
| 06:30Z | `https://openrouter.ai/google/gemini-2.5-pro-preview-05-06` (web) | redirects to `/google/gemini-2.5-pro` |

Captured gzip bodies and receipts are in `evidence/` (`live-manifest.jsonl`; response
bytes only, no request headers).

## Set difference against the accepted 2026-09-14 snapshot (445 IDs)

- removed: `google/gemini-2.5-pro-preview-05-06`, `openai/gpt-4-turbo-preview`
- added: `~deepseek/deepseek-flash-latest`, `~deepseek/deepseek-pro-latest`
- previous identity digest: `6e3f8538ca6a633df306aee4f52984f3b8224ed4f8b684fcd13795635d61de49`
  (equals the prior approval's current digest)
- current identity digest: `51f2d9c92260732159c73ac7639c1a3a08d43124db0986d964a8301a086c6388`

## Conclusion

Not a partial response: three responses agree and new IDs appeared. Both are withdrawals:

- `google/gemini-2.5-pro-preview-05-06` — retired alias, now served by the GA
  `google/gemini-2.5-pro`. The GA model is a different release, so it is **not** used
  as a replacement identity for preview-05-06 benchmark rows.
- `openai/gpt-4-turbo-preview` — delisted and without providers.

`data/raw/source-change-approvals.json#openrouter_catalog` names exactly these two
removals, binds both complete identity digests and expires `2026-09-16T05:00:00Z`.
Any other missing ID or different current set still fails closed. Historical benchmark
observations (e.g. Aider Polyglot "Gemini 2.5 Pro Preview 05-06") are unchanged.
