#!/usr/bin/env python3
"""Prepare the v1.6.39 batch: the 72 published v1.6.38 registry rows plus ONE paid self-hosted row (h2o-lightning-31b).
No submission code runs. The sealed raw stays outside Git."""
import collections, hashlib, importlib.util, json, pathlib, os, sys

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
gold = SC.load_gold(SEAL / "frozen/gold.jsonl")
load = lambda p: json.loads(pathlib.Path(p).read_text())
put = lambda p, v: pathlib.Path(p).write_text(
    json.dumps(v, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
)
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
P = pathlib.Path("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
PS = sha(P)
assert PS == "a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7"
spec = importlib.util.spec_from_file_location("pricing", P)
pr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pr)
cat = pr.catalog_rates()
proof = load(W / "data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.38-proof.json")
# Base registry = the v1.6.38 sealed registry (bound by the v1.6.38 proof).
S38 = SEAL / "frozen-release-v1.6.38"
assert sha(S38 / "REGISTRY-PUBLIC.json") == proof["registry_sha256"]
reg = load(S38 / "REGISTRY-PUBLIC.json")
assert len(reg) == 72
# Raw locations of the carried rows: the symlink farm of the v1.6.38 build (hash-checked below).
FARM = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919/workers/r160-v1638-build2/wt/r160/v1638/batch/runs")
ROOT = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
CANDIDATES = lambda k: [
    B / "runs" / f"{k}.jsonl",  # symlink farm of this build (kept across reruns)
    FARM / f"{k}.jsonl",  # the v1.6.38 build's farm (its worktree may have been cleaned up)
    ROOT / f"r154/v1636/batch/runs/{k}.jsonl",
    SEAL / f"runs/api-full/{k}.jsonl",
    pathlib.Path("/home/flori/jobs/fastlane-iota-d831408e-20261021/run/out/raw.jsonl"),
]
for k in reg:
    src = next((c.resolve() for c in CANDIDATES(k) if c.exists() and sha(c.resolve()) == proof["raw_sha256"][k]), None)
    assert src is not None, f"no hash-matching raw found for {k}"
    dst = B / "runs" / f"{k}.jsonl"
    if dst.is_symlink():
        dst.unlink()
    dst.symlink_to(src)
cb = S38 / "cost-basis.json"
assert sha(cb) == "2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d"
(B / "cost-basis-v1630.json").write_bytes(cb.read_bytes())
EX = set(load(cb)["exclude_opaque_ids"])
assert len(EX) == 15

KEY = "h2o-lightning-31b"
RAW = pathlib.Path("/home/flori/jobs/fastlane-holds-20261021/h2o31b-run/out/raw.jsonl")
RAW_SHA = "93f00824bdadcbab56d4eb03c6f03df3dd97e749a80f375135e737b0eaf7b24a"
assert sha(RAW) == RAW_SHA
rr = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
assert len(rr) == len({x["task_id"] for x in rr}) == 1500
# IDs compared only in memory; never emit sealed items or predictions.
assert {r["task_id"] for r in rr} == {
    json.loads(l)["task_id"] for l in (B / "runs/kettei-fat.jsonl").read_text().splitlines() if l.strip()
}
tin = sum((x.get("usage") or {}).get("input_tokens", 0) or 0 for x in rr)
tout = sum((x.get("usage") or {}).get("output_tokens", 0) or 0 for x in rr)
assert (tin, tout) == (1917924, 1500)
status = dict(collections.Counter(str(x["status_code"]) for x in rr))
assert status == {"200": 1500} and all(x["ok"] for x in rr)
eligible = [r for r in rr if r["task_id"] not in EX]
assert len(eligible) == 1485
ci = sum((x.get("usage") or {}).get("input_tokens", 0) or 0 for x in eligible)
co = sum((x.get("usage") or {}).get("output_tokens", 0) or 0 for x in eligible)
longest = sorted(x["usage"]["input_tokens"] for x in rr if x["task_id"] in EX)
assert (min(longest), max(longest)) == (76497, 81692), (min(longest), max(longest))
lat = [x["latency_s"] for x in rr]
assert all(isinstance(v, (int, float)) and v >= 0 for v in lat)
over10 = sum(v > 10 for v in lat)
assert over10 == 15 and round(max(lat), 2) == 39.08

# Price: the customer asks for the base-model cost; base spelling exactly as the live 31B rows use it.
BASE = "google/gemma-4-31B-it"
ref = pr.reference(KEY, {"base_model": BASE}, cat)
assert ref[0] == "google/gemma-4-31b-it" and round(ref[1][0], 8) == 0.09 and round(ref[1][1], 8) == 0.34
assert reg["basal-omni-1.0-ultra"]["base_model"] == BASE and reg["metask_jev_rain_31b_trained"]["base_model"] == BASE

e = dict(
    author="H2O.ai (paid fast-lane order 5fa1a5f0, PUBLIC visibility)",
    base_model=BASE,
    display="H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted)",
    repo="https://huggingface.co/h2oai/h2o-lightning-31b",
    revision="ca6e6f6e8e08e2d21c8c9f45261e05444626647a",
    lane="selfhosted",
    endpoint_kind="gpu",
    ranked=True,
    support=dict(choice="native", noul="native", score="native"),
    licence="H2O Model Non-Commercial Licence v1.1 (weights; gated on Hugging Face; benchmarking and publishing results are allowed by the licence). Base Gemma 4 under its own licence.",
    code_revision="The author's documented JevBench configuration, unmodified: run_default.sh, the one-engine profile (author's README, 'how to run for JevBench'), on vLLM 0.30.0 (official vllm/vllm-openai:v0.30.0 image, digest-pinned) with the author's h2oai/vllm overlay at commit 6bc6d5a8 (18 patched files, sha256-checked against the pin) and the author's shim lightning_31b_shim.py; torch 2.13.0, transformers 5.20.0, torchcodec 0.17.0 hash-locked. Engine: one vLLM engine, FP8 weights (vLLM online FP8 of the bf16 checkpoint, --quantization fp8), two-way reading by default (one-way, read whole, for a record over the 8,192-token two-way window or a request over the 4,096-token latency cap); the profile's own temperatures and yes/no floor 0.801 as shipped. Static review of every author file found no network, subprocess, eval, pickle or trust_remote_code use and no branch on item text.",
    price_in_per_m=ref[1][0],
    price_out_per_m=ref[1][1],
    cost_kind="estimate",
    price_kind="estimate",
    cost_basis=(
        "ESTIMATE (*est.), base-model market reference through the frozen pricing_v15 module (sha256 "
        + PS
        + f"): declared base {BASE} -> reference() -> google/gemma-4-31b-it, USD 0.09 per million input tokens, USD 0.34 per million output tokens (frozen price cut-off snapshot), the same reference as the other Gemma-4-31B-it rows of this board. "
        "The customer asked for the cost of the base model. Estimated, not charged, not a quote from the author or any host. "
        "Tokens as reported by the author's server usage block (the full record, 1 output token per decision for the readout). "
        "Over all 1,500 items the frozen resolve() gives USD 0.115415 per 1,000 decisions; the official cost axis uses the common 1,485-item basis (below), where the row is under the official cost cap."
    ),
    disclosure=(
        "MEASURED AS SHIPPED: the author's own documented JevBench configuration (run_default.sh, one-engine profile): FP8 weights and the two-way reading that this profile applies by default. A different serving choice (for example the author's stock-vLLM one-way fallback) would give different numbers. "
        "ALL 1,500 ITEMS ANSWERED IN FULL: none was refused, cut or truncated; the 15 longest items (76,497 to 81,692 input tokens, below the engine's 126,976-token cap) were read whole one-way. 15 decisions took more than 10 seconds (the 15 longest items, maximum 39.08 s); v1.6 applies no 10-second rule. "
        "PUBLIC VS SEALED, author statement: the author's README reports 214 of 231 on the public JevBench items from its own client (easy 48/48, original 72/72, hard 94/111). That figure is the author's, on the public items; this row's numbers are what we measured on the sealed draw, and the scorer's standard public-vs-sealed gap rule applies as for every row. "
        "TRAINING DATA: the author's training-data statement was not checked. Customer statements about the model, its training and its serving are not independently verified."
    ),
    endpoint_condition=(
        "Paid public fast-lane order 5fa1a5f0 (H2O.ai). Evaluator-owned rented Verda GPU VM (1RTXPRO6000.30V, FIN-03, Finland, EU, pay-as-you-go, USD 2.535/h), 1x NVIDIA RTX PRO 6000 Blackwell Server Edition 96 GB (97,887 MiB). "
        "Run image built on the digest-pinned official vllm/vllm-openai:v0.30.0 with the author's overlay and shim installed before any test item existed, all 26 weight files sha256-verified at revision ca6e6f6e, then run in an offline container (network none), the cut proven from inside before the sealed input and again before the scored run. "
        "Driven serially, one request at a time, by the unchanged self-hosted runner. Measured 22 Oct 2026 on the frozen v1.6-regular-20261012 self-hosted input (sha256 dfd36720...); determinism 50/50 bit-identical; raw latency p50 0.065 s, p95 0.126 s, maximum 39.08 s. "
        "The standard self-hosted x2 + 0.15 s adjustment applies (assumption, not measured)."
    ),
)
e["cost_basis"] += (
    f" COMMON COST BASIS (v1.6.30): common 1,485 items, excluding the 15 longest for every row; {ci:,} input / {co:,} output tokens. "
    f"All-item usage {tin:,} input / {tout:,} output over 1,500 items; the 15 longest items, which this row answered in full, count for no row's cost."
)
usd_common = 1000 * (ci * e["price_in_per_m"] + co * e["price_out_per_m"]) / 1e6 / 1485
CAP = 0.06459465517241379
assert abs(usd_common / CAP - 0.6876720570049526) < 1e-9
# Measured accuracy on the 15 longest items, via the frozen scorer's own correctness rule.
systems, _ = SC.build_systems(gold, {KEY: e}, {KEY: rr})
items = systems[KEY].scored
score_group = lambda grp: (lambda v: [sum(SC._correct(g, z) for g, z in v), len(v)])([(g, z) for g, z in items if (g.oid in EX) == grp])
a, b = score_group(True), score_group(False)
e["disclosure"] += (
    f" Measured accuracy on the 15 longest items (answered in full): {a[0]} of {a[1]} correct ({100*a[0]/a[1]:.1f} %), versus {b[0]} of {b[1]} ({100*b[0]/b[1]:.1f} %) on the remaining items; a Score item is correct within half a label step."
)
import re as _re
for _f, _v in e.items():
    assert not isinstance(_v, str) or not _re.search(r"#\d{4,5}|deputy|CoS\b|review sha", _v), (_f, _v[:80])
reg[KEY] = e
dst = B / "runs" / f"{KEY}.jsonl"
if dst.is_symlink():
    dst.unlink()
dst.symlink_to(RAW)
lat_sorted = sorted(lat)
entries = {KEY: dict(raw_sha256=RAW_SHA, custody="admitted by the evaluator exposure gate (single-use admission consumed)", handoff="run receipt on file", pre_score_review=None)}
rows = {KEY: dict(
    raw_sha256=RAW_SHA, rows=1500, status_counts=status, ok=sum(bool(x["ok"]) for x in rr),
    input_tokens=tin, output_tokens=tout, common_input_tokens=ci, common_output_tokens=co,
    over_10s=over10, max_latency_s=round(max(lat), 2), usd_common=usd_common)}
put(B / "REGISTRY-PUBLIC.json", reg)
put(B / "ENTRIES.json", entries)
put(B / "ROWS.json", rows)
put(J / "receipts/PRICING-DECISIONS.json", dict(
    module_sha256=PS,
    calls={KEY: {"reference_call": f"reference({KEY!r}, {{'base_model': {BASE!r}}}, catalog_rates())",
                 "reference_result": ref, "effective_price": [e["price_in_per_m"], e["price_out_per_m"]],
                 "usd_per_1000_common_basis": usd_common, "usd_per_1000_all_items": 0.11541544000000001,
                 "cost_cap_ratio": usd_common / CAP}},
    ten_second_rule_applied=False))
print(json.dumps(rows, indent=1))
print(f"PASS: 72 carried registry entries/raw hashes unchanged, {len(rows)} new raw verified")
