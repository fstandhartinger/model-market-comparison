"""Fixed-order offline runtime supplement for Minimodels Decision 1.0 (candy-cane) (paid fast-lane order f62aeab1).

Minimodels Decision 1.0 is a google/gemma-4-31B-it system (MLX 4-bit affine checkpoint dequantized to bf16 + one LoRA adapter + a
temperature calibration file) served by the customer's own stdlib-HTTP scripts/serve_torch_jev.py (POST /v1/systemone) on one GPU. The
author's Dockerfile builds on pytorch/pytorch:2.7.0-cuda12.8-cudnn9-runtime (Python 3.11, torch 2.7.0+cu128) and pip-installs
lower-bounded numpy, scipy, safetensors, accelerate, sentencepiece, protobuf, huggingface_hub, hf_xet and transformers>=5.5.0. This
supplement pins that base by registry digest and overlays the releases pip resolves on the commit date (transformers 5.23.0,
huggingface-hub 2.4.0, tokenizers 0.23.3, safetensors 0.8.0, accelerate 1.15.0, scipy 1.17.1 and their missing dependencies; the base's
numpy 2.2.5 is kept) as SHA-256-pinned public PyPI wheels. The Docker build is offline and uses only the pinned context members. The
customer code is mounted from the model repository by the trusted runner; this host module imports no model stack and executes no
customer code.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = 'f62aeab1-97ee-4340-85de-a4a513757a6d'
BASE_IMAGE = 'pytorch/pytorch:2.7.0-cuda12.8-cudnn9-runtime@sha256:7db0e1bf4b1ac274ea09cf6358ab516f8a5c7d3d0e02311bed445f7e236a5d80'
CONTEXT = Path('/home/flori/jobs/fastlane-native-f62aeab1/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = '12c27a7f5f1b55551b801de6e16e4c664cc938d2abf92f8baebbb0779afe24b5'
FILES = {
    "Dockerfile.runtime-supplement": "3ff49d731486375dc75bc0ca4d899816924a6751f9e9942502d89f59f12e7d3b",
    "runtime-supplement-requirements.lock.txt": "503b7c00350a195b138766f537da967f3c142d53e683c56ea093e89b45b040a3",
    "wheels/accelerate-1.15.0-py3-none-any.whl": "97eacca0b73e45cb867dbf8c5d5d4dc32219544300e0c8992c7334dc2ef33cec",
    "wheels/annotated_doc-0.0.6-py3-none-any.whl": "361ca0950cc7082f53fa69e9328409f40a62c61e57e0a47e1825a08078a58a53",
    "wheels/annotated_types-0.8.0-py3-none-any.whl": "f072f4d804ea359e4eaf198b1af7a8b0943881a87f31bb764f8bf219bb9419e0",
    "wheels/anyio-4.16.0-py3-none-any.whl": "c66ae634e0b8228396b801741beb3294326d4b6102f7bba4041c0dfb58c29026",
    "wheels/click-8.5.1-py3-none-any.whl": "8bb5376d2006950386f8c6427613334a2acadc5f559cb80e638d00b4df957e37",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.8.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "29dab7c904cd1914a0439c6e1306c12c7497c8bd32290fbe563ebf51ca4b6d6d",
    "wheels/httpcore2-2.16.0-py3-none-any.whl": "5c4358319f2602d984ad93182c9fee5160f22e9da7babdda870a5e7c4e2dc34f",
    "wheels/httpx2-2.16.0-py3-none-any.whl": "fd2c5d7909e8d86fe92d53020c310ca0e4e431b838c207c5754b9bbf0308d49a",
    "wheels/huggingface_hub-2.4.0-py3-none-any.whl": "42ecfd93ede47bdd333daebbf66a32d7bfe2e18752754fe4d2d4f98a0179d801",
    "wheels/idna-3.20-py3-none-any.whl": "ab7ae7122974553370f0bdb919e1a960b2cd1bc1ef0276416d896db81c14582c",
    "wheels/markdown_it_py-4.3.0-py3-none-any.whl": "7aa1511a46c39138de78d9eba92ce47e63124d8003fc98b3a351909e04239efa",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/protobuf-7.36.2-cp310-abi3-manylinux2014_x86_64.whl": "89f23aa53c24553a2416fd4fd1ec06f74fa42b14b546d8883128813f775bbfd2",
    "wheels/pydantic-2.14.3-py3-none-any.whl": "3f7b347782ab7e4cf4c798496ae3a82787d9f21ec12676a9c564355eeef8daa8",
    "wheels/pydantic_core-2.50.4-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "0574866e05f6adeecc520d87e87dd06210c0a51706341f6ef8421572f5a64444",
    "wheels/regex-2026.11.9-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "0447593c5f4e2b88446da7466c83fc913ddf191600bbb7aebc6c8856595ccfb1",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774",
    "wheels/scipy-1.17.1-cp311-cp311-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "43af8d1f3bea642559019edfe64e9b11192a8978efbd1539d7bc2aaa23d92de4",
    "wheels/sentencepiece-0.2.3-cp311-cp311-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "141dc0bef1e28a5cf7e41c8354ad6cc14525758278045286dcb5429b9906d39f",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/tokenizers-0.23.3-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "376851d22bcf9d650a5c3090bb83e6cf9e895fbf0595369fa4cd43c1f69b5f87",
    "wheels/transformers-5.23.0-py3-none-any.whl": "018e82fd07490ad5bb58414f65e31576033dc7f36bed10c574843f69b90991bf",
    "wheels/typer-0.29.1-py3-none-any.whl": "00dbc549c13428bec1be55fe1f4d0fb8c6637a310e4f178ef14abe9534ee7b58",
    "wheels/typing_extensions-4.16.0-py3-none-any.whl": "481caa481374e813c1b176ada14e97f1f67a4539ce9cfeb3f350d78d6370c2e8",
    "wheels/typing_inspection-0.4.5-py3-none-any.whl": "bc210535442b39e1bf2805e0c7a17dfd6a4ace760c84c7f7d16245d23a6b1c39"
}
MEMBER_LIMIT = 268435456
CONTEXT_LIMIT = 536870912
REMOTE_ROOT = '/runtime-supplement/minimodels-decision'
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
    # ~75 MB of pinned public wheels; a generous timeout for slow pod uplinks (8c7dbe11 lesson).
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
