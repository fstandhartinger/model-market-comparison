# JevBench release checklist

Durable requirements for every JevBench release on the site (CR-205, after PR #68 let v1.5 ship with a reduced page):

## Page structure — required on the live route AND every versioned page

A release must keep the complete section structure, in this order, on `/jev-models` **and** on its frozen `/jev-models/v*` page:

1. **Capability bar chart** at the top (`JevCapabilityRanking`), including the Jev-class membership details and the class-limit disclosure.
2. **Synchronized Capability vs Speed and Capability vs Cost charts** (`JevBubbleCharts`), including the 3D capability/cost/latency view (`JevCapabilityLazy`, `only3d`).
3. **Main composite score chart** (`JevScoreChart`): the interactive board with weight sliders, published weight presets, the View-by switch and the official-order restore.
4. **Direct comparison** (`JevCompareV15` or its successor): the two-system picker with the radar views and a copyable pair link.
   It **always** includes the two category radars (CR-257, Florian 1 Oct 2026), right after the score axes:
   - **Capability**: JevBench subject topics (Math & numbers incl. dates, Coding, Rules & law, Finance & commerce, Support & ops,
     Everyday language, Safety & security); ImageJevBench image types (photos, documents, charts, inventory, safety inspection,
     screens, web tasks, financial tables, geometry).
   - **Use cases**: the TypeSafe use-case map categories (docs.typesafe.ai/concepts/use-case-map) + Other; 1–2 per item.
   - Values for **every ranked system**, computed from the release's stored per-item results (the run files that reproduce the
     published cells exactly) — never estimated. Categories under `min_n` items are listed as low n, not plotted. Tooltip + key
     with definition and item counts per category.
   - Per release: label the new items (Jev-class model on our own infrastructure — never a third-party endpoint for sealed items;
     never bulk-load production System1 Models), hand-check ~5 % of public items, build the category artifact next to the
     results artifact, register its revision in `lib/jevbench-categories.mjs`. Scripts and method: job folder
     `bench-radars-usecases-20261001/work/` (`peritem.py`, `label.py`/`pod/`, `aggregate.py`). `test/cr-257-category-radars.test.mjs`
     fails a release whose page or any ranked system lacks the category data.
5. **Full table**: every listed system with its axes and per-type competence.
6. **Everything else v1.4.2.2 carried**: "What the run says" findings, the alternatives/self-hosting guide, the cost disclosures and price rules (`JevCostsDisclosure`), unranked/partial/addendum/not-measured listings, method notes, limits, credits, the What-If link to the weight sliders, `JevContextLazy`, the lazy revision history (`JevHistoryLazy`), the ImageJevBench link (`data-bh-image-jev-link`), and the link to the previous frozen release.

Release-specific additions (for v1.5: the official headline order with bootstrap intervals, the A/B/C options table, the per-type axes table, the addendum table, the sealed-intelligence method section) stay — restoring the shared structure never removes a release's own sections.

## Capability Score headline and pricing rule (Florian, 1 Oct 2026; CR-248)

- The section-1 headline is named **"JevBench Capability Score"** (ImageJevBench: **"JevImageBench Capability Score"**): the mean of
  Intelligence and Calibration, ranking only systems inside the cost + median-latency cap. JevBench: 2× Jev 1.13.0. ImageJevBench:
  the same absolute envelope (2× Jev 1.13.0's JevBench v1.5.4 cost and median latency), frozen in the image artifact's
  `capability_eligibility`. The composite stays as the secondary section 3. Rationale and numbers:
  `docs/jevbench/METHOD-CAPABILITY-SCORE-HEADLINE-2026-10-01.md`.
- Each Capability row shows two traffic-light thin bars, cost and median latency, on a shared log ratio scale: green ≤ 1× the reference,
  amber up to the cap, red beyond. The legend reports the measured cost–latency Spearman correlation.
- **API models whose base model we know** are ranked in the composite at the developer's own stated API price; a striped second bar
  shows the score and would-be rank at the base-model reference price (row field `alt`).
- **ImageJevBench follows the same section structure** as `/jev-models` (sections 1–6 above) inside the normal site layout, with ≥ 50
  systems listed (`test/cr-241-benchmark-page-layout.test.mjs`).
- Version tweets list the Capability Score winners of both benchmarks.

## Scoring consistency

- The interactive chart re-scores rows with the release's own composite semantics. For v1.5 that is `jevV15BoardScore` (`lib/jevbench-v15-board.mjs`): axes at weight 0 drop out of the harmonic mean, while the Intelligence/Speed/Cost low-axis gates still apply — the same rule the published `views` use.
- Slider presets must include every published `views` entry so readers can reproduce the artifact's alternative rankings.
- Rows new to the release are marked by diffing against the exact previous release's keys.

## Use-case discrimination review (CR-339)

- Attach `node scripts/check-jevbench-usecase-release.mjs --json` to the release PR; use `--check` to stop automation when review is required.
- Review displayed spokes where every actually ranked eligible model is <10 or best-minus-median is <5 (strict boundaries), across both live boards with duplicate keys counted once. Resolve missing/low-sample coverage separately; missing cells are never zero.
- Record the review of each flagged spoke and any coverage gap before publishing. This report changes no scores, ranks or pools. Shipped category values have final clipping 0..100; do not infer negative cells from clipped aggregates.
- Method, scope and interpretation: [Use-case release review](METHOD-USECASE-RELEASE-REVIEW.md). Run `node --test test/cr-339-usecase-release-review.test.mjs`.

## Required verification before a release PR

- `node --test test/cr-205-jev-page-structure.test.mjs` must pass — it pins the section list and order on `/jev-models` and every versioned page, verifies the release artifact feeds each section, and fails when a new version route is not registered in it.
- `npm test` must pass in full.
- Historical result artifacts under `data/raw/benchmarks/jevbench/` are never modified; a new release adds its own pinned artifact and API route.
