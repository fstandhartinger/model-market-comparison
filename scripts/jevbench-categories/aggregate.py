"""Per-system per-category aggregates for JevBench v1.5.4 and ImageJevBench v0.1.5 (aggregates only leave Sandy).
Labels: Winnow-12B (s1-pro model) on our own pod, plus documented item-group rules (RULES below)."""
import json, sys, collections, hashlib
from pathlib import Path
sys.path.insert(0, '/home/flori/jobs/jevbench-v15-measure-20260925/harness')
import score_v15 as S
from taxonomy import TOPICS, USE_CASES
D = Path('/home/flori/jevbench-sealed/v1.5/radars-20261001'); ID = Path('/home/flori/jevbench-sealed/imagejev-radars-20261001')
REPO = Path('/home/flori/wt/bench-radars-usecases-20261001')
MIN_N = 15; SECOND_P = 0.15
RENAME = {'ecommerce': 'ecommerce_marketplaces', 'moderation': 'moderation_trust_safety'}   # = bench-usecase-tasks keys (#7817)
UC = [(RENAME.get(k, k), l, c) for k, l, c in USE_CASES]
RULES = {
 'usecase_primary': {'model_routing': ['routing', 'routing_hard', 'tool_selection'],
                     'llm_guardrails': ['tool_guardrail', 'unsafe_action', 'adequacy', 'judge_hard', 'policy_compliance']},
 'topic': {'finance_commerce': ['lead_qualification']},
}
RULE_TEXT = [
 'routing, routing_hard and tool_selection items (choose the model, agent or tool that handles a request) are Model routing first; the labeller tagged many by the request subject.',
 'tool_guardrail, unsafe_action, adequacy, judge_hard and policy_compliance items (check an agent tool call or a drafted answer before it goes out) are LLM guardrails first.',
 'lead_qualification items take the topic Finance & commerce (sales); the labeller read the scoring rubric as rules & law.',
 'A second use case is kept when the labeller gave it probability >= 0.15 and it is not Other.',
]
pod = {json.loads(l)['id']: json.loads(l) for l in open(D / 'labels-winnow-pod.jsonl')}
def ranked(k): return sorted(pod[k]['probs'].items(), key=lambda kv: -kv[1])
def usecases(key, family=None):
    p = ranked(key); first = RENAME.get(p[0][0], p[0][0]); rest = [(RENAME.get(k, k), v) for k, v in p[1:]]
    forced = next((uc for uc, fams in RULES['usecase_primary'].items() if family in fams), None)
    if forced and forced != first:
        out = [forced] + ([first] if first != 'other' else [])
    else:
        out = [first] + [k for k, v in rest[:1] if v >= SECOND_P and k != 'other' and k != first]
    return out[:2]
def topic(oid, family):
    for t, fams in RULES['topic'].items():
        if family in fams: return t
    return ranked(oid + '::topic')[0][0]

