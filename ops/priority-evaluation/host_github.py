"""Use Sandy's existing Git credential only in trusted host process memory."""
import os
from pathlib import Path
import subprocess


def token():
    value = os.environ.get('GH_TOKEN', '').strip()
    if value:
        return value
    env = {'HOME': str(Path.home()), 'PATH': '/usr/bin:/bin', 'GIT_TERMINAL_PROMPT': '0'}
    result = subprocess.run(['git', 'credential', 'fill'],
                            input='protocol=https\nhost=github.com\n\n',
                            text=True, capture_output=True, env=env, timeout=20, check=False)
    fields = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    value = fields.get('password', '')
    if result.returncode or not value or any(c.isspace() for c in value):
        raise RuntimeError('GitHub host credential unavailable')
    return value
