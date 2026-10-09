"""Literal original paid Aplomb order's full-physical SM12 candidate and proof.

Source-only until the ordinary source/input/custody/budget gates accept the run.
The proof sends only first-party drivers and synthetic inputs, never a benchmark
item. It runs customer source only in a separate inspected offline GPU container.
"""
from __future__ import annotations
import hashlib
import io
import json
import math
from pathlib import Path
import tarfile
import tempfile

ORDER = 'acad951a-1b9d-4f3c-a449-350d1c04bd23'
COMMIT = '758ed868fd02b42cc60989064ee41496164271b7'
TREE = 'f0700fb222bd9f0331cb8a9366485aef3f801555'
CONTEXT = '234d1d2b1a1597d8c4d4e60b14f1102f33fa40b8a7979047143daff98b1205f4'
MANIFEST = '011a4547675a2047180dd56c413073a13159feeefb2ba1041e7e7cb90cf328d2'
BASE = 'pytorch/pytorch:2.13.0-cuda13.0-cudnn9-runtime@sha256:db80a41f8428644cebcb3d75b0b62df334ab6c0e75785951eb25f48bfbd42407'
NAME = 'jev-aplomb-candidate-proof'
PROOF_DIR = '/work/aplomb-candidate-proof'
GPU_NAMES = {'NVIDIA GeForce RTX 5090', 'GeForce RTX 5090'}


class ProofError(RuntimeError):
    pass


def active(rid, recipe):
    return rid == ORDER and recipe.get('min_vram_gb') == 32


def candidates(rid, recipe, benchmarks, host_binding):
    """None preserves existing selection; candidate shape never has a fallback."""
    if rid != ORDER or recipe.get('min_vram_gb') == 96:
        return None
    if not active(rid, recipe):
        raise ProofError('aplomb_candidate_shape_unaccepted')
    code = recipe.get('code', {})
    weights = recipe.get('weights', [])
    stage = recipe.get('host_staging', {})
    if (recipe.get('kind') != 'aplomb_native' or type(recipe.get('min_vram_gb')) is not int
            or tuple(benchmarks) != ('jevbench', 'imagejevbench')
            or code != {'source': 'model', 'commit': COMMIT, 'tree': TREE}
            or recipe.get('image') != BASE or recipe.get('model') != 'aplomb-1'
            or recipe.get('model_dir') != 'aplomb' or len(weights) != 1
            or weights[0].get('repo') != 'empiriolabsai/aplomb-1'
            or weights[0].get('revision') != COMMIT or weights[0].get('dir') != 'aplomb'
            or stage.get('image_build', {}).get('context_sha256') != CONTEXT
            or stage.get('weights_manifest_sha256') != MANIFEST
            or not isinstance(host_binding, dict)
            or host_binding.get('image_context_sha256') != CONTEXT
            or host_binding.get('weights_manifest_sha256') != MANIFEST):
        raise ProofError('aplomb_candidate_shape_unaccepted')
    return (('RTX5090', 32),)


# This is never executed on Sandy. Driver bytes come from the current checked
# official profile, and customer modules remain under the verified /code mount.
SNIPPET = '''import base64,contextlib,io,json,os,time
import torch
from PIL import Image
assert torch.cuda.device_count()==1
p=torch.cuda.get_device_properties(0)
assert p.name in ('NVIDIA GeForce RTX 5090','GeForce RTX 5090')
assert torch.cuda.get_device_capability(0)==(12,0)
assert 31*2**30<=p.total_memory<=33*2**30
started=time.monotonic()
with open(os.devnull,'w') as sink,contextlib.redirect_stdout(sink),contextlib.redirect_stderr(sink):
    import aplomb_loader,native_image
    torch.cuda.reset_peak_memory_stats()
    model=aplomb_loader.load('/models/aplomb')
    dtypes=sorted({str(x.dtype) for x in model._adapter.model.parameters() if x.is_floating_point()})
    assert 'torch.bfloat16' in dtypes and set(dtypes)<= {'torch.bfloat16','torch.float32'}
    q={'decision':{'type':'choice','instructions':'Choose the color described or shown.','criteria':{'A':'white','B':'black'}}}
    text=model.predict('A white square.',q)
    assert native_image._parse(text,'AB')[2]=='ok'
    picture=io.BytesIO();Image.new('RGB',(256,256),'white').save(picture,format='PNG')
    image=model.predict({'image':{'type':'image','data':base64.b64encode(picture.getvalue()).decode(),'mime':'image/png'}},q)
    assert native_image._parse(image,'AB')[2]=='ok'
    torch.cuda.synchronize()
    allocated=torch.cuda.max_memory_allocated()
    reserved=torch.cuda.max_memory_reserved()
assert 0<allocated<=reserved<p.total_memory
print(json.dumps({'schema_version':1,'gpu_name':p.name,'gpu_count':1,'compute_capability':[12,0],
 'total_memory_bytes':p.total_memory,'peak_allocated_bytes':allocated,'peak_reserved_bytes':reserved,
 'elapsed_seconds':time.monotonic()-started,'model_parameter_dtypes':dtypes,
 'text_ok':True,'image_ok':True,'synthetic_only':True,'fresh_measured_process_required':True},sort_keys=True))
'''


