"""Public-text gate for every text v1.7.15 adds to the site: release page, history line, results label/notes/source note, category
note, the new row's public fields and the new public note of every row on the 27 Oct draw, the draw-table entry. No internal ids,
board numbers, order ids, roles, 'Florian', job/worker names, decision keys or file paths; ranking words only in the exact unranked
sentences; exact history sentence and notes; the builder's disclosures (1,493 items, 7 excluded, 4 context-limit refusals, served id
unchanged, topic-cell sentence) must survive."""
import json,pathlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text())
BANNED=re.compile(r"/home/|workers/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|\br19\d\b|d2b677de|9cde338c|Anna|Roth|Gmail|h2o141|tc31b|d1027-|v171[345]u?-|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\bPREREG\b|(?-i:DECISIONS)|\{[A-Za-z_][A-Za-z0-9_]*\}|\brank(?:ed|ing)?\b|top[- ](?:five|5)",re.I)
RANKWORDS=re.compile(r"\brank(?:ed|ing)?\b|top[- ](?:five|5)",re.I)
HIST=("Added Microsoft-Decision-1 with updated weights (paid evaluation) on the 27 Oct regular draw; that draw's rows stay unranked "
      "until stronger anchors are measured.")
HEAD="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";TAIL="Shown unranked until then."
NOTE=HEAD+' '+TAIL
H2O='h2o-lightning-4b-v1.4.1';H2O_EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.'
TOPIC='This draw has no subject-topic labels yet, so the row has no topic cells'
res=L(V/'jevbench-v1.7.15-results.json');cat=L(V/'jevbench-v1.7.15-categories.json');by={s['key']:s for s in res['systems']}
K='microsoft-decision-1-r2';DK=sorted(res['addendum']['text_fixed_keys']+res['addendum']['new_keys']);assert len(DK)==7
page=(W/'app/jev-models/v1.7.15/page.tsx').read_text();page_text=' '.join(re.findall(r">([^<>{}]+)<",page))+' '+' '.join(re.findall(r"(?:title|description):'([^']*)'",page))
rel=next(l for l in (W/'lib/jevbench-releases.mjs').read_text().splitlines() if "version: 'v1.7.15'" in l)
texts={'page':page_text,'history_line':rel,'label':res['label'],'source_note':res['source_note'],'new_measurement_note':res['measurement_notes'][-1],'categories_note':cat['results_sha256_note'],
       'draw_table_entry':json.dumps(next(x for x in L(W/'data/jevbench-draw-equating.json')['draws'] if x['draw']=='v1.6-regular-20261027'))}
for k in DK:
 r=by[k];assert r['not_ranked_because']==HEAD+(' '+H2O_EXTRA if k==H2O else '')+' '+TAIL,(k,'exact public note')
 assert TOPIC in r['disclosure'],(k,'topic-cell sentence kept')
 assert 'listing_note' not in r and not re.search(r'equated to the reference scale with|anchor equating',r['disclosure']),(k,'no equated wording')
 texts[f'{k}.not_ranked_because']=r['not_ranked_because']
n=by[K]
texts.update({f'{K}.{f}':str(n.get(f) or '') for f in ['display','author','disclosure','endpoint_condition']});texts[f'{K}.cost.basis']=n['cost']['basis'];texts[f'{K}.model_pin']=json.dumps(n['model_pin'])
# Ranking words are allowed only inside the exact unranked sentences ('unranked', 'NOT RANKED', the page's 'no ranking or ranked order changes').
ALLOWED=['unranked','NOT RANKED','no ranking or ranked order changes','No existing score, rank or ranking changed','Every existing score, rank, interval and category cell is unchanged']
def strip(t):
 for x in ALLOWED:t=t.replace(x,'')
 return t
hits={nm:m.group() for nm,t in texts.items() if (m:=BANNED.search(strip(t)))}
assert not hits,('internal public text',hits)
assert res['source_note']==HIST and HIST.replace("'","\\'") in rel and HIST.replace("'","&apos;") in page and res['measurement_notes'][-1].startswith(HIST) and NOTE in res['measurement_notes'][-1]
assert res['label']=='JevBench v1.7.15: Microsoft-Decision-1 with updated weights on the 27 Oct regular draw'
assert n['display']=='Microsoft-Decision-1 (updated weights, Oct 2026)' and by['microsoft-decision-1']['display']=='Microsoft-Decision-1 (Azure Foundry)'
for frag in ['n = 1,493','7 sealed items are excluded because this provider had seen them in an earlier evaluation','served model id (microsoft-decision-1) is identical to the first measurement','stays listed unchanged','weights update reported by Microsoft','not yet equated to the reference scale, so its numbers are shown as published, offset 0',TOPIC]:assert frag in n['disclosure'],frag
assert '4 were refused by the server because the prompt exceeded its 32,768-token context limit' in n['endpoint_condition']
assert 'n = 1,493' in n['cost']['basis'] and 'Advertised Azure Foundry tariff USD 0.042 per million input tokens, output free' in n['cost']['basis'] and '1,493' in res['measurement_notes'][-1] and 'no topic labels' in cat['results_sha256_note']
assert '7 items its provider had seen in an earlier evaluation are excluded' in res['measurement_notes'][-1] and '4 requests over its 32,768-token context limit count as wrong' in res['measurement_notes'][-1]
assert not re.search(r'equated with 12|Intelligence -1\.2|Calibration -0\.7',json.dumps(texts)),'no equating claim anywhere'
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','checked':sorted(texts),'banned_pattern':BANNED.pattern,'allowed_ranking_phrases':ALLOWED,'exact_history_sentence':True,'exact_notes':DK,'h2o_extra_sentence':True,'topic_cell_sentence_kept':True,'n_1493_disclosed':True,'context_limit_refusals_disclosed':True,'no_equating_claim':True},indent=1,sort_keys=True)+'\n')
print('PASS public text:',len(texts),'texts clean; exact history sentence, exact d1027 note on all',len(DK),'draw rows (H2O with its v1.1 sentence), topic-cell sentence kept, n = 1,493 / 7 excluded / 4 context-limit refusals disclosed; no equating claim')
