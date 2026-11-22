"""Synthetic first-party tests for the runtime catalogue; no network, no wheels installed, no container or customer code."""
import ast
import hashlib
import io
import json
import os
import re
import tarfile
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import catalogue_overlay_lock as L
import catalogue_runtime_supplement as C
import measurement_dispatch
import pod_runner

HERE = Path(__file__).resolve().parent
ORDER = '0123abcd-0000-4000-8000-00000000c0de'
IID = 'sha256:' + 'b' * 64
IMAGE_ID = 'hf-torch2.9-cu12.8'


def pypi_url(filename, seed='a'):
    return f'https://files.pythonhosted.org/packages/{seed * 2}/{seed * 2}/{seed * 60}/{filename}'


def wheel(name='peft', version='0.21.2', filename=None, **extra):
    filename = filename or f"{name.replace('-', '_')}-{version}-py3-none-any.whl"
    value = {'name': name, 'version': version, 'filename': filename, 'url': pypi_url(filename),
             'sha256': hashlib.sha256(filename.encode()).hexdigest(), 'size': 1000, 'requires': [],
             'uploaded': '2025-06-01T00:00:00Z', 'project_since': '2019-01-01T00:00:00Z'}
    value.update(extra)
    return value


def catalogue():
    return C.load_catalogue()


def lock(wheels=None, image_id=IMAGE_ID, **extra):
    value = {'schema': 1, 'image_id': image_id, 'image': catalogue()['images'][image_id]['image'],
             'wheels': [wheel()] if wheels is None else wheels, 'requested': ['peft==0.21.2'],
             'base': {'inventory_sha256': C.inventory_sha256(catalogue()['images'][image_id]), 'baseline_problems': 0},
             'resolved_at': '2026-11-22T00:00:00Z', 'resolved_by': 'test'}
    value.update(extra)
    return value


def recipe(image_id=IMAGE_ID, **extra):
    value = {'kind': 'http_typesafe', 'image': catalogue()['images'][image_id]['image']}
    value.update(extra)
    return value


class FakeProvider:
    """Records commands; models uploaded/fetched files so sha256sum/find answer like a pod would."""
    pip_lines: dict = {}

    def __init__(self, wheels=None, context_sha=None, iid=IID, inspected=None, wheel_sha=None, listing=None):
        self.calls, self.files, self.iid, self.inspected = [], {}, iid, inspected or iid
        self.context_sha, self.wheel_sha, self.listing = context_sha, wheel_sha, listing
        self.known = {w['url']: w['sha256'] for w in (wheels or [])}
        for image in catalogue()['images'].values():
            self.known.update({w['url']: w['sha256'] for w in image['downloader']['wheels']})

    def exec(self, pod_id, command, timeout=600):
        self.calls.append(('exec', tuple(command), timeout))
        out = ''
        if command[0] == 'sha256sum':
            path = command[1]
            if path.endswith('context.tar'):
                digest = self.context_sha or hashlib.sha256(self.files[path]).hexdigest()
            else:
                digest = self.wheel_sha or self.files[path]
            out = f'{digest}  {path}\n'
        elif command[0] == 'curl':
            self.files[command[command.index('-o') + 1]] = self.known[command[-1]]
        elif command[0] == 'find':
            root = command[1] + '/'
            names = self.listing if self.listing is not None else [k[len(root):] for k in self.files if k.startswith(root)]
            out = ''.join(f + '\n' for f in names)
        elif command[0] == 'cat':
            out = self.iid + '\n'
        elif command[:3] == ['docker', 'image', 'inspect']:
            out = self.inspected + '\n'
        elif command[:2] == ['docker', 'run'] and 'check' in command:
            lines = self.pip_lines.get(command[command.index('python3') + 1], [])
            return SimpleNamespace(returncode=1 if lines else 0, stderr='',
                                   stdout=''.join(l + '\n' for l in lines) or 'No broken requirements found.\n')
        return SimpleNamespace(returncode=0, stdout=out, stderr='')

    def scp_to(self, pod_id, local, remote):
        data = Path(local).read_bytes()
        self.files[remote] = data
        self.calls.append(('scp_to', data, remote))


class Order:
    """A synthetic frozen order folder + host registry in a temp dir."""

    def __init__(self, case, lock_value, *, admit=True, pin=True):
        self.tmp = tempfile.TemporaryDirectory()
        case.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.job = root / ORDER
        self.trusted = self.job / 'trusted-runner'
        self.trusted.mkdir(parents=True)
        self.registry = root / 'state' / 'catalogue-admissions.json'
        self.data = C.canonical_json(lock_value)
        (self.trusted / C.LOCK).write_bytes(self.data)
        files = {C.LOCK: {'bytes': len(self.data), 'sha256': hashlib.sha256(self.data).hexdigest()}} if pin else {}
        (self.trusted / 'UPSTREAM-MANIFEST.json').write_text(json.dumps({'files': files}))
        if admit:
            L.append_admission(ORDER, self.data, lock_value, by='test', basis='unit test', registry=self.registry)
        patcher = patch.object(C, 'REGISTRY', self.registry)
        patcher.start()
        case.addCleanup(patcher.stop)


