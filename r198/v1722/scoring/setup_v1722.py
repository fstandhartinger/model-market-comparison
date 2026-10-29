import pathlib,json,hashlib,shutil
J=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r198-v1722-build/score');F=S/'field/fnew';P=S/'private'
for d in [F/'runs',P]:d.mkdir(parents=True,exist_ok=True)
K='umpire-35b-a3b';raw=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027/runs-auto-intake/ezoushen-umpire-35b-a3b-bf16.raw.jsonl')
assert hashlib.sha256(raw.read_bytes()).hexdigest()=='d1568cc82b893339bc4b5bc21c49a036190851cfcd7d10cd2a343dab910711ad'
link=F/'runs'/f'{K}.jsonl'
if link.is_symlink():assert link.resolve()==raw
else:link.symlink_to(raw)
pins=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r197/v1716/score/private')
for name in ['cost-basis-v1716.json','COMMON-SET.json']:
 q=P/name.replace('1716','1722');shutil.copyfile(pins/name,q);q.chmod(0o600)
reg=json.loads((J/'scoring/REGISTRY.json').read_text());r=reg[K];r.update(author='ezoushen (Hugging Face)',base_model='ornith-ai/Ornith-1.5-35B-A3B',repo='https://huggingface.co/ezoushen/umpire-35b-a3b-bf16',price_in_per_m=.3125,price_out_per_m=1.25,measured_on='2026-10-29')
(F/'REGISTRY.json').write_text(json.dumps(reg,indent=1)+'\n');(J/'scoring/REGISTRY.json').write_text(json.dumps(reg,indent=1)+'\n')
print('PASS raw SHA; frozen private cost-basis copied byte-equal; draft registry ready')
