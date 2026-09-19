# Jev-class decision models: complete integration specification

Status: preparation; attach validated `results.json` and public repo URL before delivery to the loop. Do not publish preliminary numbers.

Owner: existing Benchmark Heaven loop, sole writer of `/opt/model-market-comparison`. This job does not alter its repository, leases, timer, or current iteration. Requested page: `/jev-models`, nav text **Jev-class models**. Browser title: **Jev-class decision models — JevBench v1 | Benchmark Heaven**.

## Page

Lead: “Typed decisions compared on accuracy, cost, latency, reliability and openness.” Directly underneath: “JevBench v1 is our own benchmark. These results describe the tested configurations and tasks, not every application or a vendor-wide ranking.” Show measured date, protocol version, task split counts, run IDs, hardware/network origin and public harness link.

Five independent axes, no opaque combined winner:
- Smart: macro-average family accuracy, 95% interval if available, per-family details and evaluated/attempted count. Invalid/failed answers count incorrect. Compare only equal task-set/protocol IDs. Separate legacy reused evidence.
- Cheap: $/1,000 attempted decisions, exact route and basis (invoice / measured usage × published tariff / local marginal / estimated GPU hourly). Show unknown as “unknown”, never $0. Local marginal fee and estimated total operating cost are different fields. No ordering unknown costs as cheapest.
- Fast: p50 and p95 end-to-end observed latency, milliseconds; concurrency=1 baseline. Include warm-up/cold-start and timeout counts. Local CPU and hosted network routes visibly distinguished. Service failures should not disappear from latency discussion.
- Reliable: multiclass Brier (sum across classes, lower better), top-label 10-bin ECE, schema validity, operational success, paired paraphrase consistency and both-correct rate with sample counts. Explain verbalized LLM probabilities vs native softmax/distributions. Needle's accept/refuse confidence cannot be substituted for categorical probabilities.
- Open: code licence, weight availability, weight licence, trained-checkpoint availability, gated access, author and source link. Unknown and proprietary are distinct.

Table: model/configuration, author, smart, $/1k, p50/p95, ECE/Brier, schema validity, paraphrase consistency, weights/licence. Row expands to per-family coverage, settings, exact version/commit, source receipts, exclusions and costs. Sort each axis independently. API outages and untested candidates get availability rows with reasons outside ranked measurements.

Quality/cost scatter: x dollars per 1k (linear with optional log for strictly positive values), y accuracy percent; uncertainty bars if available; labels keyboard/touch accessible; local marginal-zero on a distinct marker at zero; unknown cost omitted with explanation. Points sharing different evaluated subsets cannot appear as unqualified peers; filter to common split and protocol.

Calibration plot: confidence vs empirical top-label accuracy, diagonal, 10 fixed bins, bin sample count in accessible table; never interpolate empty bins. Filter by split/family/model; show native vs verbalized probability origin. Do not plot unavailable distributions.

Method section: public tasks and original hand-authored decisions plus private held-out scenarios, native schemas, ground-truth provenance, full context policy, failures, costs, hardware and timing. Private items/labels/raw replies never go to the browser bundle or JSON API. Publish aggregate counts and whole-split hashes only. Do not imply the split is contamination-proof. Explain private items are sent to evaluated providers to obtain predictions.

Limits: small suite, English-first, benchmark author's dataset, narrow task coverage, shared infrastructure and time-of-day latency, missing checkpoints/endpoints, public-route quotas, native unsupported task types, cost assumptions, repeated-topic dependence, older reused protocols incomparable. Explicit attribution for public datasets; keep third-party licences separate from MIT harness.

## Data contract

One immutable artifact per protocol release: metadata with family/version, harness git SHA, public/private split SHA-256, start/end date, price source receipts, network location, serial concurrency, spent/reserved budget; models with exact resolved identity and adapter, metric values, denominators and basis; exclusions; calibration bins. Numeric values each trace to a retained raw run hash and metric definition. Private raw runs are referenced by hash only and never copied into site assets.

Place publication-safe artifact under `data/raw/benchmarks/jevbench/v1/`, expose only safe aggregate JSON. Validate the data schema and enforce null for unsupported metrics. Version changes in task set/prompt/adapter/scoring require separate identities; do not merge them into v1 results silently.

Registry entry identity `jevbench::v1`, category decision-models, maintainer Benchmark Heaven; scoring is metric-specific, not one value. Populate every field in the existing registry schema. Our observed runs use `basis=measured`; usage × tariff uses `basis=derived` with formula/inputs and source_basis. Vendor README scores remain separate self-reported claims and require the existing approval process before ingestion. Never fabricate a source URL before the repo exists.

## Acceptance

Use existing registry validation, applicable data tests and typecheck. Check mobile 390px and desktop 1440px, keyboard scatter/table access, no overflow, number/label parity, links and five axes. Verify the deployed page and public JSON against exact committed artifact hashes before claiming live or sending launch posts. Responding authors must receive a numbers-review draft for Florian approval before publication as TASK.md requires. Page launch remains gated on solid reviewed results; a local spec is not proof of deployment.
