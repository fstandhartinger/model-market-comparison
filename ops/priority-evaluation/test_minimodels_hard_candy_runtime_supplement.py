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
import minimodels_hard_candy_runtime_supplement as S

IID = 'sha256:' + 'b' * 64
LOCAL_CONTEXT = S.CONTEXT  # host-only (~3 GB public wheels/toolchains); the real-pin test is skipped where it is absent


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
        self.assertFalse(S.active('/jobs/8c7dbe11-5695-45d7-b701-cf92dab3ada7', recipe()))
        self.assertFalse(S.active('/jobs/529be5d5-512f-463f-bdae-d7cd289fe970', recipe()))
        self.assertFalse(S.active('/jobs/a5d49ab5-d91f-4545-9f23-6fbce4a33021', recipe()))
        self.assertFalse(S.active('/jobs/1dedbcf2-3577-47b9-9893-eaad445b7061', recipe()))
        self.assertFalse(S.active('/jobs/a597df0b-966e-4b7b-9a78-722097bc1ba6', recipe()))
        self.assertFalse(S.active('/jobs/2d2f81c6-4f5d-47c6-ac93-8d3e88408b75', recipe()))
        self.assertFalse(S.active('/jobs/f62aeab1', recipe()))
        self.assertFalse(S.active('/jobs/f62aeab1-97ee-4340-85de-a4a513757a6d', recipe()))
        self.assertFalse(S.active('/jobs/9aa6673b', recipe()))
        self.assertFalse(S.active(job, recipe(kind='python_inprocess')))
        self.assertFalse(S.active(job, recipe(kind='aplomb_native')))
        self.assertFalse(S.active(job, recipe(image='vllm/vllm-openai:v0.30.0@sha256:' + 'a' * 64)))
        self.assertFalse(S.active(job, recipe(image=S.BASE_IMAGE.split('@')[0])))
        self.assertFalse(S.active(job, None))

    def test_base_image_is_digest_pinned_and_valid_recipe_image(self):
        self.assertTrue(pod_runner.IMAGE_RE.fullmatch(S.BASE_IMAGE))

    def test_context_inventory_is_public_wheels_toolchains_and_build_files(self):
        fixed = {'Dockerfile.runtime-supplement', 'runtime-supplement-requirements.lock.txt', 'buildtools-requirements.lock.txt',
                 'cargo-config.toml', 'skyfall-start.sh'}
        deps = {'deps/cargo-1.100.0-x86_64-unknown-linux-gnu.tar.xz', 'deps/rustc-1.100.0-x86_64-unknown-linux-gnu.tar.xz',
                'deps/rust-std-1.100.0-x86_64-unknown-linux-gnu.tar.xz', 'deps/cargo-vendor.tar',
                'deps/cpython-3.12.16+20261110-x86_64-unknown-linux-gnu-install_only.tar.gz',
                'deps/tokenizers-cpp-c586c52f93f7b060753bd2388eb96a105cb7374d.tar.gz',
                'deps/json-65ee68451d8eb2b5f3a30b410476ab83deb3289b.tar.gz',
                'deps/cpp-httplib-89c932f313c6437c38f2982869beacc89c2f2246.tar.gz',
                'deps/libpcre2-dev_10.42-4ubuntu2.2_amd64.deb'}
        for name in S.FILES:
            self.assertTrue(name in fixed or name in deps
                            or (name.startswith(('wheels/', 'buildtools-wheels/')) and name.endswith('.whl')
                                and name.count('/') == 1), name)
        self.assertTrue(fixed <= set(S.FILES))
        self.assertTrue(deps <= set(S.FILES))
        self.assertEqual(list(S.FILES).count('buildtools-wheels/cmake-3.28.3-py2.py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl'), 1)
        self.assertFalse(any(name.endswith(('.pt', '.pth', '.bin', '.pkl', '.safetensors', '.cpp', '.lock')) for name in S.FILES))
        # No customer file: the Skyfall sources and the customer's Cargo.lock are compiled from /code at service start.
        self.assertFalse(any('skyfall.cpp' in name or 'cuda.cpp' in name or 'Cargo.lock' in name for name in S.FILES))
        for wheel in ('wheels/mlx-0.32.4-cp312-cp312-manylinux_2_35_x86_64.whl', 'wheels/mlx_cuda_12-0.32.4-py3-none-manylinux_2_35_x86_64.whl',
                      'wheels/huggingface_hub-2.4.0-py3-none-any.whl'):
            self.assertIn(wheel, S.FILES)
        for prefix in ('wheels/nvidia_cudnn_cu12-9.', 'wheels/nvidia_cublas_cu12-12.9.', 'wheels/nvidia_cufft_cu12-11.4.',
                       'wheels/nvidia_cuda_nvrtc_cu12-12.9.', 'wheels/nvidia_cusolver_cu12-11.7.', 'wheels/nvidia_nccl_cu12-', 'wheels/hf_xet-'):
            self.assertTrue(any(name.startswith(prefix) for name in S.FILES), prefix)
        self.assertFalse(any(name.startswith(('wheels/torch-', 'wheels/transformers-', 'wheels/triton-')) for name in S.FILES))
        self.assertIn('nvidia/cuda:12.8.1-devel-ubuntu24.04@sha256:', S.BASE_IMAGE)

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

    def test_run_wait_uses_rest_of_ttl_minus_margin_never_below_default(self):
        from datetime import datetime, timedelta, timezone
        now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
        started = (now - timedelta(minutes=20)).isoformat()
        self.assertEqual(S.run_wait_seconds(started, 3.0, now), 3 * 3600 - 20 * 60 - S.RUN_WAIT_MARGIN_S)
        late = (now - timedelta(hours=2, minutes=50)).isoformat()
        self.assertEqual(S.run_wait_seconds(late, 3.0, now), S.DEFAULT_RUN_WAIT_S)
        for bad in (None, '', 'not-a-time', '2026-11-20T11:00:00'):
            self.assertEqual(S.run_wait_seconds(bad, 3.0, now), S.DEFAULT_RUN_WAIT_S)
        source = Path(pod_runner.__file__).read_text()
        self.assertIn("wait_s = minimodels_hard_candy_runtime_supplement.run_wait_seconds(state.get('attempt_started_at'), ttl)", source)

    @unittest.skipUnless(LOCAL_CONTEXT.is_file(), 'host-only build context not present')
    def test_real_context_matches_every_pin(self):
        S.check_context(LOCAL_CONTEXT)

    def test_host_module_imports_no_model_stack(self):
        tree = ast.parse(Path(S.__file__).read_text())
        names = {alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom))
                 for alias in node.names} | {node.module.split('.')[0] for node in ast.walk(tree)
                                             if isinstance(node, ast.ImportFrom) and node.module}
        self.assertFalse(names & {'torch', 'transformers', 'scipy', 'accelerate', 'safetensors', 'huggingface_hub', 'subprocess', 'urllib', 'socket'})


if __name__ == '__main__':
    unittest.main()
