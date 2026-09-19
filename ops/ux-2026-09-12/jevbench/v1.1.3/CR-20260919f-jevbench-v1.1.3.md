## CR-20260919f (JevBench page) → CR-91 — JevBench v1.1.3: the GPU round's rows (data only, page stays WORK IN PROGRESS)

Florian, 19 Sep 2026, verbatim (job brief of `~/jobs/jevbench-gpu-round-20260919`):

> I also think we should then run another round of benchmarks, this time including some of the models we couldn't evaluate yet because they need a GPU. You can use up to 15 € of runpod budget for testing these models via runpod.

Supervisor notes (not Florian's words):
- **The measurement is done**; nothing here asks the loop to run a model. v1.1.3 = the frozen v1.1 task set (314 decisions) and the
  v1.1.2 scoring, unchanged, plus six GPU-round rows: OpenJev on DiffusionGemma 26B-A4B (razorback16), SemIf (Qwen3.5-4B),
  open-alternative-jev (now complete, replacing its 6-decision partial v1.1 row), open-alternative-jev with the author's yes/no order
  (post-hoc, asterisked like Needle 3's tools mode), system-one on Qwen3-8B (Sean Goedecke), Bespoke Nimble 9B. v1.1.2 rows are byte-identical in
  content; only `rank_under` changes. Source: github.com/fstandhartinger/jevbench tag `v1.1.3`.
- `jevbench-v1.1.3-results.json` here keeps `protocol: jevbench::v1.1` and passes `lib/jevbench-v11.mjs` `validateJevbenchV11` unchanged
  (checked 19 Sep ~12:30 UTC). New optional fields per row: `round`, `posthoc`, `serving`, `repo_commit`, `speed.hardware`,
  `speed.measured_where`, `speed.gpu_side` (p50/p95 with the client on the GPU, and answer agreement), `gpu_rental_for_this_run`.
- **CR-91.1** Page data: if the page still shows v1.1.x when the loop gets here, switch `/jev-models` to this artifact (suggested home
  `data/raw/benchmarks/jevbench/v1.1/jevbench-v1.1.3-results.json`, update `JEVBENCH_V11_ARTIFACT`/`SHA256`). **If JevBench v1.2
  (job `jevbench-v1-2-hard-20260919`, CR-88 and after) has already landed, skip CR-91.1**: that job carries these rows into v1.2.
- **CR-91.2** GPU rows get a small "(GPU)" tag and a tooltip with `speed.hardware` + `speed.measured_where`; `posthoc == true` rows get the `*`
  and their `note`, as Needle 3 tools mode does.
- **Do not** remove the WORK IN PROGRESS banner or re-add the menu link (CR-88). No posting.
- Acceptance: every number read from the JSON; a reviewer can recompute any Main Score from the three sub-scores; `validateJevbenchV11` passes.
