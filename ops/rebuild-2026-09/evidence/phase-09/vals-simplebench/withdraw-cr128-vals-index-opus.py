#!/usr/bin/env python3
"""CR-173 (vals-simplebench), 2026-09-26: the CR-128 hand row for Claude Opus 5.5 on vals-index::2 (66.163, capture of
2026-09-22) is superseded by the public vals-index::2 arm, which now carries the same model slug and setting from the
2026-09-26 capture (69.689; Vals re-scored the row after its 2026-09-22 page). Two published values for one cell of
one versioned identity would be a conflict, so the hand row is withdrawn (D180 mechanism), not deleted. Idempotent."""
import json
from pathlib import Path
p = Path('data/raw/benchmarks/manual-board-observations.json'); d = json.loads(p.read_text())
ID = 'cr128:92418b2acd56002245c86246'
rows = [o for o in d['observations'] if o['id'] == ID]
if rows:
    row = rows[0]; assert row['benchmark_id'] == 'vals-index::2' and row['subject']['source_id'] == 'anthropic/claude-opus-5-5' and row['value'] == 66.163
    d['observations'] = [o for o in d['observations'] if o['id'] != ID]
    d['withdrawn_observations'].append({**row, 'withdrawn_reason': 'CR-173 (2026-09-26): withdrawn from publication. The public vals-index::2 arm now carries anthropic/claude-opus-5-5 (compute_effort max) from the 2026-09-26 capture of https://www.vals.ai/benchmarks/vals_index at 69.689 (page "Updated 9/23/2026"); this hand row is the 2026-09-22 page value 66.163. Vals re-scored the row within the same Index version, and one versioned identity cannot publish two values for one configuration, so the current source value stays and this one is kept here as evidence.'})
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('ok')
