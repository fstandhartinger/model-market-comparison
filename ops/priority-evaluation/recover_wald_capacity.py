"""One scoped operator migration; dry-run default. Never starts or rents anything."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path

import autopickup as ap
import pod_runner as pr
import pod_capacity as pc

RID = '1fb9646e-c44d-4732-b708-8c7c5d16f0fa'
ORIGINAL_SHA = '69746e9f3b63c8397438f279743b0180b9717d02f599b4dfcfe00fa89a4063bd'
EVENT_ID = '931dee28-ddfb-45c7-9304-b6d852fcdb67'
REQUEST_ID = 'd58ce57c242b4886851f3dcab56a633c'
EVENT_TIME = '2026-10-08T19:50:17.729531'
RECIPE_SHA = 'c4f2807c52e35804763284aa5441003eadf46f4b9484eb301c0c8abd52534314'
BASE = Path('/home/flori/jobs/urgent-fastlane-bookhost-20261008/wald')
REVIEWED_RUNTIME_FILES = ('pod_runner.py', 'pod_capacity.py', 'lium_bounded_up.py', 'recover_wald_capacity.py')


def read_regular(path, limit=1024*1024):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > limit:
        raise RuntimeError('unsafe or missing recovery evidence')
    return path.read_bytes()


def sha(body):
    return hashlib.sha256(body).hexdigest()


def preserved_state(original):
    if sha(original) != ORIGINAL_SHA:
        raise RuntimeError('original pod state CAS differs')
    state = json.loads(original)
    expected = {'request_id': RID, 'creation_attempts': 2, 'spent_upper_bound_usd': 1.25,
                'input_dispatched': False, 'execution_started': False, 'measurement_completed': False,
                'cleanup_uncertain': False, 'pod_id': None, 'attempt_reserved_upper_bound_usd': 0.0,
                'reservation_id': 'gpu-771005577da188e7b57413e2'}
    if any(state.get(k) != v for k, v in expected.items()) or not state.get('torn_down_at') or 'capacity_refusals' in state or 'two_gpu_placement_recipe_sha256' in state:
        raise RuntimeError('original counters or cleanup predicates differ')
    return state


def prepare(revision, acceptance_path):
    config = json.loads(read_regular(ap.STATE_ROOT/'config.json'))
    if config.get('installed_revision') != revision or not ap.SHA40_RE.fullmatch(revision):
        raise RuntimeError('merged controller installation differs')
    acceptance = json.loads(read_regular(acceptance_path))
    if acceptance.get('verdict') != 'PASS' or acceptance.get('independent') is not True or acceptance.get('reviewer_engine') != 'claude':
        raise RuntimeError('independent controller acceptance missing')
    reviewed = acceptance.get('reviewed_runtime_sha256', {})
    for name in REVIEWED_RUNTIME_FILES:
        if reviewed.get(name) != sha(read_regular(Path(__file__).parent/name)):
            raise RuntimeError('installed controller differs from independently reviewed bytes')
    reviewer_path = Path(acceptance['review_path'])
    if reviewer_path.resolve().is_relative_to(BASE.parent) is not True or sha(read_regular(reviewer_path)) != acceptance.get('review_sha256'):
        raise RuntimeError('independent controller review receipt differs')
    if ap.STATE_ROOT != Path('/home/flori/.local/state/fastlane-autopickup') or ap.JOB_ROOT != Path('/home/flori/jobs/fastlane-evaluations'):
        raise RuntimeError('operator must use the original Sandy runtime/state')
    row = ap.load_row(RID)
    job = ap.JOB_ROOT/RID
    if (not row or row.get('synthetic_test') is not False or row.get('status') not in ('paid', 'review_passed')
            or row.get('pickup_job_dir') != str(job) or row.get('result_delivered_at') or ap.active_hold(row)
            or row.get('customer_hold_started_at') or row.get('refund_id') or not ap.gate(RID)[0]):
        raise RuntimeError('original paid order no longer eligible')
    if ap.Effects().unit_state(ap.EVAL_UNIT.format(RID)).get('ActiveState') not in ('inactive', 'failed'):
        raise RuntimeError('evaluator already owns this order')
    gate = ap.validate_review_gate(job)
    if sha(read_regular(job/'review/GATE.json')) != acceptance.get('source_gate_sha256'):
        raise RuntimeError('current independent source gate differs')
    recipe = json.loads(read_regular(job/'trusted-runner/POD-RECIPE.json'))
    pr.validate_recipe(recipe, job)
    binding = sha(json.dumps({'recipe': recipe, 'benchmarks': ['jevbench']}, sort_keys=True).encode())
    if binding != RECIPE_SHA or row.get('benchmarks') != ['jevbench']:
        raise RuntimeError('reviewed single-GPU inference recipe differs')
    for name, digest in acceptance.get('tp1_evidence_sha256', {}).items():
        if '/' in name or sha(read_regular(BASE/name)) != digest:
            raise RuntimeError('single-GPU source evidence differs')
    if set(acceptance.get('tp1_evidence_sha256', {})) != {'VLLM-TP1-parallel.py', 'VLLM-TP1-uniproc_executor.py', 'VLLM-TP1-CUSTOMER-STATIC-PROOF.json', 'VLLM-TP1-PROOF.md'}:
        raise RuntimeError('reviewed default-TP1 evidence incomplete')
    pod_path = pr.PODS_DIR/(RID+'.json')
    original = read_regular(pod_path)
    state = preserved_state(original)
    if read_regular(BASE/'POD-STATE-CAPACITY-ORIGINAL.json') != original:
        raise RuntimeError('archived original state differs')
    before = json.loads(read_regular(BASE/'ORIGINAL-CAPACITY-last_ps.2087542.json'))
    after = json.loads(read_regular(BASE/'ORIGINAL-CAPACITY-last_ps.2087422.json'))
    before_ids = {p['id'] for p in before['pods']}
    after_ids = {p['id'] for p in after['pods']}
    if (before_ids != after_ids or before['timestamp'] != '2026-10-08T19:50:11.216908+00:00'
            or after['timestamp'] != '2026-10-08T19:50:18.300465+00:00'):
        raise RuntimeError('original before/after inventory proof differs')
    event = pc.audit_refusal(pr._run_cli, pr.LIUM, REQUEST_ID, '2026-10-08T19:50:08+00:00')
    archived = json.loads(read_regular(BASE/'POD-CAPACITY-ACCOUNT-AUDIT.json'))
    original_events = [e for e in archived['items'] if e.get('id') == EVENT_ID]
    if len(original_events) != 1 or event != original_events[0] or event['id'] != EVENT_ID or event['created_at'] != EVENT_TIME:
        raise RuntimeError('exact authenticated original refusal differs')
    ledger = [json.loads(line) for line in read_regular(Path('/home/flori/.local/state/gpu-pods/ledger.jsonl'), 20*1024*1024).splitlines() if line]
    own = [e for e in ledger if e.get('reservation_id') == state['reservation_id']]
    if ([e.get('event') for e in own] != ['reserve', 'release']
            or any(e.get('job') != 'fastlane-eval-1fb9646e' or e.get('provider', 'lium') != 'lium' for e in own)
            or own[0].get('at') != '2026-10-08T19:50:08Z' or own[1].get('at') != '2026-10-08T19:50:18Z'
            or own[1].get('pod_id') is not None):
        raise RuntimeError('original reservation release differs')
    if state['last_pod_id'] in pr.LiumProvider().ps_ids():
        raise RuntimeError('inspection pod unexpectedly remains')
    # Returning a plan changes neither counters nor the existing gate/request state.
    return pod_path, original, state, {'phase': 'create_refused', 'event': event,
        'started_at': state['attempt_started_at']}, before_ids, after_ids, gate


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--installed-revision', required=True)
    parser.add_argument('--review-acceptance', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args(argv)
    with ap.cycle_lock(blocking=True):
        pod_path, original, state, proof, before, after, gate = prepare(args.installed_revision, args.review_acceptance)
        request_bytes = read_regular(ap.state_path(RID))
        request_state = json.loads(request_bytes)
        hold = request_state.get('operational_hold', {})
        if hold.get('reason') not in ('gpu_pod_run_failed', 'gpu_pod_capacity') or hold.get('next_retry_at') != '2026-10-08T20:45:00+00:00':
            raise RuntimeError('original capacity retry clock differs')
        acceptance = json.loads(read_regular(args.review_acceptance))
        window_path = BASE/'CAPACITY-OWNER-WINDOW.json'
        window_bytes = read_regular(window_path)
        window = json.loads(window_bytes)
        if (sha(window_bytes) != acceptance.get('capacity_owner_window_sha256')
                or window.get('owner_job') != 'unsloth-decision-experiments-20261008'
                or window.get('confirmed_release_not_after') != '2026-10-08T20:55:37+00:00'
                or window.get('verified_by_root') is not True or not window.get('source')):
            raise RuntimeError('confirmed resource-owner availability window differs')
        print(json.dumps({'order': RID, 'raw_creation_attempts': 2, 'after_allocation_count': 1,
                          'spent_upper_bound_usd': 1.25, 'recipe_binding': RECIPE_SHA, 'apply': args.apply}))
        if not args.apply:
            return 0
        if pod_path.read_bytes() != original or ap.state_path(RID).read_bytes() != request_bytes or ap.validate_review_gate(ap.JOB_ROOT/RID) != gate:
            raise RuntimeError('order changed before recovery CAS')
        digest = pc.store_refusal(state, pr.PODS_DIR, proof, attempt=2, before=before, after=after, released=True)
        state['two_gpu_placement_recipe_sha256'] = RECIPE_SHA
        prior = json.loads(original)
        if any(state.get(k) != v for k, v in prior.items()) or pc.allocation_count(state, pr.PODS_DIR) != 1:
            raise RuntimeError('migration changed original counters or fields')
        record = {'order': RID, 'at': datetime.now(timezone.utc).isoformat(), 'installed_revision': args.installed_revision,
                  'before_sha256': sha(original), 'capacity_receipt_sha256': digest, 'after_state': state,
                  'source_gate_sha256': sha(read_regular(ap.JOB_ROOT/RID/'review/GATE.json')),
                  'original_request_state_sha256': sha(request_bytes), 'original_request_state': request_state,
                  'original_next_retry_at': hold['next_retry_at'],
                  'next_retry_at': '2026-10-08T20:56:00+00:00',
                  'capacity_owner_window_sha256': sha(window_bytes)}
        evidence = BASE/'CAPACITY-ALLOCATION-MIGRATION.json'
        with evidence.open('x') as stream:
            json.dump(record, stream, indent=2);stream.write('\n');stream.flush();os.fsync(stream.fileno())
        if pod_path.read_bytes() != original or ap.state_path(RID).read_bytes() != request_bytes:
            raise RuntimeError('order changed during recovery CAS')
        pr._save_pod_state(pod_path, state)
        # Preserve the original hold, counters, payment and SLA. Only its retry
        # clock follows the independently confirmed resource-owner window.
        request_state['operational_hold']['next_retry_at'] = '2026-10-08T20:56:00+00:00'
        if ap.state_path(RID).read_bytes() != request_bytes:
            raise RuntimeError('request changed after pod-state CAS; reconcile durable migration intent')
        ap.save_state(request_state)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
