import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent
p=J/'inputs/APPROVAL.json'
a=json.loads(p.read_text()) if p.exists() else {'fresh_baseline':'v1.7.2','status':'GO (fair top-five change, Florian rule 25 Oct 2026)','go':{'channel':'laptop chat','date':'2026-10-25','quote':'3 ja','in_answer_to':'fair JevBench top-5 changes publish without asking (audit-pattern check; preview card for info only)','recorded_in':'DECISIONS.md 2026-10-25 setup-review-open-questions-answered'},'button_tap':False,'top_five_effect':'changed','fairness_check':{'path':'/home/flori/jobs/jevbench-add-requests-20260919/workers/r185-e4b-prescore/RESULT.json','verdict':'PENDING'},'asks':[{'key':'chon-1.0-e4b','admission':'custody #26284 item 2; deputy #26197/#26198','handoff':'lead run 185 HANDOFF-CHONE4B-R185.md','relay':'regular queue'}]}
a['top_five_preview']={'path':'r185/v173/receipts/topfive-diff.json','sha256':hashlib.sha256((J/'receipts/topfive-diff.json').read_bytes()).hexdigest()}
p.write_text(json.dumps(a,indent=1,sort_keys=True)+'\n')
print('Approval bound; fairness verdict',a['fairness_check']['verdict'])
