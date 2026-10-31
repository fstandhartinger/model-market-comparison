---
license: apache-2.0
base_model:
  - Qwen/Qwen3.5-4B
  - torchcast-ai/torchcast-decision-4b
  - perplexity-ai/pplx-decider-flash-v1.2
  - vllm-sr/d3-mini
tags:
  - decision-model
  - model-soup
  - merge
  - zils
library_name: transformers
---

# z3-mini soup preview

A **preview** of the Zils soup method: a plain, uniform weight average of three
open decision models built on Qwen3.5-4B. This is **not** a z3-mini release.
z3-mini v1 remains the current release. A soup only becomes the next z3-mini after
it passes the release gate.

## What it is

The Zils network builds a "soup" every day: it averages the bodies of different
Qwen3.5-4B decision fine-tunes, adding a model only when the average scores better
with it. This checkpoint is the soup from the first daily round. It contains:

| Ingredient | Author | Licence |
|---|---|---|
| [torchcast-decision-4b](https://huggingface.co/torchcast-ai/torchcast-decision-4b) @ `492bfb1` | torchcast-ai | Apache-2.0 |
| [pplx-decider-flash-v1.2](https://huggingface.co/perplexity-ai/pplx-decider-flash-v1.2) @ `9ff7cf9` | Perplexity | Apache-2.0 |
| [d3-mini](https://huggingface.co/vllm-sr/d3-mini) @ `df99bf4` (z3-mini v1) | vllm-sr | Apache-2.0 |

- **Body:** the uniform average (computed in fp32, saved in bf16) of the three
  models' `language_model.*` and `visual.*` weights.
- **Answer layer, prompt and runtime:** unchanged from d3-mini. The answer layer
  is byte-identical to d3-mini's.
- **Soup hash:** `063e05dc12c15db265de911499582549e6acf02840dccc38dc1edb1482689cd6`

## How it scored

The scores below come from Zils' own private exam: 3,000 decision questions with
labels from real data, across five categories. **They are not public benchmark
results**, and other evaluations may rank these models differently.

| Model | Score (0–100) |
|---|---|
| **This soup** | **74.3** |
| torchcast-decision-4b alone | 72.7 |
| pplx-decider-flash-v1.2 alone | 71.4 |
| d3-mini (z3-mini v1) alone | 69.7 |

| Category | Soup |
|---|---|
| Arts | 76.9 |
| Language | 80.1 |
| Reasoning | 50.7 |
| Retrieval | 87.3 |
| Tools | 84.1 |

On this exam the soup beats each of its ingredients alone: torchcast by 1.6 points,
pplx by 2.9 and d3-mini (z3-mini v1) by 4.6.

## Use

It runs exactly like d3-mini v3.1.0: the same bundled runtime files
(`d3_runtime.py`, `d3_server.py`, …), prompt format and `/v1/systemone` API. Follow the
[d3-mini v3.1.0 usage instructions](https://huggingface.co/vllm-sr/d3-mini/blob/a475367de0d8133a3c1a2a0dc12303d89cfa2ab4/README.md)
and point them at this repository.

## Limits

- **Text decisions only.** The exam is text-only and doesn't measure image, video
  or bounding-box quality. Image and box behaviour may be worse than any one
  ingredient's.
- **Possible benchmark overlap.** The ingredients are third-party models, and their
  training data may overlap with public benchmarks.
- **Not a release.** It hasn't been through the Zils release gate (sealed release
  draws, the confirmation draw and the adapter suite). Adapters trained on z3-mini v1
  are not guaranteed to work on it.

## Licence and credits

Released under Apache-2.0. The licences and NOTICE files of all three ingredients
are included unchanged: `LICENSE`, `NOTICE` (d3-mini), `LICENSE-torchcast`,
`NOTICE-torchcast`, `LICENSE-pplx`, `NOTICE-pplx`, and `LICENSE-qwen-Apache-2.0`.
The Qwen3.5-4B base is by the Qwen team / Alibaba Cloud (Apache-2.0). Thanks to
torchcast-ai, Perplexity and vllm-sr for publishing their models openly.

**Modifications:** the `language_model.*` and `visual.*` weights are the uniform
average of the three ingredients' weights. Every other file (answer layer,
tokenizer, prompt and runtime) is d3-mini's, unchanged. No affiliation with or
endorsement by the ingredients' authors, Qwen or Alibaba Cloud is implied.
