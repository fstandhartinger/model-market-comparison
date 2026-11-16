"""Fixed-order offline runtime supplement for Starlord-27B-v2.0-preview (paid fast-lane order 6b7af363) and Starlord-4B-preview
(paid fast-lane order c5a084fa, CR-759).

Starlord-27B-v2.0-preview is a Qwen/Qwen3.8-27B finetune read out through candidate logits (no generation), served by the customer's own
stdlib-HTTP inference/serve_systemone.py (POST /v1/systemone) on one GPU. The author's recorded stack is torch 2.10.0+cu130,
transformers 5.3.0, accelerate 1.15.0, safetensors 0.6.2, tokenizers 0.22.1, huggingface-hub 1.4.1, flash-attn 2.8.3,
flash-linear-attention 0.4.1 and fla-core 0.4.1. It is the reviewed Starlord-27B-preview stack (starlord_runtime_supplement.py,
order 2d2f81c6) plus flash-attn: v2.0's inference/bidir_attention.py runs the full-attention layers through
flash_attn.flash_attn_varlen_func. The digest-pinned official PyTorch 2.10.0 CUDA 13.0 devel image (Python 3.12, gcc) already carries
the exact torch build and triton 3.6.0; this supplement overlays the rest as SHA-256-pinned public wheels: PyPI wheels, and for
flash-attn (PyPI has only the sdist) the official upstream release asset that the sdist's own setup.py downloads
(github.com/Dao-AILab/flash-attention v2.8.3, cu13torch2.10cxx11abiTRUE cp312 x86_64), stored under the standard wheel name with
unchanged bytes. The customer code imports decision_index.engines.base from the public MIT kit github.com/apolinario/decision-index;
only its three stdlib-only files on that import path, from the README-named commit 25c6ec7b, are copied into site-packages. The Docker
build is offline and uses only the pinned context members. The customer code is mounted from the model repository by the trusted
runner; this host module imports no model stack and executes no customer code.

Starlord-4B-preview (same author, Qwen3.5-4B base) ships byte-identical inference/vendor/*, serve_systemone.py, bidir_attention.py,
bidir_forward.py, bidir_prefix.py, jevbench.py and requirements.txt (same recorded stack incl. flash-attn 2.8.3); only direct_engine.py
differs (4B shape checks plus an input-repetition readout using the same imports). It therefore reuses this exact pinned context; admission
stays an explicit list of exact order ids (no wildcard, no repository match).
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '6b7af363-cef5-4517-b3fa-4ca5055fbca4'
ORDERS = frozenset({ORDER, 'c5a084fa-0c3b-4fd5-ab69-e69f9b6a7116'})
BASE_IMAGE = 'pytorch/pytorch:2.10.0-cuda13.0-cudnn9-devel@sha256:48af19ebb88034e0325decc2b6142e5b9bfc276eaa5197ab6d94582f1d78ea4c'
CONTEXT = Path('/home/flori/jobs/fastlane-native-6b7af363/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = '94110a61f5fadd9175c8c8907a9bd99e244115e7b52d71b2ee3855f3f677ce4c'
FILES = {
    "Dockerfile.runtime-supplement": "2a2f89029672c5108713f5e28c9873a45bff93afbe5a153794bb98d0eab968d0",
    "decision_index_min/LICENSE": "3445fa3344098a37d88d2d0c24e39cf6c8a1d63a9478d52668db2acfda21f6ab",
    "decision_index_min/decision_index/__init__.py": "802fef8d0a617d28cd906facf8582b707ca7baa35475ce834ef8af41ab9aa54f",
    "decision_index_min/decision_index/engines/__init__.py": "808a0971ad2ce9f9a1afc3c071691001375aa73b26f3ba891beb8364dcabba77",
    "decision_index_min/decision_index/engines/base.py": "ae548636cfbd583fe774b67e4d3d2cdc6db10f580f47d9559d5de44373b79ca5",
    "runtime-supplement-requirements.lock.txt": "94fd821c8a14c03899e9b639de5cbcd1785fc21daf6f5f1d2aa19d6830f829a3",
    "wheels/accelerate-1.15.0-py3-none-any.whl": "97eacca0b73e45cb867dbf8c5d5d4dc32219544300e0c8992c7334dc2ef33cec",
    "wheels/annotated_doc-0.0.6-py3-none-any.whl": "361ca0950cc7082f53fa69e9328409f40a62c61e57e0a47e1825a08078a58a53",
    "wheels/annotated_types-0.8.0-py3-none-any.whl": "f072f4d804ea359e4eaf198b1af7a8b0943881a87f31bb764f8bf219bb9419e0",
    "wheels/anyio-4.16.0-py3-none-any.whl": "c66ae634e0b8228396b801741beb3294326d4b6102f7bba4041c0dfb58c29026",
    "wheels/einops-0.8.2-py3-none-any.whl": "54058201ac7087911181bfec4af6091bb59380360f069276601256a76af08193",
    "wheels/fla_core-0.4.1-py3-none-any.whl": "93c6afe4c80fc7bc705fa8aeea6a46d2cf2d77383f9619a41863c7114c801bab",
    "wheels/flash_attn-2.8.3-cp312-cp312-linux_x86_64.whl": "910d8db9def162de5b7c15474b933e7e2371e93733b980e9d3c07cd3bf2f568e",
    "wheels/flash_linear_attention-0.4.1-py3-none-any.whl": "d18bdfe9d1f4b424676444eac9d50fb8433b70e5d4e0e0878b20bcbcdbea57ce",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.8.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "29dab7c904cd1914a0439c6e1306c12c7497c8bd32290fbe563ebf51ca4b6d6d",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/huggingface_hub-1.4.1-py3-none-any.whl": "9931d075fb7a79af5abc487106414ec5fba2c0ae86104c0c62fd6cae38873d18",
    "wheels/markdown_it_py-4.3.0-py3-none-any.whl": "7aa1511a46c39138de78d9eba92ce47e63124d8003fc98b3a351909e04239efa",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/pydantic-2.14.3-py3-none-any.whl": "3f7b347782ab7e4cf4c798496ae3a82787d9f21ec12676a9c564355eeef8daa8",
    "wheels/pydantic_core-2.50.4-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "c81d98e27d9d9261909dcccab1ba5d6ea1c98b0bb9470e368604614fd1d36ddd",
    "wheels/regex-2026.11.9-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "ab4a0c5cd3df4b93841ba4a419a5438b2a4c78a4e418682fc674e3f50d56b857",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.6.2-cp38-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "8045db2c872db8f4cbe3faa0495932d89c38c899c603f21e9b6486951a5ecb8f",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/tokenizers-0.22.1-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "e2ef6063d7a84994129732b47e7915e8710f27f99f3a3260b8a38fc7ccd083f4",
    "wheels/tqdm-4.70.1-py3-none-any.whl": "c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73",
    "wheels/transformers-5.3.0-py3-none-any.whl": "50ac8c89c3c7033444fb3f9f53138096b997ebb70d4b5e50a2e810bf12d3d29a",
    "wheels/typer-0.29.1-py3-none-any.whl": "00dbc549c13428bec1be55fe1f4d0fb8c6637a310e4f178ef14abe9534ee7b58",
    "wheels/typer_slim-0.24.0-py3-none-any.whl": "d5d7ee1ee2834d5020c7c616ed5e0d0f29b9a4b1dd283bdebae198ec09778d0e",
    "wheels/typing_extensions-4.16.0-py3-none-any.whl": "481caa481374e813c1b176ada14e97f1f67a4539ce9cfeb3f350d78d6370c2e8",
    "wheels/typing_inspection-0.4.5-py3-none-any.whl": "bc210535442b39e1bf2805e0c7a17dfd6a4ace760c84c7f7d16245d23a6b1c39"
}
MEMBER_LIMIT = 268435456
CONTEXT_LIMIT = 536870912
REMOTE_ROOT = '/runtime-supplement/starlord-v2'
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
    """Only the listed orders' reviewed http_typesafe recipe on the exact pinned base selects the supplement."""
    return (Path(job).name in ORDERS and isinstance(recipe, dict) and recipe.get('kind') == 'http_typesafe'
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
    # ~270 MB of pinned public wheels (flash-attn alone is 244 MB); a generous timeout for slow pod uplinks (8c7dbe11 lesson).
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
