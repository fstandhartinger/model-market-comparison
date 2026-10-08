"""PROPOSED host-only admission contract; absent acceptance always holds.

The official custodian and an independent Claude reviewer must accept this schema
and authenticate the evidence outside this code before installation or execution.
This validator never issues receipts or grants. Issuer text alone is not authority:
fixed receipt bytes must match host-state acceptance and an independently reviewed
custody contract's exact authenticated receipt hashes. Host state is the trust
anchor; no recipe-supplied receipt path, issuer or acceptance is honored. A writer
able to forge host state and all custody evidence is outside this validator's trust
boundary. Authentic receipt acquisition/verification is a deferred host workflow.

Before real acceptance, the independent custody contract must cite authenticated
provider-quote evidence for the exact hourly rate and runtime recipe. A recipe's
self-supplied hourly_usd is never sufficient quote evidence. Authentic quote
acquisition and acceptance remain deferred; this source-only validator does not
assert that matching a number authenticates a provider offer.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import re

import measurement_dispatch

ROOT = Path(__file__).resolve().parent
SHA64 = re.compile(r'[0-9a-f]{64}')
SHA40 = re.compile(r'[0-9a-f]{40}')
DRIVERS = ('pod_drivers/native_image.py', 'pod_drivers/aplomb_loader.py',
           'pod_drivers/pod_order_driver.py')


def _hold(reason='native_admission_unaccepted'):
    raise measurement_dispatch.OperationalHold(reason)


def _digest(raw):
    return hashlib.sha256(raw).hexdigest()


def _canonical(value):
    # Deliberately matches pod_runner's recipe+selection receipt hash.
    return _digest(json.dumps(value, sort_keys=True, allow_nan=False).encode())


def _sha(value):
    return isinstance(value, str) and bool(SHA64.fullmatch(value))


def _read(job, relative):
    path = job / relative
    if any(part.is_symlink() for part in [path, *path.parents]):
        _hold('native_admission_unsafe_path')
    if not path.is_file() or not path.resolve().is_relative_to(job.resolve()):
        _hold('native_admission_missing')
    raw = path.read_bytes()
    if len(raw) > 1_000_000:
        _hold('native_admission_invalid')
    value = json.loads(raw)
    if not isinstance(value, dict):
        _hold('native_admission_invalid')
    return value, _digest(raw)


def _accepted(record, digest, key='receipt_sha256'):
    if not isinstance(record, dict) or record.get('verdict') != 'ACCEPTED' \
            or not _sha(record.get(key)) or record[key] != digest:
        _hold()


def validate_native_admission(job, state, recipe, benchmarks, pins):
    """Return immutable binding digest; check before any reserve/create/reuse.

    pins must be the complete source_review_gate.source_pins. Reviewed pins must
    exist in host state and fixed review/GATE.json with hashed CODE-REVIEW.md.
    """
    try:
        return _validate(Path(job), state, recipe, list(benchmarks), pins)
    except measurement_dispatch.OperationalHold:
        raise
    except (OSError, ValueError, KeyError, TypeError, AttributeError, OverflowError):
        _hold('native_admission_invalid')


def _validate(job, state, recipe, benchmarks, pins):
    if recipe.get('kind') != 'aplomb_native' or not benchmarks \
            or len(set(benchmarks)) != len(benchmarks) \
            or set(benchmarks) - {'jevbench', 'imagejevbench'}:
        _hold('native_admission_invalid')
    gate, _ = _read(job, 'review/GATE.json')
    review_path = job / 'review/CODE-REVIEW.md'
    if review_path.is_symlink() or not review_path.is_file():
        _hold('native_admission_missing')
    if gate != state.get('source_review_gate') or gate.get('verdict') != 'PASS' \
            or not _sha(gate.get('review_sha256')) \
            or _digest(review_path.read_bytes()) != gate['review_sha256']:
        _hold('native_admission_source_unaccepted')
    source_pins = gate['source_pins']
    official = source_pins['official_measurement']
    if pins != source_pins or not _sha(official.get('manifest_sha256')) \
            or not _sha(official.get('driver_sha256')) \
            or not isinstance(source_pins.get('official_methods'), dict) \
            or not source_pins['official_methods']:
        _hold('native_admission_pin_mismatch')
    fetched, fetched_sha = _read(job, 'source/FETCH-RECEIPT-model.json')
    model = source_pins.get('model')
    if not isinstance(model, dict) or not isinstance(model.get('url'), str) or not model['url'] \
            or any(not isinstance(model.get(key), str) or not SHA40.fullmatch(model[key]) for key in ('commit', 'tree')) \
            or not _sha(model.get('receipt_sha256')) \
            or fetched.get('which') != 'model' or fetched_sha != model['receipt_sha256'] \
            or any(fetched.get(key) != model[key] for key in ('url', 'commit', 'tree')) \
            or recipe.get('code') != {'source': 'model', 'commit': model['commit'], 'tree': model['tree']}:
        _hold('native_admission_model_mismatch')
    hourly = recipe.get('hourly_usd')
    if isinstance(hourly, bool) or not isinstance(hourly, (int, float)) \
            or not math.isfinite(hourly) or not 0 < hourly <= 5:
        _hold('native_admission_quote_mismatch')
    drivers = {}
    for name in DRIVERS:
        pin = official['profile']['code'][name]
        path = ROOT / name
        if path.is_symlink() or not path.is_file() or not _sha(pin.get('sha256')):
            _hold('native_admission_driver_mismatch')
        digest = _digest(path.read_bytes())
        if digest != pin['sha256']:
            _hold('native_admission_driver_mismatch')
        drivers[name] = digest
    binding = {'model': model, 'official_measurement': official,
               'official_methods': source_pins['official_methods'], 'benchmarks': benchmarks,
               'recipe_sha256': _canonical({'recipe': recipe, 'benchmarks': benchmarks}),
               'hourly_usd': hourly, 'driver_sha256': drivers,
               'source_review_sha256': gate['review_sha256']}
    admission, admission_sha = _read(job, 'review/OFFICIAL-INPUT-ADMISSION.json')
    method, method_sha = _read(job, 'review/NATIVE-METHOD-ACCEPTANCE.json')
    contract, contract_sha = _read(job, 'review/NATIVE-CUSTODY-CONTRACT.json')
    independent, independent_sha = _read(job, 'review/NATIVE-CUSTODY-REVIEW.json')
    _accepted(state.get('official_input_admission'), admission_sha, 'custodian_receipt_sha256')
    _accepted(state.get('method_acceptance'), method_sha)
    _accepted(state.get('native_custody_contract'), contract_sha, 'contract_sha256')
    if state['native_custody_contract'].get('independent_review_sha256') != independent_sha:
        _hold('native_custody_review_unaccepted')
    accepted = {'official_input_admission': admission_sha, 'method_acceptance': method_sha}
    if contract.get('schema_version') != 1 or contract.get('verdict') != 'ACCEPTED' \
            or contract.get('binding') != binding or contract.get('authenticated_receipts') != accepted:
        _hold('native_custody_contract_mismatch')
    issuers = contract.get('authorized_issuers')
    if not isinstance(issuers, list) or not issuers or len(set(issuers)) != len(issuers) \
            or any(not isinstance(issuer, str) or not issuer.strip() for issuer in issuers):
        _hold('native_custody_contract_invalid')
    evidence = contract.get('custodian_authentication')
    if not isinstance(evidence, dict) or evidence.get('verified') is not True \
            or not _sha(evidence.get('evidence_sha256')) \
            or not isinstance(evidence.get('verification_contract'), str) \
            or not evidence['verification_contract'].strip():
        _hold('native_custody_authentication_missing')
    if independent.get('schema_version') != 1 or independent.get('verdict') != 'ACCEPTED' \
            or independent.get('reviewer_engine') != 'claude' \
            or independent.get('contract_sha256') != contract_sha \
            or independent.get('authenticated_receipts') != accepted \
            or independent.get('custodian_authentication') != evidence \
            or independent.get('authorized_issuers') != issuers \
            or independent.get('authentic_custodian_receipts_verified') is not True \
            or independent.get('schema_accepted') is not True:
        _hold('native_custody_review_unaccepted')
    for receipt, record in ((admission, state['official_input_admission']),
                            (method, state['method_acceptance'])):
        if receipt.get('schema_version') != 1 or receipt.get('verdict') != 'ACCEPTED' \
                or receipt.get('binding') != binding or record.get('binding') != binding \
                or receipt.get('issuer') not in issuers \
                or receipt.get('authentication_evidence_sha256') != evidence['evidence_sha256']:
            _hold('native_admission_binding_mismatch')
    return _canonical({'binding': binding, 'custodian_receipt_sha256': admission_sha,
                       'method_receipt_sha256': method_sha, 'custody_contract_sha256': contract_sha,
                       'independent_review_sha256': independent_sha})
