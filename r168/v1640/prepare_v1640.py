#!/usr/bin/env python3
"""Prepare the v1.6.40 batch: the 73 published v1.6.39 registry rows (carried by bytes) plus ONE hosted-API row (fastino-glide-api).
The new row is scored by a SECOND invocation of the unmodified frozen scorer on a derived release directory whose gold.jsonl lacks
exactly the 3 custody-excluded ids (lead ruling, run 168). No submission code runs. The sealed raw stays outside Git."""
import collections, hashlib, importlib.util, json, pathlib, os, re, subprocess, sys

sys.dont_write_bytecode = True
J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
B = J / "batch"
B.mkdir(exist_ok=True, mode=0o700)
(B / "runs").mkdir(exist_ok=True, mode=0o700)
os.environ["JEV_NOUL_METHOD"] = "O1S"
sys.path.insert(0, "/home/flori/jobs/jevbench-v16-run-20261001/harness")
import score_v16 as SC

SEAL = pathlib.Path("/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012")
load = lambda p: json.loads(pathlib.Path(p).read_text())
put = lambda p, v: pathlib.Path(p).write_text(json.dumps(v, indent=1, sort_keys=True, ensure_ascii=False) + "\n")
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
P = pathlib.Path("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
PS = sha(P)
assert PS == "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7"
spec = importlib.util.spec_from_file_location("pricing", P)
pr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pr)
cat = pr.catalog_rates()
proof = load(W / "data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.39-proof.json")
# Base registry = the v1.6.39 sealed registry (bound by the v1.6.39 proof).
S39 = SEAL / "frozen-release-v1.6.39"
assert sha(S39 / "REGISTRY-PUBLIC.json") == proof["registry_sha256"]
reg = load(S39 / "REGISTRY-PUBLIC.json")
assert len(reg) == 73
# Raw locations of the carried rows (hash-checked below); they are not re-scored in this build, only their registry is carried.
ROOT = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
CANDIDATES = lambda k: [
    B / "runs" / f"{k}.jsonl",
    ROOT / f"workers/r164-v1639-build/wt/r164/v1639/batch/runs/{k}.jsonl",
    ROOT / f"workers/r160-v1638-build2/wt/r160/v1638/batch/runs/{k}.jsonl",
    ROOT / f"r154/v1636/batch/runs/{k}.jsonl",
    SEAL / f"runs/api-full/{k}.jsonl",
    pathlib.Path("/home/flori/jobs/fastlane-iota-d831408e-20261021/run/out/raw.jsonl"),
    pathlib.Path("/home/flori/jobs/fastlane-holds-20261021/h2o31b-run/out/raw.jsonl"),
]
for k in reg:
    src = next((c.resolve() for c in CANDIDATES(k) if c.exists() and sha(c.resolve()) == proof["raw_sha256"][k]), None)
    assert src is not None, f"no hash-matching raw found for {k}"
    dst = B / "runs" / f"{k}.jsonl"
    if dst.is_symlink():
        dst.unlink()
    dst.symlink_to(src)
cb = S39 / "cost-basis.json"
assert sha(cb) == "2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d"
(B / "cost-basis-v1630.json").write_bytes(cb.read_bytes())
EX = set(load(cb)["exclude_opaque_ids"])
assert len(EX) == 15

# ---- derived gold (n = 1,497) for the hosted-GLiDE invocation -------------------------------------------------------------
REL = B / "rel1497"
subprocess.run([sys.executable, "-I", str(J / "make_gold_1497.py"), str(REL)], check=True, stdout=subprocess.DEVNULL)
DER = load(REL / "DERIVATION.json")
assert DER["frozen_gold_sha256"] == "fcb94f49d933e8df6acf26120c24264454095125f77735eb8eb7d2ad41b2f7a4"
assert DER["exclusion_file_sha256"] == "31b47af58dce134a70e5cbf60aad40db0000dd398f26649070fb7c9dfd1deeb3"
assert DER["derived_gold_sha256"] == "9f1f8200d0a1b4384f43ffc0a91f3f36e4790fc3dbcef7486bf233b0142baa47"
assert DER["labels_frozen_sha256"] == "be5a5209ad63c1f6a2ad39c4f71ea44d2dd4cc647489cc020e54a57ccfd9f99a" and DER["labels_derived_sha256"].startswith("aee4480b")
gold = SC.load_gold(REL / "frozen/gold.jsonl")
assert len(gold) == 1497 and not (set(DER["removed_opaque_ids"]) & set(gold))
assert EX <= set(gold)  # the 15 common-basis exclusions are all still in the 1,497

