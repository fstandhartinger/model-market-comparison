#!/usr/bin/env python3
"""Build local PENDING v1.6.40; preserve predecessor rows byte-for-byte except placement.
The field scoring (73 registry rows, real 1,500-item gold) verifies the carried same-draw point estimates; published bootstrap intervals are
retained. The ONE new row (fastino-glide-api) comes from a second invocation of the unmodified frozen scorer on the derived 1,497-item gold.
"""
import hashlib, json, os, pathlib, copy, shutil

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
B = J / "batch"
V = W / "data/raw/benchmarks/jevbench/v1.6"
REV = "v1.6.40"
PREV = "v1.6.39"
CAP = 0.06459465517241379
load = lambda p: json.loads(pathlib.Path(p).read_text())
put = lambda p, v: pathlib.Path(p).write_text(
    json.dumps(v, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
)
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
PRICING_SHA = sha("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
assert PRICING_SHA == "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7"
cp = copy.deepcopy
old = {
    n: load(V / f"jevbench-{PREV}-{n}.json")
    for n in ["results", "categories", "proof", "publication"]
}
reg = load(B / "REGISTRY-PUBLIC.json")
info = load(B / "ROWS.json")
ent = load(B / "ENTRIES.json")
sc = load(B / "out-v1640/jevbench-v1.6.0-results.json")  # the one-row invocation on the derived gold
fsc = load(B / "out-field-v1640/jevbench-v1.6.0-results.json")  # the 73-row field invocation on the real gold
newkeys = sorted(info)
assert newkeys == ["fastino-glide-api"]
NAME = "Fastino GLiDE (hosted API)"
LABEL = NAME
dec = load(B / "out-v1640/noul-decisive.json")
fdec = load(B / "out-field-v1640/noul-decisive.json")
newsc = {s["key"]: s for s in sc["systems"]}
fieldsc = {s["key"]: s for s in fsc["systems"]}
prev = {s["key"]: s for s in old["results"]["systems"]}
out = cp(prev)
assert old["publication"]["review"]["verdict"] == "PASS" and len(prev) == 76
assert sc["G_med"] == fsc["G_med"] == old["results"]["G_med"] == 9.839526770355711
assert sc["v16"]["scorer_sources_sha256"] == fsc["v16"]["scorer_sources_sha256"] == old["proof"]["scorer_sources_sha256"], "frozen scorer dependencies moved"
checks = {}
for k in sorted(set(reg) - set(newkeys)):
    a, b = prev[k], fieldsc[k]
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
    assert a["noul_decisive"] == fdec[k], k
    checks[k] = True
assert len(checks) == 73
alone = {s["key"]: s for s in load(B / "out-api-alone-v1640/jevbench-v1.6.0-results.json")["systems"]}
assert len(alone) == 17
for k, a in alone.items():
    for f in ["scores", "axes", "capability", "cost", "speed", "intelligence", "calibration"]:
        assert prev[k][f] == a[f], ("one-row invocation differs from published", k, f)
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
        noul_decisive=dec[k],
        custody_exclusion={
            "items": 3,
            "scored_items": 1497,
            "rule": "an item a provider has already seen is never scored for that provider; the 3 items were never sent and are not in this row's gold",
            "derived_gold_sha256": info[k]["derived_gold_sha256"],
            "exclusion_list_sha256": info[k]["exclusion_file_sha256"],
        },
    )
    for f in ["author", "endpoint_condition", "licence"]:
        s[f] = e[f]
    assert s["status"] == {"answered_ok": info[k]["ok"], "missing": 0, "rows": 1497, "status": "complete"}
    assert s["cost"]["usd_per_1000"] == info[k]["usd_common"]
    assert s["speed"]["adjustment"] == "none (API)"
    assert s["cost"]["common_basis"]["n_items"] == info[k]["common_basis_items"] == 1482
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
    label="JevBench v1.6.40: " + LABEL + " added",
    systems=sorted(out.values(), key=lambda s: s["key"]),
    n_ranked=sum(s["ranked"] for s in out.values()),
    roster_count=len(out),
    source_sha256=sha(B / "out-v1640/jevbench-v1.6.0-results.json"),
    source_note="One hosted-API addition on v1.6-regular-20261012, scored on 1,497 of the draw's 1,500 items. Unmodified frozen score_v16.py (02132271), O1S, B=1000, seed 16, fixed G_med 9.839526770355711, unchanged v1.6.30 common cost basis (15 longest items excluded). The new row comes from a second invocation of the same scorer on the draw's gold without the 3 items the vendor had already seen (derived gold sha256 "+info["fastino-glide-api"]["derived_gold_sha256"]+"; frozen gold sha256 "+info["fastino-glide-api"]["frozen_gold_sha256"]+"); a separate field invocation on the real 1,500-item gold reproduces all 73 carried same-draw point estimates; all 76 carried published rows are byte-identical except rank/ranks, including published intervals and diagnostics. The new row's intervals use its own one-row invocation seeds. This is v1.6 method; no 10-second rule.",
)
for m in orders:
    res["board"][m]["order"] = orders[m]
