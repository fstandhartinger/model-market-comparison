"""Pure tests for the bounded Lium allocator using inert stub SDK/CLI modules."""
import importlib.util
import math
import sys
import types
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name('lium_bounded_up.py')
STUB_NAMES = ('lium', 'lium.sdk', 'lium.sdk.client', 'lium.cli', 'lium.cli.cli')
RENT_BY_SPEC = 'rent-by-spec'


def load_module():
    spec = importlib.util.spec_from_file_location('lium_bounded_up_under_test', MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TrackingModule(types.ModuleType):
    """Module whose exported names are only reachable through a recorded lookup."""

    def __init__(self, name, exports, accessed):
        super().__init__(name)
        self._exports = exports
        self._accessed = accessed

    def __getattr__(self, attr):
        exports = self.__dict__.get('_exports', {})
        if attr in exports:
            self.__dict__['_accessed'].append((self.__name__, attr))
            return exports[attr]
        raise AttributeError(attr)


class StubSdk(unittest.TestCase):
    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUB_NAMES}
        self.accessed = []
        self.original_calls = []
        self.cli_calls = []
        test = self

        def original_rent(client, *args, **kwargs):
            test.original_calls.append((args, kwargs))
            return {'rented': kwargs}

        def original_up(*args, **kwargs):
            raise AssertionError('original legacy up must never be reachable')

        class Lium:
            rent = original_rent
            up = original_up

            def supports(self, feature):
                return feature == RENT_BY_SPEC

        self.Lium = Lium
        self.original_rent = original_rent
        self.original_up = original_up

        class Cli:
            def main(self, args=None, prog_name=None):
                test.cli_calls.append((list(args), prog_name))
                test.cli_rent_result = Lium().rent(gpu_type=args[2], gpu_count=int(args[4]))
                with test.assertRaises(ValueError):
                    Lium().up(gpu='RTX5090')

        root = types.ModuleType('lium')
        cli_pkg = types.ModuleType('lium.cli')
        sys.modules['lium'] = root
        sys.modules['lium.cli'] = cli_pkg
        sys.modules['lium.sdk'] = TrackingModule('lium.sdk', {'Lium': Lium}, self.accessed)
        sys.modules['lium.sdk.client'] = TrackingModule(
            'lium.sdk.client', {'RENT_BY_SPEC': RENT_BY_SPEC}, self.accessed)
        sys.modules['lium.cli.cli'] = TrackingModule('lium.cli.cli', {'cli': Cli()}, self.accessed)
        self.module = load_module()

    def tearDown(self):
        for name, value in self.saved.items():
            if value is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = value


