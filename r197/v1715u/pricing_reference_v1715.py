"""v1.7.15 price reference for the one new row (microsoft-decision-1-r2). It is priced like the live microsoft-decision-1 row: the
advertised Azure Foundry tariff USD 0.042/M input, output free, kind tariff (release-owner decision msft-r2-cost-basis-tariff,
DECISIONS 2026-10-28). The frozen pricing module does not list this key as a counting list price; its strict resolve() result
(declared base Qwen/Qwen3.5-9B estimate) is recorded next to the tariff for transparency and is NOT used."""
import hashlib, importlib.util, pathlib
PIN = '645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
MODULE = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
assert hashlib.sha256(MODULE.read_bytes()).hexdigest() == PIN, 'pricing module pin changed'
spec = importlib.util.spec_from_file_location('pricing_v15_frozen', MODULE); pricing = importlib.util.module_from_spec(spec); spec.loader.exec_module(pricing)
DECISION = 'msft-r2-cost-basis-tariff'
TARIFF = {'listing': 'Azure Foundry advertised tariff (Microsoft-Decision-1)', 'in': 0.042, 'out': 0.0, 'kind': 'tariff', 'decision': DECISION}

def frozen_module_result(key, entry):
    """Strict frozen resolve() for the record: (listing, in, out) or None."""
    r = pricing.reference(key, entry, pricing.catalog_rates())
    return None if r is None else {'listing': r[0], 'in': round(r[1][0], 12), 'out': round(r[1][1], 12)}

def reference(key, entry):
    assert key == 'microsoft-decision-1-r2', key
    return {'base': entry['base_model'], **TARIFF, 'frozen_module_not_used': frozen_module_result(key, entry)}
