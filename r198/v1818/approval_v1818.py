"""Release authority is deliberately unresolved until the lead records independent fairness review."""
import json

def check_approval(W,proof):
 a=json.loads((W/'r198/v1818/inputs/APPROVAL.json').read_text())
 assert proof['publication_approval']==a
 assert a.get('fairness_review_required') is False, 'REFUSED: independent fairness review remains required'
 assert proof['rank_review'].get('fairness_review')=='PASS', 'REFUSED: fairness review PENDING'
 return True