KEY = "fastino-glide-api"
RAW = SEAL / "runs/api-full/fastino-glide-api.jsonl"
RAW_SHA = "5b818aef392079ea9f55dcf7091edec2a1e0f50709ca12e3c50e1a3934102cec"
assert sha(RAW) == RAW_SHA
rr = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
# IDs compared only in memory; never emit sealed items or predictions.
assert len(rr) == len({x["task_id"] for x in rr}) == 1497
assert {r["task_id"] for r in rr} == set(gold), "raw rows must be exactly the derived gold ids"
assert not ({r["task_id"] for r in rr} & set(DER["removed_opaque_ids"]))
status = dict(collections.Counter(str(x["status_code"]) for x in rr))
assert status == {"200": 1480, "400": 15, "502": 2}, status
ok = [x for x in rr if x["ok"]]
assert len(ok) == 1480 and all(x["status_code"] == 200 and x["provider_model_id"] == "glide_v2" for x in ok)  # the served model, per response
assert all(x["provider_model_id"] == "fastino/GLiDE" for x in rr if not x["ok"])
tin = sum((x.get("usage") or {}).get("input_tokens", 0) or 0 for x in rr)
tout = sum((x.get("usage") or {}).get("output_tokens", 0) or 0 for x in rr)
assert (tin, tout) == (723504, 0)
failed = [x for x in rr if not x["ok"]]
assert all(x["cost_estimate"] == {"basis": "max_context_input_ceiling", "input_tokens": 65536, "output_tokens": 0} for x in failed) and len(failed) == 17
e400 = {x["task_id"] for x in failed if x["status_code"] == 400}
overlap_400_common_ex = len(e400 & EX)
lat = [x["latency_s"] for x in rr]
assert all(isinstance(v, (int, float)) and v >= 0 for v in lat)
over10 = sum(v > 10 for v in lat)
assert over10 == 2 and round(max(lat), 2) == 76.42
# the two answered rows over 10 s (21.15 s, 76.42 s) are status 200; the 502 rows were 7.73 s and 2.56 s
assert sorted(round(x["latency_s"], 2) for x in rr if x["latency_s"] > 10) == [21.15, 76.42]

# ---- price: operator tariff, I-1, through the frozen pricing module (aa2afcd5) -------------------------------------------------
assert KEY in pr.LAUNCH_LIST_PRICE_API
e = dict(
    author="Fastino",
    base_model=None,
    display="Fastino GLiDE (hosted API, 22 Oct 2026)",
    repo="https://fastino.ai",
    revision=None,
    api_subset="S",
    lane="api",
    endpoint_kind="api",
    ranked=True,
    support=dict(choice="native", noul="native", score="native"),
    licence="Proprietary hosted API (no weights release)",
    price_in_per_m=0.04,
    price_out_per_m=0.0,
    cost_kind="estimate",
    price_kind="estimate",
    code_revision="Vendor-hosted API (POST api.fastino.ai/v1/systemone, model fastino/GLiDE) through the unchanged TypeSafe adapter with one added request field, store:false; no vendor code ran locally.",
)
# Common cost basis exactly as the scorer applies it (15 longest items count for no row), on this row's 1,497 scored items.
SC.COST_BASIS = {"exclude": EX, "file_sha256": sha(cb), "rule": None, "reference": None, "n_excluded": 15}
systems, _ = SC.build_systems(gold, {KEY: dict(e, source="api")}, {KEY: rr})
sysm = systems[KEY]
usd_common = sysm.usd_per_1000
n_basis = sysm.meta["_cost_basis"]["n_items"]
usd_all = sysm.meta["_cost_basis"]["usd_per_1000_all_items"]
assert n_basis == 1482
CAP = 0.06459465517241379
ci = sum(int(((x.get("usage") or {}).get("input_tokens")) or (x.get("cost_estimate") or {}).get("input_tokens") or 0) for x in rr if x["task_id"] not in EX)
assert abs(usd_common - 1000 * ci * 0.04 / 1e6 / n_basis) < 1e-12
e["cost_basis"] = (
    "Operator's own published standard usage tariff: USD 0.04 per 1M INPUT tokens, output not billed (docs.fastino.ai/pricing, GLiDE row; page read 22 Oct 2026 20:34 UTC, saved copy sha256 22c0758f). "
    "Counted under interpretation I-1 (a manufacturer's standard, non-promotional list price counts from day 1) by the frozen pricing module pricing_v15 (sha256 "
    + PS
    + "), which carries one added launch-list-price key for this row and nothing else. "
    "Applied to this row's own provider-reported input tokens on the answered rows; the 17 requests that returned an error are priced at the API's 65,536-token prompt ceiling, the documented context estimate. "
    f"COMMON COST BASIS (v1.6.30): cost per 1,000 decisions is computed on the common items of this draw, leaving out the 15 very long items that count for no row; this row scored 1,497 items, so the basis here is {n_basis:,} items. "
    f"This row: USD {usd_common:.6f} per 1,000 decisions ({usd_common / CAP:.3f}x the official cost cap USD {CAP:.6f}), against USD {usd_all:.6f} over all 1,497 scored items. "
    "The older measurement of this vendor's GLiDE on 6 Oct 2026 (key fastino-glide) was priced at the then tariff of USD 0.15 per 1M input tokens and is unchanged."
)
e["disclosure"] = (
    "SCORED ON 1,497 OF THE DRAW'S 1,500 ITEMS: 3 items Fastino had already seen through its hosted GLiNER-2.5-Decide on 8 Oct were never sent (custody rule: an item a provider has seen is never scored for that provider). "
    "The row is scored with the unmodified frozen scorer on the draw's gold without those 3 items (a second invocation of the same scorer; the other rows of this board are scored on all 1,500 items). "
    "PROVIDER-HOSTED: Fastino's API serves the model as `glide_v2` (every answered response reported it); the weights and serving were not inspected, and this is not the open-weights GLiDE 1.2 release, which is a separate pending measurement. "
    "RETENTION: Fastino's default is to retain API inputs; store:false on every request; the vendor's not-stored response header was enforced on every answered request by the run harness (error responses carry no such header by the vendor's documentation). "
    "NOT ANSWERED, counted wrong: 15 items exceed the API's 65,536-token prompt limit (HTTP 400 'prompt exceeds the maximum context length'), counted wrong; and 2 gateway errors (HTTP 502) from Fastino's API, not retried (one pass), counted wrong. "
    "PRICE CHANGED SINCE THE FIRST MEASUREMENT: on 6 Oct 2026 this vendor's GLiDE was listed at USD 0.15 per 1M input tokens with a 40,000-token prompt limit and scored on 600 items (key fastino-glide, Capability 77.0, outside the cost cap); today's tariff is USD 0.04 per 1M input tokens with a 65,536-token limit, and this row is a new measurement on the full draw. The older row stays as history. "
    "Latency was measured from Sandy (Germany) with no API adjustment, while the evaluation host was busy with other work; 2 answered decisions took more than 10 seconds (21.15 s and 76.42 s); v1.6 applies no 10-second rule. "
    "Native probabilities on all three question types, no generated tokens; the customer-side statements about the model are the vendor's and are not independently verified. "
    "SEALED ITEMS SENT TO THE VENDOR: the API sees the 1,197 sealed items it was sent; acceptable because every sealed item of this draw was already retired from scoring."
)
e["endpoint_condition"] = (
    "Vendor-hosted api.fastino.ai /v1/systemone API, model `fastino/GLiDE` (responses report glide_v2), evaluator key, every request with store:false; latency measured from Sandy (Germany) on every item without API adjustment. "
    "Full S+P draw of v1.6-regular-20261012 minus the 3 custody-excluded items (1,497 requests, one pass, no retries) through the unchanged run_api_full_v161.py; the full-set exposure gate logged the 1,197 sealed items to the provider before the first request. "
    "Measured 22 Oct 2026 by the evaluator; the vendor did not take part in the run."
)
for _f, _v in e.items():
    assert not isinstance(_v, str) or not re.search(r"#\d{4,5}|deputy|CoS\b|review sha|/home/|worker|PREREG|LeChonk|r168", _v), (_f, _v[:80])
