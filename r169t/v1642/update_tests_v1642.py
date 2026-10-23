"""Update only latest-live expectations (the newest release label moves from v1.6.40 to v1.6.42; v1.6.41 is reserved and unused; one paid
self-hosted row joins the merged board) and the merged rank fixture reference. Idempotent: every replacement is asserted or already applied."""

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
    sub(name, [("jevbench-v1640-ranks.json", "jevbench-v1642-ranks.json")])
sub("cr-205-jev-page-structure.test.mjs", [("'v1.6.39', 'v1.6.40'].sort()", "'v1.6.39', 'v1.6.40', 'v1.6.42'].sort()")])
p = W / "test/jevbench-merged-board.test.mjs"
s = p.read_text()
N_ADDED = len(json.loads((J / "batch/ROWS.json").read_text()))
if "const V1642_ADDED" not in s:
    s = s.replace("const COHORT_ROWS =", f"const V1642_ADDED = {N_ADDED};\nconst COHORT_ROWS =").replace("V1639_ADDED + V1640_ADDED;", "V1639_ADDED + V1640_ADDED + V1642_ADDED;")
    assert "V1642_ADDED;" in s
s = s.replace("draw.release, 'v1.6.40')", "draw.release, 'v1.6.42')").replace("['v1.6.4', 'v1.6.40', 'v1.6.9']", "['v1.6.4', 'v1.6.42', 'v1.6.9']")
p.write_text(s)
sub(
    "jevbench-v163-fresh-source.test.mjs",
    [
        ("'v1.6.39', 'v1.6.40']", "'v1.6.39', 'v1.6.40', 'v1.6.42']"),
        ("'v1.6.41', 'v1.6', ''", "'v1.6.41', 'v1.6.43', 'v1.6', ''"),
        ("exactly v1.6.2 to v1.6.40", "exactly v1.6.2 to v1.6.42"),
    ],
)
for name in ["jevbench-v1635-release.test.mjs", "jevbench-v1636-release.test.mjs"]:
    sub(name, [("rows[0].draw.release,'v1.6.40'", "rows[0].draw.release,'v1.6.42'")])
sub(
    "jevbench-v1637-release.test.mjs",
    [
        ("rows[0].draw.release,'v1.6.40'", "rows[0].draw.release,'v1.6.42'"),
        ("data.artifact.revision,'v1.6.40'", "data.artifact.revision,'v1.6.42'"),
    ],
)
# Torchcast Decision 4B (v1.3) (Capability 77.5, self-hosted, inside both caps) enters the capped open board at #11, so open-board ranks below
# it move down by one, and it joins the combined capped Capability ranking above torchcast-decision-12b (one place down).
p = W / "test/cr-303-feed-split.test.mjs"
s = p.read_text()
for a, b in [
    ("get(feed, 'h2o-lightning-4b').capability.open_board_rank, 12)", "get(feed, 'h2o-lightning-4b').capability.open_board_rank, 13)"),
    ("get(feed, 'surogate-rune-26b-a4b-v3-v16').capability.open_board_rank, 14)", "get(feed, 'surogate-rune-26b-a4b-v3-v16').capability.open_board_rank, 15)"),
    ("get(feed, 'xor-26b-a4b').capability.open_board_rank, 17)", "get(feed, 'xor-26b-a4b').capability.open_board_rank, 18)"),
    ("get(feed, 'torchcast-decision-12b').capability.open_board_rank, 19)", "get(feed, 'torchcast-decision-12b').capability.open_board_rank, 20)"),
    ("+ Number(V1640_ROW_SPEC['fastino-glide-api'].ranked));", "+ Number(V1640_ROW_SPEC['fastino-glide-api'].ranked) + Number(V1642_ROW_SPEC['torchcast-decision-4b-v1.3'].ranked));"),
    ("import { V1640_ROW_SPEC } from '../lib/jevbench-v1640-release.mjs';", "import { V1640_ROW_SPEC } from '../lib/jevbench-v1640-release.mjs';\nimport { V1642_ROW_SPEC } from '../lib/jevbench-v1642-release.mjs';"),
]:
    if b in s:
        continue
    assert a in s, a
    s = s.replace(a, b)
p.write_text(s)
