#!/usr/bin/env python3
"""Offline candidate plus native source-row evidence; never execute downloaded code."""
import sys, json, importlib.util, gzip, subprocess, re
from pathlib import Path
from html.parser import HTMLParser
# Candidate extraction must not create code artifacts in a data-only staging run.
sys.dont_write_bytecode = True

if sys.argv[1] == 'text':
    path=Path(sys.argv[2]); data=path.read_bytes()
    if path.suffix=='.gz': data=gzip.decompress(data)
    if data.startswith(b'%PDF'):
        raw=subprocess.run(['pdftotext','-layout','-','-'],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,timeout=20).stdout.decode('utf-8')
        if len(sys.argv)>3 and sys.argv[3]=='deepseek-v3-table6':
            pages=raw.split('\f')
            hits=[i for i,page in enumerate(pages) if re.search(r'Table 6\s*[|:]',page) and all(label in page for label in ['SWE Verified','Aider-Polyglot','LongBench v2','DeepSeek'])]
            if len(hits)!=1: raise ValueError('DeepSeek V3 Table 6 identity/layout changed or is ambiguous')
            index=hits[0]
            # Entire table page plus preceding methods page, with PDF page locators.
            raw='\n'.join(f'PDF page {i+1}\n'+pages[i] for i in range(max(0,index-1),index+1))
    else:
        raw=data.decode('utf-8-sig')
    class Visible(HTMLParser):
        def __init__(self): super().__init__(); self.skip=0; self.parts=[]
        def handle_starttag(self,tag,attrs):
            if tag in ['script','style']: self.skip+=1
        def handle_endtag(self,tag):
            if tag in ['script','style'] and self.skip:self.skip-=1
        def handle_data(self,data):
            if not self.skip:self.parts.append(data)
    if '<html' in raw.lower() or '<!doctype' in raw.lower():
        parser=Visible(); parser.feed(raw); raw='\n'.join(parser.parts)
    print(raw)
else:
    spec=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py')
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    plan=json.loads(Path(sys.argv[1]).read_text()); registry=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
    evidence={}; result=module.collect(plan,registry,evidence=evidence)
    Path(sys.argv[2]).write_text(json.dumps({'candidate':result,'evidence':evidence},ensure_ascii=False,indent=2)+'\n')
