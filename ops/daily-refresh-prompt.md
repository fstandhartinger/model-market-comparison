# Benchmark Heaven daily refresh

Run `bash ops/daily/run.sh` in `/opt/model-market-comparison`.
Use `--dry-run` for full isolated verification without Git publication or Telegram.
The tracked orchestrator is `ops/daily/daily.mjs`; see `ops/daily/README.md`.

Discover current OpenRouter prices and AA qualification every run. Only AA >=34
and at most $4/M input/output qualify; unscored smoke tests never qualify.
Every new observation needs a different-family critic and bound primary evidence.
Astra is absent from cron; repeated failures create an operator escalation request.

An isolated checkout collects the four live sources, efficiency, caching and
benchmark candidates. Coding v1.5 uses scripts/fetch-aa-coding-agents.mjs;
preserve the dated v1.4 Composite input. No homepage-first-array extraction.
Staged data must pass complete source review, build, tests, and typecheck before
publication. Unresolved candidates retain prior dated observations or are dropped.
Missing data and source failures stay explicit in logs and coverage reports.

Telegram: top-five family entrants, failure at most weekly, major new families or
exact-comparable divergences >=10 percentage points. No daily success messages.
Only successful delivery stamps deduplication; failed data-event sends remain pending. Failure alerts retry through the weekly gate only while the failure persists; recovery drops stale unsent failure alerts.
Operator escalation checks ChatGPT auth and unsets API-key overrides.
