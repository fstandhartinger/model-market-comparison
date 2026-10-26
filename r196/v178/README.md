# v1.7.8 candidate

One new self-hosted row Jeff-1.1-Medium; no method change. Built on v1.7.7, 295 predecessor rows carried unchanged except ranks. Real publication review and fairness remain PENDING.

Rebuild from source (Sandy only, aggregate outputs):

```bash
set -euo pipefail
export WT=$PWD
python3 -B r196/v178/prepare_v178.py
python3 -B r196/v178/check_source_v178.py
bash r196/v178/run_cells_v178.sh
bash r196/v178/compare_v178.sh
bash r196/v178/run-gates.sh
python3 -B r196/v178/collect_gates_v178.py
```

After a public entry-text correction, edit `inputs/ENTRY-JEFF11M.json`, run prepare, compare, and gates. The model pin is derived from the entry and pinned kit revision. The source reviewed entry and raw hashes are checked in place; sealed item content is never copied or printed. After architecture-text edits, edit `inputs/ARCHITECTURE-JEFF11M.json`; wire/rebuild writes only the new architecture entry, preserving predecessor bytes.

`rebuild_v178.sh` reproduces the release bundle and integration from captured aggregates. `compare_v178.sh` compares the real PENDING tree (v1.7.7) with an isolated synthetic FAIR/PASS tree. That fixture grants no publication authority. Top-five scope and every changed list are recorded in `receipts/CHANGED-LISTS.md`, `topfive-diff.json`, and the hash-bound snapshots. Sliders cover the same recorded admission boundaries and explicit grid as the preceding release, not arbitrary simultaneous weights or subfilters.

`preview/index.html` is self-contained, with full rankings and a candidate/displaced-row radar. `preview/card.png` is the deterministic card; `preview/browser-check.png` is visual evidence only. Browser check uses the shared Chrome under its lock and closes the temporary tab.

Both `flip_verdict_v178.py --dry-run` and `freeze_v178.py` refuse PENDING fairness. The lead must bind a real FAIR receipt path and SHA, rebuild, obtain independent publication PASS, and review all evidence. Only isolated synthetic fixtures were accepted in this worker's checks. No non-dry flip, seal write, CR, push, PR, merge, deployment or publication occurred.

Initial gate failures and the prior attempt's score-mismatch receipt are retained for audit; final gate outcomes are in `receipts/GATES.json`.
