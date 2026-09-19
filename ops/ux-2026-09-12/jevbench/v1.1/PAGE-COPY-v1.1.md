# JevBench v1.1 - page copy (approved text for the new sections)

## Lead (replaces the v1 lead)

JevBench is Benchmark Heaven's own benchmark for Jev-class decision models: state and a bounded
rubric in, a typed answer out. Version 1.1 measures 9 systems on 314 decisions and scores
three things - **Capability**, **Speed** and **Cost** - which combine into one **JevBench Main Score**.

## How the Main Score works

Main Score = 0.6 x Capability + 0.2 x Speed + 0.2 x Cost, each on 0-100.

- **Capability** - accuracy in three tiers, averaged so no tier dominates: easy (72 clear-cut
  decisions, new in v1.1), standard (96) and judge (146).
- **Speed** - median and 95th-percentile latency, one request at a time, network included. 0.1 s scores
  100, 1 s scores 50, 10 s scores 0.
- **Cost** - dollars per 1,000 decisions. Metered APIs: the public tariff times the tokens we measured.
  Self-hosted and author-hosted models: an estimate from a stated reference deployment, marked "est.".
  $0.01 scores 100, $1 scores 33, $10 scores 0.

Capability carries most of the weight because a fast, cheap wrong decision is still wrong. The table
below the ranking shows how the order changes under five other weightings.

Calibration (Brier, ECE) is shown for every system that returns a probability distribution. It is not
part of the Main Score: some systems return only a label, and any penalty for that would be our
invention rather than a measurement.

## Headline (numbers from the artifact)

Jev 1.13.0 (TypeSafe AI) leads with a Main Score of 87.6: capability 97.8,
0.65 s median, $0.026 per 1,000 decisions. The best open rebuild,
openjev-sglang (Qwen3.6-35B-A3B on SGLang), is second at 84.2 with capability 97.0. GPT-5.6 Luna (low reasoning effort)
has the highest capability (98.2) but is slower and costs $0.164 per
1,000 decisions, so it places #5.

## Needle 3 (note under its row)

Needle 3 is a 121M-parameter function-calling model from Cactus Compute, run on two CPU threads. It
returns a tool call, not a probability distribution, so it has no calibration score - "no calibrated
distribution", not zero. It gets 47% of the easy tier right and falls off on the
harder tiers: Main Score 42.9. The asterisked row asks it the way it is built for tool selection -
every option offered as its own tool - and was added after the first easy-tier run; both are shown.

## Credit line

Harness, public tasks and every scoring rule: github.com/fstandhartinger/jevbench (MIT). Each rebuild
row links its author's repository.
