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
    # next-rsc: the page renders from its own RSC payload, so the protocol text lives inside the
    # inline <script> chunks; include them verbatim (only where a review names this recipe).
    rsc = len(sys.argv) > 3 and sys.argv[3] == 'next-rsc'
    # D233: an inline formatting element must not start a new line. Two adjacent text nodes were
    # always joined with a newline, so `<a><span>Vending-Bench</span> <span>Deprecated</span></a>`
    # read as two lines and the badge looked like a heading over the next nav group. Only these
    # elements' boundaries become a single space; every other tag boundary stays the newline it is
    # today. Exactly one separator character per boundary either way, so the extracted text keeps
    # its byte length and its `\s+`-normalised form character for character: no excerpt match and
    # no 60,000-byte review bound can move. Line structure is the only thing that changes.
    INLINE = {'a11y-hidden','abbr','acronym','b','bdi','bdo','big','cite','code','data','dfn','em',
              'font','i','ins','del','kbd','mark','nobr','q','rp','rt','ruby','s','samp','small',
              'span','strike','strong','sub','sup','time','tt','u','var','wbr'}
    class Visible(HTMLParser):
        def __init__(self): super().__init__(); self.skip=0; self.parts=[]; self.hard=True
        def boundary(self,tag):
            if tag not in INLINE: self.hard=True
        def handle_starttag(self,tag,attrs):
            if tag in ['script','style'] and not rsc: self.skip+=1
            else: self.boundary(tag)
        def handle_endtag(self,tag):
            if tag in ['script','style'] and self.skip:self.skip-=1
            else: self.boundary(tag)
        def handle_data(self,data):
            if self.skip: return
            if self.parts: self.parts.append('\n' if self.hard else ' ')
            self.parts.append(data); self.hard=False
    if '<html' in raw.lower() or '<!doctype' in raw.lower():
        parser=Visible(); parser.feed(raw); raw=''.join(parser.parts)
    print(raw)
else:
    spec=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py')
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    plan=json.loads(Path(sys.argv[1]).read_text()); registry=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
    evidence={}; result=module.collect(plan,registry,evidence=evidence)
    Path(sys.argv[2]).write_text(json.dumps({'candidate':result,'evidence':evidence},ensure_ascii=False,indent=2)+'\n')
