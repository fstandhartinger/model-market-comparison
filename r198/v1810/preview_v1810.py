"""Self-contained review preview (interactive rankings + head-to-head radar) and a deterministic PNG card with the full merged ranking
(Composite A, all systems, site assembly) and two head-to-head radars; publication footer is parameterized."""
import argparse,html,json,math,pathlib
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('--publication-status',choices=['pending','published'],default='pending');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());e=L(J/'receipts/topfive-extended.json');e['rows']+=L(J/'receipts/topfive-custom.json')['rows'];d=L(J/'receipts/topfive-diff.json')
V=W/'data/raw/benchmarks/jevbench/v1.8';res=L(V/'jevbench-v1.8.10-results.json');proof=L(V/'jevbench-v1.8.10-proof.json');by={s['key']:s for s in res['systems']}
EQ=res['addendum']['equated_keys'];RK=res['addendum']['ranked_keys'];NEW=res['addendum']['new_keys'];assert NEW==['gemini-decision-1'] and all(by[k]['ranked'] for k in NEW);UN=res['addendum']['unranked_keys'];HELD=res['addendum']['held_keys'];NP=[k for k in UN if k not in HELD];assert all(by[k]['ranked'] for k in RK) and not any(by[k]['ranked'] for k in UN)
if A.publication_status=='published':
 assert proof['publication_approval']['fairness_check']['verdict']=='FAIR' and proof['publication_approval']['fairness_check_delta']['verdict']=='FAIR','published footer requires both bound FAIR verdicts'
 assert L(V/'jevbench-v1.8.10-publication.json')['review']['verdict']=='PASS','published footer requires publication PASS'
footer='Published · independent review complete' if A.publication_status=='published' else 'Release review pending'
fair=proof['publication_approval']['fairness_check']['verdict']+' / added-row delta '+proof['publication_approval']['fairness_check_delta']['verdict']
order=sorted(RK+NEW,key=lambda k:by[k]['ranks']['A'])+sorted(UN)
def row_html(k):
 s=by[k];a=s['axes'];p=s['published_scores'];sc=lambda x:'n/a' if x is None else f'{x:.2f}'
 rk=(f"A #{s['ranks']['A']} · B #{s['ranks']['B']} · C #{s['ranks']['C']} · Capability #{s['ranks']['capability']}" if s['ranked'] else 'held unranked: top-five places within the uncertainty of the draw shift (equated, not ranked)' if k in HELD else 'unranked (no price)')
 return (f"<p><strong>{html.escape(s['display'])}</strong>: {rk}. Equated: Capability {s['capability']:.2f} (published {p['capability']:.2f}), Intelligence {a['intelligence']:.2f} ({p['axes']['intelligence']:.2f}), "
         f"Calibration {a['calibration']:.2f} ({p['axes']['calibration']:.2f}), A {sc(s['scores']['A'])} ({sc(p['scores']['A'])}), B {sc(s['scores']['B'])} ({sc(p['scores']['B'])}), C {sc(s['scores']['C'])} ({sc(p['scores']['C'])}).</p>")
eqtext=(f"offset Intelligence {proof['equating']['offset']['I']:.3f} (95% CI {proof['equating']['offset_ci95']['I'][0]:.2f} to {proof['equating']['offset_ci95']['I'][1]:+.2f}), Calibration {proof['equating']['offset']['C']:.3f} "
        f"(95% CI {proof['equating']['offset_ci95']['C'][0]:.2f} to {proof['equating']['offset_ci95']['C'][1]:+.2f}), 4 anchors: {', '.join(proof['equating']['anchors'])}. Leave-one-out Intelligence {min(v['I'] for v in proof['equating']['sensitivity_leave_one_out'].values()):.2f} to {max(v['I'] for v in proof['equating']['sensitivity_leave_one_out'].values()):.2f}.")
