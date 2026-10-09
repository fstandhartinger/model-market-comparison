"""Synthetic first-party metadata tests; no GPU/container/customer code or weights."""
import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
import decisor_runtime_preflight as preflight
import decisor_runtime_inspector as inspector
import decisor_native_preinput as native
import measurement_dispatch
import pod_runner as pr

class Tests(unittest.TestCase):
    def setup(self, root):
        job=root/preflight.ORDER; (job/'trusted-runner').mkdir(parents=True)
        runtime={'jevbench':dict(backend='gpu_pod',model='decisor-4b',credential='none',price_input_per_m=.08,price_output_per_m=.13)}
        (job/'trusted-runner/RUNTIME.json').write_text(json.dumps(runtime))
        recipe={'schema_version': 1, 'kind': 'http_typesafe', 'image': 'docker.io/underlabsai/decisor-sglang@sha256:60aee212ef25b0d303213b1c144b32f01403191b923d93d09a610770f8a6ad60', 'min_vram_gb': 80, 'model': 'decisor-4b', 'endpoint': 'http://127.0.0.1:8090', 'code': {'commit': '3fd3d9312bff8ec6eade08ba16ce8a6da793e99a', 'tree': '1f300dede1f6a215f4b8db1982841891947c3180'}, 'weights': [{'repo': 'underlabs/decisor-4b', 'revision': '1e7f195c2c41bbedec7d36b034001ef46476914f', 'dir': 'decisor-4b', 'sha256': {'model.safetensors': 'b7d1c312c3d1a62800f717ce12116433c8ee4df2be0013401e814b1db1b17e60'}}], 'services': [{'argv': ['python3', '-m', 'sglang.launch_server', '--model-path', '/models/decisor-4b', '--host', '127.0.0.1', '--port', '30000', '--mem-fraction-static', '0.80', '--cuda-graph-backend-prefill=disabled', '--disable-radix-cache'], 'env': {'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_HOME': '/tmp/hf', 'TRITON_CACHE_DIR': '/tmp/triton', 'SGLANG_DISABLE_USAGE_STATS': '1', 'DO_NOT_TRACK': '1'}, 'ready_url': 'http://127.0.0.1:30000/health'}, {'argv': ['python3', '/driver/decisor_shim.py'], 'env': {'DECISOR_ENGINE': 'http://127.0.0.1:30000', 'SHIM_PORT': '8090'}, 'ready_url': 'http://127.0.0.1:8090/health'}]}
        (job/'trusted-runner/POD-RECIPE.json').write_text(json.dumps(recipe))
        admission={'runtime_preflight':dict(image=recipe['image'],inspector_sha256=preflight.sha(preflight.INSPECTOR),handler_sha256=preflight.sha(preflight.__file__),recipe_sha256=preflight.sha(job/'trusted-runner/POD-RECIPE.json'),native_preinput=native.binding())}
        return job,recipe,admission
    def metadata(self, matching=True):
        return dict(schema_version=1,kind='decisor_metadata_and_patch_bytes_only',expected_image=preflight.IMAGE,packages={name:'0.5.20' if name=='sglang' else '0.4.7' if name=='sglang-kernel' else '1.0.0' for name in inspector.REQUIRED},package_origin=inspector.ROOT+'/__init__.py',patches=inspector.PATCHES.copy(),failures=[] if matching else ['synthetic'],matching=matching,customer_source_imported=False,inputs_or_weights_read=False,native_kernels_proven=False,runtime_admitted=False)

    def provider(self, matching=True, memory='80000',driver='580.95.05',digest=None):
        calls=[]
        def run(pod,cmd,timeout=600):
            calls.append((pod,cmd))
            out=''
            if cmd[0]=='nvidia-smi':out=f'RTX, {memory}, {driver}\n'
            elif cmd[:3]==['docker','image','inspect']:out=json.dumps([digest or 'underlabsai/decisor-sglang@sha256:'+preflight.IMAGE_DIGEST])
            elif cmd[0]=='sha256sum':out=preflight.sha(preflight.INSPECTOR)+' file'
            elif cmd[:2]==['docker','run']:out=json.dumps(self.metadata(matching))
            return SimpleNamespace(stdout=out,stderr='',returncode=0 if matching or cmd[:2]!=['docker','run'] else 2)
        return SimpleNamespace(exec=run,scp_to=Mock()),calls
    def test_required_only_exact_order_and_pins(self):
        self.assertIsNone(preflight.callback(Path('/other'),{}, {},Mock(),Path('/out')))
        with self.assertRaises(ValueError):preflight.callback(Path('/other'),{'runtime_preflight':{}},{},Mock(),Path('/out'))
        with tempfile.TemporaryDirectory() as t:
            job,r,a=self.setup(Path(t));a['runtime_preflight']['image']='foreign'
            with self.assertRaises(ValueError):preflight.callback(job,a,r,Mock(),Path(t)/'out')
    def test_missing_null_wrong_and_changed_binding_refuse(self):
        with tempfile.TemporaryDirectory() as t:
            job,r,a=self.setup(Path(t))
            for binding in [None,{},dict(a['runtime_preflight'],inspector_sha256='wrong'),dict(a['runtime_preflight'],handler_sha256='wrong'),dict(a['runtime_preflight'],recipe_sha256='wrong')]:
                with self.assertRaises(ValueError):preflight.callback(job,{'runtime_preflight':binding},r,Mock(),Path(t)/'out')
            cb=preflight.callback(job,a,r,Mock(),Path(t)/'out');a['runtime_preflight']['handler_sha256']='changed';provider,calls=self.provider()
            with self.assertRaises(ValueError):cb(provider,'owned')
            self.assertEqual(calls,[])

    def test_strict_metadata_schema_and_host_version_validation(self):
        self.assertTrue(preflight.metadata_matches(self.metadata()))
        for key,value in [('schema_version',True),('kind','stale'),('expected_image_identity','foreign'),('runtime_admitted',True),('failures',['error']),('python_headers',False)]:
            bad=self.metadata();bad[key]=value;self.assertFalse(preflight.metadata_matches(bad))
        self.assertFalse(preflight.metadata_matches({'metadata_requirements_satisfied':True}))
        bad=self.metadata();bad['packages']['sglang']='0.5.19';self.assertFalse(preflight.metadata_matches(bad))
        bad=self.metadata();bad['packages']['sglang-kernel']='0.4.6';self.assertFalse(preflight.metadata_matches(bad))
        bad=self.metadata();bad['packages']['sgl-kernel']=bad['packages'].pop('sglang-kernel');self.assertFalse(preflight.metadata_matches(bad))
        bad=self.metadata();bad['patches']['srt/models/qwen3_5_text.py']='bad';self.assertFalse(preflight.metadata_matches(bad))
        import ast
        module=ast.parse(Path(inspector.__file__).read_text());imports=[]
        for node in ast.walk(module):
            if isinstance(node,ast.Import):imports.extend(n.name.split('.')[0] for n in node.names)
            if isinstance(node,ast.ImportFrom):imports.append(node.module.split('.')[0])
        self.assertLessEqual(set(imports),{'hashlib','importlib','json','pathlib','sys'})

    def test_shape_refuses_runtime_algorithm_price_and_image_drift(self):
        with tempfile.TemporaryDirectory() as t:
            job,r,a=self.setup(Path(t))
            for key,value in [('image','foreign@sha256:'+preflight.IMAGE_DIGEST),('model','other'),('kind','python_inprocess')]:
                bad=copy.deepcopy(r);bad[key]=value
                with self.assertRaises(ValueError):preflight.callback(job,a,bad,Mock(),Path(t)/'out')
            bad=copy.deepcopy(r);bad['services'][0]['argv']+=['--quant','nf4']
            with self.assertRaises(ValueError):preflight.callback(job,a,bad,Mock(),Path(t)/'out')
            f=job/'trusted-runner/RUNTIME.json';x=json.loads(f.read_text());x['jevbench']['price_input_per_m']=0;f.write_text(json.dumps(x))
            with self.assertRaises(ValueError):preflight.callback(job,a,r,Mock(),Path(t)/'out')
    def test_same_pod_success_is_metadata_only_and_exclusive(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);job,r,a=self.setup(root);provider,calls=self.provider();recheck=Mock()
            cb=preflight.callback(job,a,r,recheck,root/'out');report=cb(provider,'owned-pod')
            self.assertTrue(report['driver_ok']);self.assertTrue(report['image_identity_matches']);self.assertEqual(recheck.call_count,2)
            self.assertTrue(all(pod=='owned-pod' for pod,_ in calls));cmd=calls[-1][1]
            self.assertEqual(cmd.count('-v'),1);self.assertIn('--read-only',cmd);self.assertIn('none',cmd);self.assertIn('-i',cmd);self.assertIn('-I',cmd)
            self.assertFalse(any('/models' in x or '/code' in x or '/input' in x for x in cmd))
            original=Path(report['receipt_path']).read_bytes()
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold,'receipt_exists'):cb(provider,'owned-pod')
            self.assertEqual(Path(report['receipt_path']).read_bytes(),original)
    def test_each_mismatch_is_retained_per_pod(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);job,r,a=self.setup(root);cb=preflight.callback(job,a,r,Mock(),root/'out')
            for index,kwargs in enumerate([{'matching':False},{'memory':'12000'},{'driver':'570.1'},{'memory':'inf'},{'digest':'foreign@sha256:bad'}]):
                provider,_=self.provider(**kwargs)
                with self.assertRaisesRegex(measurement_dispatch.OperationalHold,'mismatch'):cb(provider,str(index))
            files=list((root/'out').glob('runtime-preflight-*.json'));self.assertEqual(len(files),5)
            self.assertEqual(len(set(f.name for f in files)),5)
            for f in files:
                receipt=json.loads(f.read_text());self.assertIn('gpu_inventory',receipt);self.assertIn('image_inspect_stdout',receipt)
                self.assertEqual(f.stat().st_mode & 0o777,0o600)
            metadata_receipt=json.loads(next(f for f in files if json.loads(f.read_text())['pod_id']=='0').read_text())
            self.assertEqual(metadata_receipt['exit_code'],2);self.assertEqual(json.loads(metadata_receipt['stdout']),self.metadata(False));self.assertEqual(metadata_receipt['stderr'],'')
    def test_inventory_and_digest_boundaries_and_collection_failures(self):
        cases=[('79000','580',True),('78999','580',False),('80000','579',False),('nan','580',False)]
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);job,r,a=self.setup(root);cb=preflight.callback(job,a,r,Mock(),root/'out')
            for index,(mem,driver,good) in enumerate(cases):
                provider,_=self.provider(memory=mem,driver=driver)
                if good:self.assertTrue(cb(provider,'boundary'+str(index))['driver_ok'])
                else:
                    with self.assertRaises(measurement_dispatch.OperationalHold):cb(provider,'boundary'+str(index))
            for index,inventory in enumerate(['','broken','RTX,24576,580\nSmall,12000,580']):
                provider,calls=self.provider();base=provider.exec
                def execute(pod,cmd,timeout=600):
                    if cmd[0]=='nvidia-smi':return SimpleNamespace(stdout=inventory,stderr='inventory diagnostic',returncode=0)
                    return base(pod,cmd,timeout)
                provider.exec=execute
                with self.assertRaises(measurement_dispatch.OperationalHold):cb(provider,'malformed'+str(index))
                self.assertFalse(any(cmd[:2]==['docker','run'] for _,cmd in calls))
            for index,(body,code) in enumerate([('not json',0),(json.dumps(['underlabsai/decisor-sglang:latest']),0),(json.dumps(['underlabsai/decisor-sglang@sha256:'+preflight.IMAGE_DIGEST+'bad']),0),(json.dumps(['underlabsai/decisor-sglang@sha256:'+preflight.IMAGE_DIGEST]),1)]):
                provider,calls=self.provider();base=provider.exec
                def execute(pod,cmd,timeout=600):
                    if cmd[:3]==['docker','image','inspect']:return SimpleNamespace(stdout=body,stderr='image diagnostic',returncode=code)
                    return base(pod,cmd,timeout)
                provider.exec=execute
                with self.assertRaises(measurement_dispatch.OperationalHold):cb(provider,'image'+str(index))
                self.assertFalse(any(cmd[:2]==['docker','run'] for _,cmd in calls))
            provider,_=self.provider();provider.scp_to.side_effect=RuntimeError('synthetic transfer failure')
            with self.assertRaises(RuntimeError):cb(provider,'transfer-failure')
            receipt=next(json.loads(f.read_text()) for f in (root/'out').glob('*.json') if json.loads(f.read_text())['pod_id']=='transfer-failure')
            self.assertEqual(receipt['collection_error_type'],'RuntimeError');self.assertTrue(receipt['image_identity_matches']);self.assertIn('gpu_inventory',receipt)

    def test_real_missing_binding_refuses_v16_before_pod_run(self):
        import v16_profiles as profiles
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);job,r,a=self.setup(root);state_root=root/'state';(state_root/'requests').mkdir(parents=True);(state_root/'requests'/(preflight.ORDER+'.json')).write_text('{}')
            with patch.object(profiles,'STATE_ROOT',state_root),patch.object(profiles,'accepted',return_value=({'generation':'test'}, {}, {})),patch.object(profiles,'retirement'),patch.object(pr,'run') as run:
                with self.assertRaises(ValueError):profiles.measure(job)
                run.assert_not_called()

    def test_success_hook_saved_before_any_source_transfer(self):
        provider=SimpleNamespace(preflight=lambda *a:None,reserve=lambda *a:'r',create=lambda *a:{'pod_id':'synthetic','hourly_usd':1},attach=lambda *a:None,scp_to=Mock())
        snapshot=[];receipt={'pod_id':'synthetic','metadata':'synthetic'}
        def execute(*a,**k):
            if a[2][:2]==['mkdir','-p']:raise measurement_dispatch.OperationalHold('synthetic stop before staging')
            return SimpleNamespace(stdout='sha256:abc')
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);out=root/'out';out.mkdir();state={'request_id':preflight.ORDER};recipe={'kind':'http_typesafe','image':'upstream@sha256:abc','weights':[]}
            with patch.object(pr,'_exec',side_effect=execute),patch.object(pr,'_teardown'):
                with self.assertRaises(measurement_dispatch.OperationalHold):pr._lifecycle(provider,'job',recipe,root/'stage',out,state,('L4',24),.5,2.5,None,lambda:snapshot.append(copy.deepcopy(state)),runtime_preflight=lambda *a:receipt)
            self.assertTrue(any(s.get('runtime_preflight')==receipt for s in snapshot));self.assertFalse(state['input_dispatched']);provider.scp_to.assert_not_called()

    def test_recipe_mutation_and_runtime_change_refuse_before_commands(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);job,r,a=self.setup(root);cb=preflight.callback(job,a,r,Mock(),root/'out');provider,calls=self.provider()
            r['weights'][0]['revision']='changed'
            with self.assertRaises(ValueError):cb(provider,'owned')
            self.assertEqual(calls,[])
    def test_failed_hook_stops_lifecycle_before_weights_source_input(self):
        provider=SimpleNamespace(preflight=lambda *a:None,reserve=lambda *a:'r',create=lambda *a:{'pod_id':'synthetic','hourly_usd':1},attach=lambda *a:None,scp_to=Mock())
        commands=[]
        def execute(*a,**k):commands.append(a[2]);return SimpleNamespace(stdout='sha256:abc')
        def stop(*a):raise measurement_dispatch.OperationalHold('decisor_runtime_preflight_mismatch')
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);out=root/'out';out.mkdir();state={'request_id':preflight.ORDER};recipe={'kind':'http_typesafe','image':'upstream@sha256:abc','weights':[{'dir':'never'}]}
            with patch.object(pr,'_exec',side_effect=execute),patch.object(pr,'_teardown'):
                with self.assertRaises(measurement_dispatch.OperationalHold):pr._lifecycle(provider,'job',recipe,root/'stage',out,state,('L4',24),.5,2.5,None,lambda:None,runtime_preflight=stop)
            self.assertEqual(len(commands),2);provider.scp_to.assert_not_called();self.assertFalse(state['input_dispatched']);self.assertFalse(state['execution_started'])
    def test_inspector_verifies_real_synthetic_bytes_without_package_import(self):
        import hashlib
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);relative={'loader.py':b'loader','brp.py':b'guards'}
            for name,body in relative.items():(root/name).write_bytes(body)
            expected={n:hashlib.sha256(v).hexdigest() for n,v in relative.items()}
            def version(name):return '0.5.20' if name=='sglang' else '0.4.7' if name=='sglang-kernel' else 'synthetic-present'
            with patch.object(inspector,'ROOT',str(root)),patch.object(inspector,'PATCHES',expected),patch.object(inspector.metadata,'version',side_effect=version),patch.object(inspector,'find_spec',return_value=SimpleNamespace(origin=str(root/'__init__.py'))):
                self.assertTrue(inspector.inspect()['matching'])
                (root/'loader.py').write_bytes(b'changed')
                self.assertFalse(inspector.inspect()['matching'])
                (root/'loader.py').write_bytes(b'loader')
                with patch.object(inspector,'find_spec',return_value=SimpleNamespace(origin='/shadow/sglang/__init__.py')):
                    self.assertFalse(inspector.inspect()['matching'])
                with patch.object(inspector.metadata,'version',return_value='0.5.19'):
                    self.assertFalse(inspector.inspect()['matching'])

if __name__=='__main__':unittest.main()
