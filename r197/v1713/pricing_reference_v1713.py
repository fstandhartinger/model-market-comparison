"""Resolve public price references from the exact frozen pricing module."""
import hashlib
import importlib.util
import pathlib

PIN = '645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
MODULE = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
assert hashlib.sha256(MODULE.read_bytes()).hexdigest() == PIN, 'pricing module pin changed'
spec = importlib.util.spec_from_file_location('pricing_v15_frozen', MODULE)
pricing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pricing)


def reference(key, entry):
    resolved = pricing.reference(key, entry, pricing.catalog_rates())
    assert resolved is not None, f'{key}: missing market reference'
    listing, (tin, tout) = resolved
    # Catalog unit conversion can yield 0.030000000000000002; canonicalize
    # the decimal tariff for public/proof comparison, never recompute scores.
    return {'base': entry['base_model'], 'listing': listing, 'in': round(tin, 12), 'out': round(tout, 12)}


def reference_text(key, entry):
    r = reference(key, entry)
    return f"{r['listing']} at USD {r['in']:.2f}/{r['out']:.2f} per million input/output tokens"
