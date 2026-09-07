# Render performance repair — 2026-09-07

## Coordination / claim
Hermes portfolio subagent claimed this repair at 12:13 UTC, main 0f93316. Initial tree clean; active Codex 3960104/3960124 and Claude 3395222 in /home/flori, no repo worker/competing edit found. Parent explicitly does not edit this target. Root-owned repo: specific staged files installed with sudo, no ownership/security changes. No shared workers stopped.

## Change and evidence
- Imported committed JSON is immutable per deploy. Refresh runs separately and commits a new dataset. Remove forced per-request SSR on eight catalog pages; getDataset calls Next noStore only when DATABASE_URL is set, before process-cache hits. APIs and model detail routes remain dynamic. Client components, settings, filters, model IDs and data untouched.
- TDD: production-manifest regression failed on eight catalog pages before change, passed all nine paths after; DB-boundary test failed 0 vs 2 noStore calls before, passes after (DB loader external dependency isolated).
- npm test: 75/75 pass. Both production builds succeed incl. typecheck. No-DB manifest prerenders catalog pages; DB-configured build (dummy localhost:1 URL, no real DB) keeps every page dynamic. Existing DB process-cache behavior retained; no real database integration test.
- Baseline production localhost: homepage 0.567194s; delayed health 0.040905s. Fixed warm homepage 0.016407s, health 0.006324s. x-nextjs-cache HIT, prerender=1. Local fast machine did not reproduce the remote five-second threshold.
- Playwright with installed Google Chrome: 27 initial rows, search filters to zero/restores, model detail navigation, eight catalog route visits HTTP 200, no pageerror. No signed-in browser used.
- Test commands: npm test; env -u DATABASE_URL npm run build; node --test test/production/prerender.mjs. DATABASE_URL must be set at build and runtime for DB deployments; changing data source requires a rebuild.

## Deployment checkpoint
Ready for normal main push/autodeploy on srv-d8o364jbc2fs73a9dvvg (autoDeploy=yes). No Render config, plan, database, scheduler, health timeout or security changes. No standalone restart. Final deployment/public evidence is kept outside this repo to avoid a documentation-only redeploy:
/home/flori/Dev/pdfnode/ops/proofs/portfolio-cron/2026-09-07T1200Z-gmail/render-fix.md

Residual limits: large initial payload/client hydration unchanged; model detail/API and DB-backed rendering remain dynamic. This repairs bundled catalog SSR, not every potential free-tier availability issue.
