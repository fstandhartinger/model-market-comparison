# Benchmark Heaven analytics

This service uses the official Umami self-hosted release `v3.4.0` on Sandy PaaS. Keep the
source pinned to the `v3.4.0` tag and PostgreSQL as the only database. The app is named
`bh-analytics`, listens on port 3000, and is routed at `https://bh-analytics.app.mintapis.com`.

## Deployment configuration

- Create a new database `umami_bh_analytics` and dedicated role `umami_bh` on Sandy. Register
  the role and database alias in PgBouncer; use PgBouncer port 6432 for the runtime URL and
  direct PostgreSQL port 5432 for `DIRECT_DATABASE_URL` migrations.
- Set `DATABASE_URL`, `DIRECT_DATABASE_URL`, a unique random `APP_SECRET`,
  `SALT_ROTATION=day`, `DISABLE_TELEMETRY=1`, and `PRIVATE_MODE=1`. Do not set
  `DISABLE_BOT_CHECK`; Umami's default bot filtering must remain enabled.
- Set the app memory limit to 768 MB and CPU limit to 0.5. Keep automatic deployments off;
  the app should use the official repository tag and be deployed deliberately.
- Use Umami's `/api/heartbeat` endpoint for the PaaS health check and allow a 60-second startup
  grace period for the first PostgreSQL migration.
- Keep both the Umami login and API key outside the repository. Store the dashboard login in
  `/home/flori/.config/bh-analytics/dashboard-credentials.env` with mode 600. Change the
  first-run `admin` password immediately, before connecting the public site. Store the
  daily-digest API key and website ID separately in
  `/home/flori/.config/bh-analytics/daily-digest.env`, also mode 600.
- Add the Umami website for `benchmarkheaven.com`; its ID is the public build-time value
  `NEXT_PUBLIC_UMAMI_WEBSITE_ID` on the existing Benchmark Heaven app. Do not put the API
  key, database password, or app secret in site build variables.

Two narrow Next.js route handlers serve `/analytics/script.js` and accept
`/analytics/api/send` on the site's own domain. The event handler forwards only page views,
sanitized paths and comparison IDs, the User-Agent, the ingress-managed `X-Real-IP`, and
Umami's short-lived in-memory cache token. Country is derived locally by Umami's bundled
GeoLite database; caller-supplied `CF-*` location headers are not trusted. The handler does
not forward cookies, authorization, or referrer headers. Before tracking starts, the browser
fetches the public model ID allowlist and keeps
only exact listed IDs on `/compare` or `/jev-models`; unknown paths collapse to `/other`, and
all other query strings, fragments and page metadata are removed. If the allowlist request
fails, comparison query values are omitted. External referrers are reduced to their origin.
The tracker and server proxy honor Do Not Track and Global Privacy Control, and collection is
restricted to the two Benchmark Heaven hostnames.

## Retention

Umami's self-hosted database otherwise retains its data indefinitely. The local daily
retention timer in `umami-retention.timer` applies `retention.sql` through PgBouncer and
removes event and derived session records older than 13 months. Its `.pgpass` file belongs
at `/home/flori/.config/bh-analytics/.pgpass` with mode 600; do not copy it into this repo.

## Daily digest

`umami-daily-digest.timer` runs shortly before the 18:30 Berlin evening digest. It queries
the prior Berlin calendar day through Umami's authenticated API and queues one English line
with the view count and top referrers using `~/bin/notify digest`. The systemd user units
are enabled only after the Umami app, website, key and live-site event flow are verified.
