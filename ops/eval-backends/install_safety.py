"""Install the host-side CoreWeave extension with exact source pins.
Run on Sandy only; never modifies billing, site deployment or existing orders.
"""
import fcntl, hashlib, json, os, shutil
from pathlib import Path

PATCHES = {
 'gpu-pod-guard':[
  ('rows.extend(UC.inventory())','rows.extend(UC.inventory())\n    rows.extend(CW.inventory())'),
  ("{'lium','runpod','upcloud'}","{'lium','runpod','upcloud','coreweave'}"),
  ('    inventory=provider_pods(); events=read_events(); reservations,pods=current_records(events)',
   "    if a.provider == 'coreweave': CW.launch_allowance(rate * runtime)\n    inventory=provider_pods(); events=read_events(); reservations,pods=current_records(events)")],
 'gpu-reaper':[
  ('res.extend(UC.inventory())','res.extend(UC.inventory())\n    res.extend(CW.inventory())'),
  ('def terminate(p):','def terminate(p):\n    if p.get("provider") == "coreweave": return CW.terminate(p["id"])'),
  ('        record = central_record(p)',"        record = central_record(p)\n        if p.get('provider') == 'coreweave' and not record:\n            continue  # count org-wide capacity but never reap foreign sandboxes")],
 'gpu-cost-monitor':[
  ('            total+=u_total','            total+=u_total\n            cw_total=CW.conservative_spend()\n            total+=cw_total'),
  ('            if u_total:jobs',"            if cw_total:jobs['coreweave-monthly-reserved-upper-bound']=cw_total\n            if u_total:jobs")]
}


def transform(name,text):
    changes=[('import upcloud_gpu_safety as UC','import upcloud_gpu_safety as UC\nimport coreweave_gpu_safety as CW'),*PATCHES[name]]
    if 'import coreweave_gpu_safety as CW' in text:raise RuntimeError('extension already present; verify exact installed source')
    for old,new in changes:
        if text.count(old)!=1:raise RuntimeError('shared source changed: '+name)
        text=text.replace(old,new)
    compile(text,name,'exec')
    return text


def install(pins, receipts):
    root=Path.home()/'bin';receipts=Path(receipts);receipts.mkdir(parents=True,exist_ok=True)
    planned={}
    for name in PATCHES:
        p=root/name
        if hashlib.sha256(p.read_bytes()).hexdigest()!=pins[name]:raise RuntimeError('shared source pin changed: '+name)
        planned[name]=transform(name,p.read_text())
    helper=Path(__file__).with_name('coreweave_gpu_safety.py')
    shutil.copy2(helper,root/helper.name)
    for name,text in planned.items():
        p=root/name;shutil.copy2(p,receipts/(name+'.before'))
        temp=root/(name+'.coreweave-new');temp.write_text(text);os.chmod(temp,p.stat().st_mode)
        os.replace(temp,p)
    return {name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in planned}

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--pins',required=True);p.add_argument('--receipts',required=True);a=p.parse_args()
    with (Path.home()/'.locks/coreweave-safety-install.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        print(json.dumps(install(json.loads(Path(a.pins).read_text()),a.receipts)))