class CatalogueData(unittest.TestCase):
    def test_catalogue_bytes_match_the_module_pin(self):
        self.assertEqual(hashlib.sha256(C.CATALOGUE.read_bytes()).hexdigest(), C.CATALOGUE_SHA256)
        self.assertEqual(sorted(catalogue()['images']), ['hf-torch2.14-cu13.0', 'hf-torch2.9-cu12.8', 'vllm-0.31'])

    def test_tampered_catalogue_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'c.json'
            path.write_bytes(C.CATALOGUE.read_bytes().replace(b'"max_wheels": 120', b'"max_wheels": 9999'))
            with self.assertRaises(C.CatalogueError):
                C.load_catalogue(path)

    def test_every_image_is_digest_pinned_and_already_pinned_in_reviewed_code(self):
        reviewed = '\n'.join(p.read_text() for p in HERE.glob('*.py') if not p.name.startswith(('test_', 'catalogue_')))
        reviewed += (HERE / 'test_autopickup.py').read_text()
        for image_id, image in catalogue()['images'].items():
            self.assertTrue(pod_runner.IMAGE_RE.fullmatch(image['image']), image_id)
            digest = image['image'].split('@sha256:')[1]
            if image_id.startswith('vllm'):
                # The generic recipe image is pinned in recipes and tests, not in a supplement module.
                self.assertIn(digest, json.dumps(image['source']) + image['image'])
            else:
                self.assertIn(image['image'], reviewed, image_id)

    def test_overlay_policy_denies_runtime_replacements(self):
        cat = catalogue()
        for name in ('torch', 'torchvision', 'triton', 'vllm', 'nvidia-cublas-cu12', 'pip', 'setuptools', 'uv',
                     'cuda-python', 'xformers', 'tensorflow-io'):
            self.assertTrue(C.denied(name, cat), name)
        for name in ('transformers', 'peft', 'accelerate', 'safetensors', 'fastapi'):
            self.assertFalse(C.denied(name, cat), name)
        self.assertEqual(cat['overlay']['index_hosts'], ['files.pythonhosted.org'])

    def test_preinstalled_inventory_has_the_runtime(self):
        images = catalogue()['images']
        self.assertEqual(images['hf-torch2.9-cu12.8']['preinstalled']['torch'], '2.9.1+cu128')
        self.assertEqual(images['hf-torch2.14-cu13.0']['preinstalled']['torch'], '2.14.1+cu130')
        self.assertEqual(images['vllm-0.31']['preinstalled']['vllm'], '0.31.0')
        for image in images.values():
            self.assertIn('pip', image['preinstalled'])


class WheelTags(unittest.TestCase):
    def test_compatibility_matrix(self):
        good = ['peft-0.21.2-py3-none-any.whl', 'six-1.17.0-py2.py3-none-any.whl',
                'regex-2026.9.29-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl',
                'safetensors-0.8.0-cp38-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl',
                'tokenizers-0.22.2-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl',
                'ninja-1.13.0-py3-none-manylinux_2_12_x86_64.manylinux2010_x86_64.whl']
        bad = ['regex-2026.9.29-cp312-cp312-manylinux2014_x86_64.whl', 'x-1-cp311-cp311-musllinux_1_2_x86_64.whl',
               'x-1-cp311-cp311-manylinux_2_39_x86_64.whl', 'x-1-cp311-cp311-linux_x86_64.whl',
               'x-1-cp311-cp311-manylinux2014_aarch64.whl', 'x-1-cp311-cp311-win_amd64.whl', 'x-1-py2-none-any.whl',
               'x-1-cp312-abi3-manylinux2014_x86_64.whl', 'x-1.tar.gz', 'x-1-py3-none-any.zip', '../x-1-py3-none-any.whl']
        for name in good:
            self.assertTrue(C.wheel_compatible(name, '3.11', '2.35'), name)
        for name in bad:
            self.assertFalse(C.wheel_compatible(name, '3.11', '2.35'), name)
        self.assertTrue(C.wheel_compatible('regex-1-cp312-cp312-manylinux2014_x86_64.whl', '3.12', '2.35'))


class LockValidation(unittest.TestCase):
    def test_valid_lock_returns_its_image(self):
        self.assertEqual(C.validate_lock(lock(), catalogue())['python'], '3.11')
        self.assertEqual(C.validate_lock(lock(wheels=[]), catalogue())['python'], '3.11')

    def refused(self, value):
        with self.assertRaises(C.CatalogueError):
            C.validate_lock(value, catalogue())

    def test_refusals(self):
        cat = catalogue()
        self.refused(dict(lock(), extra=1))
        self.refused(dict(lock(), image_id='nope'))
        self.refused(lock(image=cat['images']['vllm-0.31']['image']))
        self.refused(lock(wheels=[wheel(filename='peft-0.21.2.tar.gz')]))
        self.refused(lock(wheels=[wheel(filename='peft-0.21.2-cp312-cp312-manylinux2014_x86_64.whl')]))
        self.refused(lock(wheels=[wheel(filename='other-0.21.2-py3-none-any.whl')]))
        self.refused(lock(wheels=[wheel(version='0.21.3', filename='peft-0.21.2-py3-none-any.whl')]))
        self.refused(lock(wheels=[wheel(name='torch', version='2.9.1')]))
        self.refused(lock(wheels=[wheel(name='nvidia-nccl-cu12', version='2.27.0')]))
        self.refused(lock(wheels=[wheel(), wheel()]))
        self.refused(lock(wheels=[wheel(sha256='A' * 64)]))
        self.refused(lock(wheels=[wheel(size=0)]))
        self.refused(lock(wheels=[wheel(size=True)]))
        self.refused(lock(wheels=[wheel(size=cat['overlay']['max_wheel_bytes'] + 1)]))
        self.refused(lock(wheels=[dict(wheel(), extra='x')]))
        self.refused(lock(wheels=[wheel(name='Peft')]))
        self.refused(lock(wheels=[wheel(name='a/b')]))
        name = 'peft-0.21.2-py3-none-any.whl'
        for url in ('http://files.pythonhosted.org/packages/aa/aa/' + 'a' * 60 + '/' + name,
                    'https://evil.example/packages/aa/aa/' + 'a' * 60 + '/' + name,
                    'https://files.pythonhosted.org:8443/packages/aa/aa/' + 'a' * 60 + '/' + name,
                    'https://user@files.pythonhosted.org/packages/aa/aa/' + 'a' * 60 + '/' + name,
                    pypi_url(name) + '?x=1', pypi_url(name) + '#f', pypi_url('other.whl'),
                    'https://files.pythonhosted.org/simple/peft/' + name,
                    'https://files.pythonhosted.org/packages/aa/aa/' + 'a' * 60 + '/%2e%2e/' + name,
                    'git+https://github.com/x/y', 'file:///tmp/' + name):
            self.refused(lock(wheels=[wheel(url=url)]))
        many = [wheel(name=f'p{i}', version='1.0') for i in range(cat['overlay']['max_wheels'] + 1)]
        self.refused(lock(wheels=many))
        big = [wheel(name=f'p{i}', version='1.0', size=cat['overlay']['max_wheel_bytes']) for i in range(5)]
        self.refused(lock(wheels=big))

    def test_build_files_are_fixed_text(self):
        value = lock(wheels=[wheel(), wheel(name='accelerate', version='1.15.0')])
        text = C.dockerfile(value)
        self.assertTrue(text.startswith('FROM ' + value['image'] + '\n'))
        self.assertIn('--no-index --no-deps --require-hashes --only-binary=:all:', text)
        self.assertEqual(C.requirements_lock(value).splitlines()[0], f"peft==0.21.2 --hash=sha256:{value['wheels'][0]['sha256']}")
        self.assertEqual(C.dockerfile(lock(wheels=[])), 'FROM ' + value['image'] + '\n')
        self.assertEqual(C.context_tar(value), C.context_tar(value))  # deterministic


