#!/usr/bin/env python3
"""CR-173 (openai-charts): registry, self-reported candidates and taxonomy edits for the chart-dataset rows.
Idempotent. Usage: python3 apply_source_edits.py CANDIDATES_JSON"""
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
B = ROOT / 'data/raw/benchmarks'
POST = 'https://openai.com/index/introducing-gpt-6-sol-and-luna/'
EVIDENCE_FILE = 'data/raw/benchmarks/daily-evidence/2026-09-22-gpt-6-sol-luna/de4e8f71186ee5dad44f.gz'
GZ_SHA = '828956eb9ebefc81e696f1f743c9c3e4891f7bd264c1e27edd07b28a3e4ab801'  # the registry evidence convention: hash of the stored .gz
TODAY = '2026-09-26'
rows = json.loads(Path(sys.argv[1]).read_text())['observations']


def dump(path, obj):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n')


CHART_NOTE = ('openai.com/index/* answers a plain HTTP client with a challenge page although robots.txt allows the path, so the '
              'retained bytes were taken from one load in the shared desktop Chrome (see the capture_note in the run manifest). '
              'Capture only; never execute downloaded JavaScript. Accepted: values OpenAI prints as text (CR-126) and, since '
              'CR-173 (2026-09-26), the exact datapoints of the chart\'s own embedded Vega-Lite dataset (vegaLiteSpec.data.values '
              'in the page\'s RSC payload), which are the vendor\'s own numbers; nothing is read off a chart image. Only GPT-6 '
              'Astra, Sol and Luna points are ingested. Competitor and predecessor points in this post are OpenAI quoting other '
              'reports (\'Evaluations of competitor models were taken from publicly available reports\') or not catalog '
              'configurations and are refused. Where a configuration already carries a printed-text row, that row is kept and the '
              'chart point is skipped. Basis stays self_reported (score fractions are stored x100 as derived, source_basis '
              'self_reported).')
CHART_LOCATOR = {
    'openai-automationbench': ('Section "Professional work", figure "AutomationBench" (dotcomConfig.linkId "automationbench"): the '
                               'embedded dataset entry whose model and effortLabel name the configuration; field "score" (a fraction, stored x100). '
                               'CR-126 rows: the table "Model (and effort) | Score | Cost per task", column "Score".'),
    'openai-automationbench-cost': ('Section "Professional work", figure "AutomationBench" (dotcomConfig.linkId "automationbench"): the '
                                    'embedded dataset entry whose model and effortLabel name the configuration; field "cost" (USD, the x axis '
                                    '"Cost per task"). CR-126 row: the table\'s "Cost per task" column; cells printed as a multiple of GPT-6 Sol\'s '
                                    'cost are not an absolute value and are refused.'),
    'openai-agents-last-exam': ('Section "Professional work", figure "Agents\' Last Exam" (dotcomConfig.linkId "agents-last-exam"): '
                                'the embedded dataset entry whose model and effortLabel name the configuration; field "score" (a fraction, stored x100). '
                                'CR-126 row: the sentence "GPT-6 Sol at max effort scores 56.4%".'),
    'openai-agents-last-exam-cost': ('Section "Professional work", figure "Agents\' Last Exam" (dotcomConfig.linkId "agents-last-exam"): '
                                     'the embedded dataset entry whose model and effortLabel name the configuration; field "cost" (USD, the x axis "Cost per task").'),
    'openai-deepswe-v1-1': ('Section "Coding", figure "DeepSWE" (dotcomConfig.linkId "deepswe"): the embedded dataset entry whose model '
                            'and effortLabel name the configuration; field "score" (a fraction, stored x100). CR-126 rows: the sentences '
                            '"GPT-6 Sol at max effort scores 68.8%" and "GPT-6 Luna at max effort scores 66.6%".'),
    'openai-deepswe-v1-1-cost': ('Section "Coding", figure "DeepSWE" (dotcomConfig.linkId "deepswe"): the embedded dataset entry whose '
                                 'model and effortLabel name the configuration; field "cost" (USD, the x axis "Cost per task").'),
    'openai-osworld-2-offline': ('Section "Computer use", figure "OSWorld 2.0, offline set" (dotcomConfig.linkId "osworld"): the embedded '
                                 'dataset entry whose model and effortLabel name the configuration; field "score" (a fraction, stored x100). '
                                 'CR-126 row: the sentence "GPT-6 Sol at xhigh effort achieves ... 60.5%".'),
    'openai-osworld-2-offline-cost': ('Section "Computer use", figure "OSWorld 2.0, offline set" (dotcomConfig.linkId "osworld"): the '
                                      'embedded dataset entry whose model and effortLabel name the configuration; field "cost" (USD, the x axis "Cost per task").'),
}
NEW_COST = {
    # new id: (score identity it mirrors, display name, version guard)
    'openai-agents-last-exam-cost::v1': ('openai-agents-last-exam::v1', "Agents' Last Exam V1 cost per task",
                                         'Require the printed version V1 (the figure caption reads "In Agents’ Last Exam V1").'),
    'openai-deepswe-v1-1-cost::1.1': ('openai-deepswe-v1-1::1.1', 'DeepSWE v1.1 cost per task',
                                      'Require the printed version 1.1 (the figure caption reads "In DeepSWE 1.1"; the prose reads "DeepSWE v1.1").'),
    'openai-osworld-2-offline-cost::v2026.08.08': ('openai-osworld-2-offline::v2026.08.08', 'OSWorld 2.0 offline (v2026.08.08 release) cost per task',
                                                   'Require the printed release v2026.08.08 and the offline set (caption: "We report the partial reward on the offline set from the v2026.08.08 release").'),
}
COST_SCORING_NOTE = ("A separately published metric, not a capability score and not a Composite input. OpenAI's own run, reported "
                     "about its own models; it stays outside measured cohorts and the Composite. OpenAI states these evaluations ran "
                     "in its research environment or via its API, which may differ from production ChatGPT. OpenAI's earlier GPT-6 "
                     "Astra launch post (2026-09-03) charts different cost values for some of the same Astra configurations; only the "
                     "2026-09-22 values are held under this identity.")

