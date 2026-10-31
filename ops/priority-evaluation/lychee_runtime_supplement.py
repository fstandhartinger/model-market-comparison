"""Fixed-order offline runtime supplement for Lychee-27B (paid fast-lane order a5d49ab5).

The author documents a pip venv (Python 3.12, torch 2.14.0, transformers 5.17.0, tokenizers 0.23.2, safetensors
0.8.0, flash-linear-attention 0.5.2, kernels 0.16.1) that no official image contains. This supplement overlays the
digest-pinned official PyTorch 2.14.0 CUDA 12.6 devel image (Python 3.12, its own torch 2.14.0/Triton 3.8.0 builds;
devel because Triton compiles its launcher with gcc at run time) with SHA-256-pinned public PyPI wheels for the
documented packages and their missing dependencies. The Docker build is offline and uses only the pinned context
members. The customer serving package is mounted from the model repository by the trusted runner; this host module
imports no model stack and executes no customer code.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner
import supplement_admission

ORDER = 'a5d49ab5-d91f-4545-9f23-6fbce4a33021'
BASE_IMAGE = 'pytorch/pytorch:2.14.0-cuda12.6-cudnn9-devel@sha256:0e968d2570373aeb781603c21925a030053b432945967da14f6f8423e1f0cc79'
CONTEXT = Path('/home/flori/jobs/fastlane-lychee27b-native-20261013/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = 'bb14a285aff19539af8efa72c355312eaf290da611e47dc9ce3c6b84f6b6f516'
FILES = {
    "Dockerfile.runtime-supplement": "20f7d3e19a3ea8f807bf941863e6359918982c81d66954ca7339b4863768a5d7",
    "runtime-supplement-requirements.lock.txt": "5f6a1c094a075aab82660f63b1378a38a101348141931adbfcb952742cba35dc",
    "wheels/annotated_doc-0.0.5-py3-none-any.whl": "117bac03a25ede5df5440e855b32d556049ca169ead221505badf432fed4b101",
    "wheels/annotated_types-0.8.0-py3-none-any.whl": "f072f4d804ea359e4eaf198b1af7a8b0943881a87f31bb764f8bf219bb9419e0",
    "wheels/anyio-4.15.1-py3-none-any.whl": "6152fdbbf9a77fdec97731721bebf7c4c44f7c29b424b0065826173efc7ed101",
    "wheels/cffi-2.1.1-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "c1453022f490d2459a11819d83ad1d586e9ff65a12ac3e705ffebd46d3685dcf",
    "wheels/cryptography-50.0.2-cp311-abi3-manylinux_2_28_x86_64.whl": "4061c0079120205fb760c58acab6443e217307dcf05e3702cf970e0689972856",
    "wheels/einops-0.8.2-py3-none-any.whl": "54058201ac7087911181bfec4af6091bb59380360f069276601256a76af08193",
    "wheels/email_validator-2.3.0-py3-none-any.whl": "80f13f623413e6b197ae73bb10bf4eb0908faf509ad8362c5edeb0be7fd450b4",
    "wheels/fla_core-0.5.2-py3-none-any.whl": "5e830c85bad3d0d34677f98ac7074d08687a3756f0f0499d95ceb96eb6920761",
    "wheels/flash_linear_attention-0.5.2-py3-none-any.whl": "dcf405d81f5426393b59037097aa700d0f4a841465d5028d5aa543f4502f2400",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.7.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "2814a6e999d13464c4d679b788cc5d784eb5a4edfc638a31f10e9a11ab531ef8",
    "wheels/httpcore-1.0.9-py3-none-any.whl": "2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55",
    "wheels/httpx-0.28.1-py3-none-any.whl": "d909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad",
    "wheels/huggingface_hub-1.16.1-py3-none-any.whl": "64340de934b9ce37857ef85a82de72f5629e8a270f9119eabb12bf495eb53c22",
    "wheels/id-1.6.1-py3-none-any.whl": "f5ec41ed2629a508f5d0988eda142e190c9c6da971100612c4de9ad9f9b237ca",
    "wheels/kernels-0.16.1-py3-none-any.whl": "db3a1dc1760e86ef97c04e97a9ed6cf2ad833b244213319f12b93bd4b0d58597",
    "wheels/kernels_data-0.16.2-cp38-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "9526362517c7b128f7baec080301890875cc3f5284a0f125b082c19737e5c1d5",
    "wheels/markdown_it_py-4.2.0-py3-none-any.whl": "9f7ebbcd14fe59494226453aed97c1070d83f8d24b6fc3a3bcf9a38092641c4a",
    "wheels/mdurl-0.1.2-py3-none-any.whl": "84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8",
    "wheels/platformdirs-4.13.0-py3-none-any.whl": "3dbcf4cd708f21cf876c4eaa90e58412bc4f033d87143f41b1493ff77c25b7e1",
    "wheels/pyasn1-0.6.4-py3-none-any.whl": "deda9277cfd454080ec40b207fb6df82206a3a2688735233cdcd8d3d565f088b",
    "wheels/pycparser-3.11-py3-none-any.whl": "51d5a8ba2be0bbe440b99d2112604c95bbbc3c2748a64260186c541e1729cd80",
    "wheels/pydantic-2.14.1-py3-none-any.whl": "9195d967ec791692a04438115466764fb8b9a27b31f14a760437694f40d6b454",
    "wheels/pydantic_core-2.50.1-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "93ba4e9d8210d941c200431a56b2c0400b131865947903937ed3ec5404307d2e",
    "wheels/pyjwt-2.15.1-py3-none-any.whl": "42d59d631f7768a1028a64c7ff581a9bf7519804daf91fc5b6c56e30eec5e193",
    "wheels/pyopenssl-26.4.0-py3-none-any.whl": "f0eb0cb2d581d3ad2b9c489468485e7f2ab6727d08401bcf9d824c3caddf3c1c",
    "wheels/regex-2026.9.29-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "39ab5894d971f9ac68baa6eca5c50387db579cfcacf36ae8df3feceb1815e6d0",
    "wheels/rfc3161_client-1.0.9-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fac3f440a507555e684dc5daba75e33dc08f0f45fdefa48448f19001233a6b21",
    "wheels/rfc8785-0.1.4-py3-none-any.whl": "520d690b448ecf0703691c76e1a34a24ddcd4fc5bc41d589cb7c58ec651bcd48",
    "wheels/rich-15.0.0-py3-none-any.whl": "33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb",
    "wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774",
    "wheels/securesystemslib-1.5.1-py3-none-any.whl": "ada8bdf817da29ece4ba91654f6a162ce7cfbadbc3ae3f840f7313f9d22675de",
    "wheels/shellingham-1.5.4-py2.py3-none-any.whl": "7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686",
    "wheels/sigstore-4.5.0-py3-none-any.whl": "f045b207f2e12605cf775ec38e89c5eda625d71ffa7830477db65e47ec2bc8b2",
    "wheels/sigstore_models-0.0.6-py3-none-any.whl": "5201a68f4d7d0f8bec1e2f4378eb646b084c52609a4e31db8c385095fff68b2e",
    "wheels/sigstore_rekor_types-0.0.18-py3-none-any.whl": "b62bf38c5b1a62bc0d7fe0ee51a0709e49311d137c7880c329882a8f4b2d1d78",
    "wheels/tokenizers-0.23.2-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": "41c2f84d172449b4dadb9cdc508e3e364076613c35b16e76ecfe47a60d1e3305",
    "wheels/tomlkit-0.15.1-py3-none-any.whl": "177a05aece5a8ca5266fd3c448abb47b8d352f09d477d3ca8332db4d89b24304",
    "wheels/tqdm-4.70.1-py3-none-any.whl": "c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73",
    "wheels/transformers-5.17.0-py3-none-any.whl": "78ec1ce21579b38dfb83950a0658cd119f87212a2fcfdff478096ce9d6c03801",
    "wheels/tuf-7.0.1-py3-none-any.whl": "d30434bda6e079ab303fb30d1b3006d939a10ca34783b1573d61cd9b802fa45c",
    "wheels/typer-0.27.3-py3-none-any.whl": "e50022f28b82a86313e54501317a1db64bf8f8d036ff8cfe5ca7e47675454aff",
    "wheels/typing_inspection-0.4.4-py3-none-any.whl": "65b8397ba37ccbce054456aaccddfc91e6e3083c92824df348d96ca832f3f147"
}
FAMILY = 'lychee'
MEMBER_LIMIT = 268435456
CONTEXT_LIMIT = 536870912
REMOTE_ROOT = '/runtime-supplement/lychee'
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
            and (Path(job).name == ORDER or supplement_admission.admitted(job, FAMILY)))

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
    # ~37 MB of pinned public wheels; a generous timeout for slow pod uplinks (8c7dbe11 lesson).
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
