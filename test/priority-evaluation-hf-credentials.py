import os
from pathlib import Path
import subprocess
import tempfile
import unittest

HELPER=Path(__file__).resolve().parents[1]/'ops/priority-evaluation/hf_git_credential.py'

class CredentialScope(unittest.TestCase):
 def test_scope_and_permissions(self):
  with tempfile.TemporaryDirectory() as directory:
   token=Path(directory)/'token'; token.write_text('hf_SYNTHETICFAKEONLY12345');token.chmod(0o600)
   env={'PATH':'/usr/bin:/bin','HF_CREDENTIAL_TOKEN_FILE':str(token),'HF_CREDENTIAL_REPOSITORY':'empiriolabsai/aplomb-1'}
   def run(body,op='get'):
    return subprocess.run(['/usr/bin/python3',str(HELPER),op],input=body,text=True,env=env,capture_output=True,check=True).stdout
   good='protocol=https\nhost=huggingface.co\npath=empiriolabsai/aplomb-1\n\n'
   self.assertIn('password=hf_SYNTHETICFAKEONLY12345',run(good))
   for body in [good.replace('https','http'),good.replace('huggingface.co','other.example'),good.replace('aplomb-1','different'),good.replace('huggingface.co','huggingface.co:443'),good.replace('path=','path=../')]:
    self.assertEqual(run(body),'')
   self.assertEqual(run(good,'store'),'');self.assertEqual(run(good,'erase'),'')
   env['HF_CREDENTIAL_REPOSITORY']='private/account-secret';self.assertEqual(run(good.replace('empiriolabsai/aplomb-1','private/account-secret')),'');env['HF_CREDENTIAL_REPOSITORY']='empiriolabsai/aplomb-1'
   token.chmod(0o644);self.assertEqual(run(good),'');token.chmod(0o600)
   alias=Path(directory)/'alias';alias.symlink_to(token);env['HF_CREDENTIAL_TOKEN_FILE']=str(alias);self.assertEqual(run(good),'')


# Parse only the trusted git function; importing the production controller could
# load pricing/DB dependencies. Every subprocess/network operation is inert here.
import ast
import re
import shlex
from types import SimpleNamespace
from unittest.mock import patch

class GitWiring(unittest.TestCase):
 def setUp(self):
  self.controller=HELPER.with_name('autopickup.py')
  tree=ast.parse(self.controller.read_text()); self.function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='git')
  self.calls=[]
  def run(argv,**kw):
   self.calls.append((argv,kw));return SimpleNamespace(returncode=0,stdout='inert',stderr='')
  self.ns={'Path':Path,'re':re,'shlex':shlex,'HOME':Path('/synthetic-home'),'__file__':str(self.controller),'HF_SOURCE_AUTH_REPOSITORIES':frozenset({'empiriolabsai/aplomb-1'}),'PickupError':ValueError,'GitFailure':ValueError,'MAX_SOURCE_PACK_BYTES':123,'resource':SimpleNamespace(RLIMIT_FSIZE=1,setrlimit=lambda *x:None),'subprocess':SimpleNamespace(run=run)}
  exec(compile(ast.Module(body=[self.function],type_ignores=[]),'trusted-git-function','exec'),self.ns)
 def test_only_scoped_network_operations(self):
  for command in ['ls-remote','fetch','checkout']:
   with patch.dict(os.environ,{'HF_TOKEN':'hf_SYNTHETICSECRETNOTFORWARD','OPENAI_API_KEY':'synthetic'}):
    self.ns['git'](Path('/synthetic-model'),command,'origin',hf_repository='empiriolabsai/aplomb-1')
   argv,kw=self.calls[-1];env=kw['env']
   self.assertNotIn('hf_SYNTHETICSECRETNOTFORWARD',str(argv)+str(env));self.assertNotIn('HF_TOKEN',env);self.assertNotIn('OPENAI_API_KEY',env)
   self.assertEqual(env['GIT_ALLOW_PROTOCOL'],'https');self.assertEqual(env['HOME'],'/nonexistent');self.assertEqual(env['HF_CREDENTIAL_REPOSITORY'],'empiriolabsai/aplomb-1')
   self.assertIn('http.followRedirects=false',argv);self.assertIn('credential.useHttpPath=true',argv)
   reset=argv.index('credential.helper=');helper=next(i for i,v in enumerate(argv) if v.startswith('credential.helper=!'))
   self.assertLess(reset,helper);self.assertIn('/usr/bin/python3 -I ',argv[helper]);self.assertIn('core.hooksPath=/dev/null',argv)
  for command in ['push','clone','commit','cat-file','config']:
   with self.assertRaises(ValueError):self.ns['git'](Path('/synthetic-model'),command,hf_repository='empiriolabsai/aplomb-1')
  with self.assertRaises(ValueError):self.ns['git'](Path('/synthetic-model'),'fetch',hf_repository='private/account-secret')
 def test_unapproved_repo_remains_anonymous(self):
  self.ns['git'](Path('/synthetic-model'),'fetch','origin')
  argv,kw=self.calls[-1];self.assertFalse(any(k.startswith('HF_') for k in kw['env']));self.assertFalse(any(v.startswith('credential.helper=!') for v in argv))
 def test_all_lazy_fetch_sites_scope_the_exact_repo(self):
  tree=ast.parse(self.controller.read_text());f=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='fetch_source');calls=[]
  for n in ast.walk(f):
   if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='git' and len(n.args)>1 and isinstance(n.args[1],ast.Constant) and n.args[1].value in ['ls-remote','fetch','checkout']:
    v=next(k.value for k in n.keywords if k.arg=='hf_repository');self.assertIsInstance(v,ast.IfExp);self.assertIn('HF_SOURCE_AUTH_REPOSITORIES',ast.unparse(v.test));self.assertIn('huggingface.co',ast.unparse(v.test));self.assertIsNone(v.orelse.value);calls.append(n.args[1].value)
  self.assertCountEqual(calls,['ls-remote','fetch','checkout'])
 def test_install_includes_private_helper(self):
  src=HELPER.with_name('install-autopickup.sh').read_text();self.assertIn('autopickup.py hf_git_credential.py refusal_approval.py',src);self.assertIn('install -m 600 "$SRC/$f" "$SHARE/runtime/$f"',src)

if __name__=='__main__':unittest.main()
