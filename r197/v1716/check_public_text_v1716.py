"""Public-text gate for every text v1.7.16 adds or changes on the site: release page, history line, results label/notes/source note,
category note, the new row's public fields, the re-costed basis text of every row on the 27 Oct draw (and Microsoft r2's ITEMS
sentence), the draw-table entry. No internal ids, board numbers, submission/kit ids, roles, 'Florian', job/worker names, decision keys
or file paths; ranking words only in the exact unranked sentences; exact history sentence and notes; the builder's disclosures (hosted
API EU, 5 over-limit refusals scored as misses, output 0, stated base, beta probabilities, topic-cell sentence) must survive."""
import json,pathlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text())
BANNED=re.compile(r"/home/|workers/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|\br65\b|\br19\d\b|9D88ECFA|\bkit\b|d2b677de|9cde338c|Anna|Roth|Gmail|h2o141|tc31b|d1027-|v171[3456]u?-|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\bPREREG\b|(?-i:DECISIONS)|\{[A-Za-z_][A-Za-z0-9_]*\}|\brank(?:ed|ing)?\b|top[- ](?:five|5)",re.I)
HIST="Added Strike-1 (hosted) on the 27 Oct regular draw, shown unranked; costs on that draw now use the items every row answered."
HEAD="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";TAIL="Shown unranked until then."
NOTE=HEAD+' '+TAIL
H2O='h2o-lightning-4b-v1.4.1';H2O_EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.'
TOPIC='This draw has no subject-topic labels yet, so the row has no topic cells'
res=L(V/'jevbench-v1.7.16-results.json');cat=L(V/'jevbench-v1.7.16-categories.json');by={s['key']:s for s in res['systems']}
K='strike-1';MS='microsoft-decision-1-r2';DK=sorted(res['addendum']['repriced_keys']+res['addendum']['new_keys']);assert len(DK)==8
page=(W/'app/jev-models/v1.7.16/page.tsx').read_text();page_text=' '.join(re.findall(r">([^<>{}]+)<",page))+' '+' '.join(re.findall(r"(?:title|description):'([^']*)'",page))
rel=next(l for l in (W/'lib/jevbench-releases.mjs').read_text().splitlines() if "version: 'v1.7.16'" in l)
texts={'page':page_text,'history_line':rel,'label':res['label'],'source_note':res['source_note'],'new_measurement_note':res['measurement_notes'][-1],'categories_note':cat['results_sha256_note'],
       'draw_table_entry':json.dumps(next(x for x in L(W/'data/jevbench-draw-equating.json')['draws'] if x['draw']=='v1.6-regular-20261027'))}
for k in DK:
 r=by[k];assert r['not_ranked_because']==HEAD+(' '+H2O_EXTRA if k==H2O else '')+' '+TAIL,(k,'exact public note')
 assert TOPIC in r['disclosure'],(k,'topic-cell sentence kept')
 assert 'listing_note' not in r and not re.search(r'equated to the reference scale with|anchor equating',r['disclosure']),(k,'no equated wording')
 texts[f'{k}.not_ranked_because']=r['not_ranked_because'];texts[f'{k}.cost.basis']=r['cost']['basis']
 assert re.search(r"Cost on the 1,489 items every row on this draw answered \(same-items rule\); all-items cost USD 0\.\d{6} per 1,000 decisions\.",r['cost']['basis']),(k,'same-items sentence')
texts[f'{MS}.disclosure']=by[MS]['disclosure']
n=by[K]
texts.update({f'{K}.{f}':str(n.get(f) or '') for f in ['display','author','disclosure','endpoint_condition']});texts[f'{K}.model_pin']=json.dumps(n['model_pin'])
# Ranking words are allowed only inside the exact unranked sentences.
ALLOWED=['unranked','NOT RANKED','no ranking or ranked order changes','No ranking or ranked order changes','No existing rank or ranking changed']
def strip(t):
 for x in ALLOWED:t=t.replace(x,'')
 return t
hits={nm:m.group() for nm,t in texts.items() if (m:=BANNED.search(strip(t)))}
assert not hits,('internal public text',hits)
assert res['source_note']==HIST and HIST.replace("'","\\'") in rel and HIST.replace("'","&apos;") in page and res['measurement_notes'][-1].startswith(HIST) and NOTE in res['measurement_notes'][-1]
assert res['label']=='JevBench v1.7.16: Strike-1 on the 27 Oct regular draw; same-items cost on that draw'
assert n['display']=='Strike-1' and n['author']=='Strike (strike-ai.eu)'
for frag in ['hosted decision API (EU, OVH Gravelines)','fine-tune of Qwen/Qwen3.5-4B','all 1,500 items of the draw were sent; 5 items over the provider\'s input limit were refused and are scored as misses (kept in the denominator)',
             'the API reports 0 output tokens on every answer','uncalibrated during beta','not yet equated to the reference scale, so its numbers are shown as published, offset 0',TOPIC]:assert frag in n['disclosure'],frag
assert '5 were refused by the server because the input exceeded its limit (8,192 tokens or 32,000 characters) and are scored as misses' in n['endpoint_condition'] and 'OVH Gravelines' in n['endpoint_condition']
assert 'Qwen/Qwen3.5-4B' in n['cost']['basis'] and '0 output tokens on the 1,489 common items' in n['cost']['basis'] and 'ESTIMATE' in n['cost']['basis']
assert '1,495 of the draw\'s 1,500 items' in res['measurement_notes'][-1] and '5 items over the provider\'s input limit were refused and count as wrong' in res['measurement_notes'][-1] and '1,489 items every row answered' in res['measurement_notes'][-1]
assert 'the cost uses the 1,489 items every row on this draw answered (same-items rule)' in by[MS]['disclosure']
assert 'no topic labels' in cat['results_sha256_note'] and 'changes no cell' in cat['results_sha256_note']
assert not re.search(r'equated with 12|Intelligence -1\.2|Calibration -0\.7',json.dumps(texts)),'no equating claim anywhere'
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','checked':sorted(texts),'banned_pattern':BANNED.pattern,'allowed_ranking_phrases':ALLOWED,'exact_history_sentence':True,'exact_notes':DK,'h2o_extra_sentence':True,'topic_cell_sentence_kept':True,
   'same_items_sentence_on_all_8':True,'strike_disclosures':['hosted EU','5 over-limit refusals scored as misses','output 0','stated base Qwen3.5-4B fine-tune','beta, uncalibrated probabilities'],'no_equating_claim':True},indent=1,sort_keys=True)+'\n')
print('PASS public text:',len(texts),'texts clean; exact history sentence, exact d1027 note and the same-items cost sentence on all',len(DK),'draw rows (H2O with its v1.1 sentence), topic-cell sentence kept; Strike-1: hosted EU, 5 over-limit refusals scored as misses, output 0, stated base, beta disclosed; no equating claim')
