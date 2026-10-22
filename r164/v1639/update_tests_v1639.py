"""Update only latest-live expectations (the newest release label moves from v1.6.38 to v1.6.39) and the merged rank fixture reference."""

import json
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
    sub(name, [("jevbench-v1638-ranks.json", "jevbench-v1639-ranks.json")])
p = W / "test/cr-205-jev-page-structure.test.mjs"
s = p.read_text()
if "'v1.6.39'" not in s:
    assert s.count("'v1.6.37', 'v1.6.38'].sort()") == 1
    s = s.replace("'v1.6.37', 'v1.6.38'].sort()", "'v1.6.37', 'v1.6.38', 'v1.6.39'].sort()")
p.write_text(s)
p = W / "test/jevbench-merged-board.test.mjs"
s = p.read_text()
N_ADDED = len(json.loads((J / "batch/ROWS.json").read_text()))
if "const V1639_ADDED" not in s:
    s = s.replace("const COHORT_ROWS =", f"const V1639_ADDED = {N_ADDED};\nconst COHORT_ROWS =").replace(
        "+ V1638_ADDED;", "+ V1638_ADDED + V1639_ADDED;"
    )
    assert "V1639_ADDED;" in s
s = s.replace("draw.release, 'v1.6.38')", "draw.release, 'v1.6.39')").replace(
    "['v1.6.38', 'v1.6.4', 'v1.6.9']", "['v1.6.39', 'v1.6.4', 'v1.6.9']"
)
p.write_text(s)
p = W / "test/jevbench-v163-fresh-source.test.mjs"
s = p.read_text()
if "exactly v1.6.2 to v1.6.39" not in s:
    s = (
        s.replace("'v1.6.37', 'v1.6.38']", "'v1.6.37', 'v1.6.38', 'v1.6.39']")
        .replace("'v1.6.39', 'v1.6', ''", "'v1.6.40', 'v1.6', ''")
        .replace("exactly v1.6.2 to v1.6.38", "exactly v1.6.2 to v1.6.39")
    )
p.write_text(s)
for name in ["jevbench-v1635-release.test.mjs", "jevbench-v1636-release.test.mjs"]:
    sub(name, [("rows[0].draw.release,'v1.6.38'", "rows[0].draw.release,'v1.6.39'")])
sub(
    "jevbench-v1637-release.test.mjs",
    [
        ("rows[0].draw.release,'v1.6.38'", "rows[0].draw.release,'v1.6.39'"),
        ("data.artifact.revision,'v1.6.38'", "data.artifact.revision,'v1.6.39'"),
    ],
)

# H2O-Lightning-31B (Capability 85.2, self-hosted, inside both caps) enters the open-board Capability ranking at #2, so open-board
# ranks below it move down by one and the open-board fold no longer reaches Jev 1.13.0 without its pin.
p = W / "test/cr-303-feed-split.test.mjs"
s = p.read_text()
if "v1.6.39: H2O-Lightning-31B" not in s:
    a = "  assert.equal(get(feed, 'quyet-1-0-large').capability.open_board_rank, 3);"
    assert s.count(a) == 1
    s = s.replace(a, "  // v1.6.39: H2O-Lightning-31B (Capability 85.2, self-hosted, inside both caps) enters the open board at #2, one place above Quyet.\n  assert.equal(get(feed, 'quyet-1-0-large').capability.open_board_rank, 4);")
p.write_text(s)
p = W / "test/jevbench-v1630-open-fold.test.mjs"
s = p.read_text()
a = "assert.ok(rowIds(beforeHead, 'data-bh-jev14-capability-row').includes('jev-1.13.0') && !rowIds(beforeHead, 'data-bh-jev14-capability-row').includes('jev-1.14.0'),"
b = "assert.ok(!rowIds(beforeHead, 'data-bh-jev14-capability-row').includes('jev-1.14.0'),"
if a in s:
    s = s.replace(a, b)
p.write_text(s)
p = W / "test/cr-303-feed-split.test.mjs"
s = p.read_text()
for a, b in [
    ("get(feed, 'h2o-lightning-4b').capability.open_board_rank, 11)", "get(feed, 'h2o-lightning-4b').capability.open_board_rank, 12)"),
    ("get(feed, 'surogate-rune-26b-a4b-v3-v16').capability.open_board_rank, 13)", "get(feed, 'surogate-rune-26b-a4b-v3-v16').capability.open_board_rank, 14)"),
    ("get(feed, 'xor-26b-a4b').capability.open_board_rank, 16)", "get(feed, 'xor-26b-a4b').capability.open_board_rank, 17)"),
    ("get(feed, 'torchcast-decision-12b').capability.open_board_rank, 18)", "get(feed, 'torchcast-decision-12b').capability.open_board_rank, 19)"),
    ("get(feed, 'basal-omni-1.0-ultra').capability.open_board_rank, 2)", "get(feed, 'basal-omni-1.0-ultra').capability.open_board_rank, 3)"),
    ("32 + Number(V1638_ROW_SPEC['drex-max'].ranked));", "32 + Number(V1638_ROW_SPEC['drex-max'].ranked) + Number(V1639_ROW_SPEC['h2o-lightning-31b'].ranked));"),
    ("import { V1638_ROW_SPEC } from '../lib/jevbench-v1638-release.mjs';", "import { V1638_ROW_SPEC } from '../lib/jevbench-v1638-release.mjs';\nimport { V1639_ROW_SPEC } from '../lib/jevbench-v1639-release.mjs';"),
]:
    if b in s:
        continue
    assert a in s, a
    s = s.replace(a, b)
p.write_text(s)
