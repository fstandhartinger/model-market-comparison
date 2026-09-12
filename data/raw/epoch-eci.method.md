# Epoch AI ECI

Refresh with:

```bash
node scripts/fetch-epoch-eci.mjs
node scripts/build-dataset.mjs
```

The collector uses Epoch AI's public exports, without authentication or an API-key
billable endpoint:

- `https://epoch.ai/data/eci_scores.csv` — general ECI, confidence intervals, dates and
  all source model rows.
- `https://epoch.ai/data/processed_data_for_eci.csv` — source model/benchmark performance.
- `https://epoch.ai/data/edi_scores.csv` — benchmark difficulty (`edi`) and scaled slope.
- `https://epoch.ai/_astro/benchmarks.DGKf4Lsg.js` — Epoch's benchmark metadata, including
  the Software engineering domain label.

General ECI is copied from the first export. Software Engineering ECI follows the public
explorer's one-dimensional fit: for every model with at least two software-domain
benchmarks, minimize squared residuals between the observed performance and
`sigmoid(slope * (capability - difficulty))` on `[-100, 300]`. Performance is clamped to
the explorer's `[0.001, 0.999]` guard. Benchmark names are joined only by lower-casing and
removing punctuation, matching Epoch's own ID/title join.

The generated JSON stores all published general rows, source SHA-256 hashes and retrieval
time. `build-dataset.mjs` maps a source name through the same family normalizer used by
Artificial Analysis and attaches each result once to the deterministic family
representative. Unmatched rows are retained and reported in
`build_diagnostics.epoch_eci_attachment`; they are never assigned to a guessed model.
Epoch's documentation and public source repo are the authority for interpretation and
license (CC-BY for the data; the public fitting code is MIT).