reg[KEY] = e
dst = B / "runs" / f"{KEY}.jsonl"
if dst.is_symlink():
    dst.unlink()
dst.symlink_to(RAW)
entries = {KEY: dict(raw_sha256=RAW_SHA, custody="admitted by the evaluator exposure gate (single-use admission consumed)", handoff="run receipt on file", pre_score_review=None)}
rows = {KEY: dict(
    raw_sha256=RAW_SHA, rows=1497, status_counts=status, ok=len(ok), input_tokens=tin, output_tokens=tout,
    common_input_tokens=ci, common_output_tokens=0, over_10s=over10, max_latency_s=round(max(lat), 2), usd_common=usd_common,
    usd_all_items=usd_all, common_basis_items=n_basis, failed_estimated_rows=len(failed),
    http400_in_common_exclusion=overlap_400_common_ex,
    derived_gold_sha256=DER["derived_gold_sha256"], frozen_gold_sha256=DER["frozen_gold_sha256"],
    exclusion_file_sha256=DER["exclusion_file_sha256"],
    labels_frozen_sha256=DER["labels_frozen_sha256"], labels_derived_sha256=DER["labels_derived_sha256"])}
put(B / "REGISTRY-PUBLIC.json", {k: v for k, v in reg.items()})
put(B / "REGISTRY-GLIDE.json", {KEY: e})
put(B / "ENTRIES.json", entries)
put(B / "ROWS.json", rows)
put(J / "receipts/PRICING-DECISIONS.json", dict(
    module_sha256=PS, predecessor_module_sha256="a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7",
    calls={KEY: {"key_in_LAUNCH_LIST_PRICE_API": True, "effective_price": [0.04, 0.0], "usd_per_1000_common_basis": usd_common,
                 "usd_per_1000_all_items": usd_all, "cost_cap_ratio": usd_common / CAP, "common_basis_items": n_basis}},
    ten_second_rule_applied=False))
put(J / "receipts/DERIVED-GOLD.json", DER)
print(json.dumps(rows, indent=1))
print(f"PASS: 73 carried registry entries/raw hashes unchanged, {len(rows)} new raw verified; 15 HTTP-400 rows inside the 15 common-basis exclusions: {overlap_400_common_ex}")