class MainTests(StubSdk):
    def test_rtx5090_reaches_cli_with_enforced_per_gpu_cap(self):
        self.module.main(['RTX5090', '2', '1.5', '12.5', '4'])
        self.assertEqual(self.cli_calls, [([
            'up', '--gpu', 'RTX5090', '-c', '2', '--ttl', '1.5h',
            '--budget', '12.50', '-y', '--json'], 'lium')])
        self.assertEqual(len(self.original_calls), 1)
        args, kwargs = self.original_calls[0]
        self.assertEqual(args, ())
        self.assertEqual(kwargs, {'gpu_type': 'RTX5090', 'gpu_count': 2, 'max_price_per_gpu_hour': 2.0})
        self.assertIsNot(self.Lium.rent, self.original_rent)
        self.assertIsNot(self.Lium.up, self.original_up)

    def test_existing_gpus_still_accepted(self):
        for gpu in ('H100', 'A100', 'L40S', 'RTX6000', 'RTXPRO6000'):
            self.Lium.rent, self.Lium.up = self.original_rent, self.original_up
            self.module.main([gpu, '1', '3', '20', '5'])
        self.assertEqual([call[0][2] for call in self.cli_calls],
                         ['H100', 'A100', 'L40S', 'RTX6000', 'RTXPRO6000'])
        self.assertTrue(all(k['max_price_per_gpu_hour'] == 5.0 for _, k in self.original_calls))

    def test_invalid_parameters_reject_before_sdk_or_cli(self):
        cases = [
            [],
            ['RTX5090', '1', '1', '10'],
            ['RTX5090', '1', '1', '10', '4', 'extra'],
            ['RTX5090', 'x', '1', '10', '4'],
            ['RTX5090', '1.5', '1', '10', '4'],
            ['RTX5090', '0', '1', '10', '4'],
            ['RTX5090', '3', '1', '10', '4'],
            ['RTX5090', '1', '0', '10', '4'],
            ['RTX5090', '1', '-1', '10', '4'],
            ['RTX5090', '1', '3.01', '10', '4'],
            ['RTX5090', '1', 'nan', '10', '4'],
            ['RTX5090', '1', 'inf', '10', '4'],
            ['RTX5090', '1', '1', '0', '4'],
            ['RTX5090', '1', '1', '20.01', '4'],
            ['RTX5090', '1', '1', 'nan', '4'],
            ['RTX5090', '1', '1', 'inf', '4'],
            ['RTX5090', '1', '1', '10', '0'],
            ['RTX5090', '1', '1', '10', '5.01'],
            ['RTX5090', '1', '1', '10', 'nan'],
            ['RTX5090', '1', '1', '10', 'inf'],
            ['RTX5090', '1', '1', '10', 'abc'],
            ['RTX4090', '1', '1', '10', '4'],
            ['rtx5090', '1', '1', '10', '4'],
            ['RTX 5090', '1', '1', '10', '4'],
            ['H200', '1', '1', '10', '4'],
            ['', '1', '1', '10', '4'],
        ]
        for argv in cases:
            with self.subTest(argv=argv):
                with self.assertRaises((ValueError, TypeError)):
                    self.module.main(argv)
        self.assertEqual(self.accessed, [])
        self.assertEqual(self.cli_calls, [])
        self.assertEqual(self.original_calls, [])
        self.assertIs(self.Lium.rent, self.original_rent)
        self.assertIs(self.Lium.up, self.original_up)

    def test_non_string_arguments_reject_before_sdk_or_cli(self):
        for argv in (['RTX5090', None, '1', '10', '4'], ['RTX5090', '1', None, '10', '4'],
                     ['RTX5090', '1', '1', [], '4'], ['RTX5090', '1', '1', '10', {}]):
            with self.subTest(argv=argv), self.assertRaises((ValueError, TypeError)):
                self.module.main(argv)
        self.assertEqual((self.accessed, self.cli_calls), ([], []))


class BoundedRentTests(StubSdk):
    def rent(self, maximum=4.0, gpu='RTX5090', count=2):
        return self.module.bounded_rent(self.original_rent, maximum, gpu, count)

    def test_identity_must_match(self):
        rent = self.rent()
        client = self.Lium()
        for args, kwargs in [
            (('x',), {'gpu_type': 'RTX5090', 'gpu_count': 2}),
            ((), {'gpu_type': 'H100', 'gpu_count': 2}),
            ((), {'gpu_count': 2}),
            ((), {'gpu_type': 'RTX5090', 'gpu_count': 1}),
            ((), {'gpu_type': 'RTX5090'}),
        ]:
            with self.subTest(args=args, kwargs=kwargs), self.assertRaises(ValueError):
                rent(client, *args, **kwargs)
        self.assertEqual(self.original_calls, [])

    def test_feature_must_be_supported(self):
        class OldClient:
            def supports(self, feature):
                return False
        with self.assertRaises(ValueError):
            self.rent()(OldClient(), gpu_type='RTX5090', gpu_count=2)
        self.assertEqual(self.original_calls, [])

    def test_single_gpu_default_count(self):
        self.rent(maximum=3.0, count=1)(self.Lium(), gpu_type='RTX5090')
        self.assertEqual(self.original_calls[0][1]['max_price_per_gpu_hour'], 3.0)

    def test_weaker_existing_cap_is_preserved_and_looser_is_clamped(self):
        rent = self.rent()
        rent(self.Lium(), gpu_type='RTX5090', gpu_count=2, max_price_per_gpu_hour=0.75)
        rent(self.Lium(), gpu_type='RTX5090', gpu_count=2, max_price_per_gpu_hour=9)
        self.assertEqual([k['max_price_per_gpu_hour'] for _, k in self.original_calls], [0.75, 2.0])

    def test_invalid_existing_cap_rejected(self):
        rent = self.rent()
        for bad in (True, '1', 0, -1, math.nan, math.inf):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                rent(self.Lium(), gpu_type='RTX5090', gpu_count=2, max_price_per_gpu_hour=bad)
        self.assertEqual(self.original_calls, [])


if __name__ == '__main__':
    unittest.main()
