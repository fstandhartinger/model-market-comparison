"""Synthetic tests for repeat-order supplement admission (INCIDENTS #25 Part 2); no customer code runs.

Run: python3 -m unittest ops/priority-evaluation/test_supplement_admission.py -v
"""
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import autopickup
import lychee_runtime_supplement
import native_owner
import standardone_runtime_supplement
import supplement_admission as A
import torchcast_runtime_supplement

README = """# Demo

Some prose that changes with every version.

```bash
pip install "torch==2.9.1" --index-url https://download.pytorch.org/whl/cu128
pip install "transformers==5.8.1" accelerate \\
    ninja wheel
```
"""
SERVER = b'print("serve")\n'
REQS = b'transformers==5.12.1\n'
EVALS = Path('/home/flori/jobs/fastlane-evaluations')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(text):
    return sha(('\n'.join(A.pip_lines(text)) + '\n').encode())


FAMILIES = {
    'torchcast': {'module': 'torchcast_runtime_supplement', 'precedent': 'p' * 8, 'receipts': ('model', 'code'),
                  'files': {'model/pkg/server.py': sha(SERVER)},
                  'pip_lines': ('code/README.md', digest(README))},
    'lychee': {'module': 'lychee_runtime_supplement', 'precedent': 'q' * 8, 'receipts': ('model',),
               'files': {'model/requirements.txt': sha(REQS)}},
}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        patcher = patch.dict(A.FAMILIES, FAMILIES, clear=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.tmp.cleanup)

    def order(self, name='11111111-aaaa', model='https://huggingface.co/torchcast-ai/torchcast-decision-4b',
              code='https://github.com/Torchcast-AI/torchcast-decision-4b', readme=README, server=SERVER):
        job = self.root / name
        src = job / 'source'
        (src / 'model/pkg').mkdir(parents=True)
        (src / 'code').mkdir(parents=True)
        (src / 'model/pkg/server.py').write_bytes(server)
        (src / 'code/README.md').write_text(readme)
        for which, url in (('model', model), ('code', code)):
            if url:
                (src / f'FETCH-RECEIPT-{which}.json').write_text(json.dumps({'which': which, 'url': url}))
        return job

    def freeze(self, job):
        prep = job / 'runner-prepare' / 'trusted-runner'
        prep.mkdir(parents=True)
        (prep / 'RUNTIME.json').write_text('{}')
        (prep / 'MEASUREMENT-META.json').write_text('{}')
        record = A.write_receipt(job, prep)
        autopickup.freeze_runner_bundle(job)
        return record


class PipLines(unittest.TestCase):
    def test_continuations_and_whitespace_are_normalized(self):
        self.assertEqual(A.pip_lines(README), [
            'pip install "torch==2.9.1" --index-url https://download.pytorch.org/whl/cu128',
            'pip install "transformers==5.8.1" accelerate ninja wheel'])

    def test_prose_changes_keep_the_digest_and_install_changes_break_it(self):
        self.assertEqual(digest(README), digest(README.replace('Some prose', 'Brand new prose')))
        self.assertNotEqual(digest(README), digest(README.replace('5.8.1', '5.9.0')))
        self.assertNotEqual(digest(README), digest(README + '\npip install evil\n'))


class Evaluate(Base):
    def test_identical_stack_from_registered_repos_is_admitted(self):
        record = A.evaluate(self.order(), 'torchcast')
        self.assertEqual(record['family'], 'torchcast')
        self.assertEqual(record['precedent_order'], 'p' * 8)
        self.assertEqual(record['repositories'], {'model': 'huggingface.co/torchcast-ai/torchcast-decision-4b',
                                                  'code': 'github.com/torchcast-ai/torchcast-decision-4b'})
        self.assertIn('code/README.md#pip-install-lines', record['stack_sha256'])

    def test_changed_stack_file_is_not_admitted(self):
        self.assertIsNone(A.evaluate(self.order(server=b'print("x")\n'), 'torchcast'))
        self.assertIsNone(A.evaluate(self.order('2', readme=README.replace('5.8.1', '5.9.0')), 'torchcast'))

    def test_other_repository_is_not_admitted(self):
        self.assertIsNone(A.evaluate(self.order(model='https://huggingface.co/someone/fork'), 'torchcast'))
        self.assertIsNone(A.evaluate(self.order('2', code=None), 'torchcast'))

    def test_symlinked_stack_file_is_not_admitted(self):
        job = self.order()
        real = self.root / 'outside.py'
        real.write_bytes(SERVER)
        os.remove(job / 'source/model/pkg/server.py')
        os.symlink(real, job / 'source/model/pkg/server.py')
        self.assertIsNone(A.evaluate(job, 'torchcast'))

    def test_symlinked_directory_is_not_admitted(self):
        job = self.order()
        moved = self.root / 'pkg'
        (job / 'source/model/pkg').rename(moved)
        os.symlink(moved, job / 'source/model/pkg')
        self.assertIsNone(A.evaluate(job, 'torchcast'))

    def test_unknown_or_unregistered_family_is_never_admitted(self):
        self.assertIsNone(A.evaluate(self.order(), 'krino'))
        self.assertIsNone(A.evaluate(self.order('2'), 'lychee'))


