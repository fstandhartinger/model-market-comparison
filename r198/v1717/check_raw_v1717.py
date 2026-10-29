"""Recompute nine-raw set and new raw aggregate bindings, without rendering sealed fields."""
import pathlib,json,subprocess,hashlib,tempfile
J=pathlib.Path(__file__).resolve().parent;B=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');S=B/'r198/v1717/score';K='chaoliangunsw-jev-style-2b-decision-v4'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();L=lambda p:json.loads(p.read_text())
with tempfile.TemporaryDirectory(dir=S/'private') as td:
 x=subprocess.run(['python3','-I',str(S/'common_set_v1717.py'),td,str(B/'r197/v1716/score/PINS-EXTRA.json')],check=True,capture_output=True,text=True)
 cs=L(pathlib.Path(td)/'COMMON-SET.json');assert cs==L(S/'private/COMMON-SET.json')
# prepare is also strict about input order, preregistered refused-set hash, zero outputs, native probabilities and 1500 denominator.
x=subprocess.run(['python3','-B',str(J/'prepare_v1717.py')],check=True,capture_output=True,text=True)
(J/'receipts/RAW-BINDING.json').write_text(json.dumps({'status':'PASS','rows':1500,'answered':1495,'refused':5,'refused_set_sha256':'8d7957c3ee9da390b38a249dc2bc72db04fa26b185ce600beb1ffcb1aa47b543','raw_sha256':cs['rows'][K]['raw_sha256'],'nine_raw_set_recomputed':True,'native_output_tokens':0},indent=1)+'\n')
print('PASS raw pin/input order, 1495 answered + 5 pre-registered refusals, output 0; common set recomputed from 9 raws unchanged')
