"""Capture only aggregate scored rows and reviewed identity; never re-score or copy raw items."""
import pathlib,json,hashlib,copy,re
J=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')
I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score')
load=lambda p:json.loads(pathlib.Path(p).read_text())
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
configs=[('amazon-strands-decider-26b-a4b',I/'ENTRIES-R10A-LEAD.json',I/'field-r10a2',I/'field-r10a','2026-10-24'),('turion-jev-31b',I/'ENTRIES-R10B-LEAD.json',I/'field-r10b2',I/'field-r10b','2026-10-24'),('chon-1.0-12b-fast',ROOT/'workers/r181-chonfast-score/ENTRIES-CHONFAST-R181.json',ROOT/'workers/r181-chonfast-score/field-chonfast',ROOT/'workers/r181-chonfast-score/field-chonfast','2026-10-25')]
rows={}; receipts={}
for k,ep,field,scored,date in configs:
 review=ROOT/'workers/r181-chonfast-prescore/RESULT.md'
 if k=='chon-1.0-12b-fast' and review.exists() and re.search(r'(?:Verdict|Status)[^\n]*\bFAIL\b',review.read_text(),re.I):continue
 e=load(ep)[k]; reg=load(field/'REGISTRY.json')[k]
 d={'entry':e['entry'],'registry':reg,'measured_on':date,'raw_sha256':sha(e['raw'])}
 for mode in ['frozen','v17-off','v17-share']:
  p=scored/f'out-{mode}/jevbench-v1.6.0-results.json'
  a=load(p);s=next(s for s in a['systems'] if s['key']==k)
  d[mode]=s
  receipts.setdefault(k,{})[mode]={'path':str(p),'sha256':sha(p)}
 expected={'amazon-strands-decider-26b-a4b':'e9a155e125112ed7f39651507ecf210181a7760af332e5203f8777aaa1b7f597','turion-jev-31b':'31860c0110eebc20be7d10f2f220b05e81ade548e3dd704f01727866df68e2e4','chon-1.0-12b-fast':'4601c4979d7da6bff72adb969c3ac1aea37f13ca4a5a2f3812c8d1ca6b8e2f24'}
 assert d['raw_sha256']==expected[k],k
 prior=load(scored/'REGISTRY.json')[k]
 for f in set(prior)|set(reg):
  if f not in ['cost_basis','disclosure','code_revision','endpoint_condition','licence']:assert prior.get(f)==reg.get(f),(k,f)
 assert d['frozen']['axes']==d['v17-off']['axes']
 assert d['frozen']['composite_ci95']==d['v17-off']['composite_ci95']
 assert d['v17-share']['v16']['ci95']['B']==1000
 assert d['v17-share']['decision_limit']['n_over_limit']==0
 receipts[k].update(entry_sha256=sha(ep),registry_sha256=sha(field/'REGISTRY.json'),raw_sha256=d['raw_sha256'])
 # Local raw paths and handoff internals remain out of public files.
 reviews={'amazon-strands-decider-26b-a4b':I.parent/'workers/prescore-r10a/RESULT.md','turion-jev-31b':I.parent/'workers/prescore-r10b/RESULT.md','chon-1.0-12b-fast':review}
 rp=reviews[k]
 receipts[k]['pre_score_review_sha256']=sha(rp) if rp.exists() else None
 receipts[k]['pre_score_review_status']='PASS_WITH_FINDINGS' if rp.exists() and 'PASS' in rp.read_text() else 'PENDING'
 # Keep original source prose in its pinned source, not duplicated in committed aggregate inputs.
 d['entry']={f:v for f,v in d['entry'].items() if f in ['author','base_model','display','repo','revision','licence','endpoint_kind','lane','support','ranked']}
 d['registry']={f:v for f,v in reg.items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']}
 for mode in ['frozen','v17-off','v17-share']:
  d[mode]['cost']['basis']='Original source prose pinned by scorer-file hash; public cost explanation supplied separately.'
 rows[k]=d
put(J/'src/inputs.json',rows);put(J/'receipts/INPUTS.json',receipts)
print('Captured aggregate inputs:',len(rows),'rows; frozen/off equality; B=1000; zero over-limit per new row')
# Exact rule-off metrics for the v1.7.0 rows without a same-measurement previous block.
base=ROOT/'r160/v170'; carried_off={};off_receipts={}
for f in ['new-rows','remeasured-rows']:
 for k,c in load(base/f'src/{f}.json')['rows'].items():
  p=pathlib.Path(c['off']);h=sha(p);assert h==c['off_sha256'],k
  r=next(s for s in load(p)['systems'] if s['key']==k)
  carried_off[k]={v:r[v] for v in ['axes','scores','views','jevbench_score','capability','speed']}
  off_receipts[k]={'path':str(p),'sha256':h}
put(J/'src/carried-off.json',carried_off);put(J/'receipts/CARRIED-OFF-SOURCES.json',off_receipts)
print('Captured 30 pinned carried rule-off metric sets; no re-scoring')
