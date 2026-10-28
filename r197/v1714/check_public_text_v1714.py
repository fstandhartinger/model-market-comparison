"""Public-text gate for every text v1.7.14 adds to the site: release page, history line, results label/notes/source note,
category note and every new row's public fields incl. its not-ranked reason. No internal ids, board numbers, order ids, roles,
'Florian', job/worker names, decision keys or file paths; the exact reason and history sentence must be present; the
builder's disclosures must survive."""
import json,pathlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7'
L=lambda p:json.loads(p.read_text())
BANNED=re.compile(r"/home/|workers/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|\br19\d\b|69f7a75d|54575fd5|h2o141|tc31b|v171[34]-|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\bPREREG\b|(?-i:DECISIONS)|\{[A-Za-z_][A-Za-z0-9_]*\}|\brank(?:ed|ing)?\b|top[- ](?:five|5)",re.I)
# Words the page legitimately uses about the ranking ("no ranking or ranked order changes") are checked separately below.
BANNED_PAGE=re.compile(BANNED.pattern.replace(r"|\brank(?:ed|ing)?\b|top[- ](?:five|5)",''),re.I)
HIST=("Five more rows on the 27 Oct regular draw (Torchcast Decision 31B v1.0, paid evaluation; Arcbright Elf 1 12B (r2); Jeff-1.1-Qwen-4B; "
      "Decisio 12B tuned commit-think; Jeff-1.1-Large), shown unranked until the draw is equated to the reference scale.")
WANT=("Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale. This draw differs strongly from earlier draws (72% multilingual items). "
      "Shown unranked until the draw is equated.")
spec=L(J/'receipts/NEW-ROW-SPEC.json');keys=sorted(spec)
res=L(V/'jevbench-v1.7.14-results.json');cat=L(V/'jevbench-v1.7.14-categories.json');by={s['key']:s for s in res['systems']}
page=(W/'app/jev-models/v1.7.14/page.tsx').read_text();page_text=' '.join(re.findall(r">([^<>{}]+)<",page))+' '+' '.join(re.findall(r"(?:title|description):'([^']*)'",page))
rel=next(l for l in (W/'lib/jevbench-releases.mjs').read_text().splitlines() if "version: 'v1.7.14'" in l)
texts={'page':page_text,'history_line':rel,'label':res['label'],'source_note':res['source_note'],'new_measurement_note':res['measurement_notes'][-1],'categories_note':cat['results_sha256_note']}
for k in keys:
 row=by[k];assert row['not_ranked_because']==WANT,(k,'exact public explanation')
 texts.update({f'{k}.{f}':str(row.get(f) or '') for f in ['display','author','licence','disclosure','code_revision','endpoint_condition']})
 texts[f'{k}.cost.basis']=row['cost']['basis']
hits={n:m.group() for n,t in texts.items() if (m:=(BANNED_PAGE if n in ('page','new_measurement_note') else BANNED).search(t.replace('unranked','').replace('NOT RANKED','')))}
assert not hits,('internal public text',hits)
# The page and the measurement note may only use the ranking words in the exact unranked sentences.
for n in ['page','new_measurement_note']:
 t=texts[n].replace(WANT,'').replace('unranked','').replace('NOT RANKED','').replace('no ranking or ranked order changes','').replace('No existing row, rank or ranking changed','').replace('and they are not ranked','').replace('Every existing score, rank, interval and category cell is unchanged','')
 assert not re.search(r"\brank(?:ed|ing)?\b|top[- ](?:five|5)",t,re.I),(n,'ranking language')
assert res['source_note']==HIST and HIST.replace("'","\\'") in rel and HIST.replace("'","&apos;") in page and WANT in res['measurement_notes'][-1]
assert 'H2O-Lightning-4B v1.1' not in json.dumps([by[k] for k in keys]),'the H2O-specific comparison sentence must not appear on these rows'
TOPIC='This draw has no subject-topic labels yet, so the row has no topic cells; its use-case and language cells are measured on its own draw.'
assert 'This draw has no subject-topic labels yet, so the rows have no topic cells' in res['measurement_notes'][-1] and 'no topic labels' in cat['results_sha256_note']
KEEP={'torchcast-decision-31b-v1.0':['noul_floor 0.801','0.801 / 0.199','5 items','SDPA','FlashAttention-3 path','RTX PRO 6000','645,268','paid evaluation'],
 'arcbright-elf-1-12b-r2':['ELF_TRUNCATE=1','noul_commit','byte-identical','0.0327','610,840','30,789'],
 'jeff_1_1_qwen_4b':['313 decisions','348,654','max_output_per_decision 143','CC BY-NC-4.0','629,951','69,580'],
 'decisio-gemma-4-12b-tuned-commit-think':['844,031','727,045','504,719','36 of the 746','7,621','COMMIT RULE','9,121'],
 'jeff_1_1_large':['186 decisions','199,718','max_output_per_decision 35','different probability vectors','CC BY-NC-4.0','620,215','21,830']}
for k,frags in KEEP.items():
 blob=' '.join(texts[f'{k}.{f}'] for f in ['disclosure','code_revision','endpoint_condition','cost.basis','licence'])
 for frag in frags:assert frag in blob,(k,frag)
 assert TOPIC in by[k]['disclosure'],(k,'topic disclosure')
 assert not re.search(r'no anchor runs|anchor runs (are|pending)|anchor runs yet',blob,re.I),(k,'stale anchor-run wording')
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','checked':sorted(texts),'banned_pattern':BANNED.pattern,'exact_reason':True,'exact_history_sentence':True,'h2o_comparison_sentence_absent':True,'disclosures_kept':KEEP},indent=1,sort_keys=True)+'\n')
print('PASS public text:',len(texts),'texts clean; exact reason and history sentence present; builder disclosures kept for',len(KEEP),'rows')
