"""Tests for the /submit intake bridge and bh-submission CLI on a throwaway PostgreSQL cluster.

Nothing here touches the real database, the real ADD-REQUESTS.md, the real watch.db or a real mailbox: every path is
redirected to a temp directory and the mail tool is either a stub or the real tool's --dry-run gate check.
"""
from __future__ import annotations

import base64
import json
import os
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
PG_BIN = next((p for p in sorted(Path("/usr/lib/postgresql").glob("*/bin"), reverse=True) if (p / "initdb").exists()), None)
pytestmark = pytest.mark.skipif(PG_BIN is None, reason="PostgreSQL server binaries unavailable")

DDL = """
CREATE TABLE bh_priority_evaluation_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), paid_at timestamptz);
CREATE TABLE bh_model_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id uuid UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  model_name text, github_url text, huggingface_url text, api_url text, description text, contact_email text, contact_x text,
  benchmarks text[] NOT NULL DEFAULT '{}', followup_benchmark text, followup_key text, followup_name text, followup_rank int,
  api_key_ciphertext text, api_key_present boolean NOT NULL DEFAULT false, api_key_deleted_at timestamptz,
  fast_lane boolean NOT NULL DEFAULT false, priority_request_id uuid REFERENCES bh_priority_evaluation_requests(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('awaiting_payment','queued','in_evaluation','evaluated','rejected','spam','withdrawn')),
  queued_at timestamptz, ip_hash text, stripe_mode text, intake_synced_at timestamptz,
  confirmation_status text NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending','sent','failed','skipped')),
  confirmation_attempts int NOT NULL DEFAULT 0, admin_note text);
"""

STUB_MAIL = '''
import os, sys
def cmd_send(args):
    if os.environ.get("STUB_MAIL_REFUSE") == "1":
        print("BLOCKED BY OUTBOUND GATE", file=sys.stderr); sys.exit(3)
    with open(os.environ["STUB_MAIL_LOG"], "a") as fh:
        fh.write(args.to + "\\t" + args.subject + "\\t" + ("dry" if args.dry_run else "real") + "\\n")
    print("DRY RUN" if args.dry_run else "sent from stub to " + args.to)
'''


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def cluster():
    scratch = Path(tempfile.mkdtemp(prefix="bhsub-pg-"))
    sockdir = Path(tempfile.mkdtemp(prefix="bhs-"))
    data = scratch / "data"
    subprocess.run([str(PG_BIN / "initdb"), "-D", str(data), "-A", "trust", "-U", "e2e"], check=True, capture_output=True)
    port = free_port()
    subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(data), "-l", str(scratch / "pg.log"), "-w", "-o",
                    f"-k {sockdir} -p {port} -c listen_addresses=''", "start"], check=True, capture_output=True)
    conninfo = f"host={sockdir} port={port} user=e2e dbname=postgres"
    subprocess.run(["/usr/bin/psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", conninfo, "-c", DDL], check=True, capture_output=True)
    yield conninfo
    subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(data), "-m", "immediate", "stop"], capture_output=True)
    shutil.rmtree(scratch, ignore_errors=True)
    shutil.rmtree(sockdir, ignore_errors=True)


def sql(conninfo: str, statement: str):
    r = subprocess.run(["/usr/bin/psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", conninfo, "-c", statement], text=True, capture_output=True)
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()


@pytest.fixture()
def env(cluster, tmp_path):
    sql(cluster, "TRUNCATE bh_model_submissions, bh_priority_evaluation_requests CASCADE")
    (tmp_path / "mail").mkdir()
    (tmp_path / "mail/mail_tool.py").write_text(STUB_MAIL)
    watch = tmp_path / "watch.db"
    c = sqlite3.connect(watch); c.execute("CREATE TABLE flags(key TEXT PRIMARY KEY, value TEXT)"); c.commit(); c.close()
    notify = tmp_path / "notify"
    notify.write_text('#!/bin/sh\necho "$@" >> "$NOTIFY_LOG"\n'); notify.chmod(0o755)
    jobs = tmp_path / "jobs"; jobs.mkdir()
    e = {
        **os.environ,
        "BH_ADD_REQUESTS": str(tmp_path / "ADD-REQUESTS.md"), "BH_WATCH_DB": str(watch),
        "BH_BRIDGE_LOG": str(tmp_path / "bridge.log"), "BH_BRIDGE_LOCK": str(tmp_path / "bridge.lock"),
        "BH_MAIL_TOOL": str(tmp_path / "mail/mail_tool.py"), "BH_NOTIFY": str(notify), "NOTIFY_LOG": str(tmp_path / "notify.log"),
        "STUB_MAIL_LOG": str(tmp_path / "mail.log"), "GMAIL_APP_PASSWORD": "stub-not-a-secret",
        "BH_SUBMISSION_PRIVATE_KEY": str(tmp_path / "keys/private.pem"), "BH_JOBS_ROOT": str(jobs),
        "HOME": str(tmp_path),
    }
    e.pop("STUB_MAIL_REFUSE", None)
    return {"db": cluster, "tmp": tmp_path, "env": e, "jobs": jobs}


