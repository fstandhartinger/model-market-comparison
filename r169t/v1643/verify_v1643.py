#!/usr/bin/env python3
"""Independent aggregate sanity + build reproducibility; never prints item-level data."""
import pathlib, json, hashlib, subprocess, sys, copy, datetime, re

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
sys.path.insert(0, str(J))
from receipt_validation_v1643 import validate_answer, validate_dispatch
load = lambda p: json.loads(pathlib.Path(p).read_text())
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
paths = list(V.glob("jevbench-v1.6.43-*.json")) + [
    V / "jevbench-v1.6-cohort-topic-cells.json",
    W / "lib/jevbench-v1643-release.mjs",
]
if "--repro" in sys.argv:
    if load(V / "jevbench-v1.6.43-proof.json")["publication_approval"]["status"] == "PASS":
        raise SystemExit("refusing reproducibility rebuild after recording the fresh GO; it resets authority to PENDING")
    before = {str(p): sha(p) for p in paths}
    subprocess.run(
        [sys.executable, str(J / "build_publication_v1643.py")],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    subprocess.run([sys.executable, str(J / "make_lib_v1643.py")], check=True)
    after = {str(p): sha(p) for p in paths}
    assert before == after
    print(
        "PASS: deterministic rebuild, all release, topic-supplement and validator bytes identical"
    )
m = load(V / "jevbench-v1.6.43-publication.json")
r = load(V / "jevbench-v1.6.43-results.json")
prev = load(V / "jevbench-v1.6.42-results.json")
p = load(V / "jevbench-v1.6.43-proof.json")
c = load(V / "jevbench-v1.6.43-categories.json")
by = {s["key"]: s for s in r["systems"]}
assert m["review"].get("verdict") in ["PENDING", "PASS"]
if m["review"]["verdict"] == "PENDING":
    assert m["review"] == {"engine": "PENDING", "verdict": "PENDING", "receipt_sha256": None}
else:
    assert m["review"].get("engine") not in [None, "PENDING"] and re.fullmatch(r"[a-f0-9]{64}", m["review"].get("receipt_sha256", ""))
for k, f in m["files"].items():
    assert sha(W / f["path"]) == f["sha256"], k
for old in prev["systems"]:
    new = copy.deepcopy(by[old["key"]])
    o = copy.deepcopy(old)
    for v in [new, o]:
        v.pop("rank", None)
        v.pop("ranks", None)
    assert new == o, old["key"]
NEW = sorted(load(J / "batch/ROWS.json"))
assert len(r["systems"]) == 78 + len(NEW) and r["n_ranked"] == 67 + len(NEW)
for k in NEW:
    s = by[k]
    q = p["new_rows"][k]
    assert (
        q["raw_sha256"] == p["raw_sha256"][k]
        and q["rows"] == 1500
        and q["over_10s"] == 0
    )
    assert c["systems"][k] and s["cost"]["usd_per_1000"] == q["usd_per_1000"]
    assert q["paid_fast_lane"] is False
    if s["ranked"]:
        assert s["cost"]["common_basis"]["n_items"] == 1485
    else:
        assert (
            s["axes"]["cost"] is None
            and all(v is None for v in s["scores"].values())
            and s["rank"] is None
            and all(k not in b["order"] for b in r["board"].values())
        )
# Independent check against the prior single-row pinned run: points and cells agree;
# bootstrap intervals deliberately use the new full-field seeds.
prior=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r168/v1641/batch')
oldrow=load(prior/'out/jevbench-v1.6.0-results.json')['systems'][0]
for f in ['scores','axes','capability','speed','intelligence','calibration']:
    assert by['subq-snap-1.1'][f]==oldrow[f], ('prior row point estimate',f)
assert {k:v for k,v in by['subq-snap-1.1']['cost'].items() if k!='basis'}=={k:v for k,v in oldrow['cost'].items() if k!='basis'}
assert c['systems']['subq-snap-1.1']==load(prior/'out/categories.json')['systems']['subq-snap-1.1']
_ap = p['publication_approval']
assert _ap['status'] in ['PENDING', 'PASS']
assert _ap['historical_preview']['card_id']=='18406' and _ap['historical_preview']['baseline']=='v1.6.40'
assert _ap['fresh_baseline']=='v1.6.42' and _ap['top_five_changed_by']==['subq-snap-1.1']
assert _ap['refreshed_preview']==p['refreshed_preview']
assert p['refreshed_preview']['baseline']=='v1.6.42' and p['refreshed_preview']['candidate']=='v1.6.43'
binding_path=J / "receipts/REFRESHED-GO-BINDING.json"
assert binding_path.is_file(), "missing final preview binding"
rb=p['refreshed_preview'];assert rb==load(binding_path)
asset_fields=['baseline','candidate','topfive_diff_sha256','approval_comparison_sha256','interactive_preview_sha256','card_image_sha256','card_text_sha256']
asset_binding={k:rb[k] for k in asset_fields}
assert hashlib.sha256(json.dumps(asset_binding,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()==rb['asset_binding_sha256']
for key in asset_fields[2:]:
    assert re.fullmatch(r'[a-f0-9]{64}',rb[key]) and rb[key]!='0'*64,key
assert rb['topfive_diff_sha256']==sha(J / "receipts/topfive-diff.json")
assert rb['approval_comparison_sha256']==sha(J / "receipts/APPROVAL-COMPARISON.json")
assert rb['interactive_preview_sha256']==sha(J / "preview/preview-full-ranking.html")
assert rb['card_image_sha256']==sha(J / "preview/card-v1643.png")
assert rb['card_text_sha256']==sha(J / "preview/REFRESHED-GO-CARD.txt")
sent_receipt=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r175/receipts/CARD-SENT-V1643.json')
if rb['sent_card_id'] is None:
    assert rb['sent_at_utc'] is None and rb['dispatch_receipt_sha256'] is None and rb['dispatch_action_sha256'] is None
else:
    assert isinstance(rb['sent_card_id'],str) and rb['sent_card_id'].isdigit() and rb['sent_card_id']!='18406'
    assert re.fullmatch(r'[a-f0-9]{64}',rb['dispatch_receipt_sha256'] or '')
    assert sent_receipt.is_file() and sha(sent_receipt)==rb['dispatch_receipt_sha256']
    sent=load(sent_receipt)
    assert sent['card_id']==rb['sent_card_id'] and sent['sent_at_utc']==rb['sent_at_utc']
    assert sent['delivery_status']=='DELIVERED' and re.fullmatch(r'[a-f0-9]{64}',sent.get('notify_log_entry_sha256',''))
    assert sent['asset_binding_sha256']==rb['asset_binding_sha256']
    assert sent['card_text_sha256']==rb['card_text_sha256'] and sent['card_image_sha256']==rb['card_image_sha256']
    assert sent['choices']==['Publish (recommended)','Hold','Later'] and sent['ask_minutes']==960 and sent['florian_only'] is True
    checked=validate_dispatch(sent,rb['asset_binding_sha256'],rb['card_text_sha256'],rb['card_image_sha256'],J/'preview/card-v1643.png')
    assert checked['sent_at_utc']==rb['sent_at_utc'] and checked['action_sha256']==rb['dispatch_action_sha256']
if _ap['status']=='PENDING':
    assert _ap['fresh_go'] is None
else:
    go=_ap['fresh_go'];assert go['card_id']==rb['sent_card_id']==go['reply_to_card_id']
    assert go['from_user']=='florian'
    assert go['dispatch_receipt_sha256']==rb['dispatch_receipt_sha256']
    assert go['dispatch_action_sha256']==rb['dispatch_action_sha256']
    rb_sha=hashlib.sha256(json.dumps(rb,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
    if go.get('channel')=='written':
        # Written GO (no button tap): bound to the same dispatch + preview, evidenced by DECISIONS.md.
        assert go['button'] is None and go['decisions_key']=='subq-snap-v1643-go' and go['answer_event_id']=='decisions:subq-snap-v1643-go'
        answer_receipt=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r175/receipts/FRESH-GO-WRITTEN-V1643.json')
        assert answer_receipt.is_file() and sha(answer_receipt)==go['answer_receipt_sha256']
        answer=load(answer_receipt)
        assert answer['kind']=='written-go' and answer['sender']=='florian' and answer['card_id']==go['card_id']
        assert answer['decisions_key']==go['decisions_key'] and answer['answered_at_utc']==go['answered_at_utc']
        assert answer['dispatch_receipt_sha256']==go['dispatch_receipt_sha256'] and answer['dispatch_action_sha256']==go['dispatch_action_sha256']
        assert answer['preview_binding_sha256']==go['preview_binding_sha256']==rb_sha
        decisions=(pathlib.Path.home()/'DECISIONS.md').read_text()
        assert ('"'+answer['quote']+'"') in decisions and 'GO for v1.6.43 (card 18430)' in decisions
    else:
        assert 'channel' not in go and go['button']=='Publish (recommended)'
        answer_receipt=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r175/receipts/FRESH-GO-ANSWER-V1643.json')
        assert answer_receipt.is_file() and sha(answer_receipt)==go['answer_receipt_sha256']
        answer=load(answer_receipt)
        assert answer['sender']=='florian' and answer['card_id']==go['card_id'] and answer['reply_to_card_id']==go['reply_to_card_id']
        assert answer['choice']==go['button'] and answer['answered_at_utc']==go['answered_at_utc'] and answer['event_id']==go['answer_event_id']
        assert answer['dispatch_receipt_sha256']==go['dispatch_receipt_sha256']
        assert answer['preview_binding_sha256']==go['preview_binding_sha256']
        checked_answer=validate_answer(answer,sent,rb['dispatch_receipt_sha256'],rb_sha)
        assert checked_answer['event_id']==go['answer_event_id'] and checked_answer['answered_at_utc']==go['answered_at_utc']
    sent_time=datetime.datetime.strptime(rb['sent_at_utc'],'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc)
    answer_time=datetime.datetime.strptime(go['answered_at_utc'],'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc)
    assert answer_time>=sent_time and answer_time<=datetime.datetime.now(datetime.timezone.utc)
assert 'refreshed_preview_approval' not in p and 'refreshed_preview_go_card' not in p
for f in paths:
    if f.suffix == ".json" and not any(
        f.name.endswith("-" + k + ".json") for k in ["history", "history-carry"]
    ):
        text = f.read_text()
        assert (
            "/home/flori/" not in text
            and '"task_id"' not in text
            and '"item_text"' not in text
        ), f
assert (
    sha("/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py")
    == "02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9"
)
assert (
    sha("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
    == "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7"
)
print(
    "PASS: " + str(78 + len(NEW)) + " rows; 78 carried rows byte-identical except placement; source hashes, row proof, common cost basis, PENDING review and public aggregate-only artifacts verified"
)
