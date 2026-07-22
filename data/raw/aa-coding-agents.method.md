# AA Coding Agent Index — collection method

- **Source**: ArtificialAnalysis Coding Agent Index
- **Collected**: 2026-07-22 (previous snapshot: 2026-07-14)
- **Snapshot**: `data/raw/aa-coding-agents.json`

## Where the data lives

The coding-agent leaderboard is NOT in the AA v2 API. It is embedded in the
Next.js RSC stream (`self.__next_f.push([1,"..."])` script chunks) of the
**homepage** `https://artificialanalysis.ai/`, in the section block titled
`Artificial Analysis Coding Agent Index` (anchor `#coding-agents`), as a
`rows` array.

## Extraction technique (verified working 2026-07-22)

1. `curl -sL` the homepage with a desktop Chrome User-Agent (no anti-bot as of
   2026-07-22; ~1.7 MB HTML).
2. In the raw HTML, find the RSC chunk containing the escaped string
   `l Intelligence, Over Time` (the block just before the coding-agents section
   definition), then search forward for the escaped key `\"rows\":[`.
   (Plain-text `Coding Agent Index` also appears in nav/headings HTML — those
   are NOT the data; the data occurrence is inside an escaped JS string.)
3. Take a generous chunk (~400 KB) starting at the `[`, unescape the JS string
   escapes (`unicode_escape`), then bracket-match the array (string-aware) and
   `json.loads` it.
4. Per row map: `agentName` → `harness`, `display.model` → `model_name`,
   `indexScore` → `score` (0–1 scale), `evalCount` / `indexComponentCount` →
   completeness. Row is `complete` iff `evalCount >= indexComponentCount`.

## Gotchas

- **Partial rows**: rows with `evalCount < indexComponentCount` are partial
  indices; AA's visible chart omits them. We keep them in the snapshot with
  `"complete": false`, and `build-dataset.mjs` filters them. Partial as of
  2026-07-22: only `Opus 4.6 (medium)` on `Claude Code` (2/3).
- **Score rebasing**: between 2026-07-14 and 2026-07-22 ALL indexScore values
  shifted downward (e.g. GPT-5.6 Sol (max) 0.800 → 0.666, Fable 5 (max)
  0.772 → 0.658). AA rebased/renormalized the index or changed component
  benchmarks — expect scores to be non-comparable across snapshots.
- Keep every harness row and explicit effort variants (e.g. `GPT-5.6 Sol
  (low/medium/high/max/xhigh/none)`) — same model under multiple harnesses is
  intentional.
- 2026-07-22: new harness appeared — `Kimi Code CLI` running `Kimi K3` (3/3
  complete), i.e. Kimi K3 now has coding-agent harness results.
- No prices/currency in this source; no EUR→USD conversion applies.
