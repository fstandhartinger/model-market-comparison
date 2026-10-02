# CR-267 — JevBench v1.5.5

Three complete 1,624-decision rows from add-requests run39: Cloudflare Clef/Flash and Interfaze Lev. No old score, interval or method changes. René-1 remains excluded pending missing attribution. All three were measured from public weights on our own H100: no hosted API latency measurement and no new external sealed dispatch in this revision.

Clef stays at its self-hosted base-model price floor ($0.42/M input); its striped alternative explicitly holds self-hosted adjusted latency fixed while substituting Cloudflare's standard API list price ($0.24/M input). Flash's price-only alternative uses $0.09/M. These are price scenarios, not measured API rows and do not alter official Capability eligibility. Both Capability top five and Composite A/B/C top five unchanged. Cap checks use adjusted p50 and cost per 1,000 decisions from the exact frozen Jev anchor.

Stored raw hashes and metadata hashes match the pinned scorer output. New category aggregates are recomputed from original per-item outputs with the existing frozen labels; all per-type split/tier cells reproduce before category aggregation. Prior category artifacts and historical rows remain untouched. Both radars, full roster, prior revisions, main charts, table, method and What-If use existing release components.

## v1.6 handoff

Prefer self-hosting these same pinned open weights with their reviewed author entry points on an evaluator-owned guarded pod. Run39's offline loopback shim and own-H100 recipe are reusable; perform fresh source/integrity gates and preregistration for the v1.6 frozen pool. Do not copy v1.5 sealed prompts or issue Workers AI requests. Self-hosted weights have no external exposure. If separately measuring Workers AI later, use only the rotated 300-item API subset, check provider/version/cadence eligibility, record rotation.py expose before each dispatch, and retire provider-exposed items; measure real hosted latency from Sandy. Keep those hosted rows distinct from self-hosted latency/pricing estimates.
