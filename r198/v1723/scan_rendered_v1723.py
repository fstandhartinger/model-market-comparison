"""Audit every prerendered HTML file; pin the current release gate separately from immutable archives."""
import argparse,json,pathlib,re,sys,ast
from urllib.parse import quote
ap=argparse.ArgumentParser();ap.add_argument('--root',type=pathlib.Path,default=pathlib.Path.cwd());a=ap.parse_args()
root=a.root;sys.path.insert(0,str(root/'r198/v1723'))
from texts_v1723 import LEAK
html=root/'.next/server/app';assert html.is_dir(), 'production build missing'
findings=[];files=list(html.rglob('*.html'))
for p in files:
 s=p.read_text();m=LEAK.search(s)
 if m:findings.append({'path':str(p.relative_to(html)), 'match':m.group(), 'context':s[max(0,m.start()-60):m.end()+60]})
artifact=json.loads((root/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.23-results.json').read_text())
slug_source=(root/'lib/jev-system-slug.mjs').read_text()
aliases=ast.literal_eval(re.search(r'JEV_SYSTEM_SLUG_ALIASES = (\{.*?\});',slug_source,re.S)[1])
current_paths={'jev-models.html','jev-models/api.html','jev-models/v1.7.23.html'} | {'jev-models/'+quote(aliases.get(r['key'],r['key']),safe='')+'.html' for r in artifact['systems']}
current=[x for x in findings if x['path'] in current_paths]
assert not current,current
print(json.dumps({'status':'PASS','html_files_scanned':len(files),'current_release_html':'clean','current_release_pages_scanned':sum(str(p.relative_to(html)) in current_paths for p in files),'immutable_archive_and_other_page_findings':findings},indent=1))
