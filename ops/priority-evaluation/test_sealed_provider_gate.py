"""pod_runner.run never stages sealed inputs on an implicit or untrusted provider (lium-sealed-data-ban, 17 Oct 2026)."""
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import measurement_dispatch as md
import pod_runner as pr
import verda_provider


class SealedProviderGate(unittest.TestCase):
    def _run(self, provider):
        root = Path(tempfile.mkdtemp(prefix='sealed-gate-'))
        self.addCleanup(__import__('shutil').rmtree, root, True)
        job = root / 'job'
        (job / 'source').mkdir(parents=True)
        (job / 'source/FETCH-RECEIPT-model.json').write_text('{}')
        try:
            with mock.patch.object(pr, 'validate_recipe'), mock.patch.object(pr, 'PODS_DIR', root / 'pods'), \
                 mock.patch.object(pr, 'LiumProvider', side_effect=AssertionError('no implicit Lium')):
                return pr.run('9494e9ea-eeea-46e0-8fb1-41a045f41354', job, {'kind': 'http_typesafe'},
                              root / 'out', {'p': 1}, 20.0, provider=provider,
                              measurement_pins_factory=lambda: {'p': 1})
        finally:
            # The hold comes before any output dir, pod state file, reservation or rental.
            self.assertFalse((root / 'out').exists())
            self.assertFalse((root / 'pods').exists())

    def test_no_provider_holds(self):
        with self.assertRaisesRegex(md.OperationalHold, 'sealed_run_needs_trusted_provider'):
            self._run(None)

    def test_marketplace_providers_hold(self):
        for cls in (pr.LiumProvider, pr.RunPodProvider):
            with self.subTest(provider=cls.__name__), \
                 self.assertRaisesRegex(md.OperationalHold, 'sealed_run_needs_trusted_provider'):
                self._run(cls.__new__(cls))

    def test_untyped_truthy_flag_holds(self):
        with self.assertRaisesRegex(md.OperationalHold, 'sealed_run_needs_trusted_provider'):
            self._run(mock.Mock())  # a Mock attribute is truthy but not True

    def test_flags(self):
        self.assertFalse(pr.Provider.sealed_custody_ok)
        self.assertFalse(pr.LiumProvider.sealed_custody_ok)
        self.assertFalse(pr.RunPodProvider.sealed_custody_ok)
        self.assertIs(verda_provider.VerdaProvider.sealed_custody_ok, True)

    def test_no_default_provider_in_source(self):
        import inspect
        self.assertNotIn('provider or LiumProvider', inspect.getsource(pr.run))


if __name__ == '__main__':
    unittest.main()
