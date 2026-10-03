"""CR-277: re-run the pinned fast-lane official scorer on the existing Vansa-3.4 v1.5 raw output.
No inference. (1) the original metadata must reproduce the delivered aggregate exactly; (2) the same raw
output priced at the frozen 25 Sep deepinfra Qwen3.5-4B base-model reference gives the striped alternative.
Only aggregates are written, to the private job folder."""
import copy, hashlib, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'priority-evaluation'))
import official_scoring as O
JOB = Path('/home/flori/jobs/gmail-portfolio-cron-20261001-vansa-publish')
SRC = JOB / 'restored-src'
RAW = Path('/home/flori/jevbench-sealed/v1.5/runs/official/vansa-3.4.jsonl')
RAW_SHA = '1db31aad28eb71d5a12f01ffe7f168825d55d1d3584f991a6783ff7ea7f17d1f'
h = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert h(RAW) == RAW_SHA, 'raw output hash differs from delivery receipt'
assert h(SRC / 'result-vansa-3.4.json') == '9616f8e433bbcc5f1d06ea8bb5b031cdeb81e1acea1f024c1be610f98bcbae5d'
assert h(SRC / 'meta-vansa-3.4.json') == '2d8ad55d1b67c28f7dba067a7071f2d277a52b18c280e39b75ab27dbce76dd76'
delivered = json.load(open(SRC / 'result-vansa-3.4.json'))
meta = json.load(open(SRC / 'meta-vansa-3.4.json'))
pins = O.pins(['jevbench'])
assert pins == delivered['pins'], 'scorer pins differ from the delivered result'
again = O.run('jevbench', RAW, meta, pins)
assert again['aggregate'] == delivered['aggregate'] and again['score'] == delivered['score'], 'not reproduced'
alt_meta = copy.deepcopy(meta)
alt_meta['system'].update(price_in_per_m=0.03, price_out_per_m=0.15, price_kind='estimate',
    cost_basis='Base-model reference: frozen 25 Sep 2026 deepinfra:Qwen/Qwen3.5-4B listing (USD 0.03/M input, 0.15/M output) x measured tokens.')
alt = O.run('jevbench', RAW, alt_meta, pins)
rows = [json.loads(l) for l in RAW.open() if l.strip()]
tin = sum(int((r.get('usage') or {}).get('input_tokens') or 0) for r in rows)
tout = sum(int((r.get('usage') or {}).get('output_tokens') or 0) for r in rows)
out = {'reproduced_delivered_aggregate': True, 'raw_sha256': RAW_SHA, 'pins': pins, 'rows': len(rows),
       'input_tokens': tin, 'output_tokens': tout, 'official': delivered['aggregate'],
       'base_reference': {'rates_usd_per_m': [0.03, 0.15], 'reference': 'deepinfra:Qwen/Qwen3.5-4B',
                          'usd_per_1000': alt['aggregate']['cost']['usd_per_1000'], 'axes': alt['aggregate']['axes'],
                          'scores': alt['aggregate']['scores']}}
(JOB / 'RESCORE-RECEIPT.json').write_text(json.dumps(out, indent=1) + '\n')
print(json.dumps({k: out[k] for k in ('reproduced_delivered_aggregate', 'rows', 'input_tokens', 'output_tokens')}, indent=None),
      json.dumps(out['base_reference']))
