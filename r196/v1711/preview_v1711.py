"""Self-contained interactive release preview with parameterized publication footer."""
import argparse,json,pathlib
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('--publication-status',choices=['pending','published'],default='pending');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());e=L(J/'receipts/topfive-extended.json');e['rows']+=L(J/'receipts/topfive-custom.json')['rows'];d=L(J/'receipts/topfive-diff.json');a=L(J/'inputs/APPROVAL.json');fair=a.get('fairness_check',{}).get('verdict','not required')
if A.publication_status=='published':
 assert L(J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.11-publication.json')['review']['verdict']=='PASS','published footer requires independent publication PASS'
 if d['changed']:assert fair=='FAIR','published footer requires bound FAIR'
footer='Published · independent review complete' if A.publication_status=='published' else 'Release review pending'
s=(J/'preview.template.html').read_text();s=s.replace('Philly Decider v2 + iota v0.3 + Decisio 0.9.0','Decisio Gemma engine-input cost correction').replace('Three self-hosted additions','Four cost corrections').replace('Three new self-hosted rows','Four existing Decisio Gemma rows').replace('Philly','Decisio Gemma')
(J/'preview/index.html').write_text(s.replace('/*FOOTER*/',footer).replace('/*FAIR*/',fair).replace('/*DATA*/',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
r=next((r for r in e['rows'] if r['variant']=='share' and r['scope']=='open' and r['changed']),e['rows'][0]);m=e['models']['share']
im=Image.new('RGB',(1440,900),'#101723');dr=ImageDraw.Draw(im);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=ImageFont.truetype(bold if b else font,n),fill=col)
txt(60,40,'JEVBENCH v1.7.10 → v1.7.11 · REVIEW PREVIEW',22,'#a3b8d3');txt(60,100,'Decisio Gemma: engine-input cost correction',37,b=True)
txt(60,170,'Four existing rows · same measurements · no method change',25)
txt(60,230,f"{d['changed_lists']} of {d['lists']} watched lists change",30,'#64dfb7',True)
txt(60,290,'12B tuned: $0.024239 → $0.028139 per 1,000',26)
txt(60,335,'12B v0.8 / v0.9: $0.022654 → $0.026554',26)
txt(60,380,'31B v0.8: $0.040847 → $0.047867',26)
txt(60,440,'Example: '+r['scope']+' / '+r['caps']+' / '+r['metric'],23,'#a3b8d3')
for i,k in enumerate(r['after']):
 label=m['after'][k]['display'];label=label if len(label)<=77 else label[:74]+'…'
 txt(70,490+i*47,f'{i+1}. {label}',21)
txt(60,760,'Intelligence, Calibration, Speed and Capability unchanged.',24)
txt(60,805,'Registration prefill estimates disclosed separately; not priced.',23)
txt(60,850,footer+' · fairness '+fair,20,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
print('PASS deterministic interactive HTML/card; publication footer '+A.publication_status)
