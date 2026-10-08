"""Synthetic source-binding checks; no customer repositories or evaluator inputs."""
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import execution_source
from measurement_dispatch import OperationalHold


class ExecutionSourceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="source-binding-test-")
        self.addCleanup(self.temporary.cleanup)
        self.job = Path(self.temporary.name) / "job"

    def fixture(self, source="code"):
        repo = self.job / "source" / source
        repo.mkdir(parents=True)
        self.git(repo, "init", "-q")
        (repo / "app.py").write_text("# synthetic first version\n")
        self.git(repo, "add", "app.py")
        self.git(repo, "commit", "-qm", "synthetic")
        code = {"commit": self.git(repo, "rev-parse", "HEAD"),
                "tree": self.git(repo, "rev-parse", "HEAD^{tree}")}
        if source != "code":
            code["source"] = source
        self.receipt(source, code)
        return repo, code

    @staticmethod
    def git(repo, *args):
        env = {"PATH": "/usr/bin:/bin", "HOME": str(repo),
               "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
               "GIT_AUTHOR_NAME": "Synthetic", "GIT_AUTHOR_EMAIL": "test@example.invalid",
               "GIT_COMMITTER_NAME": "Synthetic", "GIT_COMMITTER_EMAIL": "test@example.invalid"}
        return subprocess.run(["/usr/bin/git", "-C", str(repo), *args], env=env,
                              capture_output=True, check=True).stdout.decode().strip()

    def receipt(self, source, code, **changes):
        value = {"which": source, "commit": code["commit"], "tree": code["tree"]}
        value.update(changes)
        (self.job / "source" / f"FETCH-RECEIPT-{source}.json").write_text(json.dumps(value))

    def archive_app(self, code):
        with tarfile.open(fileobj=io.BytesIO(execution_source.export_bound_source(code, self.job))) as archive:
            return archive.extractfile("app.py").read()

    def test_legacy_code_and_explicit_model_export_real_receipts(self):
        for source in ("code", "model"):
            with self.subTest(source=source):
                repo, code = self.fixture(source)
                self.assertEqual(execution_source.validate_code_binding(code, self.job), repo)
                self.assertEqual(self.archive_app(code), b"# synthetic first version\n")
        (self.job / "source" / "FETCH-RECEIPT-code.json").unlink()
        self.assertEqual(self.archive_app(code), b"# synthetic first version\n")
        self.assertFalse((self.job / "source" / "FETCH-RECEIPT-code.json").exists())

    def test_source_and_sha_schema_is_strict(self):
        _, code = self.fixture()
        invalid = [{**code, "source": value} for value in
                   ("../model", "/tmp", "source/model", "other", None, [])]
        invalid += [{**code, key: value} for key in ("commit", "tree")
                    for value in ("HEAD", "a" * 39, "A" * 40, 1)]
        invalid += [{**code, "path": "source/code"}, {"commit": code["commit"]}]
        for value in invalid:
            with self.subTest(value=value), self.assertRaisesRegex(OperationalHold, "pod_recipe_invalid"):
                execution_source.validate_code_binding(value, self.job)

    def test_receipt_identity_commit_and_tree_are_exact(self):
        _, code = self.fixture("model")
        for changes in ({"which": "code"}, {"commit": "a" * 40}, {"tree": "b" * 40}):
            self.receipt("model", code, **changes)
            with self.assertRaisesRegex(OperationalHold, "pod_recipe_mismatched_fetch"):
                execution_source.validate_code_binding(code, self.job)
        path = self.job / "source" / "FETCH-RECEIPT-model.json"
        for body in ("[]", "{}", "invalid JSON"):
            path.write_text(body)
            with self.assertRaises(OperationalHold):
                execution_source.validate_code_binding(code, self.job)
        path.unlink()
        with self.assertRaisesRegex(OperationalHold, "pod_recipe_unbound"):
            execution_source.validate_code_binding(code, self.job)

    def test_symlink_source_ancestors_git_and_receipt_are_rejected(self):
        repo, code = self.fixture()
        for path in (repo / ".git", repo,
                     self.job / "source" / "FETCH-RECEIPT-code.json", self.job / "source", self.job):
            target = path.with_name(path.name + "-real")
            path.rename(target)
            path.symlink_to(target, target_is_directory=target.is_dir())
            try:
                with self.subTest(path=path), self.assertRaisesRegex(OperationalHold, "pod_recipe_unbound"):
                    execution_source.validate_code_binding(code, self.job)
            finally:
                path.unlink()
                target.rename(path)

    def test_git_config_refs_and_environment_cannot_change_export(self):
        repo, code = self.fixture()
        (repo / "app.py").write_text("# synthetic second version\n")
        self.git(repo, "add", "app.py")
        self.git(repo, "commit", "-qm", "second")
        replacement = self.git(repo, "rev-parse", "HEAD")
        self.git(repo, "replace", code["commit"], replacement)
        # Invalid repository configuration would make Git fail if read.
        (repo / ".git" / "config").write_text("[invalid\n")
        inherited = {"GIT_DIR": "/nonexistent", "GIT_WORK_TREE": "/nonexistent",
                     "GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "core.bare",
                     "GIT_CONFIG_VALUE_0": "false", "GIT_SSH_COMMAND": "unavailable",
                     "GIT_CONFIG_GLOBAL": "/nonexistent", "PATH": "/nonexistent",
                     "SOURCE_BINDING_SECRET_SENTINEL": "synthetic-value"}
        actual_run = subprocess.run
        with patch.dict(os.environ, inherited), patch.object(
            execution_source.subprocess, "run", wraps=actual_run
        ) as calls:
            self.assertEqual(self.archive_app(code), b"# synthetic first version\n")
        self.assertEqual(len(calls.call_args_list), 3)
        for call in calls.call_args_list:
            self.assertEqual(call.args[0][0], "/usr/bin/git")
            self.assertNotIn("SOURCE_BINDING_SECRET_SENTINEL", call.kwargs["env"])
            self.assertNotIn("GIT_SSH_COMMAND", call.kwargs["env"])
            self.assertEqual(call.kwargs["env"]["GIT_ALLOW_PROTOCOL"], "")

    def test_matching_receipt_does_not_hide_wrong_actual_tree(self):
        _, code = self.fixture()
        code["tree"] = "a" * 40
        self.receipt("code", code)
        with self.assertRaisesRegex(OperationalHold, "pod_recipe_mismatched_fetch"):
            execution_source.export_bound_source(code, self.job)

    def test_packed_objects_and_explicit_code_selection_work(self):
        repo, code = self.fixture()
        self.git(repo, "repack", "-ad")
        code["source"] = "code"
        self.assertEqual(self.archive_app(code), b"# synthetic first version\n")

    def test_tree_object_cannot_be_used_as_a_commit(self):
        _, code = self.fixture()
        code["commit"] = code["tree"]
        self.receipt("code", code)
        with self.assertRaisesRegex(OperationalHold, "pod_recipe_mismatched_fetch"):
            execution_source.export_bound_source(code, self.job)

    def test_missing_local_blob_fails_without_remote_fetch(self):
        repo, code = self.fixture()
        blob = self.git(repo, "rev-parse", "HEAD:app.py")
        (repo / ".git" / "objects" / blob[:2] / blob[2:]).unlink()
        with self.assertRaisesRegex(OperationalHold, "pod_recipe_unbound"):
            execution_source.export_bound_source(code, self.job)

    def test_alternates_and_symlink_objects_are_rejected(self):
        repo, code = self.fixture()
        objects = repo / ".git" / "objects"
        alternate = objects / "info" / "alternates"
        alternate.write_text("/nonexistent\n")
        with self.assertRaisesRegex(OperationalHold, "pod_recipe_unbound"):
            execution_source.export_bound_source(code, self.job)
        alternate.unlink()
        for path in (objects / "symlink-file", objects / "symlink-directory"):
            path.symlink_to(repo / "app.py" if path.name.endswith("file") else repo)
            with self.assertRaisesRegex(OperationalHold, "pod_recipe_unbound"):
                execution_source.export_bound_source(code, self.job)
            path.unlink()

    def test_real_git_archive_symlinks_are_rejected(self):
        repo, code = self.fixture()
        for target in ("/absolute-target", "../../outside", "app.py"):
            with self.subTest(target=target):
                link = repo / "link.py"
                link.symlink_to(target)
                self.git(repo, "add", "link.py")
                self.git(repo, "commit", "-qm", "synthetic symlink")
                code["commit"] = self.git(repo, "rev-parse", "HEAD")
                code["tree"] = self.git(repo, "rev-parse", "HEAD^{tree}")
                self.receipt("code", code)
                with self.assertRaisesRegex(OperationalHold, "pod_recipe_unbound"):
                    execution_source.export_bound_source(code, self.job)
                link.unlink()

    @staticmethod
    def synthetic_tar(entries, global_pax=None):
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode="w", format=tarfile.PAX_FORMAT,
                          pax_headers=global_pax or {}) as archive:
            for name, kind, pax in entries:
                entry = tarfile.TarInfo(name)
                entry.type = kind
                entry.pax_headers = pax
                if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                    entry.linkname = "../../outside"
                archive.addfile(entry, io.BytesIO(b""))
        return data.getvalue()

    def test_export_rejects_unsafe_tar_members_and_pax_overrides(self):
        _, code = self.fixture()
        actual_run = subprocess.run
        unsafe = [(name, tarfile.REGTYPE, {}) for name in
                  ("../outside", "/absolute", "nested/../../outside", "nested/./file",
                   "nested//file", "C:/absolute", "nested\\file")]
        unsafe += [("special", kind, {}) for kind in
                   (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE,
                    tarfile.BLKTYPE, tarfile.FIFOTYPE, tarfile.CONTTYPE)]
        # Even overrides whose final path stays relative must be rejected.
        unsafe += [("safe", tarfile.REGTYPE, {key: value}) for key, value in
                   (("path", "another-safe-name"), ("linkpath", "safe-target"),
                    ("size", "0"), ("mtime", "0"), ("comment", "unbound-comment"))]
        payloads = [self.synthetic_tar([entry]) for entry in unsafe]
        payloads += [self.synthetic_tar([("safe", tarfile.REGTYPE, {})], {"path": "other"}),
                     self.synthetic_tar([("same", tarfile.REGTYPE, {}),
                                         ("same", tarfile.REGTYPE, {})]),
                     self.synthetic_tar([("parent", tarfile.REGTYPE, {}),
                                         ("parent/child", tarfile.REGTYPE, {})]),
                     b"invalid tar"]
        for index, payload in enumerate(payloads):
            def substitute_archive(argv, **kwargs):
                if "archive" in argv:
                    return subprocess.CompletedProcess(argv, 0, payload, b"")
                return actual_run(argv, **kwargs)
            with self.subTest(index=index), patch.object(
                execution_source.subprocess, "run", side_effect=substitute_archive
            ), self.assertRaisesRegex(OperationalHold, "pod_recipe_unbound"):
                execution_source.export_bound_source(code, self.job)

    def test_archive_allows_regular_nested_files_and_git_comment_only(self):
        repo, code = self.fixture()
        (repo / "nested").mkdir()
        (repo / "nested" / "file.py").write_text("# synthetic nested file\n")
        self.git(repo, "add", "nested/file.py")
        self.git(repo, "commit", "-qm", "nested")
        code["commit"] = self.git(repo, "rev-parse", "HEAD")
        code["tree"] = self.git(repo, "rev-parse", "HEAD^{tree}")
        self.receipt("code", code)
        exported = execution_source.export_bound_source(code, self.job)
        with tarfile.open(fileobj=io.BytesIO(exported)) as archive:
            self.assertEqual(archive.pax_headers, {"comment": code["commit"]})
            self.assertEqual(archive.extractfile("nested/file.py").read(), b"# synthetic nested file\n")

    def test_object_export_uses_independent_copies_without_hardlinks(self):
        repo, _ = self.fixture()
        original = repo / ".git" / "objects"
        copied = Path(self.temporary.name) / "copied-objects"
        with patch.object(execution_source.os, "link", side_effect=OSError("EXDEV")):
            execution_source._local_objects(original, copied)
        for path in original.rglob("*"):
            if path.is_file():
                destination = copied / path.relative_to(original)
                self.assertEqual(destination.read_bytes(), path.read_bytes())
                self.assertNotEqual(destination.stat().st_ino, path.stat().st_ino)


if __name__ == "__main__":
    unittest.main()
