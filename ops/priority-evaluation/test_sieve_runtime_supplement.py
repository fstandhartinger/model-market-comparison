"""Synthetic first-party tests; no wheels are installed and no container or customer code runs."""
import ast
import hashlib
import io
import tarfile
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import measurement_dispatch
import pod_runner
import sieve_runtime_supplement as S

IID = 'sha256:' + 'b' * 64
LOCAL_CONTEXT = S.CONTEXT  # host-only (public wheels only); the real-pin test is skipped where it is absent


def recipe(**extra):
    value = {'kind': 'http_typesafe', 'image': S.BASE_IMAGE}
    value.update(extra)
    return value


class FakeProvider:
    def __init__(self, sha=S.CONTEXT_SHA, iid=IID, inspected=None):
        self.calls, self.sha, self.iid, self.inspected = [], sha, iid, inspected or iid

    def exec(self, pod_id, command, timeout=600):
        self.calls.append(('exec', tuple(command), timeout))
        out = ''
        if command[0] == 'sha256sum':
            out = f'{self.sha}  {command[1]}\n'
        elif command[0] == 'cat':
            out = self.iid + '\n'
        elif command[:3] == ['docker', 'image', 'inspect']:
            out = self.inspected + '\n'
        return SimpleNamespace(returncode=0, stdout=out, stderr='')

    def scp_to(self, pod_id, local, remote, timeout=None):
        self.calls.append(('scp_to', local, remote))


