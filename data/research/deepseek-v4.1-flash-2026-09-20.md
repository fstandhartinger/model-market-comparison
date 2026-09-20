# DeepSeek-V4.1-Flash first-party facts — read 2026-09-20

Primary source: <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/raw/main/README.md> — DeepSeek's own
model card, published 2026-09-10 (the Hugging Face repository's `createdAt` and `lastModified` are both that
day). Release note: <https://api-docs.deepseek.com/news/news260910/>. Both documents are captured under
`data/raw/benchmarks/daily-evidence/2026-09-20-deepseek-v41-flash/`, robots-honouring, original bytes.

This note exists because of **CR-85** — Florian asked why DeepSeek V4.1 Flash had almost no scores on
Benchmark Heaven. The cause was at the source: Artificial Analysis publishes an Intelligence Index for the
model but `null` for its coding, agentic and most per-benchmark fields. **CR-85.2** asks for the model's
other primary sources, explicitly including "DeepSeek's release notes/model card (self-reported, mark as
vendor-reported)". That is what this ingestion is.

DeepSeek describes V4.1-Flash as a multimodal Mixture-of-Experts model with 552B backbone parameters, a
Causal Encoder-Decoder architecture activating 8B parameters per token during prefill and 16B during decode,
and a one-million-token context. The release note adds that V4-Flash and V4-Flash-Vision-Exp are retired and
that `deepseek-v4-flash` requests are served by V4.1-Flash. No independent price or speed claim from these
documents is used: the Artificial Analysis figures already in Benchmark Heaven stay independently sourced.

## What the card says about how it evaluated

All instruct results are at the card's maximum reasoning effort — `reasoning_effort=100`, `temperature=1.0`,
`top_p=0.95` — which is exactly the catalog's only DeepSeek-V4.1-Flash configuration, `deepseek-v4.1-flash::max`.
The card names the scaffold per board: DeepSeek Harness in Minimal mode with a 1M-token context for the
Terminal-Bench versions, NL2Repo-Bench and ProgramBench; mini-SWE for DeepSWE v1.1 "to align with official
setup requirements"; the Claude Code harness for SEC-Bench Pro and, with a 512k-token context, for the visual
agent benchmarks; the official scaffolds for Agent's Last Exam and AutomationBench. Terminal-Bench 2.1 is
evaluated without network access. Each row's `protocol` repeats its own scaffold and says nothing the card
does not say.

## The 19 claims ingested

Every one is **DeepSeek's own figure**, vendor-reported and unverified. Where the card prints a version, the
registry identity keeps it; where it prints none, the identity is the card's own publication date rather than
a guessed version, so it can never merge with a differently dated release. Names are copied exactly.

