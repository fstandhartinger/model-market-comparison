"""Self-contained full ranking/radar preview and a deterministic aggregate PNG card."""
import pathlib,json,math,html
from PIL import Image,ImageDraw,ImageFont
J=pathlib.Path(__file__).resolve().parent
L=lambda p:json.loads(p.read_text())
e=L(J/'receipts/topfive-extended.json');d=L(J/'receipts/topfive-diff.json')
text='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JevBench v1.7.3 review preview</title><style>
*{box-sizing:border-box}body{margin:0;background:#101723;color:#e4edf8;font:16px system-ui}main{max-width:1440px;margin:auto;padding:32px}p{max-width:1050px;line-height:1.6}small,.muted{color:#a3b8d3}select,input,button{background:#20334b;color:#fff;border:1px solid #526882;padding:10px;border-radius:6px}label{margin:8px 12px 8px 0;display:inline-block}section{margin-top:28px;background:#172234;padding:22px;border-radius:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #344258;text-align:left}tr.focus{background:#23473e}tr.out{background:#50364a}.scroll{max-height:600px;overflow:auto}#radar{max-width:420px;width:100%;display:block;margin:auto}a{color:#74d4bb}@media(max-width:850px){.grid{grid-template-columns:1fr}main{padding:16px}}</style>
<main><small>LOCAL REVIEW PREVIEW · publication review PENDING · fairness PENDING</small><h1>Chon-1.0-E4B: CPU → GPU</h1>
<p>JevBench v1.7.2 → v1.7.3. Same system, pinned weights, configuration and draw; the GPU measurement replaces the CPU measurement in full. No method change. The other 288 rows keep every score and confidence interval; placements move. The preceding CPU measurement remains in row history.</p>
<p><b>28 of 252 variant lists change:</b> frozen 10 · rule-off 10 · 10-second share 8. The site assembly independently checks 40 lists: one changes, open Composite A. Chon enters at <b>#1 open Emphasis on Cost</b> (both caps settings). All API top fives remain unchanged.</p>
<details><summary>Measurement and comparison details</summary><p>1,500 answers; zero over 10 seconds. GPU Capability 68.503, share Speed 88.710, Cost axis 70.746. Exact listed cost remains USD 0.009443245791245792 / 1,000 decisions. There are probability differences from the CPU run on 1,049 items, with nine argmax changes; CPU/CUDA numerical paths are plausible, but exact causality is unproven. No retuning or replay. GPU telemetry CSV is empty. Frozen and rule-off GPU scores and intervals match exactly.</p><p>The frozen/off comparisons retain existing per-row published values from the previous release's captured sources; only Chon is replaced. Each selected list displays its full ranking, with ties preserving predecessor composite order. This preview and its synthetic test fixture grant no publication authority. The real candidate manifest and fairness input remain PENDING.</p></details>
<section><h2>Choose a ranking</h2><label><input id="only" type="checkbox" checked> Changed lists only</label><label>Filter <input id="query" type="search" placeholder="Cost, open, share…"></label><label>List <select id="list"></select></label><p id="summary"></p></section>
<section class="grid"><div><h2>New entrant vs displaced row</h2><p id="pair"></p><svg id="radar" viewBox="0 0 440 360" role="img" aria-label="Head-to-head Intelligence, Calibration, Speed and Cost radar"></svg><small>Green: Chon GPU · Pink: displaced row. Each axis ranges from 0 to 100.</small></div><div><h2>Top-five changes</h2><table><thead><tr><th>Before<th>After</tr></thead><tbody id="five"></tbody></table></div></section>
<section><h2>Full ranking</h2><label>Find model <input id="model" type="search" placeholder="Model name or key"></label><div class="scroll"><table><thead><tr><th>Rank<th>System<th>Score<th>Before rank<th>Move</tr></thead><tbody id="ranking"></tbody></table></div></section>
<details><summary>All changed lists (28)</summary><ul id="changes"></ul></details><p class="muted">Scores and placements are provisional internal candidate calculations. Approval records are for the lead's review. No publication performed.</p></main>
<script>const evidence=DATA,rows=evidence.rows,models=evidence.models,KEY='chon-1.0-e4b';let selected;
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),label=r=>`${r.variant} / ${r.scope} / ${r.caps} / ${r.metric}`;
function options(){const q=$('#query').value.toLowerCase(),only=$('#only').checked,old=$('#list').value;$('#list').innerHTML=rows.map((r,i)=>({r,i})).filter(({r})=>(!only||r.changed)&&label(r).toLowerCase().includes(q)).map(({r,i})=>`<option value="${i}">${esc(label(r))}</option>`).join('');if([...$('#list').options].some(o=>o.value===old))$('#list').value=old;render()}
function radar(a,b){const cx=220,cy=180,R=125,axes=['intelligence','calibration','speed','cost'],point=(i,v)=>[cx+Math.sin(i*Math.PI/2)*R*v/100,cy-Math.cos(i*Math.PI/2)*R*v/100],poly=(vals)=>vals.map((v,i)=>point(i,v).join(',')).join(' ');let svg='';for(const n of [25,50,75,100])svg+=`<polygon points="${poly([n,n,n,n])}" fill="none" stroke="#41516a"/>`;axes.forEach((k,i)=>{const p=point(i,100),t=point(i,126);svg+=`<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="#41516a"/><text x="${t[0]}" y="${t[1]}" text-anchor="middle" fill="#c3d2e6" font-size="12">${k[0].toUpperCase()+k.slice(1)}</text>`});for(const [r,col]of [[b,'#f49bb6'],[a,'#64dfb7']])if(r)svg+=`<polygon points="${poly(axes.map(k=>Math.max(0,Math.min(100,r.axes[k]))))}" stroke="${col}" fill="${col}" fill-opacity="0.13" stroke-width="3"/>`;$('#radar').innerHTML=svg}
function render(){const r=rows[Number($('#list').value)];if(!r||!$('#list').options.length){$('#summary').textContent='No matching lists';return}selected=r;const m=models[r.variant],name=k=>m.after[k]?.display??m.before[k]?.display??k,out=r.before.find(k=>!r.after.includes(k))??r.before[4],a=m.after[KEY],b=m.before[out];$('#summary').textContent=`${label(r)} — ${r.changed?'top five changed':'top five unchanged'}. ${r.full_after.length} ranked rows.`;$('#pair').textContent=`${a.display} vs ${name(out)}${r.changed?' (leaves top five)':' (previous #5; no top-five displacement)'}`;radar(a,b);$('#five').innerHTML=Array.from({length:5},(_,i)=>`<tr><td>${i+1}. ${esc(name(r.before[i]))}</td><td>${i+1}. ${esc(name(r.after[i]))}</td></tr>`).join('');ranking()}
function ranking(){const r=selected;if(!r)return;const m=models[r.variant],before=new Map(r.full_before.map(x=>[x.key,x.rank])),q=$('#model').value.toLowerCase();$('#ranking').innerHTML=r.full_after.filter(x=>`${x.key} ${m.after[x.key]?.display}`.toLowerCase().includes(q)).map(x=>{const old=before.get(x.key),move=old?old-x.rank:null;return `<tr class="${x.key===KEY?'focus':''}"><td>${x.rank}</td><td>${esc(m.after[x.key]?.display??x.key)}</td><td>${x.score.toFixed(6)}</td><td>${old??'unranked'}</td><td>${move===null?'new':move>0?'↑ '+move:move<0?'↓ '+(-move):'—'}</td></tr>`}).join('')}
$('#changes').innerHTML=rows.filter(r=>r.changed).map(r=>`<li>${esc(label(r))}</li>`).join('');$('#only').onchange=options;$('#query').oninput=options;$('#list').onchange=render;$('#model').oninput=ranking;options();$('#list').value=rows.findIndex(r=>r.variant==='share'&&r.scope==='open'&&r.caps==='official'&&r.metric==='view/Emphasis on Cost 20:20:60');render();</script></html>'''
(J/'preview/index.html').write_text(text.replace('DATA',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
# Card uses the same selected ranking and radar data as the interactive default.
r=next(r for r in e['rows'] if r['variant']=='share' and r['scope']=='open' and r['caps']=='official' and r['metric']=='view/Emphasis on Cost 20:20:60')
m=e['models']['share'];k='chon-1.0-e4b';out=next(k for k in r['before'] if k not in r['after'])
im=Image.new('RGB',(1440,900),'#101723');dr=ImageDraw.Draw(im)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f=lambda n,b=False:ImageFont.truetype(bold if b else font,n)
def txt(x,y,t,n=24,col='#e4edf8',b=False):dr.text((x,y),t,font=f(n,b),fill=col)
txt(60,40,'JEVBENCH v1.7.2 → v1.7.3  ·  REVIEW PREVIEW',22,'#a3b8d3')
txt(60,90,'Chon-1.0-E4B: CPU → GPU',45,b=True)
txt(60,160,'Same system and configuration · CPU measurement replaced · no method change',23)
txt(60,215,'28 top-five list changes',32,'#64dfb7',True)
txt(60,263,'Frozen 10  /  Rule-off 10  /  10-second share 8',23)
txt(60,310,'#1 open — Emphasis on Cost',29,b=True)
txt(60,355,'10-second share · official caps',21,'#a3b8d3')
for i,key in enumerate(r['after']):
 name=m['after'][key]['display'];name=name if len(name)<=43 else name[:42]+'…'
 txt(70,405+i*54,f'{i+1}. {name}',24,'#64dfb7' if key==k else '#e4edf8',key==k)
txt(60,715,'Displaces: '+m['before'][out]['display'],22,'#f49bb6')
cx,cy,R=1090,490,190;axes=['intelligence','calibration','speed','cost']
def pts(vals):return [(cx+math.sin(i*math.pi/2)*R*v/100,cy-math.cos(i*math.pi/2)*R*v/100) for i,v in enumerate(vals)]
for v in [25,50,75,100]:dr.line(pts([v]*4)+[pts([v]*4)[0]],fill='#41516a',width=2)
for i,a in enumerate(axes):
 p=pts([100]*4)[i];dr.line([(cx,cy),p],fill='#41516a',width=2)
 x,y=pts([125]*4)[i];dr.text((x,y),a.title(),anchor='mm',font=f(21),fill='#c3d2e6')
for row,col in [(m['before'][out],'#f49bb6'),(m['after'][k],'#64dfb7')]:
 p=pts([max(0,min(100,row['axes'][a])) for a in axes]);dr.line(p+[p[0]],fill=col,width=5)
txt(860,205,'GPU vs displaced row',26,b=True)
txt(850,750,'GPU Capability 68.503 · Speed 88.710',21,'#64dfb7')
txt(60,815,'288 other rows retain all scores and CIs. Publication and fairness review remain PENDING.',21,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
(J/'preview/README.md').write_text('Open index.html locally. Self-contained full before/after rankings for all 252 variant lists, changed-list filter, model search, and entrant/displaced-row radar. card.png uses the share/open/official Emphasis on Cost list. Both artifacts are aggregate-only and grant no publication authority.\n')
print('Built interactive preview and deterministic 1440x900 PNG card')
