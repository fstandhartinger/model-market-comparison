#!/usr/bin/env python3
"""Release-owner helper: record the breakdown-gate exception for the v1.7.13 row's missing topic cells (the 27 Oct draw has no
ruled subject-topic labels). Requires the decision reference the gate demands ('DECISIONS YYYY-MM-DD HH:MM UTC ...' or
'board #N ...'); this worker records none. --dry-run prints the entry only. Remove the entry when the draw's topic cells ship."""
import argparse,json,pathlib,re
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--decision',required=True);ap.add_argument('--dry-run',action='store_true');A=ap.parse_args()
if not re.match(r'^(DECISIONS \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC|board #\d+)',A.decision):ap.error('REFUSED: decision must start with "DECISIONS YYYY-MM-DD HH:MM UTC" or "board #N"')
W=pathlib.Path(__file__).resolve().parents[2];p=W/'data/jevbench-breakdown-exceptions.json';d=json.loads(p.read_text())
entry={'key':'h2o-lightning-4b-v1.4.1','dims':['topics'],'reason':'TEMPORARY: first row on the 27 Oct 2026 regular draw (v1.6-regular-20261027, release v1.7.13). That draw has no ruled subject-topic labels yet, so no topic cells exist; its use-case and language cells are measured on the row\'s own draw. A follow-up release adds the topic cells once the draw\'s items are labelled and removes this entry.','decision':A.decision}
if A.dry_run:print(json.dumps(entry,indent=1));raise SystemExit
assert not any(x['key']==entry['key'] for x in d['entries']),'entry exists'
d['entries'].append(entry);p.write_text(json.dumps(d,indent=1,ensure_ascii=False)+'\n');print('added',entry['key'])
