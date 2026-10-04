"""Host-only GPU pod measurement for open-weights fast-lane orders.

A reviewed POD-RECIPE.json (kind http_typesafe | python_inprocess) is executed on a disposable
rented GPU pod: digest-pinned image, publicly downloaded weights verified by sha256, the reviewed
source tree exported by git archive, the pinned harness/drivers/input, and the fixed
pod_entry.sh/pod_driver.py running under `docker --network none`. Nothing else reaches the pod —
no secrets, no gold/scoring files, only the label-free input.

Providers implement the Provider interface; LiumProvider uses the same `lium` CLI commands the
manual runs used (up/exec/scp/rm/ps/spend) plus ~/bin/gpu-pod-guard reserve/attach/release.
RunPodProvider is a documented stub that raises OperationalHold("gpu_pod_capacity") — a second
provider is future work.

One fresh-pod retry on a run failure -> OperationalHold("gpu_pod_run_failed"); no capacity ->
OperationalHold("gpu_pod_capacity"). A partial raw.jsonl is kept and never resumed. The returned
receipt has the same shape measurement_dispatch.run returns so dispatch_measurement and
score_measurement work unchanged.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import shlex
import subprocess
import tarfile
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import measurement_dispatch

ROOT = Path(__file__).resolve().parent
STATE_ROOT = Path(os.environ.get("FASTLANE_STATE_ROOT") or Path.home() / ".local/state/fastlane-autopickup")
PODS_DIR = STATE_ROOT / "pods"
HOME = Path.home()
LIUM = HOME / ".local/bin/lium"
GUARD = HOME / "bin/gpu-pod-guard"

MAX_HOURLY_USD = 2.50
PER_ORDER_CAP_USD = 5.0
TTL_CAP_HOURS = 3.0
EXPECTED_ROWS = 1624
GPU_PREFERENCE = (("H100", 80), ("A100", 80), ("L40S", 48), ("RTX-6000-Ada", 48))

IMAGE_RE = re.compile(r"^[A-Za-z0-9._/-]+:[A-Za-z0-9_.-]+@sha256:[0-9a-f]{64}$")
SHA40_RE = re.compile(r"[0-9a-f]{40}")
SHA64_RE = re.compile(r"[0-9a-f]{64}")
DIR_RE = re.compile(r"[A-Za-z0-9_.-]{1,64}")
ENV_KEY_RE = re.compile(r"[A-Z_][A-Z0-9_]*")
LOOPBACK_RE = re.compile(r"http://127\.0\.0\.1:\d{1,5}(/[A-Za-z0-9_./-]*)?")
REPO_RE = re.compile(r"[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+")
LOADER_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*:[A-Za-z_][A-Za-z0-9_]*")


class PodRunError(Exception):
    """A pod-side lifecycle step failed; eligible for one fresh-pod retry."""


class PodCapacityError(Exception):
    """No provider could offer a suitable pod."""


# ---------------------------------------------------------------------------
# Recipe validation
# ---------------------------------------------------------------------------

def _loopback(value) -> bool:
    return isinstance(value, str) and bool(LOOPBACK_RE.fullmatch(value))


def _has_forbidden_url(value) -> bool:
    """Any '://' that is not a loopback URL is forbidden in recipe values."""
    if not isinstance(value, str) or "://" not in value:
        return False
    return not _loopback(value)


def validate_recipe(recipe, job_dir: Path) -> dict:
    """Strictly validate trusted-runner/POD-RECIPE.json against the host fetch receipts."""
    if not isinstance(recipe, dict) or recipe.get("schema_version") != 1:
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    allowed = {"schema_version", "kind", "image", "min_vram_gb", "weights", "code",
               "services", "endpoint", "model", "pythonpath", "loader", "model_dir", "load_kwargs"}
    if set(recipe) - allowed or recipe.get("kind") not in ("http_typesafe", "python_inprocess"):
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    if not isinstance(recipe.get("image"), str) or not IMAGE_RE.fullmatch(recipe["image"]):
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    vram = recipe.get("min_vram_gb")
    if not isinstance(vram, int) or isinstance(vram, bool) or not 1 <= vram <= 80:
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    weights = recipe.get("weights")
    if not isinstance(weights, list) or not 1 <= len(weights) <= 8:
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    dirs = set()
    for entry in weights:
        if not isinstance(entry, dict) or set(entry) != {"repo", "revision", "dir", "sha256"}:
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        if not REPO_RE.fullmatch(str(entry["repo"])) or not SHA40_RE.fullmatch(str(entry["revision"])):
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        if not DIR_RE.fullmatch(str(entry["dir"])) or ".." in entry["dir"].split("/"):
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        hashes = entry["sha256"]
        if not isinstance(hashes, dict) or not hashes \
                or any(not isinstance(k, str) or not SHA64_RE.fullmatch(str(v)) or ".." in k.split("/")
                       or k.startswith("/") for k, v in hashes.items()):
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        dirs.add(entry["dir"])
    code = recipe.get("code")
    if not isinstance(code, dict) or set(code) != {"commit", "tree"} \
            or not SHA40_RE.fullmatch(str(code["commit"])) or not SHA40_RE.fullmatch(str(code["tree"])):
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    if recipe["kind"] == "http_typesafe":
        services = recipe.get("services")
        if not isinstance(services, list) or not 1 <= len(services) <= 3:
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        for service in services:
            if not isinstance(service, dict) or set(service) - {"argv", "env", "ready_url"} \
                    or not isinstance(service.get("argv"), list) or not service["argv"] \
                    or any(not isinstance(a, str) or not a or _has_forbidden_url(a) for a in service["argv"]):
                raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
            env = service.get("env") or {}
            if not isinstance(env, dict) \
                    or any(not ENV_KEY_RE.fullmatch(str(k)) or not isinstance(v, (str, int, float, bool))
                           or _has_forbidden_url(str(v)) for k, v in env.items()):
                raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
            if not _loopback(service.get("ready_url")):
                raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        if not _loopback(recipe.get("endpoint")):
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        if not isinstance(recipe.get("model"), str) or not recipe["model"]:
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    else:
        pythonpath = recipe.get("pythonpath")
        if not isinstance(pythonpath, list) or not pythonpath \
                or any(not isinstance(p, str) or not p.startswith("/code") or ".." in Path(p).parts
                       for p in pythonpath):
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        if not LOADER_RE.fullmatch(str(recipe.get("loader"))) or recipe.get("model_dir") not in dirs:
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        kwargs = recipe.get("load_kwargs") or {}
        if not isinstance(kwargs, dict) \
                or any(not isinstance(k, str) or not isinstance(v, (str, int, float, bool)) or v is None
                       for k, v in kwargs.items()):
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        if not isinstance(recipe.get("model"), str) or not recipe["model"]:
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    # Receipt bindings: the pinned commits must be exactly what the host fetched.
    for which, expect in (("model", {e["revision"] for e in weights}), ("code", {code["commit"]})):
        try:
            receipt = json.loads((job_dir / "source" / f"FETCH-RECEIPT-{which}.json").read_text())
        except (OSError, json.JSONDecodeError):
            raise measurement_dispatch.OperationalHold("pod_recipe_unbound") from None
        if receipt.get("commit") not in expect:
            raise measurement_dispatch.OperationalHold("pod_recipe_mismatched_fetch")
    return recipe


# ---------------------------------------------------------------------------
# services.sh rendering (host-side, strict quoting)
# ---------------------------------------------------------------------------

def render_services_sh(recipe) -> str:
    """One `env -i ... argv &` per service; each readiness probe polls ready_url up to 20 min
    while verifying the service pid is alive. Every token is shlex.quote'd."""
    lines = ["#!/bin/bash", "set -u"]
    for index, service in enumerate(recipe.get("services") or []):
        env_assigns = " ".join(f"{k}={shlex.quote(str(v))}" for k, v in (service.get("env") or {}).items())
        argv = " ".join(shlex.quote(a) for a in service["argv"])
        lines.append(f"env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp "
                     f"{env_assigns}{' ' if env_assigns else ''}{argv} "
                     f"> /output/service-{index}.log 2>&1 &")
        lines.append(f"PID_{index}=$!")
        lines.append(f"READY_{index}=0")
        lines.append("for _ in $(seq 1 1200); do")
        lines.append(f"  kill -0 $PID_{index} 2>/dev/null || exit 1")
        probe = ("import urllib.request,sys;urllib.request.urlopen("
                 + json.dumps(service["ready_url"]) + ",timeout=5);sys.exit(0)")
        lines.append(f"  if python3 -c {shlex.quote(probe)} >/dev/null 2>&1; "
                     f"then READY_{index}=1; break; fi")
        lines.append("  sleep 1")
        lines.append("done")
        lines.append(f"[ $READY_{index} -eq 1 ] || exit 1")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Providers
