"""Standalone Verda API helper and dead-man deleter for fast-lane measurement VMs (no pod_runner import).

Used by verda_provider.py and, on its own, by the transient user timer that verda_provider arms right after a create:
`python3 verda_deadman.py delete <instance-uuid> --volume-id <volume-uuid> [--volume-id <volume-uuid> ...]` deletes exactly
that instance with its volumes, retries within a total time bound, confirms that all of them are gone, and sends an
urgent alert with a durable receipt if it cannot. A missing or malformed id exits 2 before credentials or network.

`delete <instance-uuid>` without --volume-id still works for timers armed before the option existed. It learns the volumes
from the instance row, so once that row is gone the storage is reported as unknown, never as gone.

Exit: 0 instance and volumes confirmed gone; 1 not confirmed; 2 usage; 3 instance gone, storage unknown; 4 not confirmed
and the alert was not delivered. The API secret stays on the host (~/.config/verda.env).
"""
import json
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

API = 'https://api.verda.com/v1'
ENV_FILE = Path.home() / '.config/verda.env'
NOTIFY = Path.home() / 'bin/notify'
RECEIPTS = Path.home() / '.local/state/priority-evaluation/verda-deadman'
CLEANUP_DEADLINE_S = 1200  # all rounds together; a hung call is cut by the alarm 60 s later
ROUND_WAIT_S = 300
ALERT_TRIES = 3
ALERT_BOUND_S = 240
_TOKEN = {'value': None, 'expires': 0.0}
_DEADLINE = {'at': None}


class _Abort(BaseException):
    """SIGTERM or the total-time alarm: leave the cleanup, still alert."""


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # the bearer token and the client secret only ever go to API


_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())


def valid_id(value):
    try:
        return str(uuid.UUID(str(value))) == str(value).lower()
    except ValueError:
        return False


def _env():
    values = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip().removeprefix('export ')
        if '=' in line and not line.startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"\'')
    return values


def _request(method, path, body=None, token=None):
    """(status, body); status 0 = no definitive answer. A provider error body is never returned: it may echo a request."""
    timeout = 60
    if _DEADLINE['at'] is not None:
        timeout = min(timeout, _DEADLINE['at'] - time.time())
        if timeout <= 0:
            return 0, 'no answer'
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'jevbench-fastlane/1.0'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(API + path, method=method, headers=headers, data=data)
    try:
        with _OPENER.open(request, timeout=timeout) as response:
            text = response.read().decode()
            try:
                return response.status, json.loads(text)
            except ValueError:
                return response.status, text
    except urllib.error.HTTPError as error:
        error.close()
        return error.code, 'provider error'
    except Exception:  # noqa: BLE001  a dead-man never dies on a transport or decode error
        return 0, 'no answer'


def api(method, path, body=None):
    if _TOKEN['value'] is None or time.time() > _TOKEN['expires']:
        try:
            env = _env()
            credentials = {'client_id': env['VERDA_CLIENT_ID'], 'client_secret': env['VERDA_CLIENT_SECRET']}
        except (OSError, KeyError, ValueError):
            return 0, 'auth failed'
        status, token = _request('POST', '/oauth2/token', {'grant_type': 'client_credentials', **credentials})
        if status != 200 or not isinstance(token, dict) or not token.get('access_token'):
            return 0, 'auth failed'
        try:
            lifetime = int(token.get('expires_in') or 600)
        except (TypeError, ValueError):
            lifetime = 600
        _TOKEN['value'] = token['access_token']
        _TOKEN['expires'] = time.time() + max(1, min(600, lifetime - 60))
    return _request(method, path, body, _TOKEN['value'])


def instance(instance_id):
    """Row dict, None when Verda says it does not exist, or raises RuntimeError without a definitive answer."""
    status, body = api('GET', '/instances/' + instance_id)
    if status == 404:
        return None
    if status != 200 or not isinstance(body, dict):
        raise RuntimeError('verda instance lookup failed')
    return body


def find_by_hostname(hostname):
    status, body = api('GET', '/instances')
    if status != 200 or not isinstance(body, list):
        raise RuntimeError('verda instance listing failed')
    return [row for row in body if isinstance(row, dict) and row.get('hostname') == hostname
            and str(row.get('status')).lower() != 'discontinued' and valid_id(row.get('id'))]


def row_volume_ids(row):
    """The volume ids an instance row names."""
    return {str(v).lower() for v in [row.get('os_volume_id'), *(row.get('volume_ids') or [])] if valid_id(v)}


