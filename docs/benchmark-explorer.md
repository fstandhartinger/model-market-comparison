# Benchmark explorer

`/benchmarks` ranks one benchmark version and published evaluation group. `/compare` and `/radar` share a selection of up to four exact model configurations and a full native-score comparison. Model pages provide every attached observation grouped by category, missing coverage, profile signals, and verified vendor/measured divergences.

The benchmark views include the entire catalog. Price/provider settings apply to price views and model offers, not to which benchmark evidence is visible. The expandable two-model price comparison on `/compare` has a separate, explicitly labelled selection. Its legacy price projection is fetched from `/api/price-comparison` only when the disclosure is opened, so it does not inflate the benchmark page’s first response. A selected-model URL uses repeated `model` parameters; benchmark links use the exact `benchmark` registry identity.

Each registry version is distinct. Harnesses and source-record configuration/split fields create separate evaluation groups, including LongBench CoT and MMMU validation/test. Model-specific prompts, effort, dates and other protocol details remain in the original observation; grouping a published board is not a claim of identical test conditions. Native scores and exact observation IDs remain accessible through Evidence. Source publication dates and capture dates are different fields; missing publication dates are not invented. Vendor protocols are separate from independent measurement unless phase 05 explicitly audited a compatible divergence pair.

Existing AA Coding/Intelligence, Epoch general/Software Engineering ECI and DesignArena Frontend/Full-Stack scores are additive snapshot axes. Their source capture date is the identity because the captured catalog does not establish semantic versions. They do not become newly registered source benchmarks. Coding Agent v1.4 retains its September 9, 2026 source and its median-over-complete-harnesses Composite input. Current v1.5 is exposed separately. The Composite has seven equal percentile slots; ECI is source-published/refit on Epoch's native scale before percentile normalization.

## Radar normalization

The radar uses only measured observations (including source-defined derivations from measured values), exactly matched to catalog configurations. Prefer the latest measured observation for each model in the chosen version/group; never select the highest score. Duplicate source identities count once in the peer range. DesignArena results with fewer than 200 battles are shown in native tables but excluded from the radar and peer statistics.

For each axis, normalized value = `100 × (value − catalog_min) / (catalog_max − catalog_min)`. For lower-is-better metrics subtract that value from 100. The current measured catalog sets the range, independently of the user's model selection. The table exposes exact native values and range, peer count, and normalized values rounded to three decimal places. Fewer than two peers, a constant range, unknown direction, low battle count, or a missing score prevents plotting. A measured minimum is a real zero. No missing value becomes a zero, and lines are only drawn between adjacent observed spokes, without filling across gaps. At least three and at most eight axes keep the diagram readable. Distinct dashes, labelled series, and a numeric table complement color.

## Explainable profile signals

These are conservative descriptive heuristics, not significance tests. Source standard errors/trial counts are not consistently available; benchmarks are correlated and selection-biased. Do not interpret a flag as proof of a bad measurement or a model capability guarantee.

- Each eligible axis needs at least 20 independent measured source configurations spanning 10 catalog model families and a nonzero population standard deviation.
- Convert its value to a peer z-score: `(value − peer_mean) / population_sd`, reversing sign when lower is better.
- For the selected model, average eligible z-scores within each benchmark family so multiple versions/harnesses cannot overweight that family.
- Exclude the candidate axis's entire benchmark family. At least five other eligible benchmark families are required. Their equally weighted mean z-score is the model's baseline.
- Flag only if `abs(peer_z) >= 1.5` AND `abs(peer_z − baseline) >= 1.5`, with the peer z and the gap pointing in the same direction. Show unusually strong/weak, original value, units, mean, standard deviation, peer/family counts, directed z, baseline, gap and profile size.

Phase-05 divergences are displayed separately using their actual `self_reported_value`, `measured_value`, `delta`, `relative_percent`, source URLs/dates and protocol. An empty list means no verified compatible pair; it does not mean claims agree with measurements. No live divergence was synthesized for this phase.

## Payloads and verification

`GET /api/benchmark-view?model=<exact-id>&model=<exact-id>` is a compact presentation projection, limited to four requested models; `?axis=<axis-id>` returns one evaluation group's observations. Metadata retains the fixed catalog peer statistics. It is not a replacement for the canonical `/api/benchmark-scores` or `/api/benchmarks` contracts. `/api/benchmark-scores?observation_id=<id>` adds exact observation lookup without changing existing queries. Dataset paths and canonical fields remain unchanged.

Benchmark pages are prerendered for the bundled deployment. Follow-up selection requests are cancellable, loading/error states are explicit, and a failed request can be retried. Themes are applied before paint and persisted when storage is available. Keyboard controls, visible focus, a skip link, reduced motion and scrollable data-table regions are included.

Run the browser receipt script against `npm run build` + `PORT=3316 npm start`:

```
BH_PLAYWRIGHT_PATH=<path-to-playwright-package> BH_AXE_PATH=<path-to-axe.min.js> node scripts/check-benchmark-ui.mjs
```

Optional `BH_UI_URL`, `BH_UI_OUT`, `BH_CHROME` choose the deployed origin, evidence directory and Chrome binary. `scripts/check-benchmark-legacy-ui.mjs` checks the remaining routes in desktop light/dark and mobile light themes, including navigation and native provider selection. These test tools do not enter the application's runtime bundle. The script retains PNGs, keyboard assertions, accessible-tree snapshots, axe results, runtime errors and local unthrottled timing/layout receipts. Automated checks complement manual and different-family screenshot criticism; they are not a full accessibility conformance certification.
