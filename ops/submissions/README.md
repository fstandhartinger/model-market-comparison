# /submit intake bridge (CR-251)

What runs where:

| Piece | Where | Purpose |
|---|---|---|
| Site form + `bh_model_submissions` | Coolify (benchmarkheaven.com), DB `benchmarkheaven_accounts` | Stores submissions; the API key is sealed with the PUBLIC key (`SUBMISSION_SECRET_PUBLIC_KEY`) before it is written. |
| `intake_bridge.py` | Sandy, user timer `bh-submission-intake.timer` (every 5 min) | Intake, confirmation mail, key purge, abandoned checkout, routine digest. |
| `bh-submission` | Sandy, `~/bin/bh-submission` | Operator CLI. |
| Private key | `~/.config/benchmarkheaven/submission-secret-private.pem` (0600, dir 0700) | Only place a stored API key can be decrypted. Never in the repo, never on the site. |

## Data flow

1. A visitor submits on `/submit`. Regular submissions are `queued`; paid fast-lane ones start as `awaiting_payment` and
   become `queued` after the signed Stripe webhook (the priority worker owns those).
2. `intake_bridge.py` appends one line per queued row to Harold's intake file
   (`/home/flori/jobs/harold-answers-airesearch12-20260919/ADD-REQUESTS.md`, section `## From benchmarkheaven.com/submit`,
   marker `bh-submit:<id>`; same append-unique semantics as `harold-intake-telegram-gmail-20260922/mail_intake.py`),
   bumps `add_requests_pending` in the conversation-watch `watch.db`, sets `intake_synced_at`, and queues one
   `notify digest` line. The line never contains the API key; descriptions are cut at 300 characters.
3. Regular rows get the approved transactional confirmation (`submission-confirmation-template.txt`, nothing else) through
   the shared mail tool, in-process, with the same gate overrides as the fast-lane autopickup. A gate refusal leaves the row
   `pending` and counts an attempt (96 attempts, about 8 hours, then `failed`). One confirmation per recipient per 24 h
   (further rows are `skipped`); fast-lane rows are `skipped` because the priority worker sends the paid confirmation.
   At most 10 mails per run.
4. Keys are purged (`api_key_ciphertext=NULL`, `api_key_deleted_at=now()`) when the status is `evaluated`, `rejected`,
   `spam`, `withdrawn`, or when the row is older than 30 days. `awaiting_payment` rows older than 48 h whose priority
   request is not paid become `withdrawn` (and their key is purged on the next run).

Log: `~/.local/state/bh-submissions/bridge.log` (JSON lines, ids and counts only). Dry run:
`python3 ops/submissions/intake_bridge.py --dry-run` (changes nothing; mails only pass through the mail tool's `--dry-run` gate check).

## Processing a submission (CLI)

```
bh-submission queue                       # regular queue with positions; fast lane listed separately
bh-submission list --status queued
bh-submission show <ref>                  # ref = first 8 hex chars of the id, or the full uuid
bh-submission set-status <ref> in_evaluation --note "measuring with run X"
bh-submission set-status <ref> evaluated  # also purges the key at the next bridge run
bh-submission key-export <ref> /home/flori/jobs/<job>/api-key.txt   # decrypts into a NEW 0600 file; prints only "written"
bh-submission purge-key <ref>
bh-submission keygen                      # once; prints ONLY the public PEM for the site env var; never overwrites
```

`key-export` refuses destinations outside `/home/flori/jobs/` and existing files. Delete the exported file when the
measurement is done. Statuses: `awaiting_payment`, `queued`, `in_evaluation`, `evaluated`, `rejected`, `spam`, `withdrawn`.

## Install (lead, after the PR is merged and the schema is deployed)

`ops/submissions/install.sh` copies the scripts to `~/.local/share/bh-submissions/`, links the CLI to `~/bin/bh-submission`,
installs the user units and enables the timer. Then run `bh-submission keygen` once and set the printed public PEM as the
site's `SUBMISSION_SECRET_PUBLIC_KEY` (Coolify env var). Re-run `install.sh` after changing any script here.

## Fast-lane API key handover (manual step, not automated)

A paid API-endpoint submission stores its key in `bh_model_submissions`, but `ops/priority-evaluation/autopickup.py` reads
request credentials only from the priority row's host-side `access_instructions` JSON (`{"api_key": ...}`) and stops
with the operational hold `request_api_access_needs_reconciliation` when it is missing. The row projection
(`row_json_sql`) does not include `model_submission_id`, so a decrypt hook would change payment-critical code and its schema
tests; it was deliberately not added. Manual step: when that hold appears for a request with a `model_submission_id`,
find the submission (`bh-submission list`, match the link in the ADD-REQUESTS line), run
`bh-submission key-export <ref> /home/flori/jobs/fastlane-evaluations/<request-id>/api-key.txt`, reconcile the hold with
the key, then delete the file. A follow-up change can add the column to `row_json_sql` and decrypt in-process just before
`measurement_dispatch.run` (the key already travels to the sandbox via a memfd, never via argv or disk).

## Re-evaluation policy (planner)

Policy file `data/reevaluation-policy.json` (binding): the top 10 by composite rank are re-measured with every refresh;
every other row at most every 3rd refresh or when its last measurement is 30 days old. Release kinds:
`addendum` (only new entrants and paid fast-lane runs), `refresh` (top 10 + paid + due rows; the rest carried forward),
`method_change` (everything). State is `data/reevaluation-ledger.json`.

Release jobs MUST:

1. Run the planner first:
   `node scripts/plan-reevaluation.mjs --benchmark jevbench|imagejevbench|audiojevbench --kind addendum|refresh|method_change --release <label> [--date YYYY-MM-DD] [--paid key,...] [--queue-from-db]`
   (`--json` for machine output). `--queue-from-db` adds queued submissions that asked for that benchmark, fast lane first,
   then in order received.
2. Attach its markdown output to the release PR.
3. Re-measure only the rows it lists under "Re-measure" and "New entrants"; keep carried-forward rows' previous numbers
   and mark each one with its last-measured release (the "Last measured" column).
4. Commit the ledger update with the release: re-run the same command with `--write-ledger`.
   After a data release that changes the board (new ranks), run `node scripts/plan-reevaluation.mjs --seed-ledger` only for a first seed.
