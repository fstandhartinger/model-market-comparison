#!/usr/bin/env python3
"""Independent aggregate sanity + build reproducibility; never prints item-level data."""
import pathlib, json, hashlib, subprocess, sys, copy

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
load = lambda p: json.loads(pathlib.Path(p).read_text())
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
paths = list(V.glob("jevbench-v1.6.38-*.json")) + [
    V / "jevbench-v1.6-cohort-topic-cells.json",
    W / "lib/jevbench-v1638-release.mjs",
]
if "--repro" in sys.argv:
    before = {str(p): sha(p) for p in paths}
    subprocess.run(
        [sys.executable, str(J / "build_publication_v1638.py")],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    subprocess.run([sys.executable, str(J / "make_lib_v1638.py")], check=True)
    after = {str(p): sha(p) for p in paths}
    assert before == after
    print(
        "PASS: deterministic rebuild, all release, topic-supplement and validator bytes identical"
    )
m = load(V / "jevbench-v1.6.38-publication.json")
r = load(V / "jevbench-v1.6.38-results.json")
prev = load(V / "jevbench-v1.6.37-results.json")
p = load(V / "jevbench-v1.6.38-proof.json")
c = load(V / "jevbench-v1.6.38-categories.json")
by = {s["key"]: s for s in r["systems"]}
assert m["review"] == {
    "engine": "PENDING",
    "verdict": "PENDING",
    "receipt_sha256": None,
}
for k, f in m["files"].items():
    assert sha(W / f["path"]) == f["sha256"], k
for old in prev["systems"]:
    new = copy.deepcopy(by[old["key"]])
    o = copy.deepcopy(old)
    for v in [new, o]:
        v.pop("rank", None)
        v.pop("ranks", None)
    assert new == o, old["key"]
assert len(r["systems"]) == 75 and r["n_ranked"] in [63, 64]
for k in ["drex-max", "launchables-myles-g-12b", "iota-decide-4b"]:
    s = by[k]
    q = p["new_rows"][k]
    assert (
        q["raw_sha256"] == p["raw_sha256"][k]
        and q["rows"] == 1500
        and q["over_10s"] == 0
    )
    assert c["systems"][k] and s["cost"]["usd_per_1000"] == q["usd_per_1000"]
    assert q["paid_fast_lane"]
    if s["ranked"]:
        assert s["cost"]["common_basis"]["n_items"] == 1485
    else:
        assert (
            s["axes"]["cost"] is None
            and all(v is None for v in s["scores"].values())
            and s["rank"] is None
            and all(k not in b["order"] for b in r["board"].values())
        )
for f in paths:
    if f.suffix == ".json" and not any(
        f.name.endswith("-" + k + ".json") for k in ["history", "history-carry"]
    ):
        text = f.read_text()
        assert (
            "/home/flori/" not in text
            and '"task_id"' not in text
            and '"item_text"' not in text
        ), f
assert (
    sha("/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py")
    == "02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9"
)
assert (
    sha("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
    == "1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1"
)
print(
    "PASS: 75 rows; 72 carried rows byte-identical except placement; source hashes, row proof, common cost basis, PENDING review and public aggregate-only artifacts verified"
)
