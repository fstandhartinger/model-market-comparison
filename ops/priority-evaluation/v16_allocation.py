"""One independently accepted fresh native-v16 generation, original money intact.

This is additive authorization for the expressly requested new-method run, not
another retry of the old measurement. No customer flag or automatic grant exists.
The custodian/root and independent Claude review must authenticate the exact
instruction, original ledger and admitted immutable pair before host acceptance.
"""
import hashlib
import json
import math
import os
from pathlib import Path

import pod_capacity
import pod_runner

WALD = '1fb9646e-c44d-4732-b708-8c7c5d16f0fa'
DECISOR = '3687485f-5a51-4964-bd9a-73973f3494d7'


def sha(path):
    p=Path(path)
    if p.is_symlink() or not p.is_file():
        raise ValueError('unsafe fresh-generation receipt')
    return hashlib.sha256(p.read_bytes()).hexdigest()


def exclusive(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if any(p.is_symlink() for p in [path, *path.parents]):
        raise ValueError('unsafe fresh-generation claim')
    with path.open('x') as stream:
        json.dump(value, stream, sort_keys=True, allow_nan=False)
        stream.flush();os.fsync(stream.fileno())
    fd=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY)
    try:os.fsync(fd)
    finally:os.close(fd)


class FreshAllocation:
    """A one-use host gate, called before reserve and before the actual rental."""
    def __init__(self, job, admission, recheck):
        self.job=Path(job);self.rid=self.job.name;self.admission=admission;self.recheck=recheck
        state=json.loads((pod_runner.STATE_ROOT/'requests'/f'{self.rid}.json').read_text())
        authority_path=self.job/'review/V16-ALLOCATION-AUTHORITY.json'
        reviewer_path=self.job/'review/V16-ALLOCATION-REVIEW.json'
        decision_path=self.job/'review/V16-ALLOCATION-DECISION.json'
        anchor=state.get('v16_generation_allocation',{})
        if anchor.get('verdict')!='ACCEPTED' or anchor.get('authority_sha256')!=sha(authority_path) \
                or anchor.get('independent_review_sha256')!=sha(reviewer_path):
            raise ValueError('fresh-generation authority not accepted by host')
        authority=json.loads(authority_path.read_text());review=json.loads(reviewer_path.read_text())
        decision=json.loads(decision_path.read_text())
        if authority.get('schema_version')!=1 or authority.get('scope')!='fresh-native-v16-generation' \
                or authority.get('order_id')!=self.rid or authority.get('generation')!=admission['generation'] \
                or authority.get('admission_sha256')!=sha(self.job/'review/V16-PROFILE-ADMISSION.json') \
                or authority.get('decision_sha256')!=sha(decision_path) \
                or decision.get('instruction')!='run new evaluation with the new v1.6 methodology, finish the fast-lane jobs.' \
                or decision.get('date')!='2026-10-09' or decision.get('authorizer')!='Florian' \
                or decision.get('topic_thread_id')!=13211 \
                or review.get('verdict')!='ACCEPTED' or review.get('reviewer_engine')!='claude' \
                or review.get('authority_sha256')!=sha(authority_path) \
                or review.get('verified_root_decision_sha256')!=sha(decision_path) \
                or review.get('root_decision_authenticity_verified') is not True:
            raise ValueError('fresh-generation scope or authentic decision mismatch')
        attempts=authority.get('original_creation_attempts');allocations=authority.get('original_allocations')
        total=authority.get('allowed_total_allocations');spent=authority.get('original_spent_upper_bound_usd')
        if type(attempts) is not int or attempts<0 or type(allocations) is not int or not 0<=allocations<=2 \
                or type(total) is not int or total!=allocations+1 or total>(3 if self.rid in (WALD, DECISOR) else 2) \
                or type(authority.get('max_additional_allocations')) is not int or authority['max_additional_allocations']!=1 \
                or isinstance(spent,bool) or not isinstance(spent,(int,float)) \
                or not math.isfinite(spent) or not 0<=spent<pod_runner.PER_ORDER_CAP_USD:
            raise ValueError('invalid bounded fresh-generation accounting')
        self.contingency_usd = 0
        self.max_ttl_hours = pod_runner.TTL_CAP_HOURS
        self.max_new_usd = pod_runner.PER_ORDER_CAP_USD
        if self.rid == DECISOR:
            if (attempts != 2 or allocations != 2 or total != 3 or spent != 7.8
                    or authority.get('max_new_usd') != 12 or authority.get('max_ttl_hours') != 2.4
                    or review.get('decisor_scope_and_financial_authority_verified') is not True):
                raise ValueError('Decisor exact financial scope not independently accepted')
            financial_path = self.job/'review/DECISOR-ROOT-BOUNDED-COMPLETION-DECISION.json'
            financial_sha = sha(financial_path)
            if (financial_sha != '8b0ea8b5a610de118bb035e66009c1c27cae39cee0fd820b87fff56386c4320e'
                    or authority.get('root_financial_decision_sha256') != financial_sha
                    or review.get('root_financial_decision_sha256') != financial_sha):
                raise ValueError('Decisor actual root financial decision differs')
            # Root retains a conservative contingency within the same new12 cap.
            # This is reserved liability, not a claim that a provider fee exists.
            if authority.get('conservative_contingency_usd') != .2:
                raise ValueError('Decisor conservative contingency differs')
            extra = .2
            self.contingency_usd = extra
            journal_path = self.job/'review/DECISOR-OLD-RENTALS.json'
            if authority.get('historical_journal_sha256') != sha(journal_path):
                raise ValueError('Decisor historical journal differs')
            historical_journal(journal_path)
            self.max_new_usd, self.max_ttl_hours = 12 - extra, 2.4
        self.authority=authority;self.digest=sha(authority_path)
        self.ledger=pod_runner.PODS_DIR/f'{self.rid}.json'
        self.claim=pod_runner.PODS_DIR/'v16-generation'/self.rid/'single-fresh-generation.json'
        self.create_claim=self.claim.with_name('rental-attempt.json')
        if sha(self.ledger)!=authority.get('original_ledger_sha256') or self.claim.exists() or self.create_claim.exists():
            raise ValueError('original ledger changed or fresh generation already consumed')
        original=json.loads(self.ledger.read_text())
        if original.get('pod_id') or original.get('cleanup_uncertain') or not original.get('measurement_completed') \
                or original.get('creation_attempts')!=attempts or original.get('spent_upper_bound_usd')!=spent \
                or pod_capacity.allocation_count(original,pod_runner.PODS_DIR)!=allocations:
            raise ValueError('original generation is not reconciled')

    def __call__(self, phase, state):
        self.recheck()
        a=self.authority
        if state.get('request_id')!=self.rid:
            raise ValueError('foreign fresh-generation ledger')
        if phase in ('check','before_reserve'):
            if self.claim.exists() or self.create_claim.exists() \
                    or state.get('creation_attempts')!=a['original_creation_attempts'] \
                    or state.get('spent_upper_bound_usd')!=a['original_spent_upper_bound_usd'] \
                    or pod_capacity.allocation_count(state,pod_runner.PODS_DIR)!=a['original_allocations']:
                raise ValueError('fresh generation already consumed or historical counters changed')
            if phase=='before_reserve':
                exclusive(self.claim,{'authority_sha256':self.digest,'generation':a['generation'],
                                      'original_creation_attempts':a['original_creation_attempts']})
        elif phase=='before_create':
            ttl=state.get('attempt_ttl_hours')
            charge=state.get('attempt_reserved_upper_bound_usd')
            if isinstance(ttl,bool) or not isinstance(ttl,(int,float)) or not math.isfinite(ttl) or ttl<=0 \
                    or isinstance(charge,bool) or not isinstance(charge,(int,float)) or not math.isfinite(charge) \
                    or abs(charge-ttl*pod_runner.MAX_HOURLY_USD)>1e-9 \
                    or state.get('attempt_contingency_usd', 0) != self.contingency_usd \
                    or abs(state.get('spent_upper_bound_usd',float('inf'))-a['original_spent_upper_bound_usd']-charge-self.contingency_usd)>1e-9:
                raise ValueError('fresh generation reservation charge differs')
            if json.loads(self.claim.read_text()).get('authority_sha256')!=self.digest \
                    or state.get('creation_attempts')!=a['original_creation_attempts']+1 \
                    or pod_capacity.allocation_count(state,pod_runner.PODS_DIR)!=a['allowed_total_allocations'] \
                    or state.get('spent_upper_bound_usd',0)<a['original_spent_upper_bound_usd'] \
                    or state.get('spent_upper_bound_usd',float('inf'))>pod_runner.PER_ORDER_CAP_USD \
                    or charge > self.max_new_usd or ttl > self.max_ttl_hours \
                    or state.get('attempt_ttl_hours',float('inf'))>min(pod_runner.TTL_CAP_HOURS,
                       (pod_runner.PER_ORDER_CAP_USD-a['original_spent_upper_bound_usd'])/pod_runner.MAX_HOURLY_USD):
                raise ValueError('fresh generation reservation exceeds original accounting')
            exclusive(self.create_claim,{'authority_sha256':self.digest,'creation_attempts':state['creation_attempts']})
        else:
            raise ValueError('invalid fresh-generation lifecycle phase')
        return a['allowed_total_allocations']


