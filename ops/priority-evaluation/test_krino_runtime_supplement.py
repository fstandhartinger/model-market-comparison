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
import krino_runtime_supplement as S

IID = 'sha256:' + 'b' * 64
LOCAL_CONTEXT = S.CONTEXT  # host-only (4 GB public wheels); the real-pin test is skipped where it is absent


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
        job = '/home/flori/jobs/fastlane-evaluations/' + S.ORDER
        self.assertTrue(S.active(job, recipe()))
        self.assertFalse(S.active('/jobs/other-order', recipe()))
        self.assertFalse(S.active('/jobs/8c7dbe11', recipe()))
        self.assertFalse(S.active(job, recipe(kind='python_inprocess')))
        self.assertFalse(S.active(job, recipe(kind='aplomb_native')))
        self.assertFalse(S.active(job, recipe(image='vllm/vllm-openai:v0.30.0@sha256:' + 'a' * 64)))
        self.assertFalse(S.active(job, recipe(image=S.BASE_IMAGE.split('@')[0])))
        self.assertFalse(S.active(job, None))

    def test_base_image_is_digest_pinned_and_valid_recipe_image(self):
        self.assertTrue(pod_runner.IMAGE_RE.fullmatch(S.BASE_IMAGE))

    def test_context_inventory_is_public_wheels_lock_dockerfile_and_pinned_kev_tree(self):
        self.assertEqual(len(S.FILES), 116)
        # nvidia wheels the base image already ships at the identical version are not re-sent (pip: already satisfied)
        self.assertFalse(any(name.startswith("wheels/nvidia_cublas_cu12-") for name in S.FILES))
        for name in S.FILES:
            self.assertTrue(name in ('Dockerfile.runtime-supplement',
                                     'runtime-supplement-requirements.lock.txt')
                            or (name.startswith('wheels/') and name.endswith('.whl') and '/' not in name[7:])
                            or name.startswith('kev-source/'))
        self.assertEqual(sum(name.startswith('wheels/') for name in S.FILES), 78)
        self.assertIn('kev-source/kev/serve.py', S.FILES)
        self.assertIn('wheels/torch-2.8.0-cp312-cp312-manylinux_2_28_x86_64.whl', S.FILES)
        self.assertIn('wheels/triton-3.4.0-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl', S.FILES)

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

    @unittest.skipUnless(LOCAL_CONTEXT.is_file(), 'host-only build context not present')
    def test_real_context_matches_every_pin(self):
        S.check_context(LOCAL_CONTEXT)

    def test_host_module_imports_no_model_stack(self):
        tree = ast.parse(Path(S.__file__).read_text())
        names = {alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom))
                 for alias in node.names} | {node.module.split('.')[0] for node in ast.walk(tree)
                                             if isinstance(node, ast.ImportFrom) and node.module}
        self.assertFalse(names & {'torch', 'transformers', 'peft', 'subprocess', 'urllib', 'socket'})


if __name__ == '__main__':
    unittest.main()
