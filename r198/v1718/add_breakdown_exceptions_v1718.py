import pathlib,json
from rows_v1718 import KEYS
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];p=W/'data/jevbench-breakdown-exceptions.json';d=json.loads(p.read_text())
for k in KEYS:
 e={'key':k,'dims':['topics','usecases'],'reason':'The answer file was lost on 26 Oct 2026 after scoring. The retained 23 Oct summaries preserve family and language cells but not subject-topic or use-case cells; those breakdowns cannot be reconstructed.','decision':'board #31728; refined by DECISIONS 2026-10-28 17:5xZ knowline-r8c-lost-raw-omissions (release-owner ruling)'}
 have=next((x for x in d['entries'] if x['key']==k),None)
 if have:assert have==e
 else:d['entries'].append(e)
p.write_text(json.dumps(d,indent=1,ensure_ascii=False)+'\n')