class Receipt(Base):
    def test_receipt_is_frozen_and_admitted_only_while_files_match(self):
        job = self.order()
        self.assertIsNotNone(self.freeze(job))
        manifest = json.loads((job / 'trusted-runner/UPSTREAM-MANIFEST.json').read_text())
        self.assertIn(A.RECEIPT, manifest['files'])
        self.assertTrue(A.admitted(job, 'torchcast'))
        self.assertFalse(A.admitted(job, 'lychee'))
        (job / 'source/model/pkg/server.py').write_bytes(b'changed\n')
        self.assertFalse(A.admitted(job, 'torchcast'))

    def test_generator_written_receipt_is_removed_when_not_admitted(self):
        job = self.order(server=b'other\n')
        prep = job / 'runner-prepare' / 'trusted-runner'
        prep.mkdir(parents=True)
        (prep / A.RECEIPT).write_text('{"family": "torchcast"}')
        self.assertIsNone(A.write_receipt(job, prep))
        self.assertFalse((prep / A.RECEIPT).exists())

    def test_receipt_outside_the_frozen_manifest_is_rejected(self):
        job = self.order()
        self.freeze(job)
        receipt = job / 'trusted-runner' / A.RECEIPT
        receipt.write_text(receipt.read_text().replace('"schema_version": 1', '"schema_version": 1 '))
        self.assertFalse(A.admitted(job, 'torchcast'))

    def test_missing_receipt_is_not_admitted_even_with_identical_files(self):
        self.assertFalse(A.admitted(self.order(), 'torchcast'))


class SupplementActive(Base):
    def test_torchcast_active_accepts_an_admitted_repeat_on_the_exact_recipe(self):
        job = self.order()
        self.freeze(job)
        recipe = {'kind': 'http_typesafe', 'image': torchcast_runtime_supplement.BASE_IMAGE}
        self.assertTrue(torchcast_runtime_supplement.active(job, recipe))
        self.assertFalse(torchcast_runtime_supplement.active(job, dict(recipe, kind='python_inprocess')))
        self.assertFalse(torchcast_runtime_supplement.active(job, dict(recipe, image='pytorch/pytorch:latest')))
        self.assertFalse(lychee_runtime_supplement.active(
            job, {'kind': 'http_typesafe', 'image': lychee_runtime_supplement.BASE_IMAGE}))

    def test_listed_orders_still_work_without_a_receipt(self):
        recipe = {'kind': 'http_typesafe', 'image': standardone_runtime_supplement.BASE_IMAGE}
        self.assertTrue(standardone_runtime_supplement.active(self.root / standardone_runtime_supplement.ORDER,
                                                              recipe))
        self.assertFalse(standardone_runtime_supplement.active(self.root / 'unlisted', recipe))


class Registry(unittest.TestCase):
    def test_families_are_registered_supplements_with_a_family_constant(self):
        registry = {entry['family'] for entry in native_owner.SUPPLEMENTS}
        modules = {'standardone': standardone_runtime_supplement, 'lychee': lychee_runtime_supplement,
                   'torchcast': torchcast_runtime_supplement}
        self.assertEqual(set(A.FAMILIES), set(modules))
        for family, module in modules.items():
            self.assertIn(family, registry)
            self.assertEqual(module.FAMILY, family)
            self.assertEqual(A.FAMILIES[family]['module'], module.__name__)

    def test_installer_ships_the_module(self):
        install = (Path(__file__).resolve().parent / 'install-autopickup.sh').read_text()
        self.assertIn('supplement_admission.py', install)


@unittest.skipUnless(EVALS.is_dir(), 'real precedent orders exist only on Sandy')
class RealPrecedents(unittest.TestCase):
    """The pinned hashes match every reviewed order of each family (read-only, hashes only)."""

    def test_reviewed_orders_are_admitted_to_their_family(self):
        cases = {'standardone': ('a8731403', '3a081599'), 'lychee': ('a5d49ab5',),
                 'torchcast': ('529be5d5', '39e2266a', '9494e9ea')}
        for family, prefixes in cases.items():
            for prefix in prefixes:
                matches = [p for p in EVALS.glob(prefix + '-*') if p.is_dir()]
                if not matches:
                    continue
                with self.subTest(order=prefix):
                    self.assertEqual((A.find(matches[0]) or {}).get('family'), family)


if __name__ == '__main__':
    unittest.main()
