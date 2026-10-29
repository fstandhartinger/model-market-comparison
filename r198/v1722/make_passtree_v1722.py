import pathlib,subprocess,json,hashlib,argparse,shutil
ap=argparse.ArgumentParser();ap.add_argument('--v1722',choices=['pass','pending','absent'],default='pass');ap.add_argument('--out');a=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=pathlib.Path(a.out).resolve() if a.out else J/'.pass'
subprocess.run(['python3','-B',str(W/'r198/v1721/make_passtree_v1721.py'),'--out',str(P)],check=True,capture_output=True)
D=P/'data/raw/benchmarks/jevbench/v1.7';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
q=D/'jevbench-v1.7.22-proof.json';pr=json.loads(q.read_text());pr['predecessor']['publication_sha256']=sha(D/'jevbench-v1.7.21-publication.json');put(q,pr)
m=D/'jevbench-v1.7.22-publication.json';md=json.loads(m.read_text());original=md['files']['proof']['sha256'];md['predecessor']=pr['predecessor'];md['files']['proof']['sha256']=sha(q)
if a.v1722=='pass':md['review']={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64}
put(m,md)
lp=P/'lib/jevbench-v1722-release.mjs';s=lp.read_text().replace(original,md['files']['proof']['sha256']);realpr=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-proof.json').read_text());s=s.replace(realpr['predecessor']['publication_sha256'],pr['predecessor']['publication_sha256']);lp.write_text(s)
if a.v1722=='absent':
 for f in D.glob('jevbench-v1.7.22-*.json'):f.unlink()
swap=[]
for root in ['lib','data/raw/benchmarks/jevbench/v1.7']:
 for f in sorted((P/root).iterdir()):
  rel=f.relative_to(P);w=W/rel
  if f.is_file() and (not w.exists() or w.read_bytes()!=f.read_bytes()):swap.append(str(rel))
(P/'SWAP-FILES.txt').write_text('\n'.join(swap)+'\n');print('synthetic',a.v1722,'fixture:',len(swap),'bindings')
