"""Build the label-free labelling input (one choice question per item and dimension) for the own-pod Winnow-12B run.
Writes into the sealed store only. Usage: build_label_input.py <input-1624.jsonl> <out.jsonl>"""
import json, sys
from taxonomy import TOPICS, USE_CASES
QS = {
 'topic': {'type': 'choice', 'instructions': 'This is a test item for an AI decision model. What is the item mainly ABOUT (its subject matter)? Pick the one topic a reader would name first.',
           'criteria': {k: f'{l}: {c}' for k, l, c in TOPICS}},
 'usecase': {'type': 'choice', 'instructions': 'This is a test item for an AI decision model. In which real-world application area would a company make exactly this kind of decision? Pick the best-fitting use-case category.',
             'criteria': {k: f'{l}: {c}' for k, l, c in USE_CASES}},
}
def state(r):
    q = r['question']; crit = q.get('criteria')
    content = r['state'] if isinstance(r['state'], str) else json.dumps(r['state'], ensure_ascii=False)
    return {'benchmark_item': {'content': content[:9000], 'question_asked': q.get('instructions'),
            'answer_options': crit if isinstance(crit, (dict, list)) else r['labels']}}
with open(sys.argv[2], 'w') as out:
    for l in open(sys.argv[1]):
        r = json.loads(l)
        for q in QS: out.write(json.dumps({'task_id': f"{r['task_id']}::{q}", 'state': state(r), 'question': QS[q]}) + '\n')