class Acceptance(unittest.TestCase):
    def test_accepted_with_frozen_pinned_admitted_lock(self):
        order = Order(self, lock())
        self.assertTrue(C.selected(order.job))
        record = C.accept(order.job, recipe())
        self.assertEqual(record['lock_sha256'], hashlib.sha256(order.data).hexdigest())
        self.assertEqual(C.preflight(order.job, recipe())['lock']['image_id'], IMAGE_ID)

    def test_not_selected_without_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp) / ORDER
            (job / 'trusted-runner').mkdir(parents=True)
            self.assertFalse(C.selected(job))
            self.assertIsNone(C.preflight(job, recipe()))
            (job / 'trusted-runner' / C.REQUEST).write_text('{}')
            self.assertTrue(C.selected(job))
            with self.assertRaises(measurement_dispatch.OperationalHold):
                C.preflight(job, recipe())

    def assertRefused(self, job, value=None):
        with self.assertRaises((C.CatalogueError, OSError, ValueError)):
            C.accept(job, recipe() if value is None else value)
        with self.assertRaises(measurement_dispatch.OperationalHold) as raised:
            C.preflight(job, recipe() if value is None else value)
        self.assertEqual(str(raised.exception), C.HOLD)

    def test_no_admission_entry(self):
        self.assertRefused(Order(self, lock(), admit=False).job)

    def test_lock_not_pinned_by_the_frozen_manifest(self):
        self.assertRefused(Order(self, lock(), pin=False).job)

    def test_lock_changed_after_freeze(self):
        order = Order(self, lock())
        (order.trusted / C.LOCK).write_bytes(order.data.replace(b'0.21.2', b'0.21.3'))
        self.assertRefused(order.job)

    def test_admission_for_another_lock_or_order(self):
        order = Order(self, lock(), admit=False)
        other = C.canonical_json(lock(wheels=[]))
        L.append_admission(ORDER, other, lock(wheels=[]), by='t', basis='b', registry=order.registry)
        L.append_admission('ffffffff-0000-4000-8000-000000000000', order.data, lock(), by='t', basis='b',
                           registry=order.registry)
        self.assertRefused(order.job)

    def test_admission_bound_to_module_and_catalogue(self):
        order = Order(self, lock())
        with patch.dict(C._MODULE_DIGEST, {os.fspath(Path(C.__file__).resolve()): 'c' * 64}):
            self.assertRefused(order.job)
        value = json.loads(order.registry.read_text())
        value['entries'][0]['catalogue_sha256'] = 'd' * 64
        order.registry.write_text(json.dumps(value))
        self.assertRefused(order.job)

    def test_unsafe_registry_file(self):
        order = Order(self, lock())
        os.chmod(order.registry, 0o664)
        self.assertRefused(order.job)
        os.chmod(order.registry, 0o600)
        C.accept(order.job, recipe())
        moved = order.registry.with_name('real.json')
        order.registry.rename(moved)
        order.registry.symlink_to(moved)
        self.assertRefused(order.job)

    def test_symlinked_lock(self):
        order = Order(self, lock())
        real = order.trusted / 'real.json'
        (order.trusted / C.LOCK).rename(real)
        (order.trusted / C.LOCK).symlink_to(real)
        self.assertRefused(order.job)

    def test_recipe_must_match_image_and_kind(self):
        order = Order(self, lock())
        self.assertRefused(order.job, recipe(image=catalogue()['images']['vllm-0.31']['image']))
        self.assertRefused(order.job, recipe(kind='aplomb_native'))
        self.assertRefused(order.job, None if False else {'kind': 'http_typesafe'})
        order2 = Order(self, lock(image_id='vllm-0.31'))
        self.assertRefused(order2.job, recipe('vllm-0.31', kind='python_inprocess'))
        C.accept(order2.job, recipe('vllm-0.31'))

    def test_folder_name_must_be_an_order_id(self):
        order = Order(self, lock())
        renamed = order.job.with_name('not-an-order')
        order.job.rename(renamed)
        self.assertRefused(renamed)


