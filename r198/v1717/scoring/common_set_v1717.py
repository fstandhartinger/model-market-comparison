"""v1.7.17: common answered item set on draw v1.6-regular-20261027 = items answered (HTTP 200, ok, no error) by EVERY d1027 row
(8 rows incl. strike-1). Reads the sealed raws in place (pinned sha256), prints aggregates only (counts, per-row exclusions, set hash),
never an id, position or item field. Writes (mode 0600) the private cost-basis files the scorer reads:
  cost-basis-v1717.json        {exclude_opaque_ids: d1027 gold ids NOT in the common set, rule, reference}   (1,500-item gold)
  cost-basis-v1717-msft.json   {exclude_opaque_ids: msft 1,493-view gold ids NOT in the common set, ...}    (msft view gold)
  COMMON-SET.json              aggregates + set sha256 (sorted id list as compact JSON), per-row membership counts
  python3 -I common_set_v1717.py <out-dir>"""
import collections, hashlib, json, os, pathlib, sys
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
D = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
INP = D / 'inputs/input-selfhosted-1500.jsonl'
MSV = D / 'runs-fastlane/microsoft-decision-1-r2-scoreview-1493'
RAWS = {
 'h2o-lightning-4b-v1.4.1': (D / 'runs-fastlane/h2o-lightning-4b-v1.4.1.raw.jsonl', '96d26bb3c0486ecbee832e309db4099b3a616b1540b4a92eff09dec81b719335'),
 'torchcast-decision-31b-v1.0': (D / 'runs-fastlane/torchcast-decision-31b-v1.0.raw.jsonl', 'e51a1c22336050368336c996d7cb32181bad5e854024f07844b2a8577a0dda7d'),
 'arcbright-elf-1-12b-r2': (D / 'runs-auto-intake/arcbright-elf-1-12b-r2.raw.jsonl', '84f08ebb6ff92af453b75cda042f617ea89c5be6a2176c7c69e11f2521da6f08'),
 'jeff_1_1_qwen_4b': (D / 'runs-auto-intake/jgeuter-jeff-1-1-qwen-4b.raw.jsonl', 'c37fada15a2021cf744b2031acb964508caf48873a2bcda5da6d6ac4a5e7c288'),
 'jeff_1_1_large': (D / 'runs-auto-intake/jgeuter-jeff-1-1-large.raw.jsonl', '1f1fdc2df674da00128ae7b47d5ea3429cf1124383a077577e7c68c7d9cc0e72'),
 'decisio-gemma-4-12b-tuned-commit-think': (D / 'runs-auto-intake/tachara-ai-decisio-12b-tuned-commit-think.raw.jsonl', 'd7396dd680e13af9ba26c4526007fee3647d03eee7673bf88075ac510f39cc3c'),
 'microsoft-decision-1-r2': (D / 'runs-fastlane/microsoft-decision-1-r2/microsoft-decision-1-r2.jsonl', None),
 'strike-1': (D / 'runs-auto-intake/strike-1/strike-1.raw.jsonl', None),
}
RAWS['chaoliangunsw-jev-style-2b-decision-v4'] = (D / 'runs-auto-intake/chaoliangunsw-jev-style-2b-decision-v4.raw.jsonl', '96e11049d1593d75ee84fe258f6a6c4020c9e37ebe299c7d18a3b6846fbacf81')
PIN_EXTRA = json.loads(pathlib.Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else {}
assert sha(INP) == '9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
ids = [json.loads(l)['task_id'] for l in INP.read_text().splitlines() if l.strip()]
assert len(ids) == 1500 == len(set(ids))
gold_all = set(ids)
msv_gold = [json.loads(l) for l in (MSV / 'frozen/gold.jsonl').read_text().splitlines() if l.strip()]
msv_ids = {g['opaque_id'] for g in msv_gold}
assert len(msv_ids) == 1493 and msv_ids <= gold_all
ok_by, summ = {}, {}
for k, (p, h) in RAWS.items():
    hh = sha(p)
    if h is None: h = PIN_EXTRA[k]
    assert hh == h, ('HASH MISMATCH', k)
    rows = [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
    tids = [r['task_id'] for r in rows]; assert len(tids) == len(set(tids))
    ok = {r['task_id'] for r in rows if r.get('ok') and r.get('status_code') == 200 and not r.get('error')}
    ok_by[k] = ok
    summ[k] = dict(raw_sha256=hh, rows=len(rows), ok=len(ok), status_counts=dict(sorted(collections.Counter(str(r.get('status_code')) for r in rows).items())),
                   not_measured=len(gold_all - set(tids)))
common = set.intersection(*ok_by.values())
for k in RAWS:
    summ[k]['answered_not_in_common'] = len(ok_by[k] - common)
    summ[k]['common_subset_of_ok'] = common <= ok_by[k]
set_sha = hashlib.sha256(json.dumps(sorted(common), separators=(',', ':')).encode()).hexdigest()
if (len(common), set_sha) != (1489, '4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'):
    raise SystemExit('STOP common set changed: n=' + str(len(common)) + ' sha=' + set_sha + '; carried rows requiring cost review: ' + ', '.join(k for k in RAWS if k != 'chaoliangunsw-jev-style-2b-decision-v4'))
# who drops what (counts only)
drop = collections.Counter()
for t in gold_all - common:
    drop[','.join(sorted(k for k in RAWS if t not in ok_by[k]))] += 1
excl_all = sorted(gold_all - common); excl_ms = sorted(msv_ids - common)
assert len(excl_all) < 150 and len(excl_ms) < 149.3
out = pathlib.Path(sys.argv[1]); out.mkdir(mode=0o700, exist_ok=True)
RULE = ('v1.7.17 same-items cost rule on draw v1.6-regular-20261027: cost per 1,000 decisions on the items every row on this draw answered '
        '(HTTP 200, ok, no error, for all 9 d1027 rows); refused/failed/not-sent items count for no row\'s cost and still count as wrong answers.')
REF = 'common answered set of the 9 d1027 rows (v1.6.30 precedent on v1.6-regular-20261012)'
def w(name, obj):
    p = out / name
    fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f: f.write(json.dumps(obj, indent=1, sort_keys=True) + '\n')
    return sha(p)
cb = w('cost-basis-v1717.json', dict(exclude_opaque_ids=excl_all, rule=RULE, reference=REF))
cbm = w('cost-basis-v1717-msft.json', dict(exclude_opaque_ids=excl_ms, rule=RULE, reference=REF + '; 1,493-item view of microsoft-decision-1-r2'))
res = dict(common_n=len(common), common_set_sha256=set_sha, set_hash_rule='sha256 of the sorted opaque id list as compact JSON',
           excluded_from_1500=len(excl_all), excluded_from_msft_view=len(excl_ms), exclusion_pattern_counts=dict(sorted(drop.items())),
           rows=summ, cost_basis_sha256=cb, cost_basis_msft_sha256=cbm, input_sha256='9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426')
w('COMMON-SET.json', res)
print(json.dumps(res, indent=1, sort_keys=True))
