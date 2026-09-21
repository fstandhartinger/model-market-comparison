# MiMo-V2.6-Pro source note (2026-09-22)

## Identity and release

- Xiaomi released MiMo-V2.6-Pro on 2026-09-22 (the Hugging Face repository was created 2026-09-21 UTC).
- Official checkpoint: `XiaomiMiMo/MiMo-V2.6-Pro-RL`, revision `54b104...`, MIT licence, ungated.
- Architecture: sparse MoE with 1.02T total and 42B active parameters; native text, image, video and audio input; 1,048,576-token served context on OpenRouter. The report describes a 681M-parameter vision encoder, 308M- plus 127M-parameter audio components, and five-layer MTP.
- Official surfaces found: Xiaomi launch page / AI Studio, MiMo Code, MiMo Desktop, Xiaomi API, Hugging Face, and OpenRouter. Xiaomi's general GitHub repository did not contain a dedicated V2.6 release when checked.

## Independent measurements

Artificial Analysis' existing feed is the only independent pipeline source that contained this exact model on the release date. It reports Intelligence Index 46.3, HLE 49.4%, SciCode 60.9%, LCR 86.33%, 124.678 output tokens/s and 1.294 s TTFT. Its reference prices are USD 0.435 / 1M input tokens and USD 0.87 / 1M output tokens. Artificial Analysis' launch post reports USD 0.13 per Intelligence Index task and describes the model as Pareto-efficient. The predecessor MiMo-V2.5-Pro is 26.0 on the same Index; the current highest closed model in the captured feed is 53.4, leaving a 7.1-point open/closed gap.

No exact MiMo-V2.6-Pro entry was found in the current LMArena, SWE-bench leaderboard, or Epoch pipeline inputs. Artificial Analysis data was collected only through Benchmark Heaven's established collector; no additional AA page scraping was performed.

## Provider prices

OpenRouter's exact product records on 2026-09-21:

- `xiaomi/mimo-v2.6-pro`: USD 0.435 / 1M input, USD 0.87 / 1M output, USD 0.0036 / 1M cache read; 1,048,576 context and 131,072 maximum completion tokens.
- `xiaomi/mimo-v2.6-pro-ultraspeed`: USD 4.35 / 1M input, USD 8.70 / 1M output, USD 0.036 / 1M cache read.
- `xiaomi/mimo-v2.6-flash`: USD 0.14 / 1M input, USD 0.28 / 1M output, USD 0.0028 / 1M cache read.

These are separate products. The AA row is joined only to the exact standard Pro id, never by a fuzzy family-name match.

## Xiaomi-reported evaluations

The dated launch appendix reports 17 results for Pro: DeepSWE v1.1 71.9; ProgramBench 26.5; MiMo Code Bench 63.2; GDPVal 2.1 (AA) 1673 Elo; Toolathlon-verified 76.9; Automation Bench v1.0.6 53.1; Agents' Last Exam 31.6; Terminal Bench 4.0 34.9; Terminal Bench 2.1 89.9; OSWorld-Verified 82.0; JobBench 62.0; MiMo Visual Coding 72.3; CyberGym 94.0; ExploitGym 17.8; ExploitBench 47.9; SEC Bench Pro 66.3; and MiMo Cyber Bench 81.7.

All 17 are stored as `self_reported`, with printed versions retained and unversioned names bound to snapshot 2026-09-22. They remain outside measured cohorts and Composite. The model card and technical report give MiMo Cyber Bench 80.2, while the later dated launch appendix gives 81.7; the registry preserves the appendix value and discloses the conflict. The report also states that Xiaomi corrected flawed CyberGym environments using the method in section 4.2.4.

## Benchmaxxing interpretation

Benchmark Heaven's benchmaxxing method compares like-for-like independent measurements and requires at least six qualifying comparisons across at least two topics. Vendor-reported rows do not enter that calculation. On release day, MiMo-V2.6-Pro has zero qualifying self-reported-versus-independent same-benchmark overlaps, so signed gap and jaggedness are unavailable and no benchmaxxing tag is justified. The correct result is: **not enough independent data yet**.

## Primary sources

- Xiaomi launch: <https://mimo.xiaomi.com/mimo-v2-6>
- Launch benchmark appendix: <https://mimo.xiaomi.com/mimo-v2-6/bench.js>
- Hugging Face model card: <https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL>
- Technical report: <https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL/blob/main/MiMo_V2_6_technical_report.pdf>
- OpenRouter exact product: <https://openrouter.ai/xiaomi/mimo-v2.6-pro>
