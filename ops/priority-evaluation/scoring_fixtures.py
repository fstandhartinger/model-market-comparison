"""Synthetic reference fixtures for offline tests only; never imported by the worker."""
import hashlib
import json
from pathlib import Path
import shutil


def create(root, production_manifest):
    root.mkdir(parents=True, exist_ok=True)
    gold, predictions = [], []
    for split in ('open', 'sealed'):
        for typ in ('choice', 'noul', 'score'):
            for tier in ('easy', 'standard', 'judge', 'hard'):
                ident = f'fixture-{split}-{typ}-{tier}'
                labels = ['no', 'yes'] if typ == 'noul' else ['0', '1']
                expected = 1 if typ == 'score' else labels[1]
                gold.append(dict(v15_opaque_id=ident, v15_split=split, v15_type=typ, v15_tier=tier,
                                 labels=labels, expected=expected, family='fixture'))
                predictions.append(dict(task_id=ident, probs_as_returned={labels[0]: .01, labels[1]: .99},
                                        latency_s=.1, usage=dict(input_tokens=1, output_tokens=0)))
    refs = root / 'refs'; refs.mkdir()
    def write(name, value, lines=False):
        (refs / name).write_text(('\n'.join(json.dumps(r) for r in value)+'\n') if lines else json.dumps(value))
    official = json.loads(Path(production_manifest).read_text())['profiles']
    shutil.copyfile(official['jevbench']['files']['scorer.py']['path'], refs / 'scorer.py')
    shutil.copyfile(official['jevbench']['files']['headline.py']['path'], refs / 'headline.py')
    write('gold.jsonl', gold, True)
    write('baseline.json', dict(headline_option='A', B=2000, bootstrap_seed=15, G_med=5.186627500079243))
    raw = root / 'raw.jsonl';raw.write_text('\n'.join(json.dumps(r) for r in predictions)+'\n')
    files = {p.name: dict(path=str(p.resolve()), sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in refs.iterdir()}
    manifest = root / 'profiles.json'
    manifest.write_text(json.dumps(dict(schema_version=1, profiles=dict(jevbench=dict(version_prefix='v1.5.', files=files)))))
    meta = dict(system_key='synthetic_model', system=dict(support=dict.fromkeys(('choice','noul','score'),'native'),
                 endpoint_kind='api', price_in_per_m=1., price_out_per_m=1.))
    return manifest, raw, meta
