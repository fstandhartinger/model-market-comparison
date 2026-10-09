"""Synthetic first-party metadata tests; no GPU/container/customer code or weights."""
import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
import ryotide_runtime_preflight as preflight
import ryotide_runtime_inspector as inspector
import measurement_dispatch
import pod_runner as pr

class Tests(unittest.TestCase):
    def setup(self, root):
        job=root/preflight.ORDER; (job/'trusted-runner').mkdir(parents=True)
        runtime={'jevbench':dict(backend='gpu_pod',model='RYOTIDE-Qwen9',credential='none',price_input_per_m=.08,price_output_per_m=.13)}
        (job/'trusted-runner/RUNTIME.json').write_text(json.dumps(runtime))
        recipe={'schema_version': 1, 'kind': 'http_typesafe', 'image': 'vllm/vllm-openai:v0.30.0@sha256:8a69ffad015f138d7170c4ddc429e230a3bc1c1719f67e14324749df200a4b90', 'min_vram_gb': 24, 'weights': [{'repo': 'Qwen/Qwen3.5-9B', 'revision': 'c202236235762e1c871ad0ccb60c8ee5ba337b9a', 'dir': 'Qwen3.5-9B', 'sha256': {'.gitattributes': '34448b82c17d60fec9b65b1f093c115ddbaadc04beb1b0140b6bfed2e012a930', 'LICENSE': 'bbedc3fda3305820b977265f01b8619d87570a6739de3a5582c3464840f1e57a', 'README.md': 'c5f5a8c2dddab69cfbf05279235aa5fddb137939a06539c4c7637aa900fef6d0', 'chat_template.jinja': 'a4aee8afcf2e0711942cf848899be66016f8d14a889ff9ede07bca099c28f715', 'config.json': 'd0883072e01861ed0b2d47be3c16c36a8e81c224c7ffaa310c6558fb3f932b05', 'merges.txt': 'a9d356d7bdf1ef4949e3e748e95b8e10ad9d4e2e838eddc38a0a7b6b94d1db8d', 'model.safetensors-00001-of-00004.safetensors': 'db6f444b43d318c92f360a13a25561a6a65b10c0631b8ed305a426dbaa6c380e', 'model.safetensors-00002-of-00004.safetensors': '31c7d7e2dd5d207840b31cc59083c8f4c4718959149e0358c0364052bb9a0330', 'model.safetensors-00003-of-00004.safetensors': '7ec36ba3a4176a44c3c0876ad80c56a2f70c84bf008d82e9501df642f17dadec', 'model.safetensors-00004-of-00004.safetensors': 'b62b0c4cd7e44edee103ee8f4fe225f246d5e768e07bfd5f25b63a8aa1fdd0c6', 'model.safetensors.index.json': '26d3539b516be613f39563617cb9d33b3f83d401298125be392c80cefb8f7fe5', 'preprocessor_config.json': '27225450ac9c6529872ee1924fcb0962ff5634834f817040f444118116f4e516', 'tokenizer.json': '5f9e4d4901a92b997e463c1f46055088b6cca5ca61a6522d1b9f64c4bb81cb42', 'tokenizer_config.json': '316230d6a809701f4db5ea8f8fc862bc3a6f3229c937c174e674ff3ca0a64ac8', 'video_preprocessor_config.json': '7768af27c1fafa9cc9011c1dc20067e03f8915e03b63504550e11d5066986d13', 'vocab.json': 'ce99b4cb2983d118806ce0a8b777a35b093e2000a503ebde25853284c9dfa003'}}], 'code': {'commit': '94c71a3d9f044ffaba87981e985b66f47de3be80', 'tree': '5a1dc97a682239b32397c4200e9deb41b17371a1'}, 'services': [{'argv': ['python3', '-m', 'ryotide.server', '--preset', 'ryotide-qwen9', '--model', '/models/Qwen3.5-9B', '--device', 'cuda', '--host', '127.0.0.1', '--port', '8778'], 'env': {'PYTHONPATH': '/code/src:/code/vendor/jevbench', 'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_HUB_DISABLE_TELEMETRY': '1', 'TOKENIZERS_PARALLELISM': 'false'}, 'ready_url': 'http://127.0.0.1:8778/health'}], 'endpoint': 'http://127.0.0.1:8778', 'model': 'RYOTIDE-Qwen9'}
        (job/'trusted-runner/POD-RECIPE.json').write_text(json.dumps(recipe))
        admission={'runtime_preflight':dict(image=recipe['image'],inspector_sha256=preflight.sha(preflight.INSPECTOR),handler_sha256=preflight.sha(preflight.__file__),recipe_sha256=preflight.sha(job/'trusted-runner/POD-RECIPE.json'))}
        return job,recipe,admission
    def metadata(self, matching=True):
        versions={'torch':'2.13.0+cu130','transformers':'5.17.0','flash-linear-attention':'0.5.2','fla-core':'0.5.2','triton':'3.7.0'}
        return dict(schema_version=1,kind='upstream_metadata_only',expected_image_identity=preflight.IMAGE,
                    image_identity_proven=False,python='3.12.4',packages={name:dict(version=versions.get(name,'1.0.0'),requires_dist=[]) for name in inspector.REQUIRED},gcc_path='/usr/bin/gcc',standard_c_headers=['/usr/include/stdio.h'],python_headers=True,credential_variable_names_present=[],metadata_requirements_satisfied=matching,failures=[] if matching else ['synthetic'],customer_source_imported=False,model_loaded=False,native_kernels_proven=False,runtime_admitted=False,next_gate='root')

    def provider(self, matching=True, memory='24576',driver='580.95.05',digest=None):
        calls=[]
        def run(pod,cmd,timeout=600):
            calls.append((pod,cmd))
            out=''
            if cmd[0]=='nvidia-smi':out=f'RTX, {memory}, {driver}\n'
            elif cmd[:3]==['docker','image','inspect']:out=json.dumps([digest or 'vllm/vllm-openai@sha256:'+preflight.IMAGE_DIGEST])
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
        bad=self.metadata();bad['packages']['torch']['version']='2.7.0';self.assertFalse(preflight.metadata_matches(bad))
        bad=self.metadata();bad['packages']['fla-core']['version']='0.4.0';self.assertFalse(preflight.metadata_matches(bad))
        import ast
        module=ast.parse(Path(inspector.__file__).read_text());imports=[]
        for node in ast.walk(module):
            if isinstance(node,ast.Import):imports.extend(n.name.split('.')[0] for n in node.names)
            if isinstance(node,ast.ImportFrom):imports.append(node.module.split('.')[0])
        self.assertLessEqual(set(imports),{'importlib','json','os','pathlib','re','shutil','sys','sysconfig'})

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
        cases=[('23000','580',True),('22999','580',False),('24000','579',False),('nan','580',False)]
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
            for index,(body,code) in enumerate([('not json',0),(json.dumps(['vllm/vllm-openai:latest']),0),(json.dumps(['vllm/vllm-openai@sha256:'+preflight.IMAGE_DIGEST+'bad']),0),(json.dumps(['vllm/vllm-openai@sha256:'+preflight.IMAGE_DIGEST]),1)]):
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
        def stop(*a):raise measurement_dispatch.OperationalHold('ryotide_runtime_preflight_mismatch')
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);out=root/'out';out.mkdir();state={'request_id':preflight.ORDER};recipe={'kind':'http_typesafe','image':'upstream@sha256:abc','weights':[{'dir':'never'}]}
            with patch.object(pr,'_exec',side_effect=execute),patch.object(pr,'_teardown'):
                with self.assertRaises(measurement_dispatch.OperationalHold):pr._lifecycle(provider,'job',recipe,root/'stage',out,state,('L4',24),.5,2.5,None,lambda:None,runtime_preflight=stop)
            self.assertEqual(len(commands),2);provider.scp_to.assert_not_called();self.assertFalse(state['input_dispatched']);self.assertFalse(state['execution_started'])
    def test_v16_measure_selects_ryotide_only_and_preserves_other_dispatch(self):
        import v16_profiles as profiles
        import jeff_runtime_preflight
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);state_root=root/'state';(state_root/'requests').mkdir(parents=True)
            for rid in [preflight.ORDER,'ordinary-other-order']:
                job=root/rid;(job/'trusted-runner').mkdir(parents=True)
                (job/'trusted-runner/POD-RECIPE.json').write_text(json.dumps({'kind':'http_typesafe'}))
                (state_root/'requests'/ (rid+'.json')).write_text('{}')
                hook=object()
                with patch.object(profiles,'STATE_ROOT',state_root),patch.object(profiles,'accepted',return_value=({'generation':'test'}, {}, {})),patch.object(profiles,'retirement'),patch.object(pr,'run',return_value='synthetic') as run,patch.object(preflight,'callback',return_value=hook) as ryo,patch.object(jeff_runtime_preflight,'callback',return_value=None) as jeff:
                    self.assertEqual(profiles.measure(job),'synthetic')
                    self.assertEqual(run.call_args.kwargs['runtime_preflight'],hook if rid==preflight.ORDER else None)
                    self.assertEqual(ryo.call_count,1 if rid==preflight.ORDER else 0)
                    self.assertEqual(jeff.call_count,0 if rid==preflight.ORDER else 1)

    def test_inspector_reads_metadata_only_and_minimum_boundaries(self):
        versions={'torch':'2.13.0+cu130','transformers':'5.17.0','flash-linear-attention':'0.5.2','fla-core':'0.5.2','triton':'3.7.0'}
        def dist(name):return SimpleNamespace(version=versions.get(name,'1.0.0'),requires=[])
        with patch.object(inspector.metadata,'distribution',side_effect=dist),patch.object(inspector.shutil,'which',return_value='/usr/bin/gcc'),patch.object(inspector.Path,'is_file',return_value=True),patch.object(inspector.sys,'version_info',(3,12)),patch.dict(inspector.os.environ,{},clear=True):
            good=inspector.inspect();self.assertTrue(good['metadata_requirements_satisfied']);self.assertFalse(good['runtime_admitted']);self.assertFalse(good['native_kernels_proven']);self.assertFalse(good['image_identity_proven'])
            versions['torch']='2.7.0';self.assertFalse(inspector.inspect()['metadata_requirements_satisfied']);versions['torch']='2.13.0';versions['fla-core']='0.4.0';self.assertFalse(inspector.inspect()['metadata_requirements_satisfied'])
if __name__=='__main__':unittest.main()
