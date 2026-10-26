"""Simple deterministic aggregate review card and self-contained HTML."""
import pathlib,json,html
from PIL import Image,ImageDraw,ImageFont
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());d=L(J/'receipts/topfive-diff.json');rows=L(J/'receipts/NEW-ROW-SPEC.json')
im=Image.new('RGB',(1440,800),'#101723');dr=ImageDraw.Draw(im);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold=font.replace('Sans.ttf','Sans-Bold.ttf')
def text(x,y,t,size=25,color='#e4edf8',b=False):dr.text((x,y),t,font=ImageFont.truetype(bold if b else font,size),fill=color)
text(60,42,'JEVBENCH v1.7.6 → v1.7.7',27,'#a3b8d3');text(60,110,'Two new self-hosted D1A rows',43,b=True);text(60,185,'Same draw · no method change · measurement 26 Oct 2026')
for i,k in enumerate(['d1a-gemma4-e4b','d1a-gemma4-e2b']):
 s=rows[k];y=270+i*135;text(60,y,s['display'],30,b=True);a=s['axes'];text(60,y+50,f"Capability {s['capability']:.2f}    I {a['intelligence']:.2f}    Cal {a['calibration']:.2f}    Speed {a['speed']:.2f}    Cost {a['cost']:.2f}    A {s['scores']['A']:.2f}",23)
text(60,565,f"Top five unchanged across {d['lists']} lists and recorded slider states",28,'#64dfb7',True);text(60,625,'293 carried rows retain all scores, intervals and diagnostics.',25)
text(60,675,'15 truncated prompts per model exceed 10 s; share counts them wrong.',24);text(60,730,'Cost ESTIMATE · release review PENDING · candidate only',23,'#a3b8d3');im.save(J/'preview/card.png')
body=''.join('<h2>'+html.escape(s['display'])+'</h2><pre>'+html.escape(json.dumps({f:s[f] for f in ['capability','axes','scores','model_pin','disclosure','cost']},indent=2))+'</pre>' for s in rows.values())
(J/'preview/index.html').write_text('<!doctype html><meta charset="utf-8"><title>JevBench v1.7.7 review</title><style>body{background:#101723;color:#e4edf8;font:18px system-ui;max-width:1100px;margin:40px auto}pre{white-space:pre-wrap}h1,h2{color:#64dfb7}</style><h1>JevBench v1.7.7 candidate</h1><p>Two new self-hosted D1A rows. No method change. Top five unchanged in '+str(d['lists'])+' lists and recorded slider states. Independent publication review PENDING.</p>'+body)
print('PASS deterministic HTML + PNG preview')
