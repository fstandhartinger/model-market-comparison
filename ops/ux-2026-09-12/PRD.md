# Benchmark Heaven — traceable product requirements

Status: working PRD, 2026-09-13 05:00 UTC  
Owner: codex-luna (Sandy UX/data workstream)  
Scope: P1/P2 of `02-ADDENDUM-HERMES-CHAT.md`; this document does not declare the
workstream complete.

## Product outcome

Benchmark Heaven should make a model decision legible in one short path: what a
model can do, what the measured evidence is, and what the selected provider route
is likely to cost per task. The product must remain honest when a score, provider
policy, token count, or historical bridge is unknown. The default view is simple;
the advanced view exposes the complete catalog, evidence, comparisons, history,
and Benchmaxxing analysis.

The local dataset baseline at this PRD revision is reproducible from
`data/dataset.json` at commit `a790be17c25fe5a49b9bf00fbb4efff53cd2256c`:
839 catalog models, 75 registered benchmark identities, 69 benchmark identities
with observations, 13,924 retained observations, three write-once historical
states, and 567 labelled historical estimates. The dataset's generated timestamp
is `2026-09-13T02:32:18.438Z`; its SHA-256 is
`2870cdd2913fd5b614e48b540fff0c0ba8cfdcec19e92d397636e278b05be3bc`.
These are reproducible repository facts, not a claim that every source was
refreshed today. The source-level provenance remains in the observation rows and
their retained evidence files.

## Traceability and acceptance

The authoritative requirements are `00-REQUIREMENTS-VERBATIM.md` and
`02-ADDENDUM-HERMES-CHAT.md`; the structured checklist is in `01-BRIEF.md`.

| Requirement | Product obligation | Acceptance evidence |
|---|---|---|
| R1.1–R1.8 | Score-first table, adjusted provider cost, accessible responsive info tips, and a reachable methodology explanation. | Live canonical and legacy hosts at 1440px and 390px, light/dark; DOM checks for descending active score, headers, tooltip/dialog behavior, and `/about#score`/`#adjusted-cost`. |
| R2.1–R2.2 | Remove channel columns; show filtered benchmark and provider counts. | Table DOM contains no channel headers; counts change with the active filter and remain finite. |
| R3.1, P4 | Positioning may say “most complete” and “only place” only with generated coverage/cost proof directly below it; never claim every benchmark result when coverage is incomplete. | Copy review against generated counts plus a source/date line; no unsupported “all/every” claim in hero metadata, OG, or footer. |
| R4.1–R4.11 | Keep settings grouped, defaults explicit, and provider data-policy decisions provenance-first. | Fresh-session and reset checks; policy snapshot has URL, retrieval time, parser/evidence, and known-pass/known-fail/unknown behavior. |
| R5.1–R5.6 | Simple-first recommendations, literal cost-descending default, Advanced full catalog, and skippable five-step wizard. | Fresh browser checks at both widths; Simple default score >85 and no-limit cost; Advanced does not inherit untouched Simple-only constraints; wizard answers map to filters. |
| R6.1–R6.3 | Company context is visible; consumer/business subscription restrictions and prices/quotas are cited and labelled as estimates or unknown. | Terms-source matrix, no guessed quota, company toggle changes only supported subscription eligibility/cost rows. |
| R7.1–R7.3 | New logo, favicon/touch/OG assets, and a readable dark variant. | Rendered assets at 16/32/48px and screenshots in both themes. |
| R8.1 | Benchmark results read like a release-post sheet: grouped categories, comparable bars/tables, missing evidence visible. | Compare/model-page screenshots plus DOM checks that missing/low-sample rows are not rendered as zero. |
| R9.1 | Refresh the live sources without redating retained evidence. | A dated run receipt for every source, source hashes, registry validation, full gates, deploy revision, and live API readback. |
| H1–H3 | Retain all score snapshots; bridge re-based sources only through dated anchors and multiple hops; expose “better than model X” with approximate labels. | Write-once mutation test, multi-hop ratio and Elo tests, bridge uncertainty/cause fields, and live H3 measured-vs-approximate checks. |
| B1–B7 | Benchmaxxing is a coverage-qualified within-topic inconsistency signal; specialization is disclosed, not penalized; radar axes are topic-adjacent. | Sparse synthetic fixtures, zig-zag versus smooth-specialization fixture, coverage floor/rate test, and desktop/mobile radar screenshots. |
| E1 | General and software ECI are versioned Composite inputs with a collection recipe. | Source receipt, seven-slot score explanation, ECI fixture tests, and history recompute-required behavior on definition change. |
| E2–E3 | Add the eight non-Composite/community sources only with primary evidence and an efficient documented collection recipe. | Registry identity, source capture/hash/locator, parser fixture, independent critic result, and daily-refresh recipe per source; missing sources remain open rather than guessed. |
| P1 | Requirements from both chats are represented here and independently reviewed. | Reviewer receipt from a different engine/session, digest of this exact file, and resolved findings. |
| P2–P3 | Benchmark Heaven is at least competitive with the named Artificial Analysis reference on the decision path, while retaining its provenance/history/adjusted-cost differentiators. | Capability matrix below, gap closures, and live regression evidence; no “complete” claim while material gaps remain. |
| X1–X7, C1 | Autonomous fallback, quota reserve, design review, docs, one writer, final audit and Telegram handoff. | Engine/limit receipts, commits with trailer, docs diff, live evidence directory, final line-by-line audit, and only then `ALL-ACCEPTED`. |

