"""Fail-closed approval binding shared by release-owner dry-run helpers (flip, freeze).
v1.7.15 (unranked variant) adds Microsoft-Decision-1 round 2 UNRANKED on the 27 Oct draw and replaces the draw rows' public note
(decision d1027-strong-anchors-needed: the equated candidate's fairness review was SUSPICIOUS, so the draw stays unequated and its rows
unranked). The standing GO covers it only while the complete top-five comparison shows no changed list. No fairness receipt is bound
(no row enters a ranking)."""
import hashlib,json,pathlib
STATUS='GO (standing; no top-five change; paid public order)'
KEYS=['microsoft-decision-1-r2']
DRAW_ROWS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think','h2o-lightning-4b-v1.4.1','jeff_1_1_large','jeff_1_1_qwen_4b','torchcast-decision-31b-v1.0']
def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']==STATUS,'standing GO (no top-five change) required'
 assert a['fresh_baseline']=='v1.7.14' and a['button_tap'] is False
 assert a['paid_public']=={'key':'microsoft-decision-1-r2','order':'d2b677de','rule':'paid public order: published with all measured values, unranked while its draw has no strong anchors; no top-five change','visibility':'public'},'paid public rule binding'
 assert a['unranked_basis']['decision']=='d1027-strong-anchors-needed' and a['unranked_basis']['card']=='#18781','unranked basis'
 assert a['cost_basis']=={'decision':'msft-r2-cost-basis-tariff','key':'microsoft-decision-1-r2'},'cost basis'
 assert 'fairness_check' not in a and 'equating_basis' not in a,'no equating in the unranked variant'
 preview=W/a['top_five_preview']['path']
 assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 diff=json.loads(preview.read_text());assert not diff.get('bootstrap',False),'fresh complete top-five preview required'
 assert diff['changed'] is False and diff['changed_lists']==0 and diff['slider_changed_states']==0 and not diff['custom_changed_labels'] and diff['explicit_slider_grid_changed']==0,'REFUSED: a top-five list changes; the standing GO covers no top-five change'
 assert a['top_five_effect']=='unchanged','top-five effect must be unchanged'
 assert sorted(proof['new_rows'])==KEYS,'exact new-row set'
 for k in proof['new_rows']:assert proof['new_rows'][k]['treatment']=='unranked','every new row must be unranked'
 assert sorted(proof['exceptions'])==DRAW_ROWS and all(sorted(v)==['not_ranked_because'] for v in proof['exceptions'].values()),'only the draw rows\' note may change'
 assert proof['same_draw']['status']=='anchor-runs-pending' and proof['same_draw']['offset']=={'C':0,'I':0},'draw must stay unequated'
 return a