# ---------------- JevBench v1.5.4
gold = S.load_gold(Path('/home/flori/jevbench-sealed/v1.5/frozen/all-1624.jsonl'))
allrows = {json.loads(l)['v15_opaque_id']: json.loads(l) for l in open('/home/flori/jevbench-sealed/v1.5/frozen/all-1624.jsonl')}
lab = {o: {'topic': topic(o, a['family']), 'usecases': usecases(o + '::usecase', a['family'])} for o, a in allrows.items()}
peritem = json.load(open(D / 'peritem.json'))
art = json.load(open(REPO / 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json'))
def cats(o, dim): return [lab[o]['topic']] if dim == 'topics' else lab[o]['usecases']
def cc_items(items):   # n-weighted mean of the method's per-type chance-corrected competence (S.cc_cell)
    bytype = collections.defaultdict(list)
    for g, s in items: bytype[g.type].append((g, s))
    n = sum(len(v) for v in bytype.values())
    return None if not n else sum(len(v) * S.cc_cell(v) for v in bytype.values()) / n
def sc(rec, g):
    return {'correct': bool(rec['c']), 'err': rec['err'], 'err_chance': rec['ec']}
out_sys, unavailable = {}, {}
for s in art['systems']:
    k = s['key']
    if k not in peritem:
        unavailable[k] = 'No complete official per-item run (partial / unranked run without published per-type cells).'; continue
    items = peritem[k]['items']; row = {}
    for dim in ('topics', 'usecases'):
        groups = collections.defaultdict(list)
        for o, rec in items.items():
            for c in cats(o, dim): groups[c].append((gold[o], sc(rec, gold[o])))
        row[dim] = {c: {'n': len(v), 'competence': round(cc_items(v), 2)} for c, v in groups.items()}
    out_sys[k] = row
def coverage(dim, keys):
    cov = {}
    for c in keys:
        os_ = [o for o in allrows if c in cats(o, dim)]
        cov[c] = {'n': len(os_), 'open': sum(allrows[o]['v15_split'] == 'open' for o in os_), 'sealed': sum(allrows[o]['v15_split'] == 'sealed' for o in os_)}
    return cov
tcov = coverage('topics', [k for k, _, _ in TOPICS]); ucov = coverage('usecases', [k for k, _, _ in UC])
jev = {
 'benchmark': 'JevBench', 'revision': 'v1.5.4', 'kind': 'category-aggregates', 'built_utc': '2026-10-01',
 'source_results_sha256': hashlib.sha256((REPO / 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json').read_bytes()).hexdigest(),
 'metric': 'Chance-corrected competence (0 = chance, 100 = perfect) over the category\'s items, open and sealed pooled, all tiers: per request type the method\'s competence cell (Choice and Noul accuracy above chance, Score 1 - error / chance error), then averaged over types weighted by item count. Not part of the JevBench Score; compare systems within a category, not categories with each other. Values can be negative (below chance).',
 'min_n': MIN_N,
 'labelling': 'Every one of the 1,624 decisions was labelled with one subject topic (the v1.2 topic list, unchanged) and one or two TypeSafe use-case categories (docs.typesafe.ai/concepts/use-case-map, plus Other) by Winnow-12B Q8 (the model behind System1 Models s1-pro) on our own GPU pod; 1,118 of the 3,248 calls were first made on s1-pro itself and agree 98.2 % with the pod run. Sealed items stayed on our own infrastructure. About 5 % of public items were checked by hand (Claude Opus 5.5); the item-group rules below fix the systematic misses found.',
 'rules': RULE_TEXT,
 'topics': [{'key': k, 'label': l, 'covers': c, **tcov[k]} for k, l, c in TOPICS],
 'usecases': [{'key': k, 'label': l, 'covers': c, **ucov[k], 'low_n': ucov[k]['n'] < MIN_N} for k, l, c in UC],
 'public_items': {allrows[o]['v15_opaque_id']: lab[o] for o in allrows if allrows[o]['v15_published']},
 'systems': out_sys, 'unavailable': unavailable,
}
(REPO / 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json').write_text(json.dumps(jev, indent=1, sort_keys=False) + '\n')
(D / 'labels-final.json').write_text(json.dumps(lab))
print('JevBench systems', len(out_sys), 'unavailable', list(unavailable))
print('topics', {k: v['n'] for k, v in tcov.items()}); print('usecases', {k: v['n'] for k, v in ucov.items()})

# ---------------- ImageJevBench v0.1.5
items = json.load(open(ID / 'items.json')); ip = json.load(open(ID / 'peritem.json'))
prev = json.load(open(REPO / 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json'))
CAP = [('everyday_photo', 'Everyday photos', ['Everyday photo'], 'yes/no and counting questions about ordinary photos: damage, safety, shelves, signs'),
       ('documents', 'Documents', ['Pool: documents'], 'reading fields and facts from scanned or rendered business documents'),
       ('charts', 'Charts', ['Pool: charts'], 'reading values and trends from charts'),
       ('inventory', 'Inventory', ['Pool: inventory'], 'counting and checking stock on shelves and in storage'),
       ('safety_inspection', 'Safety inspection', ['Pool: safety inspection'], 'spotting hazards and missing protective equipment'),
       ('screens', 'Screens & apps', ['ScreenSpot', 'ScreenSpot-Pro', 'Android-in-the-Wild (AITW_Single mirror)'], 'finding the right element on desktop, web and phone screenshots'),
       ('web_tasks', 'Web tasks', ['Multimodal-Mind2Web'], 'choosing the next element for a multi-step browser goal'),
       ('financial_tables', 'Financial tables', ['FinQA'], 'numeric questions over financial report tables'),
       ('geometry', 'Geometry', ['Geometry3K'], 'geometry diagrams: angles, lengths, areas')]
fam2cap = {f: k for k, _, fs, _ in CAP for f in fs}
ilab = {t: {'capability': fam2cap[m['family']], 'usecases': usecases(f'IMG::{t}::usecase')} for t, m in items.items()}
def icc(ts, res):
    if not ts: return None
    acc = sum(res[t] for t in ts) / len(ts); ch = sum(1 / items[t]['n_options'] for t in ts) / len(ts)
    return 100 * (acc - ch) / (1 - ch)
isys, iun = {}, {}
for r in prev['ranking']:
    k = r['key']
    if k not in ip: iun[k] = 'Per-item outputs of this run were never retrieved from its GPU pod (aggregate-only run); category values need a re-run.'; continue
    res = ip[k]; row = {}
    for dim, f in (('capabilities', lambda t: [ilab[t]['capability']]), ('usecases', lambda t: ilab[t]['usecases'])):
        g = collections.defaultdict(list)
        for t in res: [g[c].append(t) for c in f(t)]
        row[dim] = {c: {'n': len(v), 'competence': round(icc(v, res), 2)} for c, v in g.items()}
    isys[k] = row
def icov(dim, keys):
    out = {}
    for c in keys:
        ts = [t for t in items if (c == ilab[t]['capability'] if dim == 'capabilities' else c in ilab[t]['usecases'])]
        out[c] = {'n': len(ts), 'public': sum(items[t]['split'] == 'public' for t in ts), 'sealed': sum(items[t]['split'] == 'sealed' for t in ts)}
    return out
ccov = icov('capabilities', [k for k, *_ in CAP]); iucov = icov('usecases', [k for k, _, _ in UC])
img = {
 'benchmark': 'ImageJevBench', 'revision': prev['revision'], 'kind': 'category-aggregates', 'built_utc': '2026-10-01',
 'source_preview_sha256': hashlib.sha256((REPO / 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json').read_bytes()).hexdigest(),
 'metric': 'Chance-corrected accuracy (0 = chance, 100 = perfect) over the category\'s items, public and sealed pooled. Not part of the score; compare systems within a category.',
 'min_n': MIN_N,
 'labelling': 'Capabilities are the item source families (fixed, no model). Use cases: each item\'s question and options (not the image) were labelled with one or two TypeSafe use-case categories by Winnow-12B Q8 on our own GPU pod; about 5 % of public items were checked by hand.',
 'rules': RULE_TEXT[3:],
 'capabilities': [{'key': k, 'label': l, 'covers': c, 'families': fs, **ccov[k], 'low_n': ccov[k]['n'] < MIN_N} for k, l, fs, c in CAP],
 'usecases': [{'key': k, 'label': l, 'covers': c, **iucov[k], 'low_n': iucov[k]['n'] < MIN_N} for k, l, c in UC],
 'systems': isys, 'unavailable': iun,
}
(REPO / 'data/raw/benchmarks/jevbench/multimodal-preview/categories-v0.1.5.json').write_text(json.dumps(img, indent=1) + '\n')
(ID / 'labels-final.json').write_text(json.dumps(ilab))
print('Image systems', len(isys), 'unavailable', list(iun))
print('caps', {k: v['n'] for k, v in ccov.items()}); print('img usecases', {k: v['n'] for k, v in iucov.items()})
