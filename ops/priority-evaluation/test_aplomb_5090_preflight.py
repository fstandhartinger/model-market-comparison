"""Synthetic metadata and fake-provider tests; no model/GPU/network execution."""
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock
import aplomb_5090_preflight as a
import pod_runner as pr
import test_host_staging as host


def recipe():
    return {'kind':'aplomb_native','min_vram_gb':32,'image':a.BASE,'model':'aplomb-1','model_dir':'aplomb',
        'code':{'source':'model','commit':a.COMMIT,'tree':a.TREE},
        'weights':[{'repo':'empiriolabsai/aplomb-1','revision':a.COMMIT,'dir':'aplomb'}],
        'host_staging':{'image_build':{'context_sha256':a.CONTEXT},'weights_manifest_sha256':a.MANIFEST}}


def proof():
    return {'schema_version':1,'gpu_name':'NVIDIA GeForce RTX 5090','gpu_count':1,
        'compute_capability':[12,0],'total_memory_bytes':32*2**30,'peak_allocated_bytes':12*2**30,
        'peak_reserved_bytes':14*2**30,'elapsed_seconds':12.5,'model_parameter_dtypes':['torch.bfloat16'],
        'text_ok':True,'image_ok':True,'synthetic_only':True,'fresh_measured_process_required':True}


def run_lifecycle(fixture,fake,state):
    r={**fixture.recipe,'min_vram_gb':32}
    (fixture.root/'out').mkdir(exist_ok=True)
    with mock.patch.object(pr,'PODS_DIR',fixture.root/'pods'):
        return pr._lifecycle(fake,'synthetic',r,fixture.root/'stage.tar',fixture.root/'out',
            state,('RTX5090',32),3,20,lambda text:None,lambda:None,
            job_dir=fixture.job,image_context_provider=lambda job:fixture.context,
            weights_streamer=fixture.streamer,candidate_pins=fixture.pins)


class CandidateTests(unittest.TestCase):
    def test_exact_candidate_and_unchanged_foreign_defaults(self):
        binding={'image_context_sha256':a.CONTEXT,'weights_manifest_sha256':a.MANIFEST}
        self.assertEqual(a.candidates(a.ORDER,recipe(),('jevbench','imagejevbench'),binding),(('RTX5090',32),))
        self.assertIsNone(a.candidates('foreign',recipe(),('jevbench','imagejevbench'),binding))
        r=recipe();r['min_vram_gb']=96
        self.assertIsNone(a.candidates(a.ORDER,r,('jevbench','imagejevbench'),binding))
        self.assertNotIn(('RTX5090',32),pr.GPU_PREFERENCE)

    def test_wrong_shape_has_no_fallback(self):
        binding={'image_context_sha256':a.CONTEXT,'weights_manifest_sha256':a.MANIFEST}
        for key,value in [('kind','python_inprocess'),('image','different'),('model','other'),('code',{}),('weights',[]),('min_vram_gb',31),('min_vram_gb',48),('min_vram_gb',32.0)]:
            r=recipe();r[key]=value
            with self.subTest(key=key),self.assertRaises(a.ProofError):
                a.candidates(a.ORDER,r,('jevbench','imagejevbench'),binding)
        for benchmarks,bind in [(('jevbench',),binding),(('imagejevbench','jevbench'),binding),(('jevbench','imagejevbench'),None)]:
            with self.subTest(benchmarks=benchmarks,bind=bind),self.assertRaises(a.ProofError):
                a.candidates(a.ORDER,recipe(),benchmarks,bind)

    def test_untrusted_proof_fields_fail_closed(self):
        self.assertEqual(a.validate_proof(proof()),proof())
        cases=[('gpu_count',2),('gpu_name','NVIDIA RTX PRO 6000'),('total_memory_bytes',24*2**30),
            ('compute_capability',[8,9]),('peak_reserved_bytes',33*2**30),('peak_allocated_bytes',0),
            ('text_ok',False),('image_ok',False),('synthetic_only',False),('fresh_measured_process_required',False),
            ('elapsed_seconds',float('nan')),('elapsed_seconds',601),('elapsed_seconds',True),
            ('model_parameter_dtypes',['torch.float16']),('schema_version',True)]
        for key,value in cases:
            p=proof();p[key]=value
            with self.subTest(key=key,value=value),self.assertRaises(a.ProofError):
                a.validate_proof(p)
        with self.assertRaises(a.ProofError):a.validate_proof({**proof(),'probabilities':[.5,.5]})
        with self.assertRaises(a.ProofError):a._json('{"x":1,"x":2}')
        with self.assertRaises(a.ProofError):a._json('x'*8193)

    def test_failed_proof_tears_down_before_any_protected_upload(self):
        fixture=host.HostStagingTests();fixture.setUp()
        try:
            fake=host.HostFake(); state={'request_id':a.ORDER,'spent_upper_bound_usd':0,'host_staging':{}}
            with mock.patch.object(a,'run',side_effect=a.ProofError('synthetic')):
                with self.assertRaisesRegex(pr.measurement_dispatch.OperationalHold,'aplomb_candidate_preinput_proof_failed'):
                    run_lifecycle(fixture,fake,state)
            self.assertFalse(any(c[0]=='scp_to' and c[2]=='/work/stage.tar' for c in fake.calls))
            self.assertFalse(state.get('input_dispatched'))
            self.assertEqual(fake.removed,['pod-1'])
            self.assertGreater(state['spent_upper_bound_usd'],0)
        finally:fixture.tearDown()

    def test_success_proof_precedes_dispatch_and_measured_new_container(self):
        fixture=host.HostStagingTests();fixture.setUp()
        try:
            fake=host.HostFake();state={'request_id':a.ORDER,'spent_upper_bound_usd':0,'host_staging':{}}
            def accept(*args):
                self.assertTrue(fixture.stream_calls)
                self.assertFalse(state.get('input_dispatched'))
                self.assertFalse(any(c[0]=='scp_to' and c[2]=='/work/stage.tar' for c in fake.calls))
                return proof()
            with mock.patch.object(a,'run',side_effect=accept):
                run_lifecycle(fixture,fake,state)
            self.assertEqual(state['aplomb_candidate_preinput_proof'],proof())
            self.assertTrue(state['input_dispatched'])
            self.assertTrue(any(c[:3]==['docker','run','-d'] and 'jev-pod-run' in c for c,t in fake.commands))
        finally:fixture.tearDown()


