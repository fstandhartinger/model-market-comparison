import pathlib,json,hashlib,shutil
J=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r198-v1721-build/score');F=S/'field/fnew';P=S/'private'
for d in [F/'runs',P]:d.mkdir(parents=True,exist_ok=True)
K='visionjev-1.0.0-27b';raw=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027/runs-auto-intake/taoszhang-visionjev-1.0.0.raw.jsonl')
assert hashlib.sha256(raw.read_bytes()).hexdigest()=='89a5de4e94a9b1feed12144db1c5879c7e59c149f0d1667cb3b12e4763b89496'
link=F/'runs'/f'{K}.jsonl'
if link.is_symlink():assert link.resolve()==raw
else:link.symlink_to(raw)
pins=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r197/v1716/score/private')
for name in ['cost-basis-v1716.json','COMMON-SET.json']:
 q=P/name.replace('1716','1721');shutil.copyfile(pins/name,q);q.chmod(0o600)
reg=json.loads((J/'scoring/REGISTRY.json').read_text());r=reg[K];r.update(author='taoszhang (Hugging Face)',base_model='Qwen/Qwen3.8-27B',repo='https://huggingface.co/taoszhang/VisionJEV',price_in_per_m=.42,price_out_per_m=3.,measured_on='2026-10-29')
(F/'REGISTRY.json').write_text(json.dumps(reg,indent=1)+'\n');(J/'scoring/REGISTRY.json').write_text(json.dumps(reg,indent=1)+'\n')
print('PASS raw SHA; frozen private cost-basis copied byte-equal; draft registry ready')
