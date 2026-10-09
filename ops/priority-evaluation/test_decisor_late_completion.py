"""Synthetic boundaries only; no production/model calls."""
import io,json,unittest
from unittest.mock import patch
import decisor_late_completion as l
class Tests(unittest.TestCase):
 def row(self):return dict(l.EXPECTED,evaluation_status='starting')
 def test_exact(self):
  r=self.row();r['paid_at']='2026-10-06T11:43:46Z';l.row_check(r)
 def test_all_invariants(self):
  for k in l.EXPECTED:
   with self.subTest(k=k):
    r=self.row();r[k]='changed'
    with self.assertRaises((ValueError,TypeError)):l.row_check(r)
 def test_failed_not_retry(self):
  with self.assertRaises(ValueError):l.row_check(dict(self.row(),evaluation_status='failed'))
 def test_guard(self):
  class A:
   def sql_text(self,v):return "'"+v.replace("'","''")+"'"
  obj=object.__new__(l.LateCompletion);obj.controller=A();g=obj.sql_guard(('done',))
  for s in [l.ORDER,'result_url IS NULL','refund_status IS NULL',"evaluation_status IN ('done')"]:self.assertIn(s,g)
  self.assertNotIn('now()',g);self.assertNotIn('48 hours',g)
 def open(self,feed=None,page=None):
  f=feed or {'schema_version':1,'benchmark':'JevBench','revision':'v1.6.1','source':{'page':'/jev-models','artifact_sha256':'a'*64},'systems':[{'key':'other'}]}
  p=page or ('JevBench'+'x'*1200)
  return lambda req,timeout:io.BytesIO(json.dumps(f).encode() if '/api/' in req.full_url else p.encode())
 def test_public_absent(self):self.assertEqual(l.public_absent(self.open()),('v1.6.1','a'*64))
 def test_public_present_and_failure(self):
  with self.assertRaisesRegex(ValueError,'already public'):l.public_absent(self.open(page='JevBench decisor'+'x'*1200))
  def failed(*a,**k):raise OSError('offline')
  with self.assertRaises(OSError):l.public_absent(failed)
 def test_malformed(self):
  with self.assertRaises(ValueError):l.public_absent(self.open({'systems':[]}))
 def test_scope(self):
  with self.assertRaises(ValueError):l.LateCompletion('/tmp/foreign','g',object())
 def test_direct_measure_no_livecheck_before_provider(self):
  import v16_profiles as v
  with patch.object(v,'accepted',return_value=({'generation':'g'}, {}, {})),patch.object(v.pod_runner,'run') as provider,patch.object(l,'LateCompletion',side_effect=ValueError('missing late admission')) as check:
   with self.assertRaisesRegex(ValueError,'missing late admission'):v.measure('/tmp/'+l.ORDER)
   check.assert_called_once();provider.assert_not_called()
if __name__=='__main__':unittest.main()

