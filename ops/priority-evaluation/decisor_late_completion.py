"""Exact root/peer-admitted paid Decisor publication recovery; no effects on import.
The old result email is historical delivery, never delivery of the fresh generation.
This module grants neither money nor a second generation; allocation guards remain.
"""
import hashlib
import importlib
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ORDER = '3687485f-5a51-4964-bd9a-73973f3494d7'
ROOT_DECISION_SHA = '8b0ea8b5a610de118bb035e66009c1c27cae39cee0fd820b87fff56386c4320e'
HOSTS = ('https://benchmarkheaven.com', 'https://www.benchmarkheaven.com')
EXPECTED = {
    'id': ORDER, 'status': 'paid', 'model_name': 'decisor-4b',
    'synthetic_test': False, 'stripe_mode': 'live', 'visibility': 'public',
    'benchmarks': ['jevbench'], 'review_passed_at': None,
    'paid_at': '2026-10-06T13:43:46+02:00',
    'result_delivered_at': '2026-10-06T15:08:59+02:00',
    'delivery_email_status': 'sent', 'result_url': None,
    'pickup_owner': 'fastlane-eval-3687485f',
    'pickup_job_dir': '/home/flori/jobs/fastlane-evaluations/' + ORDER,
    'pickup_status': 'started', 'pickup_attempts': 1, 'evaluation_attempts': 0,
    'release_attempts': 0, 'release_status': 'not_due', 'sla_paused_seconds': 0,
    'resubmission_count': 0, 'amount_total': 4900,
    'customer_hold_started_at': None, 'customer_hold_reason': None,
    'refund_id': None, 'refunded_at': None, 'refund_status': None,
    'refund_decision': None, 'refund_decided_at': None,
}

IDENTITY_SHA = '6a1c3644b417ad345aa9265748f8f391b7c87b3152d9113995d3884e2749aa1c'
IDENTITY_COLUMNS = ('created_at','email','model_link','code_link','access_type','access_instructions','notes','checkout_session_id','payment_intent_id','notification_status','confirmation_status','review_email_status','refusal_email_status','change_request_email_status')
IDENTITY_SQL = "encode(sha256(convert_to(jsonb_build_object(" + ','.join("'%s',%s" % (c, 'extract(epoch FROM created_at)' if c == 'created_at' else c) for c in IDENTITY_COLUMNS) + ")::text,'UTF8')),'hex')"