There is no `R3.2` in the authoritative checklist: the hero requirement is
`R3.1`; `P4` is the addendum's separate positioning-truthfulness requirement.
The ranges above are expanded by the exact sub-IDs in the authoritative brief as
follows: `R1.1 R1.2 R1.3 R1.4 R1.5 R1.6 R1.7 R1.8`, `R2.1 R2.2`, `R3.1`,
`R4.1 R4.2 R4.3 R4.4 R4.5 R4.6 R4.7 R4.8 R4.9 R4.10 R4.11`, `R5.1 R5.2
R5.3 R5.4 R5.5 R5.6`, `R6.1 R6.2 R6.3`, `R7.1 R7.2 R7.3`, `R8.1`, and
`R9.1`.

## Constraints and non-goals

- Every numeric observation needs an exact source identity, source URL, retrieval or
  publication date, basis, and immutable hash/locator where available. Missing is
  `unknown`, never zero.
- Never rank across benchmark versions or bridge a changed Composite definition;
  derived values are recompute-required. A bridge is an explicitly labelled estimate
  with its anchor count, path, and uncertainty.
- Respect robots.txt, source rate limits, logins, paywalls, and human-presence
  challenges. Do not bypass bot protection. Do not use API-key billing for Codex or
  Claude, and keep Codex below the 80% weekly ceiling.
- Keep the registry, snapshots, and derived display data separate. A presentation
  signal must not mutate source scores or the Composite.
- Non-goals for this PRD: inventing subscription quotas, asserting legal advice,
  replacing Artificial Analysis' private evaluation datasets, or declaring a
  historical estimate a measurement. E2 values are not Composite inputs unless a
  later requirement explicitly changes that decision.

## Reference capability comparison: Artificial Analysis

