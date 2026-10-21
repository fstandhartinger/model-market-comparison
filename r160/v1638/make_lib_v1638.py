import json, pathlib

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
p = json.loads((V / "jevbench-v1.6.38-publication.json").read_text())
rows = json.loads((J / "receipts/NEW-ROW-SPEC.json").read_text())
s = (
    (J / "lib-v1638.template.mjs")
    .read_text()
    .replace(
        "/*HASHES*/",
        json.dumps({k: v["sha256"] for k, v in p["files"].items()}, sort_keys=True),
    )
    .replace("/*ROWS*/", json.dumps(rows, sort_keys=True, ensure_ascii=False))
)
(W / "lib/jevbench-v1638-release.mjs").write_text(s)
