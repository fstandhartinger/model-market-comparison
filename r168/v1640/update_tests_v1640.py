"""Update only latest-live expectations (the newest release label moves from v1.6.39 to v1.6.40, one hosted-API row joins the merged board)
and the merged rank fixture reference. Idempotent: every replacement is asserted or already applied."""

import json, re
from pathlib import Path

J = Path(__file__).resolve().parent
W = J.parents[1]


def sub(path, pairs):
    p = W / "test" / path
    s = p.read_text()
    for a, b in pairs:
        if b in s and a not in s:
            continue
        assert a in s, (path, a[:60])
        s = s.replace(a, b)
    p.write_text(s)


for name in ["jevbench-v1630-release.test.mjs", "jevbench-v1630-open-fold.test.mjs"]:
    sub(name, [("jevbench-v1639-ranks.json", "jevbench-v1640-ranks.json")])
sub("cr-205-jev-page-structure.test.mjs", [("'v1.6.38', 'v1.6.39'].sort()", "'v1.6.38', 'v1.6.39', 'v1.6.40'].sort()")])
p = W / "test/jevbench-merged-board.test.mjs"
s = p.read_text()
N_ADDED = len(json.loads((J / "batch/ROWS.json").read_text()))
if "const V1640_ADDED" not in s:
    s = s.replace("const COHORT_ROWS =", f"const V1640_ADDED = {N_ADDED};\nconst COHORT_ROWS =").replace("V1638_ADDED + V1639_ADDED;", "V1638_ADDED + V1639_ADDED + V1640_ADDED;")
    assert "V1640_ADDED;" in s
s = s.replace("draw.release, 'v1.6.39')", "draw.release, 'v1.6.40')").replace("['v1.6.39', 'v1.6.4', 'v1.6.9']", "['v1.6.4', 'v1.6.40', 'v1.6.9']")
p.write_text(s)
sub(
    "jevbench-v163-fresh-source.test.mjs",
    [
        ("'v1.6.38', 'v1.6.39']", "'v1.6.38', 'v1.6.39', 'v1.6.40']"),
        ("'v1.6.40', 'v1.6', ''", "'v1.6.41', 'v1.6', ''"),
        ("exactly v1.6.2 to v1.6.39", "exactly v1.6.2 to v1.6.40"),
    ],
)
for name in ["jevbench-v1635-release.test.mjs", "jevbench-v1636-release.test.mjs"]:
    sub(name, [("rows[0].draw.release,'v1.6.39'", "rows[0].draw.release,'v1.6.40'")])
sub(
    "jevbench-v1637-release.test.mjs",
    [
        ("rows[0].draw.release,'v1.6.39'", "rows[0].draw.release,'v1.6.40'"),
        ("data.artifact.revision,'v1.6.39'", "data.artifact.revision,'v1.6.40'"),
    ],
)
# Fastino GLiDE (hosted API, Capability 84.7) enters the combined board's Capability ranking above torchcast-decision-12b (one place down).
p = W / "test/cr-303-feed-split.test.mjs"
s = p.read_text()
for a, b in [
    ("+ Number(V1639_ROW_SPEC['h2o-lightning-31b'].ranked));", "+ Number(V1639_ROW_SPEC['h2o-lightning-31b'].ranked) + Number(V1640_ROW_SPEC['fastino-glide-api'].ranked));"),
    ("import { V1639_ROW_SPEC } from '../lib/jevbench-v1639-release.mjs';", "import { V1639_ROW_SPEC } from '../lib/jevbench-v1639-release.mjs';\nimport { V1640_ROW_SPEC } from '../lib/jevbench-v1640-release.mjs';"),
]:
    if b in s:
        continue
    assert a in s, a
    s = s.replace(a, b)
p.write_text(s)
