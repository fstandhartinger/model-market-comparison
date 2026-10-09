"""Root-only one-use Source proposal staging from real completed metadata.

No raw/gold/label parsing, benchmark execution, acceptance or publication.
Creates a new proposal directory, which Root independently reads and reviews.
"""
import sys,os,json,hashlib,stat,re
from pathlib import Path
sys.dont_write_bytecode=True
os.environ['PYTHONDONTWRITEBYTECODE']='1'
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from contracts import successor_field_contract

def digest(p):
    p=Path(p)
    if p.is_symlink() or not p.is_file():raise ValueError('regular source/metadata file required')
    return hashlib.sha256(p.read_bytes()).hexdigest()

def metadata(ref):
    if set(ref)!={'path','sha256'} or re.fullmatch('[a-f0-9]{64}',ref['sha256'])is None:
        raise ValueError('actual pinned metadata reference')
    p=Path(ref['path']).absolute()
    if '..'in p.parts or '/jevbench-sealed/'in str(p) or p.suffix!='.json' or p.stat().st_size>2000000:
        raise ValueError('metadata only; no protected bodies')
    for part in (*reversed(p.parents),p):
        m=part.lstat().st_mode
        if not(stat.S_ISREG(m)if part==p else stat.S_ISDIR(m)):raise ValueError('metadata custody path')
    if digest(p)!=ref['sha256']:raise ValueError('metadata hash drift')
    value=json.loads(p.read_text())
    if not isinstance(value,dict):raise ValueError('metadata object only, never item arrays')
    return value

def verify_admitted_join(row,receipt,admission,review):
    if admission.get('schema_version')!=1 or admission.get('verdict')!='ACCEPTED'or admission.get('order_id')!=row['order_id']:
        raise ValueError('genuine admitted order receipt required')
    if review.get('verdict')!='ACCEPTED'or review.get('reviewer_engine')!='claude'or review.get('admission_sha256')!=row['admission']['sha256']:
        raise ValueError('genuine independent profile admission review required')
    measurement=admission.get('references',{}).get('measurement',{}).get('sha256')
    if measurement!=receipt.get('pins',{}).get('manifest_sha256')or not isinstance(measurement,str)or len(measurement)!=64:
        raise ValueError('admitted measurement profile receipt differs')

def main():
    if os.environ.get('AGENT_BOARD_NAME')!='codex:fastlane-v16-finish-20261009':raise ValueError('Root only')
    request=json.loads(Path(sys.argv[1]).read_text())
    if set(request)!={'previous_contract','completed_registry','native_receipts','additional_metadata_pins','preregistration_host','output_host','proposal_directory'}:
        raise ValueError('exact field proposal request')
    old=metadata(request['previous_contract']);registry=metadata(request['completed_registry'])
    rows={x['metadata']['jevbench']['system_key']:x for x in registry['completed_systems']}
    if len(rows)!=len(registry['completed_systems']):raise ValueError('duplicate completed registry key')
    receipts={k:metadata(v)for k,v in request['native_receipts'].items()}
    bound_pins=dict(request['additional_metadata_pins'])
    bound_pins['successor_completed_registry']=request['completed_registry']
    for key,row in rows.items():
        if row['native_receipt']['sha256']!=request['native_receipts'][key]['sha256']:
            raise ValueError('native receipt registry binding')
        verify_admitted_join(row,receipts[key],metadata({k:row['admission'][k]for k in ('path','sha256')}),metadata({k:row['profile_review'][k]for k in ('path','sha256')}))
        for field in ('native_receipt','measurement_metadata','source_pins','admission','profile_review'):
            ref={k:row[field][k]for k in ('path','sha256')}
            content=metadata(ref)
            bound_pins[key+'_'+field]=ref
    # New source references remain metadata and are independently hash checked.
    for ref in request['additional_metadata_pins'].values():metadata(ref)
    target=Path(request['proposal_directory']).absolute()
    if not str(target).startswith('/home/flori/jobs/fastlane-v16-finish-20261009/proposals/') or '..'in target.parts:
        raise ValueError('owned Source proposal boundary')
    for part in (*reversed(target.parent.parents),target.parent):
        if not stat.S_ISDIR(part.lstat().st_mode):raise ValueError('proposal parent custody')
    names=('completed_field_builder.py','completed_field_launcher.py','cohort.py')
    pins={n:digest(HERE/n)for n in names}
    contract=successor_field_contract(old,rows,receipts,bound_pins,
        pins[names[0]],pins[names[1]],request['preregistration_host'],request['output_host'],pins['cohort.py'])
    target.mkdir(mode=0o700,exist_ok=False)
    for name in names:
        (target/name).write_bytes((HERE/name).read_bytes())
        if digest(target/name)!=pins[name]:raise ValueError('source changed during staging')
    (target/'COMPLETED-FIELD-CONTRACT.json').write_text(json.dumps(contract,indent=2,sort_keys=True,allow_nan=False)+'\n')
    receipt={'scope':'SOURCE_PROPOSAL_ONLY_NOT_ACCEPTED','source_pins':pins,
        'contract_sha256':digest(target/'COMPLETED-FIELD-CONTRACT.json'),'completed_registry':request['completed_registry'],'request':request,
        'benchmark_executed':False,'acceptance_created':False}
    # This receipt lives beside the proposal, not inside its later frozen inventory.
    output=target.with_name(target.name+'-STAGING-RECEIPT.json')
    with output.open('x')as f:json.dump(receipt,f,indent=2);f.write('\n')
    print(str(output))
if __name__=='__main__':main()