class ControllerPlacementTests(unittest.TestCase):
 def test_late_branch_only_in_evaluate_before_legacy_gate(self):
  import ast
  from pathlib import Path
  tree=ast.parse(Path('autopickup.py').read_text())
  functions={n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
  evaluate=ast.get_source_segment(Path('autopickup.py').read_text(),functions['evaluate'])
  release=ast.get_source_segment(Path('autopickup.py').read_text(),functions['open_public_release_pr'])
  self.assertIn("'decisor_late_public_completion' in state",evaluate)
  self.assertLess(evaluate.index("'decisor_late_public_completion' in state"),evaluate.index('gate(rid)'))
  self.assertNotIn('decisor_late_public_completion',release)

class AdmissionTests(unittest.TestCase):
 def test_stale_installed_anchor_refuses_before_live_lookup(self):
  import tempfile
  from pathlib import Path
  with tempfile.TemporaryDirectory() as temp:
   job=Path(temp)/l.ORDER;(job/'review').mkdir(parents=True)
   (job/'review/DECISOR-LATE-COMPLETION-ADMISSION.json').write_text('{}')
   (job/'review/DECISOR-LATE-COMPLETION-REVIEW.json').write_text('{}')
   class A:
    def load_state(self,rid):return {'decisor_late_public_completion':{'verdict':'ACCEPTED','admission_sha256':'0'*64,'independent_review_sha256':'0'*64}}
   with patch.object(l,'public_absent') as public:
    with self.assertRaisesRegex(ValueError,'anchor'):l.LateCompletion(job,'g',A())
    public.assert_not_called()

class PipelineLiveChecks(unittest.TestCase):
 def test_callback_live_drift_stops_before_input_upload(self):
  import tempfile,contextlib
  from pathlib import Path
  import v16_profiles as v
  from types import SimpleNamespace
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);job=root/l.ORDER;(job/'trusted-runner').mkdir(parents=True)
   (job/'trusted-runner/POD-RECIPE.json').write_text('{"kind":"http_typesafe"}')
   state=root/'state';(state/'requests').mkdir(parents=True)
   (state/'requests'/(l.ORDER+'.json')).write_text('{"v16_generation_allocation":{}}')
   entry=SimpleNamespace(check=unittest.mock.Mock(side_effect=ValueError('late live row changed')))
   def fake_provider(*args,**kwargs):
    # Real runner enters this supplied guard before the sealed upload.
    with kwargs['pre_upload_gate']():self.fail('upload was allowed')
   with patch.object(v,'accepted',return_value=({'generation':'g'}, {}, {})),patch.object(v,'STATE_ROOT',state),patch.object(v,'retirement'),patch.object(v,'retirement_lock',return_value=contextlib.nullcontext()),patch.object(l,'LateCompletion',return_value=entry),patch('v16_allocation.FreshAllocation',return_value=object()),patch('decisor_runtime_preflight.callback',return_value=object()),patch.object(v.pod_runner,'run',side_effect=fake_provider):
    with self.assertRaisesRegex(ValueError,'live row changed'):v.measure(job)
    entry.check.assert_called_once()

class ResponseBounds(unittest.TestCase):
 def test_oversize_page_and_feed_refuse(self):
  for which in ['page','feed']:
   def opener(req,timeout):
    if (which=='feed' and '/api/' in req.full_url):return io.BytesIO(b'x'*(4*1024*1024+1))
    if (which=='page' and '/api/' not in req.full_url):return io.BytesIO(b'x'*(8*1024*1024+1))
    return Tests().open()(req,timeout)
   with self.assertRaisesRegex(ValueError,'exceeds bounded'):l.public_absent(opener)
 def test_phase_status_split(self):
  l.row_check(dict(l.EXPECTED,evaluation_status='starting'),('starting',))
  for status in ['starting','pending','done']:
   with self.assertRaises(ValueError):l.row_check(dict(l.EXPECTED,evaluation_status=status),('running',))

class EntryClaimTests(unittest.TestCase):
 def test_exclusive_entry_is_consumed_even_before_running_cas(self):
  import tempfile
  from pathlib import Path
  with tempfile.TemporaryDirectory() as temp:
   job=Path(temp)/l.ORDER;review=job/'review';review.mkdir(parents=True)
   (review/'DECISOR-LATE-COMPLETION-ADMISSION.json').write_text('{}')
   handoff=review/'decisor-late-handoff/g';handoff.mkdir(parents=True)
   obj=object.__new__(l.LateCompletion);obj.job=job;obj.generation='g';obj.check=unittest.mock.Mock(return_value={'references':{'handoff':{'sha256':'a'*64}}})
   obj.claim_entry();original=(handoff/'ENTRY-CLAIM.json').read_bytes()
   with self.assertRaises(FileExistsError):obj.claim_entry()
   self.assertEqual(original,(handoff/'ENTRY-CLAIM.json').read_bytes())
   self.assertEqual(json.loads(original)['order_id'],l.ORDER)
   obj.check.assert_called_with(('starting',))
