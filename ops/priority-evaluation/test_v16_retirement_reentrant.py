"""Actual canonical context, isolated metadata/locks; no sealed/provider work."""
import fcntl,os,subprocess,sys,tempfile,threading,unittest
from pathlib import Path
from unittest.mock import patch
import v16_profiles as v
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.tool=self.root/'rotation.py';self.tool.write_text('# isolated canonical source fixture')
  p=patch.object(v,'ROTATION_TOOL',self.tool);p.start();self.addCleanup(p.stop)
 def try_foreign_process(self):
  return subprocess.run([sys.executable,'-I','-B','-c',"import fcntl,sys;f=open(sys.argv[1],'a');fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)",str(self.root/'.lock')],capture_output=True,timeout=5).returncode
 def test_real_nested_check_preserves_fd_and_exclusion(self):
  checks=[]
  def checked(admission):checks.append(admission['stage'])
  with patch.object(v,'_retirement_unlocked',side_effect=checked):
   with v.retirement_lock({'stage':'outer'}):
    fd=v._RETIREMENT_CUSTODY.held['fd'];self.assertNotEqual(self.try_foreign_process(),0)
    with v.retirement_lock({'stage':'inner'}):
     self.assertEqual(v._RETIREMENT_CUSTODY.held['fd'],fd);self.assertEqual(v._RETIREMENT_CUSTODY.held['depth'],2)
     v.retirement({'stage':'native-check'})
    self.assertEqual(v._RETIREMENT_CUSTODY.held['depth'],1);self.assertNotEqual(self.try_foreign_process(),0)
  self.assertEqual(checks,['outer','inner','native-check']);self.assertEqual(self.try_foreign_process(),0);self.assertFalse(hasattr(v._RETIREMENT_CUSTODY,'held'))
 def test_other_thread_blocks_until_outer_exit(self):
  attempting=threading.Event();entered=threading.Event();errors=[]
  def worker():
   try:
    attempting.set()
    with v.retirement_lock({'stage':'foreign'}):entered.set()
   except BaseException as exc:errors.append(exc)
  with patch.object(v,'_retirement_unlocked'):
   with v.retirement_lock({'stage':'outer'}):
    t=threading.Thread(target=worker);t.start();self.assertTrue(attempting.wait(1));self.assertFalse(entered.wait(.08))
   t.join(2);self.assertFalse(t.is_alive());self.assertTrue(entered.is_set());self.assertEqual(errors,[])
 def test_nested_check_and_body_exceptions_cleanup(self):
  for stage in ('check','body','outer-check'):
   calls=[]
   def checked(admission):
    calls.append(admission)
    if stage=='outer-check' or stage=='check'and len(calls)==2:raise ValueError('fresh retirement refused')
   with patch.object(v,'_retirement_unlocked',side_effect=checked):
    with self.assertRaises(ValueError):
     with v.retirement_lock({}):
      with v.retirement_lock({}):raise ValueError('body failed')
   self.assertFalse(hasattr(v._RETIREMENT_CUSTODY,'held'));self.assertEqual(self.try_foreign_process(),0)
 def test_changed_canonical_lock_refused_without_nested_exemption(self):
  with patch.object(v,'_retirement_unlocked')as checked:
   with v.retirement_lock({}):
    old=self.root/'.lock';old.rename(self.root/'old.lock');old.touch()
    with self.assertRaisesRegex(ValueError,'custody changed'):
     with v.retirement_lock({}):self.fail('changed inode admitted')
    self.assertEqual(checked.call_count,1)
  self.assertFalse(hasattr(v._RETIREMENT_CUSTODY,'held'))
