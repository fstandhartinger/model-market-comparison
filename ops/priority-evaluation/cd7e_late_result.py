"""Explicit trusted-host delivery for the single missed cd7e038c order."""

from datetime import timedelta
import hashlib
import json
from pathlib import Path
import re
import uuid

ORDER = "cd7e038c-dcac-4990-9ca5-feac99cd8d8d"
KEY = "cd7e_late_result_v1"
ENVELOPE = str(uuid.uuid5(uuid.NAMESPACE_URL, f"benchmarkheaven-fastlane/{ORDER}/{KEY}"))
MAIL = "bh_priority_eval_transactional_mail"
AUTH = "bh_cd7e_late_result_authorizations"
URL = "https://benchmarkheaven.com/jev-models"
SYSTEM = "starlord-4b-v1.4-preview"
APPROVAL_PATH = "review/CD7E-LATE-DELIVERY-ADMISSION.json"


def receipt(ap):
    return ap.sql_json(f"""
        SELECT json_build_object('state',e.state,'sent_at',e.sent_at,
          'recorded_at',r.result_delivered_at,'generation',a.generation,
          'release_commit',a.release_commit,'url',a.result_url)::text
        FROM {MAIL} e JOIN {AUTH} a ON a.envelope_id=e.id
        JOIN {ap.TABLE} r ON r.id=e.request_id
        WHERE e.id='{ENVELOPE}' AND e.request_id='{ORDER}' AND e.template_key='{KEY}'
          AND e.body_sha256=a.body_sha256 AND e.recipient=r.email
          AND bh_cd7e_late_identity(r)=a.identity_sha256
    """)


def reconcile(ap):
    # A durable sent receipt outlives authorization expiry and does not require a resend.
    ap.sql(f"""
        UPDATE {ap.TABLE} r SET delivery_email_status='sent',
          result_delivered_at=e.sent_at, result_url=a.result_url,
          release_status='done', pickup_status='done', evaluation_status='done', updated_at=now()
        FROM {MAIL} e JOIN {AUTH} a ON e.id=a.envelope_id
        WHERE e.id='{ENVELOPE}' AND e.request_id=r.id AND r.id='{ORDER}'
          AND e.template_key='{KEY}' AND e.state='sent' AND e.sent_at IS NOT NULL
          AND e.body_sha256=a.body_sha256 AND e.recipient=r.email AND e.expires_at=a.expires_at
          AND bh_cd7e_late_order_ready(r,a.identity_sha256,a.refund_ref)
    """)
    current = receipt(ap) or {}
    if current.get("state") != "sent" or not current.get("sent_at") \
            or current.get("recorded_at") != current["sent_at"]:
        raise ap.PickupError("late result has no matching recorded SMTP receipt")
    return {
        **current,
        "order": ORDER,
        "message_id": f"<fastlane-{ENVELOPE}@benchmarkheaven.com>",
    }


def admitted_result(ap, job: Path, row, state):
    anchor = state.get("cd7e_late_delivery")
    if not isinstance(anchor, dict) or anchor.get("verdict") != "ACCEPTED":
        raise ap.PickupError("late delivery requires a separately installed host approval")
    path = ap.pinned_file(job, {"path": APPROVAL_PATH, "sha256": anchor.get("admission_sha256")})
    approval = ap.load_json_file(path, 100_000)
    generation = approval.get("generation")
    now = ap.utcnow()
    expires = ap.parse_ts(approval.get("expires_at"))
    if approval.get("order_id") != ORDER or approval.get("scope") != "exact-cd7e-late-result-delivery" \
            or approval.get("verdict") != "ACCEPTED" or generation != anchor.get("generation") \
            or not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", str(generation or "")) \
            or expires is None or not now < expires <= now + timedelta(hours=24) \
            or not ap.SHA64_RE.fullmatch(str(approval.get("identity_sha256") or "")) \
            or not re.fullmatch(r"telegram:[0-9]{1,12}:[0-9]{1,15}", str(approval.get("refund_ref") or "")):
        raise ap.PickupError("late delivery approval has an invalid scope, identity or expiry")
    proofs = approval.get("proofs")
    if not isinstance(proofs, dict) or set(proofs) != {
        "independent_review", "measurement", "custody", "teardown", "release_result"
    }:
        raise ap.PickupError("late delivery requires the independently reviewed evidence set")
    for pin in proofs.values():
        ap.pinned_file(job, pin)
    if proofs["release_result"]["path"] != "release/RESULT.json":
        raise ap.PickupError("late delivery release proof must pin the pickup result")
    recompute = state.get("independent_recompute") or {}
    if (recompute.get("official_inputs") or {}).get("generation") != generation:
        raise ap.PickupError("late delivery generation differs from the recomputed result")
    if state.get("operational_hold") or row is None:
        raise ap.PickupError("the trusted pickup still holds the order")

    summary = ap.verify_result(row, job, state, ap.Effects(), public_live=True)
    results = summary.get("results") or []
    if summary.get("outcome") != "delivered" or summary.get("visibility") != "public" or len(results) != 1:
        raise ap.PickupError("late delivery requires one verified public result")
    item = results[0]
    expected = approval.get("result")
    keys = ("benchmark", "system_key", "version", "score", "release_commit", "public_url")
    if expected != {key: item.get(key) for key in keys} or item.get("system_key") != SYSTEM \
            or item.get("benchmark") != "jevbench" or item.get("public_url") != URL:
        raise ap.PickupError("the deployed score or release changed after approval")
    subject, body = ap.result_message(row, summary)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    if approval.get("message") != {"subject": subject, "body_sha256": digest}:
        raise ap.PickupError("late delivery approval does not bind the exact customer message")
    guard_error = ap.author_message_guard(subject, body)
    if guard_error:
        raise ap.PickupError(guard_error)
    return approval, subject, body


