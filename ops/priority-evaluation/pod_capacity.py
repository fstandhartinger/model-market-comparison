"""Trusted host-only Lium quotes and immutable no-allocation accounting."""
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import uuid

MAX_REFUSALS = 4
MAX_ALLOCATIONS = 2
REQUEST_RE = re.compile(r"[0-9a-f]{32}\Z")
SHA_RE = re.compile(r"[0-9a-f]{64}\Z")


class CapacityEvidenceError(ValueError):
    pass


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def audit_refusal(run_cli, lium, request, started):
    if not isinstance(request, str) or not REQUEST_RE.fullmatch(request):
        raise CapacityEvidenceError("missing authenticated provider request")
    result = run_cli([str(lium), 'audit', '--account', '--since', started,
                      '--action', 'pod.', '--limit', '100', '--json'], timeout=60)
    if result.returncode or len(result.stdout) > 1024 * 1024:
        raise CapacityEvidenceError("provider capacity audit unavailable")
    try:
        data = json.loads(result.stdout)
        if not isinstance(data, dict) or data.get('next_cursor') is not None:
            raise ValueError('incomplete audit')
        events = [e for e in data['items'] if e.get('request_id') == request]
        if len(events) != 1:
            raise ValueError('nonunique audit event')
        event = events[0]
        if (event.get('action') != 'pod.create' or event.get('method') != 'POST'
                or event.get('route') != '/executors/rent-by-spec'
                or type(event.get('status_code')) is not int or event.get('status_code') != 409
                or 'resource_id' not in event or event['resource_id'] is not None
                or event.get('resource_type') != 'pod' or event.get('source') != 'cli'):
            raise ValueError('not a preallocation refusal')
        uuid.UUID(event['id'])
        when = datetime.fromisoformat(event['created_at']).replace(tzinfo=timezone.utc)
        begin = datetime.fromisoformat(started)
        if not begin <= when <= datetime.now(timezone.utc):
            raise ValueError('refusal time differs')
    except (ValueError, TypeError, KeyError, AttributeError) as exc:
        raise CapacityEvidenceError("invalid authenticated capacity audit") from exc
    return event


def quote(gpu, count, run_cli, lium, max_hourly):
    """The installed trusted SDK's dry-run registers no key and rents no pod."""
    from lium.sdk import Lium, LiumError
    from lium.sdk.client import RENT_BY_SPEC
    started = datetime.now(timezone.utc).isoformat()
    client = Lium(source='cli')
    if not client.supports(RENT_BY_SPEC):
        raise CapacityEvidenceError("authenticated read-only quote unsupported")
    try:
        result = client.rent(gpu_type=gpu, gpu_count=count,
                             max_price_per_gpu_hour=max_hourly / count, dry_run=True)
    except LiumError as exc:
        if type(exc) is not LiumError or not str(exc).startswith('API error 409:'):
            raise CapacityEvidenceError("provider quote did not prove capacity refusal") from exc
        event = audit_refusal(run_cli, lium, exc.request_id, started)
        return {'refused': True, 'event': event, 'gpu': gpu, 'gpu_count': count,
                'started_at': started, 'phase': 'read_only_preflight'}
    if (result.pod is not None or result.dry_run is not True or result.gpu_count != count
            or result.executor.gpu_type != gpu):
        raise CapacityEvidenceError("provider returned an invalid read-only quote")
    price = result.price_per_hour
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price) or not 0 < price <= max_hourly:
        raise CapacityEvidenceError("provider quote exceeds hourly cap")
    uuid.UUID(result.executor.id)
    return {'gpu': gpu, 'gpu_count': count, 'hourly_usd': price,
            'node_id': result.executor.id, 'quoted_at': datetime.now(timezone.utc).isoformat()}


def receipt_dir(pods_dir, rid):
    if str(uuid.UUID(rid)) != rid:
        raise CapacityEvidenceError('invalid capacity receipt order')
    root = Path(pods_dir) / 'capacity-receipts' / rid
    if any(p.is_symlink() for p in (root, root.parent, root.parent.parent)):
        raise CapacityEvidenceError('unsafe capacity receipt directory')
    return root


def validate_receipt(receipt, rid, attempts):
    event = receipt.get('event', {})
    attempt = receipt.get('attempt')
    if (receipt.get('schema_version') != 1 or receipt.get('order_id') != rid
            or receipt.get('provider') != 'lium' or receipt.get('phase') not in ('read_only_preflight', 'create_refused')
            or event.get('action') != 'pod.create' or event.get('method') != 'POST'
            or event.get('route') != '/executors/rent-by-spec' or type(event.get('status_code')) is not int or event.get('status_code') != 409
            or 'resource_id' not in event or event['resource_id'] is not None or event.get('resource_type') != 'pod'
            or event.get('source') != 'cli' or not REQUEST_RE.fullmatch(str(event.get('request_id', '')))
            or receipt.get('input_dispatched') is not False or receipt.get('execution_started') is not False):
        raise CapacityEvidenceError('invalid no-allocation receipt')
    uuid.UUID(event['id'])
    when = datetime.fromisoformat(event['created_at']).replace(tzinfo=timezone.utc)
    if not datetime.fromisoformat(receipt['started_at']) <= when <= datetime.fromisoformat(receipt['verified_at']):
        raise CapacityEvidenceError('capacity receipt time differs')
    if receipt['phase'] == 'read_only_preflight':
        if attempt is not None:
            raise CapacityEvidenceError('preflight cannot exempt a creation attempt')
    elif (type(attempt) is not int or not 1 <= attempt <= attempts
          or receipt.get('guard_released') is not True or receipt.get('before_ids') != receipt.get('after_ids')
          or not isinstance(receipt.get('before_ids'), list)):
        raise CapacityEvidenceError('creation refusal lacks cleanup proof')
    return attempt


