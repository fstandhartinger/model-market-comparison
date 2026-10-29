"""Fail-closed standing-GO binding: text-only correction release; no score, cost, rank or row changes."""
import hashlib,json,pathlib
STATUS='GO (standing; no top-five change)'
def check_approval(W,proof):
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 a=proof['publication_approval']
 assert a['status']==STATUS and a['top_five_effect']=='unchanged' and a['fresh_baseline']=='v1.7.22','standing GO (no top-five change) required'
 t=proof['top_five_comparison'];assert t['base']=='v1.7.22' and t['lists']==580 and t['changed_lists']==0,'REFUSED: a top-five list changes'
 assert sha(W/'r198/v1723/receipts/topfive-diff.json')==t['receipt_sha256'],'top-five receipt bytes differ'
 d=json.loads((W/'r198/v1723/receipts/topfive-diff.json').read_text())
 assert d['changed'] is False and d['changed_lists']==0 and d['slider_changed_states']==0 and not d['custom_changed_labels'] and d['explicit_slider_grid_changed']==0
 for n in ['new_rows','remeasured_rows','repriced_rows']:assert proof[n]=={},n
 assert proof['exceptions'] and all(isinstance(c['old'],(str,type(None))) and isinstance(c['new'],str) for c in proof['exceptions']),'text-only exceptions'
 return a
