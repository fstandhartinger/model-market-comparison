"""Fail-closed approval binding shared by release-owner dry-run helpers (flip, freeze).
v1.7.13 ships the new row UNRANKED (release-owner decision v1713-h2o141-unranked-provisional): the standing GO covers it only
while the complete top-five comparison shows no changed list. The fairness receipt (verdict SUSPICIOUS) stays bound as evidence."""
import hashlib,json,os,pathlib
# JEV_FAIR_ROOT exists only for the synthetic .pass tree's dry runs; the default is the job directory.
JOB=pathlib.Path(os.environ.get('JEV_FAIR_ROOT','/home/flori/jobs/jevbench-add-requests-20260919'))
STATUS='GO (standing; no top-five change; paid public order)'
def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']==STATUS,'standing GO (no top-five change) required'
 assert a['fresh_baseline']=='v1.7.12' and a['button_tap'] is False
 assert a['paid_public']=={'key':'h2o-lightning-4b-v1.4.1','order':'54575fd5','rule':'paid public order: published with all measured values, unranked while its draw has no anchor runs; no top-five change','visibility':'public'},'paid public rule binding'
 preview=W/a['top_five_preview']['path']
 assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 diff=json.loads(preview.read_text());assert not diff.get('bootstrap',False),'fresh complete top-five preview required'
 assert diff['changed'] is False and diff['changed_lists']==0 and diff['slider_changed_states']==0 and not diff['custom_changed_labels'] and diff['explicit_slider_grid_changed']==0,'REFUSED: a top-five list changes; the standing GO covers no top-five change'
 assert a['top_five_effect']=='unchanged','top-five effect must be unchanged'
 for k in proof['new_rows']:assert proof['new_rows'][k]['treatment']=='unranked','the new row must be unranked'
 fair=a['fairness_check']
 assert fair.get('path')=='workers/r197-v1713-fair/RESULT.json' and fair.get('verdict')=='SUSPICIOUS','fairness receipt path and verdict (SUSPICIOUS, handled by unranking)'
 fp=JOB/fair['path'];assert fp.is_file() and sha(fp)==fair.get('sha256'),'fairness receipt missing or changed'
 receipt=json.loads(fp.read_text());assert receipt.get('fairness',receipt.get('verdict'))=='SUSPICIOUS','fairness receipt content must match the recorded verdict'
 return a
