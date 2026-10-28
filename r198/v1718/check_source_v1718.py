import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];pins=json.loads((J/'inputs/SOURCE-PINS.json').read_text());checked={}
for name,expected in pins.items():
 p=pathlib.Path(name)
 assert str(p).startswith('/home/flori/jobs/jevbench-auto-intake/r24-score/') and p.suffix=='.json' and 'sealed' not in str(p) and '.raw.' not in str(p)
 actual=hashlib.sha256(p.read_bytes()).hexdigest();assert actual==expected,name;checked[name]=actual
V=W/'data/raw/benchmarks/jevbench/v1.7';prev=json.loads((V/'jevbench-v1.7.17-proof.json').read_text())
H=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness')
for k in ['score_v16','score_v17']:
 assert hashlib.sha256(({'score_v16':pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py'),'score_v17':pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer/score_v17.py')}[k]).read_bytes()).hexdigest()==prev['scorers'][k]
assert hashlib.sha256((H/'pricing_v15.py').read_bytes()).hexdigest()=='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
(J/'receipts/SOURCE-RECHECK-BUILD2.json').write_text(json.dumps({'status':'PASS','source_count':len(checked),'checked':checked,'scorers_equal_predecessor':True,'pricing_pin_exact':True,'raw_or_sealed_reads':False},indent=1)+'\n')
print('PASS',len(checked),'retained aggregate source pins, current scorer and pricing module pins; no raw/sealed reads')
