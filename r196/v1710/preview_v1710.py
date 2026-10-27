"""Self-contained review preview and deterministic card; publication footer is parameterized."""
import argparse,json,pathlib
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('--publication-status',choices=['pending','published'],default='pending');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());e=L(J/'receipts/topfive-extended.json');e['rows']+=L(J/'receipts/topfive-custom.json')['rows'];d=L(J/'receipts/topfive-diff.json')
if A.publication_status=='published':
 assert L(J/'inputs/APPROVAL.json')['fairness_check']['verdict']=='FAIR', 'published footer requires bound FAIR review'
 assert L(J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-publication.json')['review']['verdict']=='PASS', 'published footer requires publication PASS'
footer='Published · independent review complete' if A.publication_status=='published' else 'Release review pending'
s=(J/'preview.template.html').read_text();(J/'preview/index.html').write_text(s.replace('/*FOOTER*/',footer).replace('/*FAIR*/',L(J/'inputs/APPROVAL.json')['fairness_check']['verdict']).replace('/*DATA*/',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
r=next((r for r in e['rows'] if r['variant']=='share' and r['scope']=='open' and r['changed']),e['rows'][0]);m=e['models']['share'];k='phillylabs_philly_decider_v2';out=next((k for k in r['before'] if k not in r['after']),r['before'][-1])
im=Image.new('RGB',(1440,900),'#101723');dr=ImageDraw.Draw(im);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=ImageFont.truetype(bold if b else font,n),fill=col)
txt(60,40,'JEVBENCH v1.7.9 → v1.7.10 · REVIEW PREVIEW',22,'#a3b8d3');txt(60,100,'Philly v2 + iota v0.3 + Decisio 0.9.0',38,b=True)
txt(60,165,'Three self-hosted additions · same draw · no method change',25)
txt(60,220,f"{d['changed_lists']} of {d['lists']} watched lists change",30,'#64dfb7',True)
txt(60,275,'Philly: Capability 69.30 · fair top-five change',27);txt(60,320,'iota v0.3: Capability 68.64 · paid public order',25)
txt(60,370,'Example: '+r['scope']+' / '+r['caps']+' / '+r['metric'],23,'#a3b8d3')
for i,key in enumerate(r['after']):txt(70,430+i*55,f"{i+1}. {m['after'][key]['display']}",23,'#64dfb7' if key==k else '#e4edf8',key==k)
txt(60,735,'Decisio: Capability 61.49 · 15 refusals · 2.77x cost cap',24)
txt(60,780,'All 297 carried scores and intervals unchanged.',24)
txt(60,840,footer+' · fairness '+L(J/'inputs/APPROVAL.json')['fairness_check']['verdict'],20,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
(J/'preview/README.md').write_text('Open index.html locally for full before/after rankings, filters, model search and axis comparison. Card footer is controlled by preview_v1710.py --publication-status pending|published. No publication performed.\n')
print('PASS deterministic preview HTML and 1440x900 card; footer '+A.publication_status)
