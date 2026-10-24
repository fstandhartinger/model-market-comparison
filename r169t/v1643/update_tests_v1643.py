"""Update latest-live assertions and merged fixture; preserve all archived fixtures."""
from pathlib import Path
J=Path(__file__).resolve().parent;W=J.parents[1]
for n in ['jevbench-v1630-release.test.mjs','jevbench-v1630-open-fold.test.mjs']:
 p=W/'test'/n;p.write_text(p.read_text().replace('jevbench-v1642-ranks.json','jevbench-v1643-ranks.json'))
for n in ['cr-205-jev-page-structure.test.mjs','jevbench-v163-fresh-source.test.mjs']:
 p=W/'test'/n;s=p.read_text().replace("'v1.6.40', 'v1.6.42']","'v1.6.40', 'v1.6.42', 'v1.6.43']").replace("'v1.6.41', 'v1.6.43', 'v1.6', ''","'v1.6.41', 'v1.6.44', 'v1.6', ''").replace('exactly v1.6.2 to v1.6.42','exactly v1.6.2 to v1.6.43');p.write_text(s)
for n in ['jevbench-v1635-release.test.mjs','jevbench-v1636-release.test.mjs','jevbench-v1637-release.test.mjs','jevbench-merged-board.test.mjs']:
 p=W/'test'/n;s=p.read_text().replace("draw.release,'v1.6.42'","draw.release,'v1.6.43'").replace("draw.release, 'v1.6.42'","draw.release, 'v1.6.43'").replace("data.artifact.revision,'v1.6.42'","data.artifact.revision,'v1.6.43'").replace("['v1.6.4', 'v1.6.42', 'v1.6.9']","['v1.6.4', 'v1.6.43', 'v1.6.9']")
 if n=='jevbench-merged-board.test.mjs' and 'const V1643_ADDED' not in s:
  s=s.replace('const COHORT_ROWS =','const V1643_ADDED = 1;\nconst COHORT_ROWS =').replace(' + V1642_ADDED;',' + V1642_ADDED + V1643_ADDED;')
 p.write_text(s)
p=W/'test/cr-303-feed-split.test.mjs';s=p.read_text()
if "import { V1643_ROW_SPEC }" not in s:
 s=s.replace("import { V1642_ROW_SPEC }", "import { V1643_ROW_SPEC } from '../lib/jevbench-v1643-release.mjs';\nimport { V1642_ROW_SPEC }")
 s=s.replace("+ Number(V1642_ROW_SPEC['torchcast-decision-4b-v1.3'].ranked));","+ Number(V1642_ROW_SPEC['torchcast-decision-4b-v1.3'].ranked) + Number(V1643_ROW_SPEC['subq-snap-1.1'].ranked));")
p.write_text(s)
