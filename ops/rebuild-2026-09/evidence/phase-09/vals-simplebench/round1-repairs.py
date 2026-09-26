#!/usr/bin/env python3
"""CR-173 (vals-simplebench) critic round 1 repairs. Idempotent; run from the repo root.
- critic c (major x2): the new vals-code-migration / vals-emb snapshot-2026-09-22 entries kept the template name
  "... 2026-09-21 snapshot"; the name now carries its own date.
- critic a0/a2 (major): vals-sre-bench::snapshot-2026-09-22 was minted by CR-128 for a page that says "Updated 9/21/2026"
  (the page still does). Adding rows under that identity perpetuates the mismatch, and re-dating a published identity is
  the owner's call, so this lane's three SRE additions (Fable 5.1, DeepSeek V4.1 Flash, GLM-5.2; no GPT-6 Sol/Luna on
  the board) are removed and the mismatch is reported instead; the registry entry is restored to its CR-128 state."""
import json, subprocess
from pathlib import Path
reg_p, man_p, plan_p = Path('data/raw/benchmarks/registry.json'), Path('data/raw/benchmarks/manual-board-observations.json'), Path('data/raw/benchmarks/collection-plan.json')
reg, man = json.loads(reg_p.read_text()), json.loads(man_p.read_text())
for e in reg['entries']:
    if e['id'] == 'vals-code-migration::snapshot-2026-09-22': e['name'] = 'Code Migration (standalone Vals board, 2026-09-22 snapshot)'
    if e['id'] == 'vals-emb::snapshot-2026-09-22': e['name'] = 'Excel Modeling Benchmark (standalone Vals board, 2026-09-22 snapshot)'
SRE = 'vals-sre-bench::snapshot-2026-09-22'
head = {e['id']: e for e in json.loads(subprocess.check_output(['git', 'show', 'HEAD:data/raw/benchmarks/registry.json']))['entries']}
reg['entries'] = [head[SRE] if e['id'] == SRE else e for e in reg['entries']]
man['observations'] = [o for o in man['observations'] if not (o['benchmark_id'] == SRE and o['id'].startswith('cr173:'))]
reg_p.write_text(json.dumps(reg, ensure_ascii=False, indent=2) + '\n'); man_p.write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n')
print('ok')
