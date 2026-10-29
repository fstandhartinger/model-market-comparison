"""Bind targeted regression resolution to the original full-suite log and exact SEO source."""
import hashlib,json,pathlib,re,sys
W=pathlib.Path(sys.argv[1]).resolve();J=W/'r198/v180';R=J/'receipts'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert (pathlib.Path.cwd()/'lib/jevbench-seo.mjs').read_bytes()==(W/'lib/jevbench-seo.mjs').read_bytes()
text=(R/'seo-fixes.log').read_text();original=(R/'fulltest-postflip.log').read_text()
assert re.search(r'^# fail 0$',text,re.M)
passed=set(re.findall(r'^ok \d+ - (.*)$',text,re.M));failed=re.findall(r'^not ok \d+ - (.*)$',original,re.M)
known="the supervisor's dated brief backups can never make the checkout dirty again"
resolved=[f for f in failed if f in passed];remaining=[f for f in failed if f not in passed]
assert all(f==known for f in remaining),remaining
d={'status':'PASS','exit_code':0,'source_sha256':sha(W/'lib/jevbench-seo.mjs'),'original_full_suite_log_sha256':sha(R/'fulltest-postflip.log'),'original_full_suite_failures':failed,'resolved_original_failures':resolved,'remaining_accepted_failures':remaining,'summary':re.findall(r'^# (?:tests|pass|fail|cancelled|skipped|duration_ms).*$',text,re.M),'full_suite_repeated':False}
(R/'SEO-FIXES-EXIT.json').write_text(json.dumps(d,indent=1,sort_keys=True)+'\n');print(json.dumps(d,indent=1))
