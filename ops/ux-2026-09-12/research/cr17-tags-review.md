# CR-1.7 benchmark tier tags — draft and review (2026-09-14)

- **Draft:** Kimi K3 via `bin/delegate.sh --kimi` (iteration 52), file `cr17-tags-draft.json`: one tier
  (`headline` / `niche` / `community`) per registry id, 92/92 ids, none unknown. 24 headline, 44 niche, 24 community.
- **Review:** claude-opus (a different engine than the drafter). Tiers are editorial prominence tags, not scores.
  Merged into `data/benchmark-taxonomy.json` → `tiers`, keyed by the benchmark id before `::` (versions of one
  benchmark share a tier; no version conflicted).

## Changes made in review

| Key | Draft | Final | Reason |
| --- | --- | --- | --- |
| `aider-polyglot` | community | headline | Maintained by one person, but cited in frontier release posts; the tier describes prominence |
| `swe-bench-pro-public` | niche | headline | Cited in 2026 frontier coding release tables next to SWE-bench Verified |
| `vending-bench` | niche | headline | Vending-Bench 2 appears in frontier release comparison tables |
| `aa-coding-agent-index` | niche | headline | An Artificial Analysis headline index (CR brief: AA index rows are top rows) |
| `aa_intelligence_index`, `aa_coding_index` | — (not registry ids) | headline | Snapshot index rows of the benchmark view |
| `frontend`, `fullstack` (DesignArena) | — (not registry ids) | headline | CR brief names DesignArena as top benchmarks |

Accepted unchanged: all other draft tiers. Epoch ECI rows carry no tier (an index, neither niche nor community).
Source tags (`AA`, `Arena`) are derived from the registry maintainer / taxonomy keys, not from this draft.
