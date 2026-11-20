"""Explicit trusted-host delivery for the single missed cd7e038c order."""

from array import array
from contextlib import ExitStack, contextmanager
from contextvars import ContextVar
from datetime import timedelta
import fcntl
import hashlib
import json
from pathlib import Path
import os
import re
import socket
import stat
import struct
import time
import uuid

ORDER = "cd7e038c-dcac-4990-9ca5-feac99cd8d8d"
KEY = "cd7e_late_result_v1"
ENVELOPE = str(uuid.uuid5(uuid.NAMESPACE_URL, f"benchmarkheaven-fastlane/{ORDER}/{KEY}"))
MAIL = "bh_priority_eval_transactional_mail"
AUTH = "bh_cd7e_late_result_authorizations"
URL = "https://benchmarkheaven.com/jev-models"
SYSTEM = "starlord-4b-v1.4-preview"
APPROVAL_PATH = "review/CD7E-LATE-DELIVERY-ADMISSION.json"
PROOF_PATHS = {
    "independent_review": "review/independent_review.json",
    "measurement": "review/measurement.json",
    "exposure": "review/exposure.json",
    "teardown": "review/teardown.json",
    "release_result": "release/RESULT.json",
}
CUSTODY_SOCKET = Path("/run/jevbench-custody/cd7e038c.sock")
CHECK_TIMEOUT = 5
SESSION_TIMEOUT = 150
MAX_REPLY = 512
_sender_session = ContextVar("cd7e_late_sender_session", default=None)


@contextmanager
def sender_custody(recipient, subject, body, generation, admission_sha, refresh):
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    token = _sender_session.set((recipient, subject, digest, generation, admission_sha, refresh))
    try:
        yield
    finally:
        _sender_session.reset(token)


def sender_session(recipient, subject, digest):
    session = _sender_session.get()
    if session is None or session[:3] != (recipient, subject, digest):
        raise ValueError("late mail requires its exact live custody session")
    return session


