#!/usr/bin/env python3
"""Record the breakdown-gate exception for the v1.8.4 row's missing topic cells (the 27 Oct draw still has no ruled subject-topic
labels). Same rule as the v1.7.14/v1.7.20 entries (DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141), extended to every row
on that draw. The six earlier rows' entries stay as they are. Idempotent; --dry-run prints the entry only."""
import argparse,json,pathlib,re
DECISION='DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141 (release owner), extended to every row on the 27 Oct draw (v1.8.4)'
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--decision',default=DECISION);ap.add_argument('--dry-run',action='store_true');A=ap.parse_args()
if not re.match(r'^(DECISIONS \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC|board #\d+)',A.decision):ap.error('REFUSED: decision must start with "DECISIONS YYYY-MM-DD HH:MM UTC" or "board #N"')
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];p=W/'data/jevbench-breakdown-exceptions.json';d=json.loads(p.read_text())
# Hidden rows must not create orphan exceptions in the published board's gate.
publication=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-publication.json').read_text())
if publication['review']['verdict']!='PASS':
 if not A.dry_run:p.write_bytes((J/'inputs/TOPICS-BASE.json').read_bytes())
 print('topics exceptions: PENDING row additions hidden; predecessor registry retained')
 raise SystemExit
keys=sorted(json.loads((J/'src/inputs.json').read_text()))
entries=[{'key':k,'dims':['topics'],'reason':'TEMPORARY: row on the 27 Oct 2026 regular draw (v1.6-regular-20261027, release v1.8.4). That draw has no ruled subject-topic labels yet, so no topic cells exist; its use-case and language cells are measured on the row\'s own draw. A follow-up release adds the topic cells once the draw\'s items are labelled and removes this entry.','decision':A.decision} for k in keys]
if A.dry_run:print(json.dumps(entries,indent=1));raise SystemExit
have={x['key']:x for x in d['entries']};added=0
for e in entries:
 if e['key'] in have:assert have[e['key']]==e,('different entry exists',e['key']);continue
 d['entries'].append(e);added+=1
text=p.read_text()
if added:
 boundary=text.rfind('\n ]');assert boundary >= 0
 encoded=',\n'.join(json.dumps(e,indent=1,ensure_ascii=False).replace('\n','\n  ') for e in entries if e['key'] not in have)
 text=text[:boundary]+',\n  '+encoded+text[boundary:]
 assert json.loads(text)==d
 p.write_text(text)
print('topics exceptions: added',added,'of',len(entries))
