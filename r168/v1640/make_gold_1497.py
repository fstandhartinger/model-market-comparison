#!/usr/bin/env python3
"""Derive the n = 1,497 gold for the hosted-GLiDE scoring invocation (lead ruling R168, ruling 1, option 2).

Reads the FROZEN v1.6-regular-20261012 gold and the custody exclusion file (3 items Fastino had already seen), writes a
derived release directory in which ONLY frozen/gold.jsonl lacks exactly those 3 opaque ids (every other line byte-identical,
original order). inputs/manifest.json is a byte copy of the frozen one. The frozen scorer 02132271 is run on this directory
unmodified. Usage: make_gold_1497.py <out-dir>  -> prints/writes DERIVATION.json (frozen + derived gold shas)."""
import hashlib, json, pathlib, sys

sha = lambda b: hashlib.sha256(b).hexdigest()
SEAL = pathlib.Path("/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012")
EXCL = SEAL / "GLIDE-1.2-FASTINO-EXCLUSIONS-20261022.json"
EXCL_SHA = "31b47af58dce134a70e5cbf60aad40db0000dd398f26649070fb7c9dfd1deeb3"
out = pathlib.Path(sys.argv[1])
eb = EXCL.read_bytes()
assert sha(eb) == EXCL_SHA, "exclusion file moved"
ex = {x["task_id"] for x in json.loads(eb)["excluded"]}
assert len(ex) == 3
gb = (SEAL / "frozen/gold.jsonl").read_bytes()
lines = gb.decode("utf-8").splitlines(keepends=True)
keep, dropped = [], []
for l in lines:
    if not l.strip():
        keep.append(l)
        continue
    (dropped if json.loads(l)["opaque_id"] in ex else keep).append(l)
assert len(dropped) == 3 and {json.loads(l)["opaque_id"] for l in dropped} == ex, "exclusion ids not found exactly once"
assert len([l for l in keep if l.strip()]) == 1497
(out / "frozen").mkdir(parents=True, exist_ok=True, mode=0o700)
(out / "inputs").mkdir(parents=True, exist_ok=True, mode=0o700)
derived = "".join(keep).encode("utf-8")
(out / "frozen/gold.jsonl").write_bytes(derived)
mb = (SEAL / "inputs/manifest.json").read_bytes()
(out / "inputs/manifest.json").write_bytes(mb)
# Ruled topic/use-case labels: the unchanged topic builder requires labels to cover exactly the gold ids, so the same 3 ids are removed from a copy.
LAB = SEAL.parent / "topic-categories-v1/labels-v1621-d3-ruled.jsonl"
lb = LAB.read_bytes()
llines = lb.decode("utf-8").splitlines(keepends=True)
lkeep = [l for l in llines if not l.strip() or json.loads(l)["id"].split("::")[0] not in ex]
assert len(llines) - len(lkeep) == 6 and len(lkeep) == len(llines) - 6, "expected exactly 2 label lines (topic, usecase) per excluded id"
lder = "".join(lkeep).encode("utf-8")
(out / "labels-1497.jsonl").write_bytes(lder)
rec = dict(
    labels_frozen_sha256=sha(lb), labels_derived_sha256=sha(lder),
    frozen_gold_sha256=sha(gb), derived_gold_sha256=sha(derived), exclusion_file_sha256=EXCL_SHA,
    manifest_sha256=sha(mb), frozen_items=1500, derived_items=1497, removed_opaque_ids=sorted(ex),
    rule="only frozen/gold.jsonl differs: the 3 ids of the custody exclusion file are removed; all other lines byte-identical and in original order",
)
(out / "DERIVATION.json").write_text(json.dumps(rec, indent=1, sort_keys=True) + "\n")
print(json.dumps({k: v for k, v in rec.items() if k != "removed_opaque_ids"}, indent=1))