| Benchmark as printed | Score | Registry identity |
|---|---:|---|
| GPQA Diamond (Pass@1) | 90.9% | `deepseek-gpqa-diamond::snapshot-2026-09-10` |
| HLE (Pass@1) | 36.8% | `deepseek-hle::snapshot-2026-09-10` |
| Codeforces (Rating) | 3471 | `deepseek-codeforces-rating::snapshot-2026-09-10` |
| MathArena Apex (Pass@1) | 65.6% | `deepseek-matharena-apex::snapshot-2026-09-10` |
| Terminal-Bench 2.1 (Pass@1) | 90.6% | `deepseek-terminal-bench-v2-1::2.1` |
| Terminal-Bench 3.0 (Pass@1) | 30.0% | `deepseek-terminal-bench-v3::3.0` |
| Terminal-Bench 4.0 (Pass@1) | 31.2% | `deepseek-terminal-bench-v4::4.0` |
| DeepSWE v1.1 (Resolved) | 74.2% | `deepseek-deepswe-v1-1::1.1` |
| ProgramBench (Almost@1) | 20.3% | `deepseek-programbench-almost-at-1::snapshot-2026-09-10` |
| NL2Repo-Bench (Score) | 64.0 | `deepseek-nl2repo-bench::snapshot-2026-09-10` |
| CyberGym (Pass@1) | 88.1% | `deepseek-cybergym::snapshot-2026-09-10` |
| SEC-Bench Pro (Pass@1) | 62.8% | `deepseek-sec-bench-pro::snapshot-2026-09-10` |
| ExploitGym (Pass@1) | 15.3% | `deepseek-exploitgym::snapshot-2026-09-10` |
| HLE w/ tools (Pass@1) | 63.9% | `deepseek-hle-w-tools::snapshot-2026-09-10` |
| AutomationBench (Pass@1) | 54.8% | `deepseek-automationbench::snapshot-2026-09-10` |
| Agent's Last Exam (Pass@1) | 31.8% | `deepseek-agents-last-exam::snapshot-2026-09-10` |
| Chartography w/ tools (Pass@1) | 78.9% | `deepseek-chartography-w-tools::snapshot-2026-09-10` |
| BabyVision w/ tools (Pass@1) | 89.6% | `deepseek-babyvision-w-tools::snapshot-2026-09-10` |
| ZeroBench-main w/ tools (Pass@5) | 49.0% | `deepseek-zerobench-main-w-tools::snapshot-2026-09-10` |

Independently measured, matching-version scores replace these self-reported values as soon as they exist;
they are never averaged together, and none of them reaches the Composite.

## What the same document publishes that we did **not** ingest, and why

- **The HLE text-only subset.** The card prints `36.8 (39.1†)` with the footnote "† Text-only subset of HLE".
  36.8 is the full-dataset figure and is the row we carry; 39.1 is a different task set and is not carried as
  a second row under the same identity.
- **The base-model evaluation table** (AGIEval, MMLU-Pro, C-Eval, SimpleQA-Verified, BBH, DROP, HumanEval,
  GSM8K, MATH, LongBench-V2, MMMU-Pro, DocVQA and the rest for DeepSeek-V4.1-Flash-Base). The catalog carries
  only the instruct configuration; a base checkpoint is not that model.
- **The per-scaffold table** (DeepSWE v1.1 and Terminal-Bench 2.1 across Claude Code, Codex, OpenCode, Pi,
  mini-SWE and three DeepSeek Harness modes). It breaks down two results we already carry; ingesting it would
  publish one result several times under one identity. The headline table's own scaffold is in each protocol.
- **The Opus-5.0, GPT-5.6 Sol, K3 and GLM-5.3 columns.** A vendor's claim about another lab's model. Only the
  publishing lab's own models are ingested as self-reported claims.
- **The DS-V4-Pro and DS-V4-Flash columns.** These are DeepSeek's own older models, but the card prints no
  checkpoint, and the catalog carries two candidates for each (`deepseek-v4-pro::max` / `deepseek-v4-pro-0813::max`,
  `deepseek-v4-flash::max` / `deepseek-v4-flash-0731::max`). The identity is ambiguous, so nothing is joined.

## Provenance and review

`ops/ux-2026-09-12/bin/build-deepseek-v41-flash-claims.mjs` rebuilds the registry entries and the observations
offline from the capture alone: it verifies the capture against its manifest digest, finds the card's own
"Comparison with frontier models (Max reasoning effort)" table, locates the `DS-V4.1-Flash` column by its
printed header and reads each value out of it. No value is typed into the script; the script decides identity
only. It refuses to run if a reviewed label is no longer printed in the capture.

Two different-family critic slices reviewed the rows against the quoted document —
`ops/rebuild-2026-09/evidence/deepseek-v41-flash-2026-09-20-review-{1,2}.json`, `z-ai/glm-5.3-flash`,
producer `anthropic/claude-opus-5`, 10 + 9 rows, `errors_found: 0` on both. The critic is deliberately not a
DeepSeek model, since DeepSeek is the vendor under review.
