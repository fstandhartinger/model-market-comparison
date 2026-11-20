"""Exact-order offline runtime for Strands Decider v2 E2B (CR-811).

The merged Gemma 4 checkpoint uses the submitted public release wheel.
Its Python modules match the pinned submitted GitHub checkout. The
runtime overlays that wheel and pinned public
PEFT and Pillow wheels on the vLLM base used for the previous Strands
measurement. The server runs the author's Transformers backend.
"""
import hashlib
import json
import math
import re
import tarfile
from datetime import datetime
from pathlib import Path

import execution_source
import measurement_dispatch
import native_owner
import pod_runner

ORDER = native_owner.STRANDS_E2B_ORDER
BASE_IMAGE = 'vllm/vllm-openai:v0.30.0@sha256:8a69ffad015f138d7170c4ddc429e230a3bc1c1719f67e14324749df200a4b90'
RECIPE_SHA = '737f6ce9a381c085af394f173eb56960351c37f497bd6e8d7031f623848d7307'
SOURCE_CONTRACT_SHA = '15a41a4082664bce649b24854e84165f8da9647e2cf52d89771cdf753f76868f'
CONTEXT = Path('/home/flori/jobs/fastlane-native-0616c39d/supplement/RELEASE-BUILD-CONTEXT.tar')
CONTEXT_SHA = '712c5a2f710ce7285f34172cdf51e2fae420d738ad088200c608b7b29f8b622c'
FILES = {
    "Dockerfile.runtime-supplement": "2d22a6e811690e8fec1b56c35c96615c3e969b6663047f7fd178db3a7e1f4820",
    "requirements.lock": "a958801f53827d430c287bcec4d103a926888a7cd72e3d39d57ea71ef6827474",
    "wheels/peft-0.21.0-py3-none-any.whl": "b64eb75fd9dece7401c70e675b8d9de024993b70483691b41c62876f0c7809b7",
    "wheels/pillow-13.0.0-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl": "42d63be3af4f9b951b199b0a9d23365d37ab14687e6d77b74940432c8515c4ca",
    "wheels/strands_decider-0.4.0-py3-none-any.whl": "6484657659f8ca9a5faa9263cb791d3463c8a5d683f367072a294489efd4c4d5"
}
MEMBER_LIMIT = 16 * 1024 * 1024
CONTEXT_LIMIT = 24 * 1024 * 1024
REMOTE_ROOT = '/runtime-supplement/strands-decider-e2b'
BUILD_TIMEOUT_S = 600
SCP_TIMEOUT_S = 300
RESULT_COLLECTION_RESERVE_S = 300
CLEANUP_HANDOFF_S = 15
GPU = ('RTXPRO6000', 96)
INSTANCE_TYPE = '1RTXPRO6000.30V'

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
    """Admit the exact order and the exact reviewed recipe."""
    if Path(job).name != ORDER or not isinstance(recipe, dict) or recipe.get('image') != BASE_IMAGE:
        return False
    encoded = json.dumps(recipe, sort_keys=True, allow_nan=False).encode()
    return hashlib.sha256(encoded).hexdigest() == RECIPE_SHA


def require(job, recipe, rid, provider, benchmarks, pre_upload_gate, allocation_gate, fallback_providers):
    """Fail before staging input or asking a provider unless the native path is selected."""
    from verda_provider import VerdaProvider

    if (rid != ORDER or not active(job, recipe) or not isinstance(provider, VerdaProvider)
            or fallback_providers or tuple(benchmarks) != ('jevbench',)
            or not callable(pre_upload_gate) or not callable(allocation_gate)
            or not callable(getattr(provider, 'verify_dispatch_identity', None))):
        raise measurement_dispatch.OperationalHold('strands_e2b_native_admission_required')
    verify_sources(Path(job), recipe)
    verify_context()


def verify_sources(job, recipe, *, bundle=None):
    """Bind the submitted code checkout and the separate checkpoint receipt."""
    try:
        root = job / 'source'
        contract_path = (bundle or job / 'trusted-runner') / 'EXECUTION-SOURCE.json'
        execution_source._safe_path(contract_path, directory=False)
        raw = contract_path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != SOURCE_CONTRACT_SHA:
            raise ValueError('source contract pin')
        contract = json.loads(raw)
        if (contract['order_id'], contract['execution_source'], contract['model_checkpoint_source']) != (
                ORDER, 'code', 'model'):
            raise ValueError('source roles')
        selected = contract['source_pins']['code']
        if recipe['code'] != {'source': 'code', 'commit': selected['commit'], 'tree': selected['tree']}:
            raise ValueError('source selection')
        if {path.name for path in root.glob('FETCH-RECEIPT-*.json')} != {
                'FETCH-RECEIPT-model.json', 'FETCH-RECEIPT-code.json'}:
            raise ValueError('receipt inventory')
        for which, pin in contract['source_pins'].items():
            receipt = root / f'FETCH-RECEIPT-{which}.json'
            execution_source._safe_path(receipt, directory=False)
            if sha256(receipt) != pin['receipt_sha256']:
                raise ValueError('receipt pin')
            execution_source.validate_code_binding(
                {'source': which, 'commit': pin['commit'], 'tree': pin['tree']}, job)
        if set(contract['source_pins']) != {'code', 'model'}:
            raise ValueError('source contracts do not contain both receipts')
        wheel = contract['model_wheel']
        listing = root / 'TREE-LISTING-model.json'
        execution_source._safe_path(listing, directory=False)
        raw = listing.read_bytes()
        if hashlib.sha256(raw).hexdigest() != contract['model_tree_listing_sha256']:
            raise ValueError('model tree listing pin')
        tree = json.loads(raw)
        checkpoint = contract['source_pins']['model']
        if (tree['commit'], tree['tree']) != (checkpoint['commit'], checkpoint['tree']):
            raise ValueError('model tree')
        matches = [item for item in tree['files'] if item['path'] == wheel['path']]
        if len(matches) != 1 or matches[0]['lfs_oid_sha256'] != wheel['sha256'] \
                or matches[0]['lfs_size'] != wheel['size']:
            raise ValueError('archived development wheel provenance pin')
        release = contract['release_wheel']
        if FILES.get('wheels/' + release['path']) != release['sha256']:
            raise ValueError('release wheel pin')
    except (OSError, ValueError, KeyError, TypeError):
        raise measurement_dispatch.OperationalHold('strands_e2b_source_contract_mismatch') from None


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
    return {'module_sha256': sha256(__file__), 'context_sha256': CONTEXT_SHA,
            'recipe_sha256': RECIPE_SHA, 'source_contract_sha256': SOURCE_CONTRACT_SHA, 'base_image': BASE_IMAGE}