def historical_journal(path):
    """Authenticate copied old exact-id receipts, never mutate/reprice their history."""
    journal = json.loads(Path(path).read_text())
    expected = [('b11adf4f-dffd-47b7-8d3c-2ea71015f2a6', 'state.json'),
                ('d0011715-9e61-4641-8676-5c93faa26cee', 'state-run2.json')]
    if (journal.get('order_id') != DECISOR or journal.get('conservative_spent_upper_bound_usd') != 7.8
            or journal.get('creation_attempts') != 2 or journal.get('allocations') != 2
            or len(journal.get('receipts', [])) != 2):
        raise ValueError('invalid Decisor history scope')
    for entry, (pod_id, filename) in zip(journal['receipts'], expected):
        receipt_path = Path(path).parent/'decisor-history'/filename
        if entry.get('file') != filename or entry.get('sha256') != sha(receipt_path):
            raise ValueError('Decisor historical receipt changed')
        old = json.loads(receipt_path.read_text())
        if (old.get('pod_id') != pod_id or old.get('hourly_usd') != 1.3
                or old.get('still_listed_after_rm') is not False or not old.get('torn_down_at')
                or not old.get('reservation_id') or not old.get('created_at')
                or entry.get('ttl_hours') != 3):
            raise ValueError('Decisor historical allocation or cleanup unproven')
    return journal
