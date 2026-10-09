"""Public metadata-only addendum proof scaffold; no manifest or PASS generation."""
import copy, math, re, statistics
from datetime import datetime
from cohort import BASE, NATIVE, FIXED, completed_shape, PREDECESSOR_COST_SHA256

def hex64(value):
    return isinstance(value, str) and re.fullmatch('[a-f0-9]{64}', value) is not None

def prepare_proof(previous, artifact, measurement_rows, baseline_sha256,
                  official_source_sha256, predecessor_publication_sha256, category_reference):
    if previous.get('cost_basis_sha256') != PREDECESSOR_COST_SHA256:
        raise ValueError('immutable published predecessor cost hash required')
    row_keys={'key','rows','admission','admission_sha256','raw_sha256','native_receipt_sha256','source_review_sha256','scoring_admission_sha256','source_pins_sha256','model_commit','code_commit','model_url','code_url','completed_at','disposition'}
    category_keys={'scope','evidence_sha256','raw_labels_sha256','ruled_labels_sha256','input_sha256','gold_sha256','validated_label_records','public_handcheck_items'}
    if any(not isinstance(r,dict)or set(r)!=row_keys for r in measurement_rows):
        raise ValueError('exact measurement proof fields required')
    if not isinstance(category_reference,dict)or set(category_reference)-category_keys:
        raise ValueError('exact category proof fields required')
    keys = [r['key'] for r in artifact['systems']]
    shape = completed_shape(keys)
    if len(keys) != len(set(keys)) or {r['key'] for r in measurement_rows} != set(keys) or len(measurement_rows) != len(keys):
        raise ValueError('exact actual completed measurement proof coverage')
    if artifact.get('revision') != 'v1.6.3' or artifact.get('not_measured') != []:
        raise ValueError('addendum identity')
    if not all(hex64(x) for x in (baseline_sha256, official_source_sha256, predecessor_publication_sha256)):
        raise ValueError('actual baseline/source/predecessor hashes required')
    if not isinstance(category_reference,dict) or not isinstance(category_reference.get('evidence_sha256'),dict) or not category_reference['evidence_sha256'] or not all(hex64(h) for h in category_reference['evidence_sha256'].values()):
        raise ValueError('actual successor category receipt hashes required')
    for field in ('raw_labels_sha256','ruled_labels_sha256','input_sha256','gold_sha256'):
        if not hex64(category_reference.get(field))or not hex64(previous['category_reference'].get(field))or category_reference[field] != previous['category_reference'][field]:
            raise ValueError('unchanged draw and actual label provenance required')
    if category_reference.get('validated_label_records') != 3000 or category_reference.get('public_handcheck_items') != 75:
        raise ValueError('real original3000 validation and75review required')
    if 'source_sha256' in artifact and artifact['source_sha256'] != official_source_sha256:
        raise ValueError('actual official source binding')
    if artifact.get('bootstrap') != {'B':1000,'bootstrap_seed':16,'g_med_fixed':True}:
        raise ValueError('unchanged official bootstrap')
    old = {r['key']:r for r in previous['systems']}
    immutable = ('rows', 'admission', 'admission_sha256', 'raw_sha256', 'native_receipt_sha256',
                 'source_review_sha256', 'model_commit', 'code_commit', 'model_url', 'code_url', 'completed_at', 'disposition')
    for row in measurement_rows:
        if row.get('rows') != 1500 or row.get('admission') != 'ACCEPTED':
            raise ValueError('actual1500 admission required')
        if row.get('disposition') != ('native_ranked' if row['key'] in NATIVE else 'wrapper_unranked'):
            raise ValueError('measurement source disposition changed')
        for field in ('admission_sha256','raw_sha256','source_review_sha256','native_receipt_sha256','scoring_admission_sha256','source_pins_sha256'):
            if not hex64(row.get(field)):
                raise ValueError('actual receipt hash missing')
        for field in ('model_commit','code_commit'):
            if re.fullmatch('[a-f0-9]{40}', row.get(field,'')) is None:
                raise ValueError('actual model/code commit missing')
        when=datetime.fromisoformat(row.get('completed_at','').replace('Z','+00:00'))
        if when.tzinfo is None or any(not isinstance(row.get(k),str)or not row[k].startswith('https://')for k in ('model_url','code_url')):
            raise ValueError('actual completion timestamp/repository references')
        if row['key'] in BASE and any(row.get(k) != old[row['key']].get(k) for k in immutable):
            raise ValueError('original measured provenance changed')
    members = []
    for row in artifact['systems']:
        if row.get('ranked') is not (row['key'] in NATIVE):
            raise ValueError('frozen ranking disposition')
        if row['key'] in NATIVE:
            gap = row['intelligence']['gap']
            if isinstance(gap,bool) or not isinstance(gap,(int,float)) or not math.isfinite(gap):
                raise ValueError('actual finite native gap')
            members.append({'key':row['key'],'gap':gap})
    if artifact.get('G_med') != statistics.median(r['gap'] for r in members):
        raise ValueError('whole native field median differs')
    inherited=('schema_version','method','noul_method','bootstrap','cohort_preregistration_sha256','cohort_roster','completion_rule','cost_basis_sha256','draw_release','freeze_manifest_sha256','frozen_capability_envelope','seed_commitment_sha256','source_dispositions_sha256')
    proof = {k:copy.deepcopy(previous[k])for k in inherited if k in previous}
    proof.update(revision='v1.6.3', source_sha256=official_source_sha256,
                 completed_baseline_sha256=baseline_sha256, systems=copy.deepcopy(measurement_rows),
                 category_reference=copy.deepcopy(category_reference),
                 predecessor={'revision':'v1.6.2','publication_sha256':predecessor_publication_sha256},
                 field_median={'members':members,'G_med':artifact['G_med'],'minimum_complete':3,
                               'historical_rows_included':False,'wrappers_included':False})
    if len(proof['cohort_roster']) != 6 or {r['key'] for r in proof['cohort_roster']} != FIXED:
        raise ValueError('fixed six proof roster')
    for row in proof['cohort_roster']:
        key = row['key']
        if key in shape['completed']:
            row.update(status='complete',rows=1500,included_in_field_median=key in NATIVE)
            row.pop('reason',None)
        # Noncompleted authentic pending status stays unchanged.
    return proof
