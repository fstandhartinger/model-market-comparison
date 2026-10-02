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
        self.assertEqual(access["credential"], "unstructured_needs_private_intake")

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

    def test_key_in_endpoint_path_rejected(self):
        for url in (f"https://api.example.com/v1/{SYNTH}", "https://api.example.com/key/abcdefghijklmnopqrstuvwxyz12",
                    "https://api.example.com/v1/../admin", "https://api.example.com/token/x"):
            self.assertIsNone(autopickup.public_endpoint(url), url)
        data = autopickup.request_data_json(self.row(f"see https://api.example.com/v1/{SYNTH}"))
        self.assertNotIn(SYNTH, data)
        self.assertEqual(autopickup.public_endpoint("https://Drex.Example.ai/v1/systemone"),
                         "https://drex.example.ai/v1/systemone")

    def test_credential_bearing_notes_withheld(self):
        row = self.row(None)
        row["notes"] = f"my key is {SYNTH}"
        self.assertNotIn(SYNTH, autopickup.request_data_json(row))
        row["notes"] = "reach me at ann@example.com"
        self.assertNotIn("ann@example.com", autopickup.request_data_json(row))
        row["notes"] = "my token abc"
        self.assertNotIn(SYNTH, autopickup.request_data_json(row))
        # Default-withhold: even harmless-looking free text and keyword-free short passwords stay host-side.
        for notes in ("Please run the default benchmarks.", "login demo, pw Xk9mQ2vLp7", "credentials: demo / Xk9!aa"):
            row["notes"] = notes
            self.assertNotIn(notes, autopickup.request_data_json(row))

    def test_missing_access(self):
        access = json.loads(autopickup.request_data_json(self.row(None)))["access"]
        self.assertEqual(access, {"endpoint": None, "credential": "not_on_file", "raw_text": "withheld"})