tf = (
    load(J / "receipts/topfive-diff.json")
    if (J / "receipts/topfive-diff.json").exists()
    else None
)
GO = {
    "decision": "glide-api-release-go",
    "date": "2026-10-22",
    "quote": "also release it on JevBench right away",
    "scope": "this hosted GLiDE row, including any top-five move",
    "recorded_at": "2026-10-22 ~20:4xZ",
    "recorded_in": "DECISIONS.md 2026-10-22 ~20:4xZ (Florian)",
    "where": "laptop chat",
}
approval = {
    "go": old["proof"]["publication_approval"]["go"],
    "release_go": GO,
    "asks": {
        k: dict(
            key=k,
            relay="Florian's release instruction for the hosted GLiDE row (glide-api-release-go)",
            handoff=ent[k]["handoff"],
            admission=ent[k]["custody"],
        )
        for k in newkeys
    },
    "top_five_effect": "changes" if tf and tf["any_top5_change"] else "none",
    "top_five_preview": None,
    "button_tap": False,
}
if tf and tf["any_top5_change"]:
    assert set(tf["entrants_all"]) <= set(newkeys)
    approval["top_five_changed_by"] = sorted(tf["entrants_all"])
    approval["top_five_authority"] = "Florian's release GO glide-api-release-go (22 Oct 2026) covers any top-five move; no top-five preview card sent, none claimed"
approval_marker = "Publication authority: Florian's release GO for the hosted GLiDE row (glide-api-release-go, 22 Oct 2026) covers any top-five move; no Telegram preview card was sent and no button was pressed."
notes = [
    "v1.6.40 adds one hosted-API row: Fastino's GLiDE, measured on 22 Oct 2026 (key fastino-glide-api). It is scored on 1,497 of the draw's 1,500 items: 3 items Fastino had already seen through its hosted GLiNER-2.5-Decide on 8 Oct were never sent (custody rule), and the row is scored on the draw's gold without them. All carried rows retain every field except rank/ranks, including published confidence intervals. This release uses the v1.6 method; the 10-second rule does not apply. "
    + "Fastino GLiDE is priced from the operator's published standard tariff, USD 0.04/M input tokens and no output charge (interpretation I-1). It is a new measurement, not a replacement: the 6 Oct 2026 measurement of this vendor's GLiDE (key fastino-glide, tariff then USD 0.15/M input, 40,000-token prompt limit, 600 items) stays on the board as history.",
    tf["note"] if tf else "Board effect provisional: 40-list comparison pending.",
    (
        "Publication of v1.6.40: hosted-API row. Fastino GLiDE changes public top-five lists; Florian's release instruction for this row (22 Oct 2026) covers any top-five move, so no separate top-five preview approval was sought and none is claimed; no Telegram button was pressed."
        if tf and tf["any_top5_change"]
        else "Publication of v1.6.40: hosted-API row; no top-five list changes, so no top-five preview card was sent and none is claimed; no Telegram button was pressed."
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
        + f'. Scored with the unmodified frozen scorer on the draw\'s gold without the 3 excluded items (derived gold sha256 {info[k]["derived_gold_sha256"]}; frozen gold sha256 {info[k]["frozen_gold_sha256"]}; exclusion list sha256 {info[k]["exclusion_file_sha256"]}).'

    )
res["measurement_notes"] = old["results"]["measurement_notes"] + notes
put(V / f"jevbench-{REV}-results.json", res)
rp = V / f"jevbench-{REV}-results.json"
cats = cp(old["categories"])
scat = load(B / "out-v1640/categories.json")
fcat = load(B / "out-field-v1640/categories.json")
for k in old["categories"]["systems"]:
    assert cats["systems"][k] == fcat["systems"][k], ("category", k)
for k in newkeys:
    cats["systems"][k] = scat["systems"][k]
    cats["lanes"][k] = reg[k]["lane"]
cats.update(
    revision=REV, results_sha256=sha(rp), source_results_sha256=res["source_sha256"]
)
cats[
    "lane_note"
] += " One hosted-API row added in v1.6.40 (scored on 1,497 items, without the 3 custody-excluded items); stored per-item cells. H2O and Kahn1 retain their original draw cells."
put(V / f"jevbench-{REV}-categories.json", cats)
for f in ["history", "history-carry"]:
    shutil.copyfile(V / f"jevbench-{PREV}-{f}.json", V / f"jevbench-{REV}-{f}.json")
sup_path = V / "jevbench-v1.6-cohort-topic-cells.json"
sup = load(sup_path)
d = sup["draws"]["v1.6-regular-20261012"]
tc = load(B / "topics-v1640/categories-with-topics.json")
cell = lambda x: {
    k: {"n": v["n"], "competence": v["competence"]} for k, v in sorted(x.items())
}
# The new row's cells come from the unchanged topic builder run with the ruled labels minus the same 3 ids (derived labels sha256 recorded); carried rows keep their cells byte-identical.
assert tc["labels_sha256"] == info["fastino-glide-api"]["labels_derived_sha256"]
assert d["labels_sha256"] == info["fastino-glide-api"]["labels_frozen_sha256"]
for k in newkeys:
    d["systems"][k] = {f: cell(tc["systems"][k][f]) for f in ["topics", "usecases"]}
d.update(release=REV, results_sha256=sha(rp))
d["derived_label_rows"] = {k: {"labels_sha256": info[k]["labels_derived_sha256"], "items": 1497, "note": "ruled labels without the 3 custody-excluded items"} for k in newkeys}
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
        "hosted_api": True,
        "scored_items": 1497,
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
        "refused_over_context_limit": 15,
        "gateway_errors_502": 2,
    }
    # Store only hash of local critic; never private filesystem paths in public evidence.
    proof["new_rows"][k].pop("pre_score_review", None)
    p = ent[k]["pre_score_review"]
    proof["new_rows"][k]["pre_score_review_sha256"] = sha(p) if p else None
