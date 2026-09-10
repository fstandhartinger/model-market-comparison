import json,subprocess,concurrent.futures
from pathlib import Path
p=Path('ops/rebuild-2026-09/evidence/phase-05/public-review');manifest=json.load(open(p/'manifest.json'));task='Review the complete numbered rows in this frozen evidence packet. Return the exact typed JSON contract and all checked row indices.'
def run(x):
 out=p/(x['artifact_id']+'-review.json');log=out.with_suffix('.log')
 if out.exists():return
 cmd=['bash','ops/rebuild-2026-09/bin/worker.sh','--critic','--producer','openai/gpt-6-astra','--model','google/gemini-3.7-flash','--file',x['packet_file'],'--out',str(out),'--max-tokens','16000',task]
 with log.open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
 print(x['artifact_id'],r.returncode,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:list(ex.map(run,manifest))
(p/'task.txt').write_text(task)
