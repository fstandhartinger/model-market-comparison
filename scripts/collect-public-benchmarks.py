#!/usr/bin/env python3
"""Parse captured public sources; all transforms are data parsing, never JS execution."""
import argparse,csv,gzip,hashlib,html,io,json,math,re,sys,os,tempfile
from pathlib import Path
from html.parser import HTMLParser
from datetime import datetime

class Tables(HTMLParser):
    def __init__(self):
        super().__init__();self.tables=[];self.table=None;self.row=None;self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='table':self.table=[];self.tables.append(self.table)
        elif self.table is not None and tag=='tr':self.row=[];self.table.append(self.row)
        elif self.row is not None and tag in ['td','th']:self.cell=[];self.row.append(self.cell)
    def handle_endtag(self,tag):
        if tag=='table':self.table=None
        elif tag=='tr':self.row=None
        elif tag in ['td','th']:self.cell=None
    def handle_data(self,data):
        if self.cell is not None:self.cell.append(data)

def text(value):
    value=str(value)
    # Link destinations may contain balanced parentheses, including URL fragments.
    while True:
        match=re.search(r'\[([^\]]+)\]\(',value)
        if not match:break
        depth=1;end=match.end()
        while end<len(value) and depth:
            if value[end]=='\\':end+=2;continue
            if value[end]=='(':depth+=1
            elif value[end]==')':depth-=1
            end+=1
        if depth:raise ValueError('Unterminated Markdown link')
        value=value[:match.start()]+match[1]+value[end:]
    return ' '.join(html.unescape(re.sub('<[^>]*>',' ',value)).replace('**','').split()).strip()

def numeric(value):
    if value is None:return None
    if isinstance(value,bool):raise ValueError('Boolean is not a score')
    if isinstance(value,(float,int)):
        if not math.isfinite(value):raise ValueError('Nonfinite score')
        return value
    value=text(value)
    if value in ['', '-', '—', '–', 'N/A', 'n/a', 'NA', 'NaN']:return None
    # Published confidence intervals are ancillary, never part of the point estimate.
    match=re.fullmatch(r'\$?\s*([-+]?\d[\d,]*(?:\.\d+)?)(?:\s*(?:%|\*))?(?:\s*(?:±|\+/-|\(|\[).*)?',value)
    if not match:raise ValueError('Unexpected numeric cell: '+value[:100])
    return float(match[1].replace(',',''))

def at(value,path):
    for key in path.split('.') if path else []:value=value[int(key)] if isinstance(value,list) else value[key]
    return value

def csvrows(source):
    reader=csv.DictReader(io.StringIO(source.strip().lstrip('\ufeff')))
    if not reader.fieldnames or len(set(reader.fieldnames))!=len(reader.fieldnames):raise ValueError('Missing/duplicate CSV headers')
    rows=list(reader)
    if any(None in r for r in rows):raise ValueError('CSV row width mismatch')
    return rows

def static_json(source,start):
    # Only strict JSON literals are decoded. Function calls/interpolation are rejected.
    value,_=json.JSONDecoder().raw_decode(source[start:].lstrip());return value

