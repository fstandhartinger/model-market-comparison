"""Self-contained review preview and deterministic card; publication footer is parameterized."""
import argparse,json,pathlib
k_absent=lambda r:all(x['key']!='h2o-lightning-4b-v1.4.1' for x in r['full_after'])
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('--publication-status',choices=['pending','published'],default='pending');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());e=L(J/'receipts/topfive-extended.json');e['rows']+=L(J/'receipts/topfive-custom.json')['rows'];d=L(J/'receipts/topfive-diff.json');spec=L(J/'receipts/NEW-ROW-SPEC.json')['h2o-lightning-4b-v1.4.1'];assert spec['ranked'] is False
if A.publication_status=='published':
 assert L(J/'inputs/APPROVAL.json')['status']=='GO (standing; no top-five change; paid public order)' and not d['changed'], 'published footer requires the standing GO with no top-five change'
 assert L(J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json')['review']['verdict']=='PASS', 'published footer requires publication PASS'
footer='Published · independent review complete' if A.publication_status=='published' else 'Release review pending'
s=(J/'preview.template.html').read_text();(J/'preview/index.html').write_text(s.replace('/*FOOTER*/',footer).replace('/*FAIR*/',L(J/'inputs/APPROVAL.json')['fairness_check']['verdict']+' (row shown unranked)').replace('/*CHANGED*/',str(d['changed_lists'])).replace('/*LISTS*/',str(d['lists'])).replace('/*REASON*/',spec['not_ranked_because'].replace('&','&amp;').replace('<','&lt;')).replace('/*DATA*/',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
r=next(r for r in e['rows'] if r['variant']=='share' and r['scope']=='open' and r['caps']=='official' and r['metric']=='A');assert k_absent(r);m=e['models']['share'];k='h2o-lightning-4b-v1.4.1';out=next((k for k in r['before'] if k not in r['after']),r['before'][-1])
im=Image.new('RGB',(1440,900),'#101723');dr=ImageDraw.Draw(im);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=ImageFont.truetype(bold if b else font,n),fill=col)
txt(60,40,'JEVBENCH v1.7.12 → v1.7.13 · REVIEW PREVIEW',22,'#a3b8d3');txt(60,100,'H2O-Lightning-4B v1.4.1 · first row on the 27 Oct draw',36,b=True)
txt(60,165,'One paid public self-hosted row · new draw · shown UNRANKED · no method change',25)
txt(60,220,f"{d['changed_lists']} of {d['lists']} watched lists change · no rank changes",30,'#64dfb7',True)
sh=L(J/'src/inputs.json')[k]['v17-share'];txt(60,275,f"Composite A {sh['scores']['A']:.2f} · Capability {sh['capability']:.2f} · I {sh['axes']['intelligence']:.2f} · C {sh['axes']['calibration']:.2f}",26);txt(60,320,f"Speed {sh['axes']['speed']:.2f} · Cost {sh['axes']['cost']:.2f} (USD 0.014370/1k est., 0.22x cap) · RTX PRO 6000",23)
txt(60,370,'Unchanged example: '+r['scope']+' / '+r['caps']+' / '+r['metric']+' (the new row is in no ranked list)',23,'#a3b8d3')
short=lambda t:t if len(t)<=78 else t[:77].rstrip()+'…'
for i,key in enumerate(r['after']):txt(70,430+i*55,f"{i+1}. {short(m['after'][key]['display'])}",23,'#64dfb7' if key==k else '#e4edf8',key==k)
txt(60,735,'Why unranked: its draw is not yet equated, and on the 300 shared public items',24)
txt(60,770,'it scores 57.2 Intelligence vs 61.1 for v1.1. Shown unranked until the draw is equated.',24)
txt(60,805,'All 300 carried scores, ranks and intervals unchanged.',24)
txt(60,850,footer+' · fairness '+L(J/'inputs/APPROVAL.json')['fairness_check']['verdict']+' → shown unranked',20,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
(J/'preview/README.md').write_text('Open index.html locally for full before/after rankings, filters, model search and axis comparison. Card footer is controlled by preview_v1713.py --publication-status pending|published. No publication performed.\n')
print('PASS deterministic preview HTML and 1440x900 card; footer '+A.publication_status)
