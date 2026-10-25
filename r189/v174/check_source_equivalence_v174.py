"""Verify the reviewed-text field has the same scoring inputs as the scored field."""
import pathlib,json,hashlib
I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');J=pathlib.Path(__file__).resolve().parent;a=I/'field-r12a';b=I/'field-r12a2';L=lambda p:json.loads(p.read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
ma=L(a/'BUILD-META.json');mb=L(b/'BUILD-META.json')
assert {k:v for k,v in ma.items() if k!='entries'}=={k:v for k,v in mb.items() if k!='entries'},'scoring metadata differs'
ra=L(a/'REGISTRY.json');rb=L(b/'REGISTRY.json');assert list(ra)==list(rb)
prose={'disclosure','code_revision','cost_basis','endpoint_condition'}
changes={k:sorted(f for f in set(ra[k])|set(rb[k]) if ra[k].get(f)!=rb[k].get(f)) for k in ra if ra[k]!=rb[k]};assert all(set(fs)<=prose for fs in changes.values()),changes
pa=sorted(p.name for p in (a/'runs').iterdir());pb=sorted(p.name for p in (b/'runs').iterdir());assert pa==pb
pins={}
for n in pa:
 x=a/'runs'/n;y=b/'runs'/n;sa=sha(x);sb=sha(y);assert sa==sb,n;pins[n]=sa
result={'status':'PASS','scoring_metadata_equal_except_entry_source':True,'registry_order_and_all_nonprose_fields_equal':True,'registry_changed_prose_fields':changes,'runs':len(pins),'all_run_bytes_identical':True,'run_sha256':pins,'source_registry_sha256':sha(a/'REGISTRY.json'),'reviewed_registry_sha256':sha(b/'REGISTRY.json'),'note':'field-r12a2 has no scored output directories. Every scorer run input and every nonprose registry field is identical to field-r12a; registry key order is identical. Old scored numeric aggregates remain valid for the reviewed-text candidate; no rescoring or inference performed.'}
(J/'receipts/SOURCE-EQUIVALENCE.json').write_text(json.dumps(result,indent=1,sort_keys=True)+'\n');print('PASS',len(pins),'run files identical; registry scoring fields/order equal; prose-only changes:',changes)
