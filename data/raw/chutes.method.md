# Chutes (chutes.json)

First-party Chutes inference offers, sourced from the public model list.

## Refresh

```bash
curl -s https://llm.chutes.ai/v1/models | jq '.data[] | {id, root, in: .price.input.usd, out: .price.output.usd, ctx: .context_length, tee: .confidential_compute}'
```

- This endpoint exposes Chutes' **confidential-compute (TEE)** catalogue. Every entry has
  `confidential_compute: true` and an `-TEE` suffix in its `id` — the models run inside a
  Trusted Execution Environment (Intel TDX CPU + NVIDIA H100/H200 confidential computing),
  so the host/operator cannot see prompts or weights.
- `price.input.usd` / `price.output.usd` are **already per 1M tokens** (USD) — copy them
  straight into `input_per_1m_usd` / `output_per_1m_usd`.
- `model_name` is the base model with the vendor prefix and the `-TEE` / `-FP8` quant
  suffix removed (e.g. `zai-org/GLM-5.1-TEE` → `GLM-5.1`) so the offer attaches to the
  existing model family in the comparison. Keep the original id in `tee_model_id`.
- All Chutes offers are flagged `tee: true` by the build script; Chutes is added to
  `DIRECT_PLATFORM_PROVIDERS` so its OpenRouter-routed (non-TEE) duplicate is suppressed.

## TEE across other providers

The build script also flags OpenRouter-routed **Phala** and **Venice** endpoints as
`tee: true` — these are the other genuine managed-TEE inference providers currently present
in the data. Hyperscalers (AWS Bedrock, Google Vertex) only offer confidential **VMs you
self-host on**, not a managed TEE inference API; Azure has managed confidential inferencing
but in preview and not for these chat models; GitHub Copilot and the Anthropic API have no
user-facing TEE today.
