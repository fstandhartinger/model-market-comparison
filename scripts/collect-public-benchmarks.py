#!/usr/bin/env python3
"""Parse captured public sources; all transforms are data parsing, never JS execution."""
import argparse,csv,gzip,hashlib,html,io,json,math,re,sys,os,tempfile
from pathlib import Path
from html.parser import HTMLParser

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
    match=re.fullmatch(r'\$?([-+]?\d[\d,]*(?:\.\d+)?)(?:%|\*)?(?:\s*(?:±|\+/-|\(|\[).*)?',value)
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
    elif kind=='csv':rows=csvrows(source)
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
        for index,r in enumerate(table[spec.get('header_rows',1):],spec.get('header_rows',1)):
            cells=[text(' '.join(c)) for c in r]
            if len(cells)!=spec['width']:continue # Detail/footnote rows have a distinct width.
            for column,label in spec.get('value_columns',[[spec['value_column'],None]]):
                rows.append({'name':cells[spec['name_column']],'value':cells[column], 'source_row':index,'context':{'cells':cells,'configuration':label,'value_column':column}})
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
        arrays=[]
        def scan(v):
            if isinstance(v,dict):
                if isinstance(v.get('entries'),list) and v['entries'] and 'model' in v['entries'][0] and 'score' in v['entries'][0]:arrays.append(v['entries'])
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
        if len(arrays)!=1 or 'swe_bench_pro_public' not in source:raise ValueError('SWE Pro public source identity changed')
        rows=arrays[0]
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
        rule=spec['parser'];parsed=parse(load(source),rule,load);count=0
        for index,row in enumerate(parsed):
            if rule.get('filter_field') and row.get(rule['filter_field'])!=rule['filter_value']:continue
            if rule.get('skip_field') and row.get(rule['skip_field']) in rule['skip_values']:continue
            if rule.get('display_only') and row.get('display') is not True:continue
            raw_name=at(row,rule['name_field']);name=' '.join(str(raw_name).split()) if rule.get('plain_text_names') else text(raw_name)
            if not name:raise ValueError('Missing model name: '+bid+' row '+str(index))
            try:value=numeric(at(row,rule['value_field']))
            except (ValueError,KeyError) as e:raise ValueError(f'{bid} row {index}: {e}') from e
            if value is None:
                rejected.append({'benchmark_id':bid,'source_id':name,'reason':'No numeric result in source cell; not substituted with zero.'});continue
            scale=rule.get('scale',1);raw_value=value;value*=scale
            lo,hi=entry['scoring']['range']
            if not math.isfinite(value) or lo is not None and value<lo or hi is not None and value>hi:raise ValueError('Score outside registry range: '+bid)
            sid=str(row.get(rule.get('id_field'),name));harness=str(row[rule['harness_field']]) if rule.get('harness_field') and row.get(rule['harness_field']) else rule.get('harness')
            protocol=spec['protocol']
            if 'context' in row:protocol+='; source row: '+json.dumps(row['context'],ensure_ascii=False,separators=(',',':'))
            for field in rule.get('context_fields',[]):
                if field in row:protocol+=f'; {field}='+str(row[field])
            basis=spec.get('basis','measured');o={'id':'public:'+hashlib.sha256(f'{bid}\0{sid}\0{index}'.encode()).hexdigest()[:24],
                'benchmark_id':bid,'subject':{'source_id':sid,'name':name,'model_id':None,'variant':None,'harness':harness},
                'value':value,'unit':entry['scoring']['unit'],'basis':basis,
                'source':{'url':source['url'],'retrieved_at':source.get('retrieved_at',source.get('fetched_at')),'published_at':None,'file':source['file'],'sha256':source['sha256'],
                    'locator':f'{rule["kind"]}; source row {row.get("source_row",index)}; {sid}; field {rule["value_field"]}'},
                'protocol':protocol,'comparison_key':None}
            if scale!=1 or 'derivation' in row:
                o.update(basis='derived',source_basis=basis,derivation=row.get('derivation',{'formula':f'Source value × {scale} to registry units','inputs':[raw_value]}))
            supporting=[(k,rule[k]) for k in ['method_source','categories_source','frontend_source'] if k in rule]
            if supporting:
                o['supporting_sources']=[{'url':s['url'],'file':s['file'],'sha256':s['sha256'],'retrieved_at':s.get('retrieved_at',s.get('fetched_at')),'published_at':None,'locator':k} for k,s in supporting]
            if evidence is not None:evidence[o['id']]={'source_row':row,'parser':rule,'source_index':index}
            observations.append(o);count+=1
        if count<spec.get('minimum_rows',1):raise ValueError('Coverage shrank / no scores: '+bid)
        collections.append({'benchmark_id':bid,'status':'collected','source_url':source['url'],'reason':f'{count} source results parsed; configurations remain separate; unmatched model identities are retained.'})
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
