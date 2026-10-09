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
import math
from urllib.parse import urlparse
import shlex
import subprocess
import tarfile
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import measurement_dispatch
import execution_source
import native_admission
from contextlib import nullcontext
import pod_capacity
import sys

ROOT = Path(__file__).resolve().parent
STATE_ROOT = Path(os.environ.get("FASTLANE_STATE_ROOT") or Path.home() / ".local/state/fastlane-autopickup")
PODS_DIR = STATE_ROOT / "pods"
HOME = Path.home()
LIUM = HOME / ".local/bin/lium"
GUARD = HOME / "bin/gpu-pod-guard"

MAX_HOURLY_USD = 5.00  # Florian 6 Oct 2026: paid fast-lane GPU pods up to USD 5/h
PER_ORDER_CAP_USD = 20.0  # ... and at most USD 20 per order
TTL_CAP_HOURS = 3.0
EXPECTED_ROWS = 1624
GPU_PREFERENCE = (("H100", 80), ("A100", 80), ("L40S", 48), ("RTX6000", 48), ("RTXPRO6000", 96))  # lium marketplace names

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
               "services", "endpoint", "model", "pythonpath", "loader", "model_dir", "load_kwargs", "hourly_usd"}
    if set(recipe) - allowed or recipe.get("kind") not in ("http_typesafe", "python_inprocess", "aplomb_native"):
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    if not isinstance(recipe.get("image"), str) or not IMAGE_RE.fullmatch(recipe["image"]):
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    vram = recipe.get("min_vram_gb")
    if not isinstance(vram, int) or isinstance(vram, bool) or not 1 <= vram <= 96:
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    if 'hourly_usd' in recipe and (isinstance(recipe['hourly_usd'], bool)
            or not isinstance(recipe['hourly_usd'], (int, float))
            or not 0 < recipe['hourly_usd'] <= MAX_HOURLY_USD):
        raise measurement_dispatch.OperationalHold('pod_recipe_invalid')
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
                or any(not isinstance(k, str) or not re.fullmatch(r"[A-Za-z0-9_./-]{1,200}", k)
                       or ".." in k.split("/") or k.startswith("/")
                       or not SHA64_RE.fullmatch(str(v)) for k, v in hashes.items()):
            raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
        dirs.add(entry["dir"])
    code = recipe.get("code")
    if not isinstance(code, dict) or set(code) not in ({"commit", "tree"}, {"source", "commit", "tree"}) \
            or not SHA40_RE.fullmatch(str(code["commit"])) or not SHA40_RE.fullmatch(str(code["tree"])):
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    execution_source.validate_code_binding(code, job_dir)
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
    elif recipe['kind'] == 'python_inprocess':
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
    else:
        # A fixed first-party loader follows the documented native CLI. No generated
        # loader, kwargs, alternate code path or inference switches enter this route.
        if recipe.get('code', {}).get('source') != 'model' or recipe.get('model_dir') not in dirs \
                or any(name in recipe for name in ('pythonpath', 'loader', 'load_kwargs', 'services', 'endpoint')) \
                or not isinstance(recipe.get('model'), str) or not recipe['model']:
            raise measurement_dispatch.OperationalHold('pod_recipe_invalid')
    # Receipt bindings: the pinned commits must be exactly what the host fetched.
    for which, expect in (("model", {e["revision"] for e in weights}),):
        try:
            receipt = json.loads((job_dir / "source" / f"FETCH-RECEIPT-{which}.json").read_text())
        except (OSError, json.JSONDecodeError):
            raise measurement_dispatch.OperationalHold("pod_recipe_unbound") from None
        if receipt.get("commit") not in expect:
            raise measurement_dispatch.OperationalHold("pod_recipe_mismatched_fetch")
        if recipe['kind'] == 'aplomb_native':
            repository = urlparse(str(receipt.get('url', ''))).path.strip('/').removesuffix('.git')
            if len(weights) != 1 or weights[0]['repo'] != repository or weights[0]['revision'] != receipt.get('commit'):
                raise measurement_dispatch.OperationalHold('pod_recipe_mismatched_fetch')
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
        # Plain `env K=V argv` so the container env (CUDA, LD_LIBRARY_PATH, image PATH) is
        # inherited and the recipe's variables are added on top — env -i broke that.
        lines.append(f"env {env_assigns}{' ' if env_assigns else ''}{argv} "
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

    def preflight(self, gpu, recipe, benchmarks, capacity_remaining=pod_capacity.MAX_REFUSALS, allow_two_gpu=False):
        return None

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
                           "--name", name, "--hourly-price", str(MAX_HOURLY_USD),
                           "--max-hourly-price", str(MAX_HOURLY_USD), "--cost-cap", str(cost_cap),
                           "--runtime-hours", str(hours)], timeout=60)
        if result.returncode:
            raise PodCapacityError(f"guard reserve failed: {result.stderr.strip()[-200:]}")
        match = re.search(r"gpu-[0-9a-f]{24}", result.stdout)
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
        result = _run_cli(argv, timeout=60)
        if result.returncode:
            raise PodRunError('guard release failed')

    def preflight(self, gpu, recipe, benchmarks, capacity_remaining=pod_capacity.MAX_REFUSALS, allow_two_gpu=False):
        self._placement = None
        counts = [1]
        if allow_two_gpu and recipe['kind'] == 'http_typesafe' and recipe['min_vram_gb'] == 96 and gpu == 'RTXPRO6000' and tuple(benchmarks) == ('jevbench',):
            counts.append(2)
        refusals = []
        counts = counts[:capacity_remaining]
        try:
            for count in counts:
                quote = pod_capacity.quote(gpu, count, _run_cli, LIUM, MAX_HOURLY_USD)
                if quote.get('refused'):
                    refusals.append(quote)
                    continue
                if (recipe['kind'] == 'aplomb_native' or 'imagejevbench' in benchmarks) and quote['hourly_usd'] != recipe.get('hourly_usd'):
                    raise measurement_dispatch.OperationalHold('gpu_pod_quote_changed')
                self._placement = quote
                return {'quote': quote, 'refusals': refusals, 'quote_count': len(refusals) + 1}
        except pod_capacity.CapacityEvidenceError as exc:
            raise measurement_dispatch.OperationalHold('gpu_pod_quote_changed') from exc
        return {'quote': None, 'refusals': refusals, 'quote_count': len(refusals)}

    def create(self, gpu, ttl_hours, budget):
        before = self.ps_ids()
        placement = getattr(self, '_placement', None)
        if placement:
            if (placement['gpu'] != gpu or (datetime.now(timezone.utc) - datetime.fromisoformat(placement['quoted_at'])).total_seconds() > 120):
                raise measurement_dispatch.OperationalHold('gpu_pod_quote_changed')
            argv = [sys.executable, str(ROOT / 'lium_bounded_up.py'), gpu, str(placement['gpu_count']),
                    str(ttl_hours), str(budget), str(MAX_HOURLY_USD)]
        else:
            argv = [sys.executable, str(ROOT / 'lium_bounded_up.py'), gpu, '1',
                    str(ttl_hours), str(budget), str(MAX_HOURLY_USD)]
        started = datetime.now(timezone.utc).isoformat()
        result = _run_cli(argv, timeout=900)
        if result.returncode:
            after = self.ps_ids()
            if after != before:
                raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain')
            # A listing alone cannot authenticate a refusal. Only the CLI's
            # pre-rent selection failure plus its exact provider audit qualifies.
            try:
                envelopes = []
                decoder = json.JSONDecoder()
                for match in re.finditer(r'\{', result.stderr):
                    try:
                        value, _ = decoder.raw_decode(result.stderr[match.start():])
                        if isinstance(value, dict) and value.get('ok') is False:
                            envelopes.append(value)
                    except ValueError:
                        pass
                if len(envelopes) != 1 or envelopes[0].get('error', {}).get('code') != 'node_selection_failed':
                    raise pod_capacity.CapacityEvidenceError('ambiguous provider create failure')
                request = envelopes[0].get('data', {}).get('request_id')
                event = pod_capacity.audit_refusal(_run_cli, LIUM, request, started)
            except (pod_capacity.CapacityEvidenceError, ValueError, TypeError) as exc:
                raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain') from exc
            error = PodCapacityError('authenticated provider refused before allocation')
            error.proof = {'phase': 'create_refused', 'event': event, 'started_at': started}
            error.before_ids, error.after_ids = before, after
            raise error
        # `up -y --json` prints the pod as JSON (dict or one-item list); progress lines may
        # surround it. The keys match `lium ps --format json` (id, huid, price_per_hour).
        pod = None
        # Some builds print the pod JSON to stderr behind the progress output; parse both.
        text = result.stdout + "\n" + result.stderr
        start = min((i for i in (text.find("{"), text.find("[")) if i >= 0), default=-1)
        end = max(text.rfind("}"), text.rfind("]")) + 1
        for candidate in (result.stdout, result.stderr, text, text[start:end] if 0 <= start < end else ""):
            try:
                value = json.loads(candidate)
            except (json.JSONDecodeError, TypeError):
                continue
            if isinstance(value, dict) and isinstance(value.get('pod'), dict):
                value = value['pod']
            if isinstance(value, list) and len(value) == 1 and isinstance(value[0], dict):
                value = value[0]
            if isinstance(value, dict) and (value.get("id") or value.get("huid")):
                pod = value
                break
        if pod is None:
            # This build reports the ready pod as wrapped text:
            # "Pod <huid> (name: <node>, id:\n<uuid>) ready" — the uuid may be on the next line.
            match = re.search(r"Pod ([A-Za-z0-9_-]+) \(name:[^)]*?id:\s*([0-9a-f]{8}(?:-[0-9a-f]{4,})+)\)", text)
            if match:
                pod = {"huid": match.group(1), "id": match.group(2)}
        if pod is None or not (pod.get("id") or pod.get("pod_id") or pod.get("huid")):
            # `up` printed nothing parseable. Exactly one new pod in ps means it is the one
            # this call created — adopt it by exact id (state-saved/attached/torn down as
            # usual). Zero means nothing came up. Two or more: never remove anything, since
            # another job's concurrently created pod would be among them; surface the ids.
            # A global listing delta cannot prove which concurrent job owns a pod.
            # Successful create with no authenticated ID is always uncertainty.
            uncertain = measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain')
            uncertain.candidate_pod_ids = sorted(self.ps_ids() - before)
            raise uncertain
        pod_id = pod.get("id") or pod.get("pod_id")
        try:
            if str(uuid.UUID(str(pod_id))) != pod_id or pod_id in before:
                raise ValueError('pod id not a new exact UUID')
        except (ValueError, TypeError, AttributeError):
            raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain') from None
        hourly = pod.get("price_per_hour") or pod.get("hourly_price") or pod.get("price")
        count = pod.get('gpu_count')
        invalid_metadata = False
        if hourly is None or count is None:
            look = _run_cli([str(LIUM), "ps", pod_id, "--format", "json"], timeout=60)
            try:
                if look.returncode:
                    raise ValueError('exact pod metadata lookup failed')
                value = json.loads(look.stdout)
                if isinstance(value, dict) and isinstance(value.get('pod'), dict):
                    value = value['pod']
                row = value[0] if isinstance(value, list) and len(value) == 1 else value
                if not isinstance(row, dict) or row.get('id') != pod_id:
                    raise ValueError('exact pod metadata identity differs')
                hourly = row.get("price_per_hour") or row.get("hourly_price") or row.get("price")
                count = row.get('gpu_count')
            except (ValueError, TypeError):
                invalid_metadata = True
        if type(count) is not int or count < 1:
            invalid_metadata = True
        try:
            rate = float(hourly) if not isinstance(hourly, bool) else None
        except (TypeError, ValueError):
            rate = None
        return {"pod_id": pod_id, "huid": str(pod.get("huid", "")), "gpu": gpu,
                "gpu_count": count, "hourly_usd": rate, 'metadata_invalid': invalid_metadata}

    def exec(self, pod_id, command, timeout=600):
        # `lium exec <pod> "cmd"` takes ONE command string; join the argv safely.
        result = _run_cli([str(LIUM), "exec", pod_id, shlex.join(command)], timeout=timeout + 60)
        # lium exec prepends a "Executing on <node>" line to stdout; it is not pod output.
        result.stdout = "".join(line for line in result.stdout.splitlines(keepends=True)
                                if not line.startswith("Executing on "))
        return result

    def scp_to(self, pod_id, local, remote):
        result = _run_cli([str(LIUM), "scp", pod_id, local, remote], timeout=900)
        if result.returncode:
            raise PodRunError(f"scp upload failed: {result.stderr.strip()[-200:]}")

    def scp_from(self, pod_id, remote, local):
        result = _run_cli([str(LIUM), "scp", pod_id, remote, local, "-d"], timeout=900)
        if result.returncode:
            raise PodRunError(f"scp download failed: {result.stderr.strip()[-200:]}")

    def rm(self, pod_id):
        # --yes is required non-interactively; without it rm asks on stdin and removes nothing.
        result = _run_cli([str(LIUM), "rm", pod_id, "--yes"], timeout=300)
        if result.returncode:
            raise PodRunError('provider removal failed')

    def ps_ids(self):
        result = _run_cli([str(LIUM), "ps", "--format", "json"], timeout=60)
        if result.returncode:
            raise PodRunError('provider listing failed')
        try:
            pods = json.loads(result.stdout)
            if not isinstance(pods, list) or any(not isinstance(p, dict) or not (p.get('id') or p.get('pod_id')) for p in pods):
                raise ValueError('invalid provider listing')
            return {str(p.get("id") or p.get("pod_id")) for p in pods}
        except (json.JSONDecodeError, ValueError):
            raise PodRunError('provider listing invalid') from None


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


