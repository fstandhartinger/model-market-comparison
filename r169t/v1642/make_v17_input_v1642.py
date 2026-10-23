#!/usr/bin/env python3
"""Write the row's v1.7 inputs (registry entry + price/latency basis; aggregates only) for the v1.7.0 builder.
Usage: make_v17_input_v1642.py [extra output dir]"""
import json, pathlib, sys

J = pathlib.Path(__file__).resolve().parent
B = J / "batch"
KEY = "torchcast-decision-4b-v1.3"
RAW = pathlib.Path("/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/runs-fastlane/torchcast-decision-4b-v1.3.raw.jsonl")
reg = json.loads((B / "REGISTRY-PUBLIC.json").read_text())
rows = json.loads((B / "ROWS.json").read_text())[KEY]
pricing = json.loads((J / "receipts/PRICING-DECISIONS.json").read_text())
pf = json.loads((J / "receipts/PRICING-PREFLIGHT.json").read_text()) if (J / "receipts/PRICING-PREFLIGHT.json").exists() else {}
entry = {KEY: {
    "entry": reg[KEY],
    "note": "Registry entry exactly as used for the v1.6.42 build (frozen scorer 02132271, pricing_v15 aa2afcd5). Paid fast-lane order 9494e9ea, self-hosted, serial. Raw stays in the custody store; never copy it into the site tree.",
    "raw": str(RAW),
    "raw_sha256": rows["raw_sha256"],
    "receipts_dir": "/home/flori/jobs/fastlane-torchcast4b-v13-native-20261023/handoff/torchcast-decision-4b-v1.3",
}}
call = pricing["calls"][KEY]
basis = {
    "key": KEY,
    "cost_cap_ratio_common_basis": call["cost_cap_ratio"],
    "hardware": "Verda 1A100.22V FIN-02, 1x NVIDIA A100 SXM4 80GB, USD 2.128/h, serial, network none",
    "latency": {
        "decisions_over_10s": rows["over_10s"],
        "note": "No decision took more than 10 s (maximum 7.73 s), so a v1.7 10-second rule costs this row nothing.",
        "raw_max_s": rows["max_latency_s"],
        "raw_p50_s": rows["raw_p50_s"],
        "raw_p95_s": rows["raw_p95_s"],
    },
    "price_basis": "ESTIMATE, base Qwen/Qwen3.5-4B: reference() -> deepinfra:Qwen/Qwen3.5-4B, USD 0.03/M input, 0.15/M output (frozen 25 Sep 2026 cut-off snapshot), the same reference as the live v1.2 row; Qwen/Qwen3.5-4B-Base maps to the same reference",
    "pricing_module_sha256": pricing["module_sha256"],
    "serving": "author's torchcast_decision server unchanged at tag v1.3.0 with its bundled decision_config.json (non-causal full attention, calibration T 0.9, yes/no floor 0.801), official PyTorch 2.9.1 cu128 image, Python 3.11, offline hash-locked overlay (transformers 5.8.1, flash-linear-attention 0.5.2, causal-conv1d 1.7.0), CUDA graphs in non-causal mode",
    "status": {"http": rows["status_counts"], "ok": rows["ok"], "rows": rows["rows"]},
    "tokens": {"all_input": rows["input_tokens"], "all_output": rows["output_tokens"], "common_input": rows["common_input_tokens"], "common_output": rows["common_output_tokens"]},
    "usd_per_1000_all_1500_items_resolve": call["usd_per_1000_all_items"],
    "usd_per_1000_common_basis_1485": call["usd_per_1000_common_basis"],
    "v16_result": "see r169t/v1642/BUILD-REPORT.md and data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.42-results.json (when published)",
}
outs = [J / "v17-input"] + [pathlib.Path(a) for a in sys.argv[1:]]
for o in outs:
    o.mkdir(parents=True, exist_ok=True)
    (o / "ENTRY-TORCHCAST-4B-V13.json").write_text(json.dumps(entry, indent=1, sort_keys=True, ensure_ascii=False) + "\n")
    (o / "BASIS-TORCHCAST-4B-V13.json").write_text(json.dumps(basis, indent=1, sort_keys=True, ensure_ascii=False) + "\n")
print("wrote", [str(o) for o in outs])
