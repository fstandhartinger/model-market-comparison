#!/usr/bin/env python3
"""SWE-rebench: extract one pinned task window from a captured leaderboard page (data parsing only, no JS).

The page (https://swe-rebench.com/) server-renders ~7.8 MB: every model's statistics for every pair of task-window
boundaries, inside the Next.js Flight payload. A window is a different task set, so one window is one benchmark
identity, and committing the whole page for one window would store hundreds of windows we do not use. This script
keeps exactly the pinned window: the window boundaries, the problems inside it, each item's statistics for that
window, and the row markers the page renders for it (potential contamination / external system), so the parser can
check that its own reading of the source's markers matches what the source displays.

Usage: extract-swe-rebench-window.py PAGE(.html|.gz) FROM_MS TO_MS URL RETRIEVED_AT OUT.json
The pinned window must be the page's own default window (the one its table renders), otherwise the rendered
markers would describe another window and the script refuses.
"""
import gzip,hashlib,html,json,re,sys
from pathlib import Path

def flight(page):
    chunks=re.findall(r'self\.__next_f\.push\((\[.*?\])\)</script>',page,flags=re.S)
    if not chunks:raise ValueError('No Flight payload in page')
    parts=[json.loads(c) for c in chunks]
    return ''.join(p[1] for p in parts if len(p)>1 and isinstance(p[1],str))

def leaderboard(data):
    found=[]
    def walk(o):
        if isinstance(o,dict):
            if isinstance(o.get('items'),list) and isinstance(o.get('dates'),dict) and isinstance(o.get('problems'),list):found.append(o)
            for v in o.values():walk(v)
        elif isinstance(o,list):
            for v in o:walk(v)
    for line in data.split('\n'):
        m=re.match(r'^[0-9a-f]+:(\[.*)$',line)
        if m and '"modelId"' in line:walk(json.loads(m[1]))
    if len(found)!=1:raise ValueError(f'Expected one leaderboard block, found {len(found)}')
    return found[0]

def rendered_rows(page):
    body=page[page.find('<tbody class="g-table__body">'):]
    body=body[:body.find('</tbody>')]
    rows=[]
    for cls,row in re.findall(r'<tr class="([^"]*)">(.*?)</tr>',body,flags=re.S):
        name=re.search(r'rank-table__model-name">([^<]*)<',row)
        if not name:raise ValueError('Rendered row without a model name')
        markers=sorted(m for m in re.findall(r'rank-table__row-([a-z-]+)',cls))
        rows.append({'name':html.unescape(name[1]),'markers':markers})
    if not rows:raise ValueError('No rendered leaderboard rows')
    return rows

def main():
    src,start,end,url,retrieved,out=sys.argv[1:7];start=int(start);end=int(end)
    raw=Path(src).read_bytes();raw=gzip.decompress(raw) if src.endswith('.gz') else raw
    page=raw.decode('utf-8');block=leaderboard(flight(page))
    dates=block['dates']['dates'];si=block['dates']['initialStartIndex'];ei=block['dates']['initialEndIndex']
    if (dates[si],dates[ei])!=(start,end):raise ValueError(f'Pinned window {start}:{end} is not the page default {dates[si]}:{dates[ei]}')
    key=f'{start}:{end}';items=[]
    for it in block['items']:
        stats=it.get('rangeStats',{}).get('all',{}).get(key)
        if stats is None:continue
        items.append({k:it[k] for k in ['modelId','modelName','release','taskRangeTimestamp','agentVersion','meta']}|{'window_stats':stats})
    problems=[p for p in block['problems'] if start<=p['timestamp']<=end]
    result={'source_url':url,'retrieved_at':retrieved,'page_sha256':hashlib.sha256(raw).hexdigest(),'page_bytes':len(raw),
        'extractor':'scripts/extract-swe-rebench-window.py',
        'window':{'from_ms':start,'to_ms':end,'from':block_date(start),'to':block_date(end),'default_window':True,'boundaries_ms':dates},
        'problems':problems,'items':items,'rendered_rows':rendered_rows(page)}
    Path(out).write_text(json.dumps(result,ensure_ascii=False,indent=1,sort_keys=True)+'\n')
    print(json.dumps({'items':len(items),'problems':len(problems),'rendered_rows':len(result['rendered_rows']),'page_sha256':result['page_sha256']}))

def block_date(ms):
    from datetime import datetime,timezone
    return datetime.fromtimestamp(ms/1000,timezone.utc).strftime('%Y-%m-%d')

if __name__=='__main__':main()
