"""CR-281: offline replay of the pinned local scorers; aggregates only, no inference."""
import hashlib,json,subprocess,tempfile
from pathlib import Path
Z=Path('/home/flori/jobs/jevbench-add-requests-20260919/r45')
h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
load=lambda p:json.loads(Path(p).read_text())
report={}
with tempfile.TemporaryDirectory(prefix='cr281-offline-') as td:
 subprocess.run(['python3',str(Z/'score_a3_headlineA_r45.py'),'--keys','open-jev-zefan-27b-v1.1','--out',td,'--name','open-jev.json'],check=True,timeout=600)
 k='open-jev-zefan-27b-v1.1';again=load(Path(td)/'open-jev.json');stored=load(Z/'outputs/RESULTS-r45-A3-candidates-headlineA.json')
 assert again['rows'][k]==stored['rows'][k]
 assert again['rows'][k]['scores']==load(Z/'receipts/SCORES-R45.json')[k]
 report['open_jev']={'row_value_identical':True,'scores_r45_exact_match':True,'scorer_sha256':h(Z/'score_a3_headlineA_r45.py'),'stored_result_sha256':h(Z/'outputs/RESULTS-r45-A3-candidates-headlineA.json')}
(Path(__file__).parent/'RESCORE-RECEIPT.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
