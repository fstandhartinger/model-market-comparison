import pathlib,json
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';L=lambda n:json.loads((R/n).read_text())
def lists(x):
 out={}
 for scope,groups in x['full_rankings'].items():
  for group,metrics in groups.items():
   for m,rows in metrics.items():out[f'{scope}/{group}/{m}']=[r['key'] for r in rows]
 for m,rows in x['release_lists'].items():out['release/'+m]=rows
 return out
b=lists(L('topfive-before.json'));a=lists(L('topfive-after.json'));assert len(a)==len(b)==40 and a.keys()==b.keys()
changed=[k for k in a if a[k]!=b[k]];assert not changed
(R/'CHANGED-LISTS.json').write_text(json.dumps({'status':'PASS','full_assembled_lists':40,'changed_lists_count':0,'changed':changed},indent=1)+'\n');print('PASS 0/40 complete assembled order lists changed (not only top five)')
