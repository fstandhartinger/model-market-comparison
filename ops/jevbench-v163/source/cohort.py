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
