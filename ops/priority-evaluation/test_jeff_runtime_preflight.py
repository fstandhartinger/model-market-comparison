"""Synthetic same-pod metadata preflight; no actual container/pod/source/weights."""
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import jeff_runtime_preflight as preflight
import measurement_dispatch
import pod_runner as pr


class PreflightTests(unittest.TestCase):
    def setup_callback(self, root):
        recipe={'image':'upstream@sha256:'+preflight.IMAGE_DIGEST}
        admission={'runtime_preflight':dict(image=recipe['image'], inspector_sha256=preflight.sha(preflight.INSPECTOR),
                                            handler_sha256=preflight.sha(preflight.__file__))}
        return preflight.callback(root/preflight.ORDER,admission,recipe,Mock(),root/'out')

    def test_jeff_requires_exact_host_binding_before_any_rental(self):
        with self.assertRaises(ValueError):
            preflight.callback(Path('/job')/preflight.ORDER,{}, {'image':'unknown'},Mock(),Path('/unused'))
        self.assertIsNone(preflight.callback(Path('/job/other'),{}, {},Mock(),Path('/unused')))

    def test_mismatch_has_only_inspector_mount_and_retains_inventory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); commands=[]
            def execute(pod,cmd,timeout=600):
                commands.append(cmd)
                if cmd[0]=='nvidia-smi': return SimpleNamespace(stdout='H100, 81559, 580.95.05\n',stderr='',returncode=0)
                if cmd[0]=='sha256sum': return SimpleNamespace(stdout=preflight.sha(preflight.INSPECTOR)+' file',stderr='',returncode=0)
                return SimpleNamespace(stdout=json.dumps({'matching':False}),stderr='',returncode=2 if cmd[0]=='docker' else 0)
            provider=SimpleNamespace(exec=execute,scp_to=Mock())
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold,'mismatch'):
                self.setup_callback(root)(provider,'owned-pod')
            receipts=list((root/'out').glob('runtime-preflight-*.json'))
            self.assertEqual(len(receipts),1)
            report=json.loads(receipts[0].read_text())
            self.assertTrue(report['driver_ok']); self.assertEqual(report['exit_code'],2)
            command=commands[-1]
            self.assertIn('--read-only',command);self.assertIn('none',command)
            self.assertEqual(command[command.index('-v')+1],'/runtime-preflight/inspector.py:/inspector.py:ro')
            self.assertEqual(command.count('-v'),1); self.assertIn('-i',command); self.assertIn('-I',command)
            self.assertFalse(any('/models' in arg or '/code' in arg or '/input' in arg for arg in command))
            # Same owned pod + accepted metadata may not overwrite its evidence.
            original=receipts[0].read_bytes()
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold,'receipt_exists'):
                self.setup_callback(root)(provider,'owned-pod')
            self.assertEqual(receipts[0].read_bytes(),original)
            # A distinct attempt preserves the first pod's mismatch receipt.
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold,'mismatch'):
                self.setup_callback(root)(provider,'second-owned-pod')
            self.assertEqual(len(list((root/'out').glob('runtime-preflight-*.json'))),2)
            self.assertEqual(receipts[0].read_bytes(),original)

    def test_failed_hook_is_after_digest_and_before_weights_source_or_inputs(self):
        provider=SimpleNamespace(preflight=lambda *a:None,reserve=lambda *a:'reservation',
                                 create=lambda *a:{'pod_id':'synthetic','hourly_usd':1},attach=lambda *a:None,scp_to=Mock())
        commands=[]
        def execute(*args,**kwargs):
            commands.append(args[2]); return SimpleNamespace(stdout='sha256:abc')
        def stop(*args): raise measurement_dispatch.OperationalHold('jeff_runtime_preflight_mismatch')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);out=root/'out';out.mkdir();state={'request_id':preflight.ORDER}
            recipe={'kind':'http_typesafe','image':'upstream@sha256:abc','weights':[{'dir':'must-not-download'}]}
            with patch.object(pr,'_exec',side_effect=execute),patch.object(pr,'_teardown'):
                with self.assertRaises(measurement_dispatch.OperationalHold):
                    pr._lifecycle(provider,'job',recipe,root/'stage',out,state,('H100',80),.5,2.5,None,lambda:None,
                                  runtime_preflight=stop)
            self.assertEqual([cmd[:3] for cmd in commands],[['docker','pull','upstream@sha256:abc'],['docker','image','inspect']])
            provider.scp_to.assert_not_called();self.assertFalse(state['input_dispatched'])
            self.assertFalse(state['execution_started'])

if __name__=='__main__':unittest.main()
