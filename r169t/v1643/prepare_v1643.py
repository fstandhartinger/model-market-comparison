#!/usr/bin/env python3
"""Prepare the v1.6.43 batch: the 75 published v1.6.42 registry rows plus ONE hosted API row (subq-snap-1.1).
The 74 same-draw rows (all but the hosted GLiDE row, which was scored on a derived 1,497-item gold) form the field that is scored on the
real 1,500-item gold together with the new row. No submission code runs. The sealed raw stays outside Git."""
import collections, hashlib, importlib.util, json, pathlib, os, sys

sys.dont_write_bytecode = True
J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
B = J / "batch"
B.mkdir(exist_ok=True, mode=0o700)
(B / "runs").mkdir(exist_ok=True, mode=0o700)
os.environ["JEV_NOUL_METHOD"] = "O1S"
sys.path.insert(0, "/home/flori/jobs/jevbench-v16-run-20261001/harness")
import score_v16 as SC

SEAL = pathlib.Path("/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012")
gold = SC.load_gold(SEAL / "frozen/gold.jsonl")
load = lambda p: json.loads(pathlib.Path(p).read_text())
put = lambda p, v: pathlib.Path(p).write_text(
    json.dumps(v, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
)
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
P = pathlib.Path("/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py")
PS = sha(P)
assert PS == "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7"
spec = importlib.util.spec_from_file_location("pricing", P)
pr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pr)
cat = pr.catalog_rates()
proof = load(W / "data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.42-proof.json")
# Base registry = the v1.6.42 sealed registry (bound by the v1.6.42 proof).
S40 = SEAL / "frozen-release-v1.6.42"
assert sha(S40 / "REGISTRY-PUBLIC.json") == proof["registry_sha256"]
reg = load(S40 / "REGISTRY-PUBLIC.json")
assert len(reg) == 75 and "fastino-glide-api" in reg
# Raw locations of the carried rows (hash-checked below); the symlink farm of the v1.6.42 build may have been cleaned up.
ROOT = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
CANDIDATES = lambda k: [
    B / "runs" / f"{k}.jsonl",
    ROOT / f"workers/r168-v1640-build2/wt/r168/v1640/batch/runs/{k}.jsonl",
    ROOT / f"r154/v1636/batch/runs/{k}.jsonl",
    SEAL / f"runs/api-full/{k}.jsonl",
    SEAL / f"runs-fastlane/{k}.raw.jsonl",
    pathlib.Path("/home/flori/jobs/fastlane-iota-d831408e-20261021/run/out/raw.jsonl"),
    pathlib.Path("/home/flori/jobs/fastlane-holds-20261021/h2o31b-run/out/raw.jsonl"),
]
# The hosted GLiDE row was scored on a derived 1,497-item gold; it is carried by bytes and is not part of the real-gold field run.
GLIDE = "fastino-glide-api"
for k in reg:
    src = next((c.resolve() for c in CANDIDATES(k) if c.exists() and sha(c.resolve()) == proof["raw_sha256"][k]), None)
    assert src is not None, f"no hash-matching raw found for {k}"
    dst = B / "runs" / f"{k}.jsonl"
    if k == GLIDE:
        if dst.is_symlink():
            dst.unlink()  # the field directory holds only the rows scored on the real gold
        continue
    if dst.is_symlink():
        dst.unlink()
    dst.symlink_to(src)
cb = S40 / "cost-basis.json"
assert sha(cb) == "2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d"
(B / "cost-basis-v1630.json").write_bytes(cb.read_bytes())
EX = set(load(cb)["exclude_opaque_ids"])
assert len(EX) == 15
gold = SC.load_gold(SEAL / "frozen/gold.jsonl")
assert len(gold) == 1500
carried_field = {k: v for k, v in reg.items() if k != GLIDE}
assert len(carried_field) == 74

