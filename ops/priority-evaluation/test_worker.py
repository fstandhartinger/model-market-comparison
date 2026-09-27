import importlib.util
import sys
import unittest
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("worker.py")
SPEC = importlib.util.spec_from_file_location("priority_worker", SCRIPT)
worker = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = worker
SPEC.loader.exec_module(worker)

RUNNER_SPEC = importlib.util.spec_from_file_location("priority_agent_runner", Path(__file__).with_name("agent_runner.py"))
runner = importlib.util.module_from_spec(RUNNER_SPEC)
sys.modules[RUNNER_SPEC.name] = runner
RUNNER_SPEC.loader.exec_module(runner)

REVIEW_SPEC = importlib.util.spec_from_file_location("priority_review", Path(__file__).with_name("review.py"))
review = importlib.util.module_from_spec(REVIEW_SPEC)
sys.modules[REVIEW_SPEC.name] = review
REVIEW_SPEC.loader.exec_module(review)


class PriorityWorkerTests(unittest.TestCase):
    def test_deadline_is_48_hours_after_payment_event(self):
        paid_at = "2026-09-25T21:46:28+00:00"
        row = {"paid_at": paid_at}
        self.assertEqual(worker.display_deadline(row), "2026-09-27 21:46 UTC")

    def test_owner_and_job_path_are_request_scoped(self):
        request_id = "bc9a47b2-9304-4bdc-9254-c86f75f7a23b"
        self.assertEqual(worker.owner_for(request_id), "fastlane-eval-bc9a47b2")
        self.assertEqual(worker.safe_job_dir(request_id), worker.JOB_ROOT / request_id)

    def test_rejects_invalid_request_id_before_path_use(self):
        with self.assertRaises(worker.WorkerError):
            worker.safe_job_dir("../../outside")

    def test_systemd_show_properties_are_parsed_by_name(self):
        output = "ExecMainStatus=0\nResult=success\nActiveState=activating\nSubState=start\n"
        self.assertEqual(worker.parse_systemd_state(output), {
            "ExecMainStatus": "0", "Result": "success", "ActiveState": "activating", "SubState": "start",
        })

    def test_startup_waits_for_a_real_systemd_active_state(self):
        def result(stdout="", returncode=0):
            return subprocess.CompletedProcess(args=[], returncode=returncode, stdout=stdout, stderr="")

        with patch.object(worker.subprocess, "run", side_effect=[
            result(returncode=3), result(), result(),
            result("ExecMainStatus=0\nResult=success\nActiveState=activating\n"),
            result("ExecMainStatus=0\nResult=success\nActiveState=active\n"),
            result("ExecMainStatus=0\nResult=success\nActiveState=active\n"),
        ]) as run, patch.object(worker.time, "sleep"):
            started = worker.start_evaluation_agent({
                "id": "bc9a47b2-9304-4bdc-9254-c86f75f7a23b",
                "pickup_status": "pending",
            }, Path("/tmp/fastlane-test"), "fastlane-eval-bc9a47b2")
        self.assertTrue(started)
        self.assertEqual(run.call_count, 6)

    def test_synthetic_pickup_is_limited_to_test_mode_flagged_row(self):
        with patch.object(worker, "sql_json", return_value=None) as query:
            with self.assertRaisesRegex(worker.WorkerError, "synthetic Stripe test-mode"):
                worker.pickup_synthetic_request("bc9a47b2-9304-4bdc-9254-c86f75f7a23b")
        statement = query.call_args.args[0]
        self.assertIn("stripe_mode='test' AND synthetic_test=true", statement)
        self.assertIn("pickup_status IN ('pending','failed')", statement)

    def test_normal_pickup_claim_only_selects_live_non_synthetic_payments(self):
        with patch.object(worker, "sql_json", return_value=None) as query:
            self.assertEqual(worker.claim_paid_requests(limit=1), [])
        statement = query.call_args.args[0]
        self.assertIn("stripe_mode='live' AND synthetic_test=false", statement)

    def test_synthetic_pickup_claim_is_scoped_to_one_valid_test_request(self):
        request_id = "bc9a47b2-9304-4bdc-9254-c86f75f7a23b"
        with patch.object(worker, "sql_json", return_value=None) as query:
            self.assertEqual(worker.claim_paid_requests(limit=1, synthetic_test_request_id=request_id), [])
        statement = query.call_args.args[0]
        self.assertIn(f"id='{request_id}'::uuid", statement)
        self.assertIn("stripe_mode='test' AND synthetic_test=true", statement)

    def test_synthetic_urgent_notice_keeps_dry_run_diagnostic_on_failure(self):
        request_id = "bc9a47b2-9304-4bdc-9254-c86f75f7a23b"
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp)
            row = {
                "id": request_id, "email": "test@example.com", "model_name": "Synthetic",
                "benchmarks": ["jevbench"], "amount_total": 4900,
                "paid_at": "2026-09-25T21:46:28+00:00", "synthetic_test": True,
            }
            failure = subprocess.CompletedProcess([], 2, "preview output", "diagnostic error")
            with patch.object(worker, "sql"), patch.object(worker.subprocess, "run", return_value=failure):
                self.assertFalse(worker.send_urgent(row, job))
            diagnostic = job / ".urgent-notice-dry-run.txt"
            self.assertEqual(diagnostic.read_text(encoding="utf-8"), "preview outputdiagnostic error")

    def test_paid_codex_job_uses_the_quota_checked_paid_only_launcher(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp)
            with patch.object(runner, "HOME", job):
                def launch(args, **kwargs):
                    (job / ".engine").write_text("codex gpt-6-luna xhigh\n", encoding="utf-8")
                    (job / "OUTPUT.md").write_text("result\n", encoding="utf-8")
                    return subprocess.CompletedProcess(args, 0, "started", "")

                with patch.object(runner.subprocess, "run", side_effect=launch) as mocked:
                    result = runner.run_paid_agent("codex", job, {"PATH": "/usr/bin"})

            self.assertEqual(result.returncode, 0)
            args = mocked.call_args.args[0]
            self.assertEqual(args[0], str(job / "bin/run-codex.sh"))
            self.assertEqual(args[-1], "judgement")
            self.assertEqual(mocked.call_args.kwargs["env"]["AGENT_PAID_ONLY"], "1")
            self.assertEqual(mocked.call_args.kwargs["env"]["AGENT_KIND"], "judgement")

    def test_paid_runner_rejects_a_free_route(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = Path(tmp)
            with patch.object(runner, "HOME", job):
                def launch(args, **kwargs):
                    (job / ".engine").write_text("opencode-free\n", encoding="utf-8")
                    (job / "OUTPUT.md").write_text("result\n", encoding="utf-8")
                    return subprocess.CompletedProcess(args, 0, "started", "")

                with patch.object(runner.subprocess, "run", side_effect=launch):
                    with self.assertRaisesRegex(runner.RunnerError, "free route"):
                        runner.run_paid_agent("codex", job, {"PATH": "/usr/bin"})

    def test_release_waiting_for_florian_is_not_marked_failed(self):
        request_id = "bc9a47b2-9304-4bdc-9254-c86f75f7a23b"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            release = root / request_id / "release"
            release.mkdir(parents=True)
            (release / "PROMPT.md").write_text("release prompt\n", encoding="utf-8")
            reads = iter((
                {"status": "review_passed", "customer_hold_started_at": None},
                {"status": "review_passed", "release_status": "waiting_for_florian"},
            ))
            with patch.object(runner, "JOB_ROOT", root), \
                 patch.object(runner, "read_request", side_effect=lambda _id: next(reads)), \
                 patch.object(runner, "sql", return_value=request_id) as sql_call, \
                 patch.object(runner, "pick_paid_runner", return_value=("codex", {})), \
                 patch.object(runner, "run_paid_agent", return_value=subprocess.CompletedProcess([], 0, "", "")):
                result = runner.run_stage(request_id, "release")

            self.assertEqual(result, 0)
            self.assertFalse(any("release_status='failed'" in call.args[0] for call in sql_call.call_args_list))

    def test_review_cli_has_a_separate_florian_preview_hold(self):
        request_id = "bc9a47b2-9304-4bdc-9254-c86f75f7a23b"
        with patch.object(review.sys, "argv", ["jevbench-review", request_id, "wait-for-florian"]), \
             patch.object(review, "query", return_value=request_id) as query:
            self.assertEqual(review.main(), 0)
        statement = query.call_args.args[0]
        self.assertIn("release_status='waiting_for_florian'", statement)
        self.assertNotIn("customer_hold_started_at=now()", statement)


if __name__ == "__main__":
    unittest.main()
