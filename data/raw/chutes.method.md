# Chutes (chutes.json)

First-party Chutes inference offers, refreshed from the live model catalog and verified
against the corresponding public Chute pricing metadata on **2026-07-22**.

## Refresh

```bash
curl -s https://llm.chutes.ai/v1/models \
  -H "Authorization: Bearer $CHUTES_API_KEY" \
  | jq '.data[] | {id, chute_id, root, in: .price.input.usd, out: .price.output.usd, cache_read: .price.input_cache_read.usd, ctx: .context_length, tee: .confidential_compute}'
```

- The 2026-07-22 response contained 13 models — identical IDs, prices, and context lengths
  to the 2026-07-12 snapshot (no additions, removals, or price changes). The IDs in
  `chutes.json` are the complete
  response: no locally retained model is absent from the live catalog, and no live model is
  omitted. The endpoint currently also responds without authentication, but the refresh uses
  the documented bearer-token form. Never print or commit the token.
- The endpoint exposes Chutes' **confidential-compute (TEE)** catalog. Every live entry has
  `confidential_compute: true` and an `-TEE` suffix in its `id`; retain both facts as
  `confidential_compute: true` and `tee_model_id` rather than inferring TEE status from the
  base model name.
- `price.input.usd` / `price.output.usd` / `price.input_cache_read.usd` were copied into
  `input_per_1m_usd` / `output_per_1m_usd` / `cache_read_per_1m_usd`. To verify both the
  values and their unit, fetch the corresponding
  first-party metadata using the returned `chute_id`:

  ```bash
  curl -s "https://api.chutes.ai/chutes/$CHUTE_ID" \
    -H "Authorization: Bearer $CHUTES_API_KEY" \
    | jq '.current_estimated_price.per_million_tokens | {input: .input.usd, output: .output.usd, cache_read: .input_cache_read.usd}'
  ```

  On 2026-07-22 all 13 catalog values matched
  `current_estimated_price.per_million_tokens` exactly. The stored prices are therefore USD
  per 1 million input/output/cache-read tokens. On this snapshot every cache-read price is
  exactly 50% of the corresponding input price; the values are still stored explicitly so a
  future pricing change is not hidden by an inference rule.
- `model_name` is the base model with the vendor prefix and the `-TEE` / `-FP8` quant
  suffix removed (e.g. `zai-org/GLM-5.1-TEE` → `GLM-5.1`) so the offer attaches to the
  existing model family in the comparison. Serving labels that are not the benchmark family
  name are normalized as well (for example `google/gemma-4-31B-turbo-TEE` →
  `gemma-4-31B`). Keep the exact live id in `tee_model_id`.
- To check whether a specific model is hosted anywhere on Chutes (beyond the TEE LLM
  catalog), query the full chute registry with a name filter:
  `curl -s "https://api.chutes.ai/chutes/?include_public=true&limit=500&name=Kimi" -H "Authorization: Bearer $CHUTES_API_KEY"`.
  Note: the `search=` parameter is ignored; use `name=`. On 2026-07-22 the only Moonshot
  chutes were Kimi-K2.6-TEE and Kimi-K2.5-TEE — `moonshotai/Kimi-K3` is NOT hosted.
- All Chutes offers are flagged `tee: true` by the build script; Chutes is added to
  `DIRECT_PLATFORM_PROVIDERS` so its OpenRouter-routed (non-TEE) duplicate is suppressed.

## TEE across other providers

The build script also flags OpenRouter-routed **Phala** endpoints as `tee: true`.
**Venice is deliberately not marked TEE**: its privacy/no-retention positioning is not
evidence that these model endpoints execute inside an attested trusted environment.
Hyperscalers (AWS Bedrock, Google Vertex) only offer confidential **VMs you
self-host on**, not a managed TEE inference API; Azure has managed confidential inferencing
but in preview and not for these chat models; GitHub Copilot and the Anthropic API have no
user-facing TEE today.