def bridge(env, *flags):
    r = subprocess.run([sys.executable, str(HERE / "intake_bridge.py"), "--db", env["db"], *flags], text=True, capture_output=True, env=env["env"])
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def cli(env, *args):
    return subprocess.run([sys.executable, str(HERE / "bh-submission"), "--db", env["db"], *args], text=True, capture_output=True, env=env["env"])



def site_ref(db, sid):
    """The reference the site shows the submitter: first 8 chars of submission_id, upper case."""
    return sql(db, f"SELECT submission_id::text FROM bh_model_submissions WHERE id='{sid}'").strip()[:8].upper()


def insert(db, **kw):
    cols = {"model_name": "Test Model", "contact_email": "owner@example.invalid", "benchmarks": ["jevbench"], "status": "queued",
            "queued_at": "now()", **kw}
    names, values = [], []
    for k, v in cols.items():
        names.append(k)
        if v == "now()" or (isinstance(v, str) and v.startswith("now()")):
            values.append(v)
        elif isinstance(v, list):
            values.append("ARRAY[" + ",".join("'" + x.replace("'", "''") + "'" for x in v) + "]::text[]")
        elif isinstance(v, bool):
            values.append("true" if v else "false")
        elif v is None or isinstance(v, int):
            values.append("NULL" if v is None else str(v))
        else:
            values.append("'" + str(v).replace("'", "''") + "'")
    return sql(db, f"INSERT INTO bh_model_submissions ({','.join(names)}) VALUES ({','.join(values)}) RETURNING id")


# --------------------------------------------------------------------------- bridge
def test_intake_appends_once_bumps_flag_and_digests(env):
    a = insert(env["db"], model_name="Alpha | Pipe\nNewline", github_url="https://github.com/x/alpha", description="d" * 500,
               followup_name="Old Alpha", followup_rank=14, followup_benchmark="jevbench", contact_x="alpha_x")
    b = insert(env["db"], model_name="Beta", fast_lane=True, api_key_present=True, api_key_ciphertext="v1.a.b.c.d", queued_at="now() + interval '1 second'")
    out = bridge(env)
    assert out["intake_synced"] == 2
    text = (env["tmp"] / "ADD-REQUESTS.md").read_text()
    assert text.count("## From benchmarkheaven.com/submit") == 1
    assert "| Request | Source/date | Action | Link |" in text
    assert f"bh-submit:{a}" in text and f"bh-submit:{b}" in text
    assert "follow-up of Old Alpha (#14 on JevBench)" in text
    assert "FAST LANE — paid, owned by the priority worker" in text
    assert f"bh-submission key-export {site_ref(env['db'], b)}" in text
    assert "v1.a.b.c.d" not in text and "d" * 301 not in text
    assert "Alpha / Pipe Newline" in text and "@alpha_x" in text
    assert all(len(line.split(" | ")) == 4 for line in text.splitlines() if line.startswith("| **"))
    flag = sqlite3.connect(env["env"]["BH_WATCH_DB"]).execute("SELECT value FROM flags WHERE key='add_requests_pending'").fetchone()
    assert flag == ("2",)
    assert sql(env["db"], "SELECT count(*) FROM bh_model_submissions WHERE intake_synced_at IS NOT NULL") == "2"
    digest = (env["tmp"] / "notify.log").read_text()
    assert digest.startswith("digest bh-submissions 2 new model submission(s) via /submit: Alpha / Pipe Newline, Beta; queue length 2")
    # Idempotent: a second run appends nothing and sends no further digest.
    assert bridge(env).get("intake_synced", 0) == 0
    assert (env["tmp"] / "ADD-REQUESTS.md").read_text() == text
    assert len((env["tmp"] / "notify.log").read_text().splitlines()) == 1
    log = (env["tmp"] / "bridge.log").read_text()
    assert "owner@example" not in log and "v1.a.b" not in log