class Build(unittest.TestCase):
    def test_build_fetches_by_hash_then_builds_offline(self):
        value = lock(wheels=[wheel(), wheel(name='accelerate', version='1.15.0')])
        order = Order(self, value)
        context = C.context_tar(value)
        provider = FakeProvider(value['wheels'])
        result = C.build(provider, 'pod-1', order.job, recipe())
        self.assertEqual(result['effective_image'], IID)
        self.assertEqual(result['base_image'], value['image'])
        self.assertEqual(result['wheels'], 2)
        self.assertEqual(result['lock_sha256'], hashlib.sha256(order.data).hexdigest())
        scp = [c for c in provider.calls if c[0] == 'scp_to']
        self.assertEqual(len(scp), 2)  # order context, then the downloader context
        self.assertEqual(scp[0][1], context)
        downloader = catalogue()['images'][IMAGE_ID]['downloader']['wheels']
        self.assertEqual(scp[1][1], C.context_tar(C.downloader_lock(IMAGE_ID, catalogue()['images'][IMAGE_ID])))
        self.assertEqual(result['download_image'], IID)
        curls = [c[1] for c in provider.calls if c[0] == 'exec' and c[1][0] == 'curl']
        self.assertEqual(len(curls), 2 + len(downloader))
        for argv in curls:
            self.assertIn('=https', argv)
            self.assertEqual(argv[argv.index('--max-redirs') + 1], '0')
            self.assertTrue(argv[-1].startswith('https://files.pythonhosted.org/packages/'))
        builds = [c[1] for c in provider.calls if c[0] == 'exec' and c[1][:2] == ('docker', 'build')]
        self.assertEqual(len(builds), 2)  # order image, download image
        for argv in builds:
            self.assertEqual(argv[argv.index('--network') + 1], 'none')
            self.assertIn('--pull=false', argv)
        self.assertNotEqual(builds[0][-1], builds[1][-1])  # separate build contexts
        names = [c[1][0] if c[0] == 'exec' else 'scp' for c in provider.calls]
        self.assertLess(names.index('scp'), names.index('curl'))
        self.assertLess(names.index('curl'), names.index('docker'))
        pip_checks = [c[1] for c in provider.calls if c[0] == 'exec' and c[1][:2] == ('docker', 'run')]
        self.assertEqual(len(pip_checks), 3)  # base image, the order image, the download image
        for argv in pip_checks:
            self.assertEqual(argv[argv.index('--network') + 1], 'none')
        self.assertEqual(result['pip_check'], {'base_problems': 0, 'derived_problems': 0, 'added': []})

    def test_pod_pip_check_gate_holds_on_a_new_problem_but_not_on_base_or_ignored_ones(self):
        value = lock()
        order = Order(self, value)
        base_line = 'torch 2.9.1 has requirement x==1, but you have x 2.'
        provider = FakeProvider(value['wheels'])
        provider.pip_lines = {value['image']: [base_line], IID: [base_line]}
        self.assertEqual(C.build(provider, 'pod-1', order.job, recipe())['pip_check']['added'], [])
        provider = FakeProvider(value['wheels'])
        provider.pip_lines = {value['image']: [base_line], IID: [base_line, 'peft 0.21.2 requires accelerate, which is not installed.']}
        state = {}
        with self.assertRaises(measurement_dispatch.OperationalHold) as raised:
            C.build(provider, 'pod-1', order.job, recipe(), state)
        self.assertEqual(str(raised.exception), C.PIP_HOLD)
        self.assertEqual(state['runtime_supplement_refused']['pip_check']['added'],
                         ['peft 0.21.2 requires accelerate, which is not installed.'])
        b = Order(self, lock(image_id='hf-torch2.14-cu13.0'))
        b_lock = lock(image_id='hf-torch2.14-cu13.0')
        provider = FakeProvider(b_lock['wheels'])
        provider.pip_lines = {IID: ['spin 0.18 has requirement click!=8.3.0,<8.4,>=8, but you have click 8.5.1.']}
        self.assertEqual(C.build(provider, 'pod-1', b.job, recipe('hf-torch2.14-cu13.0'))['pip_check']['added'], [])

    def test_empty_overlay_uses_the_base_image(self):
        order = Order(self, lock(wheels=[], image_id='vllm-0.31'))
        provider = FakeProvider([])
        result = C.build(provider, 'pod-1', order.job, recipe('vllm-0.31'))
        self.assertEqual(result['effective_image'], lock(image_id='vllm-0.31')['image'])
        self.assertEqual(result['download_image'], lock(image_id='vllm-0.31')['image'])  # vLLM ships huggingface_hub
        self.assertEqual(provider.calls, [])
        order = Order(self, lock(wheels=[]))
        provider = FakeProvider([])
        result = C.build(provider, 'pod-1', order.job, recipe())
        self.assertEqual(result['effective_image'], lock()['image'])
        self.assertEqual(result['download_image'], IID)  # hf-torch bases need the reviewed downloader overlay

    def test_download_image_never_contains_order_wheels(self):
        for image_id, image in catalogue()['images'].items():
            names = {w['name'] for w in image['downloader']['wheels']}
            self.assertTrue(names <= {'huggingface-hub', 'hf-xet', 'httpx', 'httpcore', 'h11', 'anyio', 'click', 'tqdm',
                                      'idna', 'certifi', 'sniffio', 'filelock', 'fsspec', 'packaging', 'pyyaml',
                                      'requests', 'typing-extensions'}, image_id)
            if 'huggingface-hub' not in image['preinstalled']:
                self.assertIn('huggingface-hub', names, image_id)
            C.validate_lock(C.downloader_lock(image_id, image), catalogue())

    def test_host_acceptance_failure_is_a_hold_before_any_pod_effect(self):
        order = Order(self, lock(), admit=False)
        provider = FakeProvider(lock()['wheels'])
        with self.assertRaises(measurement_dispatch.OperationalHold):
            C.build(provider, 'pod-1', order.job, recipe())
        self.assertEqual(provider.calls, [])

    def test_pod_side_mismatches_are_run_errors(self):
        value = lock()
        order = Order(self, value)
        for provider in (FakeProvider(value['wheels'], context_sha='c' * 64),
                         FakeProvider(value['wheels'], wheel_sha='e' * 64),
                         FakeProvider(value['wheels'], listing=['peft-0.21.2-py3-none-any.whl', 'x.whl']),
                         FakeProvider(value['wheels'], iid='latest'),
                         FakeProvider(value['wheels'], inspected='sha256:' + 'd' * 64)):
            with self.assertRaises(pod_runner.PodRunError):
                C.build(provider, 'pod-1', order.job, recipe())


