#!/usr/bin/env python3
"""Generator hint for single registry-family matches (CR-841). Synthetic; no network, GPU, mail or agent.

Run: python3 -m unittest ops/priority-evaluation/test_native_owner_generator_hint.py -v
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

os.environ["FASTLANE_HOST_EVIDENCE_OFFLINE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import native_owner as no  # noqa: E402
import supplement_admission  # noqa: E402

HERE = Path(__file__).resolve().parent
KRINO = {"model_link": "https://huggingface.co/guru0381/krino-2b/tree/main"}
KRINO_REPO = "huggingface.co/guru0381/krino-2b"
KRINO_CODE = "github.com/guru0381/krino"
KRINO_WITH_CODE = {"model_link": "https://huggingface.co/guru0381/krino-2b/tree/main", "code_link": "https://github.com/guru0381/krino/tree/abc"}
UNKNOWN = {"model_link": "https://huggingface.co/someone/other-model"}
PRECEDENT = "8c7dbe11-5695-45d7-b701-cf92dab3ada7"
# 40/64-hex pins as the real precedents carry them (revision, file digests, code commit/tree, one more in argv).
H40 = "1" * 40
H64 = "2" * 64
RECIPE = {"schema_version": 1, "kind": "http_typesafe", "image": "img@sha256:" + "a" * 64, "min_vram_gb": 24,
          "weights": [{"repo": "o/m", "revision": H40, "dir": "m", "sha256": {"f1.safetensors": H64, "f2.safetensors": "3" * 64}}],
          "code": {"source": "code", "commit": "4" * 40, "tree": "5" * 40},
          "services": [{"argv": ["python3", "serve.py", "--rev", "6" * 40], "ready_url": "http://127.0.0.1:8000/health"}],
          "endpoint": {"path": "/v1/decide"}}
RUNTIME = {"jevbench": {"backend": "gpu_pod", "model": "krino-2b", "credential": "none",
                        "price_input_per_m": 0.4321, "price_output_per_m": 1.2345}}


def plain_hint(order: dict) -> str:
    return no.generator_hint(order)


class GeneratorHintTests(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.write_precedent(PRECEDENT, RECIPE, RUNTIME)

    def write_precedent(self, order: str, recipe: object, runtime: object, code_repo: str | None = None) -> dict:
        folder = self.root / order / "trusted-runner"
        folder.mkdir(parents=True, exist_ok=True)
        digests = []
        for name, value in (("POD-RECIPE.json", recipe), ("RUNTIME.json", runtime)):
            data = (json.dumps(value, indent=2) + "\n").encode()
            (folder / name).write_bytes(data)
            digests.append(hashlib.sha256(data).hexdigest())
        return {"krino": (order, *digests, KRINO_REPO, code_repo)}

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

    def test_order_specific_pins_and_prices_are_not_inlined(self) -> None:
        with self.patched():
            hint = no.generator_hint(KRINO, self.root)
        for pin in (H40, H64, "3" * 64, "4" * 40, "5" * 40, "6" * 40, "0.4321", "1.2345"):
            self.assertNotIn(pin, hint)
        self.assertEqual(re.findall(r"[0-9A-Fa-f]{40,}", hint.replace("a" * 64, "")), [])  # only the image digest has hex
        self.assertIn("img@sha256:" + "a" * 64, hint)  # the host-pinned base image stays
        for placeholder in (no._PIN_REVISION, no._PIN_FILE_SHA, no._PIN_COMMIT, no._PIN_TREE, no._PIN_ANY, no._PRICE):
            self.assertIn(placeholder, hint)
        self.assertIn('"price_input_per_m": "' + no._PRICE + '"', hint)
        self.assertIn('"<file>"', hint)  # the sha256 map keeps its map shape
        self.assertNotIn("f1.safetensors", hint)
        self.assertNotIn("order 8c7dbe11", hint)  # no other order id in the header
        self.assertIn("every 40/64-hex string", hint)
        self.assertIn("prices are replaced", hint)

    def test_wording_keeps_the_other_blocker_rules_and_the_image_contract(self) -> None:
        with self.patched():
            hint = no.generator_hint(KRINO, self.root)
        self.assertIn("this order's fetched source", hint)
        self.assertNotIn("source review shows", hint)
        self.assertIn("All other blocker rules above still apply (pickle weights, trust_remote_code or auto_map, "
                      "several systems in one order, runtime versions that differ from the documented ones)", hint)
        self.assertIn("host-pinned base image", hint)
        self.assertIn("byte-equal", hint)
        self.assertIn("any other GPU image recipe remains unsupported", hint)
        self.assertIn("the code commit and tree from the code fetch receipt", hint)
        self.assertIn("the weights revision and the file sha256 map from MODEL-WEIGHT-PINS.json", hint)
        self.assertIn(f"`{KRINO_REPO}`", hint)

    def test_hint_names_the_unpinned_weights_rule_and_the_served_model_name(self) -> None:
        # CR-841 S1: a second weights entry (e.g. a base model) has no host pin -> blocker. N1/N2: constant-field wording.
        with self.patched():
            hint = no.generator_hint(KRINO, self.root)
        self.assertIn("a weights entry for a repository other than this order's model has no host pin, so write a "
                      "blocker instead of a recipe for it; never invent a revision or hash", hint)
        self.assertIn("MODEL-WEIGHT-PINS.json pins this order's own model repository only", hint)
        self.assertNotIn("the served model name and the prices from your pricing review", hint)
        self.assertIn("the served model name `model`, which must equal the `--name` in the service argv", hint)
        self.assertIn("loader/pythonpath/model_dir/load_kwargs", hint)
        self.assertIn("and the prices from your pricing review", hint)
        self.assertIn("follow the precedent's shape with the same served model name and this order's prices", hint)

    def test_hex_in_argv_and_unexpected_places_is_replaced(self) -> None:
        recipe = dict(RECIPE, note="pin " + "7" * 64 + " here", extra={("k" + "8" * 40): "9" * 40})
        table = self.write_precedent(PRECEDENT, recipe, RUNTIME)
        with self.patched(table):
            hint = no.generator_hint(KRINO, self.root)
        self.assertIn("Precedent `POD-RECIPE.json`", hint)
        for pin in ("7" * 64, "8" * 40, "9" * 40, "6" * 40):
            self.assertNotIn(pin, hint)

    def test_inline_source_in_a_precedent_falls_back(self) -> None:
        for argv in (["python3", "-c", "import os\nprint(1)\n"], ["python3", "-c", "x" * 301]):
            recipe = dict(RECIPE, services=[{"argv": argv, "ready_url": "http://127.0.0.1:8000/health"}])
            table = self.write_precedent(PRECEDENT, recipe, RUNTIME)
            with self.patched(table):
                self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_image_without_digest_falls_back(self) -> None:
        for image in ("img:latest", None, 5):
            table = self.write_precedent(PRECEDENT, dict(RECIPE, image=image), RUNTIME)
            with self.patched(table):
                self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_only_the_precedent_repository_gets_the_recipe(self) -> None:
        # CR-841 S3: a sibling size/version of the same family (or a code-link-only order) gets the plain hint.
        table = self.write_precedent(PRECEDENT, RECIPE, RUNTIME)
        table["krino"] = table["krino"][:3] + ("huggingface.co/guru0381/krino-other", None)
        with self.patched(table):
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))
        with self.patched():
            code_only = {"code_link": "https://github.com/guru0381/krino"}
            self.assertEqual(len(no.match_supplements(code_only)), 1)
            self.assertEqual(no.generator_hint(code_only, self.root), no.generator_hint(code_only))
            # same repo, tree/branch/case in the link is fine
            self.assertIn("do NOT write", no.generator_hint({"model_link": "https://huggingface.co/Guru0381/Krino-2B/tree/v2"}, self.root))

    def test_source_model_recipe_needs_an_order_without_a_code_link(self) -> None:
        # CR-841 S2 (source "model": the precedent served the model repository's own files).
        with self.patched():
            for link in (None, "", "   "):
                self.assertIn("do NOT write", no.generator_hint(dict(KRINO, code_link=link), self.root), repr(link))
            self.assertIn("do NOT write", no.generator_hint(KRINO, self.root))  # key absent
            for name, link in (("another repository", "https://github.com/someone/else"),
                               ("the family's own code repository", "https://github.com/guru0381/krino"),
                               ("the model repository", "https://huggingface.co/guru0381/krino-2b"),
                               ("an unlisted host", "https://gitlab.com/a/b"),
                               ("not a string", 7), ("not a URL", "see the model card")):
                order = dict(KRINO, code_link=link)
                self.assertEqual(no.generator_hint(order, self.root), no.generator_hint(order), name)
                self.assertNotIn("do NOT write", no.generator_hint(order, self.root), name)

    def test_source_code_recipe_needs_the_precedent_code_repository(self) -> None:
        # CR-841 S2 (source "code": the precedent read the serving code from a separate repository).
        recipe = dict(RECIPE, code={"source": "code", "commit": "4" * 40, "tree": "5" * 40})
        table = self.write_precedent(PRECEDENT, recipe, RUNTIME, KRINO_CODE)
        with self.patched(table):
            for link in ("https://github.com/guru0381/krino", "https://github.com/Guru0381/Krino.git",
                         "https://github.com/guru0381/krino/tree/abc123"):
                order = dict(KRINO, code_link=link)
                self.assertEqual(len(no.match_supplements(order)), 1, link)
                self.assertIn("do NOT write", no.generator_hint(order, self.root), link)
            self.assertIn("do NOT write", no.generator_hint(KRINO_WITH_CODE, self.root))
            for name, order in (("no code_link", KRINO), ("empty", dict(KRINO, code_link="")),
                                ("another repository", dict(KRINO, code_link="https://github.com/someone/else")),
                                ("an unlisted host", dict(KRINO, code_link="https://gitlab.com/guru0381/krino")),
                                ("not a string", dict(KRINO, code_link=7)),
                                ("the model repository", dict(KRINO, code_link="https://huggingface.co/guru0381/krino-2b"))):
                self.assertEqual(no.generator_hint(order, self.root), no.generator_hint(order), name)
                self.assertNotIn("do NOT write", no.generator_hint(order, self.root), name)
            # the code repository alone (no model_link) is not the precedent's model repository either
            code_only = {"code_link": "https://github.com/guru0381/krino"}
            self.assertEqual(no.generator_hint(code_only, self.root), no.generator_hint(code_only))

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
        table = self.write_precedent(PRECEDENT, RECIPE, RUNTIME, KRINO_CODE)
        with self.patched(table):
            self.assertEqual(len(no.match_supplements(KRINO_WITH_CODE)), 1)  # model + code repo of one family
            self.assertIn("do NOT write", no.generator_hint(KRINO_WITH_CODE, self.root))

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

    def test_symlinked_order_folder_or_trusted_runner_falls_back(self) -> None:
        with self.patched():
            order = self.root / PRECEDENT
            real = self.root / "real-order"
            order.rename(real)
            order.symlink_to(real)
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))
            order.unlink()
            real.rename(order)
            self.assertIn("do NOT write", no.generator_hint(KRINO, self.root))
            runner = order / "trusted-runner"
            moved = order / "runner-real"
            runner.rename(moved)
            runner.symlink_to(moved)
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_directory_or_fifo_instead_of_file_falls_back(self) -> None:
        with self.patched():
            path = self.root / PRECEDENT / "trusted-runner" / "RUNTIME.json"
            path.unlink()
            path.mkdir()
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))
            path.rmdir()
            os.mkfifo(path)
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_odd_json_shapes_fall_back_without_raising(self) -> None:
        for recipe in (dict(RECIPE, weights=5), dict(RECIPE, weights=["x"]), dict(RECIPE, weights=[7]),
                       dict(RECIPE, code="x"), dict(RECIPE, weights="abc")):
            table = self.write_precedent(PRECEDENT, recipe, RUNTIME)
            with self.patched(table):
                self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO), recipe)
        with self.patched(), mock.patch.object(no, "_recipe_shape", side_effect=TypeError("x")):
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))
        with self.patched(), mock.patch.object(no, "_runtime_shape", side_effect=AttributeError("x")):
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_non_dict_recipe_falls_back(self) -> None:
        table = self.write_precedent(PRECEDENT, ["x"], RUNTIME)
        with self.patched(table):
            self.assertEqual(no.generator_hint(KRINO, self.root), no.generator_hint(KRINO))

    def test_precedent_table_is_consistent_with_registry(self) -> None:
        families = {entry["family"]: entry for entry in no.SUPPLEMENTS}
        for family, row in no.GENERATOR_PRECEDENTS.items():
            self.assertEqual(len(row), 5, family)
            order, recipe_sha, runtime_sha, repo, code_repo = row
            self.assertIn(family, families)
            source = (HERE / families[family]["module"]).read_text(encoding="utf-8")
            self.assertIn("order_admission_registry", source, family)  # extended families only
            self.assertRegex(order, r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
            self.assertRegex(recipe_sha, r"^[0-9a-f]{64}$")
            self.assertRegex(runtime_sha, r"^[0-9a-f]{64}$")
            self.assertIn(repo, families[family]["repos"], family)  # the measured repo is one the family registers
            self.assertEqual(no.repo_key("https://" + repo), repo)
            if code_repo is not None:  # CR-841 S2: the code repository is one the family registers, in canonical form
                self.assertIn(code_repo, families[family]["repos"], family)
                self.assertEqual(no.repo_key("https://" + code_repo), code_repo)

    def test_no_byte_identical_stack_family_is_in_the_table(self) -> None:
        # CR-841 M1: supplement_admission.FAMILIES keep their conditional "unless a host admission note follows" hint.
        self.assertEqual(set(no.GENERATOR_PRECEDENTS) & set(supplement_admission.FAMILIES), set())
        for family in supplement_admission.FAMILIES:
            entry = next(e for e in no.SUPPLEMENTS if e["family"] == family)
            order = {"model_link": "https://" + entry["repos"][0]}
            self.assertEqual(no.generator_hint(order, Path.home() / "jobs" / "fastlane-evaluations"), no.generator_hint(order))
            self.assertIn("Unless a host admission note follows", no.generator_hint(order, self.root), family)

    def test_inline_source_families_are_not_in_the_table(self) -> None:
        for family in ("sieve", "jeva", "cue_reflex", "minimodels_decision", "karpo_decision", "krino",
                       "minimodels_hard_candy", "ryotide", "chon"):
            self.assertNotIn(family, no.GENERATOR_PRECEDENTS)

    def test_chon_keeps_the_plain_hint(self) -> None:
        # CR-841 S1: chon's second weights entry (the base model) has no host pin and its supplement caps are order-bound.
        chon = {"model_link": "https://huggingface.co/ninhnv/chon-1.0-12b", "code_link": "https://github.com/xoai/chon"}
        self.assertEqual(len(no.match_supplements(chon)), 1)
        for root in (self.root, Path.home() / "jobs" / "fastlane-evaluations"):
            hint = no.generator_hint(chon, root)
            self.assertEqual(hint, no.generator_hint(chon))
            self.assertIn("Unless a host admission note follows", hint)
            self.assertNotIn("do NOT write", hint)

    def test_real_precedents_verify_when_present(self) -> None:
        root = Path.home() / "jobs" / "fastlane-evaluations"
        if not root.is_dir():
            self.skipTest("evaluation folders exist only on Sandy")
        present = [f for f, row in no.GENERATOR_PRECEDENTS.items() if (root / row[0] / "trusted-runner").is_dir()]
        if not present:
            self.skipTest("no precedent order folder on this host")
        for family in present:
            order, _recipe_sha, _runtime_sha, repo, code_repo = no.GENERATOR_PRECEDENTS[family]
            shapes = no._precedent_shapes(family, root)
            self.assertTrue(shapes, family)
            self.assertIn("gpu_pod", shapes, family)
            recipe = json.loads((root / order / "trusted-runner" / "POD-RECIPE.json").read_text(encoding="utf-8"))
            self.assertEqual("huggingface.co/" + recipe["weights"][0]["repo"].lower(), repo, family)  # S3 key = measured repo
            image = recipe["image"]
            runtime = json.loads((root / order / "trusted-runner" / "RUNTIME.json").read_text(encoding="utf-8"))
            self.assertEqual(re.findall(r"[0-9A-Fa-f]{40,}", shapes.replace(image.split("@sha256:")[1], "")), [], family)
            for entry in runtime.values():  # S2: previous prices are not copied
                for key in ("price_input_per_m", "price_output_per_m"):
                    self.assertIn(f'"{key}": "{no._PRICE}"', shapes, family)
                    self.assertNotIn(f'"{key}": {entry[key]}', shapes, family)
            for service in recipe.get("services", []):  # S1: no inline source reaches the prompt
                for arg in service["argv"]:
                    self.assertNotIn("\n", arg, family)
                    self.assertLessEqual(len(arg), 300, family)
            self.assertEqual(recipe["code"]["source"] == "code", code_repo is not None, family)  # S2 key matches the recipe
            if (root / order / "request.json").is_file():  # ... and the precedent order's own code link (repository key only)
                request = json.loads((root / order / "request.json").read_text(encoding="utf-8"))
                self.assertEqual(no.repo_key(request.get("code_link")), code_repo, family)
            order_row = {"model_link": "https://" + repo}
            if code_repo is not None:
                order_row["code_link"] = "https://" + code_repo
            hint = no.generator_hint(order_row, root)
            self.assertIn("do NOT write", hint, family)
            self.assertLess(len(hint), 12_000, family)
            if code_repo is None:  # a code_link of its own: plain hint
                other = dict(order_row, code_link="https://github.com/someone/else")
            else:  # the code repository missing: plain hint
                other = {"model_link": "https://" + repo}
            self.assertEqual(no.generator_hint(other, root), no.generator_hint(other), family)
            self.assertNotIn("do NOT write", no.generator_hint(other, root), family)

    def test_family_owner_trigger_follows_the_hint_match(self) -> None:
        both = {"model_link": "https://huggingface.co/guru0381/krino-2b", "code_link": "https://github.com/csabag/ryotide"}
        self.assertTrue(no.single_family(KRINO))
        self.assertTrue(no.single_family({"model_link": "https://huggingface.co/guru0381/krino-2b",
                                          "code_link": "https://github.com/guru0381/krino"}))
        self.assertFalse(no.single_family(both))
        self.assertFalse(no.single_family(UNKNOWN))
        self.assertFalse(no.single_family({}))


if __name__ == "__main__":
    unittest.main()
