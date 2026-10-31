"""Verify actual saved visible DOM (not scripts) against the final artifact and unchanged production model TSX."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'visible-replay-preview';L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-results.json';s=next(s for s in L(a)['systems'] if s['key']=='granite-switch-4.1-8b');m=L(P/'manifest.json');text=(P/'visible-dom.txt').read_text();normal=' '.join(text.split())
assert m['results_sha256']==sha(a) and m['source_tsx_sha256']==sha(W/'app/jev-models/[system]/page.tsx')
assert f"Capability {s['capability']:.1f}" in normal and 'Not ranked in the current release' in normal
for label,k in [('Intelligence','intelligence'),('Calibration','calibration'),('Speed','speed'),('Cost','cost')]:assert f"{label} {s['axes'][k]:.1f}" in normal,(label,k)
assert f"Composite (secondary) {s['scores']['A']:.1f}" in normal
assert 'ibm-granite/granite-4.1-8b' in normal and 'Sibling estimate' in normal and '5 decisions over 10 s' in normal
for term in ['7 of 50','zero argmax flips','0.0312263773757529','5e-2','recorded only','not established','near-tie allowance','not a cross-backend equivalence claim']:assert term in normal,term
assert m['pages'][0]['visible_dom_sha256']==sha(P/'visible-dom.txt')  and m['pages'][0]['no_horizontal_overflow']
d=L(J/'receipts/VISIBLE-REPLAY-INSTRUMENTATION.json');assert d['status']=='VISIBLE_FACTS_VERIFIED_WITH_INSTRUMENTATION_AND_CLEANUP_WARNINGS' and d['page_errors_before_banner_assertion']==0 and d['helper_exit_code']==1
errors=m['pages'][0]['page_errors'];assert len(errors)==1 and hashlib.sha256(errors[0].encode()).hexdigest()==d['error_sha256'] and errors==d['post_injection_page_errors_preserved_in_raw_manifest']
r={'status':'PASS','source':'Actual saved visible DOM from one Next dev page on unchanged production TSX; not scripts or new production-build evidence','results_sha256':sha(a),'visible_dom_sha256':sha(P/'visible-dom.txt'),'capability':s['capability'],'axes':s['axes'],'composite_A':s['scores']['A'],'unranked_base_sibling_cost_and_ten_second_rule_visible':True,'all_replay_gate_facts_visible':True,'mandatory_final_queue_build_before_production':True,'evidence_warning_receipt':'receipts/VISIBLE-REPLAY-INSTRUMENTATION.json','end_to_end_helper_pass':False}
(J/'receipts/VISIBLE-REPLAY-DOM-SCORES.json').write_text(json.dumps(r,indent=1,sort_keys=True)+'\n');print('PASS actual visible DOM: final artifact scores/unranked/base/cost/time rule and all replay facts; unchanged production TSX')