# The two scorer invocations behind this release, by hash (aggregates only; no item ids).
GL = info["fastino-glide-api"]
proof["extra_invocations"] = {
    "fastino-glide-api": {
        "scorer_sha256": "02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9",
        "scorer_modified": False,
        "scorer_sources_sha256": sc["v16"]["scorer_sources_sha256"],
        "kind": "second invocation on a derived gold (n = 1,497)",
        "reason": "custody rule: 3 items Fastino had already seen through its hosted GLiNER-2.5-Decide on 8 Oct were never sent and are never scored for this provider",
        "scored_items": 1497,
        "frozen_gold_sha256": GL["frozen_gold_sha256"],
        "derived_gold_sha256": GL["derived_gold_sha256"],
        "derivation": "only frozen/gold.jsonl differs: exactly the 3 ids of the exclusion list removed, all other lines byte-identical and in original order; every other release input identical",
        "exclusion_list_sha256": GL["exclusion_file_sha256"],
        "excluded_items": 3,
        "registry_sha256": sha(B / "REGISTRY-GLIDE.json"),
        "parameters": sc["v16"]["scoring_parameters"] if "scoring_parameters" in sc["v16"] else None,
        "results_sha256": sha(B / "out-v1640/jevbench-v1.6.0-results.json"),
        "invocation": "score_v16.py --release-dir <derived dir> --registry REGISTRY-GLIDE.json --runs <glide run> --B 1000 --seed 16 --g-med-fixed 9.839526770355711 --cost-basis cost-basis.json (JEV_NOUL_METHOD=O1S)",
        "field_check_results_sha256": sha(B / "out-field-v1640/jevbench-v1.6.0-results.json"),
        "field_check": "the 73 carried registry rows scored on the real 1,500-item gold reproduce every published point estimate; the 17 carried API rows scored alone equal their published rows",
    }
}
for s in proof["systems"]:
    s["rank"] = out[s["key"]]["rank"]
for k in newkeys:
    s = out[k]
    proof["systems"].append(
        dict(
            key=k,
            display=s["display"],
            rows=1497,
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
    "/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.6.39/addendum.json"
)
proof[
    "authority"
] += (
    " NEW in v1.6.40: one hosted-API addition (Fastino GLiDE, scored on 1,497 of 1,500 items); Florian's release GO glide-api-release-go"
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
        "carried_rows_preserved_except_ranks": 76,
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
