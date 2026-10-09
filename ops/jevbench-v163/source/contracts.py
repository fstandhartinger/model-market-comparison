"""Pure prospective contract assembly from authenticated Root metadata.

No I/O, raw parsing, inference, acceptance or publication. Root verifies references
and obtains genuine new Source acceptance before executing any assembled contract.
"""
import copy, math
from cohort import BASE, FIXED, NATIVE, completed_shape, disposition, PREDECESSOR_COST_SHA256

def successor_field_contract(previous, completed_registry, actual_native_receipts,
                             actual_reference_pins, source_sha256, launcher_sha256,
                             preregistration_host, output_host, cohort_source_sha256):
    roster = previous['roster']
    if len(roster) != 6 or {r['key'] for r in roster} != FIXED:
        raise ValueError('exact original six preregistered keys required')
    if {r['key'] for r in roster if r['status'] == 'complete'} != BASE:
        raise ValueError('immutable four-completed predecessor required')
    if set(actual_native_receipts) != set(completed_registry):
        raise ValueError('actual native receipt coverage')
    shape = completed_shape(completed_registry)
    inherited={'cost_basis_host','cost_producer_binding','eligibility','gold_host','gold_sha256','input_sha256','later_completion','launcher_sha256','minimum_eligible_complete','output_host','preregistration_sha256','root_pins_actual_cost_basis_hash_after_accepted_adoption','roster','schema_version','scope','scorer_directory','source_files','source_sha256','preregistration_host','predecessor_cost_basis_sha256','cost_basis_sha256'}
    result = {k:copy.deepcopy(v)for k,v in previous.items()if k in inherited}
    result['proposal_status']='SOURCE_PROPOSAL_NOT_ACCEPTED'
    result.update(source_sha256=source_sha256, launcher_sha256=launcher_sha256,
                  preregistration_host=preregistration_host, output_host=output_host,
                  cohort_source_sha256=cohort_source_sha256)
    for row in result['roster']:
        key = row['key']
        if key not in completed_registry:
            continue
        actual = completed_registry[key]
        receipt = actual_native_receipts[key]
        if actual['order_id'] != row['order_id'] or not actual.get('measurement_complete'):
            raise ValueError('original order identity and actual completion required')
        if (receipt.get('rows') != 1500 or receipt.get('raw_sha256') != actual['raw']['sha256']
                or receipt.get('pins', {}).get('profile', {}).get('inputs', {}).get('jevbench', {}).get('items', {}).get('sha256') != previous['input_sha256']):
            raise ValueError('actual full1500 same-draw receipt required')
        if key in BASE:
            if row['raw_sha256'] != actual['raw']['sha256'] or row['raw_path'] != actual['raw']['path']:
                raise ValueError('original raw provenance changed')
            # Preserve every original source/pricing/receipt field byte-semantically.
            continue
        system = copy.deepcopy(actual['metadata']['jevbench']['system'])
        ranked = disposition(key) == 'native_nonwrapper'
        if system.get('ranked') is not ranked or system.get('lane') != 'selfhosted' or system.get('endpoint_kind') != 'gpu':
            raise ValueError('frozen native/wrapper disposition changed')
        row.update(status='complete', disposition=disposition(key), system=system,
                   raw_path=actual['raw']['path'], raw_sha256=actual['raw']['sha256'])
        row.pop('reason', None)
    if set(actual_reference_pins)&set(result['source_files']):
        raise ValueError('original source pins cannot be overwritten')
    result['metadata_pins']=copy.deepcopy(actual_reference_pins)
    pin=previous.get('predecessor_cost_basis_sha256')or previous.get('cost_basis_sha256')or PREDECESSOR_COST_SHA256
    if pin!=PREDECESSOR_COST_SHA256:raise ValueError('authentic predecessor cost basis hash required')
    result['predecessor_cost_basis_sha256']=pin
    result['addendum_membership'] = shape
    return result

def successor_category_contract(previous, completed_entries, result_reference,
                                result_source_sha256, g_med, source_sha256, launcher_sha256,
                                cohort_source_sha256):
    keys = [r['key'] for r in completed_entries]
    if len(keys) != len(set(keys)):
        raise ValueError('duplicate category system')
    completed_shape(keys)
    if isinstance(g_med,bool)or not isinstance(g_med,(int,float))or not math.isfinite(g_med):
        raise ValueError('actual finite native field median')
    if any(r.get('system',{}).get('ranked')is not(r['key']in NATIVE)for r in completed_entries):
        raise ValueError('frozen category ranking disposition')
    if {r['key'] for r in previous['completed']} != BASE:
        raise ValueError('original four-category contract required')
    old = {r['key']:r for r in previous['completed']}
    for entry in completed_entries:
        if entry['key'] in old and entry != old[entry['key']]:
            raise ValueError('original category raw/source/pricing metadata changed')
    inherited={'G_med','completed','draw_release','gold_host','gold_sha256','input_sha256','launcher_sha256','public_results_host','public_results_sha256','schema_version','scope','source_files','source_results_sha256','source_sha256'}
    result = {k:copy.deepcopy(v)for k,v in previous.items()if k in inherited}
    result['proposal_status']='SOURCE_PROPOSAL_NOT_ACCEPTED'
    result.update(source_sha256=source_sha256, launcher_sha256=launcher_sha256,
                  cohort_source_sha256=cohort_source_sha256,
                  completed=copy.deepcopy(completed_entries),
                  public_results_host=result_reference['path'], public_results_sha256=result_reference['sha256'],
                  source_results_sha256=result_source_sha256, G_med=g_med,
                  addendum_membership=completed_shape(keys))
    return result
