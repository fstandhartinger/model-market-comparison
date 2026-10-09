"""One reviewed RYOTIDE native-source selection, never a full-archive fallback.

Only host acceptance of this immutable policy enables it. Customer recipes have
no selection field. Ordinary full-tree inspection and its 64 MiB cap are unchanged.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

from measurement_dispatch import OperationalHold

ORDER = '81e785ad-081b-4592-99df-1c3d709fd6c8'
COMMIT = '94c71a3d9f044ffaba87981e985b66f47de3be80'
TREE = '5a1dc97a682239b32397c4200e9deb41b17371a1'
POLICY = Path(__file__).with_name('ryotide-native-source-policy.json')
POLICY_SHA256 = '1f842d86ea808bddb44ada3e488781d9c308d4d4e9b0156339a646f6ca730aa7'
MAX_BYTES = 64 * 1024 * 1024
MAX_FILE_BYTES = 2 * 1024 * 1024


def applicable(job_dir, commit, tree):
    return Path(job_dir).name == ORDER and commit == COMMIT and tree == TREE


def _hash(body):
    return hashlib.sha256(body).hexdigest()


def _policy():
    from execution_source import _safe_path
    _safe_path(POLICY, directory=False)
    raw = POLICY.read_bytes()
    if _hash(raw) != POLICY_SHA256:
        raise ValueError('native selection policy changed')
    value = json.loads(raw)
    if (value['order_id'], value['commit'], value['tree']) != (ORDER, COMMIT, TREE):
        raise ValueError('native selection identity changed')
    return value


def acceptance(job_dir, commit, tree):
    """Validate host-only independent selection disposition, no operational grant."""
    try:
        from execution_source import _safe_path
        if not applicable(job_dir, commit, tree):
            raise ValueError('selection not allowed for this order/pair')
        policy = _policy()
        path = Path(job_dir) / 'NATIVE-SOURCE-ADMISSION.json'
        _safe_path(path, directory=False)
        if path.stat().st_size > 10000:
            raise ValueError('oversized selection acceptance')
        raw = path.read_bytes()
        if len(raw) > 10000:
            raise ValueError('oversized selection acceptance')
        value = json.loads(raw)
        expected = {'schema_version': 1, 'verdict': 'ACCEPTED',
                    'reviewer_engine': 'claude', 'order_id': ORDER,
                    'commit': COMMIT, 'tree': TREE,
                    'selection_sha256': POLICY_SHA256,
                    'scope': 'necessary_native_source_only'}
        if not isinstance(value, dict) or type(value.get('schema_version')) is not int or value != expected:
            raise ValueError('selection requires exact independent host acceptance')
        return policy, {'selection_sha256': POLICY_SHA256,
                        'native_source_admission_sha256': _hash(raw)}
    except (OSError, ValueError, KeyError, TypeError):
        raise OperationalHold('native_source_selection_unaccepted') from None


def inspect_selected(job_dir, repo, commit, tree, *, export=False):
    """Read only accepted local blobs, verify the complete tree and build exact tar.