# --- registry
reg_path = B / 'registry.json'
reg = json.loads(reg_path.read_text())
by_id = {e['id']: e for e in reg['entries']}
template = by_id['openai-automationbench-cost::1.0.6']
for new_id, (score_id, name, guard) in NEW_COST.items():
    if new_id in by_id:
        continue
    score = by_id[score_id]
    e = copy.deepcopy(template)
    fam, ver = new_id.split('::')
    e.update(id=new_id, name=name, version=ver, family=fam, maintainer=score['maintainer'],
             one_sentence_description=(f"USD cost per {score['name']} task OpenAI reports for its own GPT-6 models in the "
                                       '2026-09-22 GPT-6 Sol and Luna launch post.'),
             publication_urls=copy.deepcopy(score['publication_urls']), first_seen=TODAY, last_verified=TODAY,
             evidence=[{'url': POST, 'file': EVIDENCE_FILE, 'sha256': GZ_SHA, 'fetched_at': '2026-09-22T18:36:59.118516+00:00',
                        'excerpt': f'Chart dataset "{name}": x-axis "Cost per task" per GPT-6 model and effort; OpenAI launch post, 2026-09-22.'}])
    e['how_to_collect'] = copy.deepcopy(score['how_to_collect'])
    e['how_to_collect']['version_guard'] = guard
    idx = reg['entries'].index(score) + 1
    reg['entries'].insert(idx, e)
    by_id[new_id] = e
for e in reg['entries']:
    fam = e['id'].split('::')[0]
    if fam in CHART_LOCATOR:
        e['how_to_collect']['locator'] = CHART_LOCATOR[fam]
        e['how_to_collect']['notes'] = CHART_NOTE
        e['last_verified'] = TODAY
        if fam.endswith('-cost'):
            e['scoring']['notes'] = COST_SCORING_NOTE
dump(reg_path, reg)

# --- self-reported candidates: append rows, collections for new identities, retire superseded refusals
cand_path = B / 'self-reported-candidates.json'
cand = json.loads(cand_path.read_text())
have = {o['id'] for o in cand['observations']}
cand['observations'].extend(r for r in rows if r['id'] not in have)
COLLECTION_REASON = ("OpenAI's GPT-6 Sol and Luna launch post captured and retained; accepted are the values OpenAI prints as text "
                     "about its own models (CR-126) and the exact datapoints of the charts' embedded datasets for GPT-6 Astra, Sol "
                     "and Luna (CR-173). They are self-reported, never enter the Composite, and are replaced by independent "
                     "matching-version results when those appear.")
cols = {c['benchmark_id']: c for c in cand['collections']}
for fam in CHART_LOCATOR:
    bid = next(e['id'] for e in reg['entries'] if e['id'].split('::')[0] == fam)
    if bid in cols:
        cols[bid]['reason'] = COLLECTION_REASON
    else:
        c = {'benchmark_id': bid, 'status': 'collected', 'source_url': POST, 'reason': COLLECTION_REASON}
        cand['collections'].append(c)
SUPERSEDED = {  # refusals that the chart datasets now answer with an exact vendor value
    ('openai-automationbench::1.0.6', POST + '#GPT-6 Astra (low)'),
    ('openai-automationbench::1.0.6', POST + '#gpt-6-luna'),
    ('openai-osworld-2-offline::v2026.08.08', POST + '#gpt-6-luna'),
}
cand['rejected'] = [r for r in cand['rejected'] if (r.get('benchmark_id'), r.get('source_id')) not in SUPERSEDED]
dump(cand_path, cand)

# --- carried document reason
cd_path = B / 'self-reported/carried-documents.json'
cd = json.loads(cd_path.read_text())
for d in cd['documents']:
    if d['url'] == POST and 'CR-173' not in d['reason']:
        d['reason'] += (' CR-173 (2026-09-26): plus the exact chart-dataset datapoints for GPT-6 Astra, Sol and Luna at every '
                        'catalog effort (score and cost per task on AutomationBench 1.0.6, Agents\' Last Exam V1, DeepSWE v1.1, '
                        'OSWorld 2.0 offline v2026.08.08), each with its own critic round; the CR-126 printed rows are kept.')
dump(cd_path, cd)

# --- taxonomy: the three new cost families sit under cost
tax_path = ROOT / 'data/benchmark-taxonomy.json'
text = tax_path.read_text()
tax = json.loads(text)
for key, obj in tax.items():
    if isinstance(obj, dict) and obj.get('openai-automationbench-cost') == 'cost':
        for new_id in NEW_COST:
            obj.setdefault(new_id.split('::')[0], 'cost')
dump(tax_path, tax)
print('ok', len(rows))