def parse(source,spec,load_source):
    kind=spec['kind'];rows=[]
    if kind=='template_csv':
        match=re.search(r'\b'+re.escape(spec['variable'])+r'\s*=\s*`([^`]+)`',source,re.S)
        if not match or '${' in match[1]:raise ValueError('Missing/static CSV literal changed')
        rows=csvrows(match[1])
    elif kind=='csv':
        rows=csvrows(source)
        # Optional version guards: an exact header and per-row constants (e.g. the question count).
        if 'require_header' in spec and list(rows[0].keys() if rows else [])!=spec['require_header']:raise ValueError('CSV header changed')
        for field,expected in spec.get('require_values',{}).items():
            if any(r.get(field)!=expected for r in rows):raise ValueError(f'CSV {field} differs from {expected}')
    elif kind=='json':rows=at(json.loads(source),spec.get('row_path',''))
    elif kind=='json_assignment':
        match=re.search(r'\b'+re.escape(spec['variable'])+r'\s*=\s*',source)
        if not match:raise ValueError('Missing JSON assignment')
        rows=at(static_json(source,match.end()),spec.get('row_path',''))
    elif kind=='simplebench':
        # The MCQ array is bounded before the separately named open-ended board.
        match=re.search(r'const leaderboardData = \[(.*?)\];',source,re.S)
        if not match:raise ValueError('Missing MCQ leaderboard literal')
        for obj in re.findall(r'\{([^{}]+)\}',match[1]):
            fields=dict(re.findall(r'(\w+):\s*"([^"\n]*)"',obj))
            if 'Human' in fields.get('model',''):continue
            if 'model' not in fields or 'score' not in fields:raise ValueError('MCQ row schema changed')
            rows.append(fields)
    elif kind=='html_table':
        p=Tables();p.feed(source);table=p.tables[spec['table_index']]
        if not table or not all(word in text(' '.join(' '.join(c) for c in table[0])) for word in spec['header_contains']):raise ValueError('HTML header/version changed')
        # Opt-in page guards (2026-09-21, Blueprint-Bench 2): statements the page must still make (task, scale,
        # footnotes), and value-cell markers the page defines, kept per row because text() strips `**`.
        page=text(source)
        for phrase in spec.get('require_text',[]):
            if phrase not in page:raise ValueError('Page statement changed: '+phrase[:80])
        markers=spec.get('value_markers',{})
        # Opt-in section rows (2026-09-22, VITA-Bench): a one-cell row names the setting of the rows below it
        # ("Thinking Models"); the same model then appears once per section, so the name becomes "<section>|<model>".
        # An unknown one-cell row, or a data row before the first section, fails closed.
        sections=spec.get('section_rows');section=None
        for index,r in enumerate(table[spec.get('header_rows',1):],spec.get('header_rows',1)):
            cells=[text(' '.join(c)) for c in r]
            if sections is not None and len(cells)==1:
                if cells[0] not in sections:raise ValueError('Unknown HTML table section: '+cells[0][:80])
                section=cells[0];continue
            if len(cells)!=spec['width']:continue # Detail/footnote rows have a distinct width.
            if sections is not None and section is None:raise ValueError('HTML table row before the first section')
            name=cells[spec['name_column']] if sections is None else section+'|'+cells[spec['name_column']]
            for column,label in spec.get('value_columns',[[spec['value_column'],None]]):
                raw=' '.join(' '.join(r[column]).split())
                marked=[meaning for marker,meaning in markers.items() if raw.endswith(marker) and not raw.endswith('*'+marker)]
                rows.append({'name':name,'value':cells[column], 'source_row':index,'context':{'cells':cells,'configuration':label,'value_column':column,**({'section':section} if sections is not None else {}),**({'marker':marked[0]} if marked else {})}})
        if spec.get('unique_names'):
            names=[row['name'] for row in rows]
            if len(set(names))!=len(names):raise ValueError('Duplicate model rows in HTML table')
    elif kind=='arc_verified_results_page':
        model=spec['model_name']
        titles=[text(m) for m in re.findall(r'<h1\b[^>]*>(.*?)</h1>',source,re.S)]
        if titles!=[model]:raise ValueError('ARC Prize results page title changed or is ambiguous')
        if not re.search(r'<img\b[^>]*\balt=["\']ARC Prize Verified["\']',source):raise ValueError('ARC Prize Verified badge missing')
        # The line under the title reads "<vendor> · <date> · <n> ...". The date is the MODEL's release
        # date, not the page's publication date: on every captured page it equals the leaderboard JSON's
        # modelReleaseDate, and the Kimi K3 page (Jul 16, 2026) itself says "As of July 31, 2026".
        # (CR-173, 2026-09-26: the first Luna rows had stored it as published_at.) The page states no
        # publication date of its own, so published_at stays null.
        meta=re.search(r'<h1\b[^>]*>.*?</h1>\s*<div\b[^>]*>(.*?)</div>',source,re.S)
        released=re.search(r'^'+re.escape(spec['vendor'])+r'\s*[·]\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s*[·]',text(meta[1]) if meta else '')
        if not released:raise ValueError('ARC Prize results page vendor or model release date missing or changed')
        released_at=datetime.strptime(released[1],'%b %d, %Y').date().isoformat()
        parser=Tables();parser.feed(source)
        tables=[table for table in parser.tables if table and [text(' '.join(cell)) for cell in table[0]]==spec['expected_header']]
        if len(tables)!=1:raise ValueError('ARC Prize verified-scores table missing or ambiguous')
        table=tables[0];labels=[text(' '.join(row[0])) for row in table[1:] if row]
        if labels!=spec['expected_variants']:raise ValueError('ARC Prize reasoning-variant coverage changed: '+json.dumps(labels))
        column=spec['expected_header'].index(spec['benchmark_column'])
        for index,row in enumerate(table[1:],1):
            cells=[text(' '.join(cell)) for cell in row]
            if len(cells)!=len(spec['expected_header']):raise ValueError('ARC Prize verified-scores row width changed')
            label=cells[0];effort=spec['effort_map'].get(label)
            if not effort:raise ValueError('ARC Prize reasoning effort is unmapped: '+label)
            value=numeric(cells[column])
            if value is None or not 0<=value<=100:raise ValueError('ARC Prize verified score is missing or outside 0–100')
            rows.append({'name':f"{model} ({spec['display_effort_map'][label]})",'source_id':f'{model}|{label}',
                'value':value,'published_at':None,'source_row':index,
                'context':{'page_model':model,'page_vendor':spec['vendor'],'source_variant':label,'reasoning_effort':effort,
                    'benchmark_column':spec['benchmark_column'],'cells':cells,'model_release_date':released_at}})
    elif kind=='astro_props':
        # Astro serialises island props as [type, value] pairs; only plain values (0) and arrays (1) are decoded.
        islands=[m.group(0) for m in re.finditer(r'<astro-island\b[^>]*>',source) if spec['component'] in m.group(0)]
        if len(islands)!=1:raise ValueError('Astro island missing or ambiguous: '+spec['component'])
        props=re.search(r'\sprops="([^"]*)"',islands[0])
        if not props:raise ValueError('Astro island has no props')
        def astro(v):
            if not (isinstance(v,list) and len(v)==2 and isinstance(v[0],int)):raise ValueError('Unsupported Astro prop encoding')
            if v[0]==1:return [astro(x) for x in v[1]]
            if v[0]!=0:return {'$astro_type':v[0]} # Dates, maps, URLs etc. are never score cells; rows containing them are rejected below.
            return {k:astro(x) for k,x in v[1].items()} if isinstance(v[1],dict) else v[1]
        # Top-level props may be raw literals; everything below them is pair-encoded.
        value={k:astro(v) if isinstance(v,list) and len(v)==2 and isinstance(v[0],int) else v for k,v in json.loads(html.unescape(props[1])).items()}
        for path,expected in spec.get('require',{}).items():
            if at(value,path)!=expected:raise ValueError(f'Source version guard failed: {path}')
        board=at(value,spec['row_path'])
        if not isinstance(board,dict):raise ValueError('Astro row map changed')
        # 2026-09-16: Vals added a nested `token_totals` object to every row. A nested field is accepted only when the
        # plan names it (it is never a score and is dropped); any other nested field still fails closed.
        ignored=set(spec.get('ignored_nested_fields',[]))
        for index,(key,fields) in enumerate(board.items()):
            if not isinstance(fields,dict):raise ValueError('Astro row schema changed')
            fields={k:v for k,v in fields.items() if not (k in ignored and isinstance(v,(dict,list)))}
            if any(isinstance(x,(dict,list)) for x in fields.values()):raise ValueError('Astro row schema changed')
            rows.append({**fields,'name':key,'source_row':index,'context':{'task':spec['row_path'].rsplit('.',1)[-1],**{k:fields.get(k) for k in spec.get('context_keys',[])}}})
    elif kind=='effort_runs_json':
        # {data: {model: {effort: {subset: {...}}}}}; one row per published model and effort, never averaged.
        board=at(json.loads(source),spec.get('row_path',''))
        for path,expected in spec.get('require',{}).items():
            if at(board,path)!=expected:raise ValueError(f'Source version guard failed: {path}')
        if not isinstance(board.get('data'),dict):raise ValueError('Run map changed')
        index=0
        for model,efforts in board['data'].items():
            if not isinstance(efforts,dict):raise ValueError('Run schema changed')
            for effort,subsets in efforts.items():
                leaf=subsets.get(spec['subset']) if isinstance(subsets,dict) else None
                fields=leaf if isinstance(leaf,dict) else {}
                rows.append({spec.get('value_field','value'):None,**fields,'name':f'{model} · {effort}','id':f'{model}|{effort}','harness':(board.get('harness') or {}).get(model),'source_row':index,
                    'context':{'model':model,'effort':effort,'subset':spec['subset'],'harness':(board.get('harness') or {}).get(model),**{k:fields.get(k) for k in spec.get('context_keys',[])}}})
                index+=1
    elif kind=='markdown_table':
        lines=source.splitlines();start=next((i for i,l in enumerate(lines) if spec['header_contains'] in l and l.strip().startswith('|')),None)
        if start is None:raise ValueError('Markdown table header changed')
        for i in range(start+2,len(lines)):
            line=lines[i]
            if '|' not in line:break
            cells=[text(v) for v in line.strip().strip('|').split('|')]
            if len(cells)<=max(spec['name_column'],spec['value_column']):
                if not spec.get('allow_ragged'):raise ValueError('Markdown row truncated')
                cells += [''] * (max(spec['name_column'],spec['value_column'])+1-len(cells))
            rows.append({'name':cells[spec['name_column']],'value':cells[spec['value_column']], 'source_row':i+1,'context':cells})
    elif kind=='swebench':
        match=re.search(r'<script[^>]+id=["\']leaderboard-data["\'][^>]*>(.*?)</script>',source,re.S)
        if not match:raise ValueError('Missing embedded SWE results')
        board=next((r for r in json.loads(match[1]) if r['name']==spec['board']),None)
        if not board:raise ValueError('Missing SWE split')
        rows=board['results']
    elif kind=='mmmu':
        rows=[]
        for row in json.loads(source)['leaderboardData']:
            if row['info']['type']=='human_expert':continue
            for split in ['validation','test']:
                if split in row and row[split].get('overall') is not None:
                    rows.append({'name':row['info']['name'],'value':row[split]['overall'],'id':row['info']['name']+'/'+split,'context':{'split':split,'info':row['info'],'source':row[split].get('source')}})
    elif kind=='slop_composite':
        rawrows=json.loads(source)['results'];keys=['slop_list_matches_per_1k_words','not_x_but_y_per_1k_chars','slop_trigram_matches_per_1k_words'];weights=[.6,.25,.15]
        method=load_source(spec['method_source'])
        if 'min: min - range * 0.1' not in method or '(normWords * 0.6 + normContrast * 0.25 + normTrigrams * 0.15) * 100' not in method:raise ValueError('Slop methodology changed')
        bounds=[]
        for key in keys:
            values=[r['metrics'].get(key,0) for r in rawrows];lo=min(values);hi=max(values);width=hi-lo
            if width==0:raise ValueError('Undefined source normalization range')
            bounds.append((lo-width*.1,hi+width*.1))
        for row in rawrows:
            inputs=[numeric(row['metrics'].get(k,0)) for k in keys]
            value=sum(max(0,min(1,(v-lo)/(hi-lo)))*w for v,(lo,hi),w in zip(inputs,bounds,weights))*100
            rows.append({'name':row['model'],'value':value,'derivation':{'formula':'Source composite: 0.6 words + 0.25 contrast + 0.15 trigrams, each min-max normalized with 10% extended bounds and clipped 0..1; ×100. Bounds='+json.dumps(bounds),'inputs':inputs}})
    elif kind=='scale_swepro':
        arrays=[];boardkeys=[]
        def scan(v):
            if isinstance(v,dict):
                if isinstance(v.get('entries'),list) and v['entries'] and 'model' in v['entries'][0] and 'score' in v['entries'][0]:
                    arrays.append(v['entries']);boardkeys.append(v.get('key'))
                for c in v.values():scan(c)
            elif isinstance(v,list):
                for c in v:scan(c)
        chunks=[]
        for raw in re.findall(r'<script[^>]*>self\.__next_f\.push\((\[.*?\])\)</script>',source,re.S):
            pair=json.loads(raw)
            if pair[0]==1 and isinstance(pair[1],str):chunks.append(pair[1])
        for line in ''.join(chunks).splitlines():
            if ':' not in line:continue
            try:record=json.loads(line.split(':',1)[1])
            except json.JSONDecodeError:continue
            scan(record)
        # The same Scale Labs board shape serves several leaderboards; the plan names the page identity
        # (SWE Atlas boards share navigation text, so their guard is the page title).
        required=spec.get('require_text','swe_bench_pro_public')
        required=[required] if isinstance(required,str) else required
        if any(t not in source for t in required):raise ValueError('Scale leaderboard source identity changed')
        # 2026-09-24: labs.scale.com began serving the private dataset's board from the same page as
        # the public one, so "the page carries exactly one entries array" stopped being a way to name
        # a board — the guard fired every day and swe-bench-pro-public was retained. A plan that says
        # which dataset it means selects by the page's own `key`, and still fails closed if that key
        # is absent or matches more than one board. A plan that does not keeps the old rule, so a
        # board that silently grows a second array is still refused rather than guessed at, and the
        # older unkeyed captures (2026-09-10) stay readable for provenance replays.
        wanted=spec.get('dataset_key')
        if wanted is not None and any(k is not None for k in boardkeys):
            matched=[a for a,k in zip(arrays,boardkeys) if k==wanted]
            if len(matched)!=1:raise ValueError('Scale leaderboard dataset %r missing or ambiguous (%d of %d boards)'%(wanted,len(matched),len(arrays)))
            rows=matched[0]
        else:
            if len(arrays)!=1:raise ValueError('Scale leaderboard source identity changed')
            rows=arrays[0]
    elif kind in ('lmarena_leaderboard','lmarena_agent'):
        # 2026-09-26 (CR-173): arena.ai (LMArena) leaderboard pages ship their table as Next.js flight data.
        # lmarena_leaderboard: the one object whose leaderboard.id is the plan's `leaderboard_id` (a Bradley-Terry
        # rating board such as WebDev); lmarena_agent: the one `snapshot` next to arena.slug == "agent" (Agent
        # Arena's net-improvement board). Anything else (no match, two matches, a changed row shape) fails closed.
        chunks=[]
        for raw in re.findall(r'<script[^>]*>self\.__next_f\.push\((\[.*?\])\)</script>',source,re.S):
            pair=json.loads(raw)
            if pair[0]==1 and isinstance(pair[1],str):chunks.append(pair[1])
        found=[]
        def walk(v):
            if isinstance(v,dict):
                if kind=='lmarena_leaderboard' and isinstance(v.get('leaderboard'),dict) and v['leaderboard'].get('id')==spec['leaderboard_id'] and isinstance(v['leaderboard'].get('entries'),list):found.append(v['leaderboard'])
                if kind=='lmarena_agent' and isinstance(v.get('arena'),dict) and v['arena'].get('slug')=='agent' and isinstance(v.get('snapshot'),dict) and isinstance(v['snapshot'].get('rows'),list):found.append(v['snapshot'])
                for c in v.values():walk(c)
            elif isinstance(v,list):
                for c in v:walk(c)
        for line in ''.join(chunks).splitlines():
            if ':' not in line:continue
            try:record=json.loads(line.split(':',1)[1])
            except json.JSONDecodeError:continue
            walk(record)
        unique=[]
        for f in found:
            if f not in unique:unique.append(f)
        if len(unique)!=1:raise ValueError('LMArena board missing or ambiguous (%d)'%len(unique))
        board=unique[0]
        if kind=='lmarena_leaderboard':
            if not board['entries'] or any(not {'modelKey','modelDisplayName','rating','ratingLower','ratingUpper','votes','rank'}<=set(r) for r in board['entries']):raise ValueError('LMArena row shape changed')
            # The harness is part of LMArena's own model key ("…-code-codex-harness", "…-code-arena-harness").
            harness=lambda key:'Codex harness' if 'codex-harness' in key else 'Code Arena harness' if 'code-arena-harness' in key else None
            rows=[{'id':r['modelKey'],'name':r['modelDisplayName'],'value':r['rating'],'harness':harness(r['modelKey']),
                   'context':{k:r.get(k) for k in ('rank','rankUpper','rankLower','ratingLower','ratingUpper','votes','modelOrganization','releaseType')}|{'voteCutoffISOString':board.get('voteCutoffISOString'),'totalVotes':board.get('totalVotes')}} for r in board['entries']]
        else:
            if not board['rows'] or any(not {'contenderName','model','avgScore','sessions','rank'}<=set(r) or not isinstance(r['avgScore'],dict) for r in board['rows']):raise ValueError('LMArena agent row shape changed')
            rows=[{'id':r['contenderName'],'name':r['model'],'value':r['avgScore'].get('value'),
                   'context':{'rank':r['rank'],'rankSpread':r.get('rankSpread'),'ci95':r['avgScore'].get('ci'),'pipelines':r['avgScore'].get('pipelines'),'sessions':r['sessions'],'modelOrganization':r.get('modelOrganization'),'lastUpdated':board.get('lastUpdated')}} for r in board['rows']]
    elif kind=='terminalbench':
        chunks=[]
        for raw in re.findall(r'<script[^>]*>self\.__next_f\.push\((\[.*?\])\)</script>',source,re.S):
            pair=json.loads(raw)
            if pair[0]==1 and isinstance(pair[1],str):chunks.append(pair[1])
        def objects(value):
            if isinstance(value,dict):
                yield value
                for child in value.values():yield from objects(child)
            elif isinstance(value,list):
                for child in value:yield from objects(child)
        found=[]
        for line in ''.join(chunks).splitlines():
            if ':' not in line:continue
            try:record=json.loads(line.split(':',1)[1])
            except json.JSONDecodeError:continue
            for obj in objects(record):
                if obj.get('queryKey')==['leaderboard','terminal-bench/terminal-bench','4-0-0']:found.append(obj['state']['data'])
        if len(found)!=1 or found[0]['leaderboard']['name']!='4-0-0':raise ValueError('Terminal-Bench version/query changed')
        rows=[{'id':r['id'],'name':r['metadata']['model_display']['label'],'value':r['metrics']['accuracy'],
               'harness':r['metadata']['agent_display']['label'],'effort':r['metadata']['reasoning_effort'],
               'context':r['metadata'],'trials':r['metrics']['n_trials']} for r in found[0]['rows'] if r['status']=='display']
    elif kind=='livebench':
        rows=csvrows(source);categories=json.loads(load_source(spec['categories_source']))
        frontend=load_source(spec['frontend_source'])
        if 'grok-3-thinking"===e.model)return 72' not in frontend or 'grok-3"===e.model)return 58' not in frontend:raise ValueError('LiveBench override implementation changed')
        if len(categories)!=7:raise ValueError('LiveBench category protocol changed')
        for row in rows:
            inputs=[numeric(row[k]) for ks in categories.values() for k in ks]
            if any(v is None for v in inputs):row['value']=None;continue
            means=[sum(numeric(row[k]) for k in ks)/len(ks) for ks in categories.values()]
            row['value']={'grok-3-thinking':72,'grok-3':58}.get(row['model'],float(f'{sum(means)/len(means):.2f}'))
            row['derivation']={'formula':'Mean of seven category means, rounded to the published 2 decimals; source Grok-3 Thinking=72 and Grok-3=58 overrides retained.', 'inputs':inputs}
    elif kind=='vite_board_runs':
        # Row literals ship inside the page's own Vite module bundle. Minified
        # variable names change every deploy, so identity anchors are only the
        # leaderboard header literal, the cua/api board-map shape and n per row.
        header=json.dumps(spec['require_header'],separators=(',',':'))
        if header not in source:raise ValueError('Leaderboard header literal changed')
        maps=re.findall(r'([\w$]+)=\{cua:\{runs:([\w$]+),note:[\w$]+\},api:\{runs:([\w$]+),note:[\w$]+\}\}',source)
        if len(maps)!=1:raise ValueError('Board map missing or ambiguous')
        if spec['board'] not in ('cua','api'):raise ValueError('Unknown board: '+str(spec['board']))
        var=maps[0][1] if spec['board']=='cua' else maps[0][2]
        starts=list(re.finditer(r'(?<![\w$.])'+re.escape(var)+r'=\[',source))
        if len(starts)!=1:raise ValueError('Board array missing or ambiguous')
        end=source.find(']',starts[0].end())
        if end<0:raise ValueError('Board array not terminated')
        body=source[starts[0].end():end]
        if not re.fullmatch(r'\{[^{}]*\}(,\{[^{}]*\})*',body):raise ValueError('Board array contains non-literal content')
        allowed={'model','org','passed','n','cost','tokens','harness','effort','tag'};required={'model','passed','n','cost','tokens','harness','effort'}
        pair=r'([a-z]+):("(?:[^"\\]|\\.)*"|-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)'
        for index,found in enumerate(re.finditer(r'\{([^{}]*)\}',body)):
            fields={}
            if not re.fullmatch(pair+'(,'+pair+')*',found[1]):raise ValueError('Row literal schema changed')
            for key,literal in re.findall(pair,found[1]):
                if key not in allowed:raise ValueError('Unexpected row key: '+key)
                if key in fields:raise ValueError('Duplicate row key: '+key)
                fields[key]=json.loads(literal) if literal.startswith('"') else float(literal) if any(c in literal for c in '.eE') else int(literal)
            if not required.issubset(fields):raise ValueError('Row misses required fields: '+str(sorted(required-set(fields))))
            if fields['n']!=spec['require_n']:raise ValueError('Task count changed: '+repr(fields['n']))
            if 'human' in fields['model'].lower():raise ValueError('Human baseline row is not a model result: '+fields['model'])
            rows.append({'name':f"{fields['model']} · {fields['harness']} · {fields['effort']}",'id':f"{fields['model']}|{fields['harness']}|{fields['effort']}",
                'passed':fields['passed'],'cost':fields['cost'],'tokens':fields['tokens'],'harness':fields['harness'],'source_row':index,
                'context':{'board':spec['board'],'model':fields['model'],'org':fields.get('org'),'harness':fields['harness'],'effort':fields['effort'],
                    'n':fields['n'],'passed':fields['passed'],'cost':fields['cost'],'tokens':fields['tokens']}})
    elif kind=='bu_official_results':
        # Browser Use publishes one JSON file per framework/browser/model run; the run label exists only in the
        # file name. The primary source (README) must still describe the same task set; each row cites its run file.
        if spec['require_text'] not in source:raise ValueError('Task-set description changed')
        pattern=re.compile(r'(?P<framework>[A-Za-z]+)_(?P<version>[^_]+)_browser_(?P<browser>[^_]+)_model_(?P<model>[^/]+)\.json')
        for index,run in enumerate(spec['runs']):
            named=pattern.fullmatch(run['url'].rsplit('/',1)[-1])
            if not named:raise ValueError('Run file name changed: '+run['url'])
            data=json.loads(load_source(run))
            if not isinstance(data,list) or len(data)!=1 or not isinstance(data[0],dict):raise ValueError('Run schema changed: '+run['url'])
            result=data[0]
            if any(type(result.get(k)) is not int for k in ('tasks_completed','tasks_successful')):raise ValueError('Run counts missing: '+run['url'])
            if result['tasks_completed']!=spec['require_tasks']:raise ValueError('Task count changed: '+repr(result['tasks_completed']))
            if not 0<=result['tasks_successful']<=result['tasks_completed']:raise ValueError('Success count outside task count: '+run['url'])
            harness=f"{named['framework']} {named['version']} · {named['browser']} browser"
            rows.append({'name':f"{named['model']} · {harness}",'id':f"{named['model']}|{named['framework']} {named['version']}|{named['browser']}",
                'success_rate':result['tasks_successful']/result['tasks_completed'],'harness':harness,'source_row':0,'run_source':run,
                'derivation':{'formula':'tasks_successful / tasks_completed','inputs':[result['tasks_successful'],result['tasks_completed']]},
                # total_cost is not carried: most published runs record 0.0, which is not a measured cost.
                'context':{'framework':named['framework'],'framework_version':named['version'],'browser':named['browser'],'model':named['model'],
                    'run_start':result.get('run_start'),'tasks_completed':result['tasks_completed'],'tasks_successful':result['tasks_successful'],'total_steps':result.get('total_steps')}})
    elif kind=='osworld2_results':
        # OSWorld 2.0 (XLANG Lab) ships its whole leaderboard as one JSON file. Only one protocol becomes an
        # identity: one task release, the full task set, the default step budget. The offline subset and shorter budgets are
        # different protocols and are skipped, never mixed in. Rows without a release/scope inherit the file's
        # own stated defaults.
        data=json.loads(source)
        for key,expected in spec['require'].items():
            if data.get(key)!=expected:raise ValueError(f'OSWorld 2.0 {key} changed: {data.get(key)!r}')
        if not isinstance(data.get('results'),list):raise ValueError('OSWorld 2.0 results missing')
        if spec['release_version'] not in data.get('releaseVersions',[]):raise ValueError('OSWorld 2.0 release no longer listed: '+spec['release_version'])
        for index,r in enumerate(data['results']):
            if not isinstance(r,dict) or not isinstance(r.get('model'),str) or not r['model'].strip():raise ValueError(f'OSWorld 2.0 row {index} schema changed')
            release=r.get('releaseVersion',data['defaultResultReleaseVersion']);scope=r.get('datasetScope',data['defaultResultDatasetScope'])
            if release not in data.get('releaseVersions',[]):raise ValueError(f'OSWorld 2.0 row {index}: unknown release {release!r}')
            # A result release is a task release: its task files differ, so each release is its own identity.
            if release!=spec['release_version'] or scope!=spec['dataset_scope'] or r.get('stepBudget')!=data['defaultStepBudget'] or r.get('official') is not True:continue
            reasoning=str(r.get('reasoning') or '');tool=str(r.get('toolSetting') or '')
            if not reasoning or not tool:raise ValueError(f'OSWorld 2.0 row {index}: reasoning or tool setting missing')
            rows.append({'name':f"{r['model']} · {reasoning} · {tool}",'id':f"{r['model']}|{reasoning}|{tool}|{release}",
                'binaryAccuracy':r.get('binaryAccuracy'),'harness':tool,'source_row':index,
                'context':{'model':r['model'],'reasoning':reasoning,'toolSetting':tool,'stepBudget':r['stepBudget'],'releaseVersion':release,
                    'datasetScope':scope,'binaryAccuracy':r.get('binaryAccuracy'),'partialScore':r.get('partialScore'),'estimatedCostUsd':r.get('estimatedCostUsd')}})
    elif kind=='matharena_table':
        # MathArena serves each competition as JSON holding two rendered tables: the leaderboard ('table') and the
        # per-problem grid ('problem_table'). The exact leaderboard columns and the problem count are the version
        # guard; a competition that gains or loses problems is a different edition. The warning sign after a model
        # name is MathArena's own "Model was released after competition release" flag and is kept per row.
        data=json.loads(source)
        if not isinstance(data,dict) or not isinstance(data.get('table'),str) or not isinstance(data.get('problem_table'),str):raise ValueError('MathArena table schema changed')
        heads=[text(h) for h in re.findall(r'<th[^>]*>(.*?)</th>',data['table'],re.S)]
        if heads!=spec['require_header']:raise ValueError('MathArena leaderboard columns changed: '+json.dumps(heads))
        problems={int(i) for i in re.findall(r'data-problem-index="(\d+)"',data['problem_table'])}
        if problems!=set(range(spec['require_problems'])):raise ValueError(f'MathArena problem count changed: {len(problems)}')
        flag=spec['post_release_flag'];flag_title='Model was released after competition release.'
        # 2026-09-22 (iteration 161): a row MathArena did not run on every problem shows an accuracy that
        # "Includes estimated scores for questions we did not run" (item response theory). That is not a
        # measurement; with `predicted_scores: "reject"` such a row is refused with its reason, otherwise the
        # unparseable cell fails the board as before.
        predicted_label='Estimated accuracy using item response theory'
        for index,tr in enumerate(re.findall(r'<tr[^>]*>(.*?)</tr>',data['table'],re.S)[1:]):
            tds=re.findall(r'<td([^>]*)>(.*?)</td>',tr,re.S);raw=[c for _,c in tds];cells=[text(c) for c in raw]
            if len(cells)!=len(heads):raise ValueError(f'MathArena row {index} width changed')
            flagged=flag in cells[1]
            if flagged and flag_title not in raw[1]:raise ValueError(f'MathArena row {index}: warning sign without the release-date explanation')
            name=' '.join(cells[1].replace(flag,' ').split())
            if not name:raise ValueError(f'MathArena row {index}: missing model name')
            predicted='data-predicted="yes"' in tds[3][0]
            if predicted!=(predicted_label in raw[3]):raise ValueError(f'MathArena row {index}: estimated-score marker and its explanation disagree')
            accuracy=cells[3]
            if predicted:
                if spec.get('predicted_scores')!='reject':raise ValueError(f'MathArena row {index}: estimated score (item response theory) on a board without a reviewed rule for it')
                accuracy=None
            row={'name':name,'id':name,'accuracy':accuracy,'source_row':index+1,
                'context':{'rank':cells[0],'model':name,'provider':cells[2],'accuracy':cells[3],'cost':cells[4],'output_tokens':cells[5],
                    'released_after_competition':flagged,'open_weights':cells[9]}}
            if predicted:row['reject_reason']='MathArena did not run this model on every problem; its accuracy includes item-response-theory estimates for the rest, so it is not a measurement.'
            rows.append(row)
    elif kind=='swe_rebench_window':
        # SWE-rebench (Nebius): the source is our extraction of ONE pinned task window from the captured page
        # (scripts/extract-swe-rebench-window.py). Another window is another task set and another identity. The
        # window, its problem and repository counts are the version guard. Agent products ("External system")
        # are not models and are skipped. The page's contamination marker is re-derived from the source's own
        # rule (the model was released after the window's first task) and must agree with the rendered row.
        data=json.loads(source);req=spec['require'];win=data.get('window') or {}
        for key in ['from','to','from_ms','to_ms']:
            if win.get(key)!=req[key]:raise ValueError(f'SWE-rebench window {key} changed: {win.get(key)!r}')
        if win.get('default_window') is not True:raise ValueError('SWE-rebench window is not the page default; rendered markers would not describe it')
        problems=data.get('problems')
        if not isinstance(problems,list) or len(problems)!=req['problems'] or len({p['repository'] for p in problems})!=req['repositories']:raise ValueError('SWE-rebench task set changed')
        if any(not req['from_ms']<=p['timestamp']<=req['to_ms'] for p in problems):raise ValueError('SWE-rebench problem outside the pinned window')
        rendered={}
        for r in data.get('rendered_rows',[]):rendered.setdefault(r['name'],[]).append(r['markers'])
        for index,it in enumerate(data.get('items') or []):
            name=it.get('modelName');stats=it.get('window_stats');itype=(it.get('meta') or {}).get('instance_type')
            if not isinstance(name,str) or not name.strip() or not isinstance(stats,dict) or itype not in ['model','agent']:raise ValueError(f'SWE-rebench item {index} schema changed')
            shown=rendered.get(name)
            if not shown or len(shown)!=1:raise ValueError(f'SWE-rebench item {name!r} is not rendered exactly once for this window')
            if itype=='agent':
                if 'external-system' not in shown[0]:raise ValueError(f'SWE-rebench agent {name!r} lacks the external-system marker')
                continue
            contaminated=it['release']['timestamp']>req['from_ms']
            if contaminated!=('contamination-risk' in shown[0]):raise ValueError(f'SWE-rebench contamination marker disagrees for {name!r}')
            rate=stats.get('resolvedRate')
            if not isinstance(rate,(int,float)) or isinstance(rate,bool):raise ValueError(f'SWE-rebench {name!r}: resolved rate missing')
            rows.append({'name':name,'id':it['modelId'],'resolved_rate':round(rate,1),'harness':'SWE-rebench fixed ReAct scaffold, '+('tool' if it['agentVersion']=='tools' else it['agentVersion'])+' mode','source_row':index,
                'context':{'window':f"{req['from']}..{req['to']}",'tasks':len(problems),'mode':it['agentVersion'],'model_release':it['release']['date'],'potential_contamination':contaminated,
                    'resolved_rate_unrounded':rate,'sem':stats.get('sem'),'pass_at_5':stats.get('passN'),'cost_per_problem_usd':stats.get('instanceCosts'),
                    'tokens_per_problem':stats.get('totalTokenUsage'),'cached_token_percent':stats.get('cachedTokenPercentage')}})
    elif kind=='gso_leaderboard':
        # GSO (software optimisation, UC Berkeley): the leaderboard page loads one JSON file. The page's default
        # view is the Opt@1 setting ranked by the plain Opt@1 score; that is this identity. Opt@10 is another
        # protocol and is skipped. The hack-adjusted score and the run date stay in the protocol.
        data=json.loads(source);meta=data.get('metadata') or {}
        if meta.get('total_tasks')!=spec['require']['total_tasks']:raise ValueError(f"GSO task count changed: {meta.get('total_tasks')!r}")
        if not isinstance(data.get('models'),list):raise ValueError('GSO models missing')
        for index,r in enumerate(data['models']):
            if not isinstance(r,dict) or not all(isinstance(r.get(k),str) and r[k].strip() for k in ['name','scaffold','setting','date']):raise ValueError(f'GSO row {index} schema changed')
            if r['setting'] not in spec['known_settings']:raise ValueError(f"GSO row {index}: unknown setting {r['setting']!r}")
            if r['setting']!=spec['setting']:continue
            effort=r.get('reasoning_effort') or ''
            rows.append({'name':r['name']+(f' · {effort}' if effort else '')+f" · {r['scaffold']}",'id':f"{r['name']}|{effort}|{r['scaffold']}|{r['date']}",
                'score':r.get('score'),'harness':r['scaffold'],'source_row':index,
                'context':{'model':r['name'],'model_org':r.get('model_org'),'reasoning_effort':r.get('reasoning_effort'),'scaffold':r['scaffold'],'setting':r['setting'],
                    'run_date':r['date'],'score_hack_adjusted':r.get('score_hack_control'),'submitted_by':r.get('submission_org_name')}})
    elif kind=='hyper_tau_submissions':
        # τ^τ-bench (Sierra): the public board reads manifest.json and one submission.json per harness x Developer
        # model. The manifest's board version and its exact submission list are the version guard (a new submission
        # needs a reviewed plan change, never a silent row). The README must still define `overall` as the mean over
        # all 53 tasks, and each row's overall must equal the task-weighted mean of its domain scores (6 airline_plus,
        # 6 retail_plus, 6 telecom, 35 banking_knowledge) — so the number really is that mean.
        data=json.loads(source);req=spec['require']
        if data.get('board_version')!=req['board_version']:raise ValueError(f"τ^τ-bench board version changed: {data.get('board_version')!r}")
        readme=load_source(spec['method_source'])
        if req['readme_text'] not in ' '.join(readme.split()):raise ValueError('τ^τ-bench score definition changed')
        names=[run['url'].rsplit('/',2)[-2] for run in spec['runs']]
        if data.get('submissions')!=names:raise ValueError(f"τ^τ-bench submission list changed: {data.get('submissions')!r}")
        weights=req['domain_tasks']
        for index,run in enumerate(spec['runs']):
            s=json.loads(load_source(run));scores=s.get('scores') or {}
            model=(s.get('builder') or {}).get('model_name');effort=(s.get('builder') or {}).get('reasoning_effort');harness=(s.get('harness') or {}).get('name')
            if not all(isinstance(v,str) and v.strip() for v in [model,effort,harness]) or not isinstance(s.get('submission_date'),str):raise ValueError(f'τ^τ-bench submission {names[index]} schema changed')
            if any(not isinstance(scores.get(k),(int,float)) or isinstance(scores.get(k),bool) for k in ['overall',*weights]):raise ValueError(f'τ^τ-bench submission {names[index]} scores missing')
            mean=sum(scores[k]*n for k,n in weights.items())/sum(weights.values())
            if abs(mean-scores['overall'])>0.06:raise ValueError(f"τ^τ-bench {names[index]}: overall {scores['overall']} is not the 53-task mean {mean:.2f}")
            rows.append({'name':f'{model} · {effort} · {harness}','id':f'{model}|{effort}|{harness}','overall':scores['overall'],'harness':harness,'source_row':0,'run_source':run,
                'context':{'harness':harness,'model':model,'reasoning_effort':effort,'submission_date':s['submission_date'],'submitted_by':s.get('submitting_organization'),
                    'maintainer_baseline':s.get('baseline') is True,'domain_scores':{k:scores[k] for k in weights},'build_time_min':s.get('build_time_min'),
                    'build_cost_usd':s.get('build_cost_usd'),'serve_credit_ratio':s.get('serve_credit_ratio')}})
    elif kind=='lisanbench_core':
        # LisanBench (Lisan al Gaib, @scaling01): lisanbench.com loads data/core.json (models, aggregated scores) and
        # data/rankings.json (per starting word: average chain, stop reason of every trial). The page ranks models by
        # sum_chain_avg ("Path Length"): per starting word, the valid-chain length averaged over that model's trials,
        # summed over the 50 starting words. Version guard: 50 starting words exactly as pinned, the pinned SCOWL
        # dictionary, the README's score definition and trial protocol. Each row's sum must equal the sum of its 50
        # published per-word averages (rounding tolerance), and the trial count per model is read from the trials the
        # source lists, never assumed; it stays in the row's protocol.
        data=json.loads(source);req=spec['require'];meta=data.get('metadata') or {}
        words=meta.get('starting_words')
        if meta.get('num_words')!=req['num_words'] or not isinstance(words,list) or len(words)!=req['num_words'] or len(set(words))!=len(words):raise ValueError(f"LisanBench starting-word count changed: {meta.get('num_words')!r}")
        if hashlib.sha256('\n'.join(words).encode()).hexdigest()!=req['starting_words_sha256']:raise ValueError('LisanBench starting words changed')
        if meta.get('words_file')!=req['words_file']:raise ValueError(f"LisanBench dictionary changed: {meta.get('words_file')!r}")
        readme=' '.join(load_source(spec['method_source']).split())
        for phrase in req['readme_text']:
            if phrase not in readme:raise ValueError('LisanBench README no longer states: '+phrase[:80])
        models=data.get('models');agg=data.get('aggregated')
        if not isinstance(models,list) or not isinstance(agg,list) or not agg:raise ValueError('LisanBench models/aggregated missing')
        by={m.get('id'):m for m in models if isinstance(m,dict)}
        if len(by)!=len(models) or meta.get('num_models')!=len(models) or len(agg)!=len(models) or len({a.get('model') for a in agg})!=len(agg):raise ValueError('LisanBench model list inconsistent')
        detail=json.loads(load_source(spec['detail_source']));per=detail.get('per_word');stops=detail.get('stop_reasons')
        if not isinstance(per,list) or not isinstance(stops,dict):raise ValueError('LisanBench rankings schema changed')
        sums={};counts={}
        for r in per:
            if not isinstance(r,dict) or r.get('word') not in words or not isinstance(r.get('avg_chain'),(int,float)) or isinstance(r.get('avg_chain'),bool):raise ValueError('LisanBench per-word row schema changed')
            sums[r['model']]=sums.get(r['model'],0)+r['avg_chain'];counts[r['model']]=counts.get(r['model'],0)+1
        for index,a in enumerate(agg):
            mid=a.get('model');m=by.get(mid);value=a.get('sum_chain_avg')
            if not isinstance(mid,str) or m is None or not isinstance(m.get('label'),str) or not m['label'].strip():raise ValueError(f'LisanBench row {index} schema changed')
            if not isinstance(value,(int,float)) or isinstance(value,bool) or value<0:raise ValueError(f'LisanBench {mid}: path length missing')
            if counts.get(mid)!=len(words):raise ValueError(f'LisanBench {mid}: per-word results do not cover the {len(words)} starting words')
            if abs(sums[mid]-value)>req['sum_tolerance']:raise ValueError(f'LisanBench {mid}: {value} is not the sum of its per-word averages ({sums[mid]:.2f})')
            trials=[len((stops.get(w) or {}).get(mid) or []) for w in words]
            if min(trials)<1:raise ValueError(f'LisanBench {mid}: a starting word lists no trial')
            rows.append({'name':m['label'],'id':mid,'path_length':value,'source_row':index,
                'context':{'model':mid,'route':m.get('full'),'label':m['label'],'company':m.get('company'),'thinking':m.get('thinking'),
                    'trials_total':sum(trials),'trials_per_word':[min(trials),max(trials)],'difficulty_weighted_score':a.get('sum_sparse_chain_avg'),
                    'best_trial_sum':a.get('sum_chain_max'),'average_validity':a.get('avg_validity'),'output_tokens':a.get('output_tokens'),
                    'estimated_run_cost_usd':a.get('estimated_cost_usd'),'model_release_date':(data.get('release_dates') or {}).get(mid)}})
    elif kind=='weirdml_v3_json':
        # WeirdML v3 (Håvard Tveit Ihle): the published prepared-data JSON is the same file the site's own
        # model-summary table renders (weirdml_v3_summary.html maps model.score → "Average Score Across 11
        # Tasks"). Version guard: the pinned schema_version, real mode (synthetic fixtures never score),
        # the exact task count, and one valid per-model interval per row. The author excludes configurations
        # with incomplete task coverage into `excluded_models`; they are never read here, so a partially
        # measured model stays missing instead of being estimated from its covered tasks.
        data=json.loads(source);req=spec['require']
        if data.get('schema_version')!=req['schema_version']:raise ValueError(f"WeirdML v3 schema_version changed: {data.get('schema_version')!r}")
        if data.get('mode')!='real':raise ValueError('WeirdML v3 mode changed: '+str(data.get('mode')))
        if data.get('task_count')!=req['task_count']:raise ValueError(f"WeirdML v3 task count changed: {data.get('task_count')!r}")
        if not isinstance(data.get('models'),list):raise ValueError('WeirdML v3 models missing')
        for index,r in enumerate(data['models']):
            if not isinstance(r,dict) or not isinstance(r.get('id'),str) or not isinstance(r.get('name'),str) or not r['name'].strip():raise ValueError(f'WeirdML v3 row {index} schema changed')
            if r.get('synthetic') is not False:raise ValueError(f"WeirdML v3 row {index}: synthetic model {r.get('id')!r}")
            score=r.get('score')
            if not isinstance(score,(int,float)) or isinstance(score,bool) or not math.isfinite(score):raise ValueError(f"WeirdML v3 {r.get('id')}: score missing")
            interval=r.get('interval')
            if not (isinstance(interval,list) and len(interval)==2 and all(isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) for x in interval)):raise ValueError(f"WeirdML v3 {r.get('id')}: interval missing")
            if r.get('runs') is not None and (not isinstance(r.get('runs'),int) or r['runs']<1):raise ValueError(f"WeirdML v3 {r.get('id')}: run count invalid")
            rows.append({'name':r['name'],'id':r['id'],'score':score,'source_row':index,
                'context':{'agent':r.get('agent'),'harness':r.get('harnesses'),'reasoning_effort':r.get('reasoning_effort'),'open_weights':r.get('open_weights'),
                    'runs':r.get('runs'),'interval_95':[interval[0],interval[1]],'mean_api_cost_usd':r.get('mean_api_cost_usd'),
                    'mean_output_tokens':r.get('mean_output_tokens'),'mean_final_best':r.get('mean_final_best')}})
    elif kind=='vulcanbench_frontier_csv':
        # VulcanBench Frontier v4 (Morgan Linton): the published board CSV (assets/data/swe-v4-board.csv) is the
        # same table leaderboard.html renders — one row per model x effort column. Guards: the exact 18-column
        # header, 23 tasks in every published row, the stated harness/effort enums and one frozen protocol family
        # on every row. A renamed/renumbered suite or another protocol family is a different identity and fails
        # closed.
        parsed=csvrows(source)
        header=['rank','model','lab','harness','effort','best_effort','n','combined_33','combined_33_se','code_quality','passed','mean_minutes','mean_usd','mean_raw_tokens','median_output_tokens','mean_output_tokens','report','protocol']
        if list(parsed[0].keys() if parsed else [])!=header:raise ValueError('VulcanBench Frontier CSV header changed')
        partial=[]
        for index,r in enumerate(parsed):
            # 2026-09-21: the board publishes a run judged on fewer than its 23 tasks when the v3.7 protocol
            # withholds a task's Code quality score (its own "§" footnote on leaderboard.html — GPT-5.6 Sol at
            # max, judged on 22 of 23 because a judge probe quoted an excerpt absent from the code). The
            # combined score then has a different denominator, so such a row is withheld rather than compared
            # with the full-suite rows. A row claiming *more* than 23 tasks is a different suite and still
            # fails closed, as does an implausible count of partial rows.
            if r.get('harness') not in ('Codex','Claude Code'):raise ValueError(f"VulcanBench Frontier row {index}: harness {r.get('harness')!r} is not a stated harness")
            if r.get('effort') not in ('low','medium','high','extra-high','max'):raise ValueError(f"VulcanBench Frontier row {index}: effort {r.get('effort')!r} not stated")
            if not r.get('protocol','').startswith('code-quality-maintenance-v3'):raise ValueError(f"VulcanBench Frontier row {index}: protocol family changed ({r.get('protocol')!r})")
            # The identity guards above apply to every row on the board; only the denominator decides whether a
            # row may be published beside the full-suite ones.
            if r.get('n')!='23':
                if not re.fullmatch(r'\d{1,2}',r.get('n') or '') or not 1<=int(r['n'])<23:raise ValueError(f"VulcanBench Frontier row {index}: task count changed ({r.get('n')!r})")
                partial.append(f"{r.get('model')} [{r.get('effort')}] n={r['n']}");continue
            rows.append({'name':f"{r['model']} [{r['effort']}]",'id':f"{r['model']} [{r['effort']}]",'combined_33':r['combined_33'],'source_row':index,'harness':r['harness'],
                'context':{'model':r['model'],'lab':r['lab'],'harness':r['harness'],'effort':r['effort'],'n_tasks':int(r['n']),'tasks_passed':int(r['passed']),
                    'combined_33_se':float(r['combined_33_se']),'code_quality':float(r['code_quality']),'mean_minutes':float(r['mean_minutes']),'mean_usd':float(r['mean_usd']),
                    'protocol':r['protocol'],'report':r['report'],'best_effort':r['best_effort']=='True'}})
        if len(partial)>3:raise ValueError('VulcanBench Frontier: '+str(len(partial))+' rows judged on fewer than 23 tasks ('+'; '.join(partial)+'); the suite may have changed')
    elif kind=='kernelbench_cuda_board':
        # KernelBench-CUDA (Elliot Arledge, kernelbench.com): the published per-hardware leaderboard JSON
        # (benchmarks/cuda/results/leaderboard.json) is the artifact the site bakes and renders. One row per
        # stated model identity; the value is the problem's ranked peak_fraction. A cell counts only under the
        # site's own validity rule (correct, audited clean/interesting); flagged, suspect, bug and unaudited
        # cells keep their verdict in the review file and are never scored. The published ranked_passes list is
        # the cross-check: every scored cell must appear there with the same value. Guards: schema_version 1,
        # the stated hardware string, the exact problem in the stated deck.
        data=json.loads(source);req=spec['require']
        if data.get('schema_version')!=req['schema_version']:raise ValueError(f"KernelBench-CUDA schema_version changed: {data.get('schema_version')!r}")
        hardware=str((data.get('hardware') or {}).get('name',''))
        if req['hardware'] not in hardware:raise ValueError('KernelBench-CUDA hardware changed: '+hardware)
        problem=spec['problem']
        if problem not in (data.get('problems') or []):raise ValueError('KernelBench-CUDA problem missing from deck: '+problem)
        ranked={e.get('model'):e.get('peak_fraction') for e in ((data.get('per_problem') or {}).get(problem) or {}).get('ranked_passes',[])}
        if not ranked:raise ValueError('KernelBench-CUDA ranked passes missing: '+problem)
        for index,m in enumerate(data.get('models') or []):
            if not isinstance(m,dict) or not isinstance(m.get('label'),str) or not m['label'].strip():raise ValueError(f'KernelBench-CUDA row {index}: label missing')
            cell=(m.get('results') or {}).get(problem)
            if cell is None:continue
            verdict=cell.get('annotation_verdict') or 'unaudited'
            value=cell.get('peak_fraction')
            if not cell.get('correct') or not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value):continue
            if verdict not in ('clean','interesting'):continue
            if m['label'] not in ranked:raise ValueError(f"KernelBench-CUDA {m['label']!r}/{problem}: audited cell missing from published ranked list")
            if abs(ranked[m['label']]-value)>1e-12:raise ValueError(f"KernelBench-CUDA {m['label']!r}/{problem}: published ranked value differs from the cell")
            rows.append({'name':m['label'],'id':m['label'],'peak_fraction':value,'source_row':index,'harness':m.get('harness'),
                'context':{'label':m['label'],'harness':m.get('harness'),'stated_effort':m.get('effort') or 'not stated','stated_model':m.get('model'),
                    'annotation_verdict':verdict,'run_id':cell.get('run_id'),'elapsed_seconds':cell.get('elapsed_seconds'),'problem':problem,
                    'hardware':hardware,'peak_fraction':value,'percent_of_roofline':value*100}})
    elif kind=='programbench_board':
        # ProgramBench (Princeton & Meta: Yang, Lieret et al., arXiv:2605.03546, programbench.com): the leaderboard's
        # own `var results = [...]` board — 21 rows {model, provider, logo, slug, score, cost, calls,
        # tokens, date, date_str}; the site's headline score is the macro-average over the 200
        # benchmark instances of each instance's passed-test fraction (unattempted counts as 0),
        # run under the mini-SWE-agent baseline harness (config: 6-hour wall time, 1000 steps,
        # offline container --network none), stated per board. The parsed value is score x 100 in
        # percent. Guards: the page identity phrases (200 tasks, mini-SWE-agent, the benchmark's own
        # description), exactly one results literal, the exact row schema, score sorted descending
        # and bounded, and the method files (registry README, scoring source) still describing the
        # same 200-instance macro-average. The pre-collected provenance receipts (one
        # submission.yaml + score.json per row, sha256-pinned) are build-time proof that each board
        # row is a registered submission of the ProgramBench registry — the registry's own README
        # calls it the authoritative registry the leaderboard is compiled from — but the site's
        # per-instance details for .compile_skip rows predate the current _stats files, so a
        # byte-exact recompute is not the guard (2026-09-21 recompute reproduced the 8 Jul/Aug rows
        # to <=0.0005 and the 5 legacy rows to <=0.009).
        req=spec['require']
        for phrase in req['text']:
            if phrase not in source:raise ValueError('ProgramBench page identity changed: missing '+phrase)
        found=list(re.finditer(r'\bvar results = \[',source))
        if len(found)!=1:raise ValueError('ProgramBench results literal missing or ambiguous: '+str(len(found)))
        arr=static_json(source,found[0].end()-1)
        if not isinstance(arr,list) or not arr:raise ValueError('ProgramBench board is not a non-empty row array')
        required=set(req['row_fields'])
        def num(x):return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)
        models=set()
        for index,rf in enumerate(arr):
            if not isinstance(rf,dict) or set(rf.keys())!=required:raise ValueError(f'ProgramBench row {index}: field set changed ({sorted(required^set(rf.keys()))})')
            if any(not isinstance(rf.get(k),str) or not rf.get(k) for k in ('model','provider','logo','slug','date_str')):raise ValueError(f'ProgramBench row {index}: string fields changed')
            if not num(rf['score']) or not 0<=rf['score']<=1:raise ValueError(f'ProgramBench row {index}: score out of range')
            if not num(rf['cost']) or rf['cost']<0 or not isinstance(rf['calls'],int) or rf['calls']<0 or not isinstance(rf['tokens'],int) or rf['tokens']<0 or not isinstance(rf['date'],int) or rf['date']<=0:raise ValueError(f'ProgramBench row {index}: cost/calls/tokens/date out of range')
            if rf['model'] in models:raise ValueError('ProgramBench board repeats a model: '+rf['model'])
            models.add(rf['model'])
            if rf['provider'] not in req['providers']:raise ValueError(f'ProgramBench row {index}: unlisted provider {rf.get("provider")!r}')
        scores=[r['score'] for r in arr]
        if any(scores[i]<scores[i+1] for i in range(len(scores)-1)):raise ValueError('ProgramBench board is no longer ranked by mean score')
        manifest=load_source(spec['manifest_source'])
        method=load_source(spec['method_source'])
        readme=load_source(spec['readme_source'])
        for phrase in req['manifest_phrases']:
            if phrase not in manifest:raise ValueError('ProgramBench registry manifest changed: '+phrase)
        for phrase in req['method_phrases']:
            if phrase not in method:raise ValueError('ProgramBench scoring source changed: '+phrase)
        for phrase in req['readme_phrases']:
            if phrase not in readme:raise ValueError('ProgramBench registry README changed: '+phrase)
        for index,r in enumerate(arr):
            rows.append({'name':r['model'],'id':r['slug'],'mean_score':r['score'],'source_row':index,'harness':req['harness'],
                'context':{'provider':r['provider'],'slug':r['slug'],'score_fraction':r['score'],
                    'cost_per_task_usd':r['cost'],'calls_per_task':r['calls'],'tokens_per_task':r['tokens'],
                    'publication_date':r['date_str'],'tasks':req['tasks'],'harness':req['harness'],'update_stamp':req['update_stamp']}})
    elif kind=='frontierswe_v2_board':
        # FrontierSWE v2 (Proximal team, frontierswe.com): the leaderboard page embeds its rows in the
        # app's own Next.js flight payload ("entries":{"abs":{"best":…,"mean":…,"worst":…}}). The
        # published score is the site's own headline mean@5 in percent across the 34 tasks (5 trials
        # per task, 20-hour budget, per-trial cost/time averages); best@5/worst@5, the three category
        # sub-scores and the generation label stay in the protocol. Epoch AI's FrontierSWE relay CSV
        # (method_source; Source column = this site) restates rows of the same board with each model's
        # reasoning effort; it is the reviewed effort evidence for the identity joins and a byte-exact
        # cross-check of every relayed mean. Guards: V2 page identity phrases, uniform proximus harness,
        # identical model sets across the three views, best>=mean>=worst per model, the exact relay
        # header and relay/site agreement per relayed row; a row the relay does not cover carries no
        # effort and joins nothing.
        req=spec['require']
        for phrase in req['text']:
            if phrase not in source:raise ValueError('FrontierSWE v2 page identity changed: missing '+phrase)
        chunks=[]
        for raw in re.findall(r'<script[^>]*>self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)</script>',source,re.S):
            chunks.append(raw.encode('utf-8').decode('unicode_escape'))
        flight=''.join(chunks)
        marker='"entries":{'
        if flight.count(marker)!=1:raise ValueError('FrontierSWE v2 entries payload missing or duplicated')
        start=flight.find(marker)+len(marker)-1;depth=0;end=None
        for j in range(start,len(flight)):
            if flight[j]=='{':depth+=1
            elif flight[j]=='}':
                depth-=1
                if depth==0:end=j+1;break
        if not end:raise ValueError('FrontierSWE v2 entries payload truncated')
        views=json.loads(flight[start:end]).get(req.get('entries_key','abs'))
        if not isinstance(views,dict) or sorted(views.keys())!=['best','mean','worst']:raise ValueError('FrontierSWE v2 view set changed')
        mean=views['mean'];best={r.get('model'):r for r in views['best']};worst={r.get('model'):r for r in views['worst']}
        if not isinstance(mean,list) or len(mean)<8 or len(mean)!=len(best) or len(mean)!=len(worst) or len({r.get('model') for r in mean})!=len(mean):
            raise ValueError('FrontierSWE v2 row set changed')
        required={'model','harness','vendor','generation','overall','implementation','performance','research','avgCostUsd','avgDurationSeconds'}
        for index,r in enumerate(mean):
            if not required <= set(r.keys()):raise ValueError(f'FrontierSWE v2 row {index}: fields changed ({sorted(required-set(r.keys()))})')
            if r['harness']!='proximus':raise ValueError(f"FrontierSWE v2 row {index}: harness {r['harness']!r} is not proximus")
            # The board's own numeric generation label. It is retained per row and never scored, so a new
            # wave of models (generation 3 arrived with Claude Opus 5.5 on 2026-09-23) is an additive label,
            # not a re-basing: guard that the label is stated as a positive whole number, not that it is one
            # of the values seen on an earlier capture. The documented version_guard never pinned the set.
            if isinstance(r['generation'],bool) or not isinstance(r['generation'],int) or r['generation']<1:
                raise ValueError(f"FrontierSWE v2 row {index}: generation {r['generation']!r} not stated")
            if r['model'] not in best or r['model'] not in worst:raise ValueError(f"FrontierSWE v2 row {index}: {r['model']!r} missing from best/worst views")
            for field in ('overall','implementation','performance','research'):
                value=r[field]
                if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value) or not 0<=value<=100:
                    raise ValueError(f'FrontierSWE v2 row {index}: {field} out of range')
            if not best[r['model']]['overall']+1e-9>=r['overall']>=worst[r['model']]['overall']-1e-9:
                raise ValueError(f"FrontierSWE v2 row {index}: best/mean/worst ordering violated for {r['model']!r}")
        relay=csvrows(load_source(spec['method_source']))
        relay_header=req['relay_header']
        if list(relay[0].keys() if relay else [])!=relay_header:raise ValueError('FrontierSWE relay CSV header changed')
        relayed={r['Name']:r for r in relay}
        if len(relayed)!=len(relay):raise ValueError('FrontierSWE relay CSV repeats a model name')
        for name,r in relayed.items():
            site=next((x for x in mean if x['model']==name),None)
            if site is None:raise ValueError(f'FrontierSWE relay row {name!r} is not on the board')
            if abs(float(r['Score'])*100-site['overall'])>1e-6:raise ValueError(f'FrontierSWE relay/site mean diverges for {name!r}')
            if r['Source']!=req['relay_source']:raise ValueError(f'FrontierSWE relay row {name!r}: Source column changed')
        for index,r in enumerate(mean):
            rel=relayed.get(r['model'])
            rows.append({'name':r['model'],'id':r['model'],'mean_at_5':r['overall'],'source_row':index,'harness':r['harness'],
                'context':{'vendor':r['vendor'],'generation':r['generation'],'best_at_5':best[r['model']]['overall'],'worst_at_5':worst[r['model']]['overall'],
                    'implementation':r['implementation'],'performance':r['performance'],'research':r['research'],
                    'avg_cost_usd':r['avgCostUsd'],'avg_duration_seconds':r['avgDurationSeconds'],'tasks':req['tasks'],'trials_per_task':req['trials_per_task'],
                    'epoch_relay_id':rel['Model version'] if rel else None,'epoch_relay_effort':(rel['Model version'].rsplit('_',1)[1] if rel and '_' in rel['Model version'] else None),
                    'epoch_relay_aggregation':rel['Aggregation'] if rel else None}})
    elif kind=='posttrainbench_js':
        # PostTrainBench v1.1 (aisa-group / Ben Rank et al., posttrainbench.com): scores.js is the
        # artifact the leaderboard renders (window.SCORES_DATA: per-cell values, the published
        # benchmark weights and the per-agent aggregated leaderboard averages with their run counts);
        # config.js (config_source) states each agent's display name, CLI scaffold, reasoning effort
        # and footnote markers. One row per aggregated agent on the current board; the baseline rows
        # (official instruct models, base models) are references, never observations. Guards: the
        # exact benchmark-weight map, the four production base models, 0<=values<=100, integer run
        # counts >=1, every aggregated agent present in config, and the page's stated enums for
        # scaffolds and reasoning efforts.
        req=spec['require']
        match=re.search(r'\bwindow\.SCORES_DATA\s*=\s*',source)
        if not match:raise ValueError('PostTrainBench scores assignment missing')
        scores=static_json(source,match.end())
        weights=scores.get('benchmarkWeights')
        if not isinstance(weights,dict) or sorted(weights.keys())!=sorted(req['benchmark_weights']):raise ValueError('PostTrainBench benchmark weights changed')
        if abs(sum(float(v) for v in weights.values())-1.0)>1e-6:raise ValueError('PostTrainBench benchmark weights no longer sum to 1')
        cells=scores.get('modelBenchmarkData')
        if not isinstance(cells,dict):raise ValueError('PostTrainBench cell map changed')
        for base in req['required_rows']:
            if base not in cells:raise ValueError('PostTrainBench baseline row missing: '+base)
        config=load_source(spec['config_source'])
        info_match=re.search(r'const\s+agentInfo\s*=\s*\{',config)
        if not info_match:raise ValueError('PostTrainBench agentInfo missing')
        depth=0;end=None
        for j in range(config.find('{',info_match.start()),len(config)):
            if config[j]=='{':depth+=1
            elif config[j]=='}':
                depth-=1
                if depth==0:end=j+1;break
        if not end:raise ValueError('PostTrainBench agentInfo truncated')
        block=config[config.find('{',info_match.start()):end]
        agents={}
        for key_match in re.finditer(r'"([^"]+)":\s*\{',block):
            key=key_match.group(1)
            bdepth=0;bend=None
            for j in range(key_match.end()-1,len(block)):
                if block[j]=='{':bdepth+=1
                elif block[j]=='}':
                    bdepth-=1
                    if bdepth==0:bend=j+1;break
            if not bend:raise ValueError('PostTrainBench agentInfo entry truncated: '+key)
            entry=block[key_match.end()-1:bend]
            fields={}
            for field in ('name','scaffold','reasoningEffort','footnoteMarker','verificationNote'):
                fm=re.search(r'\b'+field+r':\s*"((?:\\.|[^"\\])*)"',entry)
                if fm:fields[field]=fm.group(1)
            fields['isBaseline']=bool(re.search(r'\bisBaseline:\s*true\b',entry))
            fields['isExternal']=bool(re.search(r'\bisExternal:\s*true\b',entry))
            agents[key]=fields
        if len(agents)<req['minimum_agents']:raise ValueError('PostTrainBench agentInfo shrank')
        effort_vocab=req['effort_vocab'];scaffold_vocab=req['scaffold_vocab']
        agg=scores.get('aggregatedScores')
        if not isinstance(agg,dict) or not agg:raise ValueError('PostTrainBench aggregated scores missing')
        for index,(key,entry) in enumerate(sorted(agg.items())):
            if key not in agents:raise ValueError(f'PostTrainBench agent {key!r} missing from agentInfo')
            info=agents[key]
            if info['isBaseline']:continue
            if not isinstance(entry,dict) or not all(isinstance(entry.get(f),(int,float)) or isinstance(entry.get(f),dict) for f in ('avg','std')):
                raise ValueError(f'PostTrainBench agent {key!r}: aggregated shape changed')
            avg, std = entry.get('avg'), entry.get('std')
            n_runs=entry.get('n')
            if not isinstance(avg,(int,float)) or isinstance(avg,bool) or not 0<=avg<=100:raise ValueError(f'PostTrainBench agent {key!r}: avg out of range')
            if not isinstance(std,(int,float)) or isinstance(std,bool) or not 0<=std<=100:raise ValueError(f'PostTrainBench agent {key!r}: std out of range')
            if not isinstance(n_runs,int) or isinstance(n_runs,bool) or n_runs<1:raise ValueError(f'PostTrainBench agent {key!r}: run count invalid')
            agent_cells=cells.get(key)
            if not isinstance(agent_cells,dict):raise ValueError(f'PostTrainBench agent {key!r}: no per-cell data')
            for base in req['base_models']:
                if base not in agent_cells:raise ValueError(f'PostTrainBench agent {key!r}: base model {base!r} missing')
                per=agent_cells[base]
                for bench in req['benchmark_weights']:
                    if bench not in per:raise ValueError(f'PostTrainBench agent {key!r}/{base}: benchmark {bench!r} missing')
                    cell=per[bench]
                    if not isinstance(cell,dict) or not isinstance(cell.get('fallbackType'),bool):raise ValueError(f'PostTrainBench agent {key!r}/{base}/{bench}: cell shape changed')
                    value=cell.get('value')
                    if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value) or not 0<=value<=100:
                        raise ValueError(f'PostTrainBench agent {key!r}/{base}/{bench}: cell value out of range')
            effort=info.get('reasoningEffort') or ''
            if effort and effort.split(',')[0].strip() not in effort_vocab:raise ValueError(f'PostTrainBench agent {key!r}: unlisted reasoning effort {effort!r}')
            scaffold=info.get('scaffold') or ''
            if not scaffold or scaffold not in scaffold_vocab:raise ValueError(f'PostTrainBench agent {key!r}: unlisted scaffold {scaffold!r}')
            reprompted=', Reprompted' in effort
            rows.append({'name':info.get('name') or key,'id':key,'average_score':avg,'source_row':index,'harness':scaffold,
                'context':{'scaffold':scaffold,'reasoning_effort':effort or 'not stated','reprompted':reprompted,
                    'n_runs':n_runs,'std':std,'base_models':req['base_models'],'benchmarks':req['benchmark_weights'],
                    'is_external':info['isExternal'],'footnote_marker':info.get('footnoteMarker') or None,
                    'verification_note':info.get('verificationNote') or None}})
    elif kind=='rsi_exam_leaderboard':
        # RSI-Exam (aiming-lab, rsi-exam.ai): the leaderboard is server-rendered SVG inside the page's own
        # LB:START/LB:END block — one panel per scope over the same task bank (Full 88 tasks, Public 35,
        # Private 53), each row one model x agent-harness pair with its mean hidden-set normalised score.
        # The Full panel is this identity; the two split panels of the same run stay in the protocol and are
        # never scored separately. The page's resource chart ships a strict JSON island (`effdata`) with the
        # same score plus mean spend, run time and output tokens; every model it covers must carry the Full
        # panel's value, which is the cross-check that the rendered bar and the page's own data agree.
        # The release write-up (method_source) must still state the anchors (Starter 0.00, frontier-calibrated
        # reference 0.60, upper bound 1.00) and the one-rollout-per-task rule, so a re-normalised release
        # cannot keep this identity.
        req=spec['require']
        if f'<span class="eyebrow e-orange">{req["version_label"]}</span>' not in source:raise ValueError('RSI-Exam version label changed: '+req['version_label'])
        block=re.search(r'<!-- LB:START -->(.*?)<!-- LB:END -->',source,re.S)
        if not block:raise ValueError('RSI-Exam leaderboard block missing')
        board=block[1]
        tabs={m[1]:int(m[2]) for m in re.finditer(r'data-board="([a-z]+)"[^>]*>[^<]*<span class="lbn">(\d+)</span>',board)}
        if tabs!=req['boards']:raise ValueError(f'RSI-Exam scope task counts changed: {tabs!r}')
        panels={}
        for m in re.finditer(r'<div class="hlbwrap" id="lbpanel-([a-z]+)"[^>]*>(.*?)</svg>',board,re.S):
            label=re.search(r'aria-label="([^"]*)"',m[2])
            panel_rows=[]
            for g in re.finditer(r'<g class="hlbrow".*?</g>',m[2],re.S):
                cell=lambda c:(re.search(r'class="'+c+r'"[^>]*>([^<]*)<',g[0]) or [None,None])[1]
                rank,model,sub,value=cell('hlbrank'),cell('hlbmodel'),cell('hlbsub'),cell('hlbval')
                if None in (rank,model,sub,value):raise ValueError('RSI-Exam row shape changed in panel '+m[1])
                panel_rows.append({'rank':int(rank),'model':text(model),'sub':text(sub),'value':numeric(value)})
            panels[m[1]]={'rows':panel_rows,'aria':text(label[1]) if label else ''}
        if set(panels)!=set(req['boards']):raise ValueError(f'RSI-Exam scope panels changed: {sorted(panels)!r}')
        if req['headline_scope'] not in panels:raise ValueError('RSI-Exam headline scope missing')
        if str(req['boards'][req['headline_scope']]) not in panels[req['headline_scope']]['aria']:raise ValueError('RSI-Exam headline panel no longer states its task count: '+panels[req['headline_scope']]['aria'])
        if req['anchor_label'] not in board:raise ValueError('RSI-Exam anchor label missing: '+req['anchor_label'])
        keys=None
        for scope,panel in sorted(panels.items()):
            ranked=panel['rows']
            if len(ranked)<req['minimum_rows']:raise ValueError(f'RSI-Exam {scope} panel shrank: {len(ranked)}')
            if [r['rank'] for r in ranked]!=list(range(1,len(ranked)+1)):raise ValueError(f'RSI-Exam {scope} panel ranks are not 1..n')
            if any(ranked[i]['value']<ranked[i+1]['value'] for i in range(len(ranked)-1)):raise ValueError(f'RSI-Exam {scope} panel is not ranked by its own value')
            scoped={(r['model'],r['sub']) for r in ranked}
            if keys is None:keys=scoped
            elif scoped!=keys:raise ValueError(f'RSI-Exam {scope} panel covers a different system set')
        resources={}
        island=re.search(r'<script id="effdata" type="application/json">(.*?)</script>',source,re.S)
        if not island:raise ValueError('RSI-Exam resource data island missing')
        for index,r in enumerate(json.loads(island[1])):
            if not isinstance(r,dict) or not all(isinstance(r.get(k),str) and r[k].strip() for k in ['id','name','sub']):raise ValueError(f'RSI-Exam resource row {index} schema changed')
            if any(not isinstance(r.get(k),(int,float)) or isinstance(r.get(k),bool) for k in ['score','cost','time','out']):raise ValueError(f'RSI-Exam resource row {index} values changed')
            resources[(text(r['name']),text(r['sub']))]=r
        if len(resources)<req['minimum_resource_rows']:raise ValueError(f'RSI-Exam resource rows shrank: {len(resources)}')
        headline={(r['model'],r['sub']):r for r in panels[req['headline_scope']]['rows']}
        for key,r in resources.items():
            if key not in headline:raise ValueError(f'RSI-Exam resource row {key!r} is not on the {req["headline_scope"]} board')
            if abs(headline[key]['value']-r['score'])>5e-5:raise ValueError(f'RSI-Exam {key!r}: resource chart says {r["score"]}, the board says {headline[key]["value"]}')
        method=' '.join(load_source(spec['method_source']).split())
        for phrase in req['method_text']:
            if phrase not in method:raise ValueError('RSI-Exam method statement changed: '+phrase)
        for index,row in enumerate(panels[req['headline_scope']]['rows']):
            harness,_,effort=row['sub'].partition(' · ')
            if harness not in req['harness_vocab']:raise ValueError(f'RSI-Exam unlisted harness {harness!r}')
            if effort not in req['effort_vocab']:raise ValueError(f'RSI-Exam unlisted reasoning effort {effort!r}')
            resource=resources.get((row['model'],row['sub']))
            rows.append({'name':f"{row['model']} [{row['sub']}]",'id':f"{row['model']} [{row['sub']}]",'score':row['value'],'harness':harness,'source_row':index,
                'context':{'model':row['model'],'harness':harness,'stated_effort':effort,'rank':row['rank'],
                    'scope_scores':{scope:next((r['value'] for r in panels[scope]['rows'] if (r['model'],r['sub'])==(row['model'],row['sub'])),None) for scope in sorted(panels)},
                    'scope_tasks':req['boards'],
                    'mean_spend_usd':resource['cost'] if resource else None,'mean_run_time_min':resource['time'] if resource else None,
                    'mean_output_tokens':resource['out'] if resource else None,'resource_row_id':resource['id'] if resource else None,
                    'resource_task_counts':resource.get('n') if resource else None}})
    elif kind=='toolathlon_verified_board':
        # Toolathlon-Verified (HKUST NLP, toolathlon.xyz): the leaderboard page server-renders two tables — the
        # current Verified board (`leaderboard-current-table`) and an archived snapshot of the pre-Verified board
        # (`leaderboard-history-table`). Only the Verified board is this identity: the site itself says the two
        # score series are not comparable, so the archive is never parsed. Inside the Verified board only rows
        # carrying the green check ("Results bearing this badge were independently evaluated by us") are scored;
        # a row submitted by someone else is skipped rather than published as a measurement. The value is the
        # published Pass@1 (mean over three runs); the ± figure is the across-run standard deviation the release
        # post describes, not a confidence interval, and it stays in the protocol with Pass@3, Pass^3, turns and
        # tool calls. Guards: the release identity phrases, the task/server/toolkit counts, both table classes,
        # the badge legend, the column set, the type/agent vocabulary, a ranked board, and the release post's own
        # statements about the 108-task scope, the three runs and what the badge means.
        # 2026-09-21 (iteration 156, CR-37.1): `board: "history"` reads the archived pre-Verified board as its own
        # frozen identity (toolathlon::pre-verified) — never merged with or ranked against the Verified series. Its
        # footnote markers are reviewed, not stripped blindly: `score_markers` (after Pass@1) and `label_markers`
        # (after the model name) each map a mark to the page's own footnote, kept per row; `skip_agents` names the
        # agent configurations that are a different measured system (a vendor SDK scaffold) and are left out.
        req=spec['require'];history=spec.get('board','current')=='history'
        if spec.get('board','current') not in ('current','history'):raise ValueError('Toolathlon board option must be current or history')
        for phrase in req['page_text']:
            if phrase not in source:raise ValueError('Toolathlon page statement changed: '+phrase)
        method=' '.join(load_source(spec['method_source']).split())
        for phrase in req['method_text']:
            if phrase not in method:raise ValueError('Toolathlon release statement changed: '+phrase)
        if 'leaderboard-history-table' not in source:raise ValueError('Toolathlon archived board missing; the page layout changed')
        if 'leaderboard-current-table' not in source:raise ValueError('Toolathlon Verified board missing; the page layout changed')
        board=re.search(r'<table class="performance-table leaderboard-%s-table">(.*?)</table>'%('history' if history else 'current'),source,re.S)
        if not board:raise ValueError('Toolathlon %s board missing'%('archived' if history else 'Verified'))
        score_marks=req.get('score_markers',{});label_marks=req.get('label_markers',{});skip_agents=req.get('skip_agents',[])
        columns=[text(c) for c in re.findall(r'<th[^>]*>(.*?)</th>',board[1],re.S)]
        if columns!=req['columns']:raise ValueError(f'Toolathlon columns changed: {columns!r}')
        verified=0
        for index,tr in enumerate(re.finditer(r'<tr[^>]*>(.*?)</tr>',board[1],re.S)):
            cells={k:v for k,v in re.findall(r'<td[^>]*data-label="([^"]*)"[^>]*>(.*?)</td>',tr[1],re.S)}
            if not cells:continue
            # The archive's rows submitted by others are never read, so a markup slip in one of them (21 Sep 2026:
            # GPT-5.4-xhigh's Pass@1 cell lacks its data-label) cannot block the maintainers' own rows.
            if history and req['badge_marker'] not in cells.get('Model',''):continue
            if set(cells)!=set(req['columns_by_label']):raise ValueError(f'Toolathlon row {index} cells changed: {sorted(cells)!r}')
            if req['badge_marker'] not in cells['Model']:continue
            verified+=1
            label=text(re.sub(r'<svg.*?</svg>|<img[^>]*>|<span class="verified-badge".*?</span>','',cells['Model'],flags=re.S))
            notes=[]
            for mark,note in label_marks.items():
                if label.endswith(' '+mark):label=label[:-len(mark)-1].strip();notes.append(note)
            if not label:raise ValueError(f'Toolathlon row {index}: model label missing')
            kind_=text(cells['Model Type']);agent=text(cells['Agent']);date=text(cells['Date'])
            if kind_ not in req['model_types']:raise ValueError(f'Toolathlon {label!r}: unlisted model type {kind_!r}')
            if agent in skip_agents:verified-=1;continue
            if agent not in req['agents']:raise ValueError(f'Toolathlon {label!r}: unlisted agent configuration {agent!r}')
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',date):raise ValueError(f'Toolathlon {label!r}: unreadable date {date!r}')
            shown=text(cells['Pass@1'])
            for mark,note in score_marks.items():
                if shown.endswith(' '+mark):shown=shown[:-len(mark)-1].strip();notes.append(note)
            score=re.fullmatch(r'(\d+(?:\.\d+)?)(?:\s*±\s*(\d+(?:\.\d+)?))?',shown)
            if not score:raise ValueError(f'Toolathlon {label!r}: unreadable Pass@1 {text(cells["Pass@1"])!r}')
            value=float(score[1])
            if not 0<=value<=100:raise ValueError(f'Toolathlon {label!r}: Pass@1 out of range')
            optional=lambda column:(None if text(cells[column]) in ('','—','-') else numeric(cells[column]))
            rows.append({'name':label,'id':label,'pass_1':value,'harness':agent,'source_row':index,
                'context':{'model':label,'model_type':kind_,'agent':agent,'evaluated_at':date,
                    'pass_1':value,'stddev_across_runs':float(score[2]) if score[2] else None,
                    'pass_3':optional('Pass@3'),'pass_cubed':optional('Pass^3'),
                    'mean_turns':optional('# Turns'),'mean_tool_calls':optional('# Tool Calls') if '# Tool Calls' in cells else None,
                    'independently_evaluated':True,**({'source_notes':notes} if notes else {})}})
        if verified<req['minimum_verified']:raise ValueError(f'Toolathlon %s board shrank: {verified} independently evaluated rows'%('archived' if history else 'Verified'))
        ranked=[r['pass_1'] for r in rows]
        if any(ranked[i]<ranked[i+1] for i in range(len(ranked)-1)):raise ValueError('Toolathlon board is no longer ranked by Pass@1')
    elif kind=='context_arena_summary':
        # Context Arena (Dillon Uzar, contextarena.ai) runs Google DeepMind's open MRCR v2 dataset (eval_hub) against
        # models through their APIs and serves the board the app renders from its own JSON endpoint
        # (/api/needle-summary?needles=8, the default "full" test set). One row per model x reasoning mode, each with
        # per-bin results (tests grouped by total token count into power-of-two bins, 8k ... 1M) and overall metrics.
        # The value is the 8-needle cumulative average up to 128k — the unweighted mean of the five bin scores
        # 8k..128k, the "upto_128K (cumulative)" figure GDM's README says it reports — and every scored row must
        # reproduce it from its own bins. AUC @128k/@1M (Context Arena's trapezoid summaries) stay in the protocol.
        # A row is scored only when all five bins up to 128k are complete; the site's own ranking exclusions
        # (insufficient data, unranked) are honoured, and a deprecated model's run stays a measurement, flagged.
        data=json.loads(source);req=spec['require']
        if data.get('request_params')!=req['request_params']:raise ValueError(f"Context Arena request changed: {data.get('request_params')!r}")
        if data.get('available_bins')!=req['available_bins']:raise ValueError(f"Context Arena bins changed: {data.get('available_bins')!r}")
        readme=' '.join(load_source(spec['method_source']).split())
        for phrase in req['method_text']:
            if phrase not in readme:raise ValueError('MRCR v2 README no longer states: '+phrase[:80])
        models=data.get('models');bins=[str(b) for b in req['scored_bins']];seen=set()
        if not isinstance(models,list) or not models:raise ValueError('Context Arena models missing')
        for index,m in enumerate(models):
            if not isinstance(m,dict) or not set(req['row_keys'])<=set(m) or not isinstance(m.get('model_slug'),str) or '/' not in m['model_slug']:raise ValueError(f'Context Arena row {index} schema changed')
            mode=m['reasoning_mode']
            if mode not in req['reasoning_modes']:raise ValueError(f"Context Arena {m['model_slug']}: unlisted reasoning mode {mode!r}")
            sid=m['model_slug']+('' if mode is None else '@reasoning='+mode)
            if sid in seen:raise ValueError('Context Arena row repeated: '+sid)
            seen.add(sid)
            if not m['has_sufficient_data'] or m['unranked'] or m['has_incomplete_bins_128k']:continue
            if not isinstance(m['max_context_length'],int) or m['max_context_length']<int(bins[-1]):continue
            per=m['bin_metrics'];o=m['overall_metrics']
            if not isinstance(per,dict) or not isinstance(o,dict):raise ValueError(f'Context Arena {sid}: metrics missing')
            scores=[]
            for b in bins:
                cell=per.get(b)
                if not isinstance(cell,dict) or cell.get('is_incomplete') is not False:raise ValueError(f'Context Arena {sid}: bin {b} missing or incomplete on a complete row')
                s=cell.get('avg_score');n=cell.get('n_tests')
                if not isinstance(s,(int,float)) or isinstance(s,bool) or not 0<=s<=1 or not isinstance(n,int) or n<1:raise ValueError(f'Context Arena {sid}: bin {b} unreadable')
                scores.append(s)
            value=o.get('cum_avg_128k')
            if not isinstance(value,(int,float)) or isinstance(value,bool) or abs(value-sum(scores)/len(scores))>req['mean_tolerance']:raise ValueError(f'Context Arena {sid}: cum_avg_128k is not the mean of its bins 8k..128k')
            rows.append({'name':sid,'id':sid,'cum_avg_128k':value,'source_row':index,
                'context':{'model_slug':m['model_slug'],'reasoning_mode':mode,'provider':m.get('provider_name'),'run_providers':m.get('run_provider_names'),
                    'max_context_length':m['max_context_length'],'deprecated':m['is_deprecated'],'total_runs':o.get('total_runs'),
                    'bins_upto_128k':{b:[round(per[b]['avg_score'],6),per[b]['n_tests']] for b in bins},
                    'auc_128k':o.get('auc_128k'),'auc_1m':o.get('auc_1m'),'cum_avg_1m':o.get('cum_avg_1m'),'has_incomplete_bins':m.get('has_incomplete_bins'),
                    'latest_run':m.get('latest_run_timestamp')}})
    elif kind=='lhtb_board':
        # Long-Horizon Terminal-Bench (Tencent HY LLM Frontier, zli12321.github.io/LHTB): the community
        # leaderboard page renders its rows from script.js — the paper's Terminus-2 baselines in `const LB = [...]`
        # (mapped into COMMUNITY with the date and verified flag stated in that map) plus later runs appended with
        # `COMMUNITY.push({...})`. Value: mean reward over the 46 tasks (continuous partial credit 0..1, errors = 0).
        # Only literal objects of the reviewed field sets are read; a new agent or field needs a reviewed change.
        req=spec['require'];page=text(load_source(spec['method_source']))
        for phrase in req['page_text']:
            if phrase not in page:raise ValueError('LHTB leaderboard page no longer states: '+phrase[:80])
        for phrase in req['script_text']:
            if phrase not in source:raise ValueError('LHTB script no longer contains: '+phrase[:80])
        lb=re.findall(r'\bconst LB = \[(.*?)\n  \];',source,re.S)
        if len(lb)!=1:raise ValueError('LHTB: expected exactly one LB literal')
        def fields(obj,allowed,where):
            f=dict(re.findall(r'(\w+):\s*("[^"\n]*"|\[[^\]\n]*\]|-?[\d.]+|true|false)',obj))
            if set(f)-set(allowed) or not {'name','mean'}<=set(f):raise ValueError(f'LHTB {where}: row schema changed: {sorted(f)}')
            f={k:json.loads(v) for k,v in f.items()}
            if not isinstance(f['mean'],(int,float)) or not 0<=f['mean']<=1:raise ValueError(f"LHTB {where}: mean reward unreadable for {f['name']!r}")
            return f
        seed=req['seed'];rows=[];seen=set()
        for index,obj in enumerate(re.findall(r'\{([^{}]+)\}',lb[0])):
            f=fields(obj,req['lb_fields'],'LB')
            rows.append({'name':f['name'],'value':f['mean'],'source_row':index,'agent':seed['agent'],
                'context':{'agent':seed['agent'],'vendor':f.get('vendor'),'date':seed['date'],'verified':seed['verified'],'solved_at_0.95':f.get('solved'),'cost_per_task_usd_paper_estimate':f.get('cost'),'list':'LB (paper baseline)'}})
        seeded=len(rows)
        for index,obj in enumerate(re.findall(r'\bCOMMUNITY\.push\(\{([^{}]+)\}\);',source,re.S)):
            f=fields(obj,req['push_fields'],'COMMUNITY.push')
            if f.get('agent') not in req['agents']:raise ValueError(f"LHTB: unreviewed agent {f.get('agent')!r} for {f['name']!r}")
            if f.get('verified') is not True:raise ValueError(f"LHTB: unverified run {f['name']!r} needs a reviewed decision")
            rows.append({'name':f['name'],'value':f['mean'],'source_row':seeded+index,'agent':f['agent'],
                'context':{'agent':f['agent'],'vendor':f.get('vendor'),'date':f.get('date'),'verified':True,'solved_at_0.90_0.95_1.00':f.get('st'),'submitter':f.get('submitter'),'list':'COMMUNITY.push (after the paper)'}})
        for r in rows:
            key=(r['agent'],r['name'])
            if key in seen:raise ValueError('LHTB: repeated row '+repr(key))
            seen.add(key)
    elif kind=='rn_evals_board':
        # React Native Evals (Callstack, rn-evals.vercel.app): the Next.js page streams its whole board in the
        # server-rendered flight payload (`self.__next_f.push([1,"..."])` chunks) as one object {categories, judgeModel,
        # runStartedAt, runFinishedAt, runCount, warnings, models, evalMatrixById}. Each model row states requirements
        # passed and judged, summed over every eval and every repeat run; the value is the board's overallScorePct, which
        # equals passed / judged x 100 exactly for every complete row. The six eval groups with their eval counts are the suite this identity names;
        # another group set or count is a new identity, never a silent update. A requirement's verdict comes from an
        # LLM judge reading the generated code against the eval's written requirements (the repository's README).
        req=spec['require'];page=text(source);readme=' '.join(load_source(spec['method_source']).split())
        for phrase in req['page_text']:
            if phrase not in page:raise ValueError('React Native Evals page no longer states: '+phrase[:80])
        for phrase in req['method_text']:
            if phrase not in readme:raise ValueError('React Native Evals README no longer states: '+phrase[:80])
        flight=''.join(json.loads(chunk) for chunk in re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)',source))
        starts=[m.start() for m in re.finditer(r'\{"categories":\[',flight)]
        if len(starts)!=1:raise ValueError(f'React Native Evals: expected one board object, found {len(starts)}')
        data,_=json.JSONDecoder().raw_decode(flight,starts[0])
        if set(data)!=set(req['board_keys']):raise ValueError(f'React Native Evals board schema changed: {sorted(data)}')
        groups=[[c.get('id'),c.get('evalCount')] for c in data['categories']]
        if groups!=req['categories']:raise ValueError(f'React Native Evals suite changed (new identity): {groups!r}')
        if not isinstance(data['runCount'],int) or data['runCount']<1:raise ValueError('React Native Evals: run count unreadable')
        if data['warnings']:raise ValueError(f"React Native Evals board carries warnings: {data['warnings']!r}")
        models=data['models'];seen=set()
        if not isinstance(models,list) or not models:raise ValueError('React Native Evals: no model rows')
        most=max(m.get('requirementsTotal') or 0 for m in models)
        for index,m in enumerate(models):
            if not isinstance(m,dict) or set(m)!=set(req['row_keys']):raise ValueError(f'React Native Evals row {index} schema changed')
            passed,judged,pct=m['requirementsPassed'],m['requirementsTotal'],m['overallScorePct']
            if not all(isinstance(x,int) for x in (passed,judged)) or not 0<=passed<=judged or judged<=0:raise ValueError(f"React Native Evals {m['id']!r}: requirement counts unreadable")
            # A complete row (as many judged requirements as the board's largest) must reproduce passed/judged exactly;
            # a row with errored evals is published as a mean over runs of unequal size, so it may differ slightly.
            tolerance=req['pct_tolerance'] if judged==most else req['incomplete_pct_tolerance']
            if not isinstance(pct,(int,float)) or abs(pct-100*passed/judged)>tolerance:raise ValueError(f"React Native Evals {m['id']!r}: score does not reproduce passed/judged")
            if m['id'] in seen or m['label'] in seen:raise ValueError('React Native Evals row repeated: '+m['id'])
            seen.update({m['id'],m['label']})
            rows.append({'name':m['label'],'id':m['id'],'value':pct,'source_row':index,
                'context':{'solver_model':m['solverModel'],'requirements_passed':passed,'requirements_judged':judged,
                    'requirements_judged_most':most,'tokens_used':m['tokensUsed'] or None,'cost_usd':m['costUsd'],
                    'repeat_runs':data['runCount'],'run_finished_at':data['runFinishedAt'],'judge_model_stated':data['judgeModel'],
                    'stated_effort':'not stated'}})
    elif kind=='mls_bench_lite_board':
        # MLS-Bench-Lite (the MLS-Bench authors, mls-bench.com/leaderboard): the Next.js page streams its chart data in the
        # server-rendered flight payload as one object {title, humanSota, data}; each data row {key, name, effort, score, ...}
        # is one model under one harness, `key` = "<name>|<harness>". The value is the row's MLS-Bench-Lite score (the paper's
        # normalized task metric, arithmetic mean over the 30-task Lite subset, Harbor, 5-hour budget per agent). The harness
        # parenthesis must agree with the stated effort; a changed title, row schema or unreviewed effort fails closed.
        req=spec['require'];page=text(source);readme=text(load_source(spec['method_source']))
        for phrase in req['page_text']:
            if phrase not in page:raise ValueError('MLS-Bench leaderboard no longer states: '+phrase[:80])
        for phrase in req['method_text']:
            if phrase not in readme:raise ValueError('MLS-Bench README no longer states: '+phrase[:80])
        flight=''.join(json.loads(chunk) for chunk in re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)',source))
        starts=[m.start() for m in re.finditer(r'\{"data":\[\{"key":',flight)]
        if len(starts)!=1:raise ValueError(f'MLS-Bench: expected one board object, found {len(starts)}')
        data,_=json.JSONDecoder().raw_decode(flight,starts[0])
        if set(data)!=set(req['board_keys']) or data['title']!=req['title']:raise ValueError(f"MLS-Bench board changed: {sorted(data)} {data.get('title')!r}")
        human=data['humanSota']
        if not isinstance(human,(int,float)) or not 0<human<=100:raise ValueError('MLS-Bench: human SOTA reference unreadable')
        seen=set()
        for index,r in enumerate(data['data']):
            if not isinstance(r,dict) or set(r)!=set(req['row_keys']):raise ValueError(f'MLS-Bench row {index} schema changed')
            name,key,effort,score=r['name'],r['key'],r['effort'],r['score']
            if not isinstance(key,str) or not key.startswith(name+'|') or key.count('|')!=1:raise ValueError(f'MLS-Bench row {index}: key {key!r} is not "<name>|<harness>"')
            harness=key.split('|',1)[1].strip()
            if effort not in req['efforts']:raise ValueError(f'MLS-Bench {key!r}: unreviewed effort {effort!r}')
            paren=re.search(r'\(([^()]*)\)$',harness)
            if bool(effort)!=bool(paren) or effort and not re.match(re.escape(effort)+r'\b',paren[1]):raise ValueError(f'MLS-Bench {key!r}: harness does not agree with effort {effort!r}')
            if isinstance(score,bool) or not isinstance(score,(int,float)) or not 0<=score<=100:raise ValueError(f'MLS-Bench {key!r}: score unreadable')
            if key in seen:raise ValueError('MLS-Bench row repeated: '+key)
            seen.add(key)
            rows.append({'name':name,'id':key,'value':score,'source_row':index,'harness':harness,
                'context':{'harness':harness,'stated_effort':effort or 'not stated','board_title':data['title'],'human_sota_reference':human}})
    elif kind=='surge_benchmark_board':
        # Surge AI benchmark pages (surgehq.ai/benchmarks/<slug>, Webflow CMS, server-rendered): the page's own leaderboard
        # is the one `lead-rank-corecraft-list`; every other list on the page is a teaser card for a different Surge board.
        # Each row: brand (`head-rank-table-brand`, e.g. "Claude"), name with the setting in parentheses
        # (`head-rank-table-name`, "Fable 5.1 (Adaptive/Max)") and `data-score` = the printed percentage. The page ranks
        # client-side, so the printed rank is not read. A second own-board list, a changed row shape, a score attribute
        # that disagrees with the printed number, or a repeated label fails closed.
        req=spec['require'];page=text(source);readme=text(load_source(spec['method_source']))
        for phrase in req['page_text']:
            if phrase not in page:raise ValueError('Surge page no longer states: '+phrase[:80])
        for phrase in req['method_text']:
            if phrase not in readme:raise ValueError('Surge README no longer states: '+phrase[:80])
        starts=[m.start() for m in re.finditer(r'class="'+re.escape(req['list_class'])+r' w-dyn-items"',source)]
        if len(starts)!=1:raise ValueError(f"Surge: expected one {req['list_class']} list, found {len(starts)}")
        end=source.find('role="list"',starts[0]+len(req['list_class']))
        body=source[starts[0]:end if end>0 else len(source)]
        chunks=body.split('data-leaderboard-row=""')[1:]
        seen=set()
        for index,chunk in enumerate(chunks):
            brand=re.findall(r'class="head-rank-table-brand"><div[^>]*>([^<]*)</div>',chunk)
            name=re.findall(r'class="head-rank-table-name"><div[^>]*>([^<]*)</div>',chunk)
            score=re.findall(r'data-score="([^"]*)"[^>]*>([^<]*)</div><div[^>]*>%</div>',chunk)
            if len(brand)!=1 or len(name)!=1 or len(score)!=1:raise ValueError(f'Surge row {index}: row shape changed')
            brand,name=html.unescape(brand[0]).strip(),html.unescape(name[0]).strip()
            if not brand or not name:raise ValueError(f'Surge row {index}: empty label')
            attr,printed=score[0]
            try:value=float(attr)
            except ValueError:raise ValueError(f'Surge {brand} {name}: score {attr!r} unreadable')
            if printed.strip()!=attr or not 0<=value<=100:raise ValueError(f'Surge {brand} {name}: score {attr!r} / printed {printed!r}')
            label=f'{brand} {name}'
            if label in seen:raise ValueError('Surge row repeated: '+label)
            seen.add(label)
            setting=re.search(r'\(([^()]*)\)$',name)
            rows.append({'name':label,'id':label,'value':value,'source_row':index,
                'context':{'brand':brand,'stated_setting':setting[1] if setting else 'not stated','board':req['board_title']}})
    elif kind=='researchclawbench_board':
        # ResearchClawBench (InternScience): the static leaderboard page loads data/leaderboard.json {tasks, agents,
        # scores, frontier} — scores[agent][task] = {score 0-100, run_id, model, model_display, cost_usd,
        # duration_seconds} for the Pass@1 view, a task the agent has no scored run for being absent. The page ranks each
        # agent by the plain mean of its scored tasks (app.js getAverageAgentScore). Only the "ResearchHarness (<model>)"
        # rows are collected: they run standalone models under the one lightweight baseline harness, so they compare
        # models; every other agent is a research product (its own scaffold around some model) and is not a model row.
        # The 40 task ids are the suite this identity names; another task list is a new identity.
        req=spec['require'];data=json.loads(source)
        page=text(load_source(spec['detail_source']));readme=' '.join(load_source(spec['method_source']).split());app=load_source(spec['frontend_source'])
        for phrase in req['page_text']:
            if phrase not in page:raise ValueError('ResearchClawBench page no longer states: '+phrase[:80])
        for phrase in req['method_text']:
            if phrase not in readme:raise ValueError('ResearchClawBench README no longer states: '+phrase[:80])
        for phrase in req['app_text']:
            if phrase not in app:raise ValueError('ResearchClawBench app no longer contains: '+phrase[:80])
        if set(data)!=set(req['board_keys']):raise ValueError(f'ResearchClawBench board schema changed: {sorted(data)}')
        if data['tasks']!=req['tasks']:raise ValueError('ResearchClawBench task list changed (new identity)')
        if not set(data['scores'])<=set(data['agents']) or len(set(data['agents']))!=len(data['agents']):raise ValueError('ResearchClawBench agent list inconsistent')
        for index,agent in enumerate(data['agents']):
            found=re.fullmatch(r'ResearchHarness \(([^()]+)\)',agent)
            if not found:continue
            entries=data['scores'].get(agent) or {}
            if not entries or not set(entries)<=set(data['tasks']):raise ValueError(f'ResearchClawBench {agent}: tasks unreadable')
            scores=[];displays=set();runs=[];costs=[]
            for task,entry in entries.items():
                if not isinstance(entry,dict) or not set(entry)<=set(req['entry_keys']) or not {'score','model_display','run_id'}<=set(entry):raise ValueError(f'ResearchClawBench {agent} {task}: entry schema changed')
                if not isinstance(entry['score'],(int,float)) or not 0<=entry['score']<=100:raise ValueError(f'ResearchClawBench {agent} {task}: score unreadable')
                scores.append(entry['score']);displays.add(entry['model_display']);runs.append(entry['run_id'])
                if isinstance(entry.get('cost_usd'),(int,float)):costs.append(entry['cost_usd'])
            if displays!={found[1]}:raise ValueError(f'ResearchClawBench {agent}: runs name another model {sorted(displays)!r}')
            dates=[d for r in runs for d in re.findall(r'_(20\d{6})_',str(r))]
            rows.append({'name':found[1],'value':sum(scores)/len(scores),'source_row':index,'harness':'ResearchHarness',
                'context':{'agent':agent,'tasks_scored':len(scores),'tasks_total':len(data['tasks']),
                    'mean_cost_usd':round(sum(costs)/len(costs),4) if costs else None,'latest_run_date':max(dates) if dates else None,'stated_effort':'not stated','view':'Pass@1'}})
    elif kind=='mcpmark_verified_board':
        # MCPMark Verified (EVAL SYS, mcpmark.ai/leaderboard/verified): the Next.js page streams its table in the
        # server-rendered flight payload as one object {columns, data}; columns are the five MCP services and each data row
        # is one model at one setting, `key` = the model slug (`actualModelName` with dots as dashes) plus an optional
        # `-<effort>`. Single-run evaluation: the value is passAtOne.avg (= avgSuccessRate, std 0), the share of the 127
        # standard (Verified) tasks the run passed. The per-service success rates, weighted by the reviewed task count of
        # each service, must reproduce it — another task set is a new identity, never a silent update. The legacy board
        # (mcpmark.ai/leaderboard, pre-Verified task versions) is deprecated by the maintainers and is not read.
        req=spec['require'];page=text(source);readme=' '.join(load_source(spec['method_source']).split())
        for phrase in req['page_text']:
            if phrase not in page:raise ValueError('MCPMark Verified page no longer states: '+phrase[:80])
        for phrase in req['method_text']:
            if phrase not in readme:raise ValueError('MCPMark README no longer states: '+phrase[:80])
        flight=''.join(json.loads(chunk) for chunk in re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)',source))
        starts=[m.start() for m in re.finditer(r'\{"columns":\[',flight)]
        if len(starts)!=1:raise ValueError(f'MCPMark Verified: expected one board object, found {len(starts)}')
        data,_=json.JSONDecoder().raw_decode(flight,starts[0])
        tasks=req['service_tasks'];total=sum(tasks.values())
        if set(data)!={'columns','data'} or data['columns']!=list(tasks):raise ValueError(f"MCPMark Verified board changed: {sorted(data)} {data.get('columns')!r}")
        if total!=req['tasks_total']:raise ValueError('MCPMark Verified: reviewed task counts do not add up')
        updated=re.search(r'Updated at (\d\d/\d\d/\d{4} \d\d:\d\d:\d\d)',page)
        notes=[n for n in req.get('row_notes',[]) if n in page]
        seen=set()
        for index,r in enumerate(data['data']):
            if not isinstance(r,dict) or set(r)!=set(req['row_keys']):raise ValueError(f'MCPMark Verified row {index} schema changed')
            key,model=r['key'],r['actualModelName']
            if r['name']!=key or not isinstance(model,str) or not model:raise ValueError(f'MCPMark Verified row {index}: name/key/model unreadable')
            slug=re.sub(r'[^a-z0-9]+','-',model.lower()).strip('-')
            effort=key[len(slug)+1:] if key.startswith(slug+'-') else '' if key==slug else None
            if effort is None or effort not in req['efforts']:raise ValueError(f'MCPMark Verified {key!r}: key is not <{slug}>[-<reviewed effort>]')
            p1=r['passAtOne'];avg=r['avgSuccessRate']
            if not isinstance(p1,dict) or set(p1)!={'avg','std'} or p1['avg']!=avg or p1['std']!=0:raise ValueError(f'MCPMark Verified {key!r}: not a single-run Pass@1')
            if isinstance(avg,bool) or not isinstance(avg,(int,float)) or not 0<=avg<=1:raise ValueError(f'MCPMark Verified {key!r}: Pass@1 unreadable')
            services=r['servicesSuccessRate']
            if not isinstance(services,dict) or set(services)!=set(tasks):raise ValueError(f'MCPMark Verified {key!r}: services changed')
            rates={s:services[s].get('avgSuccessRate') for s in tasks}
            if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not 0<=v<=1 for v in rates.values()):raise ValueError(f'MCPMark Verified {key!r}: service rate unreadable')
            if abs(sum(rates[s]*tasks[s] for s in tasks)/total-avg)>req['weighted_tolerance']:raise ValueError(f'MCPMark Verified {key!r}: service rates do not reproduce Pass@1 over {total} tasks')
            if key in seen:raise ValueError('MCPMark Verified row repeated: '+key)
            seen.add(key)
            rows.append({'name':key,'id':key,'value':avg,'source_row':index,
                'context':{'actual_model_name':model,'stated_effort':effort or 'not stated','runs':1,'tasks_total':total,
                    'service_success_rates':rates,'avg_execution_time_s':r['avgExecutionTime'],'board_updated_at':updated[1] if updated else None,
                    'page_notes':[n for n in notes if n.startswith(key+' ') or (' and '+key+' ') in n]}})
    elif kind=='charxiv_val_csv':
        # CharXiv (Princeton PLI, charxiv.github.io): the leaderboard page renders data/val_result.csv, whose header names
        # "Overall" twice (reasoning, then descriptive), so the columns are read by position, never by name. Value = the
        # reasoning Overall on the validation split (1,000 reasoning questions: 440 text-in-chart, 99 text-in-general,
        # 232 number-in-chart, 229 number-in-general); where a row prints all four type scores they must reproduce it.
        # The Human and random-baseline rows are not models. A new header, split or question mix is a new identity.
        req=spec['require'];page=text(load_source(spec['frontend_source']));readme=' '.join(load_source(spec['method_source']).split())
        for phrase in req['page_text']:
            if phrase not in page:raise ValueError('CharXiv page no longer states: '+phrase[:80])
        for phrase in req['method_text']:
            if phrase not in readme:raise ValueError('CharXiv README no longer states: '+phrase[:80])
        table=list(csv.reader(io.StringIO(source.strip().lstrip('﻿'))))
        if not table or table[0]!=req['header']:raise ValueError('CharXiv CSV header changed')
        weights=req['reasoning_types'];total=sum(weights.values());skip=set(req['baseline_rows']);exceptions=req.get('reviewed_inconsistencies',{})
        if total!=req['reasoning_questions']:raise ValueError('CharXiv: reviewed question counts do not add up')
        seen=set();baselines=set()
        for index,r in enumerate(table[1:],1):
            if len(r)!=len(req['header']):raise ValueError(f'CharXiv CSV row {index} width changed')
            name=r[0].strip()
            if not name or name in seen:raise ValueError('CharXiv CSV row unnamed or repeated: '+name)
            seen.add(name)
            if name in skip:baselines.add(name);continue
            if r[1] not in req['weights']:raise ValueError(f'CharXiv {name!r}: unknown weight class {r[1]!r}')
            overall=numeric(r[3])
            if overall is None or not 0<=overall<=100:raise ValueError(f'CharXiv {name!r}: reasoning Overall unreadable')
            parts=[numeric(r[4+i]) for i in range(len(weights))]
            if all(p is not None for p in parts):
                gap=abs(sum(p*w for p,w in zip(parts,weights.values()))/total-overall)
                if gap>exceptions.get(name,req['weighted_tolerance']):raise ValueError(f'CharXiv {name!r}: type scores do not reproduce the reasoning Overall')
            rows.append({'name':name,'value':overall,'source_row':index,
                'context':{'weight':r[1],'size_vision_language_b':r[2],'split':'validation','reasoning_types':dict(zip(weights,[r[4+i] for i in range(len(weights))])),
                    'descriptive_overall':r[8],**({'source_inconsistency':f'type scores reproduce the Overall only within {exceptions[name]} points'} if name in exceptions else {})}})
        if baselines!=skip:raise ValueError('CharXiv baseline rows changed: '+', '.join(sorted(skip-baselines)))
    else:raise ValueError('Unknown parser kind '+kind)
    if not isinstance(rows,list) or not rows:raise ValueError('No source result rows')
    return rows