def test_marker_collision_does_not_double_append_after_crash(env):
    a = insert(env["db"])
    (env["tmp"] / "ADD-REQUESTS.md").write_text(f"# x\n\n## Other\n\nbh-submit:{a}\n")
    out = bridge(env)
    assert out["intake_synced"] == 1
    assert (env["tmp"] / "ADD-REQUESTS.md").read_text().count(f"bh-submit:{a}") == 1
    assert sqlite3.connect(env["env"]["BH_WATCH_DB"]).execute("SELECT count(*) FROM flags").fetchone() == (0,)


def test_rows_land_inside_own_section_when_other_sections_follow(env):
    insert(env["db"], model_name="First")
    bridge(env)
    path = env["tmp"] / "ADD-REQUESTS.md"
    path.write_text(path.read_text() + "\n## From Harold's Gmail intake\n\n| Request | Source/date | Action | Link |\n|---|---|---|---|\n| other | x | y | z |\n")
    insert(env["db"], model_name="Second", queued_at="now() + interval '1 second'")
    bridge(env)
    text = path.read_text()
    assert text.index("**Second**") < text.index("## From Harold's Gmail intake")
    assert text.endswith("| other | x | y | z |\n") or text.endswith("| other | x | y | z |")


def test_dry_run_changes_nothing_and_checks_mail_gate(env):
    insert(env["db"])
    insert(env["db"], model_name="Old", contact_email="old@example.invalid", created_at="now() - interval '40 days'", api_key_ciphertext="v1.a.b.c.d", api_key_present=True,
           queued_at="now() - interval '40 days'")
    out = bridge(env, "--dry-run")
    assert out["dry_run"] is True and out["confirm_dry_ok"] == 2 and out["keys_would_purge"] == 1
    assert not (env["tmp"] / "ADD-REQUESTS.md").exists()
    assert sql(env["db"], "SELECT count(*) FROM bh_model_submissions WHERE intake_synced_at IS NOT NULL OR confirmation_status<>'pending' OR api_key_deleted_at IS NOT NULL") == "0"
    assert not (env["tmp"] / "notify.log").exists()
    assert {line.split("\t")[2] for line in (env["tmp"] / "mail.log").read_text().splitlines()} == {"dry"}


def test_real_mail_gate_dry_run_does_not_send(env):
    """The real shared mail tool in --dry-run mode: validates the gate, sends nothing, logs nothing."""
    real = Path.home() / ".claude/skills/email-access/mail_tool.py"
    if not real.exists():
        pytest.skip("shared mail tool not installed")
    insert(env["db"], contact_email="owner@example.invalid")
    e = {**env["env"], "BH_MAIL_TOOL": str(real), "HOME": str(Path.home())}
    e["BH_BRIDGE_LOG"] = str(env["tmp"] / "bridge.log")
    r = subprocess.run([sys.executable, str(HERE / "intake_bridge.py"), "--db", env["db"], "--dry-run"], text=True, capture_output=True, env=e)
    assert r.returncode == 0, r.stderr
    out = json.loads(r.stdout)
    # Either the gate lets the dry run through, or it refuses (weekend/cooldown); both leave the DB untouched.
    assert out.get("confirm_dry_ok", 0) + out.get("confirm_deferred", 0) == 1
    assert sql(env["db"], "SELECT confirmation_status FROM bh_model_submissions") == "pending"


def test_confirmation_sent_once_per_recipient_and_template(env):
    a = insert(env["db"], model_name="Mine", followup_rank=14, followup_name="Old", followup_benchmark="jevbench")
    b = insert(env["db"], model_name="Mine 2", queued_at="now() + interval '1 second'")  # same recipient
    c = insert(env["db"], model_name="Other", contact_email="other@example.invalid", queued_at="now() + interval '2 seconds'")
    out = bridge(env)
    assert out["confirm_sent"] == 2 and out["confirm_skipped"] == 1
    states = dict(line.split("|") for line in sql(env["db"], "SELECT id||'|'||confirmation_status FROM bh_model_submissions").splitlines())
    assert states == {a: "sent", b: "skipped", c: "sent"}
    sent = [l.split("\t") for l in (env["tmp"] / "mail.log").read_text().splitlines()]
    assert [s[0] for s in sent] == ["owner@example.invalid", "other@example.invalid"] and all(s[2] == "real" for s in sent)
    assert sent[0][1] == "We received your model submission: Mine"
    # Body checks through the module directly.
    import intake_bridge as ib
    subject, body = ib.render_confirmation({"id": a, "submission_id": sql(env["db"], f"SELECT submission_id FROM bh_model_submissions WHERE id='{a}'"), "model_name": "Mine", "benchmarks": ["jevbench", "audiojevbench"], "followup_rank": 14}, 3)
    assert f"Reference: {site_ref(env['db'], a)}" in body and "Benchmarks: JevBench, AudioJevBench" in body and "Position in the regular queue: 3" in body
    assert "The top 10 are re-evaluated with every release; other models on a slower schedule." in body
    assert "We apologise" in body and "ranked #14" in body
    assert "https://benchmarkheaven.com/submit" in body and "If you did not submit this, ignore this email." in body
    assert body.rstrip().endswith("— Florian, Benchmark Heaven") and "{{" not in body
    _, body2 = ib.render_confirmation({"id": a, "submission_id": sql(env["db"], f"SELECT submission_id FROM bh_model_submissions WHERE id='{a}'"), "model_name": "Mine", "benchmarks": ["jevbench"], "followup_rank": 4}, 1)
    assert "apologise" not in body2


