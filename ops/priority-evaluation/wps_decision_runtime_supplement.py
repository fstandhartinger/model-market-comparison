"""Fixed-order offline runtime supplement for wps-decision-1 (paid fast-lane order 114b6e41).

wps-decision-1 is a d3-flash finetune (Qwen3.5-9B backbone plus a 255-code decision readout) served by the customer's own stdlib
d3_server.py through its bundled d3_runtime, not through vLLM. The author's recorded stack is torch 2.14.0+cu130, torchvision 0.29.0,
transformers 5.17.0, accelerate 1.15.0, safetensors 0.8.0, huggingface_hub 1.33.0, tokenizers 0.23.3, einops 0.8.2, numpy 2.2.6 and
opencv-python-headless 5.0.0.93. The digest-pinned official PyTorch 2.14.0 CUDA 13.0 devel image (Python 3.12) already carries that
torch, torchvision, pillow 12.3.0 and triton 3.8.0; this supplement overlays the rest and their missing dependencies as SHA-256-pinned
public PyPI wheels. The vLLM wheel and flashinfer are left out: the bundled runtime imports neither. The Docker build is offline and uses only the pinned
context members. The customer package is mounted from the model repository by the trusted runner; this host module imports no model
stack and executes no customer code.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '114b6e41-14c5-42b1-9a35-386ab83b62e9'
BASE_IMAGE = 'pytorch/pytorch:2.14.0-cuda13.0-cudnn9-devel@sha256:cce09744eb864371df6423aaba413145afb65794837be783c33446e7ef615d20'
CONTEXT = Path('/home/flori/jobs/fastlane-native-114b6e41/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = '291bd9fac6003e027e2c0bbb0d67ccd67ee3eb313f91350d43efe0959c9be36f'
FILES = {
    "Dockerfile.runtime-supplement": "c13ac688376dd6ea8c9685a3afdd51038d04088a539c7ecc061725b7a2c788b6",
    "runtime-supplement-requirements.lock.txt": "d40c789c13a5bb91c5dd3e16cc3e2f6d197e1425dbe534d66863624c4918cbbc",
    "wheels/accelerate-1.15.0-py3-none-any.whl": "97eacca0b73e45cb867dbf8c5d5d4dc32219544300e0c8992c7334dc2ef33cec",
    "wheels/annotated_doc-0.0.5-py3-none-any.whl": "117bac03a25ede5df5440e855b32d556049ca169ead221505badf432fed4b101",
    "wheels/anyio-4.16.0-py3-none-any.whl": "c66ae634e0b8228396b801741beb3294326d4b6102f7bba4041c0dfb58c29026",
    "wheels/click-8.5.0-py3-none-any.whl": "255bc9599cf7748b4b1a446ccc735421bd08a2ae529a8b88597d3de5664ee360",
    "wheels/einops-0.8.2-py3-none-any.whl": "54058201ac7087911181bfec4af6091bb59380360f069276601256a76af08193",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.8.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "29dab7c904cd1914a0439c6e1306c12c7497c8bd32290fbe563ebf51ca4b6d6d",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/huggingface_hub-1.33.0-py3-none-any.whl": "04e434b06e100eddbce9a6e817d72693a7884b10a79bd67ab48080d5c07eb899",
    "wheels/markdown_it_py-4.2.0-py3-none-any.whl": "9f7ebbcd14fe59494226453aed97c1070d83f8d24b6fc3a3bcf9a38092641c4a",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/numpy-2.2.6-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd83c01228a688733f1ded5201c678f0c53ecc1006ffbc404db9f7a899ac6249",
    "wheels/opencv_python_headless-5.0.0.93-cp37-abi3-manylinux_2_28_x86_64.whl": "ed709fdf9aa0bd1f2ed8549e71d19449b03a675bb581eb292285f6861953be37",
    "wheels/regex-2026.9.29-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "39ab5894d971f9ac68baa6eca5c50387db579cfcacf36ae8df3feceb1815e6d0",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/tokenizers-0.23.3-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "376851d22bcf9d650a5c3090bb83e6cf9e895fbf0595369fa4cd43c1f69b5f87",
    "wheels/tqdm-4.70.1-py3-none-any.whl": "c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73",
    "wheels/transformers-5.17.0-py3-none-any.whl": "78ec1ce21579b38dfb83950a0658cd119f87212a2fcfdff478096ce9d6c03801",
    "wheels/typer-0.27.3-py3-none-any.whl": "e50022f28b82a86313e54501317a1db64bf8f8d036ff8cfe5ca7e47675454aff"
}
MEMBER_LIMIT = 268435456
CONTEXT_LIMIT = 536870912
REMOTE_ROOT = '/runtime-supplement/wps-decision'
BUILD_TIMEOUT_S = 1800
SCP_TIMEOUT_S = 1800

def _sha256_stream(stream):
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
    return digest.hexdigest()


def sha256(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise ValueError('supplement file is not a regular file')
    with path.open('rb') as stream:
        return _sha256_stream(stream)

def active(job, recipe):
    """Only this order's reviewed http_typesafe recipe on the exact pinned base selects the supplement."""
    return (Path(job).name == ORDER and isinstance(recipe, dict) and recipe.get('kind') == 'http_typesafe'
            and recipe.get('image') == BASE_IMAGE)

