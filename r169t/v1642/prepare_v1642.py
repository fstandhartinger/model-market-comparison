#!/usr/bin/env python3
"""Prepare the v1.6.42 batch: the 74 published v1.6.40 registry rows plus ONE paid self-hosted row (torchcast-decision-4b-v1.3).
The 73 same-draw rows (all but the hosted GLiDE row, which was scored on a derived 1,497-item gold) form the field that is scored on the
real 1,500-item gold together with the new row. No submission code runs. The sealed raw stays outside Git."""
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
assert PS == "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7"
spec = importlib.util.spec_from_file_location("pricing", P)
pr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pr)
cat = pr.catalog_rates()
proof = load(W / "data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.40-proof.json")
# Base registry = the v1.6.40 sealed registry (bound by the v1.6.40 proof).
S40 = SEAL / "frozen-release-v1.6.40"
assert sha(S40 / "REGISTRY-PUBLIC.json") == proof["registry_sha256"]
reg = load(S40 / "REGISTRY-PUBLIC.json")
assert len(reg) == 74 and "fastino-glide-api" in reg
# Raw locations of the carried rows (hash-checked below); the symlink farm of the v1.6.40 build may have been cleaned up.
ROOT = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
CANDIDATES = lambda k: [
    B / "runs" / f"{k}.jsonl",
    ROOT / f"workers/r168-v1640-build2/wt/r168/v1640/batch/runs/{k}.jsonl",
    ROOT / f"r154/v1636/batch/runs/{k}.jsonl",
    SEAL / f"runs/api-full/{k}.jsonl",
    SEAL / f"runs-fastlane/{k}.raw.jsonl",
    pathlib.Path("/home/flori/jobs/fastlane-iota-d831408e-20261021/run/out/raw.jsonl"),
    pathlib.Path("/home/flori/jobs/fastlane-holds-20261021/h2o31b-run/out/raw.jsonl"),
]
# The hosted GLiDE row was scored on a derived 1,497-item gold; it is carried by bytes and is not part of the real-gold field run.
GLIDE = "fastino-glide-api"
for k in reg:
    src = next((c.resolve() for c in CANDIDATES(k) if c.exists() and sha(c.resolve()) == proof["raw_sha256"][k]), None)
    assert src is not None, f"no hash-matching raw found for {k}"
    dst = B / "runs" / f"{k}.jsonl"
    if k == GLIDE:
        if dst.is_symlink():
            dst.unlink()  # the field directory holds only the rows scored on the real gold
        continue
    if dst.is_symlink():
        dst.unlink()
    dst.symlink_to(src)
cb = S40 / "cost-basis.json"
assert sha(cb) == "2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d"
(B / "cost-basis-v1630.json").write_bytes(cb.read_bytes())
EX = set(load(cb)["exclude_opaque_ids"])
assert len(EX) == 15
gold = SC.load_gold(SEAL / "frozen/gold.jsonl")
assert len(gold) == 1500
carried_field = {k: v for k, v in reg.items() if k != GLIDE}
assert len(carried_field) == 73

KEY = "torchcast-decision-4b-v1.3"
RAW = SEAL / "runs-fastlane/torchcast-decision-4b-v1.3.raw.jsonl"
RAW_SHA = "057cae292bed0489d85af357e9aa4589b979677deb273b806b35f16180b8f478"
assert sha(RAW) == RAW_SHA and oct(RAW.stat().st_mode & 0o777) == "0o600"
rr = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
assert len(rr) == len({x["task_id"] for x in rr}) == 1500
# IDs compared only in memory; never emit sealed items or predictions.
assert {r["task_id"] for r in rr} == set(gold)
for x in rr:  # a missing usage field would cost the whole row at scoring
    assert isinstance(x.get("usage"), dict) and isinstance(x["usage"].get("input_tokens"), int) and isinstance(x["usage"].get("output_tokens"), int)
    assert x["probs_source"] == "native"