def _volume_state(volume_id, instance_id):
    """gone, present, foreign (attached to another instance: never ours to delete) or unknown (no definitive answer)."""
    status, body = api('GET', '/volumes/' + volume_id)
    if status == 404:
        return 'gone'
    if status != 200 or not isinstance(body, dict):
        return 'unknown'
    if body.get('is_permanently_deleted') is True:
        return 'gone'
    owner = body.get('instance_id')
    return 'foreign' if owner and str(owner).lower() != instance_id.lower() else 'present'


def _gone_status(row):
    return row is None or str(row.get('status')).lower() in ('discontinued', 'notfound')


def cleanup(instance_id, volume_ids=(), wait_s=600):
    """Delete exactly this instance and these volumes permanently, plus any the row names. Absence of the instance never
    proves absence of a volume: storage_unknown stays True until at least one volume id is known."""
    volumes = {str(v).lower() for v in volume_ids}
    report = {'instance_id': instance_id, 'confirmed': False, 'instance_gone': False, 'volumes': sorted(volumes),
              'volumes_left': sorted(volumes), 'foreign_volumes': [], 'storage_unknown': not volumes}
    try:
        row = instance(instance_id)
    except RuntimeError:
        return report
    if row is not None:
        attached = row_volume_ids(row)
        volumes |= attached
        report['volumes'] = sorted(volumes)
        report['volumes_left'] = sorted(volumes)
        report['storage_unknown'] = not volumes
        if not _gone_status(row):
            body = {'action': 'delete', 'id': instance_id, 'delete_permanently': True}
            if attached:
                body['volume_ids'] = sorted(attached)
            status, _ = api('PUT', '/instances', body)
            if not (200 <= status < 300 or status == 404):
                return report
    deadline = time.time() + wait_s
    deleted_at = {}
    while True:
        try:
            row = instance(instance_id)
            if row is not None:
                volumes |= row_volume_ids(row)
            report.update(instance_gone=_gone_status(row), volumes=sorted(volumes), storage_unknown=not volumes)
        except RuntimeError:
            pass
        if report['instance_gone']:
            if not volumes:
                return report
            states = {v: _volume_state(v, instance_id) for v in sorted(volumes)}
            report['volumes_left'] = sorted(v for v, state in states.items() if state != 'gone')
            report['foreign_volumes'] = sorted(v for v, state in states.items() if state == 'foreign')
            if not report['volumes_left']:
                report['confirmed'] = True
                return report
            for volume_id in (v for v, state in states.items() if state == 'present'):
                if time.time() - deleted_at.get(volume_id, 0) >= 60:  # the OS volume can survive delete_permanently (19 Oct)
                    api('PUT', '/volumes', {'action': 'delete', 'id': [volume_id], 'is_permanent': True})
                    deleted_at[volume_id] = time.time()
            if set(report['volumes_left']) == set(report['foreign_volumes']):
                return report
        if time.time() >= deadline:
            return report
        time.sleep(10)


def delete_and_confirm(instance_id, wait_s=600, volume_ids=None):
    """True only once Verda shows the instance and every known volume gone, and at least one volume is known."""
    volume_ids = list(volume_ids or [])
    if not valid_id(instance_id) or not all(valid_id(v) for v in volume_ids):
        return False
    return cleanup(instance_id, volume_ids, wait_s)['confirmed']


def parse_args(argv):
    """(instance id, volume ids), or None for anything but the exact forms."""
    if len(argv) < 3 or argv[1] != 'delete' or not valid_id(argv[2]) or len(argv) % 2 == 0:
        return None
    volumes = []
    for flag, value in zip(argv[3::2], argv[4::2]):
        if flag != '--volume-id' or not valid_id(value):
            return None
        volumes.append(value.lower())
    return argv[2], sorted(set(volumes))


