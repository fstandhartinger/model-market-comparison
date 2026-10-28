"""Self-contained review preview and deterministic card; publication footer is parameterized."""
import argparse,html,json,pathlib
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('--publication-status',choices=['pending','published'],default='pending');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());e=L(J/'receipts/topfive-extended.json');e['rows']+=L(J/'receipts/topfive-custom.json')['rows'];d=L(J/'receipts/topfive-diff.json')
res=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-results.json');by={s['key']:s for s in res['systems']};inputs=L(J/'src/inputs.json')
K='microsoft-decision-1-r2';DK=sorted(res['addendum']['text_fixed_keys']);order=[K]+DK
assert all(by[k]['ranked'] is False for k in order)
k_absent=lambda r:all(x['key'] not in order for x in r['full_after'])
if A.publication_status=='published':
 assert L(J/'inputs/APPROVAL.json')['status']=='GO (standing; no top-five change; paid public order)' and not d['changed'], 'published footer requires the standing GO with no top-five change'
 assert L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-publication.json')['review']['verdict']=='PASS', 'published footer requires publication PASS'
footer='Published · independent review complete' if A.publication_status=='published' else 'Release review pending'
def row_html(k):
 s=by[k];a=s['axes']
 extra=(f"; 1,489 of 1,493 answered (4 over the 32,768-token context limit, scored wrong), 0 over 10 s; tariff USD {inputs[k]['usd_per_1000']:.6f}/1k ({inputs[k]['input_tokens']:,} input + {inputs[k]['output_tokens']:,} output tokens, 0.042/M input, output free)" if k==K else '')
 return (f"<p><strong>{html.escape(s['display'])}</strong>: Capability {s['capability']:.2f}, Intelligence {a['intelligence']:.2f}, Calibration {a['calibration']:.2f}, share Speed {a['speed']:.2f}, Cost {a['cost']:.2f}, "
         f"A {s['scores']['A']:.2f}, B {s['scores']['B']:.2f}, C {s['scores']['C']:.2f}{extra}. Note: {html.escape(s['not_ranked_because'])}</p>")
s=(J/'preview.template.html').read_text()
s=(s.replace('/*FOOTER*/',footer).replace('/*FAIR*/','rows shown unranked (draw not equated; stronger anchors needed)').replace('/*CHANGED*/',str(d['changed_lists'])).replace('/*LISTS*/',str(d['lists']))
   .replace('/*REASON*/',html.escape(by[K]['not_ranked_because'])).replace('/*ROWS*/',''.join(row_html(k) for k in order)+'<p>Draw v1.6-regular-20261027: not equated, offset 0, reference G_med 2.57.</p>')
   .replace('/*OPTIONS*/',''.join(f'<option value="{k}">{html.escape(by[k]["display"])}</option>' for k in order)).replace('/*DATA*/',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
(J/'preview').mkdir(exist_ok=True);(J/'preview/index.html').write_text(s)
r=next(r for r in e['rows'] if r['variant']=='share' and r['scope']=='all' and r['caps']=='official' and r['metric']=='A');assert k_absent(r);m=e['models']['share']
im=Image.new('RGB',(1440,900),'#101723');dr=ImageDraw.Draw(im);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=ImageFont.truetype(bold if b else font,n),fill=col)
txt(60,40,'JEVBENCH v1.7.14 → v1.7.15 · REVIEW PREVIEW',22,'#a3b8d3');txt(60,95,'Microsoft-Decision-1 (updated weights) · shown UNRANKED',36,b=True)
txt(60,155,'Paid public row, hosted API, 1,493 items · 27 Oct draw not equated · no method change',24)
txt(60,205,f"{d['changed_lists']} of {d['lists']} watched lists change · no rank changes",30,'#64dfb7',True)
y=265
txt(60,y,'Row (27 Oct draw)',20,'#a3b8d3',True);txt(640,y,'A',20,'#a3b8d3',True);txt(760,y,'Capability',20,'#a3b8d3',True);txt(920,y,'I / C',20,'#a3b8d3',True);txt(1110,y,'USD/1k',20,'#a3b8d3',True)
for i,k in enumerate(order):
 sp=by[k];yy=y+36+i*36
 txt(60,yy,sp['display'][:46]+('…' if len(sp['display'])>46 else ''),20,'#64dfb7' if k==K else '#e4edf8',k==K)
 txt(640,yy,f"{sp['scores']['A']:.2f}",20);txt(760,yy,f"{sp['capability']:.2f}",20);txt(920,yy,f"{sp['axes']['intelligence']:.1f} / {sp['axes']['calibration']:.1f}",20);txt(1110,yy,f"{sp['cost']['usd_per_1000']:.6f}"+(' tariff' if k==K else ' est.'),20)
txt(60,575,'Unchanged example: all systems / official caps / A, top five:',22,'#a3b8d3')
for i,key in enumerate(r['after'][:5]):nm=m['after'][key]['display'];txt(80+(i%3)*450,612+(i//3)*38,f"{i+1}. {nm[:33]+('…' if len(nm)>33 else '')}",20)
txt(60,705,'Why unranked: the first anchor runs used models weaker than these rows;',23)
txt(60,738,"stronger anchors are being measured, so the draw is not equated yet.",23)
txt(60,780,'All 306 carried scores, ranks and intervals unchanged; round-1 Microsoft row unchanged.',23)
txt(60,850,footer+' · rows unranked → no top-five change',20,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
(J/'preview/README.md').write_text('Open index.html locally for full before/after rankings, filters, model search and axis comparison. Card footer is controlled by preview_v1715.py --publication-status pending|published. No publication performed.\n')
print('PASS deterministic preview HTML and 1440x900 card; footer '+A.publication_status)
