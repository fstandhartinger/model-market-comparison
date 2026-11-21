from pathlib import Path
import json,html,math,re
from PIL import Image,ImageDraw,ImageFont
B=Path(__file__).resolve().parent.parent
L=lambda p:json.loads(p.read_text())
P=L(B/'WHATIF-PROPOSED-V1818.json');old=L(Path('/home/flori/wt/jevbench-v1818-20261120/data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.17-results.json'));c=L(B/'CUE-ANALYSIS-ROW.json');before=L(B/'BEFORE-LISTS.json');diff=L(B/'topfive-diff.json')
models={s['key']:{k:s[k]for k in ['display','axes','scores','capability']}for s in old['systems']+[c]}
for m in models.values():m['display']=re.sub(r'\s*\(@[0-9a-f]{7,40}\)','',m['display'])
data={'models':models,'before':before,'after':P['primary_rankings']['point'],'changed':[x['list']for x in diff['lists']]}
O=B/'preview';O.mkdir(exist_ok=True)
template='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JevBench v1.8.18 ranking preview</title><style>
*{box-sizing:border-box}body{margin:0;background:#101723;color:#e4edf8;font:16px system-ui}main{max-width:1440px;margin:auto;padding:32px}p{max-width:1050px;line-height:1.6}small,.muted{color:#a3b8d3}select,input{background:#20334b;color:#fff;border:1px solid #526882;padding:10px;border-radius:6px}section{margin-top:24px;background:#172234;padding:22px;border-radius:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #344258;text-align:left}.focus{background:#23473e}.scroll{max-height:600px;overflow:auto}#radar{max-width:420px;width:100%;display:block;margin:auto}@media(max-width:850px){.grid{grid-template-columns:1fr}main{padding:16px}}</style>
<main><small>Independent fairness review: FAIR, all nine rows ranked</small><h1>Reviewing the nine rows added after v1.8.10</h1><p>Nine rows ranked in the candidate: 324 ranked in total. The proposal changes 26 of 40 primary top-five lists. The published four-anchor shift stays fixed: Intelligence −2.885, Calibration −1.854. No measurement is repeated. Joint-CI endpoints remain stress tests under the v1.8.10 precedent.</p><p>Starlord 27B’s open-weights Composite B #5 falls out only at the Intelligence lower endpoint and carries a boundary sentence. H2O’s 23 point top-five memberships are robust under the binding checks; 16 cross in joint stress tests. Quyet Large and Sieve have no point top-five place. The independent family/language fairness review is FAIR, all nine rows ranked. Boundary places also remain disclosed for decide-1.1 at 4 on Composite B among all systems, Karpo-Decision-31B at 4 on the Capability Score among all systems, SD-JEV-4B v12.1.0 at 5 on API Composite A, and Arcbright r2 at 5 on open-weights Composite A and C. The release owner still binds and seals the candidate.</p>
<section><label>Primary list <select id="list"></select></label><p id="summary"></p><table><thead><tr><th>Place</th><th>Before</th><th>Proposed</th></tr></thead><tbody id="five"></tbody></table></section>
<section class="grid"><div><h2>New entrant vs displaced model</h2><label>New entrant <select id="entrant"></select></label><label>Comparison <select id="leaver"></select></label><p id="pair"></p><svg id="radar" viewBox="0 0 400 360" role="img" aria-label="Four-axis comparison"></svg><p class="muted">Green: proposed entrant. Pink: displaced comparison. All axes are on the reference scale.</p></div><div><h2>Changed top fives</h2><ul id="changes"></ul></div></section>
<section><h2>Full ranking</h2><label>Find model <input id="query" placeholder="Model name"></label><div class="scroll"><table><thead><tr><th>Place</th><th>Model</th><th>Value</th><th>Previous place</th></tr></thead><tbody id="ranking"></tbody></table></div></section></main><script>
const D=__DATA__, $=q=>document.querySelector(q),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=k=>D.models[k]?.display??k;const listName=l=>l.startsWith('release/')?'All systems · '+(l.endsWith('/capability')?'Capability Score':'Composite '+l.split('/').at(-1)):({all:'All systems',open:'Open weights',api:'Hosted APIs'}[l.split('/')[0]]+' · '+(l.includes('/composites/')?'Composite '+l.split('/').at(-1):'Capability Score · '+l.split('/').at(-1).replaceAll('_',' ')));let active;
function value(k,l){const m=l.split('/').at(-1);return ['A','B','C'].includes(m)?D.models[k].scores[m]:D.models[k].capability}
function options(q,keys){$(q).innerHTML=keys.map(k=>`<option value="${esc(k)}">${esc(name(k))}</option>`).join('')}
function radar(){const a=D.models[$('#entrant').value],b=D.models[$('#leaver').value],AX=['intelligence','calibration','speed','cost'],cx=200,cy=180,r=105,pt=(i,v)=>[cx+Math.cos(i*Math.PI/2-Math.PI/2)*r*v/100,cy+Math.sin(i*Math.PI/2-Math.PI/2)*r*v/100],poly=vs=>vs.map((v,i)=>pt(i,v).join(',')).join(' ');let s='';for(let n=20;n<=100;n+=20)s+=`<polygon points="${poly(AX.map(()=>n))}" fill="none" stroke="#41516a"/>`;AX.forEach((k,i)=>{const p=pt(i,145);s+=`<text x="${p[0]}" y="${p[1]}" fill="#c3d2e6" text-anchor="middle" font-size="13">${k}</text>`});for(const[m,col]of [[b,'#f49bb6'],[a,'#64dfb7']])if(m)s+=`<polygon points="${poly(AX.map(k=>m.axes[k]))}" fill="${col}" fill-opacity="0.13" stroke="${col}" stroke-width="3"/>`;$('#radar').innerHTML=s;$('#pair').textContent=`${a?.display??'No entrant'} vs ${b?.display??'No displaced model'}`}
function ranking(){const l=active,q=$('#query').value.toLowerCase();$('#ranking').innerHTML=D.after[l].filter(k=>name(k).toLowerCase().includes(q)).map(k=>{const n=D.after[l].indexOf(k)+1,p=D.before[l].indexOf(k)+1;return `<tr class="${n<=5?'focus':''}"><td>${n}</td><td>${esc(name(k))}</td><td>${value(k,l).toFixed(6)}</td><td>${p||'unranked'}</td></tr>`}).join('')}
function render(){active=$('#list').value;const a=D.after[active].slice(0,5),b=D.before[active].slice(0,5),entrants=a.filter(k=>!b.includes(k)),leavers=b.filter(k=>!a.includes(k));options('#entrant',entrants.length?entrants:a.slice(0,1));options('#leaver',leavers.length?leavers:b.slice(-1));$('#summary').textContent=`${D.changed.includes(active)?'Top five changes':'Top five unchanged'}; ${D.after[active].length} ranked rows.`;$('#five').innerHTML=a.map((k,i)=>`<tr><td>${i+1}</td><td>${esc(name(b[i]))}</td><td>${esc(name(k))}</td></tr>`).join('');radar();ranking()}
$('#list').innerHTML=Object.keys(D.after).map(l=>`<option value="${esc(l)}">${esc(listName(l))}</option>`).join('');$('#changes').innerHTML=D.changed.map(l=>`<li>${esc(listName(l))}</li>`).join('');$('#list').value='open/composites/B';$('#list').onchange=render;$('#entrant').onchange=radar;$('#leaver').onchange=radar;$('#query').oninput=ranking;render();
</script></html>'''
# Keep page script data inert against accidental tag termination.
(O/'index.html').write_text(template.replace('__DATA__',json.dumps(data,separators=(',',':')).replace('</','<\\/')))
# Static companion card: exact proposal data, no browser or model/image API.
img=Image.new('RGB',(1600,1200),'#101723');d=ImageDraw.Draw(img)
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda n:ImageFont.truetype(fontpath,n)
d.text((60,35),'JevBench v1.8.18 — ranking review',font=f(39),fill='#e4edf8')
d.text((60,100),'Nine ranked · 324 ranked · 26 top-five lists change',font=f(27),fill='#64dfb7')
d.text((60,145),'Independent fairness review: FAIR, all nine rows ranked',font=f(21),fill='#f0c886')
l='open/composites/B';a=data['after'][l][:5];b=before[l][:5];en=next(k for k in a if k not in b);lv=next(k for k in b if k not in a)
d.text((60,215),'Open-weights Composite B',font=f(28),fill='#e4edf8')
for i,k in enumerate(a):
 y=280+i*67;d.text((60,y),str(i+1),font=f(24),fill='#a3b8d3');label=models[k]['display'].split(' (')[0];label=label[:40]+'…'if len(label)>41 else label;d.text((105,y),label,font=f(22),fill='#64dfb7'if k==en else '#e4edf8');d.text((720,y),f"{models[k]['scores']['B']:.2f}",font=f(22),fill='#e4edf8')
cx,cy,r=1210,440,185;AX=['intelligence','calibration','speed','cost']
pt=lambda i,v:(cx+math.cos(i*math.pi/2-math.pi/2)*r*v/100,cy+math.sin(i*math.pi/2-math.pi/2)*r*v/100)
for n in range(20,101,20):d.line([pt(i,n)for i in range(4)]+[pt(0,n)],fill='#41516a',width=2)
for i,axis in enumerate(AX):
 x,y=pt(i,130);d.text((x-55,y-10),axis.title(),font=f(20),fill='#c3d2e6')
for k,col in [(lv,'#f49bb6'),(en,'#64dfb7')]:d.line([pt(i,models[k]['axes'][axis])for i,axis in enumerate(AX)]+[pt(0,models[k]['axes'][AX[0]])],fill=col,width=5)
d.text((980,740),'New top-five entrant',font=f(18),fill='#a3b8d3');d.text((980,775),models[en]['display'].split(' (')[0][:48],font=f(20),fill='#64dfb7');d.text((980,820),'Displaced model',font=f(18),fill='#a3b8d3');d.text((980,855),models[lv]['display'].split(' (')[0][:48],font=f(20),fill='#f49bb6')
d.text((60,740),'Four-anchor shift unchanged',font=f(25),fill='#e4edf8');d.text((60,785),'Intelligence −2.885 · Calibration −1.854',font=f(22),fill='#a3b8d3');d.text((60,835),'Separate-axis + leave-one-out checks',font=f(22),fill='#a3b8d3');d.text((60,880),'Joint-CI endpoints shown as stress tests',font=f(22),fill='#a3b8d3');d.text((60,940),'Boundary places disclosed on the candidate',font=f(23),fill='#e4edf8')
for i,line in enumerate(['Starlord 27B: 5 on open-weights Composite B', 'decide-1.1: 4 on Composite B among all systems', 'Karpo-Decision-31B: 4 on Capability Score among all systems', 'SD-JEV-4B v12.1.0: 5 on API Composite A', 'Arcbright r2: 5 on open-weights Composite A and C']):
 d.text((60,980+i*32),line,font=f(20),fill='#a3b8d3')
d.text((60,1165),'Candidate prepared for release-owner binding and sealing',font=f(18),fill='#a3b8d3')
img.save(O/'card.png')
print('Static ranking preview:',(O/'index.html').stat().st_size,'bytes; card 1600x1200; full rankings for all 40 primary lists.')
