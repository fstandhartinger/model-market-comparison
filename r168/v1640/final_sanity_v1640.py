#!/usr/bin/env python3
"""Final sanity for v1.6.40 on the committed worktree: frozen releases untouched, pins, approval filled, no internal references in the new rows."""
import pathlib, json, hashlib, subprocess, ast, re, sys

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
load = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
BASE = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
git = lambda *a: subprocess.check_output(["git", "-C", str(W), *a], text=True)
changed = git("diff", "--name-only", BASE, "HEAD").splitlines()
FROZEN = ["1.6.0", "1.6.1"] + [f"1.6.{n}" for n in list(range(2, 19)) + list(range(20, 40))]
bad = [n for n in changed if any(f"/jevbench-v{v}-" in n for v in FROZEN)]
assert not bad, bad
assert not any(re.search(r"test/fixtures/jevbench-v16(2|3[0-9])-ranks\.json", n) for n in changed), changed
for p in (V / "jevbench-v1.6.1-results.json", V / "jevbench-v1.6.1-categories.json"):
    assert subprocess.run(["git", "-C", str(W), "diff", "--quiet", BASE, "HEAD", "--", str(p.relative_to(W))]).returncode == 0
assert sha(V / "jevbench-v1.6.1-results.json") == "5cd8c1332226ea9c179883d2285c0d8b8cc593ae38f2645197364a7ddd9c83c1"
for ver in range(30, 40):
    assert load(V / f"jevbench-v1.6.{ver}-publication.json")["review"]["verdict"] == "PASS", ver
assert sha(pathlib.Path("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")) == "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7"
assert sha(pathlib.Path("/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py")) == "02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9"
td = load(J / "receipts/topfive-diff.json")
assert set(td["entrants_all"]) <= {"fastino-glide-api"}, td["entrants_all"]
m = load(V / "jevbench-v1.6.40-publication.json")
assert m["review"]["verdict"] in ("PENDING", "PASS")
proof = load(V / "jevbench-v1.6.40-proof.json")
pa = proof["publication_approval"]
assert pa["top_five_preview"] is None and pa["button_tap"] is False
assert pa["top_five_effect"] == ("changes" if td["any_top5_change"] else "none")
assert pa["release_go"]["decision"] == "Florian's release instruction, 22 Oct 2026"
if td["any_top5_change"]:
    assert pa["top_five_changed_by"] == ["fastino-glide-api"] and pa["top_five_authority"].startswith("Florian's release instruction (22 Oct 2026)")
assert "PLACEHOLDER" not in json.dumps(proof) and "PLACEHOLDER" not in (V / "jevbench-v1.6.40-results.json").read_text()
assert proof["pricing_module_sha256"].startswith("aa2afcd5") and proof["predecessor_pricing_module_sha256"].startswith("a8a05890")
res = load(V / "jevbench-v1.6.40-results.json")
S = {s["key"]: s for s in res["systems"]}
BAD = ["LeChonk", "deputy", "/home/", "workers/", "r164", "r168", "PREREG", "worker"]
for k in ["fastino-glide-api"]:
    txt = json.dumps(S[k]) + " ".join(n for n in res["measurement_notes"] if n.startswith(k + ": "))
    hit = [x for x in BAD if x.lower() in txt.lower()]
    assert not hit, (k, hit)
for p in list(J.glob("*.py")):
    ast.parse(p.read_text(), filename=str(p))
for p in list(J.glob("*.sh")):
    subprocess.run(["bash", "-n", str(p)], check=True)
print("PASS: final sanity (frozen releases untouched vs", BASE, "; pins; release-GO approval record; no internal refs; scripts parse)")
