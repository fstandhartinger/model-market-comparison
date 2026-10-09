"""Host-only CoreWeave allowance, inventory and exact-ID termination.

The CLI runs in the pinned SDK venv; shared GPU tools import the stdlib facade.
No sandbox is created here and no billing settings are mutated.
"""
from __future__ import annotations
import argparse, base64, datetime as dt, json, math, os, subprocess, sys, urllib.request
from pathlib import Path

ORG = 'system1models-org'
ENABLED = Path.home() / '.config/coreweave-eval-enabled'
PYTHON = Path.home() / '.local/share/coreweave-eval/venv/bin/python'
HELPER = Path.home() / 'bin/coreweave_gpu_safety.py'
LEDGER = Path.home() / '.local/state/gpu-pods/ledger.jsonl'
PRICE_RECEIPT = Path.home() / '.config/coreweave-eval-price.json'
QUERY = '''{ organization(name:"system1models-org") { name subscriptions { subscriptionType status privileges } usageByPeriod(usagePeriod:CURRENT_CYCLE, usageType:SANDBOXES_COST, viewType:CUMULATIVE) { intervals { startDate endDate stackTotal } } } }'''


def credential():
    value = os.environ.get('COREWEAVE_SANDBOX_API_KEY')
    if not value:
        for line in (Path.home()/'.config/dev-secrets.env').read_text().splitlines():
            key, sep, val = line.strip().removeprefix('export ').partition('=')
            if sep and key.strip() == 'COREWEAVE_SANDBOX_API_KEY':
                value = val.strip().strip('\"\'')
    if not value:
        raise RuntimeError('CoreWeave credential unavailable')
    return value