full=L(J/'receipts/topfive-after.json')['full_rankings']['all']['composites']['A'];before=L(J/'receipts/topfive-before.json')['full_rankings']['all']['composites']['A']
brank={r['key']:r['rank'] for r in before};assert [r['key'] for r in full if r['key'] not in RK and r['key'] not in NEW]==[r['key'] for r in before]
KEY=full[[r['key'] in RK for r in full].index(True)]['key']   # best-ranked equated row
s=(J/'preview.template.html').read_text()
s=(s.replace('/*FOOTER*/',footer).replace('/*FAIR*/',html.escape(fair)).replace('/*CHANGED*/',str(d['changed_lists'])).replace('/*LISTS*/',str(d['lists'])).replace('/*NRANKED*/',str(len(RK))).replace('/*NUNRANKED*/',str(len(NP))).replace('/*NHELD*/',str(len(HELD)))
   .replace('/*REASON*/',html.escape(eqtext)).replace('/*ROWS*/',''.join(row_html(k) for k in order)).replace('/*KEY*/',KEY)
   .replace('/*OPTIONS*/',''.join(f'<option value="{k}">{html.escape(by[k]["display"])}</option>' for k in order if k in RK or k in NEW)).replace('/*DATA*/',json.dumps(e,separators=(',',':')).replace('</','<\\/')))
(J/'preview').mkdir(exist_ok=True);(J/'preview/index.html').write_text(s)
# ---- PNG card: full merged ranking (Composite A, all systems) + two head-to-head radars
COLS=4;per=math.ceil(len(full)/COLS);x0,y0,cw,lh=50,190,430,24;WD=2600;HT=y0+per*lh+150
im=Image.new('RGB',(WD,HT),'#101723');dr=ImageDraw.Draw(im);FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';F={}
def font(n,b=False):return F.setdefault((n,b),ImageFont.truetype(BOLD if b else FONT,n))
def txt(x,y,t,n=24,col='#e4edf8',b=False,anchor='la'):dr.text((x,y),t,font=font(n,b),fill=col,anchor=anchor)
off=proof['equating']['offset']
txt(50,30,'JEVBENCH v1.8.9 → v1.8.10 (combined candidate) · REVIEW PREVIEW (not published)',22,'#a3b8d3')
txt(50,70,f"The 27 Oct draw is equated (4 strong anchors: Intelligence {off['I']:.2f}, Calibration {off['C']:.2f}) and its {len(RK)} rows are ranked ({len(HELD)} held unranked)",34,b=True)
GKs=NEW[0];gs=by[GKs]
txt(50,118,f"Full merged ranking, Composite A, all {len(full)} ranked systems · green = row of the equated draw · {d['changed_lists']} of {d['lists']} watched lists change",22,'#64dfb7')
txt(50,146,f"amber = Gemini Decision 1 (Google, hosted API, same draw): A {gs['scores']['A']:.2f}, #{gs['ranks']['A']} of {len(full)}, enters no top five",22,'#ffc857')
for i,r in enumerate(full):
 c,rw=divmod(i,per);x=x0+c*cw;y=y0+rw*lh;k=r['key'];eqk=k in RK;gk=k in NEW;nm=r['display'];nm=nm[:24]+('…' if len(nm)>24 else '')
 if eqk:dr.rectangle([x-4,y-2,x+cw-14,y+lh-3],fill='#1f4a3e')
 if gk:dr.rectangle([x-4,y-2,x+cw-14,y+lh-3],fill='#5a4310')
 mv='' if eqk or gk or brank[k]==r['rank'] else f"+{r['rank']-brank[k]}"
 txt(x,y,f"{r['rank']:>3}",17,'#a3b8d3');txt(x+42,y,nm,17,'#64dfb7' if eqk else '#ffc857' if gk else '#e4edf8',eqk or gk);txt(x+cw-58,y,f"{r['score']:.2f}",17,'#e4edf8',anchor='ra');txt(x+cw-20,y,mv,14,'#a3b8d3',anchor='ra')
