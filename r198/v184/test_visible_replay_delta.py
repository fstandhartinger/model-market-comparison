import copy,json,pathlib,unittest
from unittest.mock import patch
import check_visible_replay_delta as gate
W=pathlib.Path(__file__).resolve().parents[2];K='granite-switch-4.1-8b'
class VisibleReplayEquivalence(unittest.TestCase):
 def setUp(self):
  self.load=gate.L
  self.result=W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-results.json'
  self.cat=W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-categories.json'
  self.tf=W/'r198/v184/receipts/topfive-diff.json'
 def reject(self,path,edit):
  obj=copy.deepcopy(self.load(path));edit(obj)
  with patch.object(gate,'L',side_effect=lambda p:copy.deepcopy(obj) if p==path else self.load(p)):
   with self.assertRaises(AssertionError):gate.check(W)
 def test_positive(self):self.assertEqual(gate.check(W)['status'],'PASS')
 def test_unexpected_endpoint_edit(self):self.reject(self.result,lambda d:next(x for x in d['systems'] if x['key']==K).update(endpoint_condition='changed'))
 def test_original_disclosure_preserved(self):self.reject(self.result,lambda d:next(x for x in d['systems'] if x['key']==K).update(disclosure='changed'))
 def test_new_numeric_axis(self):self.reject(self.result,lambda d:next(x for x in d['systems'] if x['key']==K)['axes'].update(intelligence=99))
 def test_carried_non_numeric_field(self):self.reject(self.result,lambda d:d['systems'][0].update(display='changed'))
 def test_category_binding(self):self.reject(self.cat,lambda d:d.update(results_sha256='a'*64))
 def test_category_body(self):self.reject(self.cat,lambda d:d['systems'][K].update(languages={}))
 def test_comparison_outcomes(self):self.reject(self.tf,lambda d:d.update(changed_lists=1))
 def test_comparison_allowlist(self):self.reject(self.tf,lambda d:d['metadata_only_delta'].update(field='other.endpoint_condition'))
 def test_scoring_source_hash(self):
  original=gate.sha
  with patch.object(gate,'sha',side_effect=lambda p:'a'*64 if str(p).endswith('/src/scored.json') else original(p)):
   with self.assertRaises(AssertionError):gate.check(W)
if __name__=='__main__':unittest.main()
