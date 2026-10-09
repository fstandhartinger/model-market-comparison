# Fresh native generation adoption

This source-only follow-up adds host state selection to the existing single owning
`jevbench-priority-autopickup-evaluation@<order>.service` evaluate handler. No new
unit or customer-selected method flag is introduced. A present
`v16_profile_admission` must validate through `v16_profiles.accepted`; rejected or
stale admission never falls back to legacy profiles. Orders with no such key
continue using the existing v1.5/Aplomb paths.

Root operator prerequisites remain external: merged source/install review, genuine
fresh draw custody, actual fresh customer source review, independent Claude
profile/allocation acceptance, and exact host acceptance records. This adapter
cannot bootstrap a source review: the initial fresh `GATE.json` and its host state
must already be independently rebound to the accepted profile pins. It grants no
admission and does not reset attempt, allocation, spending or deadline counters.

`evaluate_v16_generation` executes the trusted native measurement only if the
admitted generation has no host receipt. Existing receipts are validated instead
of re-renting. It adopts the exact receipt/pins/1500-row raw hash into
`results/raw/<generation>/jevbench.jsonl` and preserves historic raw files.
Per-generation host receipts are stored under `v16_host_measurements`; official
scoring records under `v16_official_measurements`. Replaced aggregate records are
preserved in `official_measurement_history`.

A measurement-only null baseline stops at
`v16_completed_cohort_baseline_required`, before scoring, customer agent execution
or evaluation-attempt increments. Root must derive G_med from the complete
preregistered cohort and accept the completed cohort/common-cost/scorer package
with a fresh independent source gate while preserving actual measurement pins.
The handler then uses the official v1.6 offline scorer and normal host aggregate
record shape. `trusted_recompute` and `verify_result` bind the generation raw path
and reject stale generation/method/source-review pins. Old `official_measurement`
and `release/RESULT.json` never skip the new generation handler.

## Publication remains a separate reviewed change

The handler deliberately holds at `v16_cohort_public_release_required` after
scoring. Existing `release_render.py` explicitly produces v1.5 readers and page
components, while `validate_public_artifact_delta` requires preserving every old
row and adding at most the single evaluated model. These are not suitable for a
fresh whole cohort on a different gold draw. Removing this hold without a reviewed
cohort-tab release path would silently mix incomparable results.

The normal remaining path is `trusted_recompute` -> `verify_result(public_live=False)`
-> public release plan/merge queue -> `verify_result(public_live=True)` -> existing
paid-order finalization and `result_message`/result-mail delivery. A host-produced
`release/RESULT.json` alone cannot bypass the public checks: canonical artifact,
merged PR/live revision, aggregate row equality, full-page structure, and complete
cohort roster still need valid evidence. Root must add a separate version tab and
method-scoped cohort artifact/validator, retaining old tabs and wrapper placement,
before enabling that path. No released status or mail receipt is fabricated here.

Tests: `test_v16_adoption.py` covers rejected-present admission, immutable separate
raw namespaces, mixed host pins, null-baseline adoption with old score present,
completed-baseline score followed by the renderer hold, and generation receipt
binding. All fixtures are synthetic and all controller effects are mocked.

## Jeff same-pod runtime preflight

For the fixed Jeff order only, `v16_profiles.measure` requires admission field
`runtime_preflight` with exactly `inspector_sha256`, `handler_sha256`, and `image`.
The hashes must match installed first-party `jeff_runtime_inspector.py` and
`jeff_runtime_preflight.py`; the image must equal the recipe and the actual known
upstream v0.30.0 digest. Independent admission acceptance binds those fields. The
inspector is byte-identical to the root candidate reviewed by Claude. No customer
recipe flag or arbitrary callback/script path selects execution.

An optional trusted callback in `pod_runner._lifecycle` runs immediately after
successful Docker pull/digest verification and before the weights loop. Legacy
callers omit it. Jeff's callback rechecks accepted admission/current retirement,
records actual `nvidia-smi` inventory, stages only the inspector, verifies the
remote hash, and runs Python `-I` through `env -i` in a read-only/network-none
container with a single read-only inspector mount. There are no source, models,
inputs or credential mounts. Package/Python/gcc/header mismatch or driver below
R580/less than 79000 MiB returns a permanent operational hold. The same-pod output
is retained at the host generation's `runtime-preflight.json`, including mismatch
output. No dependency installs, derived-image substitution, inference or new
allocation authority are granted. Existing teardown and original conservative
allocation/spending counters remain in force.
