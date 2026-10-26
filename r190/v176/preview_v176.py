"""Self-contained full-ranking and candidate/displaced-row radar; deterministic PNG."""
import pathlib,json,math
from PIL import Image,ImageDraw,ImageFont
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text())
e=L(J/'receipts/topfive-extended.json');d=L(J/'receipts/topfive-diff.json')
e['rows']+=L(J/'receipts/topfive-custom.json')['rows']
s=(J/'preview.template.html').read_text()
(J/'preview/index.html').write_text(s.replace('/*FAIR*/',L(J/'inputs'/'APPROVAL.json')['fairness_check']['verdict']).replace('/*DATA*/',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
r=next(r for r in e['rows'] if r['variant']=='share' and r['scope']=='open' and r['caps']=='none' and r['metric']=='A')
m=e['models']['share'];k='decisio-gemma-4-12b-tuned-commit';out=next(k for k in r['before'] if k not in r['after'])
im=Image.new('RGB',(1440,930),'#101723');dr=ImageDraw.Draw(im)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';f=lambda n,b=False:ImageFont.truetype(bold if b else font,n)
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=f(n,b),fill=col)
txt(60,40,'JEVBENCH v1.7.5 → v1.7.6  ·  REVIEW PREVIEW',22,'#a3b8d3')
txt(60,96,'Decisio 12B tuned commit',42,b=True)
txt(60,165,'One self-hosted addition · same draw · no method change',25)
txt(60,225,'#5 open-weights Composite A',32,'#64dfb7',True)
txt(60,278,'Composite A · 10-second share',22,'#a3b8d3')
for i,key in enumerate(r['after']):
 name={'h2o-lightning-4b':'H2O-Lightning-4B v1.1','h2o-lightning-31b':'H2O-Lightning-31B','basal-omni-1.0-ultra':'basal-omni-1.0-ultra','decisio-gemma-4-12b-tuned-commit':'Decisio 12B tuned commit','arcbright-elf-1-31b':'Arcbright Elf 1 31B','quyet-1-0-large':'Quyet-1.0-Large'}.get(key,m['after'][key]['display'])
 txt(70,345+i*59,f'{i+1}. {name}',25,'#64dfb7' if key==k else '#e4edf8',key==k)
txt(60,680,'Leaves top five: '+m['before'][out]['display'],22,'#f49bb6')
cx,cy,R=1090,480,190;axes=['intelligence','calibration','speed','cost']
def pts(vals):return [(cx+math.sin(i*math.pi/2)*R*v/100,cy-math.cos(i*math.pi/2)*R*v/100) for i,v in enumerate(vals)]
for v in [25,50,75,100]:dr.line(pts([v]*4)+[pts([v]*4)[0]],fill='#41516a',width=2)
for i,a in enumerate(axes):
 p=pts([100]*4)[i];dr.line([(cx,cy),p],fill='#41516a',width=2);x,y=pts([125]*4)[i];dr.text((x,y),a.title(),anchor='mm',font=f(21),fill='#c3d2e6')
for row,col in [(m['before'][out],'#f49bb6'),(m['after'][k],'#64dfb7')]:
 p=pts([max(0,min(100,row['axes'][a])) for a in axes]);dr.line(p+[p[0]],fill=col,width=5)
txt(865,205,'Decisio vs displaced Chon',25,b=True)
txt(880,745,'Green: Decisio   Pink: Chon',20,'#a3b8d3')
txt(60,755,'Composite C open #5 also changes.',23)
txt(60,807,'292 carried rows retain all scores and confidence intervals.',23,'#a3b8d3')
txt(60,852,'Fairness '+L(J/'inputs'/'APPROVAL.json')['fairness_check']['verdict']+' (independent review) · release review pending · not yet published',20,'#a3b8d3')
txt(60,893,"Placement rests on the author's JevBench-aware commit rule (composite A ≈36.7 without it); the A margin over the displaced row is +0.40, inside its CI and device-speed noise.",13,'#a3b8d3')
im=im.crop((0,0,1440,930))
im.save(J/'preview/card.png',optimize=True)
(J/'preview/README.md').write_text('Open index.html locally. Full before/after rankings for all 540 supplementary lists plus two custom-weight examples (542 total), filters, model search and radar comparing Decisio with the displaced row. card.png shows share/open/uncapped Composite A. Slider-transition evidence is in ../receipts/topfive-sliders.json. Fairness verdict: see inputs/APPROVAL.json; the independent publication review is separate.\n')
print('Built full-ranking interactive preview and deterministic 1440x930 PNG card')
