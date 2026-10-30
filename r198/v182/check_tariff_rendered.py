"""Report the exact archived release pages affected by the pure tariff-label branch."""
import pathlib,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];R=W/'.next/server/app/jev-models';rows=[];affected=[]
for p in sorted(R.glob('v*.html')):
 if not re.fullmatch(r'v[0-9]+(?:\.[0-9]+)+',p.stem):continue
 text=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',p.read_text())
 # Only this branch renders the new phrase; any appearance flags the page for review.
 text=re.sub(r'<!--.*?-->','',text,flags=re.S)
 count=len(re.findall(r'\(public list price\)|Cost evidence</dt><dd[^>]*>public list price;',text));rows.append({'route':'/jev-models/'+p.stem,'public_list_price_occurrences':count})
 if count and p.stem!='v1.8.2':affected.append('/jev-models/'+p.stem)
decide=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',(R/'decide-1.1.html').read_text());assert 'public list price' in decide
jeff=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',(R/'jeff_1_1_large.html').read_text());assert 'google/gemma-4-31B-it' in jeff and '970c21af246a44c5527f7109fca129ab6015c941/README.md' in jeff
receipt={'status':'PASS','label':'public list price','decide_row_label_rendered':True,'jeff_large_cited_label_rendered':True,'archived_release_pages_with_new_label':affected,'archive_pages':rows,'interpretation':'The function changes only tariff -> public list price. Match actual parenthesized cost labels and Cost evidence values after stripping React comments; ordinary prose references are excluded. Archived pages with zero matches do not render that branch.'}
(J/'receipts/TARIFF-RENDERED.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS tariff label and Jeff cited base rendered;',len(rows),'versioned pages;',len(affected),'archived pages render changed tariff branch',affected)

# Enumerate actual current rendered callers, excluding React payloads and metadata.
import html
current=[];prose_only=[]
for p in sorted((W/'.next/server/app').rglob('*.html')):
 route='/'+str(p.relative_to(W/'.next/server/app').with_suffix(''))
 if re.search(r'/v[0-9]+(?:\.[0-9]+)+$',route):continue
 text=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',p.read_text())
 text=re.sub(r'<!--.*?-->','',text,flags=re.S)
 text=html.unescape(re.sub(r'<[^>]+>','',text))
 en=len(re.findall(r'\(public list price\)|Cost evidencepublic list price;',text));de=len(re.findall(r'\(öffentlicher Listenpreis\)',text))
 if not (en or de) and 'public list price' in text:prose_only.append(route)
 if en or de:current.append({'route':route,'english_label_occurrences':en,'german_label_occurrences':de,'html_sha256':__import__('hashlib').sha256(p.read_bytes()).hexdigest()})
receipt['current_pages_rendering_tariff_label']=current
receipt['current_page_count']=len(current)
receipt['prose_only_pages_excluded']=prose_only
receipt['german_label']='öffentlicher Listenpreis'
receipt['caller_coverage']=['app/jev-models/[system]/page.tsx','components/JevBenchRankingTable.tsx','components/JevComparisonPage.tsx','app/jev-models/open-source-jev/page.tsx','app/jev-models/alternatives/page.tsx','app/jev-models/how-to-choose/page.tsx','components/JevV141SystemDetail.tsx','app/de/jev-models/alternativen/page.tsx']
receipt['scope_note']='Exhaustive built current HTML routes rendering parenthesized tariff evidence or the Cost evidence value; ordinary prose and historical release notes are excluded. Conditional callers such as how-to-choose change only when their selected row has tariff evidence. Ranked-only tables exclude unranked rows.'
(J/'receipts/TARIFF-RENDERED.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n')
print('Current pages rendering tariff label:',len(current))
