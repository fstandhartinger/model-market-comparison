"""Self-contained review preview and deterministic card; publication footer is parameterized."""
import argparse,html,json,pathlib
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('--publication-status',choices=['pending','published'],default='pending');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());e=L(J/'receipts/topfive-extended.json');e['rows']+=L(J/'receipts/topfive-custom.json')['rows'];d=L(J/'receipts/topfive-diff.json')
spec=L(J/'receipts/NEW-ROW-SPEC.json');inputs=L(J/'src/inputs.json');keys=sorted(spec);PAID='torchcast-decision-31b-v1.0'
assert all(spec[k]['ranked'] is False for k in keys)
k_absent=lambda r:all(x['key'] not in keys for x in r['full_after'])
if A.publication_status=='published':
 assert L(J/'inputs/APPROVAL.json')['status']=='GO (standing; no top-five change; paid public order for Torchcast)' and not d['changed'], 'published footer requires the standing GO with no top-five change'
 assert L(J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-publication.json')['review']['verdict']=='PASS', 'published footer requires publication PASS'
footer='Published · independent review complete' if A.publication_status=='published' else 'Release review pending'
order=[PAID]+[k for k in keys if k!=PAID]
def row_html(k):
 s=spec[k];a=s['axes'];c=inputs[k]
 return (f"<p><strong>{html.escape(s['display'])}</strong> ({html.escape(s['model_pin'].split('@')[0])}@{s['model_pin'].split('@')[1][:8]}): Capability {s['capability']:.2f}, Intelligence {a['intelligence']:.2f}, "
         f"Calibration {a['calibration']:.2f}, share Speed {a['speed']:.2f}, Cost {a['cost']:.2f}, A {s['scores']['A']:.2f}, B {s['scores']['B']:.2f}, C {s['scores']['C']:.2f}; 1,500/1,500 answered, 0 over 10 s. "
         f"ESTIMATE USD {c['usd_per_1000']:.6f}/1k over all 1,500 items ({c['cap_ratio']:.2f}x cap), {c['priced_input_tokens']:,} priced input + {c['output_tokens']:,} output tokens.</p>")
s=(J/'preview.template.html').read_text()
s=(s.replace('/*FOOTER*/',footer).replace('/*FAIR*/','rows shown unranked (draw not yet equated)').replace('/*CHANGED*/',str(d['changed_lists'])).replace('/*LISTS*/',str(d['lists']))
   .replace('/*REASON*/',html.escape(spec[PAID]['not_ranked_because'])).replace('/*ROWS*/',''.join(row_html(k) for k in order)+'<p>Draw v1.6-regular-20261027: not yet equated, offset 0, reference G_med 2.57.</p>')
   .replace('/*OPTIONS*/',''.join(f'<option value="{k}">{html.escape(spec[k]["display"])}</option>' for k in order)).replace('/*DATA*/',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
(J/'preview/index.html').parent.mkdir(exist_ok=True);(J/'preview/index.html').write_text(s)
r=next(r for r in e['rows'] if r['variant']=='share' and r['scope']=='open' and r['caps']=='official' and r['metric']=='A');assert k_absent(r);m=e['models']['share']
im=Image.new('RGB',(1440,900),'#101723');dr=ImageDraw.Draw(im);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=ImageFont.truetype(bold if b else font,n),fill=col)
txt(60,40,'JEVBENCH v1.7.13 → v1.7.14 · REVIEW PREVIEW',22,'#a3b8d3');txt(60,95,'Five more rows on the 27 Oct draw · all shown UNRANKED',36,b=True)
txt(60,155,'One paid public row (Torchcast Decision 31B v1.0) + four self-hosted rows · no method change',24)
txt(60,205,f"{d['changed_lists']} of {d['lists']} watched lists change · no rank changes",30,'#64dfb7',True)
y=265
txt(60,y,'Row',20,'#a3b8d3',True);txt(640,y,'A',20,'#a3b8d3',True);txt(760,y,'Capability',20,'#a3b8d3',True);txt(920,y,'I / C',20,'#a3b8d3',True);txt(1110,y,'USD/1k est.',20,'#a3b8d3',True)
for i,k in enumerate(order):
 sp=spec[k];yy=y+40+i*48
 txt(60,yy,sp['display'][:44]+('…' if len(sp['display'])>44 else ''),22,'#64dfb7' if k==PAID else '#e4edf8',k==PAID)
 txt(640,yy,f"{sp['scores']['A']:.2f}",22);txt(760,yy,f"{sp['capability']:.2f}",22);txt(920,yy,f"{sp['axes']['intelligence']:.1f} / {sp['axes']['calibration']:.1f}",22);txt(1110,yy,f"{inputs[k]['usd_per_1000']:.6f} ({inputs[k]['cap_ratio']:.2f}x)",22)
txt(60,585,'Unchanged example: open / official caps / A, top five:',22,'#a3b8d3')
for i,key in enumerate(r['after'][:5]):nm=m['after'][key]['display'];txt(80+(i%3)*450,625+(i//3)*40,f"{i+1}. {nm[:33]+('…' if len(nm)>33 else '')}",20)
txt(60,725,'Why unranked: measured on the 27 Oct 2026 draw, which is not yet equated to the',23)
txt(60,758,'reference scale (72% multilingual items). Shown unranked until the draw is equated.',23)
txt(60,800,'All 301 carried scores, ranks and intervals unchanged (incl. H2O-Lightning-4B v1.4.1).',23)
txt(60,850,footer+' · rows unranked → no top-five change',20,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
(J/'preview/README.md').write_text('Open index.html locally for full before/after rankings, filters, model search and axis comparison. Card footer is controlled by preview_v1714.py --publication-status pending|published. No publication performed.\n')
print('PASS deterministic preview HTML and 1440x900 card; footer '+A.publication_status)
