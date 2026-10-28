"""Aggregate-only token checks for v1.7.16 (no ids printed): strike-1's 5 refused ids vs each row's largest items; H2O trim and
Decisio truncation sets vs the common set. python3 -I token_checks_v1716.py"""
import json, pathlib
D = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
P = pathlib.Path(__file__).resolve().parent / 'private'
cb = set(json.loads((P / 'cost-basis-v1716.json').read_text())['exclude_opaque_ids'])
L = lambda p: [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
st = L(D / 'runs-auto-intake/strike-1/strike-1.raw.jsonl'); refused = {r['task_id'] for r in st if r['status_code'] == 400}
out = {'strike_refused': len(refused), 'strike_refused_subset_excluded': refused <= cb}
for k, f in [('h2o', 'runs-fastlane/h2o-lightning-4b-v1.4.1.raw.jsonl'), ('decisio', 'runs-auto-intake/tachara-ai-decisio-12b-tuned-commit-think.raw.jsonl')]:
    rows = L(D / f); tin = {r['task_id']: r['usage']['input_tokens'] for r in rows}
    top5 = set(sorted(tin, key=lambda t: -tin[t])[:5])
    srt = sorted(tin.values(), reverse=True)
    out[k] = dict(total=sum(tin.values()), refused5_total=sum(tin[t] for t in refused), top5_equals_refused=top5 == refused,
                  sixth_largest=srt[5], min_of_top5=srt[4], excluded_total=sum(tin[t] for t in cb), common_total=sum(v for t, v in tin.items() if t not in cb),
                  common_n=sum(1 for t in tin if t not in cb))
print(json.dumps(out, indent=1))
