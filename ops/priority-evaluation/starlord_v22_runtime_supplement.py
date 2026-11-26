"""Fixed-order offline runtime supplement for Starlord-4B-v2.2-preview (paid fast-lane order b4539ae2) and Starlord-27B-v2.2-preview
(paid fast-lane order 3613f4c1), CR-879.

Both are Qwen3.5-4B / Qwen3.8-27B finetunes from the same author (xsdfasfgsa) read out through candidate logits (no generation), served by the
customer's own stdlib-HTTP inference/serve_systemone.py (POST /v1/systemone) on one GPU. The two repositories ship byte-identical
requirements.txt / inference/requirements.txt and README install blocks; their recorded stack is Python 3.11, torch 2.9.0+cu128,
transformers 5.3.0, accelerate 1.15.0, safetensors 0.6.2, tokenizers 0.22.1, huggingface-hub 1.4.1, flash-attn 2.8.3,
flash-linear-attention 0.4.1, fla-core 0.4.1 and causal-conv1d 1.7.0. It is the reviewed Starlord v2 stack (starlord_v2_runtime_supplement.py)
moved to torch 2.9.0+cu128 / Python 3.11, plus causal-conv1d: v2.2's inference/s2b_graph_engine.py replaces the v2.0 triton reference
convolution with causal_conv1d.causal_conv1d_fn.

The digest-pinned official PyTorch 2.9.0 CUDA 12.8 devel image (Python 3.11 in /opt/conda, nvcc, gcc, ninja, setuptools, wheel) already
carries the exact torch build and triton 3.5.0. This supplement overlays the rest offline, every artefact SHA-256 pinned:
* PyPI wheels: the reviewed v2 pure-Python/abi3 wheels with unchanged pins, and the cp311 builds of pydantic-core 2.50.4 and regex 2026.11.9;
* causal-conv1d: the exact GitHub release asset the README installs (Dao-AILab/causal-conv1d v1.7.0, cu12torch2.9cxx11abiTRUE cp311,
  sha256 815388d4..., the bytes the reviewed jeva/torchcast supplements carry) under the standard wheel name;
* flash-attn: no official cu12/torch2.9/cp311 wheel exists (release v2.8.3 ships torch 2.9 builds for cp312 only), so, like the author's
  own `pip install -r inference/requirements.txt`, the build compiles the PyPI sdist (sha256 1e71dd64...) against the base torch, with
  network none, FLASH_ATTENTION_FORCE_BUILD=TRUE (no release-wheel download) and FLASH_ATTN_CUDA_ARCHS="90;120" (Hopper, the README hardware, and Blackwell RTX PRO 6000);
* decision_index: only the three stdlib-only files on the customer's import path (decision_index.engines.base) from the public MIT kit
  github.com/apolinario/decision-index at the README-named commit 25c6ec7b, copied into site-packages.
The customer code is mounted from the model repository by the trusted runner; this host module imports no model stack and executes no
customer code. Admission is an explicit list of exact order ids (no wildcard, no repository match) or a host-registry admission.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import order_admission_registry
import pod_runner

ORDER = 'b4539ae2-d626-482e-aaf6-05ae4f564eb2'
ORDER_27B = '3613f4c1-7212-46f0-b3d3-357748a7560c'
ORDERS = frozenset({ORDER, ORDER_27B})  # exact paid orders only, never a pattern
BASE_IMAGE = 'pytorch/pytorch:2.9.0-cuda12.8-cudnn9-devel@sha256:97ec2a667dd7560c615bf50a95b2fb85a673ae233a55da1706e8e04e6d6d518e'
CONTEXT = Path('/home/flori/jobs/fastlane-native-b4539ae2/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = 'c81095742e6c6815ad4bf614a142de84c0db33160fc96cc469f47884028ee8bf'
FILES = {
    "Dockerfile.runtime-supplement": "66fe2fbec73a19af6323742e76430372e62d35687d4e450b39b766a2cffabaf4",
    "decision_index_min/LICENSE": "3445fa3344098a37d88d2d0c24e39cf6c8a1d63a9478d52668db2acfda21f6ab",
    "decision_index_min/decision_index/__init__.py": "802fef8d0a617d28cd906facf8582b707ca7baa35475ce834ef8af41ab9aa54f",
    "decision_index_min/decision_index/engines/__init__.py": "808a0971ad2ce9f9a1afc3c071691001375aa73b26f3ba891beb8364dcabba77",
    "decision_index_min/decision_index/engines/base.py": "ae548636cfbd583fe774b67e4d3d2cdc6db10f580f47d9559d5de44373b79ca5",
    "flash-attn-sdist.lock.txt": "8e15ff9f0daa7b5f8d83ccd8fff6b1ec35035929dccafc44ecc4ce528759bc0e",
    "runtime-supplement-requirements.lock.txt": "069b8ad08e2c65d38cd5dbfa2cedc0b01cb8d2e42bc9d7f26fe5f4c71098aded",
    "sdist/flash_attn-2.8.3.tar.gz": "1e71dd64a9e0280e0447b8a0c2541bad4bf6ac65bdeaa2f90e51a9e57de0370d",
    "wheels/accelerate-1.15.0-py3-none-any.whl": "97eacca0b73e45cb867dbf8c5d5d4dc32219544300e0c8992c7334dc2ef33cec",
    "wheels/annotated_doc-0.0.6-py3-none-any.whl": "361ca0950cc7082f53fa69e9328409f40a62c61e57e0a47e1825a08078a58a53",
    "wheels/annotated_types-0.8.0-py3-none-any.whl": "f072f4d804ea359e4eaf198b1af7a8b0943881a87f31bb764f8bf219bb9419e0",
    "wheels/anyio-4.16.0-py3-none-any.whl": "c66ae634e0b8228396b801741beb3294326d4b6102f7bba4041c0dfb58c29026",
    "wheels/causal_conv1d-1.7.0-cp311-cp311-linux_x86_64.whl": "815388d4c13bd1cc578f3a148c5892630c14c7ae455295f9ad52e648d1cb8d8b",
    "wheels/einops-0.8.2-py3-none-any.whl": "54058201ac7087911181bfec4af6091bb59380360f069276601256a76af08193",
    "wheels/fla_core-0.4.1-py3-none-any.whl": "93c6afe4c80fc7bc705fa8aeea6a46d2cf2d77383f9619a41863c7114c801bab",
    "wheels/flash_linear_attention-0.4.1-py3-none-any.whl": "d18bdfe9d1f4b424676444eac9d50fb8433b70e5d4e0e0878b20bcbcdbea57ce",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.8.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "29dab7c904cd1914a0439c6e1306c12c7497c8bd32290fbe563ebf51ca4b6d6d",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/huggingface_hub-1.4.1-py3-none-any.whl": "9931d075fb7a79af5abc487106414ec5fba2c0ae86104c0c62fd6cae38873d18",
    "wheels/markdown_it_py-4.3.0-py3-none-any.whl": "7aa1511a46c39138de78d9eba92ce47e63124d8003fc98b3a351909e04239efa",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/pydantic-2.14.3-py3-none-any.whl": "3f7b347782ab7e4cf4c798496ae3a82787d9f21ec12676a9c564355eeef8daa8",
    "wheels/pydantic_core-2.50.4-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "0574866e05f6adeecc520d87e87dd06210c0a51706341f6ef8421572f5a64444",
    "wheels/regex-2026.11.9-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "0447593c5f4e2b88446da7466c83fc913ddf191600bbb7aebc6c8856595ccfb1",
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
REMOTE_ROOT = '/runtime-supplement/starlord-v22'
BUILD_TIMEOUT_S = 5400  # flash-attn 2.8.3 compiles from its sdist (72 kernels x sm_90 + sm_120)
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
    """Only the listed orders' reviewed http_typesafe recipe on the exact pinned base selects the supplement.
    A host-registry admission (order_admission_registry, `fastlane-admit`) counts like a listed order."""
    return (isinstance(recipe, dict) and recipe.get('kind') == 'http_typesafe'
            and recipe.get('image') == BASE_IMAGE
            and (Path(job).name in ORDERS
                 or order_admission_registry.admitted(Path(job).name, __file__, BASE_IMAGE, CONTEXT_SHA)))

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
    # ~220 MB of pinned public artefacts (causal-conv1d alone is 197 MB); a generous timeout for slow pod uplinks (8c7dbe11 lesson).
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
