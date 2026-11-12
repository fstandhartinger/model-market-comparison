"""Compare rendered archived kickers against the unchanged base TSX literal.
Only the first static bh-eyebrow element is the kicker; React adds no dynamic data to these literals.
"""
import pathlib,re,json,hashlib,html
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];receipt=json.loads((J/'receipts/CARRIED-ROWS.json').read_text());rows=[]
for rel,source_hash in receipt['archived_v17_pages_source_byte_equal'].items():
 p=W/rel;assert hashlib.sha256(p.read_bytes()).hexdigest()==source_hash
 m=re.search(r'<div className="bh-eyebrow"[^>]*>(.*?)</div>',p.read_text(),re.S);assert m and '<'not in m[1] and '{'not in m[1]
 version=p.parent.name;built=W/'.next/server/app/jev-models'/f'{version}.html';s=built.read_text();rendered=re.search(r'<div class="bh-eyebrow"[^>]*>(.*?)</div>',s,re.S);assert rendered,version
 # React escapes HTML-sensitive characters in literal JSX text.
 expected=html.escape(html.unescape(m[1]),quote=False).replace("'",'&#x27;').replace('"','&quot;')
 assert rendered[1]==expected,(version,rendered[1],expected)
 rows.append({'version':version,'rendered_kicker_sha256':hashlib.sha256(rendered[1].encode()).hexdigest(),'base_literal_sha256':hashlib.sha256(expected.encode()).hexdigest(),'byte_equal':True})
(J/'receipts/ARCHIVE-KICKERS.json').write_text(json.dumps({'status':'PASS','pages':rows,'method':'Base source pages proved byte-equal in CARRIED-ROWS; their static JSX kicker literals rendered to bytes and compared to production Next HTML.'},indent=1,sort_keys=True)+'\n')
print('PASS',len(rows),'archived v1.7 rendered kickers byte-equal')