def test_fast_lane_skipped_and_gate_refusal_defers_then_fails(env):
    f = insert(env["db"], model_name="Paid", fast_lane=True)
    r = insert(env["db"], model_name="Regular", queued_at="now() + interval '1 second'")
    env["env"]["STUB_MAIL_REFUSE"] = "1"
    out = bridge(env)
    assert out["confirm_deferred"] == 1
    assert sql(env["db"], f"SELECT confirmation_status||confirmation_attempts FROM bh_model_submissions WHERE id='{f}'") == "skipped0"
    assert sql(env["db"], f"SELECT confirmation_status||confirmation_attempts FROM bh_model_submissions WHERE id='{r}'") == "pending1"
    sql(env["db"], f"UPDATE bh_model_submissions SET confirmation_attempts=95 WHERE id='{r}'")
    assert bridge(env)["confirm_failed"] == 1
    assert sql(env["db"], f"SELECT confirmation_status FROM bh_model_submissions WHERE id='{r}'") == "failed"


def test_at_most_ten_mails_per_run(env):
    for i in range(12):
        insert(env["db"], model_name=f"M{i}", contact_email=f"user{i}@domain{i}.example.invalid", queued_at=f"now() + interval '{i} seconds'")
    assert bridge(env)["confirm_sent"] == 10
    assert sql(env["db"], "SELECT count(*) FROM bh_model_submissions WHERE confirmation_status='pending'") == "2"


def test_key_purge_by_status_and_age(env):
    ids = {s: insert(env["db"], status=s, api_key_ciphertext="v1.a.b.c.d", api_key_present=True) for s in ("evaluated", "rejected", "spam", "withdrawn", "queued", "in_evaluation")}
    old = insert(env["db"], status="queued", api_key_ciphertext="v1.a.b.c.d", api_key_present=True, created_at="now() - interval '31 days'")
    young = insert(env["db"], status="queued", api_key_ciphertext="v1.a.b.c.d", api_key_present=True, created_at="now() - interval '29 days'")
    assert bridge(env)["keys_purged"] == 5
    purged = set(sql(env["db"], "SELECT id FROM bh_model_submissions WHERE api_key_ciphertext IS NULL AND api_key_deleted_at IS NOT NULL").splitlines())
    assert purged == {ids["evaluated"], ids["rejected"], ids["spam"], ids["withdrawn"], old}
    assert sql(env["db"], f"SELECT api_key_ciphertext IS NOT NULL FROM bh_model_submissions WHERE id IN ('{ids['queued']}','{young}') GROUP BY 1") == "t"


def test_abandoned_checkout(env):
    paid = sql(env["db"], "INSERT INTO bh_priority_evaluation_requests (paid_at) VALUES (now()) RETURNING id")
    unpaid = sql(env["db"], "INSERT INTO bh_priority_evaluation_requests (paid_at) VALUES (NULL) RETURNING id")
    a = insert(env["db"], status="awaiting_payment", created_at="now() - interval '49 hours'", priority_request_id=unpaid, fast_lane=True, queued_at=None)
    b = insert(env["db"], status="awaiting_payment", created_at="now() - interval '49 hours'", priority_request_id=paid, fast_lane=True, queued_at=None)
    c = insert(env["db"], status="awaiting_payment", created_at="now() - interval '47 hours'", priority_request_id=unpaid, fast_lane=True, queued_at=None)
    assert bridge(env)["abandoned"] == 1
    got = dict(line.split("|") for line in sql(env["db"], "SELECT id||'|'||status FROM bh_model_submissions").splitlines())
    assert got == {a: "withdrawn", b: "awaiting_payment", c: "awaiting_payment"}


def test_second_instance_exits_while_locked(env):
    import fcntl
    with open(env["env"]["BH_BRIDGE_LOCK"], "w") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        assert "skipped" in bridge(env)


