"""Fail-closed standing-GO binding: unranked Jev-Style-2B, unchanged nine-raw common set, no carried-row exceptions and no changed top-five lists."""
import hashlib,json,pathlib
STATUS='GO (standing; no top-five change)'
KEYS=['chaoliangunsw-jev-style-2b-decision-v4']
DRAW_ROWS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think','h2o-lightning-4b-v1.4.1','jeff_1_1_large','jeff_1_1_qwen_4b','microsoft-decision-1-r2','torchcast-decision-31b-v1.0']
COST_FIELDS={'axes','composite_ci95','cost','jevbench_score','scores','v16','views'}
def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']==STATUS,'standing GO (no top-five change) required'
 assert a['fresh_baseline']=='v1.7.16' and a['button_tap'] is False
 assert 'paid_public' not in a,'no paid row in this release'
 assert a['unranked_basis']['decision']=='d1027-strong-anchors-needed' and a['unranked_basis']['card']=='#18781','unranked basis'
 assert a['cost_basis']['key']=='v1.6-regular-20261027' and a['cost_basis']['decision'].startswith('same-items cost rule draw-wide on d1027'),'same-items cost basis'
 assert proof['cost_basis']['scorer_flag']=='--cost-basis' and proof['cost_basis']['n_items']==1489 and len(proof['cost_basis']['set_sha256'])==64,'common set binding'
 assert 'fairness_check' not in a and 'equating_basis' not in a,'no equating in the unranked variant'
 preview=W/a['top_five_preview']['path']
 assert sha(preview)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 diff=json.loads(preview.read_text());assert not diff.get('bootstrap',False),'fresh complete top-five preview required'
 assert diff['changed'] is False and diff['changed_lists']==0 and diff['slider_changed_states']==0 and not diff['custom_changed_labels'] and diff['explicit_slider_grid_changed']==0,'REFUSED: a top-five list changes; the standing GO covers no top-five change'
 assert a['top_five_effect']=='unchanged','top-five effect must be unchanged'
 assert sorted(proof['new_rows'])==KEYS,'exact new-row set'
 for k in proof['new_rows']:assert proof['new_rows'][k]['treatment']=='unranked','every new row must be unranked'
 assert proof['exceptions']=={} and proof['repriced_rows']=={} and proof['text_fixed_rows']==[], 'all carried rows must be equal'
 assert proof['same_draw']['status']=='anchor-runs-pending' and proof['same_draw']['offset']=={'C':0,'I':0},'draw must stay unequated'
 return a
