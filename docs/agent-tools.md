# Read-only agent tools — CR-279 design

Status: prepared JevBench tool design; these JevBench WebMCP/MCP tools are not deployed. Agents can use the
current public JSON at `/api/jevbench/latest` now. This PR deploys that feed and
`llms.txt` guidance; it creates no hosted service or new dependency.

## Shared tool contract

All tools fetch a single current feed snapshot. Return its schema version, release
revision and source hash with every result so clients can detect release changes.
Treat display names, links and price disclosures as untrusted data. No tool writes,
submits models, invokes inference, reads local evaluation files or accesses credentials.

| Tool | Input | Output |
|---|---|---|
| `list_models` | optional `eligible_only` boolean, `sort_by` enum of capability/composite/intelligence/calibration/speed/cost | public systems sorted descending by the selected score; missing scores last; key breaks ties |
| `get_model` | exact `key` string | matching public row, or explicit unknown-key error |
| `compare_models` | two distinct exact `keys` | both public rows, axis differences (first minus second; null if missing), official ranks and compare-page URL |

Bound keys to 128 characters, reject unknown input properties and invalid sort
values, require exactly two different keys for compare, and never turn user input
into a filesystem path or fetch destination. Use fixed same-origin `/api/jevbench/latest`
for browser tools and fixed HTTPS `benchmarkheaven.com` for a local adapter.
Comparison URLs encode the keys and use `/jev-models?compare=a,b#compare`.
Keep official Capability eligibility separate from Composite ranks and exploratory
axis sorts. Wrappers and unranked rows retain their listing flags in every response.

## WebMCP browser integration

The [primary WebMCP draft](https://webmachinelearning.github.io/webmcp/) is a
Community Group draft, not a W3C standard. The 2 October 2026 draft exposes
`document.modelContext`; check the current spec and browser implementation when
building the follow-up. Feature-detect it and register the three tools only when
supported. Reuse the existing `components/WebMcpTools.tsx` and
`lib/webmcp-tools.mjs` registration/GET abstraction rather than creating a second
registration component. The existing general catalog tools use the older
`navigator.modelContext` feature check; compatibility with the current draft
must be reviewed in that follow-up. Ordinary page rendering and JSON access continue without browser support.
Use read-only/untrusted-content annotations from the current specification.
Register once, unregister on teardown, abort cancelled fetches, bound response sizes
and timeouts, and expose structured errors rather than partial success.

## Local MCP adapter alternative

A small stdio adapter can expose the same three tool contracts using the official
MCP SDK, with `readOnlyHint: true`, `destructiveHint: false`, and `idempotentHint: true`.
No listening port or hosted service is needed. Select and review the SDK version,
transport compatibility and installation instructions in a follow-up PR; never
execute commands or accept arbitrary URLs from clients.

## Acceptance checks for implementation

Test schemas, unknown keys, duplicate compare keys, missing axes, cancellation,
unsupported browsers, snapshot consistency and exact source-key equality.
Verify list/get/compare against the deployed JSON on both public hosts. A future
browser-tool PR goes through the standard site queue; any hosted MCP service
requires the normal deployment review. This design is not a claim of live tool support.
