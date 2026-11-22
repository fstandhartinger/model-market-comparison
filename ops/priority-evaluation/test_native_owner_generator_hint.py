#!/usr/bin/env python3
"""Generator hint for single registry-family matches (CR-841). Synthetic; no network, GPU, mail or agent.

Run: python3 -m unittest ops/priority-evaluation/test_native_owner_generator_hint.py -v
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

os.environ["FASTLANE_HOST_EVIDENCE_OFFLINE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import native_owner as no  # noqa: E402

HERE = Path(__file__).resolve().parent
KRINO = {"model_link": "https://huggingface.co/guru0381/krino-2b/tree/main"}
UNKNOWN = {"model_link": "https://huggingface.co/someone/other-model"}
PRECEDENT = "8c7dbe11-5695-45d7-b701-cf92dab3ada7"
RECIPE = {"schema_version": 1, "kind": "http_typesafe", "image": "img@sha256:" + "a" * 64, "min_vram_gb": 24,
          "weights": [{"repo": "o/m", "revision": "REVSECRET1", "dir": "m", "sha256": {"f": "HASHSECRET1"}}],
          "code": {"source": "code", "commit": "COMMITSECRET1", "tree": "TREESECRET1"},
          "services": [{"argv": ["python3", "serve.py"], "ready_url": "http://127.0.0.1:8000/health"}],
          "endpoint": {"path": "/v1/decide"}}
RUNTIME = {"jevbench": {"backend": "gpu_pod", "model": "krino-2b", "credential": "none"}}


def plain_hint(order: dict) -> str:
    return no.generator_hint(order)


class GeneratorHintTests(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.write_precedent(PRECEDENT, RECIPE, RUNTIME)

    def write_precedent(self, order: str, recipe: object, runtime: object) -> dict:
        folder = self.root / order / "trusted-runner"
        folder.mkdir(parents=True, exist_ok=True)
        digests = []
        for name, value in (("POD-RECIPE.json", recipe), ("RUNTIME.json", runtime)):
            data = (json.dumps(value, indent=2) + "\n").encode()
            (folder / name).write_bytes(data)
            digests.append(hashlib.sha256(data).hexdigest())
        return {"krino": (order, *digests)}

    def patched(self, table: dict | None = None):
        if table is None:
            table = self.write_precedent(PRECEDENT, RECIPE, RUNTIME)
        return mock.patch.dict(no.GENERATOR_PRECEDENTS, table, clear=True)

    def test_single_match_inlines_recipe_and_forbids_unsupported(self) -> None:
        with self.patched():
            hint = no.generator_hint(KRINO, self.root)
        self.assertIn("do NOT write", hint)
        self.assertIn('{"backend":"unsupported"}', hint)  # named only in the prohibition
        self.assertNotIn("this order needs an owner", hint)
        self.assertIn("Precedent `POD-RECIPE.json`", hint)
        self.assertIn("Precedent `RUNTIME.json`", hint)
        self.assertIn("http_typesafe", hint)
        self.assertIn("gpu_pod", hint)

    def test_order_specific_pins_are_not_inlined(self) -> None:
        with self.patched():
            hint = no.generator_hint(KRINO, self.root)
        for secret in ("REVSECRET1", "HASHSECRET1", "COMMITSECRET1", "TREESECRET1"):
            self.assertNotIn(secret, hint)
        self.assertIn(no._PIN, hint)

    def test_without_evaluations_root_hint_is_unchanged(self) -> None:
        with self.patched():
            self.assertEqual(no.generator_hint(KRINO), no.generator_hint(KRINO, None))
            self.assertIn("this order needs an owner", no.generator_hint(KRINO))

    def test_zero_matches_empty(self) -> None:
        with self.patched():
            self.assertEqual(no.generator_hint(UNKNOWN, self.root), "")

    def test_two_matches_hint_is_byte_identical_to_today(self) -> None:
        both = {"model_link": "https://huggingface.co/guru0381/krino-2b", "code_link": "https://github.com/csabag/ryotide"}
        self.assertEqual(len(no.match_supplements(both)), 2)
        with self.patched():
            hint = no.generator_hint(both, self.root)
        self.assertEqual(hint, no.generator_hint(both))
        self.assertIn("this order needs an owner", hint)
        self.assertNotIn("Precedent `", hint)

    def test_same_family_twice_counts_as_one(self) -> None:
        order = {"model_link": "https://huggingface.co/guru0381/krino-2b", "code_link": "https://github.com/guru0381/krino"}
        with self.patched():
            self.assertIn("do NOT write", no.generator_hint(order, self.root))

    def test_family_without_precedent_is_unchanged(self) -> None:
        ryotide = {"code_link": "https://github.com/csabag/ryotide"}
        self.assertNotIn("ryotide", no.GENERATOR_PRECEDENTS)
        self.assertEqual(no.generator_hint(ryotide, self.root), no.generator_hint(ryotide))
        self.assertIn("this order needs an owner", no.generator_hint(ryotide, self.root))

    def test_changed_precedent_file_falls_back(self) -> None:
        with self.patched():
            path = self.root / PRECEDENT / "trusted-runner" / "POD-RECIPE.json"
            path.write_text(path.read_text() + " ")
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_missing_symlinked_or_oversized_precedent_falls_back(self) -> None:
        with self.patched():
            self.assertEqual(no.generator_hint(KRINO, self.root / "nowhere"), no.generator_hint(KRINO))
            recipe = self.root / PRECEDENT / "trusted-runner" / "RUNTIME.json"
            real = recipe.with_name("RUNTIME.real")
            recipe.rename(real)
            recipe.symlink_to(real)
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))
            recipe.unlink()
            real.rename(recipe)
            with mock.patch.object(no, "_PRECEDENT_FILE_LIMIT", 10):
                self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))
            self.assertIn("do NOT write", no.generator_hint(KRINO, self.root))

    def test_non_dict_recipe_falls_back(self) -> None:
        table = self.write_precedent(PRECEDENT, ["x"], RUNTIME)
        with self.patched(table):
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_precedent_table_is_consistent_with_registry(self) -> None:
        families = {entry["family"]: entry for entry in no.SUPPLEMENTS}
        for family, (order, recipe_sha, runtime_sha) in no.GENERATOR_PRECEDENTS.items():
            self.assertIn(family, families)
            source = (HERE / families[family]["module"]).read_text(encoding="utf-8")
            self.assertIn("order_admission_registry", source, family)  # extended families only
            self.assertRegex(order, r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
            self.assertRegex(recipe_sha, r"^[0-9a-f]{64}$")
            self.assertRegex(runtime_sha, r"^[0-9a-f]{64}$")

    def test_real_precedents_verify_when_present(self) -> None:
        root = Path.home() / "jobs" / "fastlane-evaluations"
        if not root.is_dir():
            self.skipTest("evaluation folders exist only on Sandy")
        present = [f for f, (o, *_d) in no.GENERATOR_PRECEDENTS.items() if (root / o / "trusted-runner").is_dir()]
        if not present:
            self.skipTest("no precedent order folder on this host")
        for family in present:
            shapes = no._precedent_shapes(family, root)
            self.assertTrue(shapes, family)
            self.assertIn("gpu_pod", shapes, family)


if __name__ == "__main__":
    unittest.main()
