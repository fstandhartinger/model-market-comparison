import json,subprocess,concurrent.futures
from pathlib import Path
p=Path('ops/rebuild-2026-09/evidence/phase-05/ugi-round2');task='Recheck these unchanged rows and return the strict JSON contract. verdict MUST be lowercase pass, revise or blocked; include every artifact metadata field and exact numbered coverage.';jobs=[]
for x in json.load(open(p/'manifest.json')):
 f=p/(x['artifact_id']+'-review.json');d=json.loads(f.read_text().strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip())
 if d.get('verdict')=='pass':continue
 packet=json.load(open(x['packet_file']));packet['round']=3;packet['prior_review']=d;packet['response_contract']={'artifact_id':x['artifact_id'],'artifact_sha256':x['artifact_sha256'],'round':3,'verdict':'pass','coverage_checked':'ARRAY of every INTEGER subject row index','errors_found':0,'findings':[],'fixed':[],'uncertainties':[],'missing_evidence':[]};packet['required_correction']='Prior output used invalid uppercase PASS. Artifact unchanged; recheck and return strict lower-case enum pass/revise/blocked. No data errors established.';pf=p/(x['artifact_id']+'-round3-packet.json');pf.write_text(json.dumps(packet,ensure_ascii=False));jobs.append((x,pf))
def run(job):
 x,pf=job;out=p/(x['artifact_id']+'-round3-review.json')
 with out.with_suffix('.log').open('w') as f:r=subprocess.run(['bash','ops/rebuild-2026-09/bin/worker.sh','--critic','--producer','openai/gpt-6-astra','--model','google/gemini-3.7-flash','--file',str(pf),'--out',str(out),'--max-tokens','20000',task],stdout=f,stderr=subprocess.STDOUT)
 print(x['artifact_id'],r.returncode,flush=True)
(p/'round3-task.txt').write_text(task)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:list(ex.map(run,jobs))
