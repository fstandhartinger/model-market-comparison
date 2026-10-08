"""Proposed coverage-only semantics; never filters the official scoring union."""
def response_class(row):
    status = row.get('status_code')
    # Operational statuses override contradictory ok=True records.
    if status in (401, 403): return 'authentication'
    if status == 429: return 'rate_limit'
    if isinstance(status, int) and status >= 500: return 'service_failure'
    # Reviewed JevBench runner contract: 422 is a completed model/input refusal.
    if status == 422: return 'refusal'
    if isinstance(status, int) and status >= 400: return 'other_http_failure'
    if row.get('ok', True) and not row.get('error'): return 'response'
    if status is None: return 'transport_or_unclassified'
    return 'response_error_unclassified'

def answered_supported(row, supported=True):
    return bool(supported and response_class(row) in ('response', 'refusal'))

def coverage_cell(records):
    """records are the already frozen supported scorer union, first-source once."""
    records = list(records)
    return {'scored_n': len(records), 'coverage_n': sum(answered_supported(r) for r in records),
            'response_n': sum(response_class(r) == 'response' for r in records),
            'refusal_n': sum(response_class(r) == 'refusal' for r in records),
            'operational_failure_n': sum(not answered_supported(r) for r in records)}

class CoverageRegistry:
    """Associate statuses with exact supported (gold, score) objects selected by the scorer.

    Retain references to prevent Python id reuse. No item status changes the score.
    Existing first-source union selects an exact pair; only that pair's status counts.
    """
    def __init__(self):
        self._records = {}
    def bind(self, items, raw):
        by = {r.get('task_id') or r.get('id'):r for r in raw}
        if len(by) != len(raw): raise ValueError('Duplicate response IDs')
        for gold, score in items:
            if gold.oid not in by: raise ValueError('Supported scored pair has no recorded response')
            r=by[gold.oid]
            metadata={'ok':r.get('ok',True),'error':bool(r.get('error')),'status_code':r.get('status_code')}
            key=(id(gold),id(score))
            if key in self._records and self._records[key][2] != metadata: raise ValueError('Conflicting exact-pair status')
            self._records[key]=(gold,score,metadata)
    def enrich(self, cells, items, keyfn):
        groups={}
        for gold,score in items:
            label=keyfn(gold)
            if label not in cells: continue
            key=(id(gold),id(score))
            if key not in self._records: raise ValueError('Missing exact selected-record coverage status')
            groups.setdefault(label,[]).append(self._records[key][2])
        result={}
        for label,cell in cells.items():
            counters=coverage_cell(groups.get(label,[]))
            if counters.pop('scored_n') != cell['n']: raise ValueError('Coverage/scored cell membership mismatch')
            result[label]={**cell,**counters}
        return result