class LinkAndLegacyTest(unittest.TestCase):
    ROW = {"id": "00000000-0000-4000-8000-000000000001", "model_name": "M", "access_type": "api",
           "notes": "", "benchmarks": ["jevbench"], "visibility": "public"}

    def test_public_links_kept_and_credential_links_withheld(self):
        good = ("https://huggingface.co/Meta/Llama-3.1-8B-Instruct-GGUF",
                "https://github.com/org/repo/tree/0123456789abcdef0123456789abcdef01234567")
        for url in good:
            self.assertEqual(autopickup.public_link(url), url)
        bad = (f"https://huggingface.co/org/m?token={SYNTH}", f"https://user:{SYNTH}@github.com/org/repo",
               "http://github.com/org/repo", "https://github.com/org/repo#frag",
               "https://github.com/org/Ab3xY9Qz8Lm2Pk7Rt5Wn4Vd6Ee", f"https://x.ai/{SYNTH}",
               "https://github.com:8443/org/repo")
        for url in bad:
            self.assertIsNone(autopickup.public_link(url), url)
            row = {**self.ROW, "model_link": url, "code_link": url}
            for text in (autopickup.request_data_json(row), autopickup.review_request_json(row)):
                self.assertNotIn(SYNTH, text)
                self.assertNotIn("Ab3xY9Qz8", text)

    def legacy_dir(self, tmp, tail):
        old = {**self.ROW, "access_instructions": f'api_key: "{SYNTH}"', "notes": "pw Xk9mQ2vLp7"}
        old_data = json.dumps(old, ensure_ascii=True, indent=2)
        job = autopickup.Path(tmp) / "job"
        job.mkdir()
        (job / "request.json").write_text(old_data + "\n")
        (job / "PROMPT.md").write_text(f"# Order\n```json\n{old_data}\n```\n{tail}")
        return job, {**self.ROW, "access_instructions": f'api_key: "{SYNTH}"', "notes": "pw Xk9mQ2vLp7"}

    def test_legacy_export_regenerated_and_on_reply_kept(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tail = "## On reply\nResume owner fastlane-eval-x; continue the durable action.\n"
            job, row = self.legacy_dir(tmp, tail)
            autopickup.write_job_files(row, job)
            for name in ("request.json", "PROMPT.md"):
                text = (job / name).read_text()
                self.assertNotIn(SYNTH, text, name)
                self.assertNotIn("Xk9mQ2vLp7", text, name)
                self.assertNotIn("access_instructions", text, name)
            self.assertIn(tail, (job / "PROMPT.md").read_text())
            before = (job / "PROMPT.md").read_text()
            autopickup.write_job_files(row, job)  # idempotent
            self.assertEqual(before, (job / "PROMPT.md").read_text())

    def test_legacy_prompt_without_exact_block_fails_closed(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            job, row = self.legacy_dir(tmp, "")
            (job / "PROMPT.md").write_text('edited "access_instructions": "' + SYNTH + '"\n')
            with self.assertRaises(autopickup.PickupError):
                autopickup.write_job_files(row, job)
            self.assertIn(SYNTH, (job / "PROMPT.md").read_text())  # untouched, but pickup refuses to proceed

    def test_legacy_notes_without_exact_block_fail_closed(self):
        # R2-F1: stale export without the access key (only raw notes), block re-indented -> must not proceed.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            job = autopickup.Path(tmp) / "job"
            job.mkdir()
            old = {**self.ROW, "notes": "pw FAKEsyn9Xk"}
            old_data = json.dumps(old, ensure_ascii=True, indent=2)
            (job / "request.json").write_text(old_data + "\n")
            (job / "PROMPT.md").write_text("# Order\n" + json.dumps(old, ensure_ascii=True, indent=4) + "\n")
            with self.assertRaises(autopickup.PickupError):
                autopickup.write_job_files(old, job)
            self.assertIn("FAKEsyn9Xk", (job / "request.json").read_text())  # nothing half-migrated

    def test_current_export_untouched_by_migration(self):
        # Negative control: an already-redacted job folder is a no-op, even if the prompt was edited.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            job = autopickup.Path(tmp) / "job"
            job.mkdir()
            row = {**self.ROW, "notes": "pw FAKEsyn9Xk"}
            data = autopickup.request_data_json(row)
            (job / "request.json").write_text(data + "\n")
            (job / "PROMPT.md").write_text("hand-edited prompt\n")
            autopickup.write_job_files(row, job)
            self.assertEqual((job / "PROMPT.md").read_text(), "hand-edited prompt\n")

    def test_access_change_refreshes_request_and_prompt_block(self):
        # After private key intake the redacted access summary changes; both exports must follow.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            job = autopickup.Path(tmp) / "job"
            job.mkdir()
            row = {**self.ROW, "access_instructions": "reach out if you need a key",
                   "paid_at": "2026-10-01T21:30:00+00:00"}
            from unittest import mock
            share = mock.patch.object(autopickup, "SHARE_ROOT", autopickup.Path(__file__).resolve().parent)
            share.start()
            self.addCleanup(share.stop)
            autopickup.write_job_files(row, job)
            tail = "## On reply\nkeep me\n"
            with open(job / "PROMPT.md", "a") as handle:
                handle.write(tail)
            row["access_instructions"] = json.dumps({"endpoint": "https://drex.example.ai/v1/systemone", "api_key": SYNTH})
            autopickup.write_job_files(row, job)
            for name in ("request.json", "PROMPT.md"):
                text = (job / name).read_text()
                self.assertIn("held_privately_host_only", text, name)
                self.assertIn("https://drex.example.ai/v1/systemone", text, name)
                self.assertNotIn(SYNTH, text, name)
            self.assertTrue((job / "PROMPT.md").read_text().endswith(tail))

    def test_token_word_part_names_allowed(self):
        # R2-F2: "tokenizers" is a name, "hf_token"/"token-..." still reject.
        self.assertEqual(autopickup.public_link("https://github.com/huggingface/tokenizers"),
                         "https://github.com/huggingface/tokenizers")
        for url in ("https://x.ai/hf_token", "https://x.ai/token-abc", "https://x.ai/Tokens", "https://x.ai/accessToken",
                    "https://x.ai/mytoken"):
            self.assertIsNone(autopickup.public_link(url), url)


if __name__ == "__main__":
    unittest.main()
