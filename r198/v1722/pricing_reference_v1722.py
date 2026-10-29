"""Explicit size/architecture-class estimate; declared Ornith base is unlisted with no declared parent. No lineage asserted."""
import hashlib, importlib.util, pathlib
PIN = '645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
MODULE = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
assert hashlib.sha256(MODULE.read_bytes()).hexdigest() == PIN, 'pricing module pin changed'
spec = importlib.util.spec_from_file_location('pricing_v15_frozen', MODULE); pricing = importlib.util.module_from_spec(spec); spec.loader.exec_module(pricing)
BASE = 'ornith-ai/Ornith-1.5-35B-A3B'
CLASS = 'Qwen/Qwen3.5-35B-A3B'
def reference(key, entry):
    assert key == 'umpire-35b-a3b' and entry['base_model'] == BASE, key
    try: pricing.reference(key, {'base_model': BASE}, pricing.catalog_rates())
    except ValueError as e: assert 'explicit market-listing decision' in str(e)
    else: raise AssertionError('declared base unexpectedly listed')
    r = ('qwen/qwen3.5-35b-a3b', pricing.catalog_rates()['qwen/qwen3.5-35b-a3b'])
    assert r[1] == (0.3125, 1.25)
    return {'base': BASE, 'listing': r[0], 'in': .3125, 'out': 1.25, 'kind': 'estimate',
            'rule': 'Explicit size/architecture-class estimate, qwen3_5_moe 35B total / 3B active; declared base unlisted with no declared parent; no lineage asserted; zero output tokens'}