def collect(plan,registry,root=Path('.'),evidence=None):
    observations=[];collections=[];rejected=[];entries={e['id']:e for e in registry['entries']};cache={}
    def load(s):
        if s['file'] not in cache:
            raw=(root/s['file']).read_bytes();raw=gzip.decompress(raw) if s['file'].endswith('.gz') else raw
            if hashlib.sha256(raw).hexdigest()!=s['sha256']:raise ValueError('Source digest changed: '+s['file'])
            cache[s['file']]=raw.decode('utf-8-sig')
        return cache[s['file']]
    for spec in plan['entries']:
        bid=spec['benchmark_id'];entry=entries[bid];source=spec.get('source')
        if not spec.get('parser'):
            collections.append({'benchmark_id':bid,'status':spec['status'],'reason':spec['reason'],'source_url':entry['primary_url']});continue
        source_specs=[{'source':source,'parser':spec['parser'],'basis':spec.get('basis','measured'),
            'protocol':spec['protocol'],'minimum_rows':spec.get('minimum_rows',1)}]
        source_specs.extend(spec.get('additional_sources',[]))
        count=0;source_urls=[]
        for source_spec in source_specs:
            source=source_spec['source'];rule=source_spec['parser'];parsed=parse(load(source),rule,load);source_count=0;included=set()
            for index,row in enumerate(parsed):
                if rule.get('filter_field') and row.get(rule['filter_field'])!=rule['filter_value']:continue
                if rule.get('skip_field') and row.get(rule['skip_field']) in rule['skip_values']:continue
                # 2026-09-26 (CR-173): a later capture of a manual snapshot board adds only the rows it names. The
                # earlier capture keeps every row it already published (its file, date and ID are never rewritten), so
                # the refresh is an allow-list, and a listed row the source no longer carries fails closed below.
                if rule.get('include_field'):
                    if row.get(rule['include_field']) not in rule['include_values']:continue
                    included.add(row.get(rule['include_field']))
                if rule.get('display_only') and row.get('display') is not True:continue
                raw_name=at(row,rule['name_field']);name=' '.join(str(raw_name).split()) if rule.get('plain_text_names') else text(raw_name)
                if not name:raise ValueError('Missing model name: '+bid+' row '+str(index))
                try:value=numeric(at(row,rule['value_field']))
                except (ValueError,KeyError) as e:raise ValueError(f'{bid} row {index}: {e}') from e
                if value is None:
                    rejected.append({'benchmark_id':bid,'source_id':name,'reason':row.get('reject_reason') or 'No numeric result in source cell; not substituted with zero.'});continue
                scale=rule.get('scale',1);raw_value=value;value*=scale
                lo,hi=entry['scoring']['range']
                if not math.isfinite(value) or lo is not None and value<lo or hi is not None and value>hi:raise ValueError('Score outside registry range: '+bid)
                sid=str(row.get(rule.get('id_field'),name));harness=str(row[rule['harness_field']]) if rule.get('harness_field') and row.get(rule['harness_field']) else rule.get('harness')
                protocol=source_spec.get('protocol',spec['protocol']);src=row.get('run_source') or source
                if 'context' in row:protocol+='; source row: '+json.dumps(row['context'],ensure_ascii=False,separators=(',',':'))
                for field in rule.get('context_fields',[]):
                    if field in row:protocol+=f'; {field}='+str(row[field])
                basis=source_spec.get('basis',spec.get('basis','measured'));o={'id':'public:'+hashlib.sha256(f'{bid}\0{sid}\0{index}'.encode()).hexdigest()[:24],
                    'benchmark_id':bid,'subject':{'source_id':sid,'name':name,'model_id':None,'variant':None,'harness':harness},
                    'value':value,'unit':entry['scoring']['unit'],'basis':basis,
                    'source':{'url':src['url'],'retrieved_at':src.get('retrieved_at',src.get('fetched_at')),'published_at':row.get('published_at',source_spec.get('published_at')),'file':src['file'],'sha256':src['sha256'],
                        'locator':f'{rule["kind"]}; source row {row.get("source_row",index)}; {sid}; field {rule["value_field"]}'},
                    'protocol':protocol,'comparison_key':None}
                if scale!=1 or 'derivation' in row:
                    o.update(basis='derived',source_basis=basis,derivation=row.get('derivation',{'formula':f'Source value × {scale} to registry units','inputs':[raw_value]}))
                supporting=[(k,rule[k]) for k in ['method_source','categories_source','frontend_source','detail_source','config_source'] if k in rule]
                if supporting:
                    o['supporting_sources']=[{'url':s['url'],**{x:s[x] for x in ('zip_member','container_sha256') if s.get(x)},'file':s['file'],'sha256':s['sha256'],'retrieved_at':s.get('retrieved_at',s.get('fetched_at')),'published_at':None,'locator':k} for k,s in supporting]
                if evidence is not None:evidence[o['id']]={'source_row':row,'parser':rule,'source_index':index}
                observations.append(o);count+=1;source_count+=1
            if rule.get('include_field') and set(rule['include_values'])-included:raise ValueError('Listed rows missing from source: '+bid+' '+', '.join(sorted(set(rule['include_values'])-included)))
            if source_count<source_spec.get('minimum_rows',1):raise ValueError('Coverage shrank / no scores: '+bid+' from '+source['url'])
            source_urls.append(source['url'])
        if count<spec.get('minimum_rows',1):raise ValueError('Coverage shrank / no scores: '+bid)
        collections.append({'benchmark_id':bid,'status':'collected','source_url':source_urls[0],'source_urls':source_urls,
            'reason':f'{count} source results parsed from {len(source_urls)} source(s); configurations remain separate; unmatched model identities are retained.'})
    return {'schema_version':1,'observations':observations,'collections':collections,'rejected':rejected}

def main():
    cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('output',nargs='?',default='data/raw/benchmarks/public-observations.json');cli.add_argument('--plan',default='data/raw/benchmarks/collection-plan.json');args=cli.parse_args()
    plan=json.loads(Path(args.plan).read_text());reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
    result=collect(plan,reg);target=Path(args.output)
    if target.exists():
        old=json.loads(target.read_text());oldids={o['id'] for o in old['observations']};newids={o['id'] for o in result['observations']}
        if not oldids.issubset(newids):raise ValueError('Result identity coverage shrank; review a separate candidate output before replacement')
    serialized=json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False)+'\n';fd,path=tempfile.mkstemp(prefix=target.name+'.',dir=target.parent)
    try:
        with os.fdopen(fd,'w') as f:f.write(serialized)
        os.replace(path,target)
    finally:
        if os.path.exists(path):os.unlink(path)
    print(json.dumps({'observations':len(result['observations']),'collected':sum(c['status']=='collected' for c in result['collections']),'collections':len(result['collections'])}))
if __name__=='__main__':main()
