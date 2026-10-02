import json
import unittest

import autopickup

SYNTH = "sk-SYNTHETIC-not-a-real-key-0123456789abcdef"


class AccessRedactionTest(unittest.TestCase):
    def row(self, access):
        return {"id": "00000000-0000-4000-8000-000000000001", "model_name": "M", "access_type": "api",
                "access_instructions": access, "notes": "", "benchmarks": ["jevbench"], "visibility": "public"}

    def test_raw_text_never_exported(self):
        raw = f"Use https://drex.example.ai/v1/systemone with api_key: \"{SYNTH}\" thanks, ann@example.com"
        data = autopickup.request_data_json(self.row(raw))
        self.assertNotIn(SYNTH, data)
        self.assertNotIn("ann@example.com", data)
        self.assertNotIn("access_instructions", data)
        access = json.loads(data)["access"]
        self.assertEqual(access["endpoint"], "https://drex.example.ai/v1/systemone")
        self.assertEqual(access["raw_text"], "withheld")

    def test_structured_key_reported_only_as_present(self):
        raw = json.dumps({"base_url": "https://drex.example.ai/v1/systemone/", "api_key": SYNTH})
        access = json.loads(autopickup.request_data_json(self.row(raw)))["access"]
        self.assertEqual(access, {"endpoint": "https://drex.example.ai/v1/systemone",
                                  "credential": "held_privately_host_only", "raw_text": "withheld"})

    def test_endpoint_with_secret_bearing_parts_rejected(self):
        for url in (f"https://u:{SYNTH}@drex.example.ai/v1", f"https://drex.example.ai/v1?key={SYNTH}",
                    "http://drex.example.ai/v1", "https://127.0.0.1/v1", "https://drex.example.ai:8443/v1",
                    f"https://drex.example.ai/v1#{SYNTH}"):
            self.assertIsNone(autopickup.public_endpoint(url), url)
            data = autopickup.request_data_json(self.row(json.dumps({"endpoint": url, "api_key": SYNTH})))
            self.assertNotIn(SYNTH, data)

    def test_missing_access(self):
        access = json.loads(autopickup.request_data_json(self.row(None)))["access"]
        self.assertEqual(access, {"endpoint": None, "credential": "not_on_file", "raw_text": "withheld"})


if __name__ == "__main__":
    unittest.main()
