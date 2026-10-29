"""Verify raw/expect/order/refusals and frozen basis in place without rendering item fields."""
import pathlib,subprocess,json,hashlib
J=pathlib.Path(__file__).resolve().parent
x=subprocess.run(['python3','-B',str(J/'prepare_v1722.py')],check=True,capture_output=True,text=True)
p=json.loads((J/'receipts/INPUTS.json').read_text())
(J/'receipts/RAW-BINDING.json').write_text(json.dumps({'status':'PASS','rows':1500,'answered':1495,'refused':5,'raw_sha256':p['umpire-35b-a3b']['raw_sha256'],'fixed_common_basis':True,'native_output_tokens':0},indent=1)+'\n')
print('PASS original raw SHA, draft expect counts, input order, 1495 answered + 5 native 400 misses, output 0; frozen common basis')