def allocation_count(state, pods_dir):
    attempts = state.get('creation_attempts', 0)
    refs = state.get('capacity_refusals', [])
    if type(attempts) is not int or not 0 <= attempts <= MAX_ALLOCATIONS + MAX_REFUSALS or not isinstance(refs, list) or len(refs) > MAX_REFUSALS:
        raise CapacityEvidenceError('invalid bounded pod attempt counters')
    if not refs:
        return attempts
    rid = state.get('request_id')
    directory = receipt_dir(pods_dir, rid)
    events, requests, credited = set(), set(), set()
    for digest in refs:
        if not isinstance(digest, str) or not SHA_RE.fullmatch(digest):
            raise CapacityEvidenceError('invalid capacity receipt hash')
        path = directory / (digest + '.json')
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 32768:
            raise CapacityEvidenceError('unsafe or missing capacity receipt')
        body = path.read_bytes()
        if hashlib.sha256(body).hexdigest() != digest:
            raise CapacityEvidenceError('capacity receipt hash differs')
        try:
            receipt = json.loads(body)
            attempt = validate_receipt(receipt, rid, attempts)
            if receipt['phase'] != 'create_refused':
                raise CapacityEvidenceError('read-only quote cannot grant an allocation credit')
            event = receipt['event']['id']
            if event in events or receipt['event']['request_id'] in requests or (attempt is not None and attempt in credited):
                raise CapacityEvidenceError('reused capacity receipt')
            events.add(event)
            requests.add(receipt['event']['request_id'])
            if attempt is not None:
                credited.add(attempt)
        except (ValueError, TypeError, KeyError, AttributeError) as exc:
            raise CapacityEvidenceError('invalid capacity receipt') from exc
    return attempts - len(credited)


def store_refusal(state, pods_dir, proof, *, attempt=None, before=None, after=None, released=False):
    if state.get('input_dispatched') or state.get('execution_started'):
        raise CapacityEvidenceError('dispatched input cannot receive a capacity credit')
    allocation_count(state, pods_dir)  # Validate every existing credit before appending.
    readonly = proof['phase'] == 'read_only_preflight'
    refs = state.setdefault('read_only_capacity_refs' if readonly else 'capacity_refusals', [])
    if not isinstance(refs, list) or len(refs) > (8 if readonly else MAX_REFUSALS):
        raise CapacityEvidenceError('invalid capacity evidence references')
    if not readonly and len(refs) >= MAX_REFUSALS:
        raise CapacityEvidenceError('original lifetime capacity refusal budget exhausted')
    receipt = {'schema_version': 1, 'provider': 'lium', 'order_id': state['request_id'],
               'attempt': attempt, 'phase': proof['phase'], 'event': proof['event'],
               'started_at': proof['started_at'], 'verified_at': datetime.now(timezone.utc).isoformat(),
               'input_dispatched': False, 'execution_started': False,
               'before_ids': sorted(before) if before is not None else None,
               'after_ids': sorted(after) if after is not None else None, 'guard_released': released}
    validate_receipt(receipt, state['request_id'], state.get('creation_attempts', 0))
    # An event can never be reused as a second counter credit.
    directory = receipt_dir(pods_dir, state['request_id'])
    for digest in refs:
        if not isinstance(digest, str) or not SHA_RE.fullmatch(digest):
            raise CapacityEvidenceError('invalid capacity evidence reference')
        old_path = directory / (digest + '.json')
        if old_path.is_symlink() or not old_path.is_file() or old_path.stat().st_size > 32768:
            raise CapacityEvidenceError('unsafe capacity evidence reference')
        old_body = old_path.read_bytes()
        if hashlib.sha256(old_body).hexdigest() != digest:
            raise CapacityEvidenceError('capacity evidence hash differs')
        old = json.loads(old_body)
        if (old['event']['id'] == receipt['event']['id'] or old['event']['request_id'] == receipt['event']['request_id']
                or (attempt is not None and old.get('attempt') == attempt)):
            raise CapacityEvidenceError('capacity event already accounted')
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    body = canonical(receipt); digest = hashlib.sha256(body).hexdigest()
    path = directory / (digest + '.json')
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(body); stream.flush(); os.fsync(stream.fileno())
    directory_fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)
    refs.append(digest)
    if readonly:
        count = state.get('read_only_capacity_checks', 0)
        if type(count) is not int or not 0 <= count < 10000:
            raise CapacityEvidenceError('invalid read-only capacity counter')
        state['read_only_capacity_checks'] = count + 1
        del refs[:-8]
    allocation_count(state, pods_dir)
    return digest
