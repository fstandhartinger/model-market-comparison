"""Bind the release owner's exact GO card; never flips the publication review."""
import argparse,datetime,hashlib,json,pathlib,subprocess
p=argparse.ArgumentParser();p.add_argument('--card',type=int,required=True);p.add_argument('--selection',required=True);p.add_argument('--recorded-at',required=True);p.add_argument('--go-quote',required=True);a=p.parse_args()
assert a.card>0 and a.selection.strip() and a.go_quote.strip() and a.recorded_at.endswith('Z'),'Actual approval details required'
datetime.datetime.fromisoformat(a.recorded_at.replace('Z','+00:00'))
J=pathlib.Path(__file__).resolve().parent;sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
d={'artifact_sha256':sha(J.parents[1]/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json'),'status':'GO','top_five_effect':'changed','card':a.card,'selection':a.selection,'recorded_at':a.recorded_at,'go_quote':a.go_quote,'preview_sha256':sha(J/'preview/manifest.json'),'comparison_sha256':sha(J/'receipts/topfive-diff.json')}
W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';MP=D/'jevbench-v1.8.0-publication.json';PP=D/'jevbench-v1.8.0-proof.json'
manifest=json.loads(MP.read_text());proof=json.loads(PP.read_text());preview=json.loads((J/'preview/manifest.json').read_text());comparison=json.loads((J/'receipts/topfive-diff.json').read_text())
for f in manifest['files'].values():assert sha(W/f['path'])==f['sha256'],'Artifact changed; rebuild/review first'
assert preview['results_sha256']==d['artifact_sha256']==comparison['candidate_results_sha256'],'Preview or comparison belongs to different results'
assert proof['top_five_comparison']['receipt_sha256']==d['comparison_sha256'],'Proof comparison differs'
(J/'inputs/approval.json').write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
proof['publication_approval']=d;PP.write_text(json.dumps(proof,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
manifest['files']['proof']['sha256']=sha(PP);manifest['review']={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None};MP.write_text(json.dumps(manifest,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
subprocess.run(['python3','-B',str(J/'make_lib_v180.py')],check=True)
assert sha(D/'jevbench-v1.8.0-results.json')==d['artifact_sha256'],'Results must remain byte-identical to the preview'
print('Approval filled and bound to exact previewed results; publication review remains PENDING. No score re-run or flip.')