class ContainerTests(unittest.TestCase):
    def test_inspection_precedes_start_and_raw_output_bounded(self):
        import measurement_dispatch as md
        current=md.pins()
        image_id='sha256:'+'a'*64
        binds=['/models:/models:ro','/models/aplomb:/code:ro',a.PROOF_DIR+':/driver:ro']
        hc={'NetworkMode':'none','ReadonlyRootfs':True,'Privileged':False,'Binds':binds,'CapAdd':None,
            'CapDrop':['ALL'],'PidMode':'','IpcMode':'private','Devices':[], 'PidsLimit':256,
            'Tmpfs':{'/tmp':'exec,size=16g'},'SecurityOpt':['no-new-privileges:true'],
            'DeviceRequests':[{'Count':-1,'Driver':'','DeviceIDs':None,'Capabilities':[['gpu']]}]}
        cfg={'Image':image_id,'Entrypoint':['python3'],'Cmd':['/driver/proof.py'],
            'Env':['HOME=/tmp','HF_TOKEN=','OPENAI_API_KEY=','HF_HUB_OFFLINE=1','TRANSFORMERS_OFFLINE=1','PYTHONPATH=/driver']}
        events=[]
        class Fake:
            def scp_to(self,pod,local,remote):
                events.append(('scp',remote))
                import tarfile
                with tarfile.open(local) as archive:
                    self_files=archive.getnames()
                    assert self_files==['aplomb_loader.py','native_image.py','proof.py']
        def execute(provider,pod,argv,timeout=60):
            events.append(tuple(argv))
            if argv[0]=='nvidia-smi':out='NVIDIA GeForce RTX 5090, 32768\n'
            elif argv[:3]==['docker','image','inspect']:out=image_id
            elif argv[:2]==['docker','inspect']:out=json.dumps(hc if 'HostConfig' in argv[-1] else cfg)
            elif argv[:2]==['docker','wait']:out='0\n'
            elif argv[0]=='bash':out=json.dumps(proof())
            else:out=''
            return subprocess.CompletedProcess(argv,0,out,'')
        result=a.run(Fake(),'pod',recipe(),current,'image',execute)
        self.assertEqual(result['image_id'],image_id)
        inspect_at=max(i for i,x in enumerate(events) if x[:2]==('docker','inspect'))
        start_at=next(i for i,x in enumerate(events) if x[:2]==('docker','start'))
        self.assertLess(inspect_at,start_at)
        self.assertEqual(events[-1],('docker','rm','-f',a.NAME))
        self.assertTrue(any(x[0]=='bash' and 'head -c 8193' in x[-1] for x in events))
        hc['NetworkMode']='host';events.clear()
        with self.assertRaises(a.ProofError):a.run(Fake(),'pod',recipe(),current,'image',execute)
        self.assertFalse(any(x[:2]==('docker','start') for x in events))
        self.assertEqual(events[-1],('docker','rm','-f',a.NAME))


if __name__=='__main__':unittest.main()
