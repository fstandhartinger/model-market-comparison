#!/usr/bin/env python3
"""Build local PENDING v1.6.39; preserve predecessor rows byte-for-byte except placement.
Field scoring verifies the 72 same-draw rows; published bootstrap intervals are
retained (rather than replacing them merely because sorted-roster seeds change).
"""
import hashlib, json, os, pathlib, copy, shutil

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
B = J / "batch"
V = W / "data/raw/benchmarks/jevbench/v1.6"
REV = "v1.6.39"
PREV = "v1.6.38"
CAP = 0.06459465517241379
load = lambda p: json.loads(pathlib.Path(p).read_text())
put = lambda p, v: pathlib.Path(p).write_text(
    json.dumps(v, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
)
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
PRICING_SHA = sha("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
assert PRICING_SHA == "a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7"
cp = copy.deepcopy
old = {
    n: load(V / f"jevbench-{PREV}-{n}.json")
    for n in ["results", "categories", "proof", "publication"]
}
reg = load(B / "REGISTRY-PUBLIC.json")
info = load(B / "ROWS.json")
ent = load(B / "ENTRIES.json")
sc = load(B / "out-v1639/jevbench-v1.6.0-results.json")
newkeys = sorted(info)
assert newkeys == ["h2o-lightning-31b"]
NAME = "H2O-Lightning-31B"
LABEL = NAME
dec = load(B / "out-v1639/noul-decisive.json")
newsc = {s["key"]: s for s in sc["systems"]}
prev = {s["key"]: s for s in old["results"]["systems"]}
out = cp(prev)
assert old["publication"]["review"]["verdict"] == "PASS" and len(prev) == 75
assert sc["G_med"] == old["results"]["G_med"] == 9.839526770355711
assert sc["v16"]["scorer_sources_sha256"] == old["proof"]["scorer_sources_sha256"], "frozen scorer dependencies moved"
checks = {}
for k in sorted(set(reg) - set(newkeys)):
    a, b = prev[k], newsc[k]
    for f in [
        "scores",
        "axes",
        "capability",
        "cost",
        "speed",
        "intelligence",
        "calibration",
    ]:
        assert a[f] == b[f], (k, f)
    assert a["noul_decisive"] == dec[k], k
    checks[k] = True
assert len(checks) == 72
for k in newkeys:
    s = cp(newsc[k])
    e = reg[k]
    s.update(
        repo=e["repo"],
        model_pin=(
            e["repo"].replace("https://huggingface.co/", "") + "@" + e["revision"]
            if e.get("revision")
            else "hosted-api:" + e["repo"] + "#" + k
        ),
        last_measured_on="2026-10-22",
        measurement_date_status="measured",
        measured_in=REV,
        underlying=e["code_revision"] + " " + e["disclosure"],
        paid_fast_lane=True,
        noul_decisive=dec[k],
    )
    for f in ["author", "endpoint_condition", "licence"]:
        s[f] = e[f]
    assert s["status"]["rows"] == 1500 and s["status"]["answered_ok"] == info[k]["ok"]
    assert s["cost"]["usd_per_1000"] == info[k]["usd_common"]
    assert s["speed"]["adjustment"] == "x2 + 0.15 s (assumption, not measured)"
    if not e["ranked"]:
        s["not_ranked_because"] = (
            "No eligible 30-day list price or base-model estimate. No Cost, Composite or rank, including Capability; listed as measured."
        )
        s["views"] = {x: None for x in s["views"]}
        s["ranks"] = {x: None for x in ["A", "B", "C", "capability"]}
    out[k] = s
# Preserve predecessor tie order, insert only ranked new rows. Restated H2O/Kahn rows remain on their original draw.
orders = {}
for metric in ["A", "B", "C", "capability"]:
    order = list(old["results"]["board"][metric]["order"])
    val = lambda k: (
        out[k]["capability"] if metric == "capability" else out[k]["scores"][metric]
    )
    for k in sorted([k for k in newkeys if out[k]["ranked"]], key=lambda k: -val(k)):
        at = next((i for i, x in enumerate(order) if val(x) < val(k)), len(order))
        order.insert(at, k)
    assert all(val(a) >= val(b) for a, b in zip(order, order[1:]))
    orders[metric] = order
    for i, k in enumerate(order):
        out[k]["ranks"][metric] = i + 1
for k in out:
    if out[k]["ranked"]:
        out[k]["rank"] = out[k]["ranks"]["A"]
for k in prev:
    a, b = cp(prev[k]), cp(out[k])
    a.pop("rank", None)
    a.pop("ranks", None)
    b.pop("rank", None)
    b.pop("ranks", None)
    assert a == b, ("carried bytes", k)
res = cp(old["results"])
res.update(
    revision=REV,
    label="JevBench v1.6.39: " + LABEL + " added",
    systems=sorted(out.values(), key=lambda s: s["key"]),
    n_ranked=sum(s["ranked"] for s in out.values()),
    roster_count=len(out),
    source_sha256=sha(B / "out-v1639/jevbench-v1.6.0-results.json"),
    source_note="One paid public fast-lane addition (self-hosted) on v1.6-regular-20261012. Unmodified frozen score_v16.py (02132271), O1S, B=1000, seed 16, fixed G_med 9.839526770355711, unchanged v1.6.30 common 1,485-item cost basis. All 72 carried same-draw point estimates reproduce; all 75 carried published rows are byte-identical except rank/ranks, including published intervals and diagnostics. New-row intervals use their sorted full-field seeds. H2O-Lightning and Kahn1 retain their v1.6.38 restatement of v1.6.1. This is v1.6 method; no 10-second rule.",
)
for m in orders:
    res["board"][m]["order"] = orders[m]
tf = (
    load(J / "receipts/topfive-diff.json")
    if (J / "receipts/topfive-diff.json").exists()
    else None
)
paid = cp(
    load(V / "jevbench-v1.6.36-proof.json")["publication_approval"]["paid_fast_lane"]
)
paid["orders"] = {
    k: {"h2o-lightning-31b": "5fa1a5f0"}[k]
    for k in newkeys
}
# Paid public fast-lane order: a top-five change is covered by the automatic paid publication exception (skill jevbench-fast-lane,
# "Paid runs publish automatically ... needs no separate preview/GO"); no preview card exists, none is claimed, nothing is a placeholder.
approval = {
    "go": old["proof"]["publication_approval"]["go"],
    "asks": {
        k: dict(
            key=k,
            relay="Paid public fast-lane order " + paid["orders"][k],
            handoff=ent[k]["handoff"],
            admission=ent[k]["custody"],
        )
        for k in newkeys
    },
    "paid_fast_lane": paid,
    "top_five_effect": "changes" if tf and tf["any_top5_change"] else "none",
    "top_five_preview": None,
    "button_tap": False,
}
if tf and tf["any_top5_change"]:
    assert set(tf["entrants_all"]) <= set(newkeys)
    approval["top_five_changed_by"] = sorted(tf["entrants_all"])
    approval["top_five_authority"] = "paid fast-lane publication exception; no top-five preview card sent, none claimed"
approval_marker = "Publication authority: paid fast-lane publication exception (paid public order); no Telegram preview card was sent and no button was pressed."
notes = [
    "v1.6.39 adds one paid public fast-lane row, a self-hosted model. All carried rows retain every field except rank/ranks, including published confidence intervals. The new row uses its full-field bootstrap seed. This release uses the v1.6 method; the 10-second rule does not apply. "
    + "H2O-Lightning-31B is priced as an ESTIMATE from its exact base model, google/gemma-4-31B-it, USD 0.09/M input and 0.34/M output, as for the other Gemma-4-31B-it rows.",
    tf["note"] if tf else "Board effect provisional: 40-list comparison pending.",
    (
        "Publication of v1.6.39: paid fast-lane row (29 Sep 2026 paid publication exception). H2O-Lightning-31B changes public top-five lists; a paid public fast-lane order publishes under that exception, so no separate top-five preview approval was sought and none is claimed; no Telegram button was pressed."
        if tf and tf["any_top5_change"]
        else "Publication of v1.6.39: paid fast-lane row (29 Sep 2026 paid publication exception); no top-five list changes, so no top-five preview card was sent and none is claimed; no Telegram button was pressed."
    ),
]
for k in newkeys:
    s = out[k]
    notes.append(
        k
        + ": "
        + reg[k]["disclosure"]
        + " "
        + reg[k]["endpoint_condition"]
        + " "
        + reg[k]["cost_basis"]
        + f' Decisions over 10 seconds: {info[k]["over_10s"]} (maximum {info[k]["max_latency_s"]} s); no 10-second rule applied in v1.6. Raw sha256 '
        + info[k]["raw_sha256"]
        + "."
    )
res["measurement_notes"] = old["results"]["measurement_notes"] + notes
put(V / f"jevbench-{REV}-results.json", res)
rp = V / f"jevbench-{REV}-results.json"
cats = cp(old["categories"])
scat = load(B / "out-v1639/categories.json")
for k in old["categories"]["systems"]:
    assert cats["systems"][k] == scat["systems"][k], ("category", k)
for k in newkeys:
    cats["systems"][k] = scat["systems"][k]
    cats["lanes"][k] = reg[k]["lane"]
cats.update(
    revision=REV, results_sha256=sha(rp), source_results_sha256=res["source_sha256"]
)
cats[
    "lane_note"
] += " One paid full-draw row added in v1.6.39; stored per-item cells. H2O and Kahn1 retain their original draw cells."
put(V / f"jevbench-{REV}-categories.json", cats)
for f in ["history", "history-carry"]:
    shutil.copyfile(V / f"jevbench-{PREV}-{f}.json", V / f"jevbench-{REV}-{f}.json")
sup_path = V / "jevbench-v1.6-cohort-topic-cells.json"
sup = load(sup_path)
d = sup["draws"]["v1.6-regular-20261012"]
tc = load(B / "topics-v1639/categories-with-topics.json")
cell = lambda x: {
    k: {"n": v["n"], "competence": v["competence"]} for k, v in sorted(x.items())
}
assert tc["labels_sha256"] == d["labels_sha256"]
for k in set(reg) - set(newkeys):
    assert d["systems"][k] == {
        f: cell(tc["systems"][k][f]) for f in ["topics", "usecases"]
    }, ("topic", k)
for k in newkeys:
    d["systems"][k] = {f: cell(tc["systems"][k][f]) for f in ["topics", "usecases"]}
d.update(release=REV, results_sha256=sha(rp))
put(sup_path, sup)
proof = cp(old["proof"])
proof.update(
    revision=REV,
    registry_sha256=sha(B / "REGISTRY-PUBLIC.json"),
    publication_approval=approval,
    predecessor_pricing_module_sha256=old["proof"]["pricing_module_sha256"],
    pricing_module_sha256=PRICING_SHA,
)
for k in newkeys:
    s = out[k]
    proof["raw_sha256"][k] = info[k]["raw_sha256"]
    proof["new_rows"][k] = {
        **info[k],
        **ent[k],
        "endpoint_kind": s["endpoint_kind"],
        "lane": reg[k]["lane"],
        "ranked": s["ranked"],
        "paid_fast_lane": True,
        "measured_in": REV,
        "price_per_million": {
            "input": reg[k]["price_in_per_m"],
            "output": reg[k]["price_out_per_m"],
        },
        "disclosure": reg[k]["disclosure"],
        "endpoint_condition": reg[k]["endpoint_condition"],
        "common_basis": s["cost"]["common_basis"],
        "usd_per_1000": s["cost"]["usd_per_1000"],
        "cost_cap_ratio": (s["cost"]["usd_per_1000"] / CAP if s["ranked"] else None),
        "under_cost_cap": (s["cost"]["usd_per_1000"] <= CAP if s["ranked"] else None),
        "treatment": ("ranked" if s["ranked"] else "listed-not-ranked"),
        "truncated_long_items": 0,
    }
    # Store only hash of local critic; never private filesystem paths in public evidence.
    proof["new_rows"][k].pop("pre_score_review", None)
    p = ent[k]["pre_score_review"]
    proof["new_rows"][k]["pre_score_review_sha256"] = sha(p) if p else None
for s in proof["systems"]:
    s["rank"] = out[s["key"]]["rank"]
for k in newkeys:
    s = out[k]
    proof["systems"].append(
        dict(
            key=k,
            display=s["display"],
            rows=1500,
            answered_ok=info[k]["ok"],
            status=s["status"]["status"],
            composite_A=s["scores"]["A"],
            axes=s["axes"],
            capability=s["capability"],
            rank=s["rank"],
            usd_per_1000=s["cost"]["usd_per_1000"],
            cost_kind=s["cost"]["kind"],
            noul_decisive=s["noul_decisive"],
            model_pin=s["model_pin"],
            raw_sha256=info[k]["raw_sha256"],
            measured_by=s["endpoint_condition"],
            source_review_sha256=proof["new_rows"][k]["pre_score_review_sha256"],
        )
    )
proof["predecessor_seal_sha256"] = sha(
    "/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.6.38/addendum.json"
)
proof[
    "authority"
] += (
    " NEW in v1.6.39: one paid public fast-lane addition (H2O-Lightning-31B); paid publication exception"
+ ("; top-five lists change. " + approval_marker if tf and tf["any_top5_change"] else "; no top-five list changes, no preview card, no button tap.")
)
put(V / f"jevbench-{REV}-proof.json", proof)
pub = cp(old["publication"])
pub.update(
    revision=REV,
    predecessor={
        "revision": PREV,
        "publication_sha256": sha(V / f"jevbench-{PREV}-publication.json"),
    },
    review={"engine": "PENDING", "verdict": "PENDING", "receipt_sha256": None},
)
pub["files"] = {
    f: dict(
        path=f"data/raw/benchmarks/jevbench/v1.6/jevbench-{REV}-{f}.json",
        sha256=sha(V / f"jevbench-{REV}-{f}.json"),
    )
    for f in ["results", "categories", "proof", "history", "history-carry"]
}
put(V / f"jevbench-{REV}-publication.json", pub)
# Pin complete new rows/categories/proof by hash in validator; bind carried categories to predecessor.
put(J / "receipts/NEW-ROW-SPEC.json", {k: out[k] for k in newkeys})
put(
    J / "receipts/BUILD.json",
    {
        "variant": "single-row",
        "carried_rows_preserved_except_ranks": 75,
        "carried_scorer_point_estimates_reproduced": len(checks),
        "new_rows": {
            k: {f: out[k][f] for f in ["axes", "scores", "capability", "cost", "ranks"]}
            for k in newkeys
        },
        "files": pub["files"],
    },
)
print("built", REV, "roster", len(out), "ranked", res["n_ranked"])
print(
    json.dumps(
        {
            k: {f: out[k][f] for f in ["axes", "scores", "capability", "ranks"]}
            for k in newkeys
        },
        indent=1,
    )
)