class Tests(unittest.TestCase):
    def context(self, files=None):
        """A synthetic context whose pins are patched to match (the real wheelhouse stays untouched)."""
        files = files or {name: name.encode() for name in S.FILES}
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        path = Path(temporary.name) / 'context.tar'
        with tarfile.open(path, 'w') as archive:
            for name, data in files.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
        pins = {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}
        return path, pins, hashlib.sha256(path.read_bytes()).hexdigest()

    def test_active_only_for_exact_order_kind_and_base(self):
        self.assertEqual(S.ORDER, 'ac6ebe34-a8ba-4b53-98ca-3e0a93755ec4')
        job = '/home/flori/jobs/fastlane-evaluations/' + S.ORDER
        self.assertTrue(S.active(job, recipe()))
        self.assertFalse(S.active('/jobs/other-order', recipe()))
        self.assertFalse(S.active('/jobs/8c7dbe11-5695-45d7-b701-cf92dab3ada7', recipe()))
        self.assertFalse(S.active('/jobs/529be5d5-512f-463f-bdae-d7cd289fe970', recipe()))
        self.assertFalse(S.active('/jobs/a5d49ab5-d91f-4545-9f23-6fbce4a33021', recipe()))
        self.assertFalse(S.active('/jobs/8a93f2a0', recipe()))
        self.assertFalse(S.active(job, recipe(kind='python_inprocess')))
        self.assertFalse(S.active(job, recipe(kind='aplomb_native')))
        self.assertFalse(S.active(job, recipe(image='vllm/vllm-openai:v0.30.0@sha256:' + 'a' * 64)))
        self.assertFalse(S.active(job, recipe(image=S.BASE_IMAGE.split('@')[0])))
        self.assertFalse(S.active(job, None))

    def test_base_image_is_digest_pinned_and_valid_recipe_image(self):
        self.assertTrue(pod_runner.IMAGE_RE.fullmatch(S.BASE_IMAGE))

    def test_inventory_is_public_wheels_only(self):
        self.assertEqual(len(S.FILES), 32)
        self.assertEqual(sum(n.startswith('wheels/') for n in S.FILES), 30)
        for n in S.FILES:
            self.assertTrue(n in ('Dockerfile.runtime-supplement', 'runtime-supplement-requirements.lock.txt')
                            or (n.startswith('wheels/') and n.endswith('.whl') and '/' not in n[7:]))
        for n in ('transformers-5.17.0-py3-none-any.whl', 'accelerate-1.15.0-py3-none-any.whl', 'peft-0.21.2-py3-none-any.whl'):
            self.assertIn('wheels/' + n, S.FILES)
        self.assertFalse(any(n.endswith(('.pt', '.pth', '.bin', '.pkl', '.safetensors')) for n in S.FILES))
        self.assertFalse(any(n.startswith(('wheels/torch-', 'wheels/triton-', 'wheels/nvidia_')) for n in S.FILES))

    def test_check_context_accepts_exact_and_rejects_tampering(self):
        path, pins, digest = self.context()
        with patch.object(S, 'FILES', pins), patch.object(S, 'CONTEXT_SHA', digest):
            S.check_context(path)
            extra = dict({name: name.encode() for name in pins}, **{'wheels/unpinned.whl': b'x'})
            bad, _, bad_digest = self.context(extra)
            with patch.object(S, 'CONTEXT_SHA', bad_digest), self.assertRaises(ValueError):
                S.check_context(bad)
            changed = {name: name.encode() for name in pins}
            changed['Dockerfile.runtime-supplement'] = b'FROM evil'
            bad, _, bad_digest = self.context(changed)
            with patch.object(S, 'CONTEXT_SHA', bad_digest), self.assertRaises(ValueError):
                S.check_context(bad)
        with self.assertRaises(ValueError):
            S.check_context(path)

    def test_build_runs_offline_build_and_returns_immutable_identity(self):
        path, pins, digest = self.context()
        provider = FakeProvider(sha=digest)
        with patch.object(S, 'FILES', pins), patch.object(S, 'CONTEXT_SHA', digest):
            result = S.build(provider, 'pod-1', path)
        self.assertEqual(result['effective_image'], IID)
        self.assertEqual(result['context_sha256'], digest)
        self.assertEqual(result['base_image'], S.BASE_IMAGE)
        builds = [call for call in provider.calls if call[0] == 'exec' and call[1][:2] == ('docker', 'build')]
        self.assertEqual(len(builds), 1)
        argv = builds[0][1]
        self.assertIn('--network', argv)
        self.assertEqual(argv[argv.index('--network') + 1], 'none')
        self.assertIn('--pull=false', argv)
        order = [call[1][0] if call[0] == 'exec' else 'scp' for call in provider.calls]
        self.assertLess(order.index('scp'), order.index('sha256sum'))
        self.assertLess(order.index('sha256sum'), order.index('tar'))
        self.assertLess(order.index('tar'), order.index('docker'))

    def test_build_host_pin_failure_is_hold_before_any_pod_effect(self):
        path, _, _ = self.context()
        provider = FakeProvider()
        with self.assertRaises(measurement_dispatch.OperationalHold) as raised:
            S.build(provider, 'pod-1', path)
        self.assertEqual(str(raised.exception), 'runtime_supplement_unaccepted')
        self.assertEqual(provider.calls, [])

    def test_build_pod_side_mismatches_are_retryable_run_errors(self):
        path, pins, digest = self.context()
        for provider in (FakeProvider(sha='c' * 64), FakeProvider(sha=digest, iid='latest'),
                         FakeProvider(sha=digest, inspected='sha256:' + 'd' * 64)):
            with patch.object(S, 'FILES', pins), patch.object(S, 'CONTEXT_SHA', digest), \
                    self.assertRaises(pod_runner.PodRunError):
                S.build(provider, 'pod-1', path)

    def test_inventory_rejects_links_duplicates_traversal_and_directories(self):
        for variant in ('symlink', 'hardlink', 'duplicate', 'traversal', 'absolute', 'directory'):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / 'bad.tar'
                info = tarfile.TarInfo('Dockerfile.runtime-supplement')
                info.size = 1
                if variant in ('symlink', 'hardlink', 'directory'):
                    info.type = {'symlink': tarfile.SYMTYPE, 'hardlink': tarfile.LNKTYPE, 'directory': tarfile.DIRTYPE}[variant]
                    info.linkname = '/etc/passwd'
                    info.size = 0
                if variant in ('traversal', 'absolute'):
                    info.name = '../evil.whl' if variant == 'traversal' else '/evil.whl'
                pins = {info.name: hashlib.sha256(b'x').hexdigest()}
                with tarfile.open(path, 'w') as archive:
                    archive.addfile(info, io.BytesIO(b'x') if info.isfile() else None)
                    if variant == 'duplicate':
                        archive.addfile(info, io.BytesIO(b'x'))
                with patch.object(S, 'FILES', pins), patch.object(S, 'CONTEXT_SHA', hashlib.sha256(path.read_bytes()).hexdigest()), self.assertRaises(ValueError):
                    S.check_context(path)

    def test_caps_and_context_symlink(self):
        path, pins, digest = self.context()
        link = path.with_name('link.tar')
        link.symlink_to(path)
        with patch.object(S, 'FILES', pins), patch.object(S, 'CONTEXT_SHA', digest):
            with self.assertRaises(ValueError):
                S.check_context(link)
            with patch.object(S, 'CONTEXT_LIMIT', path.stat().st_size - 1), self.assertRaises(ValueError):
                S.check_context(path)
            with patch.object(S, 'MEMBER_LIMIT', 0), self.assertRaises(ValueError):
                S.check_context(path)

    def test_remote_build_failure_does_not_return_image(self):
        path, pins, digest = self.context()
        provider = FakeProvider(sha=digest)
        original = provider.exec
        def fail(pod_id, command, timeout=600):
            if command[:2] == ['docker', 'build']:
                return SimpleNamespace(returncode=1, stdout='', stderr='synthetic build failure')
            return original(pod_id, command, timeout)
        provider.exec = fail
        with patch.object(S, 'FILES', pins), patch.object(S, 'CONTEXT_SHA', digest), self.assertRaises(pod_runner.PodRunError):
            S.build(provider, 'pod-1', path)
        self.assertFalse(any(c[0] == 'exec' and c[1][0] == 'cat' for c in provider.calls))

    def test_registry_and_runner_wiring(self):
        import native_owner
        entries = [e for e in native_owner.SUPPLEMENTS if e['family'] == 'sieve']
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['repos'], ('huggingface.co/sthanika-ai/sieve-31b-v3', 'github.com/sthanika-ai/sieve'))
        tree = ast.parse(Path(pod_runner.__file__).read_text())
        calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                 and isinstance(n.func.value, ast.Name) and n.func.value.id == 'sieve_runtime_supplement']
        self.assertEqual(sorted(n.func.attr for n in calls), ['active', 'build'])

    @unittest.skipUnless(LOCAL_CONTEXT.is_file(), 'host-only build context not present')
    def test_real_context_matches_every_pin(self):
        S.check_context(LOCAL_CONTEXT)
        with tarfile.open(LOCAL_CONTEXT, 'r:') as archive:
            docker = archive.extractfile('Dockerfile.runtime-supplement').read().decode()
            lock = archive.extractfile('runtime-supplement-requirements.lock.txt').read().decode()
        self.assertIn('FROM ' + S.BASE_IMAGE + '\n', docker)
        for flag in ('--no-index', '--no-deps', '--require-hashes', '--no-cache-dir'):
            self.assertIn(flag, docker)
        self.assertEqual(len(lock.splitlines()), 30)
        for name, digest in S.FILES.items():
            if name.startswith('wheels/'):
                package, version = name[7:].split('-')[:2]
                self.assertIn(package.replace('_', '-') + '==' + version + ' --hash=sha256:' + digest, lock)
        self.assertNotIn('head.safetensors', docker)

    def test_host_module_imports_no_model_stack(self):
        tree = ast.parse(Path(S.__file__).read_text())
        names = {alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom))
                 for alias in node.names} | {node.module.split('.')[0] for node in ast.walk(tree)
                                             if isinstance(node, ast.ImportFrom) and node.module}
        self.assertFalse(names & {'torch', 'transformers', 'fla', 'causal_conv1d', 'peft', 'safetensors', 'subprocess', 'urllib', 'socket'})


if __name__ == '__main__':
    unittest.main()
