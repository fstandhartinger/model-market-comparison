"""Independently verify each old/new public field and its two SHA256 pins."""
import hashlib,json,pathlib,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.7'
cs=json.loads((J/'receipts/TEXT-CHANGES.json').read_text());seen=set();cache={}
def get(v,p):
 for k in re.findall(r'[^.\[\]]+',p):v=v[int(k)] if isinstance(v,list) else v[k]
 return v
for c in cs:
 if c['path'].startswith(('lib/','data/jevbench-architecture.json:')):
  assert c['path'] not in seen;seen.add(c['path']);continue
 kind,field=c['path'].split('.',1)
 for version,key in [('v1.7.22','old'),('v1.7.23','new')]:
  if (version,kind) not in cache:cache[version,kind]=json.loads((D/f'jevbench-{version}-{kind}.json').read_text())
  v=get(cache[version,kind],field)
  assert v==c[key],c['path']
  assert hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False).encode()).hexdigest()==c['before_sha256' if key=='old' else 'after_sha256'],c['path']
 assert c['path'] not in seen;seen.add(c['path'])
site=json.loads((J/'receipts/SITE-TEXT-PROOF.json').read_text())['exceptions']
catalog=(W/'lib/jevbench-releases.mjs').read_text()
old_catalog=subprocess.check_output(['git','show','37f802767:lib/jevbench-releases.mjs'],cwd=W,text=True)
assert [c for c in cs if c['path'].startswith(('lib/','data/jevbench-architecture.json:'))]==site
old_arch=json.loads(subprocess.check_output(['git','show','37f802767:data/jevbench-architecture.json'],cwd=W,text=True))
for c in site:
 if c['path'].startswith('lib/'):
  assert c['old'] in old_catalog and c['old'] not in catalog and c['new'] in catalog
 else:
  ptr=c['path'].split(':/',1)[1].split('/');v=old_arch
  for key in ptr[:-1]:v=v[int(key)] if isinstance(v,list) else v[key]
  key=int(ptr[-1]) if isinstance(v,list) else ptr[-1];assert v[key]==c['old'];v[key]=c['new']
 for key,hashkey in [('old','before_sha256'),('new','after_sha256')]:
  assert hashlib.sha256(json.dumps(c[key],ensure_ascii=False).encode()).hexdigest()==c[hashkey]
assert old_arch==json.loads((W/'data/jevbench-architecture.json').read_text()),'unlisted architecture change'
changed=subprocess.check_output(['git','diff','--name-only','37f802767','--','data/raw/benchmarks/jevbench'],cwd=W,text=True).splitlines()
assert all(p.startswith('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.23-') for p in changed),'earlier release data changed: '+repr(changed)
assert json.loads((D/'jevbench-v1.7.23-publication.json').read_text())['review']['verdict']=='PENDING'
(J/'receipts/TEXT-PINS.json').write_text(json.dumps({'status':'PASS','exceptions':len(cs),'site_text_exceptions':len(site),'all_before_after_values_and_hashes_checked':True,'unique_field_paths':True,'earlier_release_data_byte_immutable':True,'base':'37f802767','real_manifest':'PENDING'},indent=1)+'\n')
print('PASS',len(cs),'unique field exceptions: all old/new values and SHA256 pins checked; prior release data byte-immutable')