class PodRunnerWiring(unittest.TestCase):
    def test_run_holds_before_any_provider_or_reservation(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp) / ORDER
            (job / 'trusted-runner').mkdir(parents=True)
            (job / 'trusted-runner' / C.REQUEST).write_text('{}')
            pins = {'p': 1}
            with patch.object(pod_runner, 'validate_recipe', lambda r, j: r):
                with self.assertRaises(measurement_dispatch.OperationalHold) as raised:
                    pod_runner.run(ORDER, job, recipe(), Path(tmp) / 'out', pins, 20.0, provider=None,
                                   measurement_pins_factory=lambda: pins)
            self.assertEqual(str(raised.exception), C.HOLD)
            self.assertFalse((Path(tmp) / 'out').exists())

    def test_build_site_is_after_the_order_supplements_and_refuses_a_second_supplement(self):
        source = (HERE / 'pod_runner.py').read_text()
        site = source.index('catalogue_runtime_supplement.selected(job_dir)')
        self.assertGreater(site, source.index('quyet_runtime_supplement.build(provider, pod_id)'))
        self.assertLess(site, source.index('if runtime_preflight is not None:\n            state[\'runtime_preflight\']'))
        window = source[site:site + 600]
        self.assertIn("if image != recipe[\"image\"]:", window)
        self.assertIn("runtime_supplement_conflict", window)

    def test_host_modules_import_no_model_stack_or_process_tools(self):
        for module in (C, L):
            tree = ast.parse(Path(module.__file__).read_text())
            names = {alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node, ast.Import)
                     for alias in node.names} | {node.module.split('.')[0] for node in ast.walk(tree)
                                                 if isinstance(node, ast.ImportFrom) and node.module}
            self.assertFalse(names & {'torch', 'transformers', 'peft', 'subprocess', 'socket', 'pip', 'importlib'})
        self.assertNotIn('urllib.request', Path(C.__file__).read_text())


# ------------------------------------------------------------------------------------------------------------- resolver

def wheel_file(name, version, py='py3-none-any', yanked=False, kind='bdist_wheel', uploaded='2024-01-01T00:00:00.000000Z'):
    filename = f"{name.replace('-', '_')}-{version}-{py}.whl" if kind == 'bdist_wheel' else f'{name}-{version}.tar.gz'
    return {'packagetype': kind, 'filename': filename, 'url': pypi_url(filename, 'f'), 'yanked': yanked,
            'digests': {'sha256': hashlib.sha256(filename.encode()).hexdigest()}, 'size': 2048,
            'upload_time_iso_8601': uploaded}


class FakePyPI:
    def __init__(self, packages):
        self.packages, self.urls = packages, []  # {name: {version: (requires_dist, [files])}}

    def __call__(self, url):
        self.urls.append(url)
        match = re.fullmatch(r'https://pypi\.org/pypi/([^/]+)(?:/([^/]+))?/json', url)
        name, version = match[1], match[2]
        releases = self.packages[name]
        if version is None:
            newest = sorted(releases, key=lambda v: L.parse_version(v)['key'])[-1]
            return json.dumps({'info': {'name': name, 'version': newest, 'requires_dist': releases[newest][0]},
                               'releases': {v: files for v, (_, files) in releases.items()}}).encode()
        requires, files = releases[version]
        return json.dumps({'info': {'name': name, 'version': version, 'requires_dist': requires}, 'urls': files}).encode()


def pkg(name, *versions, requires=None, py='py3-none-any', files=None):
    return {v: (requires or [], files if files is not None else [wheel_file(name, v, py)]) for v in versions}