def build_staging(recipe, pins, code_tar: bytes, benchmarks=('jevbench',)) -> dict[str, bytes]:
    """Everything the pod sees, assembled on the host from pinned inputs only."""
    profile = pins["profile"]
    staging: dict[str, bytes] = {"work/input/recipe.json": json.dumps(recipe, indent=2).encode(),
                                 "work/input/services.sh": render_services_sh(recipe).encode()}
    for relative in ("run_v15.py", "jevbench/adapters/base.py", "jevbench/adapters/typesafe.py"):
        staging[f"work/harness/{relative}"] = _checked_text(profile["code"][relative])
    for relative in ("jevbench/__init__.py", "jevbench/adapters/__init__.py"):
        staging[f"work/harness/{relative}"] = b""
    for relative in ("pod_drivers/pod_driver.py", "pod_drivers/pod_entry.sh", "pod_drivers/scored_marker.py"):
        dest = relative.split("/", 1)[1]
        staging[f"work/driver/{dest}"] = _checked_text(profile["code"][relative])
    if 'jevbench' in benchmarks:
        items = measurement_dispatch.checked(profile["inputs"]["jevbench"]["items"])
        staging["work/inputs/items.jsonl"] = items.read_bytes()
        if profile.get("method") == "jevbench-v16":
            if profile["inputs"]["jevbench"]["count"] != 1500:
                raise measurement_dispatch.OperationalHold("v16_input_count_invalid")
            staging["work/input/text-config.json"] = json.dumps({"method": "jevbench-v16", "count": 1500}).encode()
    staging["work/code.tar"] = code_tar
    if recipe['kind'] == 'aplomb_native' or 'imagejevbench' in benchmarks:
        if set(benchmarks) - {'jevbench', 'imagejevbench'} or len(set(benchmarks)) != len(benchmarks):
            raise measurement_dispatch.OperationalHold('unsupported_order_runtime')
        for name in ('pod_order_driver.py', 'native_image.py', 'aplomb_loader.py'):
            staging['work/driver/' + name] = _checked_text(profile['code']['pod_drivers/' + name])
        config = {'benchmarks': list(benchmarks),
                  'counts': {name: profile['inputs'][name]['count'] for name in benchmarks}}
        staging['work/input/run-config.json'] = json.dumps(config).encode()
        if 'imagejevbench' in benchmarks:
            mounts, _, _ = measurement_dispatch.input_mounts(profile, 'imagejevbench')
            for root, destination in mounts:
                for path in sorted(root.rglob('*')):
                    if path.is_file():
                        staging['work' + destination + '/' + path.relative_to(root).as_posix()] = path.read_bytes()
    return staging