def check_context(context=CONTEXT):
    """The context must be byte-identical to the pinned public-only inventory."""
    context = Path(context)
    if context.is_symlink() or not context.is_file() or context.stat().st_size > CONTEXT_LIMIT \
            or sha256(context) != CONTEXT_SHA:
        raise ValueError('supplement context pin')
    with tarfile.open(context, 'r:') as archive:
        members = archive.getmembers()
        if len(members) != len(FILES) or {m.name for m in members} != set(FILES) \
                or any(not m.isfile() or m.size > MEMBER_LIMIT for m in members):
            raise ValueError('supplement context inventory')
        for member in members:
            with archive.extractfile(member) as content:
                if _sha256_stream(content) != FILES[member.name]:
                    raise ValueError('supplement member pin')


def binding():
    return {'module_sha256': sha256(__file__), 'context_sha256': CONTEXT_SHA, 'base_image': BASE_IMAGE}


def build(provider, pod_id, context=CONTEXT):
    """Build the derived image on the owned pod; returns its evidence record.

    A host-side pin problem is an operational hold (no retry); a pod-side failure raises PodRunError via
    pod_runner._exec and is eligible for the ordinary single fresh-pod retry."""
    try:
        check_context(context)
        evidence = binding()
    except (OSError, ValueError, tarfile.TarError):
        raise measurement_dispatch.OperationalHold('runtime_supplement_unaccepted') from None
    pod_runner._exec(provider, pod_id, ['mkdir', '-p', REMOTE_ROOT])
    # ~100 MB of pinned public wheels; a generous timeout for slow pod uplinks (8c7dbe11 lesson).
    provider.scp_to(pod_id, str(context), REMOTE_ROOT + '/context.tar', timeout=SCP_TIMEOUT_S)
    transferred = pod_runner._exec(provider, pod_id, ['sha256sum', REMOTE_ROOT + '/context.tar'])
    if CONTEXT_SHA not in transferred.stdout.split():
        raise pod_runner.PodRunError('runtime supplement context changed in transfer')
    pod_runner._exec(provider, pod_id, ['tar', '-xf', REMOTE_ROOT + '/context.tar', '-C', REMOTE_ROOT])
    pod_runner._exec(provider, pod_id, ['docker', 'build', '--network', 'none', '--pull=false',
                                        '--iidfile', REMOTE_ROOT + '/image.iid',
                                        '-f', REMOTE_ROOT + '/Dockerfile.runtime-supplement', REMOTE_ROOT],
                     timeout=BUILD_TIMEOUT_S)
    image = pod_runner._exec(provider, pod_id, ['cat', REMOTE_ROOT + '/image.iid']).stdout.strip()
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', image):
        raise pod_runner.PodRunError('runtime supplement build has no immutable image id')
    inspected = pod_runner._exec(provider, pod_id, ['docker', 'image', 'inspect', image, '--format', '{{.Id}}'])
    if inspected.stdout.strip() != image:
        raise pod_runner.PodRunError('runtime supplement image identity differs')
    return dict(evidence, effective_image=image)
