"""pod_runner.run never stages sealed inputs on an implicit or untrusted provider (lium-sealed-data-ban, 17 Oct 2026)."""
import unittest
from unittest import mock

import measurement_dispatch as md
import pod_runner as pr
import verda_provider


class SealedProviderGate(unittest.TestCase):
    def _run(self, provider):
        with mock.patch.object(pr, 'validate_recipe'), \
             mock.patch.object(pr.measurement_dispatch, 'pins', return_value={'p': 1}), \
             mock.patch.object(pr, 'LiumProvider', side_effect=AssertionError('no implicit Lium')):
            return pr.run('9494e9ea-eeea-46e0-8fb1-41a045f41354', mock.MagicMock(), {'kind': 'http_typesafe'},
                          mock.MagicMock(), {'p': 1}, 20.0, provider=provider,
                          measurement_pins_factory=lambda: {'p': 1})

    def test_no_provider_holds(self):
        with mock.patch('json.loads', return_value={}):
            with self.assertRaisesRegex(md.OperationalHold, 'sealed_run_needs_trusted_provider'):
                self._run(None)

    def test_marketplace_providers_hold(self):
        for cls in (pr.LiumProvider, pr.RunPodProvider):
            with mock.patch('json.loads', return_value={}):
                with self.assertRaisesRegex(md.OperationalHold, 'sealed_run_needs_trusted_provider'):
                    self._run(cls.__new__(cls))

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
