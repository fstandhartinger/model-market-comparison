import json, pathlib

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
p = json.loads((V / "jevbench-v1.6.40-publication.json").read_text())
rows = json.loads((J / "receipts/NEW-ROW-SPEC.json").read_text())
s = (
    (J / "lib-v1640.template.mjs")
    .read_text()
    .replace(
        "/*HASHES*/",
        json.dumps({k: v["sha256"] for k, v in p["files"].items()}, sort_keys=True),
    )
    .replace("/*KEYS*/", json.dumps(sorted(rows)).replace('"', "'").replace(",", ","))
    .replace("/*ROWS*/", json.dumps(rows, sort_keys=True, ensure_ascii=False))
)
(W / "lib/jevbench-v1640-release.mjs").write_text(s)