txt(50,y0+per*lh+10,'+n = places moved down because equated rows (or Gemini Decision 1) now sit above (no carried score changed). Scores: share view, 10 s rule.',18,'#a3b8d3')
txt(50,y0+per*lh+64,'Gemini Decision 1: Google reports 92.2 % (self-reported; 231 public v1.2 items, vendor-run, none in this draw). Our accuracy on all 1,500 items of the 27 Oct draw: 86.3 % (a yes/no answer between 20 % and 80 % counts as unsure, i.e. wrong).',18,'#ffc857')
txt(50,y0+per*lh+37,'Held unranked (equated; top-five places within the uncertainty of the shift): '+', '.join(by[k]['display'].split(' (')[0] for k in HELD)+'. Two more rows without a price stay unranked.',18,'#a3b8d3')
def radar(cx,cy,R,a,b,la,lb,title):
 ax=['intelligence','calibration','speed','cost'];names=['Intelligence','Calibration','Speed','Cost']
 txt(cx,cy-R-90,title,21,b=True,anchor='ma')
 for lvl in (25,50,75,100):
  pts=[(cx+R*lvl/100*math.sin(2*math.pi*i/4),cy-R*lvl/100*math.cos(2*math.pi*i/4)) for i in range(4)];dr.polygon(pts,outline='#344258')
 for i,n in enumerate(names):
  ex,ey=cx+(R+24)*math.sin(2*math.pi*i/4),cy-(R+24)*math.cos(2*math.pi*i/4);txt(ex,ey,n,18,'#a3b8d3',anchor='mm')
 for v,col in ((b,'#f08bb4'),(a,'#64dfb7')):
  pts=[(cx+R*v[x_]/100*math.sin(2*math.pi*i/4),cy-R*v[x_]/100*math.cos(2*math.pi*i/4)) for i,x_ in enumerate(ax)];dr.polygon(pts,outline=col,width=4)
 txt(cx,cy+R+40,la,17,'#64dfb7',anchor='ma');txt(cx,cy+R+66,lb,17,'#f08bb4',anchor='ma')
def lab(k):s=by[k];return f"{s['display'][:34]}: A {s['scores']['A']:.1f} ("+(f"#{s['ranks']['A']}" if s['ranked'] else 'held, unranked')+f"), Cap {s['capability']:.1f}"
top_old=next(r['key'] for r in full if r['key'] not in RK)            # best carried row (displaced from #1)
cands=[k for k in RK if by[k]['ranked']]
radar(2190,500,190,by[KEY]['axes'],by[top_old]['axes'],lab(KEY),lab(top_old),'Head-to-head: best newly ranked row vs previous leader')
OAI='openai-decisions';assert by[OAI]['ranked'] and by[OAI]['api_flag'];radar(2190,1130,190,by[GKs]['axes'],by[OAI]['axes'],lab(GKs),lab(OAI),'Head-to-head: Gemini Decision 1 vs OpenAI Decisions (hosted APIs)')
H2O='h2o-lightning-4b-v1.4.1';radar(2190,1760,190,by[H2O]['axes'],by['h2o-lightning-4b']['axes'],lab(H2O),lab('h2o-lightning-4b'),'Head-to-head: H2O-Lightning-4B v1.4.1 vs v1.1')
txt(50,HT-45,footer+' · fairness check '+fair+' · equated axes = published + anchor offset; confidence intervals measured on the draw before equating',20,'#a3b8d3')
im.save(J/'preview/card.png',optimize=True)
(J/'preview/README.md').write_text(f'Open index.html locally for full before/after rankings, filters, model search and the head-to-head radar. card.png ({WD}x{HT}): full merged Composite A ranking + two head-to-head radars. Footer is controlled by preview_v1810.py --publication-status pending|published (published refused until FAIR is bound and the review is PASS). No publication performed.\n')
(J/'receipts/PREVIEW.json').write_text(json.dumps({'status':'PASS','footer':footer,'png':[WD,HT],'ranked_rows_in_card':len(full),'highlighted_equated_rows':len(RK),'highlighted_added_rows':NEW,'added_row_rank_A':gs['ranks']['A'],'held_rows_in_footnote':len(HELD)},indent=1)+'\n')
print(f'PASS deterministic preview HTML and {WD}x{HT} card; footer '+A.publication_status)
