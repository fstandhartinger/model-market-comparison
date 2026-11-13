#!/usr/bin/env python3
"""Breakdown-gate exception for the added v1.8.10 row's missing topic cells (the 27 Oct draw has no ruled subject-topic labels yet). Same rule as
every other row on that draw (DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141, extended to every row on the 27 Oct draw). The
exception follows publication visibility: while v1.8.10 is not PASS the file is exactly the v1.8.9 state (inputs/TOPICS-BASE.json), so a hidden
row never leaves an orphan exception. Idempotent; --dry-run prints the entry only."""
import argparse,json,pathlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];p=W/'data/jevbench-breakdown-exceptions.json'
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--dry-run',action='store_true');a=ap.parse_args()
DECISION='DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141 (release owner), extended to every row on the 27 Oct draw (v1.8.10)'
keys=json.loads((J/'src/new-keys.json').read_text());assert keys==['gemini-decision-1']
entries=[{'key':k,'dims':['topics'],'reason':'TEMPORARY: row on the 27 Oct 2026 regular draw (v1.6-regular-20261027, release v1.8.10). That draw has no ruled subject-topic labels yet, so no topic cells exist; its use-case and language cells are measured on the row\'s own draw. A follow-up release adds the topic cells once the draw\'s items are labelled and removes this entry.','decision':DECISION} for k in keys]
if a.dry_run:print(json.dumps(entries,indent=1));raise SystemExit
pub=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-publication.json').read_text())
base=(J/'inputs/TOPICS-BASE.json').read_bytes();d=json.loads(base)
assert not {e['key'] for e in d['entries']}&set(keys)
if pub['review']['verdict']=='PASS':
 d['entries']+=entries;p.write_text(json.dumps(d,indent=1,ensure_ascii=False)+'\n');print('Breakdown exception follows publication visibility: added',len(entries))
else:
 p.write_bytes(base);print('Breakdown exception follows publication visibility: PENDING, v1.8.9 state kept')
