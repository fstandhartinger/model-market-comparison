"""Fixed-order offline runtime supplement for Jeva-4B (paid fast-lane order 8a93f2a0).

The author documents a pip/conda environment (Python 3.12, torch 2.9.1 cu128, transformers 5.17.0, peft 0.21.2,
accelerate 1.12.0, fla-core/flash-linear-attention 0.5.2, causal-conv1d 1.7.0, tilelang 0.1.15, apache-tvm-ffi
0.1.12) that no official image contains. This supplement overlays the digest-pinned official PyTorch 2.9.1 CUDA 12.8
devel image (Python 3.11, its own torch 2.9.1/Triton 3.5.1 builds; devel because Triton/TileLang compile at run
time) with SHA-256-pinned public wheels: the documented packages and their missing PyPI dependencies, plus the
causal-conv1d v1.7.0 GitHub release wheel for cu12/torch 2.9/cp311 (same bytes as the Torchcast supplement).
The context also carries head.safetensors: the checkpoint's head.pt (a restricted torch pickle the recipe contract
does not accept) converted host-side in a network-less container (order HEAD-CONVERSION-RECEIPT.json, input LFS
sha256 ade5f37b..., output 81bc17a1...). The image places it at /opt/jeva-head/head.safetensors for the reviewed
first-party shim. The Docker build is offline and uses only the pinned context members. The customer package is
mounted from the code repository by the trusted runner; this host module imports no model stack and executes no
customer code.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '8a93f2a0-bf48-4ae3-b747-357380797391'
BASE_IMAGE = 'pytorch/pytorch:2.9.1-cuda12.8-cudnn9-devel@sha256:39236c0ad9c66baecf01bb2e4f5562543c5b336c0c785887798775d6d6fdbf9a'
CONTEXT = Path('/home/flori/jobs/fastlane-jeva4b-native-20261018/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = '4370ae0851032af66ef1a372fe9f9e3a81e79af440821eff1670d85d7fa94591'
FILES = {
    "Dockerfile.runtime-supplement": "2b7e7e87eee302a9821b9032fae7178fb8e065a52a274cf6adfe4fd71b33c035",
    "runtime-supplement-requirements.lock.txt": "fccff0b357505745af5bb57b82db8d6133f4a6caac3f3268dc01cf4e6962546e",
    "head.safetensors": "81bc17a1176f0b43707abf36c24a41caec1b8ebc5b216d5b470f95bc5cc8ff09",
    "wheels/accelerate-1.12.0-py3-none-any.whl": "3e2091cd341423207e2f084a6654b1efcd250dc326f2a37d6dde446e07cabb11",
    "wheels/annotated_doc-0.0.5-py3-none-any.whl": "117bac03a25ede5df5440e855b32d556049ca169ead221505badf432fed4b101",
    "wheels/anyio-4.14.2-py3-none-any.whl": "9f505dda5ac9f0c8309b5e8bd445a8c2bf7246f3ce950121e45ea15bc41d1494",
    "wheels/apache_tvm_ffi-0.1.12-cp311-cp311-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl": "011e372fb9b169c3bd57f63e03fa1383cee6f1ef47a4932c4ff552f29db281c3",
    "wheels/causal_conv1d-1.7.0-cp311-cp311-linux_x86_64.whl": "815388d4c13bd1cc578f3a148c5892630c14c7ae455295f9ad52e648d1cb8d8b",
    "wheels/cloudpickle-3.1.2-py3-none-any.whl": "9acb47f6afd73f60dc1df93bb801b472f05ff42fa6c84167d25cb206be1fbf4a",
    "wheels/einops-0.8.1-py3-none-any.whl": "919387eb55330f5757c6bea9165c5ff5cfe63a642682ea788a6d472576d81737",
    "wheels/exceptiongroup-1.3.1-py3-none-any.whl": "a7a39a3bd276781e98394987d3a5701d0c4edffb633bb7a5144577f82c773598",
    "wheels/fla_core-0.5.2-py3-none-any.whl": "5e830c85bad3d0d34677f98ac7074d08687a3756f0f0499d95ceb96eb6920761",
    "wheels/flash_linear_attention-0.5.2-py3-none-any.whl": "dcf405d81f5426393b59037097aa700d0f4a841465d5028d5aa543f4502f2400",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.7.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "2814a6e999d13464c4d679b788cc5d784eb5a4edfc638a31f10e9a11ab531ef8",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/huggingface_hub-1.16.1-py3-none-any.whl": "64340de934b9ce37857ef85a82de72f5629e8a270f9119eabb12bf495eb53c22",
    "wheels/markdown_it_py-4.2.0-py3-none-any.whl": "9f7ebbcd14fe59494226453aed97c1070d83f8d24b6fc3a3bcf9a38092641c4a",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/ml_dtypes-0.6.0-cp311-cp311-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "6c8e39b53e90afda8ce52859c93de4dba3e02b76d85dcf091cc469f9184c6dae",
    "wheels/peft-0.21.2-py3-none-any.whl": "106ab6077ff72c54d21577f9af5970e34bac7582cb14209f7b2b511e322a4eae",
    "wheels/regex-2026.9.29-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "612b709381c0355b70d89cdb51b7f670591ed5cbbc0e3b5337488019dc667b65",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/tilelang-0.1.15-cp39-abi3-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "ca021a3450ad84b8fe7deb1b659c8d3d2e4b0855fdb59e2992a5349acf019881",
    "wheels/tokenizers-0.23.3-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "376851d22bcf9d650a5c3090bb83e6cf9e895fbf0595369fa4cd43c1f69b5f87",
    "wheels/torch_c_dlpack_ext-0.1.5-cp311-cp311-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl": "3448c4f0d64104d0b2e58080a7efa72304a04960c18f338024b80b13cd3eca26",
    "wheels/transformers-5.17.0-py3-none-any.whl": "78ec1ce21579b38dfb83950a0658cd119f87212a2fcfdff478096ce9d6c03801",
    "wheels/typer-0.27.3-py3-none-any.whl": "e50022f28b82a86313e54501317a1db64bf8f8d036ff8cfe5ca7e47675454aff",
    "wheels/z3_solver-4.15.4.0-py3-none-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "7e103a6f203f505b8b8b8e5c931cc407c95b61556512d4921c1ddc0b3f41b08e"
}
MEMBER_LIMIT = 268435456
CONTEXT_LIMIT = 536870912
REMOTE_ROOT = '/runtime-supplement/jeva'
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
    # ~358 MB of pinned public wheels and the converted head; a generous timeout for slow pod uplinks (8c7dbe11 lesson).
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
