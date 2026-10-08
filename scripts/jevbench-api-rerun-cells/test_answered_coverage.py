import unittest
from types import SimpleNamespace as G
from answered_coverage import CoverageRegistry
class ExactPair(unittest.TestCase):
 def test_union_first_source_retains_failure_score_and_coverage(self):
  first=(G(oid='same',lang='hi'),{'score':0});second=(G(oid='same',lang='hi'),{'score':1})
  reg=CoverageRegistry();reg.bind([first],[{'task_id':'same','ok':False,'status_code':503}]);reg.bind([second],[{'task_id':'same','ok':True,'status_code':200}])
  union={'stable':first};result=reg.enrich({'hi':{'n':1,'competence':0}},list(union.values()),lambda g:g.lang)
  self.assertEqual(result['hi']['n'],1);self.assertEqual(result['hi']['competence'],0)
  self.assertEqual(result['hi']['coverage_n'],0);self.assertEqual(result['hi']['operational_failure_n'],1)
 def test_unsupported_earlier_record_does_not_shadow_selected_supported_pair(self):
  selected=(G(oid='later',lang='hi'),{'score':0})
  reg=CoverageRegistry();reg.bind([], [{'task_id':'early','ok':False,'status_code':503}]);reg.bind([selected],[{'task_id':'later','ok':False,'status_code':422}])
  cell=reg.enrich({'hi':{'n':1,'competence':0}},[selected],lambda g:g.lang)['hi']
  self.assertEqual(cell['coverage_n'],1);self.assertEqual(cell['refusal_n'],1)
 def test_missing_membership_and_counter_mismatch_fail_closed(self):
  selected=(G(oid='x',lang='hi'),{})
  reg=CoverageRegistry()
  with self.assertRaises(ValueError):reg.enrich({'hi':{'n':1}},[selected],lambda g:g.lang)
  reg.bind([selected],[{'task_id':'x','ok':True}])
  with self.assertRaises(ValueError):reg.enrich({'hi':{'n':2}},[selected],lambda g:g.lang)
if __name__=='__main__':unittest.main()
