import tempfile,unittest
from unittest.mock import patch,Mock
import dispatch,sandbox_runner

class DispatchTests(unittest.TestCase):
 def run_dispatch(self, exc=None):
  legacy=Mock(return_value='original result');prepare=Mock();measure=Mock()
  with tempfile.TemporaryDirectory() as d,patch.object(dispatch.safety,'launch_allowance',return_value={'organization':'system1models-org','allowance_usd':30,'pay_as_you_go':False,'observed_at':'x','cycle':'x','used_usd':0,'reserved_usd':0}),patch.object(dispatch,'choose_backend',return_value={'backend':'coreweave','reason':{'code':'eligible'}}),patch.object(dispatch.sandbox_runner,'run',side_effect=exc,return_value='sandbox result'):
   args=dict(recipe={'requested_max_liability_usd':1,'image':'image@sha256:'+'a'*64,'image_digest':'sha256:'+'a'*64,'max_lifetime_seconds':600},state={},equivalence={},job='test',receipt_dir=d,prepare=prepare,measure=measure,legacy=legacy)
   if isinstance(exc,(sandbox_runner.MeasurementInterrupted,sandbox_runner.CleanupUncertain)):
    with self.assertRaises(type(exc)):dispatch.evaluate(**args)
    legacy.assert_not_called()
   else:return dispatch.evaluate(**args),legacy
 def test_pre_dispatch_falls_back(self):
  result,legacy=self.run_dispatch(sandbox_runner.PreDispatchUnavailable());self.assertEqual(result,('lium','original result'));legacy.assert_called_once()
 def test_after_dispatch_never_falls_back(self):self.run_dispatch(sandbox_runner.MeasurementInterrupted())
 def test_cleanup_uncertain_never_falls_back(self):self.run_dispatch(sandbox_runner.CleanupUncertain())
 def test_success_returns_backend(self):
  result,legacy=self.run_dispatch();self.assertEqual(result,('coreweave','sandbox result'));legacy.assert_not_called()
class BindingTests(unittest.TestCase):
 def test_image_substitution_rejected(self):
  with self.assertRaises(ValueError):dispatch.evaluate(recipe={'image':'bad@sha256:'+'b'*64,'image_digest':'sha256:'+'a'*64},state={},equivalence={},job='x',receipt_dir='/tmp/unused-cw-test',prepare=None,measure=None,legacy=Mock())
 def test_understated_liability_rejected(self):
  with self.assertRaises(ValueError):dispatch.evaluate(recipe={'image':'ok@sha256:'+'a'*64,'image_digest':'sha256:'+'a'*64,'max_lifetime_seconds':600,'requested_max_liability_usd':.1},state={},equivalence={},job='x',receipt_dir='/tmp/unused-cw-test',prepare=None,measure=None,legacy=Mock())
 def test_existing_legacy_pin_refuses_new_measurement(self):
  with tempfile.TemporaryDirectory() as d,patch.object(dispatch.safety,'launch_allowance',side_effect=RuntimeError),patch.object(dispatch,'choose_backend',return_value={'backend':'lium','reason':{'code':'provider_pinned'}}):
   legacy=Mock()
   with self.assertRaises(sandbox_runner.MeasurementInterrupted):dispatch.evaluate(recipe={'image':'ok@sha256:'+'a'*64,'image_digest':'sha256:'+'a'*64,'max_lifetime_seconds':600,'requested_max_liability_usd':1},state={'started':True,'provider':'lium'},equivalence={},job='x',receipt_dir=d,prepare=None,measure=None,legacy=legacy)
   legacy.assert_not_called()
if __name__=='__main__':unittest.main()
