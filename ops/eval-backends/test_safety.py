import importlib.util, pathlib, tempfile, unittest, json
from unittest.mock import patch
P=pathlib.Path(__file__).with_name('coreweave_gpu_safety.py')
spec=importlib.util.spec_from_file_location('cw',P);cw=importlib.util.module_from_spec(spec);spec.loader.exec_module(cw)
class SafetyTests(unittest.TestCase):
 def test_foreign_id_rejected_before_sdk(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'ledger';p.write_text('')
   with patch.object(cw,'LEDGER',p):
    with self.assertRaisesRegex(RuntimeError,'not centrally owned'):cw.sdk_terminate('foreign')
 def test_monthly_liability_survives_release(self):
  month=cw.dt.datetime.now(cw.dt.timezone.utc).strftime('%Y-%m')
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'ledger';p.write_text(json.dumps({'event':'reserve','provider':'coreweave','at':month+'-01','hourly_price_usd':5,'runtime_cap_seconds':360})+'\n'+json.dumps({'event':'release','provider':'coreweave'})+'\n')
   with patch.object(cw,'LEDGER',p):self.assertEqual(cw.reserved_month_usd(),.5)
 def test_allowance_margin(self):
  with patch.object(cw,'helper_call',return_value={'used_usd':26.5}),patch.object(cw,'reserved_month_usd',return_value=.25):
   with self.assertRaises(RuntimeError):cw.launch_allowance(.25)
   self.assertEqual(cw.launch_allowance(.1)['requested_usd'],.1)
 def test_disabled_inventory_never_calls_sdk(self):
  with tempfile.TemporaryDirectory() as d, patch.object(cw,'ENABLED',pathlib.Path(d)/'absent'),patch.object(cw,'helper_call',side_effect=AssertionError):self.assertEqual(cw.inventory(),[])
 def test_month_crossing_refused_before_api(self):
  real=cw.dt.datetime
  class MonthEnd(real):
   @classmethod
   def now(cls,tz=None):return cls(2026,10,31,23,59,45,tzinfo=cw.dt.timezone.utc)
  with patch.object(cw.dt,'datetime',MonthEnd),patch.object(cw,'helper_call') as api:
   with self.assertRaisesRegex(RuntimeError,'crosses allowance cycle'):cw.launch_allowance(.1)
   api.assert_not_called()
if __name__=='__main__':unittest.main()
