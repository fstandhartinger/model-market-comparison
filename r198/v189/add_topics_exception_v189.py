import argparse,json,pathlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];p=W/'data/jevbench-breakdown-exceptions.json'
ap=argparse.ArgumentParser();ap.add_argument('--dry-run',action='store_true');a=ap.parse_args()
policy=json.loads((J/'inputs/BREAKDOWN-POLICY.json').read_text())
e={'key':'karpo_decision_31b','dims':policy['withheld_dims'],'reason':policy['reason'],'decision':policy['decision']}
if a.dry_run: print(json.dumps(e));raise SystemExit
pub=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.9-publication.json').read_text())
d=json.loads((J/'inputs/TOPICS-BASE.json').read_text())
if pub['review']['verdict']=='PASS':d['entries'].append(e);p.write_text(json.dumps(d,indent=1,ensure_ascii=False)+'\n')
else:p.write_bytes((J/'inputs/TOPICS-BASE.json').read_bytes())
print('Breakdown exception follows publication visibility')
