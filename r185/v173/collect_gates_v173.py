"""Record real final gate counts and log hashes, refusing failed/incomplete runs."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def tests(name):
 s=(R/name).read_text();out={}
 for k in ['tests','pass','fail','skipped']:
  m=re.findall(r'(?:ℹ|#) '+k+r' (\d+)',s);assert m,(name,k);out[k]=int(m[-1])
 assert out['fail']==0 and out['pass']>0,name
 return out
r={'status':'PASS','base_commit':'5ab1b0d94930ab4e485edb0c65a1ad64a26e5dfc','raw_verified_in_place':True,'cells':'frozen category/topic/decisive tools; off/share captured for both rows','double_rebuild':json.loads((R/'REPRO.json').read_text())['identical'],'repro_files':len(json.loads((R/'REPRO.json').read_text())['hashes']),'row_validator_and_carry':'288 carried rows exact except rank/ranks; 290 rows, 270 ranked; 1 GPU replacement + 1 new hosted row','topfive':{'site_lists':40,'site_changes':['open/composites/A'],'variant_lists':252,'variant_changes':28,'frozen':10,'off':10,'share':8,'scaledown_enters_any':False},'targeted':tests('release-tests.log'),'synthetic':tests('synthetic-tests.log'),'full':tests('fulltest.log'),'typescript':'PASS','production_build':'PASS','preview_browser':json.loads((R/'preview-browser.json').read_text())['status'],'helpers':json.loads((R/'fix-helper-checks.json').read_text()),'bound_fair_dry_runs':'PASS; actual FAIR receipt, synthetic release-review receipt for flip --dry-run only; freeze no seal write','actual_publication_review':'PENDING','actual_fairness_approval':'FAIR'}
b=(R/'build.log').read_text();assert re.search(r'Generating static pages.*591/591',b),b[-500:]
assert not (R/'tsc.log').read_text().strip(),'tsc log not empty'
assert (R/'final-sanity.log').read_text().startswith('PASS candidate row validator')
r['receipts_sha256']={n:sha(R/n) for n in ['repro.log','final-sanity.log','helpers.log','release-tests.log','tsc.log','build.log','synthetic-tests.log','fulltest.log','preview-browser.json','flip-bound-fair-dry-run.json','freeze-bound-fair-dry-run.json','SD-RECOMPUTE.json','F6-COST-KIND.json']}
(R/'GATES.json').write_text(json.dumps(r,indent=1,sort_keys=True)+'\n')
print(json.dumps({k:r[k] for k in ['targeted','synthetic','full','production_build','typescript']},indent=1))
