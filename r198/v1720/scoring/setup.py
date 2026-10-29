import pathlib,json,hashlib,importlib.util
J=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');F=J/'r198/v1720/score/field';F.mkdir(parents=True,exist_ok=True);(F/'runs').mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
p=J/'r110/private-lychee/runs/lychee_27b.jsonl';assert sha(p)=='692e430e1df69ded64c52022b2dff8697e001f106a2d4bd458fba15702242670'
receipt=pathlib.Path('/home/flori/jobs/fastlane-lychee27b-native-20261013/handoff/lychee_27b/lychee_27b.jsonl');assert sha(receipt)==sha(p)
e=json.loads((J/'r110/private-lychee/REGISTRY-PRIVATE.json').read_text())['lychee_27b'];P=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert sha(P)=='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
spec=importlib.util.spec_from_file_location('pricing',P);pr=importlib.util.module_from_spec(spec);spec.loader.exec_module(pr);ref=pr.reference('lychee-27b',e,pr.catalog_rates());assert tuple(ref[1])==(.42,3.)
e.update(measured_on='2026-10-13',price_in_per_m=.42,price_out_per_m=3.,ranked=True)
q=F/'runs/lychee-27b.jsonl'
if not q.exists():q.symlink_to(p)
(F/'REGISTRY.json').write_text(json.dumps({'lychee-27b':e},indent=1,sort_keys=True)+'\n')
(F.parent/'SETUP.json').write_text(json.dumps({'raw_sha256':sha(p),'handoff_raw_sha256':sha(receipt),'pricing_sha256':sha(P),'reference':ref},indent=1)+'\n')
print('PASS raw sha matches original handoff; frozen Qwen reference 0.42/3.00')