The named comparator publicly presents a model leaderboard covering performance,
price, speed, latency, context, and other metrics, and describes comparison of more
than 250 models: [Artificial Analysis model leaderboard](https://artificialanalysis.ai/leaderboards/models/).
Its comparison tool supports side-by-side comparison of up to five models across
intelligence, pricing, speed, latency, context, and more: [model comparison tool](https://artificialanalysis.ai/models/comparisons).
Its methodology documents a weighted Intelligence Index, separate benchmark
categories, evaluator protocols, provider-reported token counts, and cost treatment
including cache rates and cache-token prices: [intelligence benchmarking methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking).
The current public index page also exposes benchmark, token-use, and cost views:
[Intelligence Index v4.3](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index).

| Capability | Artificial Analysis reference | Benchmark Heaven baseline / differentiator | Required action |
|---|---|---|---|
| Broad model leaderboard | Public leaderboard and filters over 250+ models ([leaderboard](https://artificialanalysis.ai/leaderboards/models/)). | Local catalog contains 839 model rows, with provider offers and source-backed benchmark counts. | Keep the model catalog broad, but make Simple’s recommendation subset legible and fast. |
| Composite intelligence view | AA publishes its own weighted Intelligence Index and detailed evaluation breakdown ([methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking)). | Benchmark Heaven has seven documented slots (including general/software ECI), plus separate registry benchmarks and a Score explanation. | Keep versioned slot definitions and never imply the two composites are identical. |
| Per-benchmark evidence | AA exposes benchmark rows and methodology, with current-version changes documented ([current index](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index)). | Benchmark Heaven retains 75 benchmark identities, observed values, evidence links, and write-once states. | Finish E2/E3 source coverage and make version/date/basis visible wherever comparison is made. |
| Price realism | AA reports per-task cost and provider/token/cache methodology for its Intelligence Index ([methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking)). | Benchmark Heaven models the selected provider route, cache efficiency/prices, and model token efficiency in adjusted cost. | Finish R9.1 refresh and R6.3 subscription treatment; label modeled versus measured costs. |
| Provider choice | AA's public leaderboard exposes model/provider comparisons and provider-facing entries ([leaderboard](https://artificialanalysis.ai/leaderboards/models/)). | Benchmark Heaven filters offers by region, confidentiality, data-policy snapshot, and cost. | Keep unknown policy states explicit and cite the public policy snapshot. |
| Historical comparability | AA publishes current index methodology and version context ([methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking)). | Benchmark Heaven retains snapshots and has anchor-based ratio/rank bridges, including multi-hop fixtures. | Obtain a real multi-hop production case or retain the honest “no current multi-hop” state; never fabricate one. |
| Decision UX | AA gives leaderboard and side-by-side model comparison views ([leaderboard](https://artificialanalysis.ai/leaderboards/models/), [comparison tool](https://artificialanalysis.ai/models/comparisons)). | Benchmark Heaven adds Simple/Guided/Advanced modes, a value map, evidence-aware filters, and Benchmaxxing. | Complete the Fable directives: first-screen recommendations, compact navigation, readable radar, and no jargon on the surface. |

## Prioritized gap closure

1. **Trust and freshness:** complete R9.1 with a fully reviewed source receipt, then
   complete E2/E3 only for sources that pass the provenance and independent-critic
   gate. This closes the largest factual gap before adding more UI.
2. **Decision UX:** finish the open Fable directives (especially first-screen model
   visibility, Simple value map, Advanced defaults, and mobile overflow) and verify
   both hosts in both themes. A recommendation page that shows no recommendation in
   the first viewport fails its primary job.
3. **Cost completeness:** research and integrate R6.3 with explicit company and
   subscription eligibility, published prices, and `quota unknown` where appropriate.
4. **Historical product surface:** connect H1/H2 to the H3 UI for category references,
   show path/uncertainty, and add a real retained example once a source supplies it.
5. **Governance:** independently review this PRD, update API/changelog/fork-sync
   docs, run the gauntlet on material code/data changes, and only then perform X6/X7.

## Risks and decisions requiring audit

- “Most complete” is positioning, not proof of universal coverage; generated counts
  must stay beside it. The current local baseline has fewer observed benchmark IDs
  than registered identities.
- A historical bridge can be mathematically stable while semantically wrong if the
  protocol changed. Registry identity, unit, direction, cohort, and definition gates
  therefore outrank producing a number.
- Benchmaxxing remains a descriptive signal, not evidence of contamination or intent.
  Suppression below the comparison/topic floor is mandatory; catalog percentile
  compression remains a documented limitation.
- The R4.4 featured rule is currently exactly the top 20 AA families (deprecated
  excluded, pins documented), superseding the older Gemini exclusion. R4.10 treats
  unknown provider policy as kept and labelled; Chutes is an explicit pass. R5.2
  keeps the literal cost-descending Simple default. These interpretations are carried
  to X7 for Florian to overrule.

## Review contract

An independent reviewer must receive this file, its SHA-256, the two authoritative
requirements, the local baseline evidence, and the capability URLs above. The review
must return a machine-readable verdict with findings, missing evidence, and the exact
digest reviewed. A worker’s unsupported “pass” is not acceptance; the owner must
recompute the digest and run the acceptance checks.
