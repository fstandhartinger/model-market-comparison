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
import order_admission_registry
import starlord_v2_runtime_supplement
import starlord_v22_runtime_supplement as S

IID = 'sha256:' + 'b' * 64
LOCAL_CONTEXT = S.CONTEXT  # host-only (~230 MB public artefacts); the real-pin test is skipped where it is absent


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

    def test_active_only_for_exact_orders_kind_and_base(self):
        root = '/home/flori/jobs/fastlane-evaluations/'
        self.assertEqual(S.ORDERS, frozenset({'b4539ae2-d626-482e-aaf6-05ae4f564eb2', '3613f4c1-7212-46f0-b3d3-357748a7560c'}))
        with patch.object(order_admission_registry, 'load', return_value={'entries': []}):
            for order in sorted(S.ORDERS):
                job = root + order
                self.assertTrue(S.active(job, recipe()))
                self.assertFalse(S.active(job[:-1] + ('0' if job[-1] != '0' else '1'), recipe()))
                self.assertFalse(S.active(job + '-x', recipe()))
                self.assertFalse(S.active(root + order[:8], recipe()))
                self.assertFalse(S.active(job, recipe(kind='python_inprocess')))
                self.assertFalse(S.active(job, recipe(kind='aplomb_native')))
                self.assertFalse(S.active(job, recipe(image=S.BASE_IMAGE.split('@')[0])))
                self.assertFalse(S.active(job, recipe(image=starlord_v2_runtime_supplement.BASE_IMAGE)))
                self.assertFalse(S.active(job, None))
                # The reviewed v2 supplement (torch 2.10/cu13) never selects these orders, even on its own base.
                self.assertFalse(starlord_v2_runtime_supplement.active(job, recipe()))
                self.assertFalse(starlord_v2_runtime_supplement.active(
                    job, recipe(image=starlord_v2_runtime_supplement.BASE_IMAGE)))
            # ...and this one never selects any earlier Starlord order.
            for order in sorted(starlord_v2_runtime_supplement.ORDERS):
                self.assertFalse(S.active(root + order, recipe()))
            for other in ('/jobs/other-order', '/jobs/8c7dbe11-5695-45d7-b701-cf92dab3ada7',
                          '/jobs/529be5d5-512f-463f-bdae-d7cd289fe970', '/jobs/43f435be-2f01-4f22-96fa-4275e78d34a4'):
                self.assertFalse(S.active(other, recipe()))

    def test_host_registry_admission_needs_exact_module_base_and_context(self):
        job = '/home/flori/jobs/fastlane-evaluations/11111111-2222-4333-8444-555555555555'
        with patch.object(order_admission_registry, 'admitted', return_value=False) as admitted:
            self.assertFalse(S.active(job, recipe()))
        admitted.assert_called_once_with('11111111-2222-4333-8444-555555555555', S.__file__, S.BASE_IMAGE, S.CONTEXT_SHA)
        with patch.object(order_admission_registry, 'admitted', return_value=True):
            self.assertTrue(S.active(job, recipe()))
            self.assertFalse(S.active(job, recipe(kind='python_inprocess')))

    def test_base_image_is_digest_pinned_and_valid_recipe_image(self):
        self.assertTrue(pod_runner.IMAGE_RE.fullmatch(S.BASE_IMAGE))
        self.assertEqual(S.BASE_IMAGE, 'pytorch/pytorch:2.9.0-cuda12.8-cudnn9-devel'
                         '@sha256:97ec2a667dd7560c615bf50a95b2fb85a673ae233a55da1706e8e04e6d6d518e')

    def test_context_inventory_is_public_artefacts_locks_dockerfile_and_three_kit_files(self):
        kit = {'decision_index_min/decision_index/__init__.py', 'decision_index_min/decision_index/engines/__init__.py',
               'decision_index_min/decision_index/engines/base.py', 'decision_index_min/LICENSE'}
        fixed = {'Dockerfile.runtime-supplement', 'runtime-supplement-requirements.lock.txt', 'flash-attn-sdist.lock.txt',
                 'sdist/flash_attn-2.8.3.tar.gz'}
        for name in S.FILES:
            self.assertTrue(name in fixed or name in kit
                            or (name.startswith('wheels/') and name.endswith('.whl') and '/' not in name[7:]), name)
        self.assertTrue(kit | fixed <= set(S.FILES))
        self.assertEqual(sum(name.startswith('wheels/') for name in S.FILES), len(S.FILES) - len(fixed) - len(kit))
        self.assertFalse(any(name.endswith(('.pt', '.pth', '.bin', '.pkl')) for name in S.FILES))
        # torch, Triton and the CUDA wheels come from the pinned base image; no prebuilt flash-attn wheel is carried.
        self.assertFalse(any(name.startswith(('wheels/torch-', 'wheels/torchvision-', 'wheels/triton-', 'wheels/nvidia_',
                                              'wheels/flash_attn-')) for name in S.FILES))
        # flash-attn: exactly the PyPI 2.8.3 sdist; causal-conv1d: exactly the README-pinned upstream release asset.
        self.assertEqual(S.FILES['sdist/flash_attn-2.8.3.tar.gz'],
                         '1e71dd64a9e0280e0447b8a0c2541bad4bf6ac65bdeaa2f90e51a9e57de0370d')
        self.assertEqual(S.FILES['wheels/causal_conv1d-1.7.0-cp311-cp311-linux_x86_64.whl'],
                         '815388d4c13bd1cc578f3a148c5892630c14c7ae455295f9ad52e648d1cb8d8b')
        # Every pure-Python/abi3 wheel shared with the reviewed v2 supplement keeps v2's exact pin; the only wheel additions are
        # causal-conv1d and the cp311 builds of v2's two cp312 wheels.
        shared = {name: pin for name, pin in starlord_v2_runtime_supplement.FILES.items()
                  if name.startswith('decision_index_min/') or (name.startswith('wheels/') and 'cp312' not in name)}
        shared.pop('wheels/flash_attn-2.8.3-cp312-cp312-linux_x86_64.whl', None)
        self.assertEqual({name: S.FILES.get(name) for name in shared}, shared)
        self.assertEqual({name for name in S.FILES if name.startswith('wheels/')} - set(shared), {
            'wheels/causal_conv1d-1.7.0-cp311-cp311-linux_x86_64.whl',
            'wheels/pydantic_core-2.50.4-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl',
            'wheels/regex-2026.11.9-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl'})
        self.assertFalse(any('cp312' in name for name in S.FILES))
        self.assertNotEqual(S.REMOTE_ROOT, starlord_v2_runtime_supplement.REMOTE_ROOT)
        self.assertNotEqual(S.BASE_IMAGE, starlord_v2_runtime_supplement.BASE_IMAGE)
        self.assertGreaterEqual(S.BUILD_TIMEOUT_S, 3600)

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
        self.assertFalse(names & {'torch', 'transformers', 'fla', 'causal_conv1d', 'accelerate', 'safetensors', 'subprocess', 'urllib', 'socket'})


if __name__ == '__main__':
    unittest.main()