KEY = 'subq-snap-1.1'
OLD = ROOT / 'r168/v1641/batch/REGISTRY-SUBQ11.json'
# Frozen scoring spec remains exact; public provenance replaces stale preview text only.
assert sha(OLD)=='b35e419b13135db0004585fad2fc05c31cf2c034b3a4217ddf31af23f858d3ff'
pinned = load(OLD)[KEY]
assert pinned['price_in_per_m'] == 0.04 and pinned['price_out_per_m'] == 0.0
RAW = SEAL / 'runs/api-full/subq-snap-1.1.jsonl'
RAW_SHA = '5c00dc93acc4afe74679b55d1eb512bc51822d1772cf9d1f3590264127d77584'
assert sha(RAW) == RAW_SHA
rr = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
assert len(rr) == len({r['task_id'] for r in rr}) == 1500
assert {r['task_id'] for r in rr} == set(gold)
assert all(r['ok'] and r['status_code'] == 200 and r['probs_source'] == 'native' and r['provider_model_id']=='subq-snap-1.1' for r in rr)
assert all(isinstance(r.get('usage'), dict) and isinstance(r['usage']['input_tokens'],int) and r['usage']['output_tokens']==0 for r in rr)
tin=sum(r['usage']['input_tokens'] for r in rr); tout=sum(r['usage']['output_tokens'] for r in rr)
assert (tin,tout)==(1939205,0)
eligible=[r for r in rr if r['task_id'] not in EX]; assert len(eligible)==1485
ci=sum(r['usage']['input_tokens'] for r in eligible); co=sum(r['usage']['output_tokens'] for r in eligible)
resolved=pr.resolve(KEY,dict(pinned,source='api'),rr,cat)
assert resolved['rankable'] and resolved['counting_list_price']
usd_common=1000*(ci*0.04+co*0.0)/1e6/1485
usd_all=1000*tin*0.04/1e6/1500
lat=sorted(r['latency_s'] for r in rr)
assert max(lat)<10
# These fields do not affect scoring. All computational fields remain from the pinned spec.
e=dict(pinned)
e.update(
 cost_basis=f"Vendor's published standard launch tariff, USD 0.04 per million input tokens; output free (read 22 Oct 2026 at https://docs.subq.ai/using-the-api/models/ and https://subq.ai). Counted under the frozen I-1 launch-list-price rule. Capacity-limited public preview, first come first served, with a waitlist once capacity is reached; not openly bookable by everyone. Promotional signup credits are excluded. Own measured usage: {tin:,} input / 0 output tokens over all 1,500 decisions. Common 1,485-item cost basis: {ci:,} input / 0 output tokens, USD {usd_common:.9f} per 1,000 decisions; all-item cost USD {usd_all:.9f} per 1,000. The historical preview row keeps its frozen USD 0.05/M input tariff.",
 code_revision='Hosted SubQ Snap 1.1; measured 22 Oct 2026.',
 disclosure='SubQ Snap 1.1 is a capacity-limited public preview (first come first served, with a waitlist). SAME-AUTHOR SECOND use of this draw: SubQ already saw the sealed items on 13 Oct 2026 through subq-snap-preview; version 1.1 was released afterwards. The old preview name now routes to the same model; its historical row remains labelled as the 13 Oct measurement, with its frozen USD 0.05/M tariff unchanged. This row uses the published USD 0.04/M input tariff, output free, excluding signup credits. All 1,500 items answered once with native probabilities and reported token usage. Permission-error requests never reached the model; collection resumed after access was restored. S/P check versus the preview: sealed accuracy 84.25% vs 85.00% (-0.75 pp), public 90.33% vs 88.67% (+1.67 pp); sealed-minus-public gain -2.42 pp, 95% CI [-6.00, +1.17] pp, zero inside: not flagged. No evidence of public-item tuning in this check; prior exposure remains disclosed.',
 endpoint_condition='Vendor-hosted api.subq.ai /v1/systemone, served model subq-snap-1.1, measured 22 Oct 2026 from the evaluator host, official per-item latency subset without API adjustment. Full S1200+P300 draw; single same-author second use, provider saw the sealed items in the 13 Oct preview run. Native probabilities, no generated tokens. Hosting implementation and deployed weights were not independently inspected. Inputs retained indefinitely by default; this run used already-retired items.',
)
for k in pinned:
 if k not in ['cost_basis','endpoint_condition']: assert e[k]==pinned[k]
import re
for f,v in e.items(): assert not isinstance(v,str) or not re.search(r'/home/|board|#\d{4,5}|r168|deputy|PREREG',v), f
reg[KEY]=e
(B/'runs'/f'{KEY}.jsonl').symlink_to(RAW) if not (B/'runs'/f'{KEY}.jsonl').exists() else None
reviews={}
for name in ['r168-review','r168-review2','r168-review3','r168-review4']:
 p=ROOT/'workers'/name/'RESULT.json'; reviews[name]={'sha256':sha(p),'verdict':load(p)['verdict']}
assert reviews['r168-review4']['verdict']=='PASS'
equiv=ROOT/'r168/receipts/PRICING-EQUIV-R168-CAND2.json'
assert load(equiv)['PASS'] and load(equiv)['cand_sha256']==PS
entries={KEY:dict(raw_sha256=RAW_SHA,custody='Admitted same-author second use of the already-retired draw; exposure recorded before dispatch.',handoff='Completed run-168 measurement receipt; native responses and usage audited.',pre_score_review=str(ROOT/'workers/r168-review/RESULT.md'))}
rows={KEY:dict(raw_sha256=RAW_SHA,rows=1500,status_counts={'200':1500},ok=1500,input_tokens=tin,output_tokens=tout,common_input_tokens=ci,common_output_tokens=co,over_10s=0,max_latency_s=max(lat),raw_p50_s=(lat[749]+lat[750])/2,raw_p95_s=lat[1425],usd_common=usd_common,usd_all_items=usd_all)}
for name,value in [('REGISTRY-PUBLIC',reg),('REGISTRY-FIELD',{k:v for k,v in reg.items() if k!=GLIDE}),('REGISTRY-CARRIED',carried_field),('ENTRIES',entries),('ROWS',rows)]: put(B/(name+'.json'),value)
put(J/'receipts/PRICING-DECISIONS.json',dict(module_sha256=PS,resolve=resolved,usd_common=usd_common,pinned_registry_sha256=sha(OLD),reviews=reviews,pricing_install_sha256=sha(ROOT/'r168/pricing/INSTALL.md'),pricing_equivalence_sha256=sha(equiv),raw_total_charge_usd=tin*0.04/1e6))
sp=load(ROOT/'r168/receipts/SUBQ-S-VS-P-R168.json');sp.pop('inputs');put(J/'receipts/SUBQ-S-VS-P.json',sp)
assert not sp['flag_for_release_owner']
print(json.dumps(rows,indent=1))
print('PASS: 75 carried raw hashes verified; 74 carried field rows + SubQ, pinned computational spec, own token/cost totals and prior reviews checked')
