"""Frozen six-candidate membership and source dispositions; no outcome selection."""
BASE = frozenset({'jeff_1_0_large', 'wald-4b-v2', 'metask-jev-rain-4b', 'metask_jev_rain_12b'})
NATIVE = frozenset({'jeff_1_0_large', 'wald-4b-v2', 'metask-jev-rain-4b', 'decisor_4b'})
WRAPPERS = frozenset({'metask_jev_rain_12b', 'ryotide_qwen9'})
FIXED = NATIVE | WRAPPERS

def completed_shape(keys):
    keys = frozenset(keys)
    if not BASE <= keys or not keys <= FIXED or len(keys) not in (5, 6):
        raise ValueError('addendum requires original four plus actual fixed-roster completion(s)')
    return {'completed': sorted(keys), 'eligible': sorted(keys & NATIVE),
            'wrappers': sorted(keys & WRAPPERS), 'pending': sorted(FIXED - keys)}

def disposition(key):
    if key in NATIVE:
        return 'native_nonwrapper'
    if key in WRAPPERS:
        return 'wrapper_unranked'
    raise ValueError('foreign source disposition')

# Guard against accidental output escape; approval remains a separate exact gate.
def protected_output_path(value):
    from pathlib import Path
    p=Path(value)
    base=Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-fastlane-20261009')
    if not p.is_absolute()or '..'in p.parts or p==base or base not in p.parents:
        raise ValueError('fresh protected output boundary')
    return p

# Actual immutable published v162 proof cost hash, never the mask body.
PREDECESSOR_COST_SHA256 = '50d582d3976ba79d458756f931764cf6e80bc623fbbe2fa611d8744752e3fc7b'


def verify_cost_binding(root, contract):
    if root.get('cost_basis_sha256') != PREDECESSOR_COST_SHA256 or contract.get('predecessor_cost_basis_sha256') != PREDECESSOR_COST_SHA256:
        raise ValueError('immutable published predecessor cost hash required')
