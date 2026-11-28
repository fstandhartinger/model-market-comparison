#!/usr/bin/env python3
"""Breakdown-gate exception for the added v1.8.24 row's missing topic cells (the 22 Nov supplementary set has no ruled subject-topic labels yet; same rule as
the rows on the 27 Oct draw, DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141; the release owner records the extension to the 22 Nov supplementary set). The
exception follows publication visibility: while v1.8.24 is not PASS the file is exactly the pinned main state (inputs/TOPICS-BASE.json), so a hidden
row never leaves an orphan exception. Idempotent; --dry-run prints the entry only."""
import argparse,json,pathlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];p=W/'data/jevbench-breakdown-exceptions.json'
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--dry-run',action='store_true');a=ap.parse_args()
DECISION='DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141 (release owner), applied to the two hosted API rows on the 22 Nov supplementary set (v1.8.24); the release owner records the extension when binding the review'
keys=json.loads((J/'src/new-keys.json').read_text());assert len(keys)==2
entries=[{'key':k,'dims':['topics'],'reason':f"TEMPORARY: hosted API row on the 600-item supplementary set of the 22 Nov 2026 draw (release v1.8.24). The set has no ruled subject-topic labels yet; use-case and language cells are shown only where at least 30 items back them. A follow-up release adds topic cells once the draw is labelled and removes this entry.",'decision':DECISION} for k in keys]
if a.dry_run:print(json.dumps(entries,indent=1));raise SystemExit
pub=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.24-publication.json').read_text())
base=(J/'inputs/TOPICS-BASE.json').read_bytes();d=json.loads(base)
assert not {e['key'] for e in d['entries']}&set(keys)
if pub['review']['verdict']=='PASS':
 d['entries']+=entries
 p.write_text(json.dumps(d,indent=1,ensure_ascii=False)+'\n');print('Breakdown exception follows publication visibility: added',len(entries))
else:
 p.write_bytes(base);print('Breakdown exception follows publication visibility: PENDING, pinned main state kept')
