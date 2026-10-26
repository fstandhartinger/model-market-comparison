"""Bind standing no-top-five-change approval to a fresh full comparison."""
import hashlib,json

def check_approval(W,proof):
 a=proof['publication_approval'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 assert a['status']=='GO (standing, no top-five change)' and a['top_five_effect']=='none'
 old=json.loads((W/'r185/v172/inputs/APPROVAL.json').read_text());assert a['go']==old['go'] and a['button_tap'] is False and a['fresh_baseline']=='v1.7.6'
 p=W/a['top_five_preview']['path'];assert sha(p)==a['top_five_preview']['sha256']==proof['topfive_diff_sha256']
 d=json.loads(p.read_text());assert d['changed'] is False and d['lists']==580 and d['slider_changed_states']==0 and d['explicit_slider_grid_changed']==0 and d['custom_changed_labels']==[] and not d.get('bootstrap')
 assert {x['key'] for x in a['asks']}=={'d1a-gemma4-e4b','d1a-gemma4-e2b'}
 return a
