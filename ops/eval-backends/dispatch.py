"""Prospective provider entry point, preserving owner admission and score protocol.

The legacy callback is the existing Lium/RunPod path. No fallback occurs after
measurement dispatch, uncertain allocation identity or uncertain cleanup.
"""
import datetime as dt
import fcntl
import re
from pathlib import Path
from router import choose_backend
import coreweave_gpu_safety as safety
import sandbox_runner


def evaluate(*, recipe, state, equivalence, job, receipt_dir, prepare, measure, legacy):
    root=Path(receipt_dir);root.mkdir(parents=True,exist_ok=True)
    with (root/".dispatch.lock").open("a") as claim:
        try:
            fcntl.flock(claim,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:
            raise sandbox_runner.MeasurementInterrupted("evaluation already owned") from None
        return _evaluate(recipe=recipe,state=state,equivalence=equivalence,job=job,receipt_dir=root,prepare=prepare,measure=measure,legacy=legacy)


def _evaluate(*, recipe, state, equivalence, job, receipt_dir, prepare, measure, legacy):
    """Return (backend, result). Owner supplies reviewed, unchanged callbacks.

    Admission, input rotation/exposure and scoring remain the caller's gates.
    prepare can upload public weights/code only; measure owns benchmark input.
    """
    import math
    # Caller may not substitute an image after equivalence was checked.
    if not isinstance(recipe,dict) or not isinstance(recipe.get('image'),str) or not re.fullmatch(r'[A-Za-z0-9._/-]+(?::[A-Za-z0-9_.-]+)?@sha256:[0-9a-f]{64}',recipe['image']) or recipe['image'].rsplit('@',1)[-1]!=recipe.get('image_digest'):
        raise ValueError('executed image must match the gated digest')
    ttl=recipe.get('max_lifetime_seconds'); liability=recipe.get('requested_max_liability_usd')
    if type(ttl) is not int or not 1<=ttl<=10800 or type(liability) not in (int,float) or not math.isfinite(liability) or liability<5*ttl/3600:
        raise ValueError('requested liability must cover the entire bounded lifetime')
    if recipe.get('diagnostic') is True and ttl>600:
        raise ValueError('diagnostic lifetime must not exceed600seconds')
    root=Path(receipt_dir);root.mkdir(parents=True,exist_ok=True)
    lifecycle=root/'coreweave-lifecycle.json'
    if lifecycle.exists():
        raise sandbox_runner.MeasurementInterrupted('existing CoreWeave attempt requires owner reconciliation')
    try:
        account=safety.launch_allowance(recipe['requested_max_liability_usd'])
        allowance={'org':account['organization'],'monthly_limit_usd':account['allowance_usd'],
                   'payg':account['pay_as_you_go'],'observed_at':account['observed_at'],
                   'cycle':account['cycle'],'used_usd':account['used_usd'],'reserved_usd':account['reserved_usd'],
                   'price_verified':account.get('price_verified',False)}
    except Exception as exc:
        allowance=None
    decision=choose_backend(recipe,state,allowance,equivalence,dt.datetime.now(dt.timezone.utc))
    sandbox_runner.save(root/'routing.json',decision)
    if decision['reason']['code'] in {'provider_pinned','provider_pin_unknown','state_invalid','state_unknown'}:
        raise sandbox_runner.MeasurementInterrupted('existing or unknown attempt requires owner reconciliation')
    if decision['backend']!='coreweave':
        return decision['backend'],legacy()
    try:
        result=sandbox_runner.run(job,recipe['image'],recipe['max_lifetime_seconds'],
            recipe.get('startup_seconds',300),root/'coreweave-lifecycle.json',prepare,measure,
            require_verified_price=recipe.get('diagnostic') is not True)
        return 'coreweave',result
    except sandbox_runner.PreDispatchUnavailable as exc:
        decision={'backend':recipe.get('legacy_backend','lium'),
                  'reason':{'code':'coreweave_pre_dispatch_unavailable','error_type':type(exc).__name__}}
        sandbox_runner.save(root/'routing.json',decision)
        return decision['backend'],legacy()
