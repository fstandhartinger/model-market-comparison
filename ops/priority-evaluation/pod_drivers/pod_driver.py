#!/usr/bin/env python3
"""Fixed first-party JevBench v1.5 pod driver (open-weights fast lane). Runs inside docker --network none.

Same pinned run_v15.py ModelTask/record, pinned adapters, label-free input schema check and stop rule as
the host API driver (measurement_driver.py). Two recipe kinds:
  http_typesafe     pinned TypeSafeAdapter against the recipe's loopback endpoint (no credential)
  python_inprocess  recipe loader(model_dir, **load_kwargs).predict(state, {"decision": question}); the
                    TypeSafe answer shape is mapped exactly like TypeSafeAdapter (noul -> yes/no, choice/score
                    -> probabilities). An exception whose class name is QuestionError counts as HTTP 422.
One unrecorded warm-up precedes the scored loop. Usage: pod_driver.py  (reads /input/recipe.json)
"""
import importlib, importlib.util, json, sys, time
from pathlib import Path

COUNT = 1624


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    sys.modules[name] = result
    spec.loader.exec_module(result)
    return result


def inprocess_runner(recipe, base):
    if recipe['kind'] == 'aplomb_native':
        from aplomb_loader import load
        model = load('/models/' + recipe['model_dir'])
    else:
        for p in recipe['pythonpath']:
            if not (p == '/code' or p.startswith('/code/')) or '..' in Path(p).parts:
                raise ValueError('pythonpath outside /code')
            sys.path.insert(0, p)
        mod_name, fn_name = recipe['loader'].split(':')
        loader = getattr(importlib.import_module(mod_name), fn_name)
        model = loader('/models/' + recipe['model_dir'], **recipe.get('load_kwargs', {}))

    def run(task):
        res = base.DecisionResult(adapter='pod_inprocess', ok=False, probs_source='native', model=recipe['model'])
        t0 = time.perf_counter()
        try:
            out = model.predict(task.state, {'decision': base.build_question(task)})
        except Exception as e:  # noqa: BLE001
            res.status = 422 if type(e).__name__ in ('QuestionError', 'RequestError') else 500
            res.error = 'provider_or_format_error'
            return res
        res.latency_s, res.status = time.perf_counter() - t0, 200
        try:
            res.usage = dict(out.get('usage') or {})
            a = out['answers']['decision']
            qtype = task.question['type']
            if a.get('type') != qtype:
                raise ValueError('native answer type mismatch')
            if qtype == 'noul':
                if isinstance(a['noul'], bool) or not isinstance(a['noul'], (int, float)) or not 0 <= a['noul'] <= 1:
                    raise ValueError('noul must be a probability')
                res.probs = {'yes': float(a['noul']), 'no': 1.0 - float(a['noul'])}
            else:
                if qtype == 'choice' and a.get('choice') not in task.labels:
                    raise ValueError('invalid native choice')
                if not isinstance(a.get('probabilities'), dict):
                    raise ValueError('answer missing probabilities')
                res.probs = {str(k): float(v) for k, v in a['probabilities'].items()}
        except (KeyError, TypeError, ValueError, AttributeError) as e:
            res.error = f'answer parse failed: {str(e)[:200]}'
            return res
        res.ok = True
        return res
    run.model = model
    return run


def main():
    from scored_marker import ScoredDispatchMarker
    marker = ScoredDispatchMarker(Path('/output'))
    recipe = json.loads(Path('/input/recipe.json').read_text())
    sys.path.insert(0, '/harness')
    text_driver = module('official_text_driver', '/harness/run_v15.py')
    from jevbench.adapters import base
    if recipe['kind'] == 'http_typesafe':
        from jevbench.adapters.typesafe import TypeSafeAdapter
        if not recipe['endpoint'].startswith('http://127.0.0.1:'):
            raise ValueError('endpoint must be loopback')
        run = TypeSafeAdapter(endpoint=recipe['endpoint'], model=recipe['model'], key_env=None).run
    elif recipe['kind'] in ('python_inprocess', 'aplomb_native'):
        run = inprocess_runner(recipe, base)
    else:
        raise ValueError('unknown recipe kind')
    run_text(run, text_driver, Path('/inputs/text/items.jsonl'), Path('/output'), COUNT, marker)


def run_text(run, text_driver, input_path, output_dir, count, before_scored_dispatch=None):
    inputs = []
    for line in input_path.read_text().splitlines():
        task = json.loads(line)
        if set(task) != {'task_id', 'state', 'question', 'labels'}:
            raise ValueError('label-free input schema changed')
        inputs.append(task)
    if len(inputs) != count or len({row['task_id'] for row in inputs}) != count:
        raise ValueError('input count mismatch')
    warm = text_driver.ModelTask('warm-up', {'type': 'noul', 'instructions': 'Is this a warm-up?',
                                             'criteria': {'true': 'yes', 'false': 'no'}}, ['no', 'yes'])
    for attempt in range(60):
        if run(warm).ok:
            break
        time.sleep(5)
    else:
        raise ValueError('warm-up failed')
    output_dir.mkdir(parents=True, exist_ok=True)
    if before_scored_dispatch is None:
        from scored_marker import ScoredDispatchMarker
        before_scored_dispatch = ScoredDispatchMarker(output_dir)
    out = output_dir / 'raw.jsonl'
    if out.exists():
        raise ValueError('raw output already exists')
    consecutive, t0 = 0, time.time()
    with out.open('x') as stream:
        for i, task in enumerate(inputs, 1):
            model_task = text_driver.ModelTask(task['state'], task['question'], task['labels'])
            before_scored_dispatch()
            started = time.perf_counter()
            answer = run(model_task)
            row = text_driver.record(task['task_id'], answer, time.perf_counter() - started)
            row['error'] = 'provider_or_format_error' if row.get('error') else None
            failed, status = not row['ok'], row['status_code']
            stream.write(json.dumps(row, allow_nan=False) + '\n')
            stream.flush()
            consecutive = consecutive + 1 if failed and status != 422 else 0
            if status in (401, 402, 403, 429) or consecutive >= 3:
                raise ValueError('official stop rule')
            if i % 200 == 0:
                print(f'PROGRESS {i}/{count} elapsed_s={time.time() - t0:.0f}', flush=True)
    (output_dir / 'receipt.json').write_text(json.dumps({'rows': len(inputs), 'elapsed_s': time.time() - t0}))
    print('DRIVER_DONE', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'pod measurement did not complete: {type(exc).__name__}', file=sys.stderr)
        raise SystemExit(1) from None
