# CoreWeave evaluation backend

`dispatch.evaluate` tries CoreWeave before the caller's existing Lium/RunPod function. It retains the caller's admission, model/source pins, input rotation, driver and scoring. This is a prospective interface; existing paid orders and active language controllers are not rewritten by installation.

CoreWeave needs one GPU, <=96GB including KV/context memory, a digest-pinned image with CUDA>=12.8/Torch>=2.7 and measured sm120 support, no nested Docker, an exact method/model/image equivalence receipt, and a fresh enforced-free-plan allowance readback. The policy chooses the legacy path for unknown/unsupported images, multi-GPU models, capacity/allowance failures, and deadlines today. `diagnostic=True` skips equivalence only.

The lifecycle requests `max_lifetime_seconds` on every sandbox, uses a five-minute maximum startup wait, reserves/attaches the exact ID in the shared four-GPU ledger and verifies provider absence before release. Credentials stay on Sandy; remote environments contain an empty OPENAI_API_KEY and no host credentials. Network ingress/egress starts denied. Preparation uploads only public weights and reviewed source through SDK files; benchmark inputs enter the measure callback after a durable checkpoint. A measured or cleanup-uncertain attempt never falls back or automatically repeats. Existing attempts require their owner's reconciliation.

The remote image must equal the policy's `image_digest`; the requested liability must cover USD5/h times the whole TTL. USD5/h is an intentionally conservative **accounting assumption**, not an observed CoreWeave price. Forge's authenticated CURRENT_CYCLE/SANDBOXES_COST query verifies the $30 enforced free allowance and excludes sandbox paid subscriptions. It blocks at $27 after adding retained full-TTL monthly liabilities. Liabilities stay reserved through month end because billing may lag. Launches whose declared full lifetime spans the next calendar cycle are held for legacy routing; no outstanding CoreWeave run can disappear from accounting at rollover. Requery the provider cycle at every launch; trial expiry is not a monthly reset.

## Installation and ownership

On Sandy, install `cwsandbox[wandb]==1.18.0` in `~/.local/share/coreweave-eval/venv`. `install_safety.py --pins <exact-original-sha256-json> --receipts <directory>` adds the optional helper to the shared guard/reaper/monitor without changing existing provider paths. Verify the candidates, retain backups, then create `~/.config/coreweave-eval-enabled`. Removing this marker is allowed only after all owned CoreWeave sandboxes are confirmed absent. Inventory counts the whole org conservatively; the reaper can terminate only active centrally attached CoreWeave IDs. Sandboxes belonging to other users/jobs are never orphan-reaped.

The current fast-lane runner uses Docker-in-Docker and immutable admission/source pins: those recipes fall back to their original provider, and this PR does not modify that runner. The language controller is job-local at `jobs/jevbench-languages-full-20261007/tools/gpuctl`, not in this repository; its owner must adopt the prospective interface with fresh reviewed plans. Reserve item generation has no local GPU launcher to change. No second controller or mid-run provider migration is installed.

## Verification

`python3 -m unittest discover -s ops/eval-backends -p 'test_*.py'` exercises policy limits, provider pinning and fallback behavior. Live runtime/equivalence/allowance receipts and actual installation hashes are retained in `jobs/coreweave-eval-backend-20261009`; never commit predictions, gold, credentials or private inputs. Scoring remains disabled unless a measured exact-tuple equivalence receipt is accepted by the owner.
