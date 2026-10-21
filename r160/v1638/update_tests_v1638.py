"""Update only latest-live expectations and create a separate merged rank fixture."""

from pathlib import Path

J = Path(__file__).resolve().parent
W = J.parents[1]
for name in ["jevbench-v1630-release.test.mjs", "jevbench-v1630-open-fold.test.mjs"]:
    p = W / "test" / name
    s = p.read_text().replace("jevbench-v1637-ranks.json", "jevbench-v1638-ranks.json")
    p.write_text(s)
p = W / "test/cr-205-jev-page-structure.test.mjs"
s = p.read_text().replace(
    "'v1.6.36', 'v1.6.37'].sort()", "'v1.6.36', 'v1.6.37', 'v1.6.38'].sort()"
)
p.write_text(s)
p = W / "test/jevbench-merged-board.test.mjs"
s = p.read_text()
if "const V1638_ADDED" not in s:
    s = s.replace(
        "const COHORT_ROWS =", "const V1638_ADDED = 3;\nconst COHORT_ROWS ="
    ).replace("+ V1637_RESTATED;", "+ V1637_RESTATED + V1638_ADDED;")
s = s.replace("draw.release, 'v1.6.37')", "draw.release, 'v1.6.38')").replace(
    "['v1.6.37', 'v1.6.4', 'v1.6.9']", "['v1.6.38', 'v1.6.4', 'v1.6.9']"
)
p.write_text(s)
p = W / "test/jevbench-v163-fresh-source.test.mjs"
s = (
    p.read_text()
    .replace("'v1.6.36', 'v1.6.37']", "'v1.6.36', 'v1.6.37', 'v1.6.38']")
    .replace("'v1.6.38', 'v1.6', ''", "'v1.6.39', 'v1.6', ''")
    .replace("exactly v1.6.2 to v1.6.37", "exactly v1.6.2 to v1.6.38")
)
p.write_text(s)
for name in ["jevbench-v1635-release.test.mjs", "jevbench-v1636-release.test.mjs"]:
    p = W / "test" / name
    s = p.read_text().replace(
        "rows[0].draw.release,'v1.6.37'", "rows[0].draw.release,'v1.6.38'"
    )
    p.write_text(s)
p = W / "test/jevbench-v1637-release.test.mjs"
s = (
    p.read_text()
    .replace("rows[0].draw.release,'v1.6.37'", "rows[0].draw.release,'v1.6.38'")
    .replace("data.artifact.revision,'v1.6.37'", "data.artifact.revision,'v1.6.38'")
)
p.write_text(s)
