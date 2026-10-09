"""Bounded CoreWeave lifecycle. Trusted callbacks keep methodology unchanged.

prepare uploads reviewed code and public weights through SDK files. Sandboxes
start with network denied; measure is the exposure boundary. After it is reached,
provider fallback is forbidden even when no raw rows were returned.
"""
from __future__ import annotations
import datetime as dt, json, math, os, re, subprocess, time
from pathlib import Path
import coreweave_gpu_safety as safety

GUARD=Path.home()/'bin/gpu-pod-guard'

class PreDispatchUnavailable(RuntimeError):
    pass

class MeasurementInterrupted(RuntimeError):
    pass

class CleanupUncertain(RuntimeError):
    pass


def guard(*args):
    p=subprocess.run([str(GUARD),*map(str,args)],capture_output=True,text=True,timeout=180,
                     env={'HOME':str(Path.home()),'PATH':'/usr/bin:/bin','OPENAI_API_KEY':''})
    if p.returncode:raise RuntimeError('shared GPU guard refused operation')
    return json.loads(p.stdout)


def save(path, value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_name(path.name+'.tmp')
    with temp.open('w') as f:
        os.chmod(temp,0o600);json.dump(value,f,indent=2);f.flush();os.fsync(f.fileno())
    os.replace(temp,path)


def definite_create_rejection(exc):
    # The pinned SDK preserves the underlying authenticated gRPC exception.
    # Generic UNAVAILABLE/timeouts never prove that allocation did not commit.
    import grpc
    from cwsandbox._sandbox import _create_attempt_definitely_rejected
    from cwsandbox._error_info import parse_error_info, CWSANDBOX_ERROR_DOMAIN
    seen=set()
    while exc is not None and id(exc) not in seen:
        seen.add(id(exc))
        if isinstance(exc,grpc.RpcError):
            if _create_attempt_definitely_rejected(exc):return True
            info=parse_error_info(exc)
            return bool(info and info.domain==CWSANDBOX_ERROR_DOMAIN and
                        info.reason=='CWSANDBOX_OCCUPANCY_QUOTA_EXCEEDED' and
                        exc.code()==grpc.StatusCode.RESOURCE_EXHAUSTED)
        exc=exc.__cause__
    return False


def run(job, image, lifetime_seconds, startup_seconds, receipt_path, prepare, measure, *, require_verified_price=False):
    """Run once; return callback result only after exact-ID teardown proof.

    Uses USD5/h as an accounting liability, not a claim about the provider rate.
    Scoring admission belongs to router/owner gates; diagnostics use <=600s.
    """
    if type(lifetime_seconds) is not int or not 1<=lifetime_seconds<=10800:
        raise ValueError('bounded sandbox lifetime required')
    if type(startup_seconds) is not int or not 1<=startup_seconds<=min(300,lifetime_seconds):
        raise ValueError('startup deadline required')
    if not isinstance(image,str) or not re.fullmatch(r'[A-Za-z0-9._/-]+(?::[A-Za-z0-9_.-]+)?@sha256:[0-9a-f]{64}',image):raise ValueError('digest-pinned sandbox image required')
    if not safety.ENABLED.exists():raise PreDispatchUnavailable('CoreWeave lifecycle accounting unavailable')
    from cwsandbox import Sandbox
    auth=safety.sdk_auth()
    record={'backend':'coreweave','job':job,'image':image,'max_lifetime_seconds':lifetime_seconds,
            'startup_seconds':startup_seconds,'input_dispatched':False,'execution_started':False,
            'created_at':dt.datetime.now(dt.timezone.utc).isoformat(),'accounting_hourly_assumption_usd':5.0}
    rid=None;sb=None;error=None;result=None;started=time.monotonic()
    try:
        allowance=safety.launch_allowance(5*lifetime_seconds/3600)
        record['allowance_before']=allowance
        if require_verified_price and allowance.get('price_verified') is not True:
            raise PreDispatchUnavailable('scoring price acceptance changed')
        reservation=guard('reserve','--job',job,'--provider','coreweave','--name',job,
            '--hourly-price',5,'--max-hourly-price',5,'--cost-cap',5*lifetime_seconds/3600,
            '--runtime-hours',lifetime_seconds/3600)
        rid=reservation['reservation_id'];record['reservation_id']=rid;save(receipt_path,record)
        sb=Sandbox(command='sleep',args=['infinity'],container_image=image,auth=auth,
            max_lifetime_seconds=lifetime_seconds,request_timeout_seconds=30,
            resources={'cpu':'4','memory':'16Gi','gpu':{'count':1}},
            network={'deny_egress':True,'deny_ingress':True},
            environment_variables={'OPENAI_API_KEY':'','HF_TOKEN':'','HF_HUB_OFFLINE':'1'},tags=[job])
        sb.start().result()
        if not sb.sandbox_id:raise CleanupUncertain('allocation has no exact sandbox ID')
        record['sandbox_id']=sb.sandbox_id;save(receipt_path,record)
        guard('attach','--job',job,'--provider','coreweave','--reservation-id',rid,
              '--pod-id',sb.sandbox_id,'--name',job,'--hourly-price',5)
        remaining=startup_seconds-(time.monotonic()-started)
        if remaining<=0:raise TimeoutError('sandbox startup deadline')
        sb.wait(timeout=remaining)
        if str(sb.status)!='running':raise PreDispatchUnavailable('sandbox did not reach running')
        record['startup_latency_seconds']=time.monotonic()-started
        record['ready_at']=dt.datetime.now(dt.timezone.utc).isoformat();save(receipt_path,record)
        prepare(sb)
        # Persist before any benchmark input or measurement callback can run.
        record.update(input_dispatched=True,execution_started=True);save(receipt_path,record)
        result=measure(sb)
        record['measurement_completed']=True
    except Exception as exc:
        error=exc;record['error_type']=type(exc).__name__
    finally:
        if sb is not None and sb.sandbox_id:
            try:
                sb.stop(missing_ok=True,wait_for_ready=False).result()
                if any(p['id']==sb.sandbox_id for p in safety.sdk_inventory()):
                    raise CleanupUncertain('sandbox termination unconfirmed')
                guard('release','--job',job,'--reservation-id',rid,'--reason','owned CoreWeave exact ID absent')
                record['cleanup_confirmed']=True
            except Exception as exc:
                error=CleanupUncertain(type(exc).__name__);record['cleanup_confirmed']=False
        elif rid and error is not None and definite_create_rejection(error):
            try:
                guard('release','--job',job,'--reservation-id',rid,'--reason','authenticated create refusal before allocation')
                record['cleanup_confirmed']=True
                record['allocation_rejected']=True
            except Exception:
                error=CleanupUncertain('rejected allocation reservation release unconfirmed')
                record['cleanup_confirmed']=False
        elif rid:
            # An allocation transport failure can hide a created ID. Preserve the
            # full TTL liability and do not claim absence or authorize fallback.
            record['cleanup_confirmed']=False;error=CleanupUncertain('sandbox allocation identity unknown')
        record['ended_at']=dt.datetime.now(dt.timezone.utc).isoformat()
        record['wall_seconds']=time.monotonic()-started;save(receipt_path,record)
    if error:
        if isinstance(error,CleanupUncertain):raise error
        if record['input_dispatched']:raise MeasurementInterrupted(record.get('error_type','measurement failed')) from None
        raise PreDispatchUnavailable(record.get('error_type','startup failed')) from None
    return result