def stage(ap, row, approval, subject, body, admission_sha):
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    q = ap.sql_text
    identity, refund_ref = q(approval["identity_sha256"]), q(approval["refund_ref"])
    generation, release = q(approval["generation"]), q(approval["result"]["release_commit"])
    expires, recipient = q(approval["expires_at"]), q(row["email"])
    # The pickup lock serializes this with normal mail staging. The row lock also
    # serializes staging with the refund worker and the independent sender's claim.
    ap.sql(f"""
        BEGIN;
        SELECT id FROM {ap.TABLE} WHERE id='{ORDER}' FOR UPDATE;
        INSERT INTO {MAIL} (id,request_id,template_key,recipient,subject,body_sha256,expires_at)
        SELECT '{ENVELOPE}',r.id,'{KEY}',r.email,{q(subject)},'{digest}',{expires}::timestamptz
        FROM {ap.TABLE} r
        WHERE r.id='{ORDER}' AND r.email={recipient} AND {expires}::timestamptz>now()
          AND bh_cd7e_late_order_ready(r,{identity},{refund_ref})
          AND NOT EXISTS (SELECT 1 FROM {MAIL} prior WHERE prior.request_id=r.id
                          AND prior.template_key IN ('result_public_v1','result_private_v1'))
        ON CONFLICT DO NOTHING;
        INSERT INTO {AUTH} (envelope_id,generation,admission_sha256,identity_sha256,
          body_sha256,refund_ref,release_commit,result_url,expires_at)
        SELECT e.id,{generation},{q(admission_sha)},{identity},'{digest}',{refund_ref},
          {release},{q(URL)},e.expires_at
        FROM {MAIL} e JOIN {ap.TABLE} r ON r.id=e.request_id
        WHERE e.id='{ENVELOPE}' AND e.template_key='{KEY}' AND r.id='{ORDER}'
          AND e.state='pending' AND e.recipient={recipient} AND e.subject={q(subject)}
          AND e.body_sha256='{digest}' AND e.expires_at={expires}::timestamptz
          AND bh_cd7e_late_order_ready(r,{identity},{refund_ref})
        ON CONFLICT DO NOTHING;
        COMMIT;
    """)
    exact = ap.sql(f"""
        SELECT e.id FROM {MAIL} e JOIN {AUTH} a ON a.envelope_id=e.id
        JOIN {ap.TABLE} r ON r.id=e.request_id
        WHERE e.id='{ENVELOPE}' AND e.state='pending' AND e.recipient={recipient}
          AND e.subject={q(subject)} AND e.body_sha256='{digest}'
          AND a.admission_sha256={q(admission_sha)} AND a.generation={generation}
          AND a.identity_sha256={identity} AND a.refund_ref={refund_ref}
          AND a.release_commit={release} AND a.result_url={q(URL)}
          AND a.expires_at={expires}::timestamptz AND bh_cd7e_late_mail_ready(e,r)
    """)
    if exact != ENVELOPE:
        raise ap.PickupError("late mail envelope is ineligible or requires reconciliation")


def run(ap, order, action):
    if order != ORDER:
        raise ap.PickupError("late delivery is scoped to cd7e038c")
    with ap.cycle_lock(blocking=True):
        if action == "reconcile":
            return reconcile(ap)
        previous = receipt(ap) or {}
        if previous.get("state") == "sent" and action == "send":
            return reconcile(ap)
        if previous.get("state") in ("uncertain", "sending"):
            raise ap.PickupError("late SMTP outcome requires independent reconciliation")
        if (ap.STATE_ROOT / "KILL").exists():
            raise ap.PickupError("fast-lane pickup is paused")
        row = ap.load_row(ORDER)
        state = ap.load_state(ORDER)
        job = ap.job_directory(ORDER, ap.JOB_ROOT)
        approval, subject, body = admitted_result(ap, job, row, state)
        if action == "preview":
            return {"subject": subject, "body": body, "generation": approval["generation"]}
        if action != "send":
            raise ap.PickupError("unknown late delivery action")
        stage(ap, row, approval, subject, body, state["cd7e_late_delivery"]["admission_sha256"])
        ok, reason = ap.Effects().mail(row["email"], subject, body, outbox_id=ENVELOPE)
        if not ok:
            raise ap.PickupError(f"late result sender returned {reason}; check the exact envelope")
        return reconcile(ap)
