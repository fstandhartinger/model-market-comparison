"""Fixed-order offline runtime supplement for Minimodels Decision 1 hard-candy (paid fast-lane order 9aa6673b).

Minimodels Decision 1 hard-candy is a google/gemma-4-31B-it system (MLX 4-bit affine checkpoint + one LoRA adapter + a calibration
file) served natively on POST /v1/systemone by the author's own C++20 "Skyfall" server (skyfall/*.cpp in the model repository), which
links MLX 0.32.4 (CUDA backend), tokenizers-cpp, nlohmann/json, cpp-httplib and PCRE2. The author's only documented runtime is a
`docker build` that compiles Skyfall on nvidia/cuda:12.8.1-devel-ubuntu24.04 with network access (apt, rustup, pip mlx[cuda12]==0.32.4,
CMake FetchContent git clones). This supplement is that builder environment made offline: the same base pinned by registry digest plus
python-build-standalone 3.12.16, the pip-resolved mlx/mlx-cuda-12/NVIDIA CUDA wheels and huggingface_hub 2.4.0, cmake 3.28.3, the
official Rust 1.100.0 tarballs, the vendored crates of the customer's Cargo.lock, GitHub archives of the three FetchContent commits and
Ubuntu's libpcre2-dev 10.42-4ubuntu2.2, every one a SHA-256-pinned member of the build context. The Docker build is offline. No customer
file is in the image: /opt/skyfall-build/start.sh compiles the read-only /code/skyfall mount inside the network-none run container and
execs it with the author's entrypoint defaults. This host module imports no model stack and executes no customer code.
"""
import hashlib
import math
import re
import tarfile
from datetime import datetime, timezone
from pathlib import Path

import measurement_dispatch
import order_admission_registry
import pod_runner

