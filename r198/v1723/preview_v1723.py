"""Review preview (HTML change table + deterministic 1440x900 card) for the text-only v1.7.23 correction. No publication."""
import argparse,html,json,pathlib
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('--publication-status',choices=['pending','published'],default='pending');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text())
d=L(J/'receipts/topfive-diff.json');ch=L(J/'receipts/TEXT-CHANGES.json');ext=L(J/'receipts/topfive-extended.json')
res=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.23-results.json');by={s['key']:s for s in res['systems']}
assert d['changed_lists']==0 and d['lists']==580
if A.publication_status=='published':assert L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.23-publication.json')['review']['verdict']=='PASS'
footer='Published · independent review complete' if A.publication_status=='published' else 'Release review pending'
rows=''.join(f"<tr><td>{html.escape(c['path'])}</td><td>{html.escape(c['row_or_note'])}</td><td>{html.escape(c['old'] or '')}</td><td>{html.escape(c['new'])}</td></tr>" for c in ch)
page=f"<!doctype html><meta charset=utf-8><title>JevBench v1.7.23 review preview</title><h1>JevBench v1.7.23 · text-only corrections</h1><p>{html.escape(res['measurement_notes'][-1])}</p><p>{d['changed_lists']} of {d['lists']} top-five lists change. {footer}.</p><table border=1 cellpadding=4><tr><th>field</th><th>row / note</th><th>v1.7.22 text</th><th>v1.7.23 text</th></tr>{rows}</table>"
(J/'preview').mkdir(exist_ok=True);(J/'preview/index.html').write_text(page)
r=next(r for r in ext['rows'] if r['variant']=='share' and r['scope']=='all' and r['caps']=='official' and r['metric']=='A');m=ext['models']['share']
im=Image.new('RGB',(1440,900),'#101723');dr=ImageDraw.Draw(im);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=ImageFont.truetype(bold if b else font,n),fill=col)
txt(60,40,'JEVBENCH v1.7.22 → v1.7.23 · REVIEW PREVIEW',22,'#a3b8d3');txt(60,95,'Text-only corrections · no number changes',36,b=True)
txt(60,155,f"{len(ch)} text fields corrected (internal process references removed)",24)
txt(60,205,f"{d['changed_lists']} of {d['lists']} watched lists change · no rank changes",30,'#64dfb7',True)
txt(60,270,'What changed in the published text:',22,'#a3b8d3',True)
for i,t in enumerate(['KnowLine: "no earlier version of this exact model is on the board"','DecisionNode: token usage on the 1,489-item cost set (471,195 in / 0 out)','DREX Max: vendor has since updated the model behind this API id','Over-limit count: "answered without error" (was "answered correctly")','Over-cap rows: "Ranked outside the official caps (no Capability rank)"']):txt(80,310+i*40,'• '+t,23)
txt(60,540,'Unchanged example: all systems / official caps / A, top five:',22,'#a3b8d3')
for i,key in enumerate(r['after'][:5]):nm=m['after'][key]['display'];txt(80+(i%3)*450,578+(i//3)*38,f"{i+1}. {nm[:33]+('…' if len(nm)>33 else '')}",20)
txt(60,700,f"All {len(by)} rows keep every score, cost, rank, interval and order list byte-equal.",23)
txt(60,740,'History files of earlier releases stay unchanged; the correction applies from v1.7.23.',23)
txt(60,850,footer+' · no top-five change',20,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
print('PASS preview HTML and 1440x900 card; footer '+A.publication_status)