No remotes, Git hooks/config, checkout, smudge, source imports or lazy fetching.
Missing selected blobs hold; missing excluded blobs are explicitly permitted.
"""
    policy, binding = acceptance(job_dir, commit, tree)
    try:
        from execution_source import _local_objects
        with tempfile.TemporaryDirectory(prefix='fastlane-selected-source-') as tmp:
            isolated = Path(tmp)
            (isolated / 'refs').mkdir()
            (isolated / 'HEAD').write_text('ref: refs/heads/unused\n')
            (isolated / 'config').write_text('[core]\n\trepositoryformatversion = 0\n\tbare = true\n')
            _local_objects(Path(repo) / '.git/objects', isolated / 'objects')
            env = {'PATH':'/usr/bin:/bin','HOME':tmp,'LC_ALL':'C',
                   'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_SYSTEM':'/dev/null',
                   'GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_COUNT':'0',
                   'GIT_TERMINAL_PROMPT':'0','GIT_ALLOW_PROTOCOL':'',
                   'GIT_NO_LAZY_FETCH':'1'}
            def git(*args, input=None):
                result = subprocess.run(['/usr/bin/git','--git-dir',str(isolated),*args],
                                        input=input, env=env, capture_output=True,
                                        timeout=60, check=False)
                if result.returncode:
                    raise ValueError('selected Git object unavailable')
                return result.stdout
            if git('rev-parse',commit+'^{tree}').decode().strip() != tree:
                raise ValueError('selected tree mismatch')
            actual = []
            for entry in git('ls-tree','-r','-z',commit).split(b'\0'):
                if not entry:
                    continue
                header, name = entry.split(b'\t',1)
                mode, kind, oid = header.decode().split(' ')
                if kind != 'blob':
                    raise ValueError('nonblob selected tree')
                actual.append((name.decode(),mode,oid))
            full = policy['full_tree']
            expected = [(f['path'],f['mode'],f['git_blob']) for f in full]
            if actual != expected or len(set(f['path'] for f in full)) != len(full):
                raise ValueError('complete pinned inventory mismatch')
            selected = policy['selected']
            lookup = {f['path']: f for f in full}
            names = [f['path'] for f in selected]
            if len(set(names)) != len(names) or not names:
                raise ValueError('invalid selected membership')
            if len({f['path'] for f in policy['exclusions']}) != len(policy['exclusions']):
                raise ValueError('duplicate exclusion')
            if set(names) & {f['path'] for f in policy['exclusions']} or set(names) | {f['path'] for f in policy['exclusions']} != set(lookup):
                raise ValueError('selection/exclusion inventory mismatch')
            total = sum(f['bytes'] for f in selected)
            if total > MAX_BYTES:
                raise ValueError('selected archive exceeds original cap')
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer,mode='w',format=tarfile.USTAR_FORMAT) as archive:
                for f in selected:
                    name = f['path']; parts = name.split('/')
                    if name.startswith('/') or '\\' in name or ':' in name or any(p in ('','.', '..','.git') for p in parts) or any(ord(c)<32 for c in name):
                        raise ValueError('unsafe selected path')
                    original = lookup[name]
                    if any(f[k] != original[k] for k in ('mode','git_blob','bytes')) or f['mode'] not in ('100644','100755') or not 0 <= f['bytes'] <= MAX_FILE_BYTES:
                        raise ValueError('selected file binding/cap mismatch')
                    # Check size before reading the body; never hydrate a missing object.
                    size = git('cat-file','-s',f['git_blob']).decode().strip()
                    if size != str(f['bytes']):
                        raise ValueError('selected object size mismatch')
                    body = git('cat-file','blob',f['git_blob'])
                    oid = hashlib.sha1(b'blob '+str(len(body)).encode()+b'\0'+body).hexdigest()
                    if len(body) != f['bytes'] or oid != f['git_blob'] or _hash(body) != f['sha256']:
                        raise ValueError('selected blob hash mismatch')
                    info = tarfile.TarInfo(name);info.size=len(body)
                    info.mode=0o755 if f['mode']=='100755' else 0o644
                    info.uid=info.gid=info.mtime=0
                    archive.addfile(info,io.BytesIO(body))
            data = buffer.getvalue()
            if len(data)>MAX_BYTES:
                raise ValueError('selected tar exceeds original cap')
            metadata = {'weights':{}, 'archive_objects': {
                'fully_hydrated': False, 'scope':'reviewed_native_selection',
                'file_count':len(full),'bytes':sum(f['bytes'] for f in full),
                'selected_file_count':len(selected),'selected_bytes':total,
                'excluded_file_count':len(full)-len(selected)},
                'native_selection':{**binding,'archive_sha256':_hash(data)}}
            return data if export else metadata
    except (OSError, ValueError, KeyError, TypeError, UnicodeError, subprocess.TimeoutExpired, tarfile.TarError):
        raise OperationalHold('native_source_selection_unbound') from None


def validate_receipt(job_dir, repo, receipt, *, review_worktree=False):
    """Fail before renting if policy, host acceptance, membership or blobs differ."""
    metadata = inspect_selected(job_dir,repo,receipt.get('commit'),receipt.get('tree'))
    if receipt.get('native_selection') != metadata['native_selection'] or receipt.get('archive_objects') != metadata['archive_objects']:
        raise OperationalHold('native_source_selection_receipt_mismatch')
    if review_worktree:
        try:
            from execution_source import _safe_path
            policy, _ = acceptance(job_dir, receipt.get('commit'), receipt.get('tree'))
            for entry in policy['selected']:
                path = Path(repo) / entry['path']
                _safe_path(path, directory=False)
                if path.stat().st_size != entry['bytes'] or _hash(path.read_bytes()) != entry['sha256']:
                    raise ValueError('review worktree differs from selected execution bytes')
        except (OSError, ValueError, KeyError, TypeError):
            raise OperationalHold('native_source_review_worktree_mismatch') from None
    return metadata['native_selection']


def materialize_review_worktree(job_dir, repo, receipt):
    """Host fetch publishes verified selected bytes for later static review.

No checkout/smudge or execution. Unrelated files are never exported or removed.
"""
    data = inspect_selected(job_dir, repo, receipt.get('commit'), receipt.get('tree'), export=True)
    if _hash(data) != receipt.get('native_selection', {}).get('archive_sha256'):
        raise OperationalHold('native_source_selection_receipt_mismatch')
    try:
        from execution_source import _safe_path
        root = Path(repo)
        _safe_path(root, directory=True)
        with tarfile.open(fileobj=io.BytesIO(data),mode='r:') as archive:
            for member in archive:
                path = root / member.name
                directory = root
                for part in Path(member.name).parts[:-1]:
                    directory = directory / part
                    if not directory.exists():
                        directory.mkdir(mode=0o700)
                    _safe_path(directory, directory=True)
                if path.exists() or path.is_symlink():
                    _safe_path(path, directory=False)
                with tempfile.NamedTemporaryFile(dir=directory, prefix='.native-source-', delete=False) as target:
                    temporary = Path(target.name)
                    try:
                        target.write(archive.extractfile(member).read())
                        target.flush()
                        os.replace(temporary,path)
                    finally:
                        temporary.unlink(missing_ok=True)
        validate_receipt(job_dir,repo,receipt,review_worktree=True)
    except (OSError, ValueError, tarfile.TarError):
        raise OperationalHold('native_source_review_worktree_mismatch') from None
