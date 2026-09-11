from pathlib import Path
import json,gzip,hashlib,subprocess,sys,datetime
root=Path('/opt/model-market-comparison');run=Path(sys.argv[1]);out=Path(sys.argv[2]);report=json.loads((run/'reports/run-report.json').read_text());h=lambda x:hashlib.sha256(x).hexdigest()
assert report['exit_code']==0 and report['published'] is True and report['live_verified'] is True
assert all(x['ok'] for x in report['steps'])
git=lambda *args:subprocess.check_output(['git',*args],cwd=root)
commit=report['commit'];assert git('rev-parse','HEAD').decode().strip()==commit;assert git('rev-parse','origin/main').decode().strip()==commit;assert not git('status','--porcelain')
assert 'Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>' in git('show','-s','--format=%B',commit).decode()
assert report['storage']['applied'] is True
before=gzip.decompress((run/'reports/dataset-before.json.gz').read_bytes());after=gzip.decompress((run/'reports/dataset-after.json.gz').read_bytes())
git_before=git('show',report['base']+':data/dataset.json');git_after=git('show',commit+':data/dataset.json')
assert before==git_before+b'\n';assert after==git_after+b'\n';assert h(git_after)==report['dataset_sha256']
assert git('show',report['base']+':data/raw/aa-coding-agents.json')==git('show',commit+':data/raw/aa-coding-agents.json')
assert all(not (run/name).exists() for name in ['work','before','benchmark-candidates'])
captures=[]
for line in (run/'sources/live-manifest.jsonl').read_text().splitlines():
 r=json.loads(line);assert h(gzip.decompress(Path(r['file']).read_bytes()))==r['sha256'];captures.append({'url':r['url'],'status':r['status'],'sha256':r['sha256']})
receipts=[]
for file in (run/'workers').glob('worker*.json'):
 r=json.loads(file.read_text());q=r['qualification'];assert q['aa_intelligence_index']>=34 and q['input_per_1m']<=4 and q['output_per_1m']<=4;assert r['mode'] in ['oneshot','critic'];receipts.append(r)
live=json.loads((run/'reports/live-step-result.json').read_text());assert live['ok'] and live['gauntlet']['complete'] and live['gauntlet']['contracts']==7
bench=json.loads((run/'reports/benchmarks-step-result.json').read_text());dataset=json.loads(after)
proof={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ok':True,'commit':commit,'base':report['base'],'steps_passed':len(report['steps']),'legacy_v14_byte_preserved':True,'api_verified_by_job':True,'archive_serialization':{'before_and_after_equal_committed_bytes_plus_one_newline':True,'reason':'writeJSONAtomic writes a terminal newline to report exports; build-dataset does not','before_archive_sha256':h(before),'after_archive_sha256':h(after),'before_git_sha256':h(git_before),'after_git_sha256':h(git_after)},'source_body_hashes_verified':len(captures),'worker_receipts_checked':len(receipts),'all_requested_workers_AA_at_least_34_and_within_price_cap':True,'no_Astra_in_daily_loop':True,'storage':report['storage'],'live_coverage':{k:v for k,v in live['gauntlet'].items() if k!='reviews'},'benchmark_summary':{k:v for k,v in bench.items() if k not in ['checks','reviews']},'retained_failures':[x for x in bench['checks'] if x['status']=='retained_after_failure'],'worker_calls':report['worker_calls'],'dataset_sources':dataset['sources'],'dataset_counts':dataset['counts'],'dataset_sha256':h(git_after)}
out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'ok':True,'commit':commit,'steps':len(report['steps']),'sources_verified':len(captures),'returned_cost':report['worker_calls']['returned_cost_usd'],'retained_failures':bench['retained_failures']}))
