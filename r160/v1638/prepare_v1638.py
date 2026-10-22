#!/usr/bin/env python3
"""Prepare three paid rows; no submission code runs. Sealed raws remain outside Git."""
import collections, hashlib, importlib.util, json, pathlib, os, sys

sys.dont_write_bytecode = True
J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
ROOT = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
B = J / "batch"
B.mkdir(exist_ok=True, mode=0o700)
(B / "runs").mkdir(exist_ok=True, mode=0o700)
os.environ["JEV_NOUL_METHOD"] = "O1S"
sys.path.insert(0, "/home/flori/jobs/jevbench-v16-run-20261001/harness")
import score_v16 as SC

gold = SC.load_gold(
    pathlib.Path(
        "/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen/gold.jsonl"
    )
)
load = lambda p: json.loads(pathlib.Path(p).read_text())
put = lambda p, v: pathlib.Path(p).write_text(
    json.dumps(v, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
)
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
P = pathlib.Path(
    "/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py"
)
PS = sha(P)
assert PS == "a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7"
spec = importlib.util.spec_from_file_location("pricing", P)
pr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pr)
cat = pr.catalog_rates()
O = ROOT / "r154/v1636/batch"
reg = load(O / "REGISTRY-PUBLIC.json")
assert len(reg) == 69
proof = load(W / "data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.37-proof.json")
for k in reg:
    p = O / "runs" / f"{k}.jsonl"
    assert sha(p) == proof["raw_sha256"][k], k
    dst = B / "runs" / p.name
    if dst.is_symlink():
        dst.unlink()
    dst.symlink_to(p)
cb = O / "cost-basis-v1630.json"
assert sha(cb) == "2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d"
(B / cb.name).write_bytes(cb.read_bytes())
EX = set(load(cb)["exclude_opaque_ids"])
assert len(EX) == 15
entries = {}
rows = {}
calls = {}
sup = dict(choice="native", noul="native", score="native")


def api(key, base, display, repo):
    e = dict(
        author="Nace AI" if key == "drex-max" else "Launchables",
        base_model=base,
        display=display,
        repo=repo,
        revision=None,
        api_subset="S",
        lane="api",
        endpoint_kind="api",
        ranked=True,
        support=sup,
        licence="Proprietary vendor-hosted API; weights and serving code not independently inspected",
        code_revision="Vendor-hosted API through the unchanged TypeSafe adapter; no vendor code ran locally.",
        endpoint_condition="Paid public fast-lane; full S1200+P300 draw v1.6-regular-20261012, unchanged evaluator API runner from Sandy, customer API key; full-set exposure gate logged all sealed items before the first scored request. Native probabilities; latency has no API adjustment.",
    )
    return e


drex = api("drex-max", None, "Drex Max (Nace AI)", "https://drex.nace.ai")
drex.update(
    price_in_per_m=0.06,
    price_out_per_m=0.0,
    cost_kind="listed",
    price_kind="listed",
    disclosure="2 HTTP 529 provider-overloaded failures retained and scored as failures. Public JevBench items were used to pick the checkpoint; the public set is treated as seen during selection. Customer statements about serving and training are unverified.",
    cost_basis="Launch list price: Drex Max public launch list tariff USD 0.06 per million input tokens, output not billed, https://drex.nace.ai/docs/drex/reference/pricing (saved copy sha256 95d1c429, fetched 21 Oct 2026 20:18 UTC; fetched again 22 Oct 2026 01:12 UTC with identical bytes). Counted as an operator standard launch list price by the frozen pricing module pricing_v15 (sha256 "
    + PS
    + "), which now carries a launch-list-price line for this product. Applied to provider-reported usage; not a base-model estimate.",
)
myles = api(
    "launchables-myles-g-12b",
    "google/gemma-4-12B-it",
    "Myles-G 12B (Launchables)",
    "https://www.launchables.ai/licensing",
)
precedent = reg["arcbright-elf-1-12b"]["cost_basis"]
myles.update(
    price_in_per_m=0.05,
    price_out_per_m=0.15,
    cost_kind="estimate",
    price_kind="estimate",
    disclosure="TRUNCATION ON THE 15 LONGEST ITEMS (scored as answered): the provider silently truncated their input and reported 12,511 to 15,221 tokens; it returned answers, not refusals, under its 16,384-token context. The scored-wrong rule applies only to refusals, so these items are scored as answered, as for earlier provider-truncated rows. SAME-AUTHOR SECOND use after Myles-G 31B full-set exposure; the public set is treated as seen. Customer states merged LoRA on google/gemma-4-12B-it; deployed weights, serving and training claims are unverified.",
    cost_basis="ESTIMATE, nearest-listed-sibling reference: declared base google/gemma-4-12B-it is UNLISTED in frozen pricing_v15 (sha256 "
    + PS
    + "); no exact base reference exists. Same-base published precedents arcbright-elf-1-12b, chon-1.0-12b and metask_jev_rain_12b_trained use google/gemma-3-12b-it, USD 0.05/M input and 0.15/M output. This row uses that same sibling ESTIMATE, not a vendor bill or quote. Launchables list price GBP 0.0015 per million input tokens, output free, is shown for information and is not used for the Cost axis. Applied to provider-reported usage.",
)
iota_s = load(
    "/home/flori/jobs/fastlane-iota-d831408e-20261021/score/ENTRIES-IOTA.json"
)["iota-decide-4b"]
iota = iota_s["entry"]
_SCRUB = [
    (" (review sha 57cfc08b, CoS #23053) and independent bridge review PASS", " and independent bridge review PASS"),
    ("fast-lane source review PASS", "pre-measurement source review PASS"),
    (", deputy ruling #22794)", ", as for earlier provider-truncated rows)"),
    (", #23087)", ")"),
    ("1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1", PS),
]
for _f, _v in list(iota.items()):
    if isinstance(_v, str):
        for _a, _b in _SCRUB:
            _v = _v.replace(_a, _b)
        iota[_f] = _v
