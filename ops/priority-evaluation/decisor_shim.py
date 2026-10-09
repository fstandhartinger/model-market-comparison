#!/usr/bin/env python3
"""First-party TypeSafe /v1/systemone shim for decisor-4b (fast-lane order 3687485f).

Runs inside the scored container (--network none) next to the author's patched SGLang server. It translates one
JevBench typed question into the author's documented typed-decision request and calls the author's SDK function
`decisor.decide` (reviewed, unchanged, stdlib only) against the loopback engine. Mapping:
  choice  options = criteria items in question order (id = criterion key, text = criterion text)
          -> {"type": "choice", "choice": argmax, "probabilities": {key: p}}
  noul    options = [("true", criteria["true"]), ("false", criteria["false"])] in question order
          -> {"type": "noul", "noul": p(true)}
  score   options = levels in order (id = level index "0".."n-1", text = level text)
          -> {"type": "score", "probabilities": {"0": p, ...}}
The question text is `instructions`; the state is passed through unchanged. Nothing item-specific is stored.
Usage tokens: prompt tokens reported by the engine for the scoring request, output tokens = 1 (max_new_tokens=1).
"""
import json
import math
import os
import sys
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, "/code/sdks/python")
import decisor  # noqa: E402  (author SDK, reviewed at commit 3fd3d931)

ENGINE = os.environ.get("DECISOR_ENGINE", "http://127.0.0.1:30000")
PORT = int(os.environ.get("SHIM_PORT", "8090"))
TIMEOUT = float(os.environ.get("SHIM_TIMEOUT", "300"))
_last_prompt_tokens = {"n": None}

_orig_post = decisor._post


def _post_capture(base, path, payload, timeout_s, api_key=None):
    reply = _orig_post(base, path, payload, timeout_s, api_key)
    if path == "/generate":
        _last_prompt_tokens["n"] = (reply.get("meta_info") or {}).get("prompt_tokens")
    return reply


decisor._post = _post_capture  # observe usage only; request/readout untouched


class QuestionError(ValueError):
    pass


def to_options(q):
    qtype, crit = q.get("type"), q.get("criteria")
    if qtype == "choice":
        if not isinstance(crit, dict) or len(crit) < 2:
            raise QuestionError("choice needs a criteria object")
        return qtype, [{"id": str(k), "text": str(v)} for k, v in crit.items()]
    if qtype == "noul":
        if isinstance(crit, dict) and "true" in crit and "false" in crit:
            order = [k for k in crit if k in ("true", "false")]
            return qtype, [{"id": k, "text": str(crit[k])} for k in order]
        return qtype, [{"id": "true", "text": "Yes"}, {"id": "false", "text": "No"}]
    if qtype == "score":
        if not isinstance(crit, list) or len(crit) < 2:
            raise QuestionError("score needs a list of levels")
        return qtype, [{"id": str(i), "text": str(t)} for i, t in enumerate(crit)]
    raise QuestionError(f"unsupported question type {qtype!r}")


def answer(state, q):
    qtype, options = to_options(q)
    _last_prompt_tokens["n"] = None
    res = decisor.decide(ENGINE, state, q.get("instructions", ""), options, timeout_s=TIMEOUT)
    probs = {o["id"]: float(o["prob"]) for o in res["options"]}
    if qtype == "noul":
        a = {"type": "noul", "noul": min(1.0, max(0.0, probs["true"]))}
    elif qtype == "choice":
        a = {"type": "choice", "choice": res["decision"], "probabilities": probs}
    else:
        a = {"type": "score", "score": int(res["decision"]), "probabilities": probs}
    usage = {"prompt_tokens": _last_prompt_tokens["n"], "completion_tokens": 1}
    return {"model": "decisor-4b", "answers": {"decision": a}, "usage": usage}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            return self._send(404, {"error": "not found"})
        try:
            urllib.request.urlopen(ENGINE + "/health", timeout=5)
        except Exception:  # noqa: BLE001
            return self._send(503, {"status": "engine not ready"})
        return self._send(200, {"status": "ok"})

    def do_POST(self):
        if self.path != "/v1/systemone":
            return self._send(404, {"error": "not found"})
        try:  # request parsing / mapping problems are the item's fault -> 422
            req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            q = req["questions"]["decision"]
            state = req.get("state")
            to_options(q)
            if not str(q.get("instructions", "")).strip():
                raise QuestionError("empty instructions")
        except (QuestionError, KeyError, TypeError, ValueError) as e:
            return self._send(422, {"error": f"{type(e).__name__}: {str(e)[:200]}"})
        try:
            out = answer(state, q)
            a = out["answers"]["decision"]
            vals = [a["noul"]] if "noul" in a else list(a["probabilities"].values())
            if not all(math.isfinite(v) for v in vals):
                raise ValueError("non-finite probability")
            return self._send(200, out)
        except decisor.DecisorError as e:
            msg = str(e)
            # an engine-side request rejection (e.g. input too long) is passed through as HTTP 400
            return self._send(400 if "HTTP 400" in msg else 502, {"error": msg[:300]})
        except Exception as e:  # noqa: BLE001  engine/readout fault -> counts toward the stop rule
            return self._send(502, {"error": f"{type(e).__name__}: {str(e)[:200]}"})

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
