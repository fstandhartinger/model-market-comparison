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
admitted generation has no host receipt, after the same guarded live paid-order
running transition as legacy: paid/review-passed, starting/failed, no customer
hold, non-null payment and unexpired original deadline. A failed CAS refuses
measurement without incrementing or resetting counters. A completed receipt skips
this rental-only CAS, so baseline waiting remains idempotent. Existing receipts are validated instead
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
inspector adds a read-only Python.h existence check to the earlier reviewed root
candidate. The actual independent final delta review covers these updated bytes;
the admission must pin their new hash. No customer
recipe flag or arbitrary callback/script path selects execution.

An optional trusted callback in `pod_runner._lifecycle` runs immediately after
successful Docker pull/digest verification and before the weights loop. Legacy
callers omit it. Jeff's callback rechecks accepted admission/current retirement,
records actual `nvidia-smi` inventory, stages only the inspector, verifies the
remote hash, and runs Python `-I` through `env -i` in a read-only/network-none
container with a single read-only inspector mount. There are no source, models,
inputs or credential mounts. Package/Python/gcc/header mismatch or driver below
R580/less than 79000 MiB returns a permanent operational hold. The same-pod output
is retained at the host generation's
`runtime-preflight-<pod-id-hash>-<host-metadata-sha256>.json`, including mismatch
output. The host identity binds actual pod ID, exact image and accepted inspector
and handler hashes. Files are created exclusively; a repeated attempt refuses
before inspection rather than overwriting its previous receipt. No dependency installs, derived-image substitution, inference or new
allocation authority are granted. Existing teardown and original conservative
allocation/spending counters remain in force.


Review disposition (independent Claude CHANGES_REQUIRED): the missing dispatch
CAS and overwritable preflight report are fixed with synthetic regressions.
The v1.6 official scorer remains the numeric authority; it runs twice in isolation
and is fixture-tested for equivalence against the pinned official native scorer.
The legacy v1.5 composite check is deliberately not applied to the new method.
An incomplete-baseline OperationalHold from direct `trusted_recompute` propagates
fail-closed; the owning evaluate route catches and records that hold.

RYOTIDE order81e785ad-081b-4592-99df-1c3d709fd6c8 additionally requires a fixed first-party metadata preflight. Its host admission runtime_preflight must bind exact installed ryotide_runtime_inspector.py SHA256, ryotide_runtime_preflight.py SHA256 and the exact reviewed vllm/vllm-openai0.30 digest8a69ffad. Actual RUNTIME.json must retain native gpu_pod RYOTIDE-Qwen9, credential none, input0.08/output0.13 per million. Recipe is restricted to the reviewed local Qwen3.5-9B revision c202236235762e1c871ad0ccb60c8ee5ba337b9a and exact preset/argv/env; no arbitrary customer hook or quantization is permitted.

The existing lifecycle calls this trusted hook after pull/digest verification and before weights, customer code or input staging. Only the operator-owned hash-verified inspector is mounted read-only in a network-none, read-only, cap-dropped container with env-i/Python-I. Same owned pod GPU/driver and actual image RepoDigests are captured; >=23000MiB usable GPU memory and NVIDIA driver>=580 are required. This threshold admits advertised24GB hardware with usual usable-memory reservation; native measured long-context headroom remains a separate gate. Package metadata lower bounds follow the author direct native launch, not frozen uv lock enforcement; matched FLA/fla-core, Triton, compiler, C/Python headers and required packages are checked without importing ML/customer modules. Every attempted metadata report is an exclusive per-pod+binding receipt, including mismatches. Receipts do not grant native runtime/kernel, rental, source/input, spending or publication admission. Other orders and Jeff's reviewed callback are unchanged.
The RYOTIDE binding also includes recipe_sha256 of the actual trusted-runner/POD-RECIPE.json; its decoded bytes must equal the recipe used by the hook. Native bf16 is the reviewed preset's default, enforced here by exact argv without quant/offload override; the metadata-only hook does not prove tensor dtype. Python3.12, safetensors/huggingface-hub/numpy/accelerate metadata and C/Python headers are intentional known-image requirements. Python-I still initializes image-owned site/.pth code; customer source is absent and unmounted, but this does not imply the upstream image has no startup code. Actual dependency Requires-Dist is preserved for the parent review; version minima plus FLA/fla-core equality alone are not proof of all native dependencies or kernels. Provider errors retain partial per-pod receipts before propagating. Bad image/driver proof short-circuits before the inspector container runs. All receipt files are exclusive0600.