class Resolver(unittest.TestCase):
    def request(self, *lines, image_id=IMAGE_ID):
        return {'schema': 1, 'image_id': image_id, 'requirements': list(lines)}

    def test_exact_pins_plus_completion_and_image_skips(self):
        fetch = FakePyPI({
            'peft': pkg('peft', '0.21.2', requires=['torch>=1.13', 'numpy>=1.17', 'safetensors>=0.4',
                                                    'pytest; extra == "test"', 'colorama; sys_platform == "win32"',
                                                    'tomli; python_version < "3.11"']),
            'safetensors': pkg('safetensors', '0.3.0', '0.8.0', '0.9.0rc1',
                               files=None),
        })
        lock_value = L.resolve(self.request('peft==0.21.2'), fetch=fetch)
        self.assertEqual([(w['name'], w['version']) for w in lock_value['wheels']], [('peft', '0.21.2'), ('safetensors', '0.8.0')])
        self.assertEqual(lock_value['requested'], ['peft==0.21.2'])
        self.assertFalse(any('pytest' in u or 'colorama' in u or 'tomli' in u for u in fetch.urls))
        C.validate_lock(lock_value, catalogue())

    def test_preinstalled_upgraded_only_when_a_constraint_requires_it(self):
        fetch = FakePyPI({'x-lib': pkg('x-lib', '1.0', requires=['typing-extensions>=99.0']),
                          'typing-extensions': pkg('typing-extensions', '4.0', '99.1')})
        value = L.resolve(self.request('x-lib==1.0'), fetch=fetch)
        self.assertIn(('typing-extensions', '99.1'), [(w['name'], w['version']) for w in value['wheels']])
        fetch = FakePyPI({'x-lib': pkg('x-lib', '1.0', requires=['typing-extensions>=1.0'])})
        self.assertEqual([w['name'] for w in L.resolve(self.request('x-lib==1.0'), fetch=fetch)['wheels']], ['x-lib'])

    def test_completion_prefers_a_release_that_keeps_the_base_unchanged(self):
        installed_click = catalogue()['images'][IMAGE_ID]['preinstalled'].get('click')
        self.assertTrue(installed_click)
        fetch = FakePyPI({'x-lib': pkg('x-lib', '1.0', requires=['helper>=1']),
                          'helper': {'1.0': ([], [wheel_file('helper', '1.0')]),
                                     '2.0': (['click>=999'], [wheel_file('helper', '2.0')])}})
        value = L.resolve(self.request('x-lib==1.0'), fetch=fetch)
        self.assertEqual([(w['name'], w['version']) for w in value['wheels']], [('helper', '1.0'), ('x-lib', '1.0')])
        self.assertEqual(value['wheels'][1]['requires'], ['helper>=1'])

    def test_refusals(self):
        cases = [
            (self.request('peft>=0.2'), {}),
            (self.request('peft==0.21.2', 'peft==0.21.2'), {}),
            (self.request('torch==2.9.1'), {}),
            (self.request('git+https://x/y'), {}),
            (self.request('peft[dev]==1.0'), {}),
            (dict(self.request('peft==1.0'), extra=1), {}),
            (self.request('peft==1.0', image_id='nope'), {}),
            (self.request('sdist-only==1.0'), {'sdist-only': pkg('sdist-only', '1.0', files=[wheel_file('sdist-only', '1.0', kind='sdist')])}),
            (self.request('binary==1.0'), {'binary': pkg('binary', '1.0', py='cp312-cp312-manylinux2014_x86_64')}),
            (self.request('yanked==1.0'), {'yanked': pkg('yanked', '1.0', files=[wheel_file('yanked', '1.0', yanked=True)])}),
            (self.request('needs-torch==1.0'), {'needs-torch': pkg('needs-torch', '1.0', requires=['tensorflow-io'])}),
            (self.request('a==1.0', 'b==1.0'), {'a': pkg('a', '1.0', requires=['b>=2']), 'b': pkg('b', '1.0', '2.0')}),
            (self.request('a==1.0'), {'a': pkg('a', '1.0', requires=['c>=5']), 'c': pkg('c', '1.0', '2.0')}),
            (self.request('a==1.0'), {'a': pkg('a', '1.0', requires=['torch>=99'])}),
        ]
        for request, packages in cases:
            with self.assertRaises(C.CatalogueError, msg=json.dumps(request)):
                L.resolve(request, fetch=FakePyPI(packages))

    def test_young_projects_go_to_the_owner(self):
        import datetime as _dt
        recent = (_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=5)).strftime('%Y-%m-%dT%H:%M:%S.000000Z')
        fetch = FakePyPI({'fresh-helper': pkg('fresh-helper', '0.3', files=[wheel_file('fresh-helper', '0.3', uploaded=recent)])})
        with self.assertRaises(C.CatalogueError) as raised:
            L.resolve(self.request('fresh-helper==0.3'), fetch=fetch)
        self.assertIn('younger than 90 days', str(raised.exception))
        value = L.resolve(self.request('peft==0.21.2'), fetch=FakePyPI({'peft': pkg('peft', '0.21.2')}))
        self.assertEqual(value['wheels'][0]['project_since'], '2024-01-01T00:00:00Z')
        self.assertEqual(value['wheels'][0]['uploaded'], '2024-01-01T00:00:00Z')

    def test_network_problem_is_a_refusal_not_a_partial_lock(self):
        def broken(url):
            raise OSError('down')
        with self.assertRaises(C.CatalogueError):
            L.resolve(self.request('peft==0.21.2'), fetch=broken)

    def test_default_fetch_only_talks_to_pypi_json(self):
        with self.assertRaises(C.CatalogueError):
            L.default_fetch('https://evil.example/pypi/x/json')

    def test_markers_and_versions(self):
        env = L.marker_env(catalogue()['images'][IMAGE_ID])
        self.assertTrue(L.marker_applies('python_version >= "3.9" and sys_platform == "linux"', env))
        self.assertFalse(L.marker_applies('python_version < "3.11"', env))
        self.assertFalse(L.marker_applies('extra == "dev"', env))
        self.assertFalse(L.marker_applies('platform_machine == "aarch64" or sys_platform == "darwin"', env))
        self.assertTrue(L.marker_applies('(os_name == "posix") and "linux" in sys_platform', env))
        self.assertTrue(L.marker_applies('something_unknown ~~ 1', env))  # unknown -> required (conservative)
        self.assertTrue(L.satisfies('5.17.0', '>=5.5,<6'))
        self.assertFalse(L.satisfies('5.17.0', '!=5.17.0'))
        self.assertTrue(L.satisfies('2.9.1+cu128', '>=2.6'))
        self.assertTrue(L.satisfies('1.4.2', '~=1.4'))
        self.assertFalse(L.satisfies('2.0', '~=1.4'))
        self.assertTrue(L.satisfies('1.4.2', '==1.4.*'))
        self.assertFalse(L.satisfies('1.5', '==1.4.*'))
        self.assertTrue(L.satisfies('1.0rc1', '<1.0'))
        self.assertIsNone(L.satisfies('1.0', '>>1'))