def sha(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise ValueError('missing or unsafe late completion pin')
    return hashlib.sha256(path.read_bytes()).hexdigest()


def timestamp_equal(a, b):
    from datetime import datetime
    return datetime.fromisoformat(a.replace('Z', '+00:00')) == datetime.fromisoformat(b.replace('Z', '+00:00'))


def row_check(row, statuses=('starting', 'running', 'pending', 'done')):
    if not row or row.get('evaluation_status') not in statuses:
        raise ValueError('late Decisor generation status changed')
    for key, value in EXPECTED.items():
        if key in ('paid_at', 'result_delivered_at'):
            same = isinstance(row.get(key), str) and timestamp_equal(row[key], value)
        else:
            same = row.get(key) == value
        if not same:
            raise ValueError('late Decisor invariant changed: ' + key)


def public_absent(opener=urlopen):
    """Both canonical public registry and page must be healthy and agree.
    Never infer absence from a DB NULL, HTTP failure, malformed feed or empty feed.
    An existing public row requires root reconciliation, not another rental.
    """
    revisions = []
    for host in HOSTS:
        with opener(Request(host + '/api/jevbench/latest', headers={'Cache-Control': 'no-cache'}), timeout=20) as reply:
            raw = reply.read(4 * 1024 * 1024 + 1)
            if len(raw) > 4 * 1024 * 1024:
                raise ValueError('public registry exceeds bounded response')
            feed = json.loads(raw)
        if feed.get('schema_version') != 1 or feed.get('benchmark') != 'JevBench' or not isinstance(feed.get('systems'), list) or not feed['systems']:
            raise ValueError('public registry unavailable or malformed')
        source = feed.get('source', {})
        if source.get('page') != '/jev-models' or not isinstance(source.get('artifact_sha256'), str) or len(source['artifact_sha256']) != 64:
            raise ValueError('public registry provenance missing')
        revisions.append((feed.get('revision'), source['artifact_sha256']))
        for system in feed['systems']:
            text = ' '.join(str(system.get(k, '')) for k in ('key', 'name', 'source_url')).lower()
            if 'decisor' in text:
                raise ValueError('Decisor already public: reconcile URL without a fresh rental')
        with opener(Request(host + '/jev-models', headers={'Cache-Control': 'no-cache'}), timeout=20) as reply:
            raw = reply.read(8 * 1024 * 1024 + 1)
            if len(raw) > 8 * 1024 * 1024:
                raise ValueError('public page exceeds bounded response')
            page = raw.decode('utf-8')
        if len(page) < 1000 or 'jevbench' not in page.lower():
            raise ValueError('public page unavailable')
        if 'decisor' in page.lower():
            raise ValueError('Decisor already public on page: reconcile without a fresh rental')
    if revisions[0] != revisions[1]:
        raise ValueError('public registry hosts disagree')
    return revisions[0]


class LateCompletion:
    def __init__(self, job, generation, controller=None, statuses=('running',)):
        self.job = Path(job)
        if self.job.name != ORDER:
            raise ValueError('late completion scope is exact Decisor only')
        self.controller = controller or importlib.import_module('autopickup')
        self.generation = generation
        self.check(statuses)

    def check(self, statuses=('running',)):
        a = self.controller
        state = a.load_state(ORDER)
        if state.get('operational_hold') is not None:
            raise ValueError('late completion operational hold remains')
        anchor = state.get('decisor_late_public_completion')
        admission_path = self.job / 'review/DECISOR-LATE-COMPLETION-ADMISSION.json'
        peer_path = self.job / 'review/DECISOR-LATE-COMPLETION-REVIEW.json'
        if not isinstance(anchor, dict) or anchor.get('verdict') != 'ACCEPTED' or anchor.get('admission_sha256') != sha(admission_path) or anchor.get('independent_review_sha256') != sha(peer_path):
            raise ValueError('late completion lacks root-installed accepted anchor')
        admission = json.loads(admission_path.read_text())
        peer = json.loads(peer_path.read_text())
        if admission.get('schema_version') != 1 or admission.get('scope') != 'exact-decisor-late-paid-public-completion' or admission.get('root_owner') != 'codex:fastlane-v16-finish-20261009' or admission.get('verdict') != 'ACCEPTED' or admission.get('order_id') != ORDER or admission.get('generation') != self.generation or admission.get('expected_row') != EXPECTED or admission.get('root_decision_sha256') != ROOT_DECISION_SHA:
            raise ValueError('late completion exact admission mismatch')
        if peer.get('verdict') != 'ACCEPTED' or peer.get('reviewer_engine') != 'claude' or peer.get('admission_sha256') != sha(admission_path) or peer.get('root_decision_sha256') != ROOT_DECISION_SHA:
            raise ValueError('late completion independent binding missing')
        required = {'controller', 'late_completion', 'v16_profiles', 'profile_admission', 'profile_review', 'allocation_authority', 'allocation_review', 'root_decision', 'source_pins', 'handoff'}
        pins = admission.get('references', {})
        if set(pins) != required:
            raise ValueError('late completion reference set differs')
        expected_paths = {'controller': Path(a.__file__).resolve(), 'late_completion': Path(__file__).resolve(),
                          'v16_profiles': Path(__file__).parent / 'v16_profiles.py',
                          'profile_admission': self.job / 'review/V16-PROFILE-ADMISSION.json',
                          'profile_review': self.job / 'review/V16-PROFILE-REVIEW.json',
                          'allocation_authority': self.job / 'review/V16-ALLOCATION-AUTHORITY.json',
                          'allocation_review': self.job / 'review/V16-ALLOCATION-REVIEW.json',
                          'source_pins': self.job / 'review/SOURCE-PINS.json',
                          'root_decision': self.job / 'review/DECISOR-ROOT-BOUNDED-COMPLETION-DECISION.json',
                          'handoff': self.job / 'review/decisor-late-handoff' / self.generation / 'HANDOFF.json'}
        for name, path in expected_paths.items():
            pin = pins[name]
            if Path(pin['path']).resolve() != path.resolve():
                raise ValueError('late completion reference path changed: ' + name)
            if sha(path) != pin['sha256']:
                # Preserve original admission/ENTRY. Only an authentic separately
                # Root-adopted exact source successor can join retained old bytes.
                from scoped_native_topup import late_successor
                late_successor(self.job,self.generation,name,pin,path,admission_path,
                               self.job/'review/decisor-late-handoff'/self.generation/'ENTRY-CLAIM.json')
        if pins['root_decision']['sha256'] != ROOT_DECISION_SHA:
            raise ValueError('late completion root decision changed')
        handoff = json.loads(expected_paths['handoff'].read_text())
        if handoff.get('order_id') != ORDER or handoff.get('generation') != self.generation or handoff.get('one_start_only') is not True:
            raise ValueError('late completion one-use handoff missing')
        entry_path = expected_paths['handoff'].parent / 'ENTRY-CLAIM.json'
        if statuses == ('starting',):
            if entry_path.exists() or entry_path.is_symlink():
                raise ValueError('late generation entry already consumed; reconcile without another start')
        else:
            if entry_path.is_symlink() or not entry_path.is_file():
                raise ValueError('late generation unit entry missing')
            entry = json.loads(entry_path.read_text())
            if entry != {'order_id': ORDER, 'generation': self.generation,
                         'admission_sha256': sha(admission_path),
                         'handoff_sha256': pins['handoff']['sha256']}:
                raise ValueError('late generation unit entry changed')
        row_check(a.load_row(ORDER), statuses)
        identity = a.sql_json("SELECT json_build_object('identity_sha256'," + IDENTITY_SQL + ")::text FROM " + a.TABLE + " WHERE id='" + ORDER + "'::uuid")
        if not identity or identity.get('identity_sha256') != IDENTITY_SHA:
            raise ValueError('late protected customer/payment/source identity changed')
        revision, artifact_sha = public_absent()
        if admission.get('public_snapshot') != {'revision': revision, 'artifact_sha256': artifact_sha}:
            raise ValueError('late public registry snapshot changed')
        return admission

    def claim_entry(self):
        admission = self.check(('starting',))
        path = self.job / 'review/decisor-late-handoff' / self.generation / 'ENTRY-CLAIM.json'
        if any(parent.is_symlink() for parent in (path, *path.parents)):
            raise ValueError('unsafe late entry custody')
        payload = {'order_id': ORDER, 'generation': self.generation,
                   'admission_sha256': sha(self.job / 'review/DECISOR-LATE-COMPLETION-ADMISSION.json'),
                   'handoff_sha256': admission['references']['handoff']['sha256']}
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(payload, stream, sort_keys=True);stream.flush();os.fsync(stream.fileno())
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)

    def sql_guard(self, statuses=('starting',)):
        a = self.controller
        fields = []
        for key, value in EXPECTED.items():
            if key == 'id':
                fields.append('id=' + a.sql_text(value) + '::uuid')
            elif value is None:
                fields.append(key + ' IS NULL')
            elif isinstance(value, bool):
                fields.append(key + '=' + str(value).lower())
            elif isinstance(value, int):
                fields.append(key + '=' + str(value))
            elif isinstance(value, list):
                fields.append(key + '=' + a.sql_text('{jevbench}') + '::text[]')
            else:
                fields.append(key + '=' + a.sql_text(value) + ('::timestamptz' if key in ('paid_at', 'result_delivered_at') else ''))
        fields.append(IDENTITY_SQL + '=' + a.sql_text(IDENTITY_SHA))
        fields.append('evaluation_status IN (' + ','.join(a.sql_text(x) for x in statuses) + ')')
        return ' AND '.join(fields)
