# OpenRouter endpoint withdrawal review — 2026-09-15

The retried daily run `/opt/benchmarkheaven-daily/runs/2026-09-15T06-40-44-069Z-2182058`
passed the catalog gate and then failed closed in `fetch-or` on seven per-model endpoint
sets. Source responses are untrusted data.

## Method

A read-only probe (07:00Z) fetched the catalog and every one of the 445 models' endpoint
resources with the collector's identity rule (`provider_name/tag/quantization`) against
the committed snapshot (`data/raw/openrouter.json`, collected 2026-09-14, commit
`3b58d83`). All 445 returned HTTP 200. Each model with an absent prior identity was
fetched twice more, about 3 s apart, with a cache-busting query. All three responses
gave the same identity digest. Catalog response sha256 `128223bf…3675` is unchanged
from the catalog review. It is the same 445-ID set.

Machine-readable review: `endpoint-withdrawal-review.json`. Captured bodies and receipts
(response bytes only, no request headers): `evidence/`.

## Findings: exactly seven withdrawals, no others

| Model | Endpoints | Withdrawn identity | Provider still serves | Added (not replacements) |
| --- | --- | --- | --- | --- |
| `deepseek/deepseek-chat-v3-0324` | 4 → 3 | `Crusoe/crusoe/bf16/bf16` | 6 other models | — |
| `deepseek/deepseek-v4-flash-0731` | 28 → 27 | `Parasail/parasail/fp8/fp8` | 37 other models | — |
| `deepseek/deepseek-v4.1-flash` | 16 → 17 | `Io Net/io-net/fp8/fp8` | 4 other models | `Phala/phala/unknown`, `Reka/reka/fp4/fp4` |
| `meta-llama/llama-3.3-70b-instruct` | 12 → 11 | `Crusoe/crusoe/bf16/bf16` | 6 other models | — |
| `tencent/hy3` | 6 → 6 | `DeepInfra/deepinfra/fp8/fp8` | 77 other models | `DeepInfra/deepinfra/fp4/fp4` |
| `z-ai/glm-5.1` | 15 → 14 | `Crusoe/crusoe/fp8/fp8` | 6 other models | — |
| `z-ai/glm-5.2` | 33 → 32 | `Crusoe/crusoe/fp8/fp8` | 6 other models | — |

## Conclusion

These are not partial responses:
- Every resource answered 200 with a stable, repeated body.
- Each model lost exactly one identity.
- The provider concerned still serves other models in the same probe.

So each is a model-specific withdrawal, not an outage or a truncated list.

`tencent/hy3` is the case to watch. DeepInfra now lists an fp4 endpoint in place of fp8.
The fp4 endpoint is a different quantization and a new identity, so it is **not** treated
as a replacement for the withdrawn fp8 endpoint.

`data/raw/source-change-approvals.json#openrouter_endpoints` gains seven entries. Each one:
- names only its single removal;
- binds that model's complete prior and current identity digests;
- binds this review file's sha256;
- expires `2026-09-16T05:00:00Z`, together with the catalog approval.

Any other missing identity, or a different current set, still fails closed. No collector
code was changed. Historical observations are not deleted; earlier snapshots remain in
git history.