# ---------------------------------------------------------------------------

class Provider:
    name = "provider"

    def reserve(self, job: str, name: str, hourly: float, cost_cap: float, hours: float) -> str:
        raise NotImplementedError

    def attach(self, reservation: str, job: str, pod_id: str, hourly: float) -> None:
        raise NotImplementedError

    def release(self, job: str, pod_id: str | None, reservation: str | None) -> None:
        raise NotImplementedError

    def create(self, gpu: str, ttl_hours: float, budget: float) -> dict:
        raise NotImplementedError

    def exec(self, pod_id: str, command: list[str], timeout: int = 600) -> subprocess.CompletedProcess:
        raise NotImplementedError

    def scp_to(self, pod_id: str, local: str, remote: str) -> None:
        raise NotImplementedError

    def scp_from(self, pod_id: str, remote: str, local: str) -> None:
        raise NotImplementedError

    def rm(self, pod_id: str) -> None:
        raise NotImplementedError

    def ps_ids(self) -> set[str]:
        raise NotImplementedError


def _run_cli(argv: list[str], timeout: int = 600, input_text: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(argv, input=input_text, text=True, capture_output=True, timeout=timeout, check=False)


class LiumProvider(Provider):
    """Lium via the `lium` CLI (same commands the manual runs used) + gpu-pod-guard accounting."""

    name = "lium"

    def reserve(self, job, name, hourly, cost_cap, hours):
        result = _run_cli([str(GUARD), "reserve", "--job", job, "--provider", "lium",
                           "--name", name, "--hourly-price", str(hourly),
                           "--max-hourly-price", str(MAX_HOURLY_USD), "--cost-cap", str(cost_cap),
                           "--runtime-hours", str(hours)], timeout=60)
        if result.returncode:
            raise PodCapacityError(f"guard reserve failed: {result.stderr.strip()[-200:]}")
        match = re.search(r"gpu-[0-9a-f]{24}|reservation[^ ]*", result.stdout)
        if not match:
            raise PodCapacityError("guard reserve returned no reservation id")
        return match.group(0)

    def attach(self, reservation, job, pod_id, hourly):
        result = _run_cli([str(GUARD), "attach", "--reservation-id", reservation, "--job", job,
                           "--provider", "lium", "--pod-id", pod_id, "--hourly-price", str(hourly)],
                          timeout=60)
        if result.returncode:
            raise PodRunError(f"guard attach failed: {result.stderr.strip()[-200:]}")

    def release(self, job, pod_id, reservation):
        argv = [str(GUARD), "release", "--job", job, "--reason", "measurement finished"]
        if reservation:
            argv += ["--reservation-id", reservation]
        if pod_id:
            argv += ["--pod-id", pod_id]
        _run_cli(argv, timeout=60)

    def create(self, gpu, ttl_hours, budget):
        result = _run_cli([str(LIUM), "up", "--gpu", gpu, "-c", "1", "--ttl", f"{ttl_hours}h",
                           "--budget", f"{budget:.2f}", "-y", "--json"], timeout=900)
        if result.returncode:
            raise PodCapacityError(f"lium up {gpu}: {result.stderr.strip()[-200:]}")
        try:
            pod = json.loads(result.stdout.strip().splitlines()[-1])
        except (json.JSONDecodeError, IndexError):
            raise PodCapacityError("lium up returned no pod JSON") from None
        pod_id = pod.get("id") or pod.get("pod_id")
        if not pod_id:
            raise PodCapacityError("lium up returned no pod id")
        return {"pod_id": str(pod_id), "huid": pod.get("huid", ""), "gpu": gpu,
                "hourly_usd": float(pod.get("price_per_hour") or pod.get("hourly_price") or 0)}

    def exec(self, pod_id, command, timeout=600):
        return _run_cli([str(LIUM), "exec", pod_id, "--"] + command, timeout=timeout + 60)

    def scp_to(self, pod_id, local, remote):
        result = _run_cli([str(LIUM), "scp", local, f"{pod_id}:{remote}"], timeout=900)
        if result.returncode:
            raise PodRunError(f"scp upload failed: {result.stderr.strip()[-200:]}")

    def scp_from(self, pod_id, remote, local):
        result = _run_cli([str(LIUM), "scp", f"{pod_id}:{remote}", local], timeout=900)
        if result.returncode:
            raise PodRunError(f"scp download failed: {result.stderr.strip()[-200:]}")

    def rm(self, pod_id):
        _run_cli([str(LIUM), "rm", pod_id], timeout=300)

    def ps_ids(self):
        result = _run_cli([str(LIUM), "ps", "--json"], timeout=60)
        if result.returncode:
            return set()
        try:
            pods = json.loads(result.stdout)
            return {str(p.get("id") or p.get("pod_id")) for p in pods if isinstance(p, dict)}
        except json.JSONDecodeError:
            return set()


class RunPodProvider(Provider):
    """Documented stub: a second provider is future work; for now it reports no capacity."""

    name = "runpod"

    def create(self, gpu, ttl_hours, budget):
        raise measurement_dispatch.OperationalHold("gpu_pod_capacity")


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def _stage_tarball(staging: dict[str, bytes]) -> Path:
    tmp = tempfile.NamedTemporaryFile(prefix="fastlane-pod-", suffix=".tar", delete=False)
    with tarfile.open(fileobj=tmp, mode="w") as tar:
        for name, content in staging.items():
            info = tarfile.TarInfo(name)
            info.size = len(content)
            info.mode = 0o755 if name.endswith((".sh", ".py")) else 0o644
            tar.addfile(info, io.BytesIO(content))
    tmp.close()
    return Path(tmp.name)


def _checked_text(pin) -> bytes:
    return measurement_dispatch.checked(pin).read_bytes()


def build_staging(recipe, pins, code_tar: bytes) -> dict[str, bytes]:
    """Everything the pod sees, assembled on the host from pinned inputs only."""
    profile = pins["profile"]
    staging: dict[str, bytes] = {"work/input/recipe.json": json.dumps(recipe, indent=2).encode(),
                                 "work/input/services.sh": render_services_sh(recipe).encode()}
    for relative in ("run_v15.py", "jevbench/adapters/base.py", "jevbench/adapters/typesafe.py"):
        staging[f"work/harness/{relative}"] = _checked_text(profile["code"][relative])
    for relative in ("jevbench/__init__.py", "jevbench/adapters/__init__.py"):
        staging[f"work/harness/{relative}"] = b""
    for relative in ("pod_drivers/pod_driver.py", "pod_drivers/pod_entry.sh"):
        dest = relative.split("/", 1)[1]
        staging[f"work/driver/{dest}"] = _checked_text(profile["code"][relative])
    items = measurement_dispatch.checked(profile["inputs"]["jevbench"]["items"])
    staging["work/inputs/items.jsonl"] = items.read_bytes()
    staging["work/code.tar"] = code_tar
    return staging


def export_source(job_dir: Path, commit: str, tree: str) -> bytes:
    source = job_dir / "source" / "code" / ".git"
    if not source.is_dir():
        raise PodRunError("customer code source is not fetched")
    rev = subprocess.run(["git", "-C", str(source), "rev-parse", f"{commit}^{{tree}}"],
                         text=True, capture_output=True, timeout=60, check=False)
    if rev.returncode or rev.stdout.strip() != tree:
        raise PodRunError("reviewed code tree does not match the fetched source")
    archive = subprocess.run(["git", "-C", str(source), "archive", "--format=tar", commit],
                             capture_output=True, timeout=120, check=False)
    if archive.returncode or not archive.stdout:
        raise PodRunError("git archive of the reviewed code failed")
    return archive.stdout


WEIGHTS_SNIPPET = (
    "import sys; from huggingface_hub import snapshot_download; "
    "snapshot_download(repo_id=sys.argv[1], revision=sys.argv[2], local_dir=sys.argv[3], "
    "local_dir_use_symlinks=False)"
)


def _exec(provider, pod_id, command, timeout=600):
    result = provider.exec(pod_id, command, timeout=timeout)
    if result.returncode:
        raise PodRunError(f"pod exec failed ({command[0]}): {(result.stderr or result.stdout).strip()[-300:]}")
    return result


def _teardown(provider, job, pod_id, reservation, alert):
    problems = []
    try:
        provider.rm(pod_id)
    except Exception as exc:  # noqa: BLE001
        problems.append(f"rm: {exc}")
    try:
        if provider.ps_ids() and pod_id in provider.ps_ids():
            problems.append("pod still listed in ps")
    except Exception as exc:  # noqa: BLE001
        problems.append(f"ps check: {exc}")
    try:
        provider.release(job, pod_id, reservation)
    except Exception as exc:  # noqa: BLE001
        problems.append(f"guard release: {exc}")
    if problems and alert:
        alert("🚨 DRINGEND\n\n- A fast-lane GPU pod teardown failed: " + "; ".join(problems)
              + f". Pod {pod_id}. Check `lium ps` and remove it by exact id if it is still there.\n  Time: 5 minutes")


def _lifecycle(provider, job, recipe, staging_path, output, state, gpu_choice, ttl, budget, alert):
    """One pod attempt; raises PodRunError on any step failure (teardown still runs)."""
    pod_id = None
    reservation = None
    try:
        reservation = provider.reserve(job, "pod-measure", gpu_choice[1], budget, ttl)
        pod = provider.create(gpu_choice[0], ttl, budget)
        pod_id = pod["pod_id"]
        state.update(pod_id=pod_id, gpu=pod.get("gpu", gpu_choice[0]),
                     hourly_usd=pod.get("hourly_usd", 0.0), reservation_id=reservation)
        provider.attach(reservation, job, pod_id, pod.get("hourly_usd", 0.0))
        image = recipe["image"]
        _exec(provider, pod_id, ["docker", "pull", image], timeout=1800)
        inspect = _exec(provider, pod_id, ["docker", "image", "inspect", image,
                                           "--format", "{{json .RepoDigests}}"])
        if image.split("@", 1)[1] not in inspect.stdout:
            raise PodRunError("pulled image digest does not match the pin")
        for entry in recipe["weights"]:
            target = f"/models/{entry['dir']}"
            _exec(provider, pod_id, ["docker", "run", "--rm", "-v", "/models:/models",
                                     "-e", "HF_TOKEN=", "--entrypoint", "python3", image,
                                     "-c", WEIGHTS_SNIPPET, entry["repo"], entry["revision"], target],
                  timeout=5400)
            for relative, digest in entry["sha256"].items():
                check = _exec(provider, pod_id, ["sha256sum", f"{target}/{relative}"])
                if check.stdout.split()[:1] != [digest]:
                    raise PodRunError(f"weight file {entry['dir']}/{relative} sha256 mismatch")
        provider.scp_to(pod_id, str(staging_path), "/work/stage.tar")
        _exec(provider, pod_id, ["mkdir", "-p", "/work", "/work/out"])
        _exec(provider, pod_id, ["tar", "-xf", "/work/stage.tar", "-C", "/"])
        _exec(provider, pod_id, ["mkdir", "-p", "/work/code"])
        _exec(provider, pod_id, ["tar", "-xf", "/work/code.tar", "-C", "/work/code"])
        _exec(provider, pod_id, ["docker", "run", "-d", "--name", "jev-pod-run", "--gpus", "all",
                                 "--network", "none", "--shm-size", "16g",
                                 "--tmpfs", "/tmp:exec,size=16g",
                                 "-e", "HOME=/tmp", "-e", "HF_TOKEN=", "-e", "OPENAI_API_KEY=",
                                 "--entrypoint", "bash",
                                 "-v", "/models:/models:ro", "-v", "/work/code:/code:ro",
                                 "-v", "/work/harness:/harness:ro", "-v", "/work/driver:/driver:ro",
                                 "-v", "/work/inputs:/inputs/text:ro", "-v", "/work/input:/input:ro",
                                 "-v", "/work/out:/output", image, "/driver/pod_entry.sh"])
        mode = _exec(provider, pod_id, ["docker", "inspect", "jev-pod-run",
                                        "--format", "{{.HostConfig.NetworkMode}}"])
        network_mode = mode.stdout.strip()
        if network_mode != "none":
            raise PodRunError(f"run container network mode is {network_mode!r}, not 'none'")
        state["network_mode"] = network_mode
        wait = _exec(provider, pod_id, ["docker", "wait", "jev-pod-run"], timeout=3600)
        rc = wait.stdout.strip().splitlines()[-1] if wait.stdout.strip() else ""
        logs = _exec(provider, pod_id, ["docker", "logs", "jev-pod-run"], timeout=120)
        (output / "pod-driver.log").write_bytes((logs.stdout + logs.stderr).encode(errors="replace"))
        if rc != "0":
            raise PodRunError(f"pod driver exited {rc or 'unknown'}")
        provider.scp_from(pod_id, "/work/out/raw.jsonl", str(output / "raw.jsonl"))
        provider.scp_from(pod_id, "/work/out/receipt.json", str(output / "receipt.json"))
        rows = (output / "raw.jsonl").read_bytes().count(b"\n")
        if rows != EXPECTED_ROWS:
            raise PodRunError(f"raw.jsonl has {rows} rows, expected {EXPECTED_ROWS}")
        return state
    finally:
        if pod_id:
            _teardown(provider, job, pod_id, reservation, alert)


def default_alert(text: str) -> None:
    subprocess.run([str(HOME / "bin/notify"), "urgent", text], capture_output=True, timeout=45, check=False)


def run(rid: str, job_dir: Path, recipe: dict, output: Path, expected_pins: dict, max_usd: float,
        *, provider: Provider | None = None, alert=None) -> dict:
    """Measure the reviewed recipe on one disposable GPU pod; idempotent via receipt + pod state."""
    validate_recipe(recipe, job_dir)
    current = measurement_dispatch.pins()
    if current != expected_pins:
        raise measurement_dispatch.OperationalHold("measurement_pins_differ_from_review")
    output = Path(output)
    if output.is_symlink():
        raise measurement_dispatch.OperationalHold("measurement_output_unsafe")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    receipt_file = output / "receipt.json"
    recipe_sha = hashlib.sha256(json.dumps(recipe, sort_keys=True).encode()).hexdigest()
    if receipt_file.is_file():
        prior = json.loads(receipt_file.read_text())
        if prior.get("pins") != current or prior.get("recipe_sha256") != recipe_sha \
                or hashlib.sha256((output / "raw.jsonl").read_bytes()).hexdigest() != prior.get("raw_sha256"):
            raise measurement_dispatch.OperationalHold("existing_measurement_receipt_changed")
        return prior
    if (output / "raw.jsonl").exists():
        # A partial attempt is kept, never resumed (same rule as the API path).
        raise measurement_dispatch.OperationalHold("partial_measurement_requires_reconciliation")
    provider = provider or LiumProvider()
    alert = alert if alert is not None else default_alert
    state_path = PODS_DIR / f"{rid}.json"
    state_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    job = f"fastlane-eval-{str(uuid.UUID(rid))[:8]}"
    state = {}
    if state_path.exists():
        # A previous attempt may have died mid-lifecycle; remove its recorded pod by exact id.
        try:
            previous = json.loads(state_path.read_text())
        except json.JSONDecodeError:
            previous = {}
        if previous.get("pod_id"):
            _teardown(provider, job, previous["pod_id"], previous.get("reservation_id"), alert)
    budget = min(PER_ORDER_CAP_USD, max_usd)
    if budget <= 0:
        raise measurement_dispatch.OperationalHold("gpu_pod_capacity")
    ttl = min(TTL_CAP_HOURS, budget / MAX_HOURLY_USD)
    candidates = [g for g in GPU_PREFERENCE if g[1] >= recipe["min_vram_gb"]]
    if not candidates:
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    started = datetime.now(timezone.utc)
    code_tar = export_source(job_dir, recipe["code"]["commit"], recipe["code"]["tree"])
    staging_path = _stage_tarball(build_staging(recipe, current, code_tar))
    last_error: Exception | None = None
    try:
        for attempt in range(2):
            gpu_choice = candidates[attempt % len(candidates)]
            try:
                state = _lifecycle(provider, job, recipe, staging_path, output, state,
                                   gpu_choice, ttl, budget, alert)
                last_error = None
                break
            except PodCapacityError as exc:
                raise measurement_dispatch.OperationalHold("gpu_pod_capacity") from exc
            except PodRunError as exc:
                last_error = exc
        if last_error is not None:
            raise measurement_dispatch.OperationalHold("gpu_pod_run_failed") from last_error
    finally:
        staging_path.unlink(missing_ok=True)
    ended = datetime.now(timezone.utc)
    hours = (ended - started).total_seconds() / 3600
    cost = round(min(budget, (state.get("hourly_usd") or MAX_HOURLY_USD) * hours), 4)
    receipt = {"rows": EXPECTED_ROWS,
               "raw_sha256": hashlib.sha256((output / "raw.jsonl").read_bytes()).hexdigest(),
               "pins": current, "recipe_sha256": recipe_sha, "pod_id": state.get("pod_id"),
               "gpu": state.get("gpu"), "hourly_usd": state.get("hourly_usd"),
               "started_at": started.isoformat(), "ended_at": ended.isoformat(),
               "cost_estimate_usd": cost, "network_mode": state.get("network_mode", "none"),
               "charged_or_reserved_usd": cost}
    receipt_file.write_text(json.dumps(receipt, indent=2) + "\n")
    state.update(ended_at=ended.isoformat(), cost_estimate_usd=cost)
    state_path.write_text(json.dumps(state, indent=2) + "\n")
    return receipt
