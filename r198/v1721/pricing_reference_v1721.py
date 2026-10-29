"""v1.7.21 price references. New row visionjev-1.0.0-27b: the pinned base Qwen/Qwen3.8-27B through the frozen pricing module's strict
reference() (qwen/qwen3.8-27b 0.42/3.00, kind estimate). Carried d1027 rows keep their published references unchanged (the
same-items rule changes only the item set, never a price)."""
import hashlib, importlib.util, pathlib
PIN = '645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
MODULE = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
assert hashlib.sha256(MODULE.read_bytes()).hexdigest() == PIN, 'pricing module pin changed'
spec = importlib.util.spec_from_file_location('pricing_v15_frozen', MODULE); pricing = importlib.util.module_from_spec(spec); spec.loader.exec_module(pricing)
BASE = 'Qwen/Qwen3.8-27B'

def reference(key, entry):
    assert key == 'visionjev-1.0.0-27b' and entry['base_model'] == BASE, key
    r = pricing.reference(key, {'base_model': BASE}, pricing.catalog_rates())
    assert r is not None, 'frozen module has no reference for the stated base'
    return {'base': BASE, 'listing': r[0], 'in': round(r[1][0], 12), 'out': round(r[1][1], 12), 'kind': 'estimate',
            'rule': 'frozen pricing_v15 reference() for the stated base model; output priced at 0 tokens as the vendor reports (9 Oct 2026 zero-output rule)'}
