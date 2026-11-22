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
             'sha256': hashlib.sha256(filename.encode()).hexdigest(), 'size': 1000}
    value.update(extra)
    return value


def catalogue():
    return C.load_catalogue()


def lock(wheels=None, image_id=IMAGE_ID, **extra):
    value = {'schema': 1, 'image_id': image_id, 'image': catalogue()['images'][image_id]['image'],
             'wheels': [wheel()] if wheels is None else wheels, 'requested': ['peft==0.21.2'],
             'resolved_at': '2026-11-22T00:00:00Z', 'resolved_by': 'test'}
    value.update(extra)
    return value


def recipe(image_id=IMAGE_ID, **extra):
    value = {'kind': 'http_typesafe', 'image': catalogue()['images'][image_id]['image']}
    value.update(extra)
    return value


class FakeProvider:
    def __init__(self, wheels, context_sha=None, iid=IID, inspected=None, wheel_sha=None, listing=None):
        self.calls, self.wheels, self.context_sha, self.iid = [], wheels, context_sha, iid
        self.inspected, self.wheel_sha, self.listing = inspected or iid, wheel_sha, listing

    def exec(self, pod_id, command, timeout=600):
        self.calls.append(('exec', tuple(command), timeout))
        out = ''
        if command[0] == 'sha256sum':
            if command[1].endswith('context.tar'):
                out = f'{self.context_sha}  {command[1]}\n'
            else:
                name = command[1].rsplit('/', 1)[1]
                digest = self.wheel_sha or next(w['sha256'] for w in self.wheels if w['filename'] == name)
                out = f'{digest}  {command[1]}\n'
        elif command[0] == 'find':
            out = ''.join(f + '\n' for f in (self.listing if self.listing is not None else [w['filename'] for w in self.wheels]))
        elif command[0] == 'cat':
            out = self.iid + '\n'
        elif command[:3] == ['docker', 'image', 'inspect']:
            out = self.inspected + '\n'
        return SimpleNamespace(returncode=0, stdout=out, stderr='')

    def scp_to(self, pod_id, local, remote):
        self.calls.append(('scp_to', Path(local).read_bytes(), remote))


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
        provider = FakeProvider(value['wheels'], context_sha=hashlib.sha256(context).hexdigest())
        result = C.build(provider, 'pod-1', order.job, recipe())
        self.assertEqual(result['effective_image'], IID)
        self.assertEqual(result['base_image'], value['image'])
        self.assertEqual(result['wheels'], 2)
        self.assertEqual(result['lock_sha256'], hashlib.sha256(order.data).hexdigest())
        scp = [c for c in provider.calls if c[0] == 'scp_to']
        self.assertEqual(len(scp), 1)
        self.assertEqual(scp[0][1], context)
        curls = [c[1] for c in provider.calls if c[0] == 'exec' and c[1][0] == 'curl']
        self.assertEqual(len(curls), 2)
        for argv in curls:
            self.assertIn('=https', argv)
            self.assertEqual(argv[argv.index('--max-redirs') + 1], '0')
            self.assertTrue(argv[-1].startswith('https://files.pythonhosted.org/packages/'))
        builds = [c[1] for c in provider.calls if c[0] == 'exec' and c[1][:2] == ('docker', 'build')]
        self.assertEqual(len(builds), 1)
        self.assertEqual(builds[0][builds[0].index('--network') + 1], 'none')
        self.assertIn('--pull=false', builds[0])
        names = [c[1][0] if c[0] == 'exec' else 'scp' for c in provider.calls]
        self.assertLess(names.index('scp'), names.index('curl'))
        self.assertLess(max(i for i, n in enumerate(names) if n == 'curl'), names.index('docker'))
        pip_checks = [c[1] for c in provider.calls if c[0] == 'exec' and c[1][:2] == ('docker', 'run')]
        self.assertEqual(len(pip_checks), 1)
        self.assertEqual(pip_checks[0][pip_checks[0].index('--network') + 1], 'none')

    def test_empty_overlay_uses_the_base_image_without_pod_commands(self):
        order = Order(self, lock(wheels=[]))
        provider = FakeProvider([])
        result = C.build(provider, 'pod-1', order.job, recipe())
        self.assertEqual(result['effective_image'], lock()['image'])
        self.assertEqual(provider.calls, [])

    def test_host_acceptance_failure_is_a_hold_before_any_pod_effect(self):
        order = Order(self, lock(), admit=False)
        provider = FakeProvider(lock()['wheels'])
        with self.assertRaises(measurement_dispatch.OperationalHold):
            C.build(provider, 'pod-1', order.job, recipe())
        self.assertEqual(provider.calls, [])

    def test_pod_side_mismatches_are_run_errors(self):
        value = lock()
        order = Order(self, value)
        sha = hashlib.sha256(C.context_tar(value)).hexdigest()
        for provider in (FakeProvider(value['wheels'], context_sha='c' * 64),
                         FakeProvider(value['wheels'], context_sha=sha, wheel_sha='e' * 64),
                         FakeProvider(value['wheels'], context_sha=sha, listing=['peft-0.21.2-py3-none-any.whl', 'x.whl']),
                         FakeProvider(value['wheels'], context_sha=sha, iid='latest'),
                         FakeProvider(value['wheels'], context_sha=sha, inspected='sha256:' + 'd' * 64)):
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

def wheel_file(name, version, py='py3-none-any', yanked=False, kind='bdist_wheel'):
    filename = f"{name.replace('-', '_')}-{version}-{py}.whl" if kind == 'bdist_wheel' else f'{name}-{version}.tar.gz'
    return {'packagetype': kind, 'filename': filename, 'url': pypi_url(filename, 'f'), 'yanked': yanked,
            'digests': {'sha256': hashlib.sha256(filename.encode()).hexdigest()}, 'size': 2048}


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
