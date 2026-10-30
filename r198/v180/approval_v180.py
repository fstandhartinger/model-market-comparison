"""Release-owner approval binding. PENDING must fail even for a dry flip."""
import hashlib,json,re
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check_approval(W,proof):
 a=proof['publication_approval'];assert a.get('status')=='GO','REFUSED: publication approval PENDING'
 assert isinstance(a.get('card'),int) and a['card']>0 and a.get('selection','').strip() and a.get('go_quote','').strip(),'REFUSED: incomplete approval'
 assert re.fullmatch(r'\d{4}-\d{2}-\d{2}T.+Z',a.get('recorded_at','')),'REFUSED: UTC recorded-at required'
 J=W/'r198/v180';assert a['preview_sha256']==sha(J/'preview/manifest.json'),'REFUSED: different preview'
 assert a['comparison_sha256']==sha(J/'receipts/topfive-diff.json'),'REFUSED: different comparison'
 results=W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json'
 assert a.get('artifact_sha256')==sha(results),'REFUSED: GO belongs to different results'
 preview=json.loads((J/'preview/manifest.json').read_text())
 assert preview.get('results_sha256')==a['artifact_sha256'],'REFUSED: screenshots belong to different results'
 comparison=json.loads((J/'receipts/topfive-diff.json').read_text())
 assert comparison.get('candidate_results_sha256')==a['artifact_sha256'],'REFUSED: comparison belongs to different results'
 assert proof.get('top_five_comparison',{}).get('receipt_sha256')==a['comparison_sha256'],'REFUSED: comparison not bound in proof'
 return a
