#!/usr/bin/env python3
"""Trusted adapter for frozen official scorers. Run only in the host's offline sandbox.

Inputs are raw predictions, source-reviewed system metadata, and repository-pinned reference
files. No evaluator aggregate, RESULT.json, arbitrary Python or requested reference path enters.
"""
from __future__ import annotations
import ast
import importlib.util
import json
import math
import random
import statistics
import sys
from pathlib import Path


def jsonl(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def jevbench(meta, raw, refs):
    spec = importlib.util.spec_from_file_location('frozen_scorer', refs / 'scorer.py')
    s = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = s
    spec.loader.exec_module(s)
    base = json.loads((refs / 'baseline.json').read_text())
    if base['headline_option'] != 'A' or base['B'] != 2000 or base['bootstrap_seed'] != 15:
        raise ValueError('invalid frozen baseline')
    gold = s.load_gold(refs / 'gold.jsonl')
    rows = jsonl(raw)
    if len(rows) != len(gold) or {r.get('task_id') or r.get('id') for r in rows} != set(gold):
        raise ValueError('raw prediction coverage differs from the official reference')
    system = s.build_system(meta['system_key'], meta['system'], gold, rows)
    sys.modules['score_v15'] = s
    headline_spec = importlib.util.spec_from_file_location('headline', refs / 'headline.py')
    headline = importlib.util.module_from_spec(headline_spec)
    headline_spec.loader.exec_module(headline)
    row = headline.system_row(system, base['G_med'])
    reps = headline.bootstrap([system], {system.key}, gold, B=2000, seed=15,
                              g_med_fixed=base['G_med'])['scores'][system.key]
    row['composite_ci95'] = {o: [s.percentile(sorted(reps[o]), .025), s.percentile(sorted(reps[o]), .975)] for o in reps}
    comp, intel, cal = row['comp'], row['intel'], row['cal']
    aggregate = {key: row[key] for key in ('axes', 'scores', 'views', 'composite_ci95')}
    aggregate.update(
        full_coverage=s.full_coverage(meta['system']), support=meta['system']['support'],
        planned_weight_denominator=comp['planned_weight'],
        status={'status': 'complete', 'rows': len(rows), 'missing': 0,
                'answered_ok': sum(bool(r.get('ok', True)) and not r.get('error') for r in rows)},
        intelligence={**{key: comp[key] for key in ('I_open','I_sealed','base','gap')},
                      **{key: intel[key] for key in ('excess','penalty')},
                      'per_type_split': {'|'.join(key): val for key,val in comp['per'].items()}},
        calibration={'score': cal['C'], 'parts': cal['parts']},
        validity={typ: {'n': sum(g.type == typ for g, _ in system.scored),
                        'invalid_rate': sum(not item['valid'] for g,item in system.scored if g.type == typ)
                                        / max(1, sum(g.type == typ for g,_ in system.scored))}
                  for typ in ('choice','noul','score')},
        speed={'p50_s_raw': row['p50'], 'p95_s_raw': row['p95'], 'p50_s_adjusted': row['p50_adj'],
               'p95_s_adjusted': row['p95_adj'], 'n': len(system.latencies),
               'adjustment': 'none (production API)' if meta['system']['endpoint_kind']=='api'
                             else 'x2 + 0.15 s (assumption, not measured)'},
        cost={'kind': meta['system'].get('price_kind', 'estimate'), 'usd_per_1000': system.usd_per_1000,
              'basis': meta['system'].get('cost_basis', 'reviewed measurement metadata')})
    return {'system_key': meta['system_key'], 'score': row['scores']['A'], 'aggregate': aggregate}


def imagejevbench(meta, raw, refs):
    # Only the frozen scorer's function definitions are needed; skip its historical global
    # roster/file loading and CLI. Function bodies remain byte-for-byte the pinned official code.
    tree = ast.parse((refs / 'scorer.py').read_text())
    tree.body = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name != 'main']
    ns = {'math': math, 'median': statistics.median, 'OLD_CHECK': False, 'W_PUB': .35,
          'W_SEA': .65, 'GAP_ALLOW': 15., 'MATCH_MIN': 10, 'rj': jsonl}
    inputs = {}
    for name in ('old-public-inputs.jsonl', 'old-sealed-inputs.jsonl', 'fresh-inputs.jsonl'):
        inputs.update({row['token']: row for row in jsonl(refs / name)})
    parts = {'public': jsonl(refs / 'public-map.jsonl'), 'sealed': jsonl(refs / 'sealed-map.jsonl')}
    tokens = {row['token'] for rows in parts.values() for row in rows}
    if len(parts['public']) != 228 or len(parts['sealed']) != 456 or len(tokens) != 684:
        raise ValueError('invalid frozen image reference')
    manifest = {r['token']: r for r in jsonl(refs / 'manifest.jsonl')}
    ns.update(inputs={t: inputs[t] for t in tokens}, parts=parts, manifest=manifest,
              pred_files={meta['system_key']: [raw]},
              fam_of=lambda tok: manifest[tok]['dataset'] if manifest[tok]['track'] == 'core' else 'Everyday photo')
    exec(compile(tree, 'pinned-image-scorer', 'exec'), ns)
    data = ns['load_system'](meta['system_key'])
    tracks = {group: ns['score_group'](meta['system'], data, group)
              for group in ('all', 'core', 'everyday_photo')}
    return {'system_key': meta['system_key'], 'score': tracks['all']['composite']['score'],
            'aggregate': {'tracks': tracks}}


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ('jevbench', 'imagejevbench'):
        raise ValueError('unsupported benchmark')
    meta = json.loads(Path('/input/meta.json').read_text())
    result = globals()[sys.argv[1]](meta, Path('/input/raw.jsonl'), Path('/refs'))
    print(json.dumps(result, sort_keys=True, allow_nan=False))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Never include sealed input values or private metadata in a traceback.
        print('official scorer rejected its inputs', file=sys.stderr)
        raise SystemExit(1) from None
