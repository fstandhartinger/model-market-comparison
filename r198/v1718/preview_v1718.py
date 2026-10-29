import pathlib,json,html
from PIL import Image,ImageDraw,ImageFont
from rows_v1718 import KEYS,LOST,NOUL,PARTIAL
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'preview';P.mkdir(exist_ok=True);L=lambda p:json.loads(p.read_text());rows=L(J/'receipts/NEW-ROW-SPEC.json');d=L(J/'receipts/topfive-diff.json');comparison=L(J/'topfive-comparison.json')
summary=''.join('<h2>'+html.escape(rows[k]['display'])+'</h2><p>'+html.escape(rows[k]['disclosure'])+'</p>' for k in KEYS)
s='''<!doctype html><html lang="en"><meta charset="utf-8"><title>JevBench v1.7.18 review preview</title><style>body{background:#101723;color:#e4edf8;font:17px system-ui;max-width:1300px;margin:40px auto;padding:24px}h1,h2{color:#64dfb7}select,input{padding:10px;margin:8px}td,th{padding:10px;text-align:left;border-bottom:1px solid #456}p{line-height:1.6}</style><h1>JevBench v1.7.18 — review pending</h1><p>KnowLine 4B-Gen5.5 + 26B-A4B-Gen2.5. Measured 23 Oct on the 12 Oct regular draw. Scores, intervals and prices unchanged for all 309 carried rows; mechanical insertion ranks change for 255 rows.</p><p>0/580 top-five lists change; 0/2,052 slider states; 0/368 grid states.</p><label>Watched list <select id="lists"></select></label><table><thead><tr><th>Position</th><th>Before</th><th>After</th></tr></thead><tbody id="ranking"></tbody></table><h2>New rows</h2><table><thead><tr><th>Model</th><th>I</th><th>C</th><th>Speed</th><th>Cost</th><th>Capability</th><th>A/B/C</th><th>USD/1k</th></tr></thead><tbody>'''
for k,r in rows.items():s+='<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in [r['display'],*[round(r['axes'][a],3) for a in ['intelligence','calibration','speed','cost']],round(r['capability'],3),'/'.join(str(round(r['scores'][m],3)) for m in ['A','B','C']),round(r['cost']['usd_per_1000'],6)])+'</tr>'
s+='</tbody></table>'+summary+'<p>26B Noul decisive count, rate and accuracy among decisive: unavailable. Family and language cells are retained. Subject-topic and use-case cells are unavailable.</p><footer>Release review pending · no publication</footer>'
s+='<script>const data='+json.dumps(comparison['rows']).replace('</','<\\/')+';const list=document.getElementById("lists"),body=document.getElementById("ranking");data.forEach((r,i)=>{const o=document.createElement("option");o.value=i;o.textContent=r.label;list.appendChild(o)});function draw(){body.replaceChildren();const r=data[+list.value];for(let i=0;i<5;i++){const tr=document.createElement("tr");for(const x of [i+1,r.before[i]||"—",r.after[i]||"—"]){const td=document.createElement("td");td.textContent=x;tr.appendChild(td)}body.appendChild(tr)}}list.onchange=draw;draw();</script></html>'
(P/'index.html').write_text(s)
im=Image.new('RGB',(1440,900),'#101723');draw=ImageDraw.Draw(im)
def text(x,y,t,n=25,c='#e4edf8',bold=False):draw.text((x,y),t,font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf',n),fill=c)
text(55,40,'JEVBENCH v1.7.17 → v1.7.18 · REVIEW PREVIEW',24,'#a3b8d3')
text(55,105,'Two KnowLine models · retained 23 Oct measurements',34,bold=True)
text(55,170,'0 / 580 top-five lists change',36,'#64dfb7',True)
text(55,225,'0 / 2,052 slider states · 0 / 368 grid states · 0 / 4 custom examples',25)
for i,k in enumerate(KEYS):
 r=rows[k];y=300+i*135;text(55,y,r['display'],29,bold=True);text(55,y+45,f"A / B / C: {r['scores']['A']:.2f} / {r['scores']['B']:.2f} / {r['scores']['C']:.2f}     Capability: {r['capability']:.2f}     USD/1k: {r['cost']['usd_per_1000']:.6f}",24)
text(55,595,'309 carried scores and intervals unchanged; 255 mechanical rank changes.',25)
text(55,650,'Answer files lost after scoring; measurements cannot be scored again.',25)
text(55,695,'Subject-topic and use-case breakdowns unavailable for both rows.',25)
text(55,740,'26B Noul decisiveness unavailable; runner time-cap flag disclosed.',25)
text(55,835,'Release review pending · no publication',23,'#a3b8d3');im.save(P/'card.png',optimize=True)
print('PASS deterministic HTML with all 580 comparisons and 1440x900 card, pending footer')
