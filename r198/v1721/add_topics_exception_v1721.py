#!/usr/bin/env python3
"""Record the breakdown-gate exception for the v1.7.21 row's missing topic cells (the 27 Oct draw still has no ruled subject-topic
labels). Same rule as the v1.7.14/v1.7.20 entries (DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141), extended to every row
on that draw. The six earlier rows' entries stay as they are. Idempotent; --dry-run prints the entry only."""
import argparse,json,pathlib,re
DECISION='DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141 (release owner), extended to every row on the 27 Oct draw (v1.7.21)'
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--decision',default=DECISION);ap.add_argument('--dry-run',action='store_true');A=ap.parse_args()
if not re.match(r'^(DECISIONS \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC|board #\d+)',A.decision):ap.error('REFUSED: decision must start with "DECISIONS YYYY-MM-DD HH:MM UTC" or "board #N"')
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];p=W/'data/jevbench-breakdown-exceptions.json';d=json.loads(p.read_text())
keys=sorted(json.loads((J/'src/inputs.json').read_text()))
entries=[{'key':k,'dims':['topics'],'reason':'TEMPORARY: row on the 27 Oct 2026 regular draw (v1.6-regular-20261027, release v1.7.21). That draw has no ruled subject-topic labels yet, so no topic cells exist; its use-case and language cells are measured on the row\'s own draw. A follow-up release adds the topic cells once the draw\'s items are labelled and removes this entry.','decision':A.decision} for k in keys]
if A.dry_run:print(json.dumps(entries,indent=1));raise SystemExit
have={x['key']:x for x in d['entries']};added=0
for e in entries:
 if e['key'] in have:assert have[e['key']]==e,('different entry exists',e['key']);continue
 d['entries'].append(e);added+=1
p.write_text(json.dumps(d,indent=1,ensure_ascii=False)+'\n');print('topics exceptions: added',added,'of',len(entries))