def launch_binding(value):
    """Validate the identity from the trusted host authority reader."""
    if (not isinstance(value, dict) or set(value) != {'approval_sha256', 'packet_sha256', 'location'}
            or any(not re.fullmatch(r'[a-f0-9]{64}', str(value[field]))
                   for field in ('approval_sha256', 'packet_sha256'))
            or not re.fullmatch(r'FIN-[0-9]{2}', str(value['location']))):
        raise measurement_dispatch.OperationalHold('strands_e2b_native_admission_required')
    return dict(value)


def verify_created_pod(pod, launch):
    if (pod.get('gpu') != GPU[0] or type(pod.get('gpu_count')) is not int
            or pod['gpu_count'] != 1 or pod.get('instance_type') != INSTANCE_TYPE
            or pod.get('location') != launch['location']):
        raise measurement_dispatch.OperationalHold('gpu_pod_quote_changed')


def verify_receipt(receipt, state, launch):
    """Refuse reuse if the recorded offline image or runtime pins changed."""
    proof = receipt.get('runtime_supplement')
    if (not isinstance(proof, dict) or proof != state.get('runtime_supplement')
            or not re.fullmatch(r'sha256:[a-f0-9]{64}', str(proof.get('effective_image')))
            or proof != dict(binding(), effective_image=proof['effective_image'])
            or not receipt.get('pod_id') or receipt['pod_id'] != state.get('last_pod_id')
            or receipt.get('native_launch') != launch or state.get('native_launch') != launch):
        raise measurement_dispatch.OperationalHold('existing_measurement_receipt_changed')


def bounded_seconds(allocation_gate, state, clock, ttl, reserve, maximum):
    """Use the earlier of the billed TTL and the authenticated cleanup bound."""
    live = allocation_gate('remaining_seconds', state)
    try:
        now = clock()
        started = datetime.fromisoformat(state['attempt_started_at'])
        if started.tzinfo is None or started > now or type(live) not in (int, float) or not math.isfinite(live):
            raise ValueError('invalid attempt clock')
        remaining = math.floor(min(live, ttl * 3600 - (now - started).total_seconds()) - reserve)
    except (KeyError, TypeError, ValueError, OverflowError):
        remaining = 0
    if remaining < 1:
        raise pod_runner.PodRunError('strands_e2b_cleanup_margin_insufficient')
    return min(remaining, maximum)


class AttemptIO:
    """Check the deadline again for each operation after protected upload."""

    def __init__(self, provider, pod_id, allocation_gate, state, clock, ttl):
        self.provider = provider
        self.pod_id = pod_id
        self.allocation_gate = allocation_gate
        self.state = state
        self.clock = clock
        self.ttl = ttl

    def timeout(self, maximum, reserve):
        return bounded_seconds(self.allocation_gate, self.state, self.clock, self.ttl, reserve, maximum)

    def exec(self, command, maximum=600, reserve=RESULT_COLLECTION_RESERVE_S):
        timeout = self.timeout(maximum, reserve)
        result = self.provider.exec_bounded(self.pod_id, command, timeout)
        if result.returncode:
            raise pod_runner.PodRunError(f'Strands bounded {command[0]} command failed (exit {result.returncode})')
        return result

    def fetch(self, remote, target, maximum=900):
        target = Path(target)
        partial = target.with_name(target.name + '.partial')
        if target.exists() or partial.exists() or target.is_symlink() or partial.is_symlink():
            raise pod_runner.PodRunError('Strands retrieval target already exists')
        timeout = self.timeout(maximum, CLEANUP_HANDOFF_S)
        self.provider.scp_from_bounded(self.pod_id, remote, str(partial), timeout)
        partial.replace(target)


def verify_context(context=CONTEXT):
    try:
        check_context(context)
    except (OSError, ValueError, tarfile.TarError):
        raise measurement_dispatch.OperationalHold('runtime_supplement_unaccepted') from None


def build(provider, pod_id, context=CONTEXT):
    """Build and inspect the pinned offline image on the owned pod."""
    verify_context(context)
    evidence = binding()
    pod_runner._exec(provider, pod_id, ['mkdir', '-p', REMOTE_ROOT])
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
