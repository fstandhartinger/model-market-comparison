#!/usr/bin/env python3
"""v1.6.42 freeze (Torchcast Decision 4B v1.3; no pricing re-freeze, pricing_v15 stays aa2afcd5).
Dry run by default. --write refuses without the independent PASS verdict and the v1.6.40 seal binding.
The build worker never writes a seal; the release owner runs this after the independent PASS and the flip."""
from pathlib import Path
import argparse, json, hashlib, os, sys

J = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument("--write", action="store_true")
ap.add_argument("--wt", default=str(J.parents[1]))
A = ap.parse_args()
B = J / "batch"
W = Path(A.wt)
D = Path("/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012")
S = D / "frozen-release-v1.6.42"
LIVE_PRICING = Path("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
PRICING_SHA = "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7"
PREV_PRICING_SHA = PRICING_SHA  # unchanged since v1.6.40
NEW = ["torchcast-decision-4b-v1.3"]
ORDERS = {
    "torchcast-decision-4b-v1.3": "order 9494e9ea (Torchcast AI, public); run receipt on file; admitted by the evaluator exposure gate",
}
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
V16 = W / "data/raw/benchmarks/jevbench/v1.6"
res_p = V16 / "jevbench-v1.6.42-results.json"
res = json.loads(res_p.read_text())
proof = json.loads((V16 / "jevbench-v1.6.42-proof.json").read_text())
manifest = json.loads((V16 / "jevbench-v1.6.42-publication.json").read_text())
for k, f in manifest["files"].items():
    assert sha(W / f["path"]) == f["sha256"], f"{k}: bytes differ from the manifest"
PRED_SEAL = D / "frozen-release-v1.6.40/addendum.json"
assert PRED_SEAL.exists(), "v1.6.40 seal missing"
assert proof["predecessor_seal_sha256"] == sha(PRED_SEAL), "predecessor seal binding"
if A.write:
    assert manifest["review"]["verdict"] == "PASS", "freeze write requires the independent PASS verdict first"
    assert "PLACEHOLDER" not in json.dumps(proof) and "PLACEHOLDER" not in json.dumps(res), "no placeholder may remain"
live_now = sha(LIVE_PRICING)
assert live_now == PRICING_SHA, f"live pricing module is not aa2afcd5: {live_now}"
assert proof["pricing_module_sha256"] == PRICING_SHA and proof["predecessor_pricing_module_sha256"] == PREV_PRICING_SHA
rows = {s["key"]: s for s in res["systems"]}
new = sorted(k for k, s in rows.items() if s.get("measured_in") == "v1.6.42")
assert new == NEW, new
reg_p = B / "REGISTRY-PUBLIC.json"
cb_p = B / "cost-basis-v1630.json"
REG = json.loads(reg_p.read_text())
assert sha(reg_p) == proof["registry_sha256"], "registry is not the one the proof names"
assert sha(cb_p) == proof["cost_basis_sha256"], "unchanged common cost basis binding"
files = {
    "baseline.json": D / "frozen-release-v1.6.10/baseline.json",
    "cost-basis.json": cb_p,
    "REGISTRY-PUBLIC.json": reg_p,
    "jevbench-v1.6.0-results.json": res_p,
    "gold-derivation.json": D / "frozen-release-v1.6.40/gold-derivation.json",  # carried: the hosted GLiDE row of v1.6.40 is scored on this derived gold
}
assert sha(files["baseline.json"]) == proof["baseline_sha256"]
old = json.loads(PRED_SEAL.read_text())
assert old["pricing_module_sha256"] == PREV_PRICING_SHA
pa = proof["publication_approval"]
assert pa["top_five_preview"] is None and pa["button_tap"] is False
assert pa["top_five_effect"] in ("changes", "none") and (pa["top_five_effect"] == "none" or pa["top_five_changed_by"] == ["torchcast-decision-4b-v1.3"])
a = dict(old)
a.update({
    "release": "v1.6.42", "draw": "v1.6-regular-20261012",
    "g_med_fixed": 9.839526770355711, "g_med_fixed_from": "v1.6.10",
    "baseline_sha256": sha(files["baseline.json"]),
    "cost_basis_sha256": sha(cb_p),
    "registry_sha256": sha(reg_p),
    "results_sha256": sha(res_p),
    "new_rows": {k: sha(B / "runs" / f"{k}.jsonl") for k in new},
    "new_rows_original_raw_sha256": {},
    "paid_fast_lane_rows": old["paid_fast_lane_rows"] | ORDERS,
    "release_go_rows": old["release_go_rows"],
    "extra_invocations": proof["extra_invocations"],
    "listed_not_ranked": old["listed_not_ranked"],
    "carried_rows": {k: v for k, v in proof["raw_sha256"].items() if k not in NEW},
    "carried_preliminary_rows": old["carried_preliminary_rows"],
    "pricing_module_sha256": PRICING_SHA,
    "pricing_module_live_sha256_at_freeze": live_now,
    "predecessor_pricing_module_sha256": PREV_PRICING_SHA,
    "predecessor_seal_sha256": sha(PRED_SEAL),
    "new_row_price": {
        k: {
            "usd_per_1000": rows[k]["cost"]["usd_per_1000"],
            "price_per_million": [proof["new_rows"][k]["price_per_million"]["input"], proof["new_rows"][k]["price_per_million"]["output"]],
            "input_tokens": proof["new_rows"][k]["input_tokens"],
            "under_cost_cap": proof["new_rows"][k]["under_cost_cap"],
            "basis": REG[k]["cost_basis"],
        }
        for k in new
    },
    "repriced_rows": old.get("repriced_rows", {}),
    "vendor_status": proof.get("vendor_status"),
    "pricing_refreeze": {
        "keys_added": [], "tariff_changed": {},
        "note": "no pricing re-freeze in v1.6.42: pricing_v15 stays at aa2afcd5 (v1.6.40); torchcast-decision-4b-v1.3 is priced through the existing exact-base reference for Qwen/Qwen3.5-4B (frozen DeepInfra snapshot rate, as the live v1.2 row)",
    },
    "publication_approval": pa,
    "frozen_by": "jevbench-add-requests-20260919 (v1.6.42: Torchcast Decision 4B v1.3, built by fastlane-torchcast4b-v13-native-20261023)",
    "frozen_at": "2026-10-23",
})
assert not set(a["new_rows"]) & set(a["carried_rows"])
assert a["new_rows"] == {k: proof["new_rows"][k]["raw_sha256"] for k in new}, a["new_rows"]
assert {k: v for k, v in a["carried_rows"].items() if k != "microsoft-decision-1-a2-20261012"} == {k: v for k, v in proof["raw_sha256"].items() if k not in new}, "carried raws must be exactly the proof raws (+ the A2 alias)"
data = (json.dumps(a, indent=1, sort_keys=True) + "\n").encode()
if not A.write:
    print(data.decode()[:3500], "...")
    print("DRY RUN: nothing written; seal dir", S, "exists" if S.exists() else "does not exist yet", "; live pricing module", live_now[:8])
    sys.exit(0)
S.mkdir(mode=0o700, exist_ok=True)
for name, p in files.items():
    dest = S / name
    if dest.exists():
        assert dest.read_bytes() == Path(p).read_bytes(), name
    else:
        dest.write_bytes(Path(p).read_bytes()); os.chmod(dest, 0o600)
p = S / "addendum.json"
if p.exists():
    assert p.read_bytes() == data, "addendum.json differs from the existing seal"
else:
    p.write_bytes(data); os.chmod(p, 0o600)
for q in sorted(S.iterdir()):
    print(sha(q), q.name)
print("PASS: frozen-release-v1.6.42 exact seal verified; earlier seals untouched")
