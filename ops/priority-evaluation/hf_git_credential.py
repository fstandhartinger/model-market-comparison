#!/usr/bin/python3
"""Trusted source-fetch-only Hugging Face credential helper; never model mounted."""
import os
import re
import stat
import sys
from pathlib import Path

def main() -> int:
    # Git store/erase must never persist or alter the account credential.
    if len(sys.argv) != 2 or sys.argv[1] != 'get':
        return 0
    fields = {}
    for raw in sys.stdin:
        line = raw.rstrip('\n')
        if not line:
            break
        k, sep, v = line.partition('=')
        if sep:
            fields[k] = v
    repository = os.environ.get('HF_CREDENTIAL_REPOSITORY', '')
    if repository != 'empiriolabsai/aplomb-1':
        return 0
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,99}/[A-Za-z0-9][A-Za-z0-9._-]{0,99}', repository):
        return 0
    if fields.get('protocol') != 'https' or fields.get('host') != 'huggingface.co':
        return 0
    if fields.get('path') not in (repository, repository + '.git'):
        return 0
    token_path = os.environ.get('HF_CREDENTIAL_TOKEN_FILE', '')
    try:
        fd = os.open(token_path, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(fd) as handle:
            info = os.fstat(handle.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
                return 0
            token = handle.read(1025).strip()
        if not re.fullmatch(r'hf_[A-Za-z0-9]{10,1000}', token):
            return 0
    except (OSError, UnicodeError):
        return 0
    # This output is the Git credential protocol pipe, never a job log.
    sys.stdout.write('username=hf_user\npassword=' + token + '\n\n')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
