"""Synthetic tests for host_evidence.py and autopickup.host_pre_preparation (card 377); no network."""
import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

os.environ["FASTLANE_HOST_EVIDENCE_OFFLINE"] = "1"
import autopickup as ap  # noqa: E402
import host_evidence as he  # noqa: E402

MODELS = {"data": [{"id": "mistralai/ministral-3b-2512", "name": "Ministral 3 3B", "created": 1764681560,
                    "hugging_face_id": "mistralai/Ministral-3-3B-Instruct-2512",
                    "pricing": {"prompt": "0.0000001", "completion": "0.0000001", "image": "0"}}]}
ANSWER = {"model": "jemi-e4b", "answers": {"check": {"type": "noul", "noul": 0.9}}, "usage": {"input_tokens": 9}}
JINI_TEXT = ('export JEV_API_BASE=https://mixlayer.ai\nexport JEV_API_KEY=\ncurl -s "$JEV_API_BASE/v1/systemone" '
             '-H "Authorization: Bearer $JEV_API_KEY" -d \'{"model": "mixlayer/jini-qwen3.8-27b"}\'')


class Response(io.BytesIO):
    def __init__(self, body, status=200):
        super().__init__(json.dumps(body).encode() if not isinstance(body, bytes) else body)
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class Opener:
    def __init__(self, result):
        self.result, self.requests = result, []

    def __call__(self, request, timeout):
        self.requests.append(request)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


def http_error(code):
    return urllib.error.HTTPError("https://x.example/v1/systemone", code, "no", {}, io.BytesIO(b"{}"))


class HostEvidenceTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.job = Path(tmp.name) / "job"
        (self.job / "source").mkdir(parents=True)

    def test_openrouter_snapshot_is_dated_trimmed_and_listed_in_the_receipt(self):
        opener = Opener(Response(MODELS))
        receipt = he.fetch_openrouter_models(self.job, opener=opener)
        docs = self.job / "source/public-docs"
        stored = json.loads((docs / "OPENROUTER-MODELS.json").read_text())
        self.assertEqual(stored, receipt)
        self.assertEqual(stored["models"][0]["pricing"], {"prompt": "0.0000001", "completion": "0.0000001"})
        self.assertRegex(stored["fetched_at"], r"^\d{4}-\d\d-\d\dT")
        listed = json.loads((docs / "PUBLIC-DOCS-RECEIPT.json").read_text())["documents"]
        self.assertEqual(set(listed), {"OPENROUTER-MODELS.json"})
        self.assertEqual(opener.requests[0].full_url, he.OPENROUTER_MODELS_URL)
        # Idempotent: a second call reads the stored snapshot and sends nothing.
        again = Opener(AssertionError("no second fetch"))
        self.assertEqual(he.fetch_openrouter_models(self.job, opener=again), receipt)
        self.assertEqual(again.requests, [])

    def test_openrouter_failure_never_blocks(self):
        for failure in (urllib.error.URLError("down"), Response(b"not json"), Response(MODELS, status=503)):
            self.assertIsNone(he.fetch_openrouter_models(self.job, opener=Opener(failure)))
        self.assertFalse((self.job / "source/public-docs/OPENROUTER-MODELS.json").exists())

    def test_offline_mode_sends_nothing_with_the_real_opener(self):
        with mock.patch.object(he.urllib.request, "urlopen", side_effect=AssertionError("network")):
            self.assertIsNone(he.fetch_openrouter_models(self.job))

    def test_probe_sends_only_the_fixed_synthetic_request_without_credentials(self):
        opener = Opener(Response(ANSWER))
        record = he.probe_api_access(self.job, "https://oumi--jemi-serve.modal.run/v1/systemone", "jemi-latest",
                                     opener=opener)
        self.assertEqual(record["result"], "keyless_ok")
        self.assertEqual(record["served_model"], "jemi-e4b")
        request = opener.requests[0]
        self.assertEqual(request.full_url, "https://oumi--jemi-serve.modal.run/v1/systemone")
        self.assertNotIn("Authorization", {k.title(): v for k, v in request.header_items()})
        body = json.loads(request.data)
        self.assertEqual(body["questions"], he.PROBE_BODY["questions"])
        self.assertEqual(body["model"], "jemi-latest")
        self.assertFalse(record["credential_sent"])
        stored = json.loads((self.job / "source/public-docs/ACCESS-PROBE.json").read_text())
        self.assertEqual(stored["result"], "keyless_ok")

    def test_probe_outcomes(self):
        cases = [(http_error(401), "key_required"), (http_error(403), "key_required"), (http_error(500), "unknown"),
                 (urllib.error.URLError("dns"), "unknown"), (Response({"error": "x"}), "unknown")]
        for result, expected in cases:
            with self.subTest(expected=expected, result=type(result).__name__):
                probe = self.job / "source/public-docs/ACCESS-PROBE.json"
                if probe.exists():
                    probe.unlink()
                self.assertEqual(he.probe_api_access(self.job, "https://mixlayer.ai", "m", opener=Opener(result))["result"],
                                 expected)

    def test_probe_refuses_non_origin_endpoints_and_odd_model_ids(self):
        opener = Opener(AssertionError("must not send"))
        record = he.probe_api_access(self.job, "http://mixlayer.ai", "m", opener=opener)
        self.assertEqual((record["result"], opener.requests), ("unknown", []))
        (self.job / "source/public-docs/ACCESS-PROBE.json").unlink()
        opener = Opener(Response(ANSWER))
        he.probe_api_access(self.job, "https://mixlayer.ai", "bad model; rm -rf", opener=opener)
        self.assertNotIn("model", json.loads(opener.requests[0].data))

    def test_key_like_text_detection(self):
        self.assertFalse(he.raw_text_has_key_like(JINI_TEXT))
        self.assertFalse(he.raw_text_has_key_like("https://example.com/" + "a" * 60))
        self.assertTrue(he.raw_text_has_key_like(JINI_TEXT.replace("JEV_API_KEY=", "JEV_API_KEY=sk-" + "Ab1" * 10)))
        self.assertFalse(he.raw_text_has_key_like(None))


class PrePreparationTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.job = Path(tmp.name) / "job"
        (self.job / "source").mkdir(parents=True)
        (self.job / "STATE.md").write_text("# state\n")
        self.state = {"id": "x"}
        patcher = mock.patch.object(ap, "save_state")
        patcher.start()
        self.addCleanup(patcher.stop)

    def row(self, access, access_type="api_endpoint"):
        return {"id": "27387658-7b43-4ac0-bcc7-716b12f5cec7", "access_type": access_type, "model_name": "Jini 27B",
                "access_instructions": access}

    def run_hook(self, row, probe_result):
        with mock.patch.object(he, "fetch_openrouter_models") as fetch, \
                mock.patch.object(he, "probe_api_access", return_value=probe_result) as probe, \
                mock.patch.object(ap, "update_row", return_value=True) as update:
            held = ap.host_pre_preparation(row["id"], row, self.job, self.state)
        return held, fetch, probe, update

    def test_open_weights_orders_only_get_the_price_snapshot(self):
        held, fetch, probe, update = self.run_hook(self.row(None, "open_weights"), {})
        self.assertFalse(held)
        fetch.assert_called_once()
        probe.assert_not_called()
        update.assert_not_called()

    def test_host_held_key_is_never_probed(self):
        held, _fetch, probe, _update = self.run_hook(
            self.row(json.dumps({"endpoint": "https://mixlayer.ai", "api_key": "secret"})), {})
        self.assertFalse(held)
        probe.assert_not_called()

    def test_keyless_endpoint_continues_to_preparation(self):
        held, _fetch, probe, update = self.run_hook(self.row("API: https://oumi--jemi-serve.modal.run/v1/systemone"),
                                                    {"result": "keyless_ok", "at": "t"})
        self.assertFalse(held)
        self.assertEqual(probe.call_args.args[1], "https://oumi--jemi-serve.modal.run/v1/systemone")
        update.assert_not_called()
        self.assertIn("without any key", (self.job / "STATE.md").read_text())

    def test_missing_key_becomes_a_change_request_without_spending_a_preparation(self):
        held, _fetch, _probe, update = self.run_hook(self.row(JINI_TEXT),
                                                     {"result": "key_required", "http_status": 401, "at": "t"})
        self.assertTrue(held)
        assignments, guard = update.call_args.args[1], update.call_args.args[2]
        self.assertIn("customer_hold_reason='customer_changes'", assignments)
        self.assertIn("change_request_email_status='approval_required'", assignments)
        self.assertIn("customer_hold_started_at IS NULL", guard)
        change = json.loads((self.job / "review/CHANGES-REQUESTED.json").read_text())
        self.assertEqual(change["reason"], "api_key_missing")
        self.assertIn("https://mixlayer.ai", change["findings"][0])
        self.assertLessEqual(len(change["findings"][0]), 400)
        self.assertNotIn("preparation", self.state.get("stage_attempts", {}))

    def test_pasted_key_text_becomes_an_agent_intake_hold_not_a_customer_mail(self):
        text = JINI_TEXT.replace("JEV_API_KEY=", "JEV_API_KEY=mx_" + "Q7" * 15)
        held, _fetch, _probe, update = self.run_hook(self.row(text), {"result": "key_required", "http_status": 401})
        self.assertTrue(held)
        update.assert_not_called()
        self.assertEqual(self.state["operational_hold"]["reason"], "api_key_needs_private_intake")
        self.assertFalse(self.state["operational_hold"]["transient"])
        self.assertIn("api_key_needs_private_intake", ap.HOLD_REASON_LABELS)
        self.assertFalse((self.job / "review/CHANGES-REQUESTED.json").exists())

    def test_unknown_probe_outcome_changes_nothing(self):
        held, _fetch, _probe, update = self.run_hook(self.row(JINI_TEXT), {"result": "unknown"})
        self.assertFalse(held)
        update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
