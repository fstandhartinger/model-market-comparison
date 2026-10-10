"""Pure prospective Source contract tests; no custody, body reads, scoring, effects or receipts."""
import importlib.util,unittest
from pathlib import Path
SOURCE=Path(__file__).resolve().parents[1]/'ops/jevbench-v163/source/cohort.py'
spec=importlib.util.spec_from_file_location('prospective_cohort',SOURCE)
cohort=importlib.util.module_from_spec(spec);spec.loader.exec_module(cohort)
class Tests(unittest.TestCase):
 def test_decisor_five_accepts_exact_four_native_one_wrapper_pending_ryo(self):
  shape=cohort.completed_shape(cohort.BASE|{'decisor_4b'})
  self.assertEqual(shape['eligible'],sorted(cohort.NATIVE));self.assertEqual(shape['wrappers'],['metask_jev_rain_12b']);self.assertEqual(shape['pending'],['ryotide_qwen9'])
 def test_all_six_accepts_four_native_two_wrappers(self):
  shape=cohort.completed_shape(cohort.FIXED)
  self.assertEqual(shape['eligible'],sorted(cohort.NATIVE));self.assertEqual(shape['wrappers'],sorted(cohort.WRAPPERS));self.assertEqual(shape['pending'],[])
 def test_ryo_only_five_refuses(self):
  with self.assertRaises(ValueError):cohort.completed_shape(cohort.BASE|{'ryotide_qwen9'})
 def test_duplicates_refuse_even_when_unique_set_is_allowed(self):
  for allowed in (cohort.BASE|{'decisor_4b'},cohort.FIXED):
   with self.subTest(allowed=allowed),self.assertRaises(ValueError):cohort.completed_shape([*allowed,'jeff_1_0_large'])
 def test_arbitrary_subset_foreign_and_base_alone_refuse(self):
  for keys in (cohort.BASE,cohort.NATIVE,cohort.FIXED-{'wald-4b-v2'},cohort.FIXED|{'foreign'},[]):
   with self.subTest(keys=keys),self.assertRaises(ValueError):cohort.completed_shape(keys)
if __name__=='__main__':unittest.main()
