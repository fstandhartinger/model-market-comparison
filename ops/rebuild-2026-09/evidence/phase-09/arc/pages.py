"""CR-173 (arc lane): the ARC Prize Verified results pages captured on 2026-09-26 and their plan settings.
Run from the repo root: python3 ops/rebuild-2026-09/evidence/phase-09/arc/pages.py  (rewrites the ARC-AGI-1/2
additional_sources in data/raw/benchmarks/collection-plan.json and the registry publication_urls)."""
import json,gzip,re,importlib.util
from pathlib import Path
EVID='ops/rebuild-2026-09/evidence/phase-09/arc/'
s=importlib.util.spec_from_file_location('c','scripts/collect-public-benchmarks.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
H5=['Variant','ARC-AGI-1','ARC-AGI-2','ARC-AGI-3 (Standard harness)','ARC-AGI-3 (Provider Adapter harness)']
H4=['Variant','ARC-AGI-1','ARC-AGI-2','ARC-AGI-3']
LUNA={'url':'https://arcprize.org/results/openai-gpt-6-luna','file':'ops/rebuild-2026-09/evidence/phase-09/gpt6-luna-arc/captures/184926c7cd259eddc3f7.gz',
      'sha256':'184926c7cd259eddc3f756ea32e5d8f2ef078543bf96cbe35d4460e0849f842e','retrieved_at':'2026-09-24T20:22:51.069121+00:00'}
PAGES=[
 # (slug, model, vendor, header, variants, display for None)
 ('openai-gpt-6-luna','GPT-6 Luna','OpenAI',H5,['Max','XHigh','High','Medium','Low','None'],'Non-reasoning'),
 ('openai-gpt-6-astra','GPT-6 Astra','OpenAI',H5,['Max','XHigh','High','Medium','Low','None'],'none'),
 ('anthropic-claude-fable-5-1','Claude Fable 5.1','Anthropic',H4,['Max','XHigh','High','Medium','Low'],None),
 ('anthropic-claude-opus-5-5','Claude Opus 5.5','Anthropic',H4,['Max','XHigh','High','Medium','Low'],None),
 ('google-gemini-3-8-flash','Gemini 3.8 Flash','Google',H5,['High','Medium','Low'],None),
 ('moonshot-kimi-k3','Kimi K3','Moonshot AI',H4,['Max','High','Low'],None),
 ('deepseek-v4-flash-0731','DeepSeek V4 Flash 0731','DeepSeek',H4,['Max','High','Low','None'],'none'),
 ('deepseek-v4-pro-0813','DeepSeek V4 Pro 0813','DeepSeek',H4,['Max','High','Low','None'],'none'),
]
def receipts():
    m={r['url']:r for r in json.loads(Path(EVID+'captures/manifest.json').read_text()) if r.get('status')==200}
    m[LUNA['url']]=LUNA;return m
def summary(src):
    p=re.search(r'<p class="mt-5[^"]*"[^>]*>(.*?)</p>',src,re.S)
    # tooltips are nested spans with role=tooltip; drop them so the quote is the visible sentence
    body=re.sub(r'<span role="tooltip"[^>]*>.*?</span>','',p[1],flags=re.S) if p else ''
    return re.sub(r'\s+([,.])',r'\1',c.text(body))
def spec_for(page,column):
    slug,model,vendor,header,variants,none_display=page
    r=receipts()['https://arcprize.org/results/'+slug]
    src=gzip.decompress(Path(r['file']).read_bytes()).decode()
    effort={v:v.lower() for v in variants};display={v:v.lower() for v in variants}
    if 'None' in variants:display['None']=none_display
    parser={'kind':'arc_verified_results_page','model_name':model,'vendor':vendor,'expected_header':header,'expected_variants':variants,
        'effort_map':effort,'display_effort_map':display,'benchmark_column':column,'name_field':'name','id_field':'source_id','value_field':'value'}
    rows=c.parse(src,parser,None);release=rows[0]['context']['model_release_date']
    quote=summary(src)
    protocol=(f"Official ARC Prize {model} results page ({vendor}), carrying an ARC Prize Verified badge; the date on the page, {release}, is the model's release date "
        f"(it equals modelReleaseDate in ARC Prize's leaderboard v1.json/v2.json captured 2026-09-26), and the page states no publication date of its own. Page summary (visible text, tooltips omitted): \"{quote}\" "
        f"The table lists per-variant ARC-AGI-1 and ARC-AGI-2 percentages. Basis is the evaluator-published benchmark result; source reasoning labels are retained.")
    return {'source':{k:r[k] for k in ('url','file','sha256','retrieved_at')},'parser':parser,'basis':'measured','protocol':protocol,'minimum_rows':len(variants)},rows
if __name__=='__main__':
    plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
    reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
    for e in plan['entries']:
        if e['benchmark_id'] not in('arc-agi::1','arc-agi::2'):continue
        col='ARC-AGI-'+e['benchmark_id'][-1]
        extra=[spec_for(p,col)[0] for p in PAGES]
        e['additional_sources']=extra
        e['source_urls']=[e['source']['url']]+[x['source']['url'] for x in extra]
    for e in reg['entries']:
        if e['id'] not in('arc-agi::1','arc-agi::2'):continue
        keep=[u for u in e['publication_urls'] if '/results/' not in u['url']]
        e['publication_urls']=keep+[{'url':'https://arcprize.org/results/'+p[0],'type':'official_leaderboard',
            'role':f'ARC Prize Verified {p[1]} results, with scores separated by reasoning level'} for p in PAGES]
    Path('data/raw/benchmarks/collection-plan.json').write_text(json.dumps(plan,indent=2,ensure_ascii=False)+'\n')
    Path('data/raw/benchmarks/registry.json').write_text(json.dumps(reg,indent=2,ensure_ascii=False)+'\n')
    for p in PAGES:
        for col in ('ARC-AGI-1','ARC-AGI-2'):
            sp,rows=spec_for(p,col);print(col,[(r['source_id'],r['value']) for r in rows])
    print(spec_for(PAGES[1],'ARC-AGI-1')[0]['protocol'])
