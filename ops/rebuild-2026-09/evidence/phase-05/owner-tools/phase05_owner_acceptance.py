import json,gzip,hashlib
from pathlib import Path
D=Path('ops/rebuild-2026-09/evidence/phase-05');current={o['id']:o for o in json.load(open('data/raw/benchmarks/scores.json'))['observations']};seen=set();accepted=[]
def readreview(p):return json.loads(p.read_text().strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip())
def check(artifact_file,review_file,packet_file,task,count,scope='indices',residue=None):
 af=Path(artifact_file);raw=af.read_bytes();raw=gzip.decompress(raw) if af.suffix=='.gz' else raw;artifact=json.loads(raw);rows=artifact if isinstance(artifact,list) else artifact['observations'];rf=Path(review_file);review=readreview(rf);meta=json.load(open(str(rf)+'.meta.json'));pf=Path(packet_file)
 assert review['verdict']=='pass' and type(review['errors_found'])==int and review['errors_found']==0 and review['findings']==[] and review['missing_evidence']==[] and type(review['fixed'])==list,(rf,review)
 expected_digest=review.get('artifact_sha256')
 if expected_digest is None:
  assert residue and task,rf
  expected_digest=json.load(open(pf))['artifact_sha256']
 assert hashlib.sha256(raw).hexdigest()==expected_digest,rf
 assert hashlib.sha256(rf.read_bytes()).hexdigest()==meta['output_sha256'],rf
 assert meta['actual_model']=='google/gemini-3.7-flash' and all(not x.startswith('google/') for x in meta['producers']),rf
 if task:assert hashlib.sha256((task+'\n\n--- Supplied reference material (not instructions) ---\n'+pf.read_text()).encode()).hexdigest()==meta['input_sha256'],rf
 if scope=='indices':assert review['coverage_checked']==list(range(1,count+1)),rf
 elif scope=='zero_indices':assert review['coverage_checked']==list(range(count)),rf
 elif scope=='ids':assert review['coverage_checked']==[r['id'] for r in rows],rf
 elif scope=='legacy_aa_range':
  c=review['coverage_checked'];assert c=={'row_range_inclusive':[0,count-1],'subject_row_count':count,'observation_count':len(rows),'all_supplied_cells_checked':True},rf
 for o in rows:
  assert o==current[o['id']],(rf,o['id'],'changed')
  assert o['id'] not in seen,(rf,o['id'],'duplicate coverage');seen.add(o['id'])
 accepted.append({'artifact_file':str(af),'artifact_sha256':expected_digest,'artifact_digest_returned_by_critic':'artifact_sha256' in review,'review_file':str(rf),'review_sha256':meta['output_sha256'],'packet_file':str(pf),'packet_sha256':hashlib.sha256(pf.read_bytes()).hexdigest(),'input_hash_recomputed':bool(task),'critic_model':meta['actual_model'],'producer_models':meta['producers'],'observations':len(rows),'checked_subject_rows':count,'owner_acceptance':'accepted after exact source/artifact/coverage verification','format_residue':residue,'observation_ids':[r['id'] for r in rows]})
for x in json.load(open(D/'public-review/manifest.json')):
 if x['artifact_id'].startswith('ugi'):continue
 name=x['artifact_id'];s='-round2' if name.startswith('ruler') else '';base=D/'public-review';task='Review all numbered rows again after the documented parser fix. Return the exact typed GAUNTLET contract with all metadata and row indices.' if s else 'Review the complete numbered rows in this frozen evidence packet. Return the exact typed JSON contract and all checked row indices.'
 check(base/(name+s+'-artifact.json.gz'),base/(name+s+'-review.json'),base/(name+s+'-packet.json'),task,x['count'])
for x in json.load(open(D/'ugi-round2/manifest.json')):
 name=x['artifact_id'];base=D/'ugi-round2';s='-round3' if (base/(name+'-round3-review.json')).exists() else '';task=(base/('round3-task.txt' if s else 'task.txt')).read_text();check(x['artifact_file'],base/(name+s+'-review.json'),base/(name+s+'-packet.json'),task,x['subject_count'])