ORDER = '9aa6673b-f364-4a20-9fc4-899678189814'
BASE_IMAGE = 'nvidia/cuda:12.8.1-devel-ubuntu24.04@sha256:520292dbb4f755fd360766059e62956e9379485d9e073bbd2f6e3c20c270ed66'
CONTEXT = Path('/home/flori/jobs/fastlane-native-9aa6673b/supplement/PUBLIC-BUILD-CONTEXT.tar')
CONTEXT_SHA = 'ab0ba4a8a22f7b36ab992d3c175fd68b8e07ba3d9749f5dbf9cd74ab9d83ce21'
FILES = {
    "Dockerfile.runtime-supplement": "d99331b6e3053393cda0c51fb64aaa4fde73b4347306acdfa7b44f23e6f06a1f",
    "buildtools-requirements.lock.txt": "38aafdf4cbdc6b50a68ded68af79885b4f79c1ef0a868765deee9a2617e7ad77",
    "buildtools-wheels/cmake-3.28.3-py2.py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "d3bc42bf54ea3d64e5d81eb31275076817507cf4a6aa07a49ffc01985cae1f09",
    "cargo-config.toml": "f8b3c64d9f9fa4ef725e20e4788c5f4194b2eced9cbff305755fc3184c4c945f",
    "deps/cargo-1.100.0-x86_64-unknown-linux-gnu.tar.xz": "7e29ce07d7c6e92d1826870575ba27d57fff6cb3e754aa57d99099cb88fab35d",
    "deps/cargo-vendor.tar": "0daa43042db148a05d503c5a915f914a6c5809eaab498bf61f9958f4190e5e4e",
    "deps/cpp-httplib-89c932f313c6437c38f2982869beacc89c2f2246.tar.gz": "22ec970b3ecb60ef43293379a5cdc94b5fcdc34a888ebce2a3f6413c67262ab7",
    "deps/cpython-3.12.16+20261110-x86_64-unknown-linux-gnu-install_only.tar.gz": "c2f87d4b4e8db3abddb0f116c6ccfc503d0cbdbb9ee8faacddad1b679ec12e99",
    "deps/json-65ee68451d8eb2b5f3a30b410476ab83deb3289b.tar.gz": "13ef31d691947940a08909f8e0772f1d7d68e5da1678ee812a49c4bb0c996b2f",
    "deps/libpcre2-dev_10.42-4ubuntu2.2_amd64.deb": "572714fe3fbe1b49ffb4c5a483223c663a51948e0d8590add1620917326f3d21",
    "deps/rust-std-1.100.0-x86_64-unknown-linux-gnu.tar.xz": "4591b6486594ded52ecd6135db95bf9355bbd3ca7a380888b141528bbcf9a5d4",
    "deps/rustc-1.100.0-x86_64-unknown-linux-gnu.tar.xz": "f1d0b1dec81dab6f523cd098507763487b0d4bd7fd2c87582f154128719be03b",
    "deps/tokenizers-cpp-c586c52f93f7b060753bd2388eb96a105cb7374d.tar.gz": "257acdeb860e977efc92a6266a53dd94b6d82401d195195df1168296b808ddfe",
    "runtime-supplement-requirements.lock.txt": "db9c8ea0762ff273cd462004878314f0e65e31c399f377dff83046c43b5d2c59",
    "skyfall-start.sh": "2d53595e9149af82e91a2217f3d605126440404edb168341e3af65bdf4599d29",
    "wheels/anyio-4.16.0-py3-none-any.whl": "c66ae634e0b8228396b801741beb3294326d4b6102f7bba4041c0dfb58c29026",
    "wheels/click-8.5.1-py3-none-any.whl": "8bb5376d2006950386f8c6427613334a2acadc5f559cb80e638d00b4df957e37",
    "wheels/filelock-4.2.12-py3-none-any.whl": "21decfec02f116ed4c954433cdb31f28c3b346b784543177b6d7059da2702ee9",
    "wheels/fsspec-2026.9.0-py3-none-any.whl": "8dd6e646e99ea382bd85f97a45e6b526a442d79423a7dc673f1e2756d05fcb5f",
    "wheels/h11-0.16.0-py3-none-any.whl": "63cf8bbe7522de3bf65932fda1d9c2772064ffb3dae62d55932da54b31cb6c86",
    "wheels/hf_xet-1.8.0-cp38-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "29dab7c904cd1914a0439c6e1306c12c7497c8bd32290fbe563ebf51ca4b6d6d",
    "wheels/httpcore2-2.16.2-py3-none-any.whl": "16051ae2a42f776007543f32de9349a317b23d2cbb4e1456b4bac0e88b87419a",
    "wheels/httpx2-2.16.2-py3-none-any.whl": "f05c13aade4c45dbf1c9060647a1058f0acad62398fad96e741269edb33d46f5",
    "wheels/huggingface_hub-2.4.0-py3-none-any.whl": "42ecfd93ede47bdd333daebbf66a32d7bfe2e18752754fe4d2d4f98a0179d801",
    "wheels/idna-3.20-py3-none-any.whl": "ab7ae7122974553370f0bdb919e1a960b2cd1bc1ef0276416d896db81c14582c",
    "wheels/mlx-0.32.4-cp312-cp312-manylinux_2_35_x86_64.whl": "b517badcb8174f8937699465a0ba5b58c2daeaa9bd13d69b1e6ab13401d24a74",
    "wheels/mlx_cuda_12-0.32.4-py3-none-manylinux_2_35_x86_64.whl": "f385c7af7c1f63a9d6ce3e442e1c9ba881c881bcb45c6534ff8155b359da47e5",
    "wheels/nvidia_cublas_cu12-12.9.3.13-py3-none-manylinux_2_27_x86_64.whl": "d7d51055f161b317c7105ddaae90e71eda059026074ffef93cf7cde2886bfe72",
    "wheels/nvidia_cuda_nvrtc_cu12-12.9.86-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl": "210cf05005a447e29214e9ce50851e83fc5f4358df8b453155d5e1918094dcb4",
    "wheels/nvidia_cudnn_cu12-9.28.1.4-py3-none-manylinux_2_27_x86_64.whl": "cbcf6f33c77fef3aa61d3fec36f2e89b07eb27d65b9f369c1adf3cfee08c2c21",
    "wheels/nvidia_cufft_cu12-11.4.1.4-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "c67884f2a7d276b4b80eb56a79322a95df592ae5e765cf1243693365ccab4e28",
    "wheels/nvidia_cusolver_cu12-11.7.5.82-py3-none-manylinux_2_27_x86_64.whl": "15da72d1340d29b5b3cf3fd100e3cd53421dde36002eda6ed93811af63c40d88",
    "wheels/nvidia_cusparse_cu12-12.5.10.65-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl": "73060ce019ac064a057267c585bf1fd5a353734151f87472ff02b2c5c9984e78",
    "wheels/nvidia_nccl_cu12-2.32.6-py3-none-manylinux_2_27_x86_64.whl": "2a6e6d5ddfc08970eca872be3dfa2650b24fa10a2043974465a9cae9c64ed6d8",
    "wheels/nvidia_nvjitlink_cu12-12.9.86-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl": "e3f1171dbdc83c5932a45f0f4c99180a70de9bd2718c1ab77d14104f6d7147f9",
    "wheels/packaging-26.3-py3-none-any.whl": "d7193f7c8e4e93f444fde0262bf90af30e16fa0ad0ad44cb553c87339b23cd1c",
    "wheels/pyyaml-6.0.3-cp312-cp312-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl": "ba1cc08a7ccde2d2ec775841541641e4548226580ab850948cbfda66a1befcdc",
    "wheels/tqdm-4.70.1-py3-none-any.whl": "c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73",
    "wheels/truststore-0.10.5-py3-none-any.whl": "9aaaedaefaf06d8b206278cf8b5012bc897f485a874503501e12d776df78951c",
    "wheels/typing_extensions-4.16.0-py3-none-any.whl": "481caa481374e813c1b176ada14e97f1f67a4539ce9cfeb3f350d78d6370c2e8"
}
MEMBER_LIMIT = 1073741824
CONTEXT_LIMIT = 4294967296
REMOTE_ROOT = '/runtime-supplement/minimodels-hard-candy'
BUILD_TIMEOUT_S = 2400
SCP_TIMEOUT_S = 5400

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
    """Only this order's reviewed http_typesafe recipe on the exact pinned base selects the supplement.
    A host-registry admission (order_admission_registry, `fastlane-admit`) counts like a listed order."""
    return (isinstance(recipe, dict) and recipe.get('kind') == 'http_typesafe'
            and recipe.get('image') == BASE_IMAGE
            and (Path(job).name == ORDER
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
    pod_runner._exec(provider, pod_id, ['rm', '-rf', REMOTE_ROOT])
    pod_runner._exec(provider, pod_id, ['mkdir', '-p', REMOTE_ROOT])
    # ~2.9 GB of pinned public wheels and toolchains (CUDA math wheels dominate); generous timeout for slow pod uplinks.
    provider.scp_to(pod_id, str(context), REMOTE_ROOT + '/context.tar', timeout=SCP_TIMEOUT_S)
    transferred = pod_runner._exec(provider, pod_id, ['sha256sum', REMOTE_ROOT + '/context.tar'])
    if CONTEXT_SHA not in transferred.stdout.split():
        raise pod_runner.PodRunError('runtime supplement context changed in transfer')
    pod_runner._exec(provider, pod_id, ['tar', '-xf', REMOTE_ROOT + '/context.tar', '-C', REMOTE_ROOT])
    # Keep only the pinned extracted members in Docker's build context; the compressed upload is 3 GB itself.
    pod_runner._exec(provider, pod_id, ['rm', '-f', REMOTE_ROOT + '/context.tar', REMOTE_ROOT + '/image.iid'])
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


RUN_WAIT_MARGIN_S = 900  # logs, raw download, receipts and exact-ID teardown before the attempt TTL ends
PROVIDER_EXEC_TIMEOUT_OVERHEAD_S = 60  # VerdaProvider.exec sets its ssh timeout to timeout + 60


def run_wait_seconds(attempt_started_at, ttl_hours, now=None):
    """Bound this order's run-container wait by the remaining attempt TTL and teardown margin."""
    try:
        started = datetime.fromisoformat(attempt_started_at)
        if started.tzinfo is None:
            raise ValueError
        ttl = float(ttl_hours)
        if not math.isfinite(ttl) or ttl <= 0:
            raise ValueError
        elapsed = ((now or datetime.now(timezone.utc)) - started).total_seconds()
        left = (ttl * 3600 - max(elapsed, 0.0) - RUN_WAIT_MARGIN_S
                - PROVIDER_EXEC_TIMEOUT_OVERHEAD_S)
    except (OverflowError, TypeError, ValueError):
        return 0
    return max(0, int(left))


def wait_for_container(provider, pod_id, attempt_started_at, ttl_hours, now=None):
    """Wait only when the bounded ssh timeout fits before the teardown cutoff."""
    timeout = run_wait_seconds(attempt_started_at, ttl_hours, now)
    if timeout <= 0:
        raise measurement_dispatch.OperationalHold('runtime_attempt_ttl_margin_exhausted')
    return pod_runner._exec(provider, pod_id, ['docker', 'wait', 'jev-pod-run'], timeout=timeout)
