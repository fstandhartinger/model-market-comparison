"""First-party synthetic editable-package metadata; no ML/GPU/customer imports."""
import importlib.machinery
import importlib.metadata
import sys
import unittest
from unittest.mock import patch,MagicMock
import decisor_runtime_inspector as inspector

class EditableFinder:
 @classmethod
 def find_spec(cls,fullname,path=None,target=None):
  if fullname=='sglang':return importlib.machinery.ModuleSpec(fullname,None,origin=inspector.ROOT+'/__init__.py')

class Tests(unittest.TestCase):
 def inspect(self,kernel='0.4.7'):
  def version(name):
   if name=='sgl-kernel':raise importlib.metadata.PackageNotFoundError(name)
   if name=='sglang-kernel' and kernel is None:raise importlib.metadata.PackageNotFoundError(name)
   return {'sglang':'0.5.20','sglang-kernel':kernel}.get(name,'synthetic-version')
  file=MagicMock();file.__truediv__.side_effect=lambda _:file;file.is_symlink.return_value=False;file.is_file.return_value=True;file.read_bytes.return_value=b'synthetic-patch'
  with patch.object(inspector.metadata,'version',side_effect=version),patch.object(inspector,'Path',return_value=file):
   import hashlib
   with patch.object(inspector,'PATCHES',{'synthetic':hashlib.sha256(b'synthetic-patch').hexdigest()}):
    return inspector.inspect()
 def test_pinned_editable_package_is_resolved_without_import(self):
  self.assertNotIn('sglang',sys.modules)
  with patch.object(sys,'meta_path',[EditableFinder]+sys.meta_path),patch.object(sys,'path',[]):report=self.inspect()
  self.assertTrue(report['matching'],report['failures']);self.assertEqual(report['packages']['sglang-kernel'],'0.4.7');self.assertEqual(report['package_origin'],inspector.ROOT+'/__init__.py');self.assertNotIn('sglang',sys.modules)
 def test_wrong_kernel_version_refused(self):
  with patch.object(sys,'meta_path',[EditableFinder]+sys.meta_path):report=self.inspect(kernel='0.4.6')
  self.assertFalse(report['matching']);self.assertIn('SGLang kernel release differs',report['failures'])
 def test_missing_kernel_refused(self):
  with patch.object(sys,'meta_path',[EditableFinder]+sys.meta_path):report=self.inspect(kernel=None)
  self.assertFalse(report['matching']);self.assertIn('missing package: sglang-kernel',report['failures'])
if __name__=='__main__':unittest.main()
