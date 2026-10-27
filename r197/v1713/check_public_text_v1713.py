"""Public-text gate for every text v1.7.13 adds to the site: release page, history line, results label/notes/source note,
category note and the new row's public fields incl. its not-ranked reason. No internal ids, board numbers, order ids, roles,
'Florian', job/worker names, decision keys or file paths; the exact reason and history sentence must be present."""
import json,pathlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';K='h2o-lightning-4b-v1.4.1'
L=lambda p:json.loads(p.read_text())
BANNED=re.compile(r"/home/|workers/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|\br19\d\b|54575fd5|h2o141|v1713-|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\bPREREG\b|(?-i:DECISIONS)|\{[A-Za-z_][A-Za-z0-9_]*\}",re.I)
HIST="First release on the 27 Oct regular draw: H2O-Lightning-4B v1.4.1 (paid evaluation), shown unranked until the draw's anchor runs are complete."
REASON=L(J/'receipts/NEW-ROW-SPEC.json')[K]['not_ranked_because']
WANT=("Measured on the 27 Oct 2026 draw, which has no anchor runs yet, so its scores are not yet on the reference scale. This draw differs strongly from earlier draws (72% multilingual items). "
      "On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1; its higher overall Intelligence comes from this draw's sealed items. Shown unranked until the draw's anchor runs are complete.")
assert REASON==WANT,'exact public explanation'
res=L(V/'jevbench-v1.7.13-results.json');cat=L(V/'jevbench-v1.7.13-categories.json');row=next(s for s in res['systems'] if s['key']==K)
page=(W/'app/jev-models/v1.7.13/page.tsx').read_text();page_text=' '.join(re.findall(r">([^<>{}]+)<",page))+' '+' '.join(re.findall(r"(?:title|description):'([^']*)'",page))
rel=next(l for l in (W/'lib/jevbench-releases.mjs').read_text().splitlines() if "version: 'v1.7.13'" in l)
texts={'page':page_text,'history_line':rel,'label':res['label'],'source_note':res['source_note'],'new_measurement_note':res['measurement_notes'][-1],'categories_note':cat['results_sha256_note'],
 **{'row.'+f:str(row.get(f) or '') for f in ['display','author','licence','disclosure','code_revision','endpoint_condition','not_ranked_because']},'row.cost.basis':row['cost']['basis']}
hits={n:m.group() for n,t in texts.items() if (m:=BANNED.search(t))}
assert not hits,('internal public text',hits)
assert res['source_note']==HIST and HIST.replace("'","\\'") in rel and HIST.replace("'","&apos;") in page and REASON in res['measurement_notes'][-1]
for frag in ['711,020','944,694','5 items','RTX PRO 6000','overlay','shim']:assert frag in row['disclosure']+row['cost']['basis']+row['code_revision']+row['endpoint_condition'],frag
assert 'no topic' in res['measurement_notes'][-1] and 'no topic labels' in cat['results_sha256_note']
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','checked':sorted(texts),'banned_pattern':BANNED.pattern,'exact_reason':True,'exact_history_sentence':True,'disclosures_kept':['processed 711,020 vs untrimmed 944,694 input','5 trimmed items','RTX PRO 6000 device','vLLM overlay + shim','no topic cells']},indent=1,sort_keys=True)+'\n')
print('PASS public text:',len(texts),'texts clean; exact reason and history sentence present; builder disclosures kept')
