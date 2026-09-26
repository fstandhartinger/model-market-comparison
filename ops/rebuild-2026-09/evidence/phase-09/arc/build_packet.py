"""CR-173 (arc lane): build the frozen critic packet for the ARC Prize Verified results-page rows and joins.
Run from the repo root. Every excerpt is a verbatim substring of the captured page bytes (asserted)."""
import json,gzip,re,hashlib,sys
from pathlib import Path
sys.path.insert(0,'ops/rebuild-2026-09/evidence/phase-09/arc')
import pages as P
E='ops/rebuild-2026-09/evidence/phase-09/arc/'
ROUND=int(sys.argv[1]) if len(sys.argv)>1 else 1
JOINS={  # source variant -> catalog configuration; anything absent stays unjoined (reason below)
 'GPT-6 Luna':('gpt-6-luna',{'Max':'max','XHigh':'xhigh','High':'high','Medium':'medium','Low':'low','None':'non-reasoning'}),
 'GPT-6 Astra':('gpt-6-astra',{'Max':'max','XHigh':'xhigh','High':'high','Medium':'medium','Low':'low'}),
 'Claude Fable 5.1':('claude-fable-5.1',{'Max':'max','XHigh':'xhigh','High':'high','Medium':'medium','Low':'low'}),
 'Claude Opus 5.5':('claude-opus-5.5',{'Max':'max','XHigh':'xhigh','High':'high','Medium':'medium','Low':'low'}),
 'Gemini 3.8 Flash':('gemini-3.8-flash',{'High':'high','Medium':'medium','Low':'low'}),
 'Kimi K3':('kimi-k3',{'Max':'max','Low':'low'}),
 'DeepSeek V4 Flash 0731':('deepseek-v4-flash-0731',{'Max':'max'}),
 'DeepSeek V4 Pro 0813':('deepseek-v4-pro-0813',{'Max':'max'}),
}
def excerpt(src):
    parts=[]
    for pat in [r'<img\b[^>]*\balt="ARC Prize Verified"[^>]*/>',r'<h1\b[^>]*>(?:(?!</h1>).)*</h1><div\b[^>]*>(?:(?!</div>).)*</div>',
                r'<p class="mt-5[^"]*"[^>]*>.*?</p>',r'<table\b(?:(?!<table\b).)*?>Variant</th>.*?</table>']:
        m=re.search(pat,src,re.S);assert m,pat;assert m.group(0) in src;parts.append(m.group(0))
    return '\n\n'.join(parts)+'\n'