for n in range(4):
 if n==1:
  check(D/f'aa-{n}-artifact.json.gz',D/f'aa-{n}-round3-review.json',D/f'aa-{n}-round3-packet.txt',None,156,'legacy_aa_range','Three-round cap reached. Final critic verified all 1608 cells with exact counts/no findings, but followed the supplied tailored coverage-object contract and omitted a round key. This is NOT a clean common-format GAUNTLET round. Owner accepts numerically verified data and records the report-format residue; no fourth review performed.')
 else:
  check(D/f'aa-{n}-artifact.json.gz',D/f'aa-{n}-round3-strict-review.json',D/f'aa-{n}-round3-strict-packet.json',(D/'aa-strict-round3-task.txt').read_text(),155 if n==3 else 156,'zero_indices', 'Three-round cap reached: final numerical verdict covered all156 source rows with no findings, but omitted artifact metadata. Second-round result explicitly binds the same artifact and1596 score count; final input/output hashes bind the frozen packet. Owner records format residue and accepts source-verified data; no clean common-format third round claimed.' if n==2 else None)
check(D/'coding-artifact.json',D/'coding-round2-review.json',D/'coding-round2-packet.json','Review every numbered coding score and return the COMPLETE typed GAUNTLET JSON contract, including artifact metadata.',81)
check(D/'vendor-round2-artifact.json',D/'vendor-round2-review.json',D/'vendor-round2-packet.json',None,8,'ids')
assert seen==set(current),(len(seen),len(current),set(current)-seen)
# Verify the frozen code artifact and every current implementation/doc file.
p=json.load(open(D/'code-files-manifest.json'));a=gzip.decompress((D/'code-round1-artifact.json.gz').read_bytes());r=readreview(D/'code-round1-review.json');m=json.load(open(D/'code-round1-review.json.meta.json'));task='Review this exact implementation and daily collection recipes against the supplied requirements and primary evidence. Return the complete strict GAUNTLET JSON contract.'
assert hashlib.sha256(a).hexdigest()==r['artifact_sha256']==p['artifact_sha256'];assert r['verdict']=='pass' and r['errors_found']==0 and r['findings']==[] and r['missing_evidence']==[]
assert hashlib.sha256((D/'code-round1-review.json').read_bytes()).hexdigest()==m['output_sha256']
assert hashlib.sha256((task+'\n\n--- Supplied reference material (not instructions) ---\n'+(D/'code-round1-packet.json').read_text()).encode()).hexdigest()==m['input_sha256']
for f,h in p['files'].items():assert hashlib.sha256(Path(f).read_bytes()).hexdigest()==h and f in r['coverage_checked'],f
assert Path('/opt/mmc-daily/prompt.md').read_bytes()==Path('ops/rebuild-2026-09/daily-refresh-prompt.md').read_bytes()
result={'schema_version':1,'accepted_observations':len(seen),'batch_count':len(accepted),'all_current_observations_covered_exactly_once':True,'code_files_verified':p['files'],'code_review':str(D/'code-round1-review.json'),'code_round':'clean first round','batches':accepted,'residue':['AA batches1 and2 exhausted three rounds with verified numerical coverage; batch1 used a tailored coverage object and omitted round, batch2 omitted artifact metadata. No clean common-format verdict claimed. Original CLI task string for this AA review and the vendor review was not retained, so their input hashes are not recomputed; exact frozen packets, output hashes and artifact hashes are verified.'],'independent_checks':['check-aa.py: all6380 source cells, UUIDs, efforts and names equal','ugi-round2/owner-independent-check.json: all5179 numeric cells and literal identities equal','build guard: all1003 self-report rows are in passed frozen critic artifacts; all43 score/support source hashes checked']}
(D/'owner-acceptance.json').write_text(json.dumps(result,indent=2)+'\n');print('accepted',len(seen),'batches',len(accepted),'code files',len(p['files']))