rf = pr.reference("iota-decide-4b", {"base_model": "Qwen/Qwen3.5-4B"}, cat)
assert rf[0] == "deepinfra:Qwen/Qwen3.5-4B"
assert round(rf[1][0], 8) == 0.03 and rf[1][1] == 0.15
# Keep the scorer's exact binary rate, as in all published Qwen 4B precedents.
iota.update(
    price_in_per_m=rf[1][0],
    price_out_per_m=rf[1][1],
    cost_kind="estimate",
    price_kind="estimate",
    pricing_base="Qwen/Qwen3.5-4B",
)
iota["cost_basis"] = iota["cost_basis"].replace(
    "{REF}", f"{rf[0]} USD {rf[1][0]}/M input, USD {rf[1][1]}/M output"
)
iota["endpoint_condition"] = __import__("re").sub(
    r", instance id [a-f0-9-]+", "", iota["endpoint_condition"]
)
NO_DREX = "--without-drex" in sys.argv
import re as _re
for _e in (drex, myles, iota):
    for _f, _v in _e.items():
        assert not isinstance(_v, str) or not _re.search(r"#\d{4,5}|deputy|CoS\b|review sha", _v), (_f, _v[:80])
for k, e in [
    ("drex-max", drex),
    ("launchables-myles-g-12b", myles),
    ("iota-decide-4b", iota),
]:
    if NO_DREX and k == "drex-max":
        continue
    if k == "iota-decide-4b":
        raw = pathlib.Path(iota_s["raw"])
        expected = iota_s["raw_sha256"]
        custody = "single-use admission consumed"
        handoff = "run receipt on file"
    else:
        receipt = load(
            "/home/flori/jobs/fastlane-holds-20261021/receipts/RUN-RECEIPT-"
            + k
            + ".json"
        )
        raw = pathlib.Path(receipt["raw"])
        expected = receipt["raw_sha256"]
        custody = "admitted by the evaluator exposure gate"
        handoff = "run receipt on file"
    assert (
        expected
        == {
            "drex-max": "c0de81123e846e3a583aef52534e15f6ca9ba1b9c515209dbed002d8e7277fe1",
            "launchables-myles-g-12b": "3f0929728f39bd41cfff6c404d6ed8793e8202f393b68264d3b1fc449d6a54ab",
            "iota-decide-4b": "2850e17ddcc3c2ef3a44592b6b377581562ad453ae1561e9d641184ff7ffd1c0",
        }[k]
    )
    assert sha(raw) == expected
    rr = [json.loads(l) for l in raw.read_text().splitlines() if l.strip()]
    assert len(rr) == len({x["task_id"] for x in rr}) == 1500
    # IDs compared only in memory; never emit sealed items or predictions.
    assert {r["task_id"] for r in rr} == {
        json.loads(l)["task_id"]
        for l in (B / "runs/kettei-fat.jsonl").read_text().splitlines()
        if l.strip()
    }
    tin = sum((x.get("usage") or {}).get("input_tokens", 0) or 0 for x in rr)
    tout = sum((x.get("usage") or {}).get("output_tokens", 0) or 0 for x in rr)
    assert (tin, tout) == {
        "drex-max": (1942633, 264615),
        "launchables-myles-g-12b": (989607, 1500),
        "iota-decide-4b": (1094798, 0),
    }[k]
    status = dict(collections.Counter(str(x["status_code"]) for x in rr))
    assert status == ({"200": 1498, "529": 2} if k == "drex-max" else {"200": 1500})
    eligible = [r for r in rr if r["task_id"] not in EX]
    assert len(eligible) == 1485
    ci = sum((x.get("usage") or {}).get("input_tokens", 0) or 0 for x in eligible)
    co = sum((x.get("usage") or {}).get("output_tokens", 0) or 0 for x in eligible)
    e[
        "cost_basis"
    ] += f" COMMON COST BASIS (v1.6.30): common 1,485 items, excluding the 15 longest for every row; {ci:,} input / {co:,} output tokens. All-item usage {tin:,} input / {tout:,} output over 1,500 items."
    calls[k] = {
        "reference_call": f"reference({k!r}, "
        + repr({"base_model": e["base_model"]})
        + ", catalog_rates())",
        "reference_result": pr.reference(k, {"base_model": e["base_model"]}, cat),
        "effective_price": [e["price_in_per_m"], e["price_out_per_m"]],
    }
    if k == "launchables-myles-g-12b":
        calls[k]["precedent_cost_basis"] = precedent
    if k == "iota-decide-4b":
        calls[k][
            "canonical_reference_call"
        ] = "reference('iota-decide-4b', {'base_model':'Qwen/Qwen3.5-4B'}, catalog_rates())"
        calls[k]["canonical_reference_result"] = rf
    if k != "drex-max":
        systems, _ = SC.build_systems(gold, {k: e}, {k: rr})
        items = systems[k].scored

        def score_group(group):
            values = [(g, z) for g, z in items if (g.oid in EX) == group]
            return [sum(SC._correct(g, z) for g, z in values), len(values)]

        a, b = score_group(True), score_group(False)
        e[
            "disclosure"
        ] += f" Measured accuracy on the 15 shortened states: {a[0]} of {a[1]} correct ({100*a[0]/a[1]:.1f} %), versus {b[0]} of {b[1]} ({100*b[0]/b[1]:.1f} %) on the remaining items; a Score item is correct within half a label step."
        if k == "launchables-myles-g-12b":
            longest = sorted(
                x["usage"]["input_tokens"] for x in rr if x["task_id"] in EX
            )
            assert (min(longest), max(longest)) == (12511, 15221)
    if "--drex-unpriced" in sys.argv and k == "drex-max":
        e.update(
            ranked=False,
            cost_kind="unpriced",
            price_kind="unpriced",
            price_in_per_m=None,
            price_out_per_m=None,
            cost_basis="UNPRICED: no eligible 30-day list price or base-model estimate; no cost axis, composite or rank. Listed as measured, like nagi-huge, pending pricing admission.",
        )
    calls[k]["effective_price"] = [e["price_in_per_m"], e["price_out_per_m"]]
    dst = B / "runs" / f"{k}.jsonl"
    if dst.is_symlink():
        dst.unlink()
    dst.symlink_to(raw)
    reg[k] = e
    entries[k] = dict(
        raw_sha256=expected,
        custody=custody,
        handoff=handoff,
        pre_score_review=(
            "/home/flori/jobs/fastlane-iota-d831408e-20261021/score/CRITIC.md"
            if k == "iota-decide-4b"
            else None
        ),
    )
    # latency_s is the frozen runner field; retain aggregate over-10s only.
    assert all(
        isinstance(x.get("latency_s"), (int, float)) and x["latency_s"] >= 0 for x in rr
    )
    lat = [x["latency_s"] for x in rr]
    rows[k] = dict(
        raw_sha256=expected,
        rows=1500,
        status_counts=status,
        ok=sum(bool(x["ok"]) for x in rr),
        input_tokens=tin,
        output_tokens=tout,
        common_input_tokens=ci,
        common_output_tokens=co,
        over_10s=sum(x > 10 for x in lat),
        usd_common=(
            1000 * (ci * e["price_in_per_m"] + co * e["price_out_per_m"]) / 1e6 / 1485
            if e["ranked"]
            else None
        ),
    )
put(B / "REGISTRY-PUBLIC.json", reg)
put(B / "ENTRIES.json", entries)
put(B / "ROWS.json", rows)
put(
    J / "receipts/PRICING-DECISIONS.json",
    dict(
        module_sha256=PS,
        calls=calls,
        drex_variant="C" if NO_DREX else ("B" if "--drex-unpriced" in sys.argv else "A"),
        drex_I1_refreeze_pending=False,
        ten_second_rule_applied=False,
    ),
)
print(json.dumps(rows, indent=1))
print(f"PASS: 69 carried registry entries/raw hashes unchanged, {len(rows)} new raws verified")
