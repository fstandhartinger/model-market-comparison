"""Host-selected generation adoption; no admission or publication authority."""
import json
from pathlib import Path
import shutil

import v16_profiles


def selected(job, state):
    # Presence, even a malformed/rejected record, must never fall back to v1.5.
    if 'v16_profile_admission' not in state:
        return None
    return v16_profiles.accepted(job)


def raw_paths(admission):
    return {'jevbench': f"results/raw/{admission['generation']}/jevbench.jsonl"}


def baseline_complete(package):
    profile = package[2]['profiles']['jevbench']
    baseline = json.loads(Path(profile['files']['baseline.json']['path']).read_text())
    return baseline.get('phase') == 'completed_cohort'


def adopt_raw(job, package):
    """Copy only the authenticated receipt into an immutable generation namespace."""
    admission, measured, _ = package
    root = v16_profiles.STATE_ROOT / 'measurements' / Path(job).name / admission['generation'] / 'jevbench'
    receipt_path = root / 'receipt.json'
    v16_profiles._sha(receipt_path)  # Reject missing/symlink receipt before parsing.
    receipt = json.loads(receipt_path.read_text())
    raw = root / 'raw.jsonl'
    if receipt.get('pins') != measured or receipt.get('rows') != 1500 \
            or receipt.get('raw_sha256') != v16_profiles._sha(raw):
        raise ValueError('v16 adoption requires the exact host generation receipt')
    target = Path(job) / raw_paths(admission)['jevbench']
    for parent in (target, *target.parents):
        if parent.is_symlink():
            raise ValueError('v16 generation raw path is unsafe')
        if parent == Path(job):
            break
    if target.exists() and v16_profiles._sha(target) != receipt['raw_sha256']:
        raise ValueError('v16 generation raw copy changed')
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not target.exists():
        shutil.copyfile(raw, target)
    return receipt, raw
