"""Append build2 evidence once, retaining the first attempt's section."""

import json, pathlib

J = pathlib.Path(__file__).resolve().parent
load = lambda p: json.loads(pathlib.Path(p).read_text())
a = load(J / "receipts/A-BUILD.json")
tf = load(J / "receipts/A-topfive-diff.json")
rows = load(J / "batch/ROWS.json")
L = [
    "\n\n---\n\n# Build2 — three paid fast-lane rows (21 Oct 2026)\n",
    "This section supersedes the first attempt's pricing stop under the lead's explicit revised decisions. The first attempt above remains unchanged. Local candidate only: independent review PENDING; no push, PR, merge, deployment, seal write, author contact or external message.\n",
    "## Priced Drex variant A\n",
    "|Row|I|Calibration|Speed|Cost axis|Capability|A / B / C|Rank A / B / C / Capability|USD / 1k|× cost cap|",
    "|---|---:|---:|---:|---:|---:|---|---|---:|---:|",
]
for k, r in a["new_rows"].items():
    ax = r["axes"]
    usd = r["cost"]["usd_per_1000"]
    L.append(
        "|"
        + "|".join(
            [
                k,
                *(
                    f"{ax[x]:.6f}"
                    for x in ["intelligence", "calibration", "speed", "cost"]
                ),
                f'{r["capability"]:.6f}',
                " / ".join(f'{r["scores"][o]:.6f}' for o in "ABC"),
                " / ".join(str(r["ranks"][o]) for o in ["A", "B", "C", "capability"]),
                f"{usd:.12f}",
                f"{usd/0.06459465517241379:.6f}",
            ]
        )
        + "|"
    )
L += [
    "",
    "75 release rows, 64 ranked (variant A). The full frozen-scorer field has 72 same-draw rows (69 carried + 3 new); H2O-Lightning-4B and Kahn1 remain the v1.6.37 restatements of their original-draw v1.6.1 rows, and A2 remains unranked. Every one of the 72 predecessor public rows is byte-identical after removing only rank/ranks. In particular, published intervals, diagnostics, costs, disclosures and categories stay unchanged. The field run verifies every carried same-draw point estimate exactly. New intervals use the full-field sorted-roster seeds (B=1000, seed 16).",
    "",
    "## Pricing and provenance",
    "",
    "- Unmodified scorer SHA 02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9, O1S, fixed G_med 9.839526770355711, unchanged cost-basis-v1630 SHA 2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d. No 10-second rule in this v1.6-method release. Each new raw has exactly 0 decisions >10 seconds (all raw latency fields checked).",
    "- Frozen pricing module remains 1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1, read-only. Exact calls/results and effective registry prices are in PRICING-DECISIONS.json. API `reference()` calls return None; the lead explicitly authorises the sibling estimate for Myles and the Drex I-1 list treatment. Drex text is written as if that launch list line exists, per brief; the lead owns the separate reviewed re-freeze/re-pin. No claim that the currently installed module already admits Drex.",
    "- Drex: public USD 0.06/M input, output 0; saved pricing-page sha prefix 95d1c429, fetched 21 Oct 20:18Z. 1,498 HTTP 200 + 2 HTTP 529 overloaded failures, retained. Public items used for checkpoint selection. Common usage 762,693 input / 262,045 output (output is free).",
    "- Myles: true declared base google/gemma-4-12B-it remains explicitly UNLISTED. Same-base precedents arcbright-elf-1-12b, chon-1.0-12b and metask_jev_rain_12b_trained justify nearest-listed Gemma 3 12B sibling ESTIMATE USD 0.05/0.15/M. GBP 0.0015/M input list price is information only and not counted. 1,500 HTTP 200; common usage 779,294 / 1,485. Same-author second exposure after Myles-G 31B; public set treated as seen.",
    "- RAW DISCREPANCY: Myles' 15 longest-item provider usage is 12,511–15,221 input tokens, not the brief's 15,108–15,221; other items max 1,829. The checked raw range is disclosed, not the inaccurate brief range. All 15 are answered/scored as answered under #22794. Aggregate correctness split is computed with the frozen scorer and disclosed.",
    "- Iota: raw SHA 2850e17ddcc3c2ef3a44592b6b377581562ad453ae1561e9d641184ff7ffd1c0, 1,500 HTTP 200, usage 1,094,798 input / 0 output; common input 849,038. Model macrocosm-os/iota-decide-4b @ bd88855a7e3379468537e0142d5f0ada079aca41, renamed repo, first-party /v1/systemone bridge, Verda A100 80 GB, network none. endpoint_kind=gpu, lane=selfhosted, standard x2 + 0.15 s assumption, exactly as seb-9b / v1.6.36 self-hosted rows. 15 states truncated by the model to 16,384 tokens; answered per #22794. Training/license/bridge disclosures retained from handoff.",
    "- Iota provisional I/C/S reproduce EXACTLY. Provisional Cost 59.79 / A 18.721070 used all 1,500 items (USD 0.02189596/1k); official common basis excludes the 15 longest (USD 0.017152282828/1k), so Cost becomes 62.970342 / A 18.937474. Difference is cost basis, not field fitting. Receipt IOTA-SINGLE-VS-FIELD.json.",
    "",
    "## 40-list top-five effect and paid authority",
    "",
    tf["note"],
    "",
]
L += ["- " + s for s in tf["changed_labels"]]
L += [
    "",
    "Only Drex causes these changes. The `jevbench-fast-lane` skill explicitly says paid runs publish automatically, including top-five changes; all three orders are paid public. No new Florian GO, card or button is invented. The late deputy A pricing decision is noted; its generic normal top-five language does not replace the explicit paid exception in the brief/skill. The real manifest stays independent-review PENDING. Interactive full rankings, 40 before/after lists and axis/use-case comparison radars are in preview/preview-full-ranking.html.",
    "",
    "## Rebuild and verification",
    "",
    "`bash r160/v1638/rebuild_v1638.sh` builds A; append `--drex-unpriced` for B. Both use the unmodified frozen scorer. Sealed raws remain at their receipt locations, referenced by private ignored symlinks under batch/runs; no sealed input or per-item output is committed. `batch`, `pass`, and Python caches are ignored.",
    "",
    "Final per-variant gate results and outstanding lead handoff are appended after the runs below.",
]
p = J / "BUILD-REPORT.md"
text = p.read_text()
assert "# Build2 —" not in text
p.write_text(text + "\n".join(L) + "\n")