def export_source(job_dir: Path, commit: str, tree: str, source: str = 'code') -> bytes:
    return execution_source.export_bound_source({'source': source, 'commit': commit, 'tree': tree}, job_dir)


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
        problems.append(f"rm: {type(exc).__name__}")
    try:
        if pod_id in provider.ps_ids():
            problems.append("pod still listed in ps")
    except Exception as exc:  # noqa: BLE001
        problems.append(f"ps check: {type(exc).__name__}")
    if not problems:
        try:
            provider.release(job, pod_id, reservation)
        except Exception as exc:  # noqa: BLE001
            problems.append(f"guard release: {type(exc).__name__}")
    if problems and alert:
        alert("🚨 DRINGEND\n\n- A fast-lane GPU pod teardown failed: " + "; ".join(problems)
              + f". Pod {pod_id}. Check `lium ps` and remove it by exact id if it is still there.\n  Time: 5 minutes")
    if problems:
        raise measurement_dispatch.OperationalHold('gpu_pod_teardown_uncertain')


def _lifecycle(provider, job, recipe, staging_path, output, state, gpu_choice, ttl, budget,
               alert, save_state, benchmarks=('jevbench',), quote_budget=None, expected_rows=EXPECTED_ROWS, pre_upload_gate=None):
    """One pod attempt; raises PodRunError on any step failure (teardown still runs)."""
    pod_id = None
    reservation = None
    quote_budget = {'remaining': 2} if quote_budget is None else quote_budget
    try:
        attempts = state.get('creation_attempts', 0)
        try:
            allocations = pod_capacity.allocation_count(state, PODS_DIR)
            if allocations >= pod_capacity.MAX_ALLOCATIONS:
                raise PodRunError('original per-order fresh-pod retry budget exhausted')
            recipe_binding = hashlib.sha256(json.dumps(
                {'recipe': recipe, 'benchmarks': list(benchmarks)}, sort_keys=True).encode()).hexdigest()
            allow_two = state.get('two_gpu_placement_recipe_sha256') == recipe_binding
            if quote_budget['remaining'] <= 0:
                error = PodCapacityError('original per-run read-only quote budget exhausted')
                error.read_only_preflight = True
                raise error
            selection = provider.preflight(gpu_choice[0], recipe, benchmarks,
                quote_budget['remaining'], allow_two)
            if selection is not None:
                used = selection.get('quote_count', len(selection['refusals']) + (1 if selection['quote'] else 0))
                if type(used) is not int or not 0 < used <= quote_budget['remaining']:
                    raise pod_capacity.CapacityEvidenceError('read-only quote budget differs')
                quote_budget['remaining'] -= used
                for proof in selection['refusals']:
                    pod_capacity.store_refusal(state, PODS_DIR, proof)
                    save_state()
                if selection['quote'] is None:
                    error = PodCapacityError('authenticated preflight proved no capacity')
                    error.read_only_preflight = True
                    raise error
                state['placement_quote'] = selection['quote']
                save_state()
        except pod_capacity.CapacityEvidenceError as exc:
            raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain') from exc
        reservation = provider.reserve(job, "pod-measure", MAX_HOURLY_USD, budget, ttl)
        state['creation_attempts'] = attempts + 1
        state['attempt_started_at'] = datetime.now(timezone.utc).isoformat()
        state.pop('torn_down_at', None)
        state['cleanup_uncertain'] = True
        state['attempt_ttl_hours'] = ttl
        state['attempt_reserved_upper_bound_usd'] = ttl * MAX_HOURLY_USD
        state['spent_upper_bound_usd'] = state.get('spent_upper_bound_usd', 0.0) + ttl * MAX_HOURLY_USD
        state['reservation_id'] = reservation
        state['input_dispatched'] = False
        state['execution_started'] = False
        state['measurement_completed'] = False
        save_state()
        try:
            pod = provider.create(gpu_choice[0], ttl, budget)
        except PodCapacityError as exc:
            proof = getattr(exc, 'proof', None)
            if isinstance(provider, LiumProvider) and proof is None:
                raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain') from exc
            # Release must be confirmed before creating an immutable credit.
            provider.release(job, None, reservation)
            reservation = None
            if proof:
                try:
                    pod_capacity.store_refusal(state, PODS_DIR, proof, attempt=attempts + 1,
                        before=exc.before_ids, after=exc.after_ids, released=True)
                except pod_capacity.CapacityEvidenceError as evidence_error:
                    raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain') from evidence_error
            state['cleanup_uncertain'] = False
            state['spent_upper_bound_usd'] -= state['attempt_reserved_upper_bound_usd']
            state['attempt_reserved_upper_bound_usd'] = 0.0
            state['torn_down_at'] = datetime.now(timezone.utc).isoformat()
            save_state()
            raise
        pod_id = pod["pod_id"]
        hourly = pod.get("hourly_usd")
        state.update(pod_id=pod_id, gpu=pod.get("gpu", gpu_choice[0]),
                     hourly_usd=hourly, reservation_id=reservation,
                     created_at=datetime.now(timezone.utc).isoformat())
        save_state()  # persist immediately: a crashed process must find this pod by exact id
        if pod.get('metadata_invalid'):
            raise measurement_dispatch.OperationalHold('gpu_pod_quote_changed')
        try:
            hourly = float(hourly)
        except (TypeError, ValueError):
            hourly = 0.0
        if not 0 < hourly <= MAX_HOURLY_USD:
            raise PodCapacityError(f"pod {pod_id} hourly price {pod.get('hourly_usd')} "
                                   f"exceeds the {MAX_HOURLY_USD} cap")
        if (recipe['kind'] == 'aplomb_native' or 'imagejevbench' in benchmarks) and hourly != recipe.get('hourly_usd'):
            raise measurement_dispatch.OperationalHold('gpu_pod_quote_changed')
        placement = state.get('placement_quote') if selection is not None else None
        if placement and (hourly != placement['hourly_usd'] or pod.get('gpu_count') != placement['gpu_count']):
            raise measurement_dispatch.OperationalHold('gpu_pod_quote_changed')
        provider.attach(reservation, job, pod_id, hourly)
        image = recipe["image"]
        _exec(provider, pod_id, ["docker", "pull", image], timeout=1800)
        inspect = _exec(provider, pod_id, ["docker", "image", "inspect", image,
                                           "--format", "{{json .RepoDigests}}"])
        if image.split("@", 1)[1] not in inspect.stdout:
            raise PodRunError("pulled image digest does not match the pin")
        for entry in recipe["weights"]:
            target = f"/models/{entry['dir']}"
            _exec(provider, pod_id, ["docker", "run", "--rm", "-v", "/models:/models",
                                     "-e", "HOME=/tmp", "--tmpfs", "/tmp",
                                     "-e", "HF_HUB_DISABLE_TELEMETRY=1",
                                     "-e", "HF_TOKEN=", "--entrypoint", "python3", image,
                                     "-c", WEIGHTS_SNIPPET, entry["repo"], entry["revision"], target],
                  timeout=5400)
            for relative, digest in entry["sha256"].items():
                check = _exec(provider, pod_id, ["sha256sum", f"{target}/{relative}"])
                if digest not in check.stdout.split():
                    raise PodRunError(f"weight file {entry['dir']}/{relative} sha256 mismatch: "
                                      f"{check.stdout.strip()[-200:]}")
        _exec(provider, pod_id, ["mkdir", "-p", "/work", "/work/out", "/work/code"])
        # Optional trusted context holds the canonical custody lock across upload.
        with pre_upload_gate() if pre_upload_gate is not None else nullcontext():
            state['input_dispatched'] = True
            save_state()  # dispatch is durable before the first sealed transfer
            provider.scp_to(pod_id, str(staging_path), "/work/stage.tar")
        _exec(provider, pod_id, ["tar", "-xf", "/work/stage.tar", "-C", "/"])
        _exec(provider, pod_id, ["tar", "-xf", "/work/code.tar", "-C", "/work/code"])
        state['execution_started'] = True
        save_state()  # crash after launch is never eligible for automatic scored retry
        _exec(provider, pod_id, ["docker", "run", "-d", "--name", "jev-pod-run", "--gpus", "all",
                                 "--network", "none", "--shm-size", "16g",
                                 "--tmpfs", "/tmp:exec,size=16g",
                                 "-e", "HOME=/tmp", "-e", "HF_TOKEN=", "-e", "OPENAI_API_KEY=",
                                 "--entrypoint", "bash",
                                 "-v", "/models:/models:ro", "-v", "/work/code:/code:ro",
                                 "-v", "/work/harness:/harness:ro", "-v", "/work/driver:/driver:ro",
                                 *(['-v', '/work/inputs:/inputs/text:ro'] if 'jevbench' in benchmarks else []),
                                 "-v", "/work/input:/input:ro",
                                 *(['-v', '/work/inputs/public:/inputs/public:ro',
                                    '-v', '/work/inputs/sealed:/inputs/sealed:ro'] if 'imagejevbench' in benchmarks else []),
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
        combined = recipe['kind'] == 'aplomb_native' or 'imagejevbench' in benchmarks
        if combined:
            for name in benchmarks:
                target = output / name
                target.mkdir(exist_ok=True)
                provider.scp_from(pod_id, f'/work/out/{name}/raw.jsonl', str(target / 'raw.jsonl'))
                provider.scp_from(pod_id, f'/work/out/{name}/receipt.json', str(target / 'pod-receipt.json'))
                expected = json.loads((target / 'pod-receipt.json').read_text()).get('rows')
                count = (target / 'raw.jsonl').read_bytes().count(b'\n')
                if type(expected) is not int or count != expected:
                    raise PodRunError('incomplete native benchmark output')
            state['measurement_completed'] = True
            save_state()
            return state
        provider.scp_from(pod_id, "/work/out/raw.jsonl", str(output / "raw.jsonl"))
        # The pod-side driver receipt is kept as evidence; only our host receipt below owns
        # the canonical receipt.json path.
        provider.scp_from(pod_id, "/work/out/receipt.json", str(output / "pod-receipt.json"))
        rows = (output / "raw.jsonl").read_bytes().count(b"\n")
        if rows != expected_rows:
            raise PodRunError(f"raw.jsonl has {rows} rows, expected {expected_rows}")
        state['measurement_completed'] = True
        save_state()
        return state
    except Exception as exc:
        if getattr(exc, 'candidate_pod_ids', None):
            state['unidentified_candidate_pod_ids'] = list(exc.candidate_pod_ids)
            save_state()
        if pod_id and state.get('input_dispatched') and not state.get('measurement_completed'):
            # Preserve every available partial raw. A failed evidence fetch is ambiguity,
            # never evidence that scoring did not begin.
            for name in benchmarks:
                target = output / name if recipe['kind'] == 'aplomb_native' or 'imagejevbench' in benchmarks else output
                target.mkdir(parents=True, exist_ok=True)
                remote = f'/work/out/{name}/raw.jsonl' if target != output else '/work/out/raw.jsonl'
                try:
                    provider.scp_from(pod_id, remote, str(target / 'raw.jsonl'))
                except Exception:
                    pass
            try:
                provider.scp_from(pod_id, '/work/out/scored-loop-started.json', str(output / 'scored-loop-started.json'))
            except Exception:
                pass
            state['scored_dispatch_uncertain'] = True
            save_state()
            raise measurement_dispatch.OperationalHold('partial_measurement_requires_reconciliation') from None
        raise
    finally:
        if pod_id:
            # Full TTL worst-case charge is durable before create/teardown and is
            # retained until separately authenticated billing reconciliation.
            _teardown(provider, job, pod_id, reservation, alert)
            ended = datetime.now(timezone.utc)
            # Keep full TTL upper bound: provider billing quantum has not been
            # authenticated. Only a separate reviewed billing reconciliation may
            # reduce this conservative charge; elapsed-time estimates never do.
            state.update(torn_down_at=ended.isoformat(), cleanup_uncertain=False,
                         last_pod_id=pod_id, pod_id=None, attempt_reserved_upper_bound_usd=0.0)
            save_state()
        elif reservation:
            if state.get('cleanup_uncertain'):
                save_state()
                raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain')
            provider.release(job, None, reservation)


def _save_pod_state(state_path, state):
    tmp = state_path.with_suffix('.json.tmp')
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(json.dumps(state, indent=2) + '\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, state_path)
    directory = os.open(state_path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def default_alert(text: str) -> None:
    subprocess.run([str(HOME / "bin/notify"), "urgent", text], capture_output=True, timeout=45, check=False)


def run(rid: str, job_dir: Path, recipe: dict, output: Path, expected_pins: dict, max_usd: float,
        *, provider: Provider | None = None, alert=None, benchmarks=('jevbench',), native_source_pins=None, measurement_pins_factory=None, pre_upload_gate=None) -> dict:
    """Measure the reviewed recipe on one disposable GPU pod; idempotent via receipt + pod state."""
    validate_recipe(recipe, job_dir)
    current = measurement_pins_factory() if measurement_pins_factory is not None else measurement_dispatch.pins()
    if current != expected_pins:
        raise measurement_dispatch.OperationalHold("measurement_pins_differ_from_review")
    if not benchmarks or len(set(benchmarks)) != len(benchmarks) or set(benchmarks) - {'jevbench', 'imagejevbench'}:
        raise measurement_dispatch.OperationalHold('unsupported_order_runtime')
    if ('imagejevbench' in benchmarks and recipe['kind'] != 'aplomb_native') or (recipe['kind'] == 'aplomb_native' and 'hourly_usd' not in recipe):
        raise measurement_dispatch.OperationalHold('unsupported_gpu_pod_route')
    try:
        model_receipt = json.loads((job_dir / 'source/FETCH-RECEIPT-model.json').read_text())
    except (OSError, ValueError):
        raise measurement_dispatch.OperationalHold('pod_recipe_unbound') from None
    # The source helper grants no credential to model processes or remote pods.
    # An explicit host acquisition receipt is a separate reviewed dependency.
    if model_receipt.get('credential_repository'):
        raise measurement_dispatch.OperationalHold('gated_weights_require_host_acquisition')
    admission_binding = None
    if recipe['kind'] == 'aplomb_native':
        if not isinstance(native_source_pins, dict) or native_source_pins.get('official_measurement') != current:
            raise measurement_dispatch.OperationalHold('native_admission_pin_mismatch')
        try:
            request_state = json.loads((STATE_ROOT / 'requests' / f'{rid}.json').read_text())
        except (OSError, ValueError):
            raise measurement_dispatch.OperationalHold('native_admission_missing') from None
        admission_binding = native_admission.validate_native_admission(job_dir, request_state, recipe, benchmarks, native_source_pins)
    output = Path(output)
    if output.is_symlink():
        raise measurement_dispatch.OperationalHold("measurement_output_unsafe")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    receipt_file = output / "receipt.json"
    recipe_sha = hashlib.sha256(json.dumps({'recipe': recipe, 'benchmarks': list(benchmarks)}, sort_keys=True).encode()).hexdigest()
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
            raise measurement_dispatch.OperationalHold('partial_measurement_requires_reconciliation') from None
        state = previous
        if state.get('request_id', rid) != rid:
            raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain')
        if state.get('pod_id') or state.get('cleanup_uncertain') or (state.get('attempt_started_at') and not state.get('torn_down_at')):
            # A crash may have occurred inside provider.create before exact ID was saved.
            # Retain the precharged full TTL bound and never start another rental.
            if 'attempt_reserved_upper_bound_usd' not in state:
                # Legacy crash state is not trusted as zero cost. Charge the maximum
                # original TTL while requiring exact-id/billing reconciliation.
                state['attempt_reserved_upper_bound_usd'] = TTL_CAP_HOURS * MAX_HOURLY_USD
                state['spent_upper_bound_usd'] = state.get('spent_upper_bound_usd', 0.0) + state['attempt_reserved_upper_bound_usd']
                _save_pod_state(state_path, state)
            if state.get('pod_id'):
                if state.get('input_dispatched') or state.get('execution_started'):
                    for name in benchmarks:
                        target = output / name if recipe['kind'] == 'aplomb_native' or 'imagejevbench' in benchmarks else output
                        target.mkdir(parents=True, exist_ok=True)
                        remote = f'/work/out/{name}/raw.jsonl' if target != output else '/work/out/raw.jsonl'
                        try:
                            if not (target / 'raw.jsonl').exists():
                                provider.scp_from(state['pod_id'], remote, str(target / 'raw.jsonl'))
                        except Exception:
                            pass
                    try:
                        if not (output / 'scored-loop-started.json').exists():
                            provider.scp_from(state['pod_id'], '/work/out/scored-loop-started.json', str(output / 'scored-loop-started.json'))
                    except Exception:
                        pass
                    state['scored_dispatch_uncertain'] = True
                    _save_pod_state(state_path, state)
                _teardown(provider, job, state['pod_id'], state.get('reservation_id'), alert)
                state.update(last_pod_id=state['pod_id'], pod_id=None,
                             torn_down_at=datetime.now(timezone.utc).isoformat(), cleanup_uncertain=False)
                _save_pod_state(state_path, state)
            raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_requires_reconciliation')
        if (state.get('input_dispatched') or state.get('execution_started')) and not state.get('measurement_completed'):
            raise measurement_dispatch.OperationalHold('partial_measurement_requires_reconciliation')
    if receipt_file.is_file():
        prior = json.loads(receipt_file.read_text())
        if prior.get("pins") != current or prior.get("recipe_sha256") != recipe_sha or prior.get('admission_binding_sha256') != admission_binding:
            raise measurement_dispatch.OperationalHold("existing_measurement_receipt_changed")
        for name, record in prior.get('benchmarks', {'jevbench': prior}).items():
            path = output / name / 'raw.jsonl' if 'benchmarks' in prior else output / 'raw.jsonl'
            if hashlib.sha256(path.read_bytes()).hexdigest() != record.get('raw_sha256'):
                raise measurement_dispatch.OperationalHold('existing_measurement_receipt_changed')
        return prior
    if (output / "raw.jsonl").exists() or any((output / name / 'raw.jsonl').exists() for name in benchmarks):
        # A partial attempt is kept, never resumed (same rule as the API path).
        raise measurement_dispatch.OperationalHold("partial_measurement_requires_reconciliation")
    state['request_id'] = rid
    budget = min(PER_ORDER_CAP_USD, max_usd)
    prior_spend = state.get('spent_upper_bound_usd', 0.0)
    if isinstance(prior_spend, bool) or not isinstance(prior_spend, (int, float)) or not 0 <= prior_spend <= PER_ORDER_CAP_USD:
        raise measurement_dispatch.OperationalHold('partial_measurement_requires_reconciliation')
    budget -= prior_spend
    if budget <= 0:
        raise measurement_dispatch.OperationalHold("gpu_pod_budget_exhausted")
    ttl = min(TTL_CAP_HOURS, budget / MAX_HOURLY_USD)
    candidates = [g for g in GPU_PREFERENCE if g[1] >= recipe["min_vram_gb"]]
    if not candidates:
        raise measurement_dispatch.OperationalHold("pod_recipe_invalid")
    started = datetime.now(timezone.utc)
    code_tar = export_source(job_dir, recipe["code"]["commit"], recipe["code"]["tree"], recipe['code'].get('source', 'code'))
    staging_path = _stage_tarball(build_staging(recipe, current, code_tar, benchmarks))
    save_state = lambda: _save_pod_state(state_path, state)
    try:
        run_error: Exception | None = None
        quote_budget = {'remaining': 2}
        for attempt in range(2):
            gpu_choice = candidates[attempt % len(candidates)]
            run_spend = state.get('spent_upper_bound_usd', 0.0) - prior_spend
            remaining = min(budget - run_spend, PER_ORDER_CAP_USD - state.get('spent_upper_bound_usd', 0.0))
            if remaining <= 0:
                raise measurement_dispatch.OperationalHold('gpu_pod_budget_exhausted')
            ttl = min(TTL_CAP_HOURS, remaining / MAX_HOURLY_USD)
            try:
                state = _lifecycle(provider, job, recipe, staging_path, output, state,
                                   gpu_choice, ttl, remaining, alert, save_state, benchmarks, quote_budget,
                                   current['profile']['inputs']['jevbench']['count'], pre_upload_gate)
                break
            except PodCapacityError:
                continue  # try the next GPU candidate; capacity only if every attempt was capacity
            except PodRunError as exc:
                run_error = exc
                if (output / 'raw.jsonl').exists() or any((output / name / 'raw.jsonl').exists() for name in benchmarks):
                    raise measurement_dispatch.OperationalHold('partial_measurement_requires_reconciliation') from None
        else:
            if run_error is not None:
                raise measurement_dispatch.OperationalHold("gpu_pod_run_failed") from run_error
            raise measurement_dispatch.OperationalHold("gpu_pod_capacity")
    finally:
        staging_path.unlink(missing_ok=True)
    ended = datetime.now(timezone.utc)
    hours = (ended - started).total_seconds() / 3600
    cost = round(min(budget, (state.get("hourly_usd") or MAX_HOURLY_USD) * hours), 4)
    receipt = {"pins": current, "recipe_sha256": recipe_sha, 'admission_binding_sha256': admission_binding, "pod_id": state.get("last_pod_id"),
               "gpu": state.get("gpu"), "hourly_usd": state.get("hourly_usd"),
               "started_at": started.isoformat(), "ended_at": ended.isoformat(),
               "cost_estimate_usd": cost, "network_mode": state.get("network_mode", "none"),
               "charged_or_reserved_usd": state['spent_upper_bound_usd']}
    combined = recipe['kind'] == 'aplomb_native' or 'imagejevbench' in benchmarks
    if combined:
        receipt['benchmarks'] = {}
        for index, name in enumerate(benchmarks):
            raw = output / name / 'raw.jsonl'
            count = current['profile']['inputs'][name]['count']
            if raw.read_bytes().count(b'\n') != count:
                raise measurement_dispatch.OperationalHold('official_measurement_changed_or_incomplete')
            receipt['benchmarks'][name] = {**receipt, 'rows': count,
                'raw_sha256': hashlib.sha256(raw.read_bytes()).hexdigest(),
                'charged_or_reserved_usd': receipt['charged_or_reserved_usd'] if index == 0 else 0.0}
            receipt['benchmarks'][name].pop('benchmarks', None)
    else:
        receipt.update(rows=current['profile']['inputs']['jevbench']['count'], raw_sha256=hashlib.sha256((output / 'raw.jsonl').read_bytes()).hexdigest())
    receipt_file.write_text(json.dumps(receipt, indent=2) + "\n")
    state.update(ended_at=ended.isoformat(), cost_estimate_usd=cost)
    save_state()
    return receipt