class HostReceipt(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.job = Path(self.tmp.name) / ORDER
        self.prep = self.job / 'runner-prepare' / 'trusted-runner'
        self.prep.mkdir(parents=True)
        self.registry = Path(self.tmp.name) / 'state' / 'catalogue-admissions.json'
        self.fetch = FakePyPI({'peft': pkg('peft', '0.21.2')})

    def test_request_gets_host_lock_and_admission(self):
        (self.prep / C.REQUEST).write_text(json.dumps({'schema': 1, 'image_id': IMAGE_ID, 'requirements': ['peft==0.21.2']}))
        (self.prep / C.LOCK).write_text('{"generator": "wrote this"}')
        entry = L.write_receipt(self.job, self.prep, fetch=self.fetch, registry=self.registry)
        data = (self.prep / C.LOCK).read_bytes()
        self.assertEqual(entry['lock_sha256'], hashlib.sha256(data).hexdigest())
        self.assertEqual(entry['order_id'], ORDER)
        self.assertEqual(os.stat(self.registry).st_mode & 0o777, 0o600)
        self.assertEqual(C.load_registry(self.registry)['entries'][0], entry)
        self.assertTrue((self.registry.parent / L.AUDIT).is_file())
        self.assertFalse(L.request_without_lock(self.prep))

    def test_generator_lock_without_request_is_removed(self):
        (self.prep / C.LOCK).write_text('{}')
        self.assertIsNone(L.write_receipt(self.job, self.prep, fetch=self.fetch, registry=self.registry))
        self.assertFalse((self.prep / C.LOCK).exists())
        self.assertFalse(self.registry.exists())

    def test_refused_request_writes_no_lock_and_routes_to_owner(self):
        (self.prep / C.REQUEST).write_text(json.dumps({'schema': 1, 'image_id': IMAGE_ID, 'requirements': ['torch==2.9.1']}))
        result = L.write_receipt(self.job, self.prep, fetch=self.fetch, registry=self.registry)
        self.assertIn('refused', result)
        self.assertFalse((self.prep / C.LOCK).exists())
        self.assertFalse(self.registry.exists())
        self.assertTrue(L.request_without_lock(self.prep))

    def test_generator_hint_names_every_image(self):
        hint = L.generator_hint()
        for image in catalogue()['images'].values():
            self.assertIn(image['image'], hint)
        self.assertIn('CATALOGUE-REQUEST.json', hint)
        self.assertIn('do NOT write', hint)


class PipCheckSimulation(unittest.TestCase):
    def test_baseline_matches_the_real_pod_pip_check_of_each_image(self):
        # data/e2e receipts of job fastlane-runtime-catalogue-20261122 (Verda A100, 22 Nov 2026)
        expected = {'hf-torch2.9-cu12.8': set(), 'hf-torch2.14-cu13.0': set(),
                    'vllm-0.31': {('opentelemetry-exporter-otlp-common', 'opentelemetry-sdk', '~=1.45.0'),
                                  ('torch', 'nvidia-nccl-cu13', '==2.29.7')}}
        for image_id, image in catalogue()['images'].items():
            found = C.simulate_pip_check(*C.installed_set(image), C.marker_env(image), image['pip_check_ignore'])
            self.assertEqual(found, expected[image_id], image_id)

    def test_lock_that_adds_a_problem_is_refused_everywhere(self):
        missing = lock(wheels=[wheel(requires=['accelerate>=1.0', 'pytest; extra == "test"'])])
        with self.assertRaises(C.CatalogueError) as raised:
            C.validate_lock(missing, catalogue())
        self.assertIn('accelerate', str(raised.exception))
        too_new = lock(wheels=[wheel(requires=['torch>=99'])])
        with self.assertRaises(C.CatalogueError):
            C.validate_lock(too_new, catalogue())
        breaks_base = lock(wheels=[wheel(name='typing-extensions', version='1.0', filename='typing_extensions-1.0-py3-none-any.whl')])
        with self.assertRaises(C.CatalogueError):
            C.validate_lock(breaks_base, catalogue())  # base dists that need a newer typing-extensions now fail
        ok = lock(wheels=[wheel(requires=['torch>=2.0', 'numpy'])])
        C.validate_lock(ok, catalogue())

    def test_lock_must_name_the_exact_base_package_set(self):
        value = lock()
        value['base'] = dict(value['base'], inventory_sha256='e' * 64)
        with self.assertRaises(C.CatalogueError):
            C.validate_lock(value, catalogue())


class CriticRoundOneFixes(unittest.TestCase):
    def test_weights_are_fetched_with_the_download_image_not_the_order_image(self):
        source = (HERE / 'pod_runner.py').read_text()
        site = source.index('catalogue_runtime_supplement.build(provider, pod_id, job_dir, recipe, state)')
        self.assertIn("weights_image = state['runtime_supplement']['download_image']", source[site:site + 700])
        loop = source.index('"-c", WEIGHTS_SNIPPET, entry["repo"], entry["revision"], target]')
        self.assertIn('"--entrypoint", "python3", weights_image or image,', source[loop - 400:loop])
        self.assertEqual(source.count('weights_image = None'), 1)

    def test_preflight_decision_is_carried_into_every_attempt(self):
        source = (HERE / 'pod_runner.py').read_text()
        self.assertIn('catalogue_selected=catalogue_selected)', source)
        self.assertIn('if catalogue_selected or (job_dir is not None and catalogue_runtime_supplement.selected(job_dir)):', source)

    def test_no_order_supplement_claims_a_synthetic_catalogue_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp) / ORDER
            (job / 'trusted-runner').mkdir(parents=True)
            for image_id in catalogue()['images']:
                self.assertFalse(pod_runner._order_supplement_active(job, recipe(image_id)), image_id)
        import standardone_runtime_supplement as S
        self.assertTrue(pod_runner._order_supplement_active(
            Path('/home/flori/jobs/fastlane-evaluations') / S.ORDER, {'kind': 'http_typesafe', 'image': S.BASE_IMAGE}))

    def test_deeply_nested_request_is_a_refusal_not_a_crash(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp) / ORDER
            prep = job / 'runner-prepare' / 'trusted-runner'
            prep.mkdir(parents=True)
            (prep / C.REQUEST).write_text('[' * 200000)
            result = L.write_receipt(job, prep, fetch=FakePyPI({}), registry=Path(tmp) / 'reg.json')
            self.assertIn('refused', result)
            frozen = job / 'trusted-runner'
            frozen.mkdir()
            (frozen / C.LOCK).write_text('[' * 200000)
            with self.assertRaises(measurement_dispatch.OperationalHold):
                C.preflight(job, recipe())

    def test_symlinked_preparation_directory_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp) / ORDER
            other = Path(tmp) / 'other' / 'trusted-runner'
            other.mkdir(parents=True)
            (other / C.LOCK).write_text('{"frozen": "other order"}')
            (job / 'runner-prepare').mkdir(parents=True)
            (job / 'runner-prepare' / 'trusted-runner').symlink_to(other)
            with self.assertRaises(C.CatalogueError):
                L.write_receipt(job, job / 'runner-prepare' / 'trusted-runner', fetch=FakePyPI({}))
            self.assertTrue((other / C.LOCK).exists())

    def test_requirement_parser_has_no_catastrophic_backtracking(self):
        import time as _time
        env = L.marker_env(catalogue()['images'][IMAGE_ID])
        started = _time.monotonic()
        for n in (400, 2000, 20000):
            L.dependency_specs(['a' + ' ' * n + ')x', 'b' + '(' * n, 'c[' + 'x' * n], env)
        self.assertLess(_time.monotonic() - started, 1.0)
        self.assertEqual(L.dependency_specs(['foo (>=1.0,<2)', 'bar[x,y]>=3; python_version >= "3.8"',
                                             'baz @ https://x/y.whl', 'qux'], env),
                         {'foo': ['>=1.0,<2'], 'bar': ['>=3'], 'baz': ['<unparsed>'], 'qux': ['']})

    def test_marker_extra_and_compatible_release(self):
        env = L.marker_env(catalogue()['images'][IMAGE_ID])  # python 3.11
        self.assertTrue(L.marker_applies('extra != "dev"', env))
        self.assertFalse(L.marker_applies('extra == "dev"', env))
        self.assertFalse(L.marker_applies('python_version ~= "3.10.1"', env))
        self.assertTrue(L.marker_applies('python_version ~= "3.10"', env))
        self.assertTrue(L.marker_applies('"3.9" <= python_version', env))

    def test_registry_prunes_old_entries(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry = Path(tmp) / 'reg.json'
            data = C.canonical_json(lock())
            old = L.append_admission(ORDER, data, lock(), by='t', basis='b', registry=registry)
            value = json.loads(registry.read_text())
            value['entries'][0]['admitted_at'] = '2026-01-01T00:00:00Z'
            registry.write_text(json.dumps(value))
            os.chmod(registry, 0o600)
            L.append_admission(ORDER, data, lock(), by='t', basis='b', registry=registry)
            entries = C.load_registry(registry)['entries']
            self.assertEqual(len(entries), 1)
            self.assertNotEqual(entries[0]['admitted_at'], '2026-01-01T00:00:00Z')
            self.assertEqual(old['base_inventory_sha256'], C.inventory_sha256(catalogue()['images'][IMAGE_ID]))

    def test_resolver_budget_is_enforced(self):
        big = FakePyPI({'peft': pkg('peft', '0.21.2')})
        with patch.object(L, 'MAX_FETCHES', 0):
            with self.assertRaises(C.CatalogueError):
                L.resolve({'schema': 1, 'image_id': IMAGE_ID, 'requirements': ['peft==0.21.2']}, fetch=big)


class CommandLine(unittest.TestCase):
    def test_cli_is_installed_and_runs_from_the_installed_runtime(self):
        installer = (HERE / 'install-autopickup.sh').read_text()
        self.assertIn('install -m 755 "$SRC/fastlane-catalogue" "$BIN/fastlane-catalogue"', installer)
        loop = re.search(r'^for f in (.+?); do$', installer, re.M).group(1).split()
        for name in ('catalogue_runtime_supplement.py', 'catalogue_overlay_lock.py', 'runtime_catalogue.json'):
            self.assertIn(name, loop)
        self.assertIn('.local/share/priority-evaluation/runtime', (HERE / 'fastlane-catalogue').read_text())


if __name__ == '__main__':
    unittest.main()
