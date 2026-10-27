"""Fail-closed approval binding shared by release-owner dry-run helpers (flip, freeze)."""
import hashlib,json,os,pathlib
# JEV_FAIR_ROOT exists only for the synthetic .pass tree's dry runs; the default is the job directory.
JOB=pathlib.Path(os.environ.get('JEV_FAIR_ROOT','/home/flori/jobs/jevbench-add-requests-20260919'))
def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']=='GO (paid public fast-lane order, automatic publication)','paid public GO required'
 assert a['fresh_baseline']=='v1.7.12' and a['button_tap'] is False
 assert a['paid_public']=={'key':'h2o-lightning-4b-v1.4.1','order':'54575fd5','rule':'paid public automatic publication including top-five changes','visibility':'public'},'paid public rule binding'
 preview=W/a['top_five_preview']['path']
 assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 diff=json.loads(preview.read_text());assert not diff.get('bootstrap',False),'fresh complete top-five preview required'
 assert a['top_five_effect']==('changed' if diff['changed'] else 'unchanged'),'top-five effect must match the preview'
 if diff['changed']:
  fair=a['fairness_check']
  assert fair.get('path')=='workers/r197-v1713-fair/RESULT.json','fairness receipt path'
  assert fair.get('verdict')=='FAIR','REFUSED: fairness PENDING or non-FAIR; a bound FAIR verdict is required for a top-five change'
  fp=JOB/fair['path'];assert fp.is_file() and sha(fp)==fair.get('sha256'),'fairness receipt missing or changed'
  receipt=json.loads(fp.read_text());assert receipt.get('fairness',receipt.get('verdict'))=='FAIR','fairness receipt content must be FAIR'
 return a
