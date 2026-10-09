"""First-party public artifact scaffold, no I/O and no inference or publishing.
Root must attach authentic required category artifacts and source proof afterward.
"""
import copy,math,json,re
from pathlib import Path
TOP={'benchmark','revision','protocol','headline','types','tier_weights','sealed_share_of_intelligence','G_med','G_med_api_basis_P_vs_A','G_med_flag_gt10','options','views','bootstrap','n_ranked','board','systems','not_measured','roster_count','v16'}
DROP={'actual_completed_field_baseline'}
FORBIDDEN_KEYS={'actual_completed_field_baseline','fixed_roster','pending_roster','raw_path','raw_sha256','source_pins','task_id','item_id','opaque_id','opaque_ids','exclude_opaque_ids','candidate_exclude_opaque_ids','gold','gold_probs','gold_label','gold.jsonl','id_map','order_id','job_dir','path','receipt_path','input_body','state','question','labels'}
def safe(value):
 if isinstance(value,dict):
  for k,v in value.items():
   if not isinstance(k,str)or k in FORBIDDEN_KEYS or 'djev'in k.casefold():raise ValueError('private metadata key')
   safe(v)
 elif isinstance(value,list):
  for v in value:safe(v)
 elif isinstance(value,str):
  if any(p in value for p in('/home/','/custody/','/approval/','/output/','file://'))or 'djev'in value.casefold():raise ValueError('private path/category string')
 elif value is not None and not isinstance(value,(bool,int,float)):raise ValueError('unsupported public value')
 elif isinstance(value,float)and not math.isfinite(value):raise ValueError('nonfinite public value')
def schema_check(value,node):
 if isinstance(node,dict)and set(node)=={'__union__'}:
  for option in node['__union__']:
   try:schema_check(value,option);return
   except ValueError:pass
  raise ValueError('public schema type')
 if isinstance(node,dict):
  if not isinstance(value,dict)or set(value)-set(node):raise ValueError('unknown nested public field')
  for k,v in value.items():schema_check(v,node[k])
 elif isinstance(node,list):
  if not isinstance(value,list)or len(value)>128:raise ValueError('public aggregate array cap')
  for v in value:schema_check(v,node[0])
 elif node=='z':
  if value is not None:raise ValueError('public null')
 elif node=='b':
  if not isinstance(value,bool):raise ValueError('public boolean')
 elif node=='n':
  if isinstance(value,bool)or not isinstance(value,(int,float))or not math.isfinite(value):raise ValueError('public finite numeric field')
 elif node=='s':
  if not isinstance(value,str)or re.search(r'opaque[-_:]|(?:djev|item)[-_:]\d{4,}',value,re.I):raise ValueError('opaque item identifier in public text')
 else:raise ValueError('unexpected nonempty aggregate array')
def sanitize(result):
 if not isinstance(result,dict)or set(result)-TOP-DROP:raise ValueError('unknown result field')
 out={k:copy.deepcopy(v)for k,v in result.items()if k in TOP}
 if out.get('revision')!='v1.6.3'or out.get('protocol')!='jevbench::v1.6'or out.get('not_measured')!=[]or len(out.get('systems',[]))not in(5,6):raise ValueError('actual five/six completed addendum required')
 if out.get('bootstrap')!={'B':1000,'bootstrap_seed':16,'g_med_fixed':True}:raise ValueError('official bootstrap')
 for row in out['systems']:
  if row.get('status',{}).get('status')!='complete'or row['status'].get('rows')!=1500 or row['status'].get('missing')!=0 or row.get('full_coverage')is not True or row.get('v16',{}).get('n_items')!=1500:raise ValueError('actual complete rows')
  if row.get('cost',{}).get('common_basis',{}).get('n_items')!=1479:raise ValueError('actual cost basis')
 from cohort import completed_shape,NATIVE
 keys=[r['key']for r in out['systems']]
 if len(keys)!=len(set(keys)):raise ValueError('duplicate completed key')
 completed_shape(keys)
 if any(r.get('ranked')is not(r['key']in NATIVE)for r in out['systems']):raise ValueError('frozen ranking disposition')
 template=json.loads((Path(__file__).parent/'PUBLIC-SCHEMA-V162.json').read_text())
 schema_check(out,template['schema'])
 safe(out)
 return out