# --------------------------------------------------------------------------- CLI + crypto
NODE_ENCRYPT = r"""
const { constants, createCipheriv, createPublicKey, publicEncrypt, randomBytes } = require('node:crypto');
const b = (x) => Buffer.from(x).toString('base64url');
const pub = createPublicKey(require('fs').readFileSync(0, 'utf8'));
const aes = randomBytes(32), iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', aes, iv);
const ct = Buffer.concat([c.update(process.argv[1], 'utf8'), c.final()]);
const wrapped = publicEncrypt({ key: pub, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, aes);
process.stdout.write(['v1', b(wrapped), b(iv), b(c.getAuthTag()), b(ct)].join('.'));
"""


def test_keygen_roundtrip_with_node_and_export_rules(env):
    secret = "sk-test-" + uuid.uuid4().hex + "-ünï"
    r = cli(env, "keygen")
    assert r.returncode == 0 and r.stdout.startswith("-----BEGIN PUBLIC KEY-----") and "PRIVATE" not in r.stdout + r.stderr
    private = Path(env["env"]["BH_SUBMISSION_PRIVATE_KEY"])
    assert oct(private.stat().st_mode & 0o777) == "0o600" and oct(private.parent.stat().st_mode & 0o777) == "0o700"
    before = private.read_bytes()
    again = cli(env, "keygen")
    assert again.returncode == 1 and private.read_bytes() == before and "BEGIN" not in again.stdout + again.stderr
    enc = subprocess.run(["node", "-e", NODE_ENCRYPT, secret], input=r.stdout, text=True, capture_output=True)
    assert enc.returncode == 0, enc.stderr
    sid = insert(env["db"], api_key_ciphertext=enc.stdout, api_key_present=True)
    dest = env["jobs"] / "x" / "key.txt"
    ok = cli(env, "key-export", sid[:8].upper(), str(dest))
    assert ok.returncode == 0 and ok.stdout.strip() == "written" and secret not in ok.stdout + ok.stderr
    assert dest.read_text() == secret and oct(dest.stat().st_mode & 0o777) == "0o600"
    assert cli(env, "key-export", sid, str(dest)).returncode == 1                       # exists
    assert cli(env, "key-export", sid, str(env["tmp"] / "outside.txt")).returncode == 1  # not under jobs root
    assert cli(env, "key-export", sid, str(env["jobs"] / ".." / "escape.txt")).returncode == 1
    assert not (env["tmp"] / "escape.txt").exists()
    shown = cli(env, "show", sid[:8])
    assert shown.returncode == 0 and enc.stdout not in shown.stdout and "key_stored: True" in shown.stdout.replace("  ", " ") or "True" in shown.stdout
    assert cli(env, "purge-key", sid[:8]).returncode == 0
    assert sql(env["db"], f"SELECT api_key_ciphertext IS NULL AND api_key_deleted_at IS NOT NULL FROM bh_model_submissions WHERE id='{sid}'") == "t"
    gone = cli(env, "key-export", sid, str(env["jobs"] / "again.txt"))
    assert gone.returncode == 1 and not (env["jobs"] / "again.txt").exists()


def test_cli_list_show_status_queue_and_refs(env):
    a = insert(env["db"], model_name="Reg A")
    b = insert(env["db"], model_name="Reg B", queued_at="now() + interval '1 second'")
    f = insert(env["db"], model_name="Fast F", fast_lane=True)
    q = cli(env, "queue").stdout
    assert q.index("Reg A") < q.index("Reg B") and "Regular queue (order received): 2" in q and "Fast lane" in q and "Fast F" in q
    listing = cli(env, "list", "--status", "queued", "--limit", "2").stdout
    assert len([l for l in listing.splitlines() if l.strip()]) == 2
    r = cli(env, "set-status", a[:8], "rejected", "--note", "not reachable")
    assert r.returncode == 0
    assert sql(env["db"], f"SELECT status||admin_note FROM bh_model_submissions WHERE id='{a}'") == "rejectednot reachable"
    assert cli(env, "set-status", a[:8], "bogus").returncode != 0
    assert cli(env, "show", "zzzzzzzz").returncode == 1
    assert cli(env, "show", b).returncode == 0                                           # full uuid
    # Ambiguous 8-hex prefix.
    sql(env["db"], f"UPDATE bh_model_submissions SET id=('deadbeef' || substr(id::text, 9))::uuid WHERE id='{b}'")
    sql(env["db"], f"UPDATE bh_model_submissions SET id=('deadbeef' || substr(id::text, 9))::uuid WHERE id='{f}'")
    amb = cli(env, "show", "DEADBEEF")
    assert amb.returncode == 1 and "ambiguous" in amb.stderr