def receipt(ap):
    return ap.sql_json(f"""
        SELECT json_build_object('state',e.state,'sent_at',e.sent_at,
          'recorded_at',r.result_delivered_at,'generation',a.generation,
          'expired',e.expires_at<=now(),
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
        **{key: value for key, value in current.items() if key != "expired"},
        "order": ORDER,
        "message_id": f"<fastlane-{ENVELOPE}@benchmarkheaven.com>",
    }


def check_proof_paths(ap, job: Path, proofs):
    if not isinstance(proofs, dict) or proofs.keys() != PROOF_PATHS.keys():
        raise ap.PickupError("late delivery requires the independently reviewed evidence set")
    root = job.resolve()
    for name, expected in PROOF_PATHS.items():
        pin = proofs[name]
        if (not isinstance(pin, dict) or pin.get("path") != expected
                or ap.within(root, expected) != root / expected):
            raise ap.PickupError("late delivery cites an unapproved evidence path")


def load_admission(ap, job: Path, state):
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
            or not isinstance(generation, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", generation) \
            or expires is None or not now < expires <= now + timedelta(hours=24) \
            or not ap.SHA64_RE.fullmatch(str(approval.get("identity_sha256") or "")) \
            or not re.fullmatch(r"telegram:[0-9]{1,12}:[0-9]{1,15}", str(approval.get("refund_ref") or "")):
        raise ap.PickupError("late delivery approval has an invalid scope, identity or expiry")
    proofs = approval.get("proofs")
    check_proof_paths(ap, job, proofs)
    for pin in proofs.values():
        ap.pinned_file(job, pin)
    uid = approval.get("custody_uid")
    if type(uid) is not int or not 0 < uid < 2**32 - 1 or uid == os.geteuid():
        raise ap.PickupError("late delivery requires a separate custody identity")
    device, inode = approval.get("custody_lock_device"), approval.get("custody_lock_inode")
    if type(device) is not int or device < 0 or type(inode) is not int or inode <= 0:
        raise ap.PickupError("late delivery requires the canonical custody lock identity")
    result = approval.get("result")
    if not isinstance(result, dict) or not re.fullmatch(r"[0-9a-f]{40}", str(result.get("release_commit", ""))):
        raise ap.PickupError("late delivery requires an exact release commit")
    for key in ("attestation_sha256", "custody_verifier_sha256"):
        if not ap.SHA64_RE.fullmatch(str(approval.get(key) or "")):
            raise ap.PickupError("late delivery requires exact custody attestation and verifier pins")
    return approval


@contextmanager
def open_custody_socket(uid):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
        client.settimeout(CHECK_TIMEOUT)
        client.connect(str(CUSTODY_SOCKET))
        peer = client.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, struct.calcsize("iII"))
        _, peer_uid, _ = struct.unpack("iII", peer)
        if uid == os.geteuid() or peer_uid != uid:
            raise ValueError("custody socket peer identity mismatch")
        yield client


def check_custody_socket(client, request, *, lock_identity=None):
    deadline = time.monotonic() + CHECK_TIMEOUT

    def remaining():
        seconds = deadline - time.monotonic()
        if seconds <= 0:
            raise TimeoutError("custody reply deadline elapsed")
        return seconds

    nonce = uuid.uuid4().hex
    message = {**request, "operation": "OPEN" if lock_identity is not None else "CHECK", "nonce": nonce}
    client.settimeout(remaining())
    client.sendall(json.dumps(message, separators=(",", ":")).encode("ascii") + b"\n")
    reply = bytearray()
    fds = array("i")
    try:
        while len(reply) < MAX_REPLY:
            client.settimeout(remaining())
            chunk, controls, flags, _ = client.recvmsg(
                MAX_REPLY - len(reply), socket.CMSG_SPACE(fds.itemsize), socket.MSG_CMSG_CLOEXEC,
            )
            for level, kind, data in controls:
                if (level, kind) == (socket.SOL_SOCKET, socket.SCM_RIGHTS):
                    fds.frombytes(data[:len(data) - len(data) % fds.itemsize])
            remaining()
            if flags & socket.MSG_CTRUNC or len(fds) > 1 or any(
                (level, kind, len(data)) != (socket.SOL_SOCKET, socket.SCM_RIGHTS, fds.itemsize)
                for level, kind, data in controls
            ):
                raise ValueError("invalid custody lock transfer")
            reply.extend(chunk)
            if not chunk or b"\n" in chunk:
                break
        if reply.count(b"\n") != 1 or not reply.endswith(b"\n"):
            raise ValueError("incomplete custody response")
        expected = {"status": "ACTIVE", "attestation_sha256": request["attestation_sha256"], "nonce": nonce}
        fields = json.loads(reply, object_pairs_hook=tuple)
        if not isinstance(fields, tuple) or len(fields) != len(expected) or dict(fields) != expected:
            raise ValueError("custody response did not confirm the exact request")
        # A response buffered before peer exit does not establish a live session.
        client.setblocking(False)
        try:
            client.recv(1, socket.MSG_PEEK)
        except BlockingIOError:
            pass
        else:
            raise ValueError("custody session closed or supplied unsolicited data")
        if lock_identity is None and not fds:
            return None
        if lock_identity is None or len(fds) != 1:
            raise ValueError("custody reply must carry exactly the expected lock descriptor")
        fd = fds[0]
        info = os.fstat(fd)
        if (info.st_dev, info.st_ino) != lock_identity or not stat.S_ISREG(info.st_mode) \
                or info.st_nlink != 1 or fcntl.fcntl(fd, fcntl.F_GETFL) & os.O_ACCMODE != os.O_RDONLY:
            raise ValueError("custody lock descriptor does not match the protected inode")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return fds.pop()
    finally:
        for fd in fds:
            os.close(fd)


@contextmanager
def custody_status_session(ap, approval, admission_sha):
    request = {
        "order_id": ORDER,
        "envelope_id": ENVELOPE,
        "generation": approval["generation"],
        "admission_sha256": admission_sha,
        "attestation_sha256": approval["attestation_sha256"],
        "release_commit": approval["result"]["release_commit"],
        "verifier_sha256": approval["custody_verifier_sha256"],
        "expires_at": approval["expires_at"],
    }
    deadline = time.monotonic() + SESSION_TIMEOUT
    with ExitStack() as stack:
        try:
            client = stack.enter_context(open_custody_socket(approval["custody_uid"]))
            identity = (approval["custody_lock_device"], approval["custody_lock_inode"])
            fd = check_custody_socket(client, request, lock_identity=identity)
            stack.callback(os.close, fd)
        except (OSError, ValueError, TypeError) as exc:
            raise ap.PickupError("the custody verifier is unavailable") from exc

        def check():
            try:
                if time.monotonic() >= deadline:
                    raise TimeoutError("custody session deadline elapsed")
                check_custody_socket(client, request)
                if time.monotonic() >= deadline:
                    raise TimeoutError("custody session deadline elapsed")
            except (OSError, ValueError, TypeError) as exc:
                raise ap.PickupError("the custody verifier refused or did not answer") from exc

        yield check


@contextmanager
def current_custody(ap, job, approval, admission_sha):
    generation = approval["generation"]
    expected = approval["attestation_sha256"]
    pin = {"path": "review/CD7E-CUSTODY-ATTESTATION.json", "sha256": expected}
    path = ap.pinned_file(job, pin)
    attest = ap.load_json_file(path, 100_000)
    methods = attest.get("official_methods")
    measurement = attest.get("official_measurement")
    if attest.get("schema_version") != 1 or attest.get("order_id") != ORDER \
            or attest.get("generation") != generation or attest.get("benchmark") != "jevbench" \
            or not re.fullmatch(r"custody:[0-9a-f]{64}", str(attest.get("raw_ref") or "")) \
            or not attest.get("draw_release") or not isinstance(methods, dict) \
            or not isinstance(measurement, dict):
        raise ap.PickupError("late custody attestation does not match the approved order generation")
    proofs = approval["proofs"]
    for name in ("measurement", "exposure", "release_result"):
        if attest.get(f"{name}_sha256") != proofs[name]["sha256"]:
            raise ap.PickupError("late custody attestation does not bind the approved evidence")
    with custody_status_session(ap, approval, admission_sha) as check:
        def refresh():
            if ap.sha256_file(path) != expected or ap.parse_ts(approval["expires_at"]) <= ap.utcnow():
                raise ap.PickupError("late custody attestation is stale or changed")
            check()
            if ap.parse_ts(approval["expires_at"]) <= ap.utcnow():
                raise ap.PickupError("late custody attestation expired during verification")

        refresh()
        yield attest, refresh


def recompute_matches_attestation(rid, attest, recompute, review_gate):
    official = recompute["official_inputs"]
    raw_hash = attest.get("raw_sha256")
    recompute_sha = hashlib.sha256(json.dumps(recompute, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return (
        rid == ORDER
        and official.get("generation") == attest.get("generation")
        and official.get("draw_release") == attest.get("draw_release")
        and official.get("official_measurement") == attest.get("official_measurement")
        and official.get("official_methods") == attest.get("official_methods")
        and official.get("raw_paths") == {"jevbench": attest.get("raw_ref")}
        and official.get("raw_hashes") == {"jevbench": raw_hash}
        and isinstance(raw_hash, str) and re.fullmatch(r"[0-9a-f]{64}", raw_hash) is not None
        and official.get("review_sha256") == attest.get("source_review_sha256")
        and review_gate.get("review_sha256") == attest.get("source_review_sha256")
        and recompute_sha == attest.get("recompute_sha256")
        and (recompute.get("inputs") or {}).get("result_sha256") == attest.get("release_result_sha256")
    )


def admitted_result(ap, job, row, state, approval, custody):
    if state.get("operational_hold") or row is None:
        raise ap.PickupError("the trusted pickup still holds the order")
    summary = ap.verify_result(
        row, job, state, ap.Effects(), public_live=True, late_custody=custody,
        late_receipt_hashes=approval.get("aggregate_receipt_hashes"),
    )
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
    return subject, body


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
        -- Only this explicit, already verified delivery path can advance the
        -- pending order. The independent sender still requires a ready row.
        UPDATE {ap.TABLE} r SET evaluation_status='ready_for_release',updated_at=now()
        WHERE r.id='{ORDER}' AND r.evaluation_status='pending' AND r.email={recipient}
          AND {expires}::timestamptz>now() AND bh_cd7e_late_order_ready(r,{identity},{refund_ref},true)
          AND NOT EXISTS (SELECT 1 FROM {MAIL} prior WHERE prior.request_id=r.id
                          AND prior.template_key IN ('{KEY}','result_public_v1','result_private_v1'));
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
        if previous.get("state") == "pending" and previous.get("expired"):
            raise ap.PickupError("expired unsent late envelope is held for the fast-lane SLA owner")
        if (ap.STATE_ROOT / "KILL").exists():
            raise ap.PickupError("fast-lane pickup is paused")
        row = ap.load_row(ORDER)
        state = ap.load_state(ORDER)
        job = ap.job_directory(ORDER, ap.JOB_ROOT)
        approval = load_admission(ap, job, state)
        admission_sha = state["cd7e_late_delivery"]["admission_sha256"]
        with current_custody(ap, job, approval, admission_sha) as (custody, refresh_custody):
            subject, body = admitted_result(ap, job, row, state, approval, custody)
            refresh_custody()
            if action == "preview":
                return {"subject": subject, "body": body, "generation": approval["generation"]}
            if action != "send":
                raise ap.PickupError("unknown late delivery action")
            stage(ap, row, approval, subject, body, admission_sha)
            with sender_custody(row["email"], subject, body, approval["generation"], admission_sha, refresh_custody):
                ok, reason = ap.Effects().mail(row["email"], subject, body, outbox_id=ENVELOPE)
            if not ok:
                raise ap.PickupError(f"late result sender returned {reason}; check the exact envelope")
        return reconcile(ap)
