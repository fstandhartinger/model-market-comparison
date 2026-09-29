"""Schema-independent publication guard, shared by all paid release validation."""
import re
import hashlib
import json

FORBIDDEN = set('token question question_text prompt gold golds gold_key gold_label answer_key answer_keys ground_truth ground_truths correct_answer correct_choice answer answers answer_index expected_answer prediction predictions predicted predicted_answer item_id item_ids item_text item_results per_item per_item_scores raw_response raw_output raw_answer image_url'.split())
NORMALIZED = {re.sub('[^a-z0-9]', '', key) for key in FORBIDDEN}


def aggregate_only(value):
    if isinstance(value, list):
        for item in value:
            aggregate_only(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            if re.sub('[^a-z0-9]', '', key.lower()) in NORMALIZED:
                raise ValueError('public artifact contains an item-level field')
            aggregate_only(item)


def image_coverage(base, candidate):
    """Preserve reviewed catalogue metadata; only derive ranks in existing status prose."""
    import copy
    value = copy.deepcopy(base.get('candidate_coverage'))
    if value is None:
        return None
    ranking = {row['key']: row for row in candidate['ranking']}
    for item in value.get('candidates', []):
        key = item.get('ranking_key')
        if key in ranking:
            item['status'] = f"included in {candidate['revision']} ranking (#{ranking[key]['rank']} of {len(ranking)})"
    # Existing catalogue remains historical, with a precise generic note for a new paid row.
    value['included_note'] = 'Paid revision; the full ranking above includes the independently measured result.'
    return value


def image_provenance(base, candidate, official):
    def digest(value):
        return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True,
                                         allow_nan=False).encode()).hexdigest()
    if 'release_provenance' not in base:
        return None
    return {'parent_revision': base['revision'],
            **{k: base[k] for k in ('method_sha256', 'split_sha256', 'scoring_code_sha256')},
            'source_sha256': {'parent_artifact': digest(base), 'official_result': digest(official)},
            'aggregate_row_sha256': {row['key']: digest(row['tracks']) for row in candidate['ranking']}}
