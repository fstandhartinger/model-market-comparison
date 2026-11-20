# v1.8.18 — stopped at input gate; analysis only

This is **not a release candidate**. No v1.8.18 manifest, public artifact, loader, versioned route or release wiring has been created. The v1.8.17 predecessor remains PASS and unchanged.

The scoring-free nine-row WHATIF is under `analysis/`. It uses the accepted equating and accepted row aggregates; no measurement or scorer ran. `PROPOSED-CONFIG.json` is a draft for independent fairness review. All analysis and preview output is marked provisional. The only application-data edit is Starlord-4B-preview's cited base-model overlay fix.

## Input gate stop

The retained accepted Cue result contains global scores/axes and no category cells. Its own report explicitly says categories were not computed. Both private scorers shredded their detailed outputs. No category export is present in the supplied score/check/handoff directories. Required measured use-case/language cells cannot be reconstructed from global scores, and this brief prohibits rescoring. `analysis/INPUT-GATE.json` records the evidence and the exact missing input.

The release owner must supply an accepted category export or explicitly authorize a frozen category-only derivation on the exact retained measurement before continuing. No exception or substitute cells have been invented.

## Proposal limits

This draft holds any candidate crossing top-five membership in separate-axis/LOO scenarios, including favourable-only entrants. Joint-CI endpoints are stress tests under v1.8.10; treating all 11 scenarios as binding also holds H2O. Family/language corrections were not recomputed. T1 is kept verbatim but needs a wording ruling for rows with no point top-five place. These are open decisions, not an accepted fairness verdict.

The preview covers 40 primary point lists; supplementary lists/sliders, full release determinism, validator, N30 negative control, tsc, PENDING/synthetic PASS tests, build, compiled/served checks and full suite are **NOT RUN** because no complete candidate can be built. This draft does not stand in for those gates.
