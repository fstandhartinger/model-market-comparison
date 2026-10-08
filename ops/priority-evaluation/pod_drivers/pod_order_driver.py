"""Run an exact host-pinned text/image selection on one offline native model.

Only the trusted host stages selection/counts. No scorer or gold is available.
Each input is attempted once, failures remain denominator records, and a partial
run cannot be resumed. Native Image request semantics require method review.
"""
import json
import os
import sys
from pathlib import Path

import pod_driver
from native_image import native_image_record


from scored_marker import ScoredDispatchMarker

def run_images(model, roots, output, count, before_scored_dispatch=None):
    tasks = []
    for root in roots:
        if root not in (Path('/inputs/public'), Path('/inputs/sealed')):
            raise ValueError('image root differs from fixed mount')
        for line in (root / 'items.jsonl').read_text().splitlines():
            task = json.loads(line)
            if set(task) != {'token', 'question', 'options', 'image'}:
                raise ValueError('label-free image schema changed')
            tasks.append((root, task))
    if len(tasks) != count or len({task['token'] for _, task in tasks}) != count:
        raise ValueError('image input coverage changed')
    output.mkdir(parents=True, exist_ok=True)
    if before_scored_dispatch is None:
        before_scored_dispatch = ScoredDispatchMarker(output.parent)
    consecutive = 0
    with (output / 'raw.jsonl').open('x') as stream:
        for root, task in tasks:
            before_scored_dispatch()
            row = native_image_record(model, task, root)
            row['gpu_s'] = row['latency_s']
            stream.write(json.dumps(row, allow_nan=False) + '\n')
            stream.flush()
            failed, status = row['status'] != 'ok', row['http_status']
            consecutive = consecutive + 1 if failed and status != 422 else 0
            if status in (401, 402, 403, 429) or consecutive >= 3:
                raise ValueError('official image stop rule')
    (output / 'receipt.json').write_text(json.dumps({'rows': count}))


def main():
    config = json.loads(Path('/input/run-config.json').read_text())
    recipe = json.loads(Path('/input/recipe.json').read_text())
    benchmarks = config['benchmarks']
    if not benchmarks or set(benchmarks) - {'jevbench', 'imagejevbench'}:
        raise ValueError('unsupported benchmark selection')
    if recipe['kind'] not in ('python_inprocess', 'aplomb_native'):
        raise ValueError('dual benchmark requires native loader')
    if 'imagejevbench' in benchmarks and recipe['kind'] != 'aplomb_native':
        raise ValueError('image benchmark requires the admitted Aplomb native loader')
    marker = ScoredDispatchMarker(Path('/output'))
    sys.path.insert(0, '/harness')
    text_driver = pod_driver.module('official_text_driver', '/harness/run_v15.py')
    from jevbench.adapters import base
    run = pod_driver.inprocess_runner(recipe, base)
    if 'jevbench' in benchmarks:
        pod_driver.run_text(run, text_driver, Path('/inputs/text/items.jsonl'),
                            Path('/output/jevbench'), config['counts']['jevbench'], marker)
    if 'imagejevbench' in benchmarks:
        run_images(run.model, [Path('/inputs/public'), Path('/inputs/sealed')],
                   Path('/output/imagejevbench'), config['counts']['imagejevbench'], marker)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('official pod order did not complete', file=sys.stderr)
        raise SystemExit(1) from None
