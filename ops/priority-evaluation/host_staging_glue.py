"""Wire the reviewed host staging pieces into pod_runner.run for one aplomb_native order (host side only).

Loads <job>/host-staging/CONFIG.json (strict, host-owned), binds it to the recipe's host_staging pins,
and returns (weights_streamer, image_context_provider). The streamer carries `.sha256`, the hash of the
exact reviewed module bytes it executes; pod_runner compares it with the host acceptance receipt.
No credential value is read here: the token file path is only handed to the reviewed wrapper.
"""
import configparser
import hashlib
import io
import json
import os
import re
import stat
import tarfile
from pathlib import Path

import pod_weights_streamer as pws

MODULES = ('pod_weights_streamer.py', 'lfs_stream_to_pod.py', 'lfs_exact_fetch.py', 'hf_git_credential.py',
           'host_staging_glue.py')
CONFIG_KEYS = {'schema_version', 'repository', 'lfs_pointer_manifest', 'non_lfs_tar', 'image_context_tar',
               'full_manifest_sha256'}
FILE_KEYS = {'file', 'sha256'}
HEX64 = re.compile(r'[0-9a-f]{64}')


class GlueError(Exception):
    pass


def _sha(b):
    return hashlib.sha256(b).hexdigest()


def _regular(path):
    st = os.lstat(path)
    if not stat.S_ISREG(st.st_mode) or st.st_uid != os.getuid() or st.st_mode & 0o022:
        raise GlueError('host staging file is not a host-owned regular file')


def _pairs(pairs):
    out = {}
    for k, v in pairs:
        if k in out:
            raise ValueError('duplicate key')
        out[k] = v
    return out


def _pinned(base, spec):
    if not isinstance(spec, dict) or set(spec) != FILE_KEYS or not isinstance(spec['file'], str) \
            or '/' in spec['file'] or spec['file'] in ('', '.', '..') or not isinstance(spec['sha256'], str) \
            or not HEX64.fullmatch(spec['sha256']):
        raise GlueError('bad pinned file spec')
    path = base / spec['file']
    _regular(path)
    return path, spec['sha256']


def module_hashes(module_dir):
    out = {}
    for name in MODULES:
        with open(os.path.join(module_dir, name), 'rb') as f:
            out[name] = _sha(f.read())
    return out


def bundle_sha256(hashes):
    return _sha('\n'.join(f'{n}:{hashes[n]}' for n in MODULES).encode())


def module_bundle_sha256(module_dir):
    return bundle_sha256(module_hashes(module_dir))


def tar_directory(directory, out_path):
    """Deterministic tar of regular files (top-level names relative, fixed owner/mode/mtime)."""
    files = []
    for root, dirs, names in os.walk(directory):
        dirs.sort()
        for n in sorted(names):
            p = os.path.join(root, n)
            if os.path.islink(p) or not os.path.isfile(p):
                raise GlueError('only regular files may enter the build context')
            files.append(os.path.relpath(p, directory))
    fd = os.open(out_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as raw, tarfile.open(fileobj=raw, mode='w', format=tarfile.PAX_FORMAT) as tf:
        for rel in sorted(files):
            with open(os.path.join(directory, rel), 'rb') as f:
                data = f.read()
            ti = tarfile.TarInfo(rel); ti.size = len(data); ti.mode = 0o644; ti.mtime = 0; ti.uid = ti.gid = 0
            ti.uname = ti.gname = ''
            tf.addfile(ti, io.BytesIO(data))
    with open(out_path, 'rb') as f:
        return _sha(f.read())


def lium_ssh_key_path(config_path=None):
    """Path of the Lium account SSH private key from ~/.lium/config.ini ([ssh] key_path); never reads the key."""
    cp = configparser.ConfigParser()
    cp.read(config_path or os.path.expanduser('~/.lium/config.ini'))
    key = os.path.expanduser(cp.get('ssh', 'key_path', fallback=''))
    if not key or not os.path.isabs(key) or key.endswith('.pub'):
        raise GlueError('lium ssh key path unavailable')
    st = os.lstat(key)
    if not stat.S_ISREG(st.st_mode) or st.st_uid != os.getuid() or st.st_mode & 0o077:
        raise GlueError('lium ssh key is not a private host-owned regular file')
    return key


def make_callables(job_dir, recipe, module_dir=None, token_file=None, key_path=None):
    job_dir = Path(job_dir)
    module_dir = module_dir or os.path.dirname(os.path.abspath(__file__))
    base = job_dir / 'host-staging'
    if base.is_symlink() or not base.is_dir():
        raise GlueError('host staging directory missing')
    cfg_path = base / 'CONFIG.json'
    _regular(cfg_path)
    try:
        cfg = json.loads(cfg_path.read_text(), object_pairs_hook=_pairs)
    except ValueError:
        raise GlueError('host staging config unreadable') from None
    staging = recipe['host_staging']
    if not isinstance(cfg, dict) or set(cfg) != CONFIG_KEYS or type(cfg['schema_version']) is not int or cfg['schema_version'] != 1 \
            or not isinstance(cfg['full_manifest_sha256'], str):
        raise GlueError('host staging config schema')
    if cfg['repository'] != 'empiriolabsai/aplomb-1' or cfg['repository'] != recipe['weights'][0]['repo']:
        raise GlueError('host staging repository mismatch')
    manifest_path, manifest_sha = _pinned(base, cfg['lfs_pointer_manifest'])
    tar_path, tar_sha = _pinned(base, cfg['non_lfs_tar'])
    ctx_path, ctx_sha = _pinned(base, cfg['image_context_tar'])
    if ctx_sha != staging['image_build']['context_sha256']:
        raise GlueError('image context pin differs from the recipe')
    if cfg['full_manifest_sha256'] != staging['weights_manifest_sha256']:
        raise GlueError('full manifest pin differs from the recipe')
    with open(ctx_path, 'rb') as f:
        if _sha(f.read()) != ctx_sha:
            raise GlueError('image context tar differs from its pin')
    if Path(pws.__file__).resolve().parent != Path(module_dir).resolve():
        raise GlueError('streamer module is not loaded from the hashed module directory')
    hashes = module_hashes(module_dir)
    streamer = pws.make_streamer(
        repository=cfg['repository'], full_manifest_sha256=cfg['full_manifest_sha256'],
        manifest_path=str(manifest_path), manifest_sha256=manifest_sha,
        wrapper_path=os.path.join(module_dir, 'lfs_stream_to_pod.py'), wrapper_sha256=hashes['lfs_stream_to_pod.py'],
        base_path=os.path.join(module_dir, 'lfs_exact_fetch.py'), base_sha256=hashes['lfs_exact_fetch.py'],
        helper_path=os.path.join(module_dir, 'hf_git_credential.py'), helper_sha256=hashes['hf_git_credential.py'],
        nonlfs_tar_path=str(tar_path), nonlfs_tar_sha256=tar_sha,
        token_file=token_file or os.path.expanduser('~/.cache/huggingface/token'),
        key_path=key_path or lium_ssh_key_path())
    try:  # every check that needs no pod runs now, before any pod can be created
        streamer.preflight(staging['weights_manifest'])
    except pws.StreamError as exc:
        raise GlueError(str(exc)) from None
    streamer.sha256 = bundle_sha256(hashes)
    return streamer, (lambda _job_dir: ctx_path)
