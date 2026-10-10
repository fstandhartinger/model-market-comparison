"""Fixed-order offline runtime supplement for Standard One 8B SH (paid fast-lane order a8731403).

The author documents one stack: PyTorch 2.11 / CUDA 12.8 plus `pip install -r code/requirements.txt`
(torch>=2.4, transformers==5.12.1, peft==0.21.0, safetensors). No public image carries it (vLLM v0.30.0 has
transformers 5.17.0 and no peft, which the reference server imports unconditionally). The host therefore builds
that stack on the owned pod before any weights or inputs arrive: the official PyTorch image the reviewed recipe
pins (already pulled and digest-checked by pod_runner) plus PyPI wheels pinned by SHA-256, installed by
`docker build --network none --pull=false` with `pip --no-index --require-hashes`. The derived image id replaces
the recipe image for the weight download and the offline run container; every other gate is unchanged.

Host side is stdlib-only and imports or executes no customer code. The build context holds only public PyPI
wheels, the hash-locked requirements file and the Dockerfile; each member is pinned below.
"""
import hashlib
import re
import tarfile
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = 'a8731403-9731-4d57-98b4-0c5d93952ad2'
BASE_IMAGE = ('pytorch/pytorch:2.11.0-cuda12.8-cudnn9-runtime'
              '@sha256:eee11b3b3872a8c838e35ef48f08b2d5def2080902c7f666831310ca1a0ef2be')
CONTEXT = Path('/home/flori/jobs/fastlane-standardone-native-20261010/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = 'ebc50ddaf4e1d0fbdeac7cc98e8cdde92abc7535fb28e7f5fe4155c13fceb800'
FILES = {
    'Dockerfile.runtime-supplement': '1d8ba7c7fce44b2008b0ebda870ebe8b34d582958a87cca26e271832a235ec5c',
    'runtime-supplement-requirements.txt': '1631b7987f0b42084f1c5825930f6862adb61ef8f4aa9a5bc5d405b03e31131f',
    'wheels/accelerate-1.15.0-py3-none-any.whl': '97eacca0b73e45cb867dbf8c5d5d4dc32219544300e0c8992c7334dc2ef33cec',
    'wheels/annotated_doc-0.0.5-py3-none-any.whl': '117bac03a25ede5df5440e855b32d556049ca169ead221505badf432fed4b101',
    'wheels/anyio-4.14.2-py3-none-any.whl': '9f505dda5ac9f0c8309b5e8bd445a8c2bf7246f3ce950121e45ea15bc41d1494',
    'wheels/h11-0.16.0-py3-none-any.whl': '63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86',
    'wheels/hf_xet-1.7.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl': '2814a6e999d13464c4d679b788cc5d784eb5a4edfc638a31f10e9a11ab531ef8',
    'wheels/httpcore-1.0.9-py3-none-any.whl': '2d400746a40668fc9dec9810239072b40b4484b640a8c38fd654a024c7a1bf55',
    'wheels/httpx-0.28.1-py3-none-any.whl': 'd909fcccc110f8c7faf814ca82a9a4d816bc5a6dbfea25d6591d6985b8ba59ad',
    'wheels/huggingface_hub-1.16.1-py3-none-any.whl': '64340de934b9ce37857ef85a82de72f5629e8a270f9119eabb12bf495eb53c22',
    'wheels/markdown_it_py-4.2.0-py3-none-any.whl': '9f7ebbcd14fe59494226453aed97c1070d83f8d24b6fc3a3bcf9a38092641c4a',
    'wheels/mdurl-0.1.2-py3-none-any.whl': '84008a41e51615a49fc9966191ff91509e3c40b939176e643fd50a5c2196b8f8',
    'wheels/peft-0.21.0-py3-none-any.whl': 'b64eb75fd9dece7401c70e675b8d9de024993b70483691b41c62876f0c7809b7',
    'wheels/regex-2026.9.29-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl': '39ab5894d971f9ac68baa6eca5c50387db579cfcacf36ae8df3feceb1815e6d0',
    'wheels/rich-15.0.0-py3-none-any.whl': '33bd4ef74232fb73fe9279a257718407f169c09b78a87ad3d296f548e27de0bb',
    'wheels/safetensors-0.8.0-cp310-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl': 'fd6f3f93c9a0a7cc2788ee63fb763353d4bd2e89b0751bc78fcf7dda00bea774',
    'wheels/shellingham-1.5.4-py2.py3-none-any.whl': '7ecfff8f2fd72616f7481040475a65b2bf8af90a56c89140852d1120324e8686',
    'wheels/tokenizers-0.22.2-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl': '369cc9fc8cc10cb24143873a0d95438bb8ee257bb80c71989e3ee290e8d72c67',
    'wheels/tqdm-4.70.1-py3-none-any.whl': 'c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73',
    'wheels/transformers-5.12.1-py3-none-any.whl': '2a5e109d2021265df7098ffbb738295acaf5ad256f12cbc586db2ea4dcbb1a8a',
    'wheels/typer-0.27.3-py3-none-any.whl': 'e50022f28b82a86313e54501317a1db64bf8f8d036ff8cfe5ca7e47675454aff',
}
MEMBER_LIMIT = 16 * 1024 * 1024
CONTEXT_LIMIT = 64 * 1024 * 1024
REMOTE_ROOT = '/runtime-supplement/standardone'
BUILD_TIMEOUT_S = 1200


def sha256(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise ValueError('supplement file is not a regular file')
    return hashlib.sha256(path.read_bytes()).hexdigest()


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
            if hashlib.sha256(archive.extractfile(member).read()).hexdigest() != FILES[member.name]:
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
    provider.scp_to(pod_id, str(context), REMOTE_ROOT + '/context.tar')
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
