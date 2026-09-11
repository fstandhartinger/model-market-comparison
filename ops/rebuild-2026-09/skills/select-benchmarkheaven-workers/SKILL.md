---
name: select-benchmarkheaven-workers
description: Choose currently qualified free or cheap workers for Benchmark Heaven collection and independent source review. Use for this repository's daily refresh and gauntlet tasks.
---

From the Benchmark Heaven repository (Sandy: `/opt/model-market-comparison`), run:

```bash
node ops/rebuild-2026-09/bin/pick-worker-models.mjs --json
bash ops/rebuild-2026-09/bin/worker.sh --help
```

The picker fetches the current OpenRouter catalog and joins `data/dataset.json`.
Qualification requires AA Intelligence Index >=34, conservatively across matched
variants. Explicit OpenRouter IDs are preferred; exact family/organization fallback
is labelled. Dated model IDs are never guessed. A missing price is not a free model;
missing AA scores and known-answer smoke success never qualify unattended work.

Choose the cheapest qualified model within the task's configured price ceiling.
Record actual execution identities and `.meta.json` receipts, not just requested IDs.
Use a critic from a different vendor family than **every** artifact producer:

```bash
bash ops/rebuild-2026-09/bin/worker.sh --file frozen-packet.json --out draft.json 'Collect the candidate artifact using the supplied primary evidence.'
bash ops/rebuild-2026-09/bin/worker.sh --critic --producer 'ACTUAL/PRODUCER-ID' --file frozen-review.json --out review.json 'Review the supplied artifact against its primary evidence and JSON acceptance contract.'
```

Replace the producer placeholder with actual receipt IDs. `--file` embeds contents;
the completion transport cannot browse or read paths in a prompt. Supply source
contents, locators, timestamps/hashes and explicit coverage IDs. Follow
`ops/rebuild-2026-09/GAUNTLET.md`: malformed output, incomplete coverage and missing
source evidence are failed reviews. At most three rounds; retain prior dated data or
quarantine candidates that cannot be verified. Never treat the round limit as a pass.

The routine daily job uses the tracked `ops/daily/` orchestrator. Astra is an explicit
escalation path for repeated failures, not a daily worker. Any Codex escalation must
unset API-key/base-URL overrides and verify ChatGPT subscription authentication.

For unattended work, set `BH_WORKER_MAX_PRICE_PER_1M=4`. The runner rechecks both
input and output prices against the live catalog even when a model ID is pinned.
If no qualified distinct-family critic fits the ceiling, keep the prior snapshot and
record a failed review. Do not lower the AA threshold or raise the price cap implicitly.

The daily ceiling is $4/M per direction to allow a qualified fallback when the two
cheapest families time out. Choose the cheapest first; `unavailable-models.jsonl`
records failures and excludes those exact model IDs for the rest of that run.
The next run starts with a new live catalog. Set `BH_WORKER_REASONING_EFFORT=low`; daily data work keeps reasoning enabled. The transport's optional reasoning-disable switch is not the daily setting. Every receipt records the effective choice and returned charges. A model that cannot complete the actual source task is not viable merely because it passed the AA eligibility gate.
