# /submit end-to-end test (CR-251)

`ops/submissions/e2e_submit.py` drives the real `/submit` flow, including a real Stripe TEST-mode payment.

## What it does
- Temporary Postgres cluster (initdb in a temp dir, unix socket, random port), schema from `db/accounts/*.sql`.
- `npm run build` only when `.next` is older than the sources, then `next start` on a random port with
  `STRIPE_MODE=test`, `STRIPE_TEST_SECRET_KEY` read from `~/.config/stripe/stripe.env` (never printed), a random
  `STRIPE_TEST_WEBHOOK_SECRET`, random `SUBMISSION_FORM_SECRET`/`AUTH_SECRET`, a temp RSA-3072 public key
  (`SUBMISSION_SECRET_PUBLIC_KEY`) and `BH_ADMIN_EMAILS=e2e-admin@example.com`. All inherited STRIPE_/ACCOUNTS_/AUTH_/
  SUBMISSION_/BH_ variables are dropped, so the real accounts DB and live keys are unreachable.
- A local proxy adds `Host`/`x-forwarded-host: benchmarkheaven.com`, `x-forwarded-proto: https`, a per-scenario
  `x-forwarded-for` and rewrites `Origin`, so the app behaves as behind Coolify. Stripe's return to
  `https://benchmarkheaven.com/submit/...` is intercepted in Playwright and redirected to the local proxy.
- Playwright (Python, headless Chromium, desktop 1440x900 and mobile 390x844) fills the forms. The `checkout.session.completed`
  event is fetched from the Stripe TEST API, signed with the temp whsec and posted to `/api/priority-evaluation/webhook`.
- Scenario F runs `intake_bridge.py` (dry-run, then real) against the temp DB with temp ADD-REQUESTS / watch.db and a stub mail tool.
- Everything is torn down at the end (next, proxy, postgres, temp dirs, browsers). Screenshots, `run-log.json`
  (checks, evidence, console errors) and `next-start.log` (secrets redacted) stay in the output folder.

## Run
```
cd <worktree>
python3 ops/submissions/e2e_submit.py                 # all scenarios, output in /home/flori/jobs/bh-submit-page-20261001/e2e
python3 ops/submissions/e2e_submit.py --only A,B,D    # subset
python3 ops/submissions/e2e_submit.py --out /tmp/e2e  # other output folder
```
Needs: PostgreSQL server binaries under `/usr/lib/postgresql/*/bin`, `psql`, Python `playwright` + Chromium, `cryptography`,
Node with `node_modules`, outbound access to checkout.stripe.com / api.stripe.com, `~/.config/stripe/stripe.env` with
`STRIPE_TEST_SECRET_KEY`. Exit code 1 on any failed check. Takes about 2.5 minutes with a fresh build (+ build time if stale).

## Scenarios
A free path + notice rules, B API key encryption (pg_dump / server log grep, decrypt), C abuse (honeypot, <4 s, 6th = 429),
D fast lane with real Stripe test payment + signed webhook + replay, E cancel path (desktop and mobile), F bridge,
G rendering (console errors, 390 px overflow, nav "More" entry, admin 404 / signed admin session).

## Known noise (not failures)
- `/api/analytics/visits` answers 503 in this sandbox (no analytics storage); the matching console errors are ignored.
- React error #418 (hydration) appears on roughly 3% of page loads on every page, including the untouched `/about`;
  it is recorded under `G_known_flaky_react_418` in `run-log.json` and not failed on.
- Stripe Checkout sometimes renders "Something went wrong" on a flaky asset load; the script reloads up to 3 times.
