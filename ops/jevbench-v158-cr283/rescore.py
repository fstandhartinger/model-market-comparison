"""CR-283: bounded offline replay of all three modes, at API and base prices; no inference."""
import hashlib, json, subprocess, tempfile
from pathlib import Path
J=Path('/home/flori/jobs/wity-jevbench-results-20261003')
W=Path('/home/flori/jevbench-sealed/v1.5/scoring/wity-f65ce826a455-20261004')
SCORER=J/'run/score_wity_fresh.py'
BASE=Path('/home/flori/jevbench-sealed/v1.5/scoring/headline-A-20260927/RESULTS-v1.5.0.json')
h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
load=lambda p:json.loads(Path(p).read_text())
receipt=load(J/'receipts/WITY-f65ce826a455-RUN-RECEIPT.json')
report={}
with tempfile.TemporaryDirectory(prefix='cr283-offline-') as td:
 for mode in ['auto','always','off']:
  rec=receipt['modes'][mode]; report[mode]={}
  for price in ['api','base']:
   label=f'f65ce826a455-{mode}'
   stored_path=W/f'RESULTS-wity-1-{label}-{price}.json';stored=load(stored_path)
   assert h(stored_path)==rec[f'result_{price}_sha256']
   assert h(SCORER)==stored['scorer_sources_sha256']['score_wity_fresh.py']
   subprocess.run(['python3',str(SCORER),'--base',str(BASE),'--keys','wity-1','--raw',rec['output'],'--raw-sha',rec['output_sha256'],'--price-mode',price,'--label',label,'--out',td],check=True,timeout=600)
   replay=Path(td)/stored_path.name
   assert load(replay)==stored, (mode,price,'value mismatch')
   report[mode][price]={'value_identical':True,'byte_identical':h(replay)==h(stored_path),'scorer_sha256':h(SCORER),'stored_result_sha256':h(stored_path)}
   print(mode,price,'value identical; byte identical:',report[mode][price]['byte_identical'],flush=True)
(Path(__file__).parent/'RESCORE-RECEIPT.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
