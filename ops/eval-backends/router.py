"""Pure prospective routing policy; never dispatches or changes provider state.

All inputs are dictionaries. Recipe declares gpu_count, gpu_vram_gb,
required_vram_gb (including context), image_digest (sha256 digest), cuda_version,
torch_version, sm120, docker_in_docker, requested_max_liability_usd,
methodology_version, model_revision, optional deadline and diagnostic.
Allowance declares org, monthly_limit_usd, payg, observed_at (aware ISO timestamp),
cycle (UTC YYYY-MM), used_usd and reserved_usd. Equivalence declares passed,
measured, receipt (nonempty measured receipt ID), and matching methodology_version,
model_revision and image_digest. These are caller-supplied attestations, not a
replacement for the dispatcher's authenticated accounting and receipt checks.
"""
import math
import re
from datetime import datetime, timezone


def _number(value):
    try:
        return type(value) in (int, float) and math.isfinite(value) and value >= 0
    except (OverflowError, ValueError):
        return False


def _time(value):
    if isinstance(value, datetime):
        result = value
    elif isinstance(value, str):
        try:
            result = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    else:
        return None
    return result.astimezone(timezone.utc) if result.tzinfo is not None else None


def _version(value, minimum):
    if not isinstance(value, str) or not re.fullmatch(r'\d+\.\d+(?:\.\d+)?', value):
        return False
    try:
        parts = tuple(int(part) for part in value.split('.'))
    except ValueError:
        return False
    return parts + (0,) * (3 - len(parts)) >= minimum


def choose_backend(recipe, state, allowance, equivalence, now):
    """Return backend and structured reason. Missing/invalid gates fail closed.

    A started/attempted/dispatched order returns its pinned provider unchanged.
    An invalid or missing pin on such an order forbids new CoreWeave routing.
    """
    recipe = recipe if isinstance(recipe, dict) else {}
    legacy = recipe.get('legacy_backend', 'lium')
    if legacy not in ('lium', 'runpod'):
        legacy = 'lium'

    def decision(backend, code):
        return {'backend': backend, 'reason': {'code': code}}

    def reject(code):
        return decision(legacy, code)

    if not isinstance(state, dict):
        return reject('state_unknown')
    flags = ('started', 'dispatched', 'attempted')
    if any(key in state and type(state[key]) is not bool for key in flags):
        return reject('state_invalid')
    attempts=state.get('creation_attempts',0)
    if type(attempts) is not int or attempts<0:return reject('state_invalid')
    active = attempts>0 or bool(state.get('input_dispatched') or state.get('execution_started') or state.get('attempt_started_at') or state.get('pod_id') or state.get('reservation_id')) or any(state.get(key, False) for key in flags) or state.get('status') in (
        'started', 'dispatched', 'attempted', 'running', 'completed', 'failed')
    if active:
        if state.get('provider') and state.get('backend') and state['provider'] != state['backend']:
            return reject('provider_pin_unknown')
        pin = state.get('provider', state.get('backend'))
        return decision(pin, 'provider_pinned') if pin in ('coreweave', 'lium', 'runpod') else reject('provider_pin_unknown')
    if state.get('status', 'pending') not in ('pending', 'new', 'queued'):
        return reject('state_unknown')
    clock = _time(now)
    if clock is None:
        return reject('time_invalid')
    if 'deadline' in recipe:
        deadline = _time(recipe['deadline'])
        if deadline is None:
            return reject('deadline_invalid')
        if deadline.date() <= clock.date():
            return reject('deadline_legacy')
    if type(recipe.get('diagnostic', False)) is not bool:
        return reject('diagnostic_invalid')
    if type(recipe.get('gpu_count')) is not int or recipe['gpu_count'] != 1:
        return reject('gpu_count_unsupported')
    capacity, required = recipe.get('gpu_vram_gb'), recipe.get('required_vram_gb')
    if not _number(capacity) or not _number(required) or not 0 < required <= capacity <= 96:
        return reject('vram_unsupported')
    digest = recipe.get('image_digest')
    if not isinstance(digest, str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', digest):
        return reject('image_unpinned')
    if not _version(recipe.get('cuda_version'), (12, 8, 0)) or not _version(recipe.get('torch_version'), (2, 7, 0)) or recipe.get('sm120') is not True:
        return reject('runtime_unsupported')
    if recipe.get('docker_in_docker') is not False:
        return reject('sandbox_incompatible')
    if not isinstance(allowance, dict):
        return reject('allowance_unknown')
    if allowance.get('org') != 'system1models-org' or not _number(allowance.get('monthly_limit_usd')) or allowance['monthly_limit_usd'] != 30 or allowance.get('payg') is not False:
        return reject('allowance_scope_invalid')
    observed = _time(allowance.get('observed_at'))
    if observed is None or not 0 <= (clock - observed).total_seconds() <= 300:
        return reject('allowance_stale')
    if allowance.get('cycle') != clock.strftime('%Y-%m') or observed.strftime('%Y-%m') != clock.strftime('%Y-%m'):
        return reject('allowance_cycle_invalid')
    costs = [allowance.get('used_usd'), allowance.get('reserved_usd'), recipe.get('requested_max_liability_usd')]
    if not all(_number(cost) for cost in costs) or sum(costs) >= 27:
        return reject('allowance_insufficient')
    if not recipe.get('diagnostic', False):
        if allowance.get('price_verified') is not True:
            return reject('pricing_unverified')
        if not isinstance(equivalence, dict) or equivalence.get('passed') is not True or equivalence.get('measured') is not True or not isinstance(equivalence.get('receipt'), str) or not equivalence['receipt'].strip():
            return reject('equivalence_unproven')
        for key in ('methodology_version', 'model_revision', 'image_digest'):
            if not isinstance(recipe.get(key), str) or not recipe[key].strip() or equivalence.get(key) != recipe[key]:
                return reject('equivalence_mismatch')
    return decision('coreweave', 'diagnostic_eligible' if recipe.get('diagnostic') else 'eligible')