tin = sum(x["usage"]["input_tokens"] for x in rr)
tout = sum(x["usage"]["output_tokens"] for x in rr)
assert (tin, tout) == (982889, 0)
status = dict(collections.Counter(str(x["status_code"]) for x in rr))
assert status == {"200": 1500} and all(x["ok"] for x in rr)
eligible = [r for r in rr if r["task_id"] not in EX]
assert len(eligible) == 1485
ci = sum(x["usage"]["input_tokens"] for x in eligible)
co = sum(x["usage"]["output_tokens"] for x in eligible)
assert (ci, co) == (737326, 0)
lat = [x["latency_s"] for x in rr]
assert all(isinstance(v, (int, float)) and v >= 0 for v in lat)
over10 = sum(v > 10 for v in lat)
assert over10 == 0 and round(max(lat), 4) == 7.7282
ls = sorted(lat)
p50, p95 = ls[len(ls) // 2 - 1] / 2 + ls[len(ls) // 2] / 2, ls[int(0.95 * len(ls))]
assert round(p50, 4) == 0.0336 and round(p95, 4) == 0.0560, (p50, p95)

# Price: ESTIMATE on the declared base model through the frozen module (same reference as the live v1.2 row).
BASE = "Qwen/Qwen3.5-4B"
ref = pr.reference(KEY, {"base_model": BASE, "source": "selfhosted", "price_in_per_m": None, "price_out_per_m": None}, cat)
assert round(ref[1][0], 8) == 0.03 and round(ref[1][1], 8) == 0.15, ref
assert reg["torchcast-decision-4b-v1.2"]["base_model"] == BASE
PRICE_IN, PRICE_OUT = ref[1]  # as the live v1.2 row carries them (0.030000000000000002, 0.15)

e = dict(
    author="Torchcast AI",
    base_model=BASE,
    display="Torchcast Decision 4B (v1.3)",
    repo="https://huggingface.co/torchcast-ai/torchcast-decision-4b",
    revision="004acea2e23056bc79415cfa69b9f3ea4254e6d0",
    lane="selfhosted",
    endpoint_kind="gpu",
    open="yes",
    ranked=True,
    support=dict(choice="native", noul="native", score="native"),
    licence="Apache-2.0 (weights, from v1.2); base Qwen/Qwen3.5-4B Apache-2.0; serving package Apache-2.0",
    code_revision="004acea2e23056bc79415cfa69b9f3ea4254e6d0",
    price_in_per_m=PRICE_IN,
    price_out_per_m=PRICE_OUT,
    cost_kind="estimate",
    price_kind="estimate",
    cost_basis=(
        "Self-hosted open weights, no bookable tariff. v1.5-M2 base-model reference rule: base Qwen/Qwen3.5-4B (model card base_model, finetune). "
        "OpenRouter snapshot of 2026-10-23 lists no Qwen3.5-4B; binding precedent INTERPRETATION-1 I-2/I-3 uses DeepInfra Qwen/Qwen3.5-4B at USD 0.03/M input and USD 0.15/M output from the frozen 25 Sep 2026 price cut-off snapshot (read 2026-10-23), "
        "through the frozen pricing_v15 module (sha256 " + PS + "), the same reference as the live v1.2 row. ESTIMATE, not charged, not a quote from the author or any host. "
        "No-generation readout: output tokens 0. Frozen reference deepinfra:Qwen/Qwen3.5-4B; 982,889 input / 0 output tokens over all 1,500 decisions (USD 0.0196578 per 1,000 over all 1,500 items), inside the official cap. "
        "COMMON COST BASIS (v1.6.30): cost per 1,000 decisions is computed on the common 1,485 items of this draw, leaving out the 15 very long items that count for no row; "
        f"{ci:,} input / {co:,} output tokens on those 1,485 items. "
    ),
    disclosure=(
        "Paid fast-lane order 9494e9ea (public). Qwen3.5-4B fine-tune served by the author's own torchcast_decision package, measured as shipped: the author's server unchanged at tag v1.3.0 with its bundled decision_config.json (repository torchcast-ai/torchcast-decision-4b at the pinned commit above). "
        "Same runtime as the v1.2 row: official pytorch/pytorch:2.9.1-cuda12.8-cudnn9-devel image (digest-pinned) plus an offline hash-locked overlay of the documented packages (transformers 5.8.1, flash-linear-attention 0.5.2, causal-conv1d 1.7.0), on Python 3.11 instead of the documented 3.12. "
        "decision_config.json sets attention_mode noncausal_full_attention (the full-attention layers see the whole prompt in both directions, as trained; causal runtimes such as vLLM give different probabilities) and a disclosed yes/no commit floor of 0.801: a yes/no probability with max(P, 1-P) below 0.801 is moved to 0.801 on its own side (answer unchanged; same mechanism as h2o-lightning-4b, v1.1 and v1.2). "
        "New in v1.3: new fine-tuned weights; calibration temperature 0.9 (v1.2 used 1.0); CUDA graphs in the non-causal mode (speed only: graph and eager readouts were bit-identical in our check). "
        "Prompts over 16,384 tokens keep the head and the tail of the state (documented). Output tokens are 0 (no generation). "
        "All 1,500 items answered, none refused or cut; no decision took more than 10 seconds (maximum 7.73 s). "
        "The cost is a labelled estimate on the Qwen3.5-4B base-model reference, not a price the author or a host charges. "
        "Self-hosted speed adjustment as for every self-hosted row; the device class (A100 SXM4 80GB) is the same as for v1.2. "
        "v1.3 is a new row next to v1.2; v1.2 remains listed as its own version."
    ),
    endpoint_condition=(
        "Evaluator-owned rented Verda GPU VM (1A100.22V, FIN-02, Finland, EU, pay-as-you-go), 1x NVIDIA A100 SXM4 80GB; offline read-only container (network none), the cut proven from inside before the sealed input was uploaded; "
        "author's torchcast_decision server unchanged at tag v1.3.0 with the bundled decision_config.json (bf16, one forward pass reading option letters, non-causal full attention as trained, calibration temperature 0.9, yes/no commit floor 0.801) "
        "on the documented stack torch 2.9.1+cu128 / transformers 5.8.1 / flash-linear-attention 0.5.2 / causal-conv1d 1.7.0 (fast kernels active; CUDA graphs with a key-padding mask in non-causal mode). "
        "Driven by the unchanged self-hosted runner on the frozen v1.6-regular-20261012 self-hosted input (sha256 dfd36720...), measured 23 Oct 2026; raw latency p50 0.034 s, p95 0.056 s, maximum 7.73 s. "
        "The standard self-hosted x2 + 0.15 s adjustment applies (assumption, not measured)."
    ),
)
# Common cost basis exactly as the scorer applies it; the build below asserts the scorer reproduces this figure.
usd_common = 1000 * (ci * PRICE_IN + co * PRICE_OUT) / 1e6 / 1485
usd_all = 1000 * (tin * PRICE_IN + tout * PRICE_OUT) / 1e6 / 1500
CAP = 0.06459465517241379
assert abs(usd_common - 0.0148955) < 5e-8 and abs(usd_all - 0.0196578) < 5e-8 and abs(usd_common / CAP - 0.2306) < 5e-5
e["cost_basis"] += (
    f"This row: USD {usd_common:.6f} per 1,000 decisions ({usd_common / CAP:.3f}x the official cost cap USD {CAP:.6f}), against USD {usd_all:.6f} over all 1,500 items."
)
import re as _re
for _f, _v in e.items():
    assert not isinstance(_v, str) or not _re.search(r"#\d{4,5}|deputy|CoS\b|review sha|/home/|worker|PREREG|LeChonk|r169|DECISIONS|board", _v), (_f, _v[:80])
reg[KEY] = e
dst = B / "runs" / f"{KEY}.jsonl"
if dst.is_symlink():
    dst.unlink()
dst.symlink_to(RAW)
entries = {KEY: dict(raw_sha256=RAW_SHA, custody="admitted by the evaluator exposure gate (single self-hosted use of the frozen input consumed)", handoff="run receipt on file", pre_score_review=None)}
rows = {KEY: dict(
    raw_sha256=RAW_SHA, rows=1500, status_counts=status, ok=sum(bool(x["ok"]) for x in rr),
    input_tokens=tin, output_tokens=tout, common_input_tokens=ci, common_output_tokens=co,
    over_10s=over10, max_latency_s=round(max(lat), 4), raw_p50_s=round(p50, 4), raw_p95_s=round(p95, 4), usd_common=usd_common, usd_all_items=usd_all)}
put(B / "REGISTRY-PUBLIC.json", reg)
put(B / "REGISTRY-FIELD.json", {k: v for k, v in reg.items() if k != GLIDE})  # 73 carried + the new row, scored on the real gold
put(B / "REGISTRY-CARRIED.json", carried_field)
put(B / "ENTRIES.json", entries)
put(B / "ROWS.json", rows)
put(J / "receipts/PRICING-DECISIONS.json", dict(
    module_sha256=PS,
    calls={KEY: {"reference_call": f"reference({KEY!r}, {{'base_model': {BASE!r}, 'source': 'selfhosted', 'price_in_per_m': None, 'price_out_per_m': None}}, catalog_rates())",
                 "reference_result": ref, "effective_price": [PRICE_IN, PRICE_OUT],
                 "usd_per_1000_common_basis": usd_common, "usd_per_1000_all_items": usd_all,
                 "cost_cap_ratio": usd_common / CAP}},
    ten_second_rule_applied=False))
print(json.dumps(rows, indent=1))
print(f"PASS: 74 carried registry entries/raw hashes unchanged (73 field rows + hosted GLiDE), {len(rows)} new raw verified")
