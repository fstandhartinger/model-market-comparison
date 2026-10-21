"""Save/restore this job's aggregate candidate, never raw inputs or responses."""

import pathlib, sys, shutil, json

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
name = sys.argv[1]
save = J / "batch" / ("site-" + name)
restore = "--restore" in sys.argv
files = (
    list(V.glob("jevbench-v1.6.38-*.json"))
    + [
        V / "jevbench-v1.6-cohort-topic-cells.json",
        W / "lib/jevbench-v1638-release.mjs",
        W / "test/fixtures/jevbench-v1638-ranks.json",
    ]
    + list((J / "preview").glob("*"))
)
receipt_names = [
    "BUILD.json",
    "NEW-ROW-SPEC.json",
    "topfive-after.json",
    "topfive-diff.json",
    "TOPFIVE-V1638.md",
]
files += [J / "receipts" / f for f in receipt_names]
if restore:
    for p in save.rglob("*"):
        if p.is_file():
            dst = W / p.relative_to(save)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(p, dst)
else:
    for p in files:
        if p.is_file():
            dst = save / p.relative_to(W)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(p, dst)
    for f in receipt_names:
        p = J / "receipts" / f
        if p.exists():
            shutil.copyfile(p, J / "receipts" / (name + "-" + f))
print("restored" if restore else "saved", name)
