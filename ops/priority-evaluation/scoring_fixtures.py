"""Synthetic scorer references for the offline scoring-adapter tests only."""
import hashlib
import json
from pathlib import Path


_SCORER = '''\
"""Tiny deterministic scorer used only to test the host adapter contract."""
from dataclasses import dataclass
import json
from pathlib import Path
from types import SimpleNamespace


@dataclass(frozen=True)
class Gold:
    type: str
    split: str
    tier: str
    expected: str


def load_gold(path):
    rows = [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]
    return {row["v15_opaque_id"]: Gold(row["v15_type"], row["v15_split"], row["v15_tier"], str(row["expected"]))
            for row in rows}


def build_system(system_key, metadata, gold, predictions):
    scored, confidence, latencies = [], [], []
    for prediction in predictions:
        task_id = prediction.get("task_id") or prediction.get("id")
        reference = gold[task_id]
        probability = float(prediction["probs_as_returned"][reference.expected])
        if not 0.0 <= probability <= 1.0:
            raise ValueError("fixture probability is outside [0, 1]")
        scored.append((reference, {"valid": True}))
        confidence.append(probability)
        latencies.append(float(prediction["latency_s"]))
    return SimpleNamespace(key=system_key, score=100.0 * sum(confidence) / len(confidence),
                           scored=scored, latencies=latencies, usd_per_1000=0.02)


def full_coverage(metadata):
    support = metadata.get("support")
    return isinstance(support, dict) and set(support) == {"choice", "noul", "score"}


def percentile(values, fraction):
    if not values:
        raise ValueError("percentile requires at least one value")
    index = (len(values) - 1) * fraction
    lower = int(index)
    upper = min(lower + 1, len(values) - 1)
    return values[lower] + (values[upper] - values[lower]) * (index - lower)
'''


_HEADLINE = '''\
"""Synthetic headline adapter used only by offline scoring tests."""
from statistics import median


def system_row(system, g_med):
    score = system.score
    latency = sorted(system.latencies)
    comp = {
        "planned_weight": len(system.scored),
        "I_open": score,
        "I_sealed": score,
        "base": 100.0,
        "gap": 100.0 - score,
        "per": {(gold.type, gold.split): score for gold, _ in system.scored},
    }
    return {
        "scores": {"A": score},
        "axes": {"A": {"synthetic": score}},
        "views": {"A": {"synthetic": score}},
        "comp": comp,
        "intel": {"excess": 0.0, "penalty": 0.0},
        "cal": {"C": score, "parts": {}},
        "p50": median(latency),
        "p95": latency[-1],
        "p50_adj": median(latency),
        "p95_adj": latency[-1],
    }


def bootstrap(systems, keys, gold, B, seed, g_med_fixed):
    return {"scores": {system.key: {"A": [system.score] * B} for system in systems}}
'''


def create(root):
    """Build a self-contained temporary profile; never reads production references."""
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
    refs = root / 'refs'
    refs.mkdir()

    def write(name, value, lines=False):
        content = ('\n'.join(json.dumps(row) for row in value) + '\n') if lines else json.dumps(value)
        (refs / name).write_text(content)

    (refs / 'scorer.py').write_text(_SCORER)
    (refs / 'headline.py').write_text(_HEADLINE)
    write('gold.jsonl', gold, True)
    write('baseline.json', dict(headline_option='A', B=2000, bootstrap_seed=15, G_med=1.0))
    raw = root / 'raw.jsonl'
    raw.write_text('\n'.join(json.dumps(row) for row in predictions) + '\n')
    files = {
        path.name: dict(path=str(path.resolve()), sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        for path in sorted(refs.iterdir())
    }
    manifest = root / 'profiles.json'
    manifest.write_text(json.dumps(dict(schema_version=1, profiles=dict(
        jevbench=dict(version_prefix='fixture-v1.', files=files)))))
    meta = dict(system_key='synthetic_model', system=dict(support=dict.fromkeys(('choice', 'noul', 'score'), 'native'),
                 endpoint_kind='api', price_in_per_m=1., price_out_per_m=1.))
    return manifest, raw, meta
