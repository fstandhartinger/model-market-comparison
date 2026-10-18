"""Standalone Verda API helper and dead-man deleter for fast-lane measurement VMs (no pod_runner import).

Used by verda_provider.py and, on its own, by the transient user timer that verda_provider arms right after a create:
`python3 verda_deadman.py delete <instance-uuid>` deletes exactly that instance with its OS volume, retries, confirms
that both are gone, and sends an urgent alert if it cannot. The API secret stays on the host (~/.config/verda.env).
"""
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

API = 'https://api.verda.com/v1'
ENV_FILE = Path.home() / '.config/verda.env'
NOTIFY = Path.home() / 'bin/notify'
_TOKEN = {'value': None, 'expires': 0.0}


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
    """(status, body); status 0 = no definitive answer (network error or timeout)."""
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'jevbench-fastlane/1.0'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(API + path, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            text = response.read().decode()
            try:
                return response.status, json.loads(text)
            except ValueError:
                return response.status, text
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode(errors='replace')[:500]
    except (urllib.error.URLError, OSError, TimeoutError):
        return 0, 'no answer'


def api(method, path, body=None):
    if _TOKEN['value'] is None or time.time() > _TOKEN['expires']:
        env = _env()
        status, token = _request('POST', '/oauth2/token', {'grant_type': 'client_credentials',
                                                           'client_id': env['VERDA_CLIENT_ID'],
                                                           'client_secret': env['VERDA_CLIENT_SECRET']})
        if status != 200 or not isinstance(token, dict) or not token.get('access_token'):
            return 0, 'auth failed'
        _TOKEN['value'] = token['access_token']
        _TOKEN['expires'] = time.time() + min(600, int(token.get('expires_in') or 600) - 60)
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


def _volume_gone(volume_id):
    status, body = api('GET', '/volumes/' + volume_id)
    if status == 404:
        return True
    return status == 200 and isinstance(body, dict) and body.get('is_permanently_deleted') is True


def _instance_gone(instance_id):
    row = instance(instance_id)
    return row is None or str(row.get('status')).lower() in ('discontinued', 'notfound')


def delete_and_confirm(instance_id, wait_s=600):
    """Delete exactly this instance and its volumes permanently; True only once Verda shows both gone."""
    if not valid_id(instance_id):
        return False
    try:
        row = instance(instance_id)
    except RuntimeError:
        return False
    volumes = []
    if row is not None:
        volumes = sorted({v for v in [row.get('os_volume_id'), *(row.get('volume_ids') or [])] if valid_id(v)})
        if str(row.get('status')).lower() not in ('discontinued', 'notfound'):
            body = {'action': 'delete', 'id': instance_id, 'delete_permanently': True}
            if volumes:
                body['volume_ids'] = volumes
            status, _ = api('PUT', '/instances', body)
            if not (200 <= status < 300 or status == 404):
                return False
    deadline = time.time() + wait_s
    while time.time() < deadline:
        try:
            if _instance_gone(instance_id) and all(_volume_gone(v) for v in volumes):
                return True
        except RuntimeError:
            pass
        time.sleep(10)
    return False


def main(argv):
    if len(argv) != 3 or argv[1] != 'delete' or not valid_id(argv[2]):
        print('usage: verda_deadman.py delete <instance-uuid>', file=sys.stderr)
        return 2
    for attempt in range(6):
        if delete_and_confirm(argv[2]):
            print('verda dead-man: deleted and confirmed', argv[2], flush=True)
            return 0
        time.sleep(60)
    print('verda dead-man: delete NOT confirmed', argv[2], flush=True)
    subprocess.run([str(NOTIFY), 'urgent', '🚨 DRINGEND\n\n- A fast-lane Verda GPU instance could not be deleted by its '
                    f'dead-man timer: {argv[2]}. Delete it by exact id in the Verda console (instance + OS volume).\n'
                    '  Time: 5 minutes'], capture_output=True, timeout=45, check=False)
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
