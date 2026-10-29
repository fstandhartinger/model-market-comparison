import pathlib,json,re
from rows_v1722 import KEY,NOT_RANKED_BECAUSE
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text());a=L(V/'jevbench-v1.7.22-results.json');s=next(s for s in a['systems'] if s['key']==KEY);b=L(V/'jevbench-v1.7.21-results.json');p=next(s for s in b['systems'] if s['key']=='strike-1')
assert s['not_ranked_because']==NOT_RANKED_BECAUSE==p['not_ranked_because'] and 'weaker than this row' not in s['not_ranked_because']
texts=[s[f] for f in ['display','author','disclosure','endpoint_condition']]+[s['cost']['basis']]
for t in texts:assert not re.search(r'/home/|workers/|#\d{4,}|Florian|\bPREREG\b|custody|deputy|release.owner|\{[A-Z_]+\}',t,re.I)
assert a['source_note']=='Added Umpire 35B-A3B (self-hosted) on the 27 Oct regular draw, shown unranked.'
for t in ['ornith-ai/Ornith-1.5-35B-A3B',"author's unchanged Transformers server",'16,384-token input limit','scored as misses and kept in the denominator','output tokens reported as 0','49 of 50','training data were not inspected','Apache-2.0','CC BY-NC 4.0','dequantized','KERNEL PATH','disposable rented pod']:assert t in s['disclosure'],t
assert s['cost']['basis'].count('COST FIGURES:')==1
assert 'state_tokens' not in s['disclosure'] and 'state_tokens' not in s['cost']['basis']
NEUTRAL="Stronger anchor runs are being measured; the draw is not yet equated to the reference scale."
def check_page(text):
 assert 'weaker than' not in text.lower() and 'Umpire 35B-A3B' in text
 assert NEUTRAL in text
page=(W/'app/jev-models/v1.7.22/page.tsx').read_text();check_page(page)
old="The draw's first anchor runs used models weaker than the draw's rows and stronger anchors are being measured, so the draw is not equated: its numbers are shown as published (offset 0) and no ranking or ranked order changes."
for bad in [page.replace(NEUTRAL,old),page.replace(NEUTRAL,NEUTRAL+' The anchors were weaker than Umpire 35B-A3B.')]:
 try:check_page(bad)
 except AssertionError:pass
 else:raise AssertionError('old weaker-than paraphrase accepted')
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','texts':len(texts),'exact_note':True,'all_disclosures':True,'no_cosmetic_state_tokens':True,'neutral_page_wording':True,'old_paraphrase_negatives':2},indent=1)+'\n');print('PASS exact history/note, all PREREG disclosures, no internal public text or cosmetic state_tokens disclosure')