def main():
    d=json.loads(Path('data/dataset.json').read_text())
    cat={}
    for m in d['models']:cat.setdefault(m['family_key'],[]).append(m['id'])
    rec=P.receipts();coll=json.loads(Path(E+'candidate-collected.json').read_text())
    rows=[o for o in coll['observations'] if '/results/' in o['source']['url']]
    sources=[];protocols={}
    for page in P.PAGES:
        slug,model=page[0],page[1];r=rec['https://arcprize.org/results/'+slug]
        raw=gzip.decompress(Path(r['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==r['sha256']
        ex=excerpt(raw.decode());xf=E+f'excerpts/{slug}.html';Path(E+'excerpts').mkdir(exist_ok=True);Path(xf).write_text(ex)
        sources.append({'source':f'ARC Prize {model} results page','url':r['url'],'retrieved_at':r['retrieved_at'],'capture_file':r['file'],
            'capture_payload_sha256':r['sha256'],'html_excerpt_file':xf,'html_excerpt_sha256':hashlib.sha256(ex.encode()).hexdigest(),'html_excerpt':ex})
    fam_list={JOINS[m][0]:sorted(cat.get(JOINS[m][0],[])) for m in JOINS}
    art=[];ids=[]
    for o in rows:
        model,label=o['subject']['source_id'].split('|');fam,mp=JOINS[model]
        prot,ctx=o['protocol'].split('; source row: ');protocols.setdefault(o['source']['url'],prot)
        mid=f'{fam}::{mp[label]}' if label in mp else None
        if mid:assert mid in cat[fam],mid
        reason=None
        if not mid:
            reason=(f"not joined: catalog family {fam} has configurations {fam_list[fam]}; no configuration for source variant {label}"
                    +(" (GPT-6 Astra has no non-reasoning configuration)" if model=='GPT-6 Astra' else ""))
        art.append({'id':o['id'],'benchmark_id':o['benchmark_id'],'source_id':o['subject']['source_id'],'name':o['subject']['name'],'value':o['value'],'unit':o['unit'],
            'basis':o['basis'],'source_url':o['source']['url'],'published_at':o['source']['published_at'],'retrieved_at':o['source']['retrieved_at'],
            'source_sha256':o['source']['sha256'],'locator':o['source']['locator'],'source_row_context':json.loads(ctx),'proposed_model_id':mid,'unjoined_reason':reason})
        if mid:ids.append({'benchmark_id':o['benchmark_id'],'source_id':o['subject']['source_id'],'model_id':mid,
            'rule':f"ARC Prize {model} results page (ARC Prize Verified) gives the exact source variant {label}; the catalog holds exactly the configuration {mid}.",'basis':'measured'})
    cross=Path(E+'owner-crosscheck.txt').read_text().splitlines()
    manifest=[]
    only=set(sys.argv[2].split(',')) if len(sys.argv)>2 else None
    for page,src in zip(P.PAGES,sources):
        slug,model=page[0],page[1]
        if only and slug not in only:continue
        prow=[a for a in art if a['source_url']==src['url']];pids=[i for i in ids if i['source_id'].split('|')[0]==model]
        fam=JOINS[model][0]
        frozen={'artifact_id':'arc-verified-'+slug,'rows':prow,'protocol':protocols[src['url']],'identity_map_candidates':pids,
            'catalog_configurations':{fam:fam_list[fam]}}
        fz=json.dumps(frozen,indent=2,ensure_ascii=False)+'\n';Path(E+f'frozen-{slug}-r{ROUND}.json').write_text(fz)
        cx='\n'.join(cross[:2]+[l for l in cross if f' {model}|' in l])+'\n'
        packet={'artifact_id':frozen['artifact_id'],'artifact_sha256':hashlib.sha256(fz.encode()).hexdigest(),'round':ROUND,
         'review_scope':f'Review our own frozen candidate before publication: {len(prow)} measured ARC-AGI-1/ARC-AGI-2 observations parsed from the ARC Prize Verified results page for {model}, and {len(pids)} proposed identity joins to catalog configurations.'
            +(' The 12 GPT-6 Luna rows were accepted on 2026-09-24 with published_at 2026-09-22; they are re-issued with published_at null because the date on the page is the model release date.' if model=='GPT-6 Luna' else ''),
         'acceptance_criteria':CRITERIA,'source_evidence':[src],
         'owner_crosscheck_receipt':{'file':E+'owner-crosscheck.txt','note':'lines for this page only; owner-run script output','content':cx},
         'frozen_artifact':frozen,
         'required_verdict_contract':{'artifact_id':frozen['artifact_id'],'artifact_sha256':'<artifact_sha256 above>','round':ROUND,'verdict':'pass|revise|blocked',
           'coverage_checked':['one short entry per criterion id c1..c6'],'errors_found':0,'findings':[],'fixed':[],'uncertainties':[],'missing_evidence':[]}}
        pf=E+f'critic-packet-{slug}-r{ROUND}.json';Path(pf).write_text(json.dumps(packet,indent=2,ensure_ascii=False)+'\n')
        manifest.append({'slug':slug,'packet':pf,'artifact_sha256':packet['artifact_sha256'],'rows':len(prow),'joins':len(pids)})
    print(json.dumps(manifest,indent=1))
CRITERIA=[
  'c1: Every row\'s value, benchmark (ARC-AGI-1 column -> arc-agi::1, ARC-AGI-2 column -> arc-agi::2) and source variant label must match the included table excerpt exactly; unit percent; no row may come from an ARC-AGI-3 column.',
  'c2: Coverage: exactly one arc-agi::1 and one arc-agi::2 row per table variant, no duplicates, none missing, no extras.',
  'c3: The excerpt must show the ARC Prize Verified badge, a title equal to the row model, and the vendor/date line. Basis measured follows our precedent that a Verified per-model page is the evaluator\'s own published result.',
  'c4: published_at must be null; the page date is kept only as source_row_context.model_release_date, because the line under the title is the model release date (owner cross-check: it equals modelReleaseDate in ARC Prize\'s leaderboard JSON for every page; the Kimi K3 page dated Jul 16, 2026 says "As of July 31, 2026").',
  'c5: A proposed_model_id is allowed only when the source variant names an exact configuration listed in catalog_configurations (None -> non-reasoning only where that configuration exists). A variant without its own catalog configuration stays unjoined (proposed_model_id null) with a reason. Check every identity_map_candidates entry against its row.',
  'c6: The protocol text must state only what the excerpt supports (no Semi-Private claim beyond the page summary).',
  'Return pass only if every row and join is supported by the supplied evidence; otherwise revise or blocked naming exact row ids. Keep coverage_checked short (one entry per criterion).']
main()