def _send_alert(instance_id, report):
    """Ring at once: a return code alone proves nothing (a held alert exits 0), so `delivered` needs the card id notify
    printed. A refusal is retried: notify refuses once on an unread board inbox and reading it clears that."""
    left = ', '.join(report['volumes_left']) or 'none known'
    if report['instance_gone'] and report['storage_unknown']:
        what = 'its instance is gone, but its storage is unknown. Check the Verda volumes list for a leftover OS volume'
    else:
        what = f'it could not confirm the delete. Delete by exact id in the Verda console: instance {instance_id}, volumes {left}'
    text = ("🚨 DRINGEND\n\nWorum geht's: Verda GPU dead-man failed, the machine or its disk may still cost money\n"
            f'- Dead-man timer for {instance_id}: {what}.\n  Time: 5 minutes')
    result = {'state': 'not-sent', 'delivered': False, 'card': None, 'attempts': []}
    for attempt in range(ALERT_TRIES):
        try:
            done = subprocess.run([str(NOTIFY), 'urgent', '--bypass-gate', 'money-loss', '--problem',
                                   'verda-deadman-' + instance_id[:8], text],
                                  capture_output=True, text=True, timeout=45, check=False)
            output, code = done.stdout + '\n' + done.stderr, done.returncode
        except (OSError, subprocess.SubprocessError) as exc:
            output, code = '', type(exc).__name__
        sent = re.search(r'^(?:MESSAGE_ID=|GATE_FORWARDED=|UPDATED open card #)(\d+)', output, re.M)
        waiting = re.search(r'^(QUEUED: outbox|HELD: urgent gate) (\S+)', output, re.M)
        result['attempts'].append({'exit': code, 'card': sent.group(1) if sent else None,
                                   'waiting': waiting.group(0)[:80] if waiting else None})
        if code == 0 and sent:
            result.update(state='delivered', delivered=True, card=sent.group(1))
            return result
        if waiting:  # the outbox or the gate now owns it: never resend
            result['state'] = 'queued' if waiting.group(1).startswith('QUEUED') else 'held'
            return result
        if attempt + 1 < ALERT_TRIES:
            time.sleep(20)
    return result


def _write_receipt(instance_id, receipt):
    """Durable and atomic. A failure here cannot change the cleanup result, it goes to the journal instead."""
    try:
        RECEIPTS.mkdir(mode=0o700, parents=True, exist_ok=True)
        path = RECEIPTS / f'{instance_id}-{int(time.time())}.json'
        fd, tmp = tempfile.mkstemp(prefix=path.name + '.', dir=RECEIPTS)
        with os.fdopen(fd, 'w') as handle:
            json.dump(receipt, handle, sort_keys=True, indent=1)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
        return str(path)
    except OSError as exc:
        print('verda dead-man: receipt not written:', type(exc).__name__, flush=True)
        return None


def _abort(signum, _frame):
    raise _Abort(signal.Signals(signum).name)


def main(argv):
    parsed = parse_args(argv)
    if parsed is None:
        print('usage: verda_deadman.py delete <instance-uuid> [--volume-id <volume-uuid> ...]', file=sys.stderr)
        return 2
    instance_id, volumes = parsed
    started = time.time()
    report = {'instance_id': instance_id, 'confirmed': False, 'instance_gone': False, 'volumes': volumes,
              'volumes_left': volumes, 'foreign_volumes': [], 'storage_unknown': not volumes}
    error = None
    _DEADLINE['at'] = started + CLEANUP_DEADLINE_S
    signal.signal(signal.SIGTERM, _abort)
    signal.signal(signal.SIGALRM, _abort)
    signal.alarm(CLEANUP_DEADLINE_S + 60)
    try:
        while time.time() < _DEADLINE['at']:
            report = cleanup(instance_id, volumes, min(ROUND_WAIT_S, _DEADLINE['at'] - time.time()))
            volumes = report['volumes']  # the set seen so far survives every later round
            if report['confirmed'] or (report['instance_gone'] and report['storage_unknown']):
                break
            if report['instance_gone'] and report['volumes_left'] == report['foreign_volumes']:
                break
            time.sleep(max(0, min(60, _DEADLINE['at'] - time.time())))
    except (_Abort, Exception) as exc:  # noqa: BLE001  whatever went wrong, the alert below still runs
        error = f'{type(exc).__name__}: {str(exc)[:80]}'
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    signal.alarm(0)
    receipt = {'instance_id': instance_id, 'report': report, 'error': error, 'started': started, 'argv_volumes': parsed[1]}
    if report['confirmed']:
        receipt['finished'] = time.time()
        print('verda dead-man: deleted and confirmed', instance_id, 'volumes', ','.join(volumes),
              'receipt', _write_receipt(instance_id, receipt), flush=True)
        return 0
    signal.alarm(ALERT_BOUND_S)
    try:
        alert = _send_alert(instance_id, report)
    except (_Abort, Exception) as exc:  # noqa: BLE001
        alert = {'state': 'failed', 'delivered': False, 'card': None, 'attempts': [], 'error': type(exc).__name__}
    signal.alarm(0)
    receipt.update(alert=alert, finished=time.time())
    path = _write_receipt(instance_id, receipt)
    print('verda dead-man: delete NOT confirmed', instance_id, 'alert', alert['state'], alert['card'], 'receipt', path, flush=True)
    if not alert['delivered']:
        return 4
    return 3 if report['instance_gone'] and report['storage_unknown'] else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