def _json(raw):
    def pairs(items):
        out = {}
        for key, value in items:
            if key in out:
                raise ProofError('aplomb_candidate_duplicate_json')
            out[key] = value
        return out
    if not isinstance(raw, str) or len(raw.encode()) > 8192:
        raise ProofError('aplomb_candidate_output_unbounded')
    try:
        return json.loads(raw, object_pairs_hook=pairs, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
    except (TypeError, ValueError):
        raise ProofError('aplomb_candidate_output_invalid') from None


def validate_proof(value):
    keys = {'schema_version','gpu_name','gpu_count','compute_capability','total_memory_bytes',
            'peak_allocated_bytes','peak_reserved_bytes','elapsed_seconds','model_parameter_dtypes',
            'text_ok','image_ok','synthetic_only','fresh_measured_process_required'}
    if not isinstance(value, dict) or set(value) != keys:
        raise ProofError('aplomb_candidate_proof_invalid')
    integers = ('schema_version','gpu_count','total_memory_bytes','peak_allocated_bytes','peak_reserved_bytes')
    if any(type(value[k]) is not int for k in integers):
        raise ProofError('aplomb_candidate_proof_invalid')
    elapsed = value['elapsed_seconds']
    dtypes = value['model_parameter_dtypes']
    if (value['schema_version'] != 1 or value['gpu_name'] not in GPU_NAMES or value['gpu_count'] != 1
            or value['compute_capability'] != [12,0]
            or not 31*2**30 <= value['total_memory_bytes'] <= 33*2**30
            or not 0 < value['peak_allocated_bytes'] <= value['peak_reserved_bytes'] < value['total_memory_bytes']
            or type(elapsed) not in (int,float) or not math.isfinite(elapsed) or not 0 < elapsed <= 600
            or not isinstance(dtypes,list) or 'torch.bfloat16' not in dtypes
            or any(t not in ('torch.bfloat16','torch.float32') for t in dtypes)
            or any(value[k] is not True for k in ('text_ok','image_ok','synthetic_only','fresh_measured_process_required'))):
        raise ProofError('aplomb_candidate_proof_invalid')
    return value


def _run(provider, pod_id, recipe, current, image, execute):
    """Called after verified full weights and before any protected-input SCP."""
    def call(argv, timeout=60):
        try:
            return execute(provider, pod_id, argv, timeout=timeout)
        except Exception:
            raise ProofError('aplomb_candidate_command_failed') from None
    inventory = call(['nvidia-smi','--query-gpu=name,memory.total','--format=csv,noheader,nounits']).stdout.strip().splitlines()
    if len(inventory) != 1:
        raise ProofError('aplomb_candidate_not_one_physical_gpu')
    parts = inventory[0].split(',')
    if len(parts) != 2 or parts[0].strip() not in GPU_NAMES:
        raise ProofError('aplomb_candidate_wrong_physical_gpu')
    try:
        memory = int(parts[1].strip())
    except ValueError:
        raise ProofError('aplomb_candidate_memory_invalid') from None
    if not 31744 <= memory <= 33792:
        raise ProofError('aplomb_candidate_memory_invalid')
    drivers = {}
    for name in ('aplomb_loader.py','native_image.py'):
        spec = current['profile']['code']['pod_drivers/'+name]
        path = Path(spec['path'])
        if not path.is_absolute():
            path = Path(__file__).resolve().parent/path
        if path.is_symlink() or not path.is_file():
            raise ProofError('aplomb_candidate_driver_invalid')
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != spec['sha256']:
            raise ProofError('aplomb_candidate_driver_changed')
        drivers[name] = data
    payload = {**drivers, 'proof.py':SNIPPET.encode()}
    call(['mkdir','-p',PROOF_DIR])
    with tempfile.TemporaryDirectory(prefix='aplomb-candidate-proof-') as temporary:
        archive = Path(temporary)/'proof.tar'
        with tarfile.open(archive,'w') as tf:
            for name, data in sorted(payload.items()):
                member = tarfile.TarInfo(name);member.size=len(data);member.mode=0o444
                tf.addfile(member,io.BytesIO(data))
        try:
            provider.scp_to(pod_id,str(archive),PROOF_DIR+'/proof.tar')
        except Exception:
            raise ProofError('aplomb_candidate_driver_transfer_failed') from None
    call(['tar','-xf',PROOF_DIR+'/proof.tar','-C',PROOF_DIR])
    image_id = call(['docker','image','inspect',image,'--format','{{.Id}}']).stdout.strip()
    if not isinstance(image_id,str) or len(image_id)!=71 or not image_id.startswith('sha256:') or any(c not in '0123456789abcdef' for c in image_id[7:]):
        raise ProofError('aplomb_candidate_image_invalid')
    expected_binds = ['/models:/models:ro','/models/aplomb:/code:ro',PROOF_DIR+':/driver:ro']
    try:
        call(['docker','create','--name',NAME,'--gpus','all','--network','none','--read-only',
              '--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','256',
              '--shm-size','16g','--tmpfs','/tmp:exec,size=16g',
              '-e','HOME=/tmp','-e','HF_TOKEN=','-e','OPENAI_API_KEY=',
              '-e','HF_HUB_OFFLINE=1','-e','TRANSFORMERS_OFFLINE=1','-e','PYTHONPATH=/driver',
              '--entrypoint','python3',*[x for bind in expected_binds for x in ('-v',bind)],image_id,'/driver/proof.py'])
        host = _json(call(['docker','inspect',NAME,'--format','{{json .HostConfig}}']).stdout)
        cfg = _json(call(['docker','inspect',NAME,'--format','{{json .Config}}']).stdout)
        expected_env = {'HOME=/tmp','HF_TOKEN=','OPENAI_API_KEY=','HF_HUB_OFFLINE=1','TRANSFORMERS_OFFLINE=1','PYTHONPATH=/driver'}
        if (not isinstance(host,dict) or host.get('NetworkMode')!='none' or host.get('ReadonlyRootfs') is not True
                or host.get('Privileged') is not False or sorted(host.get('Binds') or []) != sorted(expected_binds)
                or host.get('CapAdd') or sorted(host.get('CapDrop') or []) != ['ALL']
                or host.get('PidMode') not in ('',None) or host.get('IpcMode') not in ('private','')
                or host.get('Devices') not in (None,[]) or host.get('PidsLimit') != 256
                or host.get('Tmpfs') != {'/tmp':'exec,size=16g'}
                or host.get('SecurityOpt') not in (['no-new-privileges:true'],['no-new-privileges'])
                or not isinstance(host.get('DeviceRequests'),list) or len(host['DeviceRequests']) != 1
                or host['DeviceRequests'][0].get('Count') != -1
                or host['DeviceRequests'][0].get('Driver') not in ('','nvidia')
                or host['DeviceRequests'][0].get('DeviceIDs') not in (None,[])
                or host['DeviceRequests'][0].get('Capabilities') != [['gpu']]
                or not isinstance(cfg,dict) or cfg.get('Image')!=image_id
                or cfg.get('Entrypoint') != ['python3'] or cfg.get('Cmd') != ['/driver/proof.py']
                or not expected_env <= set(cfg.get('Env') or [])):
            raise ProofError('aplomb_candidate_isolation_invalid')
        # Reuse the already reviewed image-environment checker; no extra mounts or
        # credentials are introduced. Inspect precedes starting customer imports.
        import pod_runner
        pod_runner._env_names_checked(json.dumps(cfg['Env']))
        call(['docker','start',NAME])
        if call(['docker','wait',NAME],timeout=600).stdout.strip() != '0':
            raise ProofError('aplomb_candidate_native_smoke_failed')
        result = validate_proof(_json(call(['bash','-o','pipefail','-c',
            'docker logs --tail 1 jev-aplomb-candidate-proof 2>/dev/null | head -c 8193']).stdout))
        result.update(image_id=image_id, driver_sha256={n:hashlib.sha256(b).hexdigest() for n,b in drivers.items()},
                      proof_script_sha256=hashlib.sha256(payload['proof.py']).hexdigest(),
                      host_inventory_memory_mib=memory, network_mode='none', mounts=expected_binds,
                      module_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
        return result
    finally:
        # A timeout/refusal never launches the actual measured container. Whole-pod
        # exact-ID teardown in the caller remains mandatory if this removal fails.
        call(['docker','rm','-f',NAME])


def run(provider, pod_id, recipe, current, image, execute):
    try:
        return _run(provider, pod_id, recipe, current, image, execute)
    except Exception:
        # Normalize malformed provider/customer metadata and cleanup errors into
        # one permanent pre-input hold; no automatic fresh-pod proof retry.
        raise ProofError('aplomb_candidate_preinput_proof_failed') from None
