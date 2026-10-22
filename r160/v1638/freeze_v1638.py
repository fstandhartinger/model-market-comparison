#!/usr/bin/env python3
"""Read-only freeze plan. Worker never writes seals; publication owner completes custody."""
import argparse, pathlib, json, hashlib

ap = argparse.ArgumentParser()
ap.add_argument("--write", action="store_true")
ap.add_argument("--wt", default=str(pathlib.Path(__file__).resolve().parents[2]))
a = ap.parse_args()
W = pathlib.Path(a.wt)
J = pathlib.Path(__file__).resolve().parent
V = W / "data/raw/benchmarks/jevbench/v1.6"
D = pathlib.Path("/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012")
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(pathlib.Path(p).read_text())
m = load(V / "jevbench-v1.6.38-publication.json")
p = load(V / "jevbench-v1.6.38-proof.json")
for f, v in m["files"].items():
    assert sha(W / v["path"]) == v["sha256"], f
assert p["predecessor_seal_sha256"] == sha(D / "frozen-release-v1.6.37/addendum.json")
assert sha(J / "batch/cost-basis-v1630.json") == p["cost_basis_sha256"]
assert sha(J / "batch/REGISTRY-PUBLIC.json") == p["registry_sha256"]
if a.write:
    assert m["review"]["verdict"] == "PASS", "freeze write requires independent PASS"
    raise SystemExit(
        "REFUSED: this worker is authorised for local preparation only; release owner must write the seal"
    )
print(
    json.dumps(
        {
            "dry_run": True,
            "release": "v1.6.38",
            "destination": str(D / "frozen-release-v1.6.38"),
            "review": m["review"],
            "new_rows": {
                k: p["raw_sha256"][k]
                for k in sorted(p["new_rows"])
            },
            "writes": False,
        },
        indent=1,
    )
)
