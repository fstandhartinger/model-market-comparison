# Step-5 Preview first-party facts — read 2026-09-20

Primary source: https://www.stepfun.com/step-5-preview (announcement page published 2026-09-20; captured HTML and its data-bearing module under `data/raw/benchmarks/daily-evidence/2026-09-20-step5/`). Announcement post: https://x.com/StepFun_ai/status/2101510462685003786 (the read-only capture proxy was blocked by its robots policy, so no proxy bytes are treated as evidence).

StepFun describes Step-5 Preview as a sparse Mixture-of-Experts model with 600B total parameters and 27B active parameters per token. It accepts text and vision input and supports a 1M-token context window. StepFun says it is available through its products and API now and that open weights will be released on 2026-10-15. No model-weight licence is stated yet, and the first-party launch page does not publish an input/output token tariff. The independent Artificial Analysis price already present in Benchmark Heaven remains independently sourced and is not relabelled as a StepFun claim.

Every score below is StepFun's own figure for **Step 5 Preview (High)** and is unverified/vendor-reported. A dagger is StepFun's marker for an internally developed benchmark. Names and versions are copied exactly; where the page gives no version, Benchmark Heaven uses a dated 2026-09-20 snapshot identity rather than guessing one.

| Benchmark as printed | Score |
|---|---:|
| GPQA Diamond | 93.5% |
| HLE | 46.5% |
| AA-LCR v1.1 | 88.3% |
| CritPt | 20.9% |
| DeepSWE v1.1 | 67.7% |
| Terminal-Bench v2.1 | 85.0% |
| Terminal-Bench v4 | 33.3% |
| CyberGym | 84.7% |
| SciCode | 58.9% |
| RoadmapBench | 54.3% |
| ProgramBench (Pass Rate) | 80.5% |
| SWE-Marathon v1.1 (Partial Score) | 72.7% |
| MLS-Bench-Lite | 40.5% |
| SWE-Atlas-QnA | 63.6% |
| SWE-Atlas-Test-writing | 50.8% |
| StepCodeBench† | 49.0% |
| StepCode-Bench-Daily† | 64.9% |
| StepCode-Bench-General† | 65.0% |
| GDPval-AA v2 | 1571 |
| τ³-Banking | 42.5% |
| AutomationBench-AA | 51.0% |
| AutomationBench (public) | 44.0% |
| AA-Briefcase | 1417 |
| Toolathlon-Verified | 74.1% |
| MCP-Atlas | 85.6% |
| PresentBench | 76.8% |
| OfficeQA Pro | 60.3% |
| SpeadSheet v2 | 29.4% |
| JobBench | 59.0% |
| Apex-Agents | 37.8% |
| Draco | 83.3% |
| BrowseComp | 88.7% |
| HLE w/ tools‡ | 59.4% |
| FinStepBench-LiveSearch† | 74.5% |
| FinStepBench-CorporateValuation† | 60.6% |
| FinStepBench-FinanceDR† | 55.8% |
| FrontierFinance | 66.4% |
| Agents' Last Exam (ALE-CLI) | 29.5% |
| MMMU-Pro | 76.0% |
| GDP.pdf | 14.8% |

For HLE w/ tools, StepFun states that Step-5 Preview (High) and GLM-5.3 (Max) were evaluated on the text-only subset, while the other comparison models used the full dataset; those settings are not directly comparable. StepFun says all daggered benchmarks were developed internally. Independently measured, matching-version scores replace these self-reported values as soon as they exist; they are never averaged together.