def allowance():
    auth = base64.b64encode(('api:' + credential()).encode()).decode()
    req = urllib.request.Request('https://api.wandb.ai/graphql', data=json.dumps({'query':QUERY}).encode(),
        headers={'Authorization':'Basic '+auth,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: data=json.load(r)
    except Exception:
        raise RuntimeError('Forge allowance API unavailable') from None
    if data.get('errors'): raise RuntimeError('Forge allowance query refused')
    org=data.get('data',{}).get('organization')
    if not isinstance(org,dict) or org.get('name')!=ORG: raise RuntimeError('Forge organization differs')
    subs=[s for s in org['subscriptions'] if s['status']=='ENABLED']
    # A sandbox-specific paid subscription must never be enabled by this route.
    if any('SANDBOX' in s['subscriptionType'] for s in subs): raise RuntimeError('Sandbox paid subscription present')
    limits=[s['privileges'] for s in subs if isinstance(s.get('privileges'),dict)
            and s['privileges'].get('enforce_sandboxes_free_limit') is True]
    if len(limits)!=1 or limits[0].get('sandboxes_free_limit')!=3000:
        raise RuntimeError('Forge free allowance enforcement differs')
    now=dt.datetime.now(dt.timezone.utc)
    intervals=org['usageByPeriod']['intervals']
    current=[i for i in intervals if dt.datetime.fromisoformat(i['startDate'].replace('Z','+00:00')).date()==now.date()]
    if len(current)!=1 or type(current[0]['stackTotal']) is not int or current[0]['stackTotal']<0:
        raise RuntimeError('Forge current usage unavailable')
    # SANDBOXES_COST and free_limit are cents. Compare in the same provider unit.
    return {'organization':ORG,'pay_as_you_go':False,'allowance_usd':30.0,
        'used_usd':current[0]['stackTotal']/100,'raw_usage_cents':current[0]['stackTotal'],
        'cycle':now.strftime('%Y-%m'),'observed_at':now.isoformat(),
        'source':'Forge GraphQL CURRENT_CYCLE SANDBOXES_COST CUMULATIVE',
        'reset_note':'Requery CURRENT_CYCLE each launch; never infer a reset from trial expiration.'}


def sdk_auth():
    os.environ['WANDB_API_KEY']=credential()
    os.environ['OPENAI_API_KEY']=''
    from cwsandbox import AuthStrategy
    return AuthStrategy.WANDB


def sdk_inventory():
    from cwsandbox import Sandbox
    sandboxes=Sandbox.list(auth=sdk_auth(),timeout_seconds=30).result()
    # Count every active sandbox conservatively, including CPU and STARTING ones.
    return [{'provider':'coreweave','id':s.sandbox_id,'name':s.sandbox_id,
             'status':str(s.status),'gpu_type':'RTXPRO6000','price_per_hour':5.0,'age_h':0.0}
            for s in sandboxes if str(s.status).upper() not in {'COMPLETED','TERMINATED','FAILED'}]


def sdk_terminate(pod_id):
    # Never terminate an unrelated org sandbox, including via the reaper.
    owned=None
    for line in LEDGER.read_text().splitlines():
        e=json.loads(line)
        if e.get('pod_id')!=pod_id:continue
        if e.get('event')=='attach' and e.get('provider')=='coreweave':owned=e
        elif e.get('event') in {'release','terminated'}:owned=None
    if not owned:raise RuntimeError('CoreWeave exact ID is not centrally owned')
    from cwsandbox import Sandbox
    sb=Sandbox.from_id(pod_id,auth=sdk_auth(),timeout_seconds=30).result()
    sb.stop(missing_ok=True,wait_for_ready=False).result()
    if any(p['id']==pod_id for p in sdk_inventory()): raise RuntimeError('CoreWeave termination unconfirmed')
    return True


def helper_call(action, pod_id=None):
    argv=[str(PYTHON),str(HELPER),action]
    if pod_id:argv.append(pod_id)
    p=subprocess.run(argv,capture_output=True,text=True,timeout=90,
                     env={'HOME':str(Path.home()),'PATH':'/usr/bin:/bin','OPENAI_API_KEY':''})
    if p.returncode:raise RuntimeError('CoreWeave '+action+' failed')
    return json.loads(p.stdout)


def inventory():
    return helper_call('inventory') if ENABLED.exists() else []


def terminate(pod_id):
    # The shared reaper calls this only after central ownership/caps checks.
    if not ENABLED.exists():return False,'CoreWeave integration disabled'
    try:return bool(helper_call('terminate',pod_id)),''
    except Exception:return False,'CoreWeave exact-ID termination unconfirmed'


def reserved_month_usd():
    """Full TTL liabilities include closed runs until the month changes.

    Provider usage may lag, so retain liabilities instead of netting an unverified
    settled amount. This can stop early, but cannot admit on a stale zero meter.
    """
    month=dt.datetime.now(dt.timezone.utc).strftime('%Y-%m'); total=0.0
    if not LEDGER.exists():return total
    for line in LEDGER.read_text().splitlines():
        e=json.loads(line)
        if e.get('event')=='reserve' and e.get('provider')=='coreweave' and str(e.get('at','')).startswith(month):
            value=float(e['hourly_price_usd'])*float(e['runtime_cap_seconds'])/3600
            if not math.isfinite(value) or value<=0:raise RuntimeError('CoreWeave ledger liability invalid')
            total+=value
    return total


def launch_allowance(requested_usd):
    now=dt.datetime.now(dt.timezone.utc)
    # The declared liability covers the full TTL at the accounting rate.
    # Hold launches spanning the provider month while the usage meter can lag.
    try:
        finish=now+dt.timedelta(seconds=requested_usd*3600/5+600)
    except (OverflowError,TypeError):
        raise RuntimeError('CoreWeave lifetime liability invalid') from None
    if finish.strftime('%Y-%m')!=now.strftime('%Y-%m'):
        raise RuntimeError('CoreWeave launch crosses allowance cycle')
    a=helper_call('allowance'); reserve=reserved_month_usd()
    if not math.isfinite(requested_usd) or requested_usd<=0 or a['used_usd']+reserve+requested_usd>=27:
        raise RuntimeError('CoreWeave 90 percent allowance stop')
    # Scored traffic needs an owner-accepted account quote or settled billing.
    # Published cloud GPU prices are not sandbox pricing evidence.
    price_verified=False
    if PRICE_RECEIPT.exists():
        price=json.loads(PRICE_RECEIPT.read_text())
        total=price.get('total_hourly_usd')
        price_verified=(price.get('organization')==ORG and price.get('gpu')=='RTXPRO6000'
            and price.get('cpu')==4 and price.get('memory_gib')==16
            and price.get('cycle')==a.get('cycle') and price.get('owner_accepted') is True
            and isinstance(price.get('source'),str) and bool(price['source'].strip())
            and type(total) in (int,float) and 0<total<=5)
    return {**a,'reserved_usd':reserve,'requested_usd':requested_usd,'price_verified':price_verified}


def conservative_spend():
    # Monthly liability overcounts UTC-day spend deliberately until cost settles.
    return reserved_month_usd() if ENABLED.exists() else 0.0


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['inventory','allowance','terminate']);p.add_argument('pod_id',nargs='?');a=p.parse_args()
    try:
        value=sdk_inventory() if a.action=='inventory' else allowance() if a.action=='allowance' else sdk_terminate(a.pod_id)
        print(json.dumps(value))
    except Exception as exc:
        # SDK exception text may contain credentials or remote payloads.
        print('CoreWeave operation failed: '+type(exc).__name__,file=sys.stderr);sys.exit(1)
