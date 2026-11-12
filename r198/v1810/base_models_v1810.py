#!/usr/bin/env python3
"""r278 corrections, item 2 (DECISIONS jevbench-v1810-preview-corrections-1112): merge the sourced base-model entries of the API base-model check
(job jevbench-api-base-models-20261112, board #58693; byte copy inputs/base-models/PROPOSED-ENTRIES.json pinned by sha256) into the presentation
overlay data/jevbench-base-models.json: group A (16 named bases) and group B (2 status upgrades). Group C stays "undisclosed" (not in the input).
Every source gets its kind (vendor statement / model card / credible report / author self-report); the page prints the kind as the link text.
microsoft-decision-1 gets the Microsoft Tech Community launch blog as a second source.

Display and provenance only: lib/jev-base-model.mjs feeds the base-model line, the base-model footnotes, the All-data family column and the
family filter; no score, cost, rank, Jev-class or cap reads this overlay (the frozen pricing module resolves prices from its own registry).
Idempotent: a second run changes nothing."""
import hashlib, json, pathlib
J = pathlib.Path(__file__).resolve().parent; W = J.parents[1]
SRC = J / 'inputs/base-models/PROPOSED-ENTRIES.json'
SRC_SHA = 'f07dece155895135c7c008c7dc25b93acc34678c4015773b6a8033a4fc8a0b5e'
assert hashlib.sha256(SRC.read_bytes()).hexdigest() == SRC_SHA, 'proposed base-model entries changed'
KINDS = ('vendor statement', 'model card', 'credible report', 'author self-report')
VS, MC, AS = 'vendor statement', 'model card', 'author self-report'
# Kind per source, in the order of the proposal's sources (class from BASE-MODELS.md: vendor-confirmed / model-card-or-config; the author's own
# GitHub submission is an author self-report, as for JevAct, whose only evidence is the author's issue title).
SOURCE_KINDS = {
    'microsoft-decision-1-r2': [MC, VS], 'singularity-super-decider-thinking': [MC], 'singularity-super-decider': [MC], 'drex-max': [VS],
    'nimble-v4-max': [MC], 'spx-cd-pro': [MC], 'spx-cd-flash': [MC], 'amos-1-large': [AS, MC], 'amos-1-medium': [MC],
    'kushal-gemma4-31b-it-autoloops': [VS], 'simplejev-qwen3.6-35b-a3b': [VS], 'decision-machine-1': [VS], 'jevact': [AS],
    'gemini-3.1-flash-lite': [MC], 'nvidia/nemotron-3.5-super-vl': [MC], 'qwen3.8-27b': [MC], 'launchables-myles-g-31b': [MC], 'launchables-myles-g-12b': [MC],
}
GROUP_A = ['microsoft-decision-1-r2', 'singularity-super-decider-thinking', 'singularity-super-decider', 'drex-max', 'nimble-v4-max', 'spx-cd-pro', 'spx-cd-flash',
           'amos-1-large', 'amos-1-medium', 'kushal-gemma4-31b-it-autoloops', 'simplejev-qwen3.6-35b-a3b', 'decision-machine-1', 'jevact', 'gemini-3.1-flash-lite',
           'nvidia/nemotron-3.5-super-vl', 'qwen3.8-27b']
GROUP_B = ['launchables-myles-g-31b', 'launchables-myles-g-12b']
MSFT_SECOND = {'url': 'https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-microsoft-decision-1-in-microsoft-foundry-for-decision-and-classific/4562742',
               'title': 'Microsoft Foundry launch blog (Microsoft Tech Community)', 'evidence': 'Microsoft-Decision-1 is a decision model built on Qwen3.5-9B.', 'kind': VS}
proposed = json.loads(SRC.read_text())
assert sorted(proposed) == sorted(GROUP_A + GROUP_B) == sorted(SOURCE_KINDS), 'exactly groups A (16) and B (2)'
assert len(GROUP_A) == 16 and len(GROUP_B) == 2
p = W / 'data/jevbench-base-models.json'; d = json.loads(p.read_text()); cur = d['benchmarks']['jevbench']
applied = {}
for k in GROUP_A + GROUP_B:
    e = proposed[k]
    assert e['status'] == 'disclosed' and e['label'].strip() and e['sources'] and len(e['sources']) == len(SOURCE_KINDS[k]), k
    entry = {'label': e['label'], 'status': 'disclosed',
             'sources': [{'url': s['url'], 'title': s['title'], 'evidence': s['evidence'], 'kind': kind} for s, kind in zip(e['sources'], SOURCE_KINDS[k])],
             'note': e['note'], 'checked_utc': e['checked_utc']}
    assert all(s['kind'] in KINDS and s['url'].startswith('https://') for s in entry['sources']), k
    if k in GROUP_B: assert cur[k]['label'] == e['label'] and cur[k]['status'] in ('self-reported', 'disclosed'), ('group B keeps its label', k)
    applied[k] = {'before': cur.get(k, {}).get('label', 'undisclosed (no entry)') + ' [' + cur.get(k, {}).get('status', 'no entry') + ']', 'after': entry['label'] + ' [disclosed: ' + ', '.join(s['kind'] for s in entry['sources']) + ']'}
    cur[k] = entry
m = cur['microsoft-decision-1']
assert m['label'] == 'Qwen3.5-9B' and m['status'] == 'disclosed' and m['sources'][0]['url'] == 'https://commandline.microsoft.com/microsoft-decision-1-model-foundry/'
m['sources'][0]['kind'] = VS
if not any(s['url'] == MSFT_SECOND['url'] for s in m['sources']): m['sources'].append(dict(MSFT_SECOND))
assert len(m['sources']) == 2 and m['sources'][1] == MSFT_SECOND
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
(J / 'receipts').mkdir(exist_ok=True)
(J / 'receipts/BASE-MODELS-R278.json').write_text(json.dumps({'input': str(SRC.relative_to(W)), 'input_sha256': SRC_SHA, 'group_a': GROUP_A, 'group_b': GROUP_B,
    'group_c': 'unchanged (undisclosed), not in the input', 'second_source_added': {'microsoft-decision-1': MSFT_SECOND['url']}, 'applied': applied,
    'overlay_sha256': hashlib.sha256(p.read_bytes()).hexdigest()}, indent=1, sort_keys=True) + '\n')
print(f'Base models: {len(GROUP_A)} group A + {len(GROUP_B)} group B applied with source kinds; microsoft-decision-1 second source; group C unchanged')
