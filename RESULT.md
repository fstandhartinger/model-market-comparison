# RESULT: delivery-guard

- Branch: `claude/cloud-delivery-guard-9g8zvb`
- PR: see the PR for this branch (draft, against `main`; not merge-ready; no CR ID allocated)
- Changed files: `ops/priority-evaluation/autopickup.py`, `ops/priority-evaluation/test_autopickup.py`, `RESULT.md`

## Behavior change (narrow)
1. `result_message` (public visibility): each line is now `<Benchmark> <version>: score <x.xx> — <public URL>`.
   The `#<rank> of <n_ranked>` claim is gone for every rank. Private lines are unchanged. The summary
   dict still carries `rank`/`n_ranked` (not used in mail); scores, release, top-five/X-post logic are untouched.
2. `Effects.mail`: after the existing recipient check and before the mail tool is located/imported, before
   `gmail_app_password()` and before any SMTP step, it calls `author_message_guard(subject, body)`:
   - writes `Subject: <subject>\n\n<body>` (exact text, `newline=""`) to a 0600 file in a fresh 0700 temp dir,
   - runs `[~/bin/author-message-guard, <file>]` via `subprocess.run` (list argv, no shell, `stdin=DEVNULL`, 60 s timeout),
   - fail-closed: missing/non-executable guard → `author_guard_missing`; timeout → `author_guard_timeout`;
     any exception → `author_guard_error`; nonzero exit → `author_guard_refused`. `mail()` returns `(False, <reason>)`
     and records the failure in the effects log (no body logged).
   - identical path for `dry_run=True` and real sends.

## Tests
New tests in `test_autopickup.CustomerDataTests`:
- `test_public_result_mail_reports_score_and_url_without_any_rank` (ranks 1, 2, 5, 11; private unchanged)
- `test_author_guard_checks_exact_subject_and_body_for_dry_run_and_real_mail` (exact text, single argv, empty stdin, temp file removed)
- `test_author_guard_block_missing_error_or_timeout_fails_closed_before_any_send_step`
  (refused / missing / not executable / timeout / exception × dry-run & real; asserts the mail tool is never
  located or imported and credentials are never read)
- Updated `test_mail_is_sent_in_process_without_customer_text_in_any_argv`: the only subprocess allowed is the guard.

Container limits: the test module needs host-only scorer files (`/home/flori/jobs/.../score_v15.py`) and PostgreSQL
`initdb` refuses root. I ran as an unprivileged `tester` user via a scratch runner that stubs only
`scoring_fixtures.create` (returns `(manifest, None, None)`).

Targeted run (branch): `Ran 4 tests ... OK`.
Same 4 tests against `main`'s `autopickup.py`: the guard tests ERROR (no guard is invoked), so they catch the regression.

Broader run (`test_autopickup test_refusal_approval test_mail_watch_redaction test_release_render`):
- branch: `Ran 195 tests`, `FAILED (errors=29, skipped=8)`
- main:   `Ran 188 tests`, `FAILED (failures=1, errors=48, skipped=5)`
- No error appears on the branch that is not also on main. The causes I checked (FinalizeTests, refusal_approval,
  release_render) are all environmental: 20× `TypeError: 'NoneType' object is not subscriptable` from my
  scoring-fixture stub, 4× `FileNotFoundError: ~/bin/notify_reply_actions.py` (host-only). main's extra
  Pod* errors and its test count/skip differences were not investigated (outside scope). Treat these
  numbers as container-only; the full suite needs a host run.

## Open doubts / left for Sandy
- Guard input format is assumed to be `Subject: <subject>\n\n<body>` in one file; confirm it matches what
  `~/bin/author-message-guard` expects (its interface was not inspectable here).
- The guard now gates **every** `Effects.mail` call (confirmations, delays, refusals, refunds, results), since all
  of them go to model authors. If the guard refuses some fixed template, that mail fails closed and is retried/held
  by the existing callers; review on host that current templates pass.
- `synthetic_autopickup_e2e.py` calls the real `Effects(dry_run=True).mail`, so it now requires the host guard.
- Full test suite must be run on the host (needs scorer files, non-root Postgres, `~/bin` tools).
