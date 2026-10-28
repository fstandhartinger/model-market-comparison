"""Fail-closed approval binding shared by release-owner dry-run helpers (flip, freeze).
v1.7.14 ships all five new rows UNRANKED (decision v1713-h2o141-unranked-provisional, Florian card #18781 "Unranked": the same
treatment applies to the other rows on that draw): the standing GO covers it only while the complete top-five comparison shows no
changed list. No fairness receipt is bound (the rows enter no ranking)."""
import hashlib,json,pathlib
STATUS='GO (standing; no top-five change; paid public order for Torchcast)'
KEYS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think','jeff_1_1_large','jeff_1_1_qwen_4b','torchcast-decision-31b-v1.0']
def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']==STATUS,'standing GO (no top-five change) required'
 assert a['fresh_baseline']=='v1.7.13' and a['button_tap'] is False
 assert a['paid_public']=={'key':'torchcast-decision-31b-v1.0','order':'69f7a75d','rule':'paid public order: published with all measured values, unranked while its draw is not yet equated; no top-five change','visibility':'public'},'paid public rule binding'
 assert a['unranked_basis']['decision']=='v1713-h2o141-unranked-provisional' and a['unranked_basis']['card']=='#18781','unranked basis'
 preview=W/a['top_five_preview']['path']
 assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 diff=json.loads(preview.read_text());assert not diff.get('bootstrap',False),'fresh complete top-five preview required'
 assert diff['changed'] is False and diff['changed_lists']==0 and diff['slider_changed_states']==0 and not diff['custom_changed_labels'] and diff['explicit_slider_grid_changed']==0,'REFUSED: a top-five list changes; the standing GO covers no top-five change'
 assert a['top_five_effect']=='unchanged','top-five effect must be unchanged'
 assert sorted(proof['new_rows'])==KEYS,'exact new-row set'
 for k in proof['new_rows']:assert proof['new_rows'][k]['treatment']=='unranked','every new row must be unranked'
 return a
