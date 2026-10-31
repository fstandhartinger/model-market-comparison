"""Fixed-order offline runtime supplement for Torchcast Decision 4B (paid fast-lane orders 529be5d5 = v1.1,
39e2266a = v1.2 and 9494e9ea = v1.3; v1.2 and v1.3 document the identical stack).

The author documents a pip venv (torch 2.9.1 cu128, transformers 5.8.1, flash-linear-attention 0.5.2,
causal-conv1d>=1.7) that no official image contains. This supplement overlays the digest-pinned official
PyTorch 2.9.1 CUDA 12.8 devel image (its own torch/Triton 3.5.1 builds; devel because Triton compiles its
launcher with gcc at run time) with SHA-256-pinned public wheels: transformers 5.8.1 and its missing
dependencies from PyPI, flash-linear-attention/fla-core 0.5.2 (pure Triton) and the causal-conv1d 1.7.0
release wheel built for cu12/torch 2.9/cp311. The base interpreter is Python 3.11 (README: 3.12).
The Docker build is offline and uses only the pinned context members. The customer serving package is
mounted from the model repository by the trusted runner; this host module imports no model stack and
executes no customer code.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner
import supplement_admission

ORDER = '529be5d5-512f-463f-bdae-d7cd289fe970'
ORDER_V12 = '39e2266a-0cdb-450c-a879-27ebe0da1a6f'
ORDER_V13 = '9494e9ea-eeea-46e0-8fb1-41a045f41354'
ORDERS = frozenset((ORDER, ORDER_V12, ORDER_V13))  # exact paid orders only, never a pattern
BASE_IMAGE = 'pytorch/pytorch:2.9.1-cuda12.8-cudnn9-devel@sha256:39236c0ad9c66baecf01bb2e4f5562543c5b336c0c785887798775d6d6fdbf9a'
CONTEXT = Path('/home/flori/jobs/fastlane-torchcast4b-native-20261012/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = 'fc799cf0d8928650243f81a3d2e7fe3d91b42a955be8c31881392b8ca6be4b73'
FILES = {
    "Dockerfile.runtime-supplement": "8dc6924eaeeaa7aa861e31898d61914b7342ae2183d1c0f7d55b896893ef4259",
    "runtime-supplement-requirements.lock.txt": "029c93e12ab921e9328fe6f8ad2adf6e6e4a9b141da308053b49df59d3ab6c91",
    "wheels/accelerate-1.15.0-py3-none-any.whl": "97eacca0b73e45cb867dbf8c5d5d4dc32219544300e0c8992c7334dc2ef33cec",
    "wheels/annotated_doc-0.0.5-py3-none-any.whl": "117bac03a25ede5df5440e855b32d556049ca169ead221505badf432fed4b101",
    "wheels/anyio-4.14.2-py3-none-any.whl": "9f505dda5ac9f0c8309b5e8bd445a8c2bf7246f3ce950121e45ea15bc41d1494",
    "wheels/causal_conv1d-1.7.0-cp311-cp311-linux_x86_64.whl": "815388d4c13bd1cc578f3a148c5892630c14c7ae455295f9ad52e648d1cb8d8b",
    "wheels/einops-0.8.2-py3-none-any.whl": "54058201ac7087911181bfec4af6091bb59380360f069276601256a76af08193",
    "wheels/fla_core-0.5.2-py3-none-any.whl": "5e830c85bad3d0d34677f98ac7074d08687a3756f0f0499d95ceb96eb6920761",
    "wheels/flash_linear_attention-0.5.2-py3-none-any.whl": "dcf405d81f5426393b59037097aa700d0f4a841465d5028d5aa543f4502f2400",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.7.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "2814a6e999d13464c4d679b788cc5d784eb5a4edfc638a31f10e9a11ab531ef8",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/huggingface_hub-1.16.1-py3-none-any.whl": "64340de934b9ce37857ef85a82de72f5629e8a270f9119eabb12bf495eb53c22",
    "wheels/markdown_it_py-4.2.0-py3-none-any.whl": "9f7ebbcd14fe59494226453aed97c1070d83f8d24b6fc3a3bcf9a38092641c4a",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/regex-2026.9.29-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "612b709381c0355b70d89cdb51b7f670591ed5cbbc0e3b5337488019dc667b65",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/tokenizers-0.22.2-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "369cc9fc8cc10cb24143873a0d95438bb8ee257bb80c71989e3ee290e8d72c67",
    "wheels/transformers-5.8.1-py3-none-any.whl": "5340fb95962162cdfdae5cc91d7f8fedd92ed75216c1154c5e1f590fcf56dd0e",
    "wheels/typer-0.27.3-py3-none-any.whl": "e50022f28b82a86313e54501317a1db64bf8f8d036ff8cfe5ca7e47675454aff"
}
FAMILY = 'torchcast'
MEMBER_LIMIT = 268435456
CONTEXT_LIMIT = 536870912
REMOTE_ROOT = '/runtime-supplement/torchcast'
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
    """A listed order, or a host-admitted repeat of the reviewed stack (supplement_admission), with the
    reviewed http_typesafe recipe on the exact pinned base selects the supplement."""
    return (isinstance(recipe, dict) and recipe.get('kind') == 'http_typesafe'
            and recipe.get('image') == BASE_IMAGE
            and (Path(job).name in ORDERS or supplement_admission.admitted(job, FAMILY)))

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
    # ~220 MB of pinned public wheels; a generous timeout for slow pod uplinks (8c7dbe11 lesson).
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
