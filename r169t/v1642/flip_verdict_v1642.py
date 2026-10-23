#!/usr/bin/env python3
"""Flip the v1.6.42 publication manifest from PENDING to the independent review's verdict.
(copy of v1635/flip_verdict_v1635.py; refuses while any approval PLACEHOLDER is present - no approval record is pending for a paid single-row release
first and have the critic review THOSE bytes - and while the stacked predecessor v1.6.40 is not PASS or not sealed.)

  python3 flip_verdict_v1642.py <receipt.json>            # flips (writes the manifest)
  python3 flip_verdict_v1642.py <receipt.json> --dry-run  # checks everything, writes nothing
  WT=<tree> overrides the worktree (default /home/flori/wt/jevbench-v1642-20261021)
"""
import hashlib, json, os, pathlib, sys

W = pathlib.Path(os.environ.get("WT", str(pathlib.Path(__file__).resolve().parents[2])))
V16 = W / "data/raw/benchmarks/jevbench/v1.6"
MAN = V16 / "jevbench-v1.6.42-publication.json"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
DRY = "--dry-run" in sys.argv
if not args:
    sys.exit("usage: flip_verdict_v1642.py <critic receipt json> [--dry-run]")
REC = pathlib.Path(args[0])
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()

rec = json.loads(REC.read_text())
if rec.get("verdict") != "PASS":
    sys.exit(
        f"REFUSED: the review verdict is {rec.get('verdict')!r}, not PASS - nothing is flipped"
    )
if not DRY and rec.get("engine", "").startswith("synthetic"):
    sys.exit("REFUSED: synthetic test receipt is not an independent release review")
m = json.loads(MAN.read_text())
assert m["revision"] == "v1.6.42", m["revision"]
assert m["review"] == {
    "engine": "PENDING",
    "verdict": "PENDING",
    "receipt_sha256": None,
}, m["review"]
for k, f in m["files"].items():
    assert sha(W / f["path"]) == f["sha256"], f"{k}: bytes differ from the manifest"
placeholder = any(
    "PLACEHOLDER" in (V16 / f"jevbench-v1.6.42-{k}.json").read_text()
    for k in ("proof", "results")
)
pred = json.loads((V16 / "jevbench-v1.6.40-publication.json").read_text())
proof37 = json.loads((V16 / "jevbench-v1.6.42-proof.json").read_text())
pred_ok = (
    pred["review"]["verdict"] == "PASS"
    and sha(V16 / "jevbench-v1.6.40-publication.json")
    == m["predecessor"]["publication_sha256"]
)
seal_prev = pathlib.Path(
    "/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.6.40/addendum.json"
)
seal_ok = seal_prev.exists() and proof37.get("predecessor_seal_sha256") == sha(
    seal_prev
)
if not DRY and not (pred_ok and seal_ok):
    sys.exit(
        f"REFUSED: rebuild on the PASS, sealed v1.6.40 first (predecessor PASS+bound: {pred_ok}; v1.6.40 seal bound: {seal_ok})"
    )
if placeholder and not DRY:
    sys.exit(
        "REFUSED: an approval PLACEHOLDER is present"
    )
engine = rec.get("engine") or "claude"
m["review"] = {"engine": engine, "verdict": "PASS", "receipt_sha256": sha(REC)}
data = json.dumps(m, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
if DRY:
    print(
        json.dumps(
            {
                "dry_run": True,
                "manifest": str(MAN),
                "would_set_review": m["review"],
                "receipt": str(REC),
                "approval_placeholder_present": placeholder,
                "predecessor_pass_and_bound": pred_ok,
                "predecessor_seal_bound": seal_ok,
                "note": (
                    "a real flip REFUSES while the placeholder is present"
                    if placeholder
                    else "approval filled"
                ),
                "manifest_sha256_after": hashlib.sha256(data.encode()).hexdigest(),
                "manifest_unchanged_on_disk_sha256": sha(MAN),
            },
            indent=1,
        )
    )
    sys.exit(0)
MAN.write_text(data)
print(
    json.dumps(
        {
            "manifest": str(MAN),
            "review": m["review"],
            "receipt": str(REC),
            "manifest_sha256": sha(MAN),
        },
        indent=1,
    )
)
