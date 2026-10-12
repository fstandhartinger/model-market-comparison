"""Host-side evidence the read-only, offline preparation agent cannot collect itself.

Fast-lane orders 6057e863, 3a081599, 27387658 and 8c7dbe11 (card 377, 12 Oct 2026) burned all three
adapter preparations because the preparer never saw public tariff evidence and could not tell whether an
API endpoint needs a key. Before the first preparation the host now records, under source/public-docs/:

- OPENROUTER-MODELS.json: a dated snapshot of the public OpenRouter model list (id, name, created, pricing,
  hugging_face_id) for the v1.5-M2 base-model reference rule, plus PUBLIC-DOCS-RECEIPT.json naming it.
- ACCESS-PROBE.json (API orders without a host-held key): the outcome of ONE synthetic, non-benchmark
  System One request sent without any credential.

Stdlib only. No customer code is imported or executed; no JevBench item, key or customer text is sent.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
MAX_MODELS_BYTES = 32 * 1024 * 1024
MAX_PROBE_BYTES = 256 * 1024
TIMEOUT_S = 30
USER_AGENT = "benchmarkheaven-fastlane-host/1"
# Written here, never derived from customer text or benchmark items.
PROBE_BODY = {"state": {"note": "Benchmark Heaven access check. This is not a benchmark item."},
              "questions": {"check": {"type": "noul", "instructions": "Is this message an access check?"}}}
MODEL_ID_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}")
# A long unbroken token outside URLs is treated as a possible secret pasted into free text.
KEY_LIKE_RE = re.compile(r"[A-Za-z0-9_\-]{24,}")
URL_RE = re.compile(r"https?://\S+")

Opener = Callable[..., Any]
# Unit tests set this so no synthetic order ever reaches the network; the host service never sets it.
OFFLINE_ENV = "FASTLANE_HOST_EVIDENCE_OFFLINE"


def _offline() -> bool:
    return os.environ.get(OFFLINE_ENV) == "1"


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _write(path: Path, value: dict[str, Any]) -> None:
    if path.is_symlink():
        raise OSError("refusing to write through a symlink")
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    tmp.replace(path)


def _docs_dir(job_dir: Path) -> Path:
    docs = job_dir / "source" / "public-docs"
    if docs.is_symlink() or (docs.exists() and not docs.is_dir()):
        raise OSError("unsafe public-docs directory")
    docs.mkdir(mode=0o700, parents=True, exist_ok=True)
    return docs


def fetch_openrouter_models(job_dir: Path, *, opener: Opener | None = None) -> dict[str, Any] | None:
    """Write the dated OpenRouter model/price snapshot once. Returns the receipt, or None on any failure.

    A failure never blocks preparation; the preparer then writes an honest blocker as before."""
    docs = _docs_dir(job_dir)
    target = docs / "OPENROUTER-MODELS.json"
    if target.is_file() and not target.is_symlink():
        return json.loads(target.read_text(encoding="utf-8"))
    if opener is None:
        if _offline():
            return None
        opener = urllib.request.urlopen
    request = urllib.request.Request(OPENROUTER_MODELS_URL, headers={"User-Agent": USER_AGENT})
    try:
        with opener(request, timeout=TIMEOUT_S) as response:
            if getattr(response, "status", 200) != 200:
                return None
            raw = response.read(MAX_MODELS_BYTES + 1)
        if len(raw) > MAX_MODELS_BYTES:
            return None
        data = json.loads(raw.decode("utf-8"))["data"]
        models = []
        for item in data:
            pricing = item.get("pricing") or {}
            models.append({"id": str(item["id"])[:200], "name": str(item.get("name") or "")[:200],
                           "created": item.get("created"), "hugging_face_id": item.get("hugging_face_id"),
                           "pricing": {k: pricing.get(k) for k in ("prompt", "completion", "input_cache_read")
                                       if k in pricing}})
    except (OSError, ValueError, KeyError, TypeError, urllib.error.URLError):
        return None
    receipt = {"schema_version": 1, "source": OPENROUTER_MODELS_URL, "fetched_at": _now(),
               "fetched_by": "fastlane host (host_evidence.py)", "response_sha256": hashlib.sha256(raw).hexdigest(),
               "note": "pricing values are USD per token as published; 'prompt' = input, 'completion' = output",
               "models": models}
    _write(target, receipt)
    _record_doc(docs, "OPENROUTER-MODELS.json", OPENROUTER_MODELS_URL, receipt["fetched_at"])
    return receipt


def _record_doc(docs: Path, name: str, url: str, fetched_at: str) -> None:
    receipt_path = docs / "PUBLIC-DOCS-RECEIPT.json"
    receipt = {"schema_version": 1, "documents": {}}
    if receipt_path.is_file() and not receipt_path.is_symlink():
        try:
            loaded = json.loads(receipt_path.read_text(encoding="utf-8"))
            if isinstance(loaded.get("documents"), dict):
                receipt = loaded
        except ValueError:
            pass
    receipt["documents"][name] = {"url": url, "fetched_at": fetched_at,
                                  "sha256": hashlib.sha256((docs / name).read_bytes()).hexdigest()}
    _write(receipt_path, receipt)


def raw_text_has_key_like(raw: object) -> bool:
    """True when free-form access text seems to carry a pasted secret (never printed or returned)."""
    if not isinstance(raw, str):
        return False
    return bool(KEY_LIKE_RE.search(URL_RE.sub(" ", raw)))


def probe_origin(endpoint: str) -> str | None:
    """The bare https origin of a host-validated endpoint (the System One path is appended here)."""
    parsed = urllib.parse.urlsplit(endpoint)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password \
            or parsed.port not in (None, 443):
        return None
    return f"https://{parsed.hostname}"


def probe_api_access(job_dir: Path, endpoint: str, model: object, *,
                     opener: Opener | None = None) -> dict[str, Any]:
    """Send ONE synthetic System One request without credentials; record and return the outcome.

    result: keyless_ok (HTTP 200 with an answers object), key_required (HTTP 401/403), or unknown."""
    docs = _docs_dir(job_dir)
    target = docs / "ACCESS-PROBE.json"
    if target.is_file() and not target.is_symlink():
        return json.loads(target.read_text(encoding="utf-8"))
    if opener is None:
        if _offline():
            return {"result": "unknown", "detail": "offline test mode"}
        opener = urllib.request.urlopen
    origin = probe_origin(endpoint)
    record: dict[str, Any] = {"schema_version": 1, "at": _now(), "credential_sent": False,
                              "request": PROBE_BODY, "result": "unknown", "http_status": None}
    if origin is None:
        record["detail"] = "endpoint is not a plain https origin"
        _write(target, record)
        return record
    body = dict(PROBE_BODY)
    if isinstance(model, str) and MODEL_ID_RE.fullmatch(model):
        body["model"] = model
        record["request"] = body
    record["url"] = origin + "/v1/systemone"
    request = urllib.request.Request(record["url"], data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "User-Agent": USER_AGENT})
    try:
        with opener(request, timeout=TIMEOUT_S) as response:
            status = getattr(response, "status", 200)
            raw = response.read(MAX_PROBE_BYTES + 1)
        record["http_status"] = status
        if status == 200 and len(raw) <= MAX_PROBE_BYTES:
            parsed = json.loads(raw.decode("utf-8"))
            if isinstance(parsed, dict) and isinstance(parsed.get("answers"), dict):
                record["result"] = "keyless_ok"
                served = parsed.get("model")
                if isinstance(served, str) and MODEL_ID_RE.fullmatch(served):
                    record["served_model"] = served
    except urllib.error.HTTPError as exc:
        record["http_status"] = exc.code
        if exc.code in (401, 403):
            record["result"] = "key_required"
    except (OSError, ValueError, urllib.error.URLError) as exc:
        record["detail"] = type(exc).__name__
    _write(target, record)
    return record
