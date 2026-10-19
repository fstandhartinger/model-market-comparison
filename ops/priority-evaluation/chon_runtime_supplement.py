"""Fixed-order offline runtime supplement for Chon-1.0-12B (paid fast-lane order 3ce4b317).

Chon is a PEFT LoRA adapter on google/gemma-4-12B-it served by the customer's own TypeSafe-compatible
`python -m chon.serve`. The author documents Python 3.12, torch 2.9.1 cu128, transformers 5.19-5.20, peft 0.18.1 and
fastapi/uvicorn, which no official image contains. This supplement overlays the digest-pinned official PyTorch 2.9.1
CUDA 12.8 devel image (Python 3.11, its own torch 2.9.1/Triton 3.5.1 builds) with SHA-256-pinned public PyPI wheels:
transformers 5.20.1, peft 0.18.1, accelerate 1.12.0, safetensors 0.8.0, huggingface-hub, tokenizers, fastapi, uvicorn
and their missing dependencies (click is overlaid because huggingface-hub needs >=8.4.2). The Docker build is offline
and uses only the pinned context members. The customer package is mounted from the code repository by the trusted
runner; this host module imports no model stack and executes no customer code.
"""

import hashlib
import re
import tarfile
from datetime import datetime, timezone
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '3ce4b317-09bb-459f-a33f-1e48e35006b2'
BASE_IMAGE = 'pytorch/pytorch:2.9.1-cuda12.8-cudnn9-devel@sha256:39236c0ad9c66baecf01bb2e4f5562543c5b336c0c785887798775d6d6fdbf9a'
CONTEXT = Path('/home/flori/jobs/fastlane-chon12b-native-20261019/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = '4c47862f81757c3ffcf96822d3f96f260f2301f1a478e709740b0ef103e7c6f7'
FILES = {
    "wheels/accelerate-1.12.0-py3-none-any.whl": "3e2091cd341423207e2f084a6654b1efcd250dc326f2a37d6dde446e07cabb11",
    "wheels/annotated_doc-0.0.5-py3-none-any.whl": "117bac03a25ede5df5440e855b32d556049ca169ead221505badf432fed4b101",
    "wheels/annotated_types-0.8.0-py3-none-any.whl": "f072f4d804ea359e4eaf198b1af7a8b0943881a87f31bb764f8bf219bb9419e0",
    "wheels/anyio-4.14.2-py3-none-any.whl": "9f505dda5ac9f0c8309b5e8bd445a8c2bf7246f3ce950121e45ea15bc41d1494",
    "wheels/click-8.5.0-py3-none-any.whl": "255bc9599cf7748b4b1a446ccc735421bd08a2ae529a8b88597d3de5664ee360",
    "wheels/exceptiongroup-1.3.1-py3-none-any.whl": "a7a39a3bd276781e98394987d3a5701d0c4edffb633bb7a5144577f82c773598",
    "wheels/fastapi-0.146.0-py3-none-any.whl": "0eb9985a7d5bb11ce9a962d4b65e0cf1a2e13d6aca2e14da57bc526370e26748",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.7.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "2814a6e999d13464c4d679b788cc5d784eb5a4edfc638a31f10e9a11ab531ef8",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/huggingface_hub-1.33.0-py3-none-any.whl": "04e434b06e100eddbce9a6e817d72693a7884b10a79bd67ab48080d5c07eb899",
    "wheels/markdown_it_py-4.2.0-py3-none-any.whl": "9f7ebbcd14fe59494226453aed97c1070d83f8d24b6fc3a3bcf9a38092641c4a",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/opentelemetry_api-1.45.1-py3-none-any.whl": "b31553efa588ae44bc306f863c785c5333a9ecc091248c6ee68b4b6c87fdedfb",
    "wheels/peft-0.18.1-py3-none-any.whl": "0bf06847a3551e3019fc58c440cffc9a6b73e6e2962c95b52e224f77bbdb50f1",
    "wheels/pydantic-2.13.5-py3-none-any.whl": "346a034f080da3755d8e9cb5e00e8b07de1d39e4f6e2c87d8ab7cafa0b269a73",
    "wheels/pydantic_core-2.46.5-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "49776eab08766a08dfff7012f8b422dcd7e25e43b316eedf0477c24fcfa84b7c",
    "wheels/regex-2026.9.29-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "612b709381c0355b70d89cdb51b7f670591ed5cbbc0e3b5337488019dc667b65",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/starlette-1.9.0-py3-none-any.whl": "fd3f159936e882d06c1108f84688f7cda2cf85fc6a592a50edbd175e882c2ddc",
    "wheels/tokenizers-0.23.3-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "376851d22bcf9d650a5c3090bb83e6cf9e895fbf0595369fa4cd43c1f69b5f87",
    "wheels/tomli-2.5.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "d7e369fd63331746182360977b1892bfc215476a30d61612d732425311639f56",
    "wheels/transformers-5.20.1-py3-none-any.whl": "5f51ce444193e5d0a751e3fa489ddbc2224ff12f6675a5cfefd4044b09757c19",
    "wheels/typer-0.27.3-py3-none-any.whl": "e50022f28b82a86313e54501317a1db64bf8f8d036ff8cfe5ca7e47675454aff",
    "wheels/typing_inspection-0.4.4-py3-none-any.whl": "65b8397ba37ccbce054456aaccddfc91e6e3083c92824df348d96ca832f3f147",
    "wheels/uvicorn-0.54.0-py3-none-any.whl": "505bdb0f318731d45f1f712071fc781a8981f6847a31c902c9f5e652d4f67faf",
    "Dockerfile.runtime-supplement": "84e6092d9d5f7e438cf7299bf68facc99e880084fab96e2bc0397bc30cc4da31",
    "runtime-supplement-requirements.lock.txt": "8c776c982aa4f2072cbccef00351964f7ac0017407e6f043a8fa65c4bc7958c5"
}
MEMBER_LIMIT = 268435456
CONTEXT_LIMIT = 536870912
REMOTE_ROOT = '/runtime-supplement/chon'
BUILD_TIMEOUT_S = 1800
SCP_TIMEOUT_S = 1800
DEFAULT_RUN_WAIT_S = 3600
RUN_WAIT_MARGIN_S = 900  # logs, raw download, receipts and exact-ID teardown before the attempt TTL ends

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
    # ~28 MB of pinned public wheels; a generous timeout for slow pod uplinks (8c7dbe11 lesson).
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


def run_wait_seconds(attempt_started_at, ttl_hours, now=None):
    """Run-container wait for this order: what is left of the attempt TTL minus the teardown margin, at least the
    default hour. A missing or unreadable start time keeps the default."""
    try:
        started = datetime.fromisoformat(attempt_started_at)
        if started.tzinfo is None:
            raise ValueError
        elapsed = ((now or datetime.now(timezone.utc)) - started).total_seconds()
        left = float(ttl_hours) * 3600 - max(elapsed, 0.0) - RUN_WAIT_MARGIN_S
    except (TypeError, ValueError):
        return DEFAULT_RUN_WAIT_S
    return int(max(DEFAULT_RUN_WAIT_S, left))
