# Starter prompt — msg-branded spin-off

Copy the prompt below into a fresh **Claude Code** session running inside msg's
environment (with the copied source as the working directory). It bootstraps the
re-branded, msg-hosted fork.

---

You are setting up an **msg systems ag–branded fork** of an existing open-source-LLM
price/benchmark comparison web app. The original is a Next.js (App Router, TypeScript) +
Postgres app that aggregates LLM prices across many providers and benchmark scores
(ArtificialAnalysis, DesignArena) into one comparable UI plus a public read-only JSON API.
The current working directory contains a copy of that source.

**Read first:** `README.md`, `DEPLOYMENT.md`, `API.md`, `data/SCHEMA.md`, `data/SCRAPING.md`.
Note especially: the only runtime secret is the optional `DATABASE_URL` (the app falls
back to the bundled `data/dataset.json` if absent); `ARTIFICIAL_ANALYSIS_API_KEY` is only
needed to refresh data, not at runtime.

Do this, checking in with me at each milestone:

1. **New repo.** Initialize a fresh git history and create a new **private repo in msg's
   GitHub org** (ask me for the exact org/name and use the `gh` CLI). Push `main`. Keep the
   original MIT/usage notices; add an msg copyright header.

2. **Re-brand to msg's corporate identity.** Apply msg systems ag's official CI — do NOT
   guess colors; pull them from msg's brand portal / design system (ask me for the brand
   guide or a link if you don't have it). Concretely:
   - Replace product name/title/metadata ("Model Market Comparison" → the msg product name
     I give you) in `app/layout.tsx`, `components/Nav.tsx`, `app/icon.svg`, README.
     msg's brand color is its signature red — confirm the exact hex with me.
   - Update the theme tokens in `tailwind.config.ts` (`ink`, `panel`, `line`, `accent`,
     `accent2`, `warn`) and `app/globals.css` to msg's palette; swap the logo/favicon
     (`app/icon.svg`) for the msg logo; set msg's brand font.
   - Re-skin the org/vendor color palette in `lib/format.ts` only if it clashes with msg CI
     (keep vendor colors distinguishable).
   - Add an msg footer / "internal tool" disclaimer as appropriate.

3. **Keep all functionality and data.** Don't change the data pipeline, scores, filters,
   or API behavior — this is a re-skin + re-host, not a rewrite. The committed
   `data/dataset.json` works out of the box; `npm install && npm run build && npm start`
   must render with no external dependencies.

4. **Host on msg's Azure.** Follow `DEPLOYMENT.md` → "Hosting on Microsoft Azure":
   - Provision **Azure Database for PostgreSQL – Flexible Server**; set `DATABASE_URL`
     (SSL enabled).
   - Deploy via **Azure Container Apps** using the included `Dockerfile` (preferred), or
     **Azure App Service** (Linux, Node 20). Set app settings `DATABASE_URL`,
     `NODE_VERSION=20`, and (only if data refresh runs here) `ARTIFICIAL_ANALYSIS_API_KEY`.
   - Run `npm run db:seed` once (or as a startup step) to load the snapshot.
   - Wire CI/CD from the msg repo (GitHub Actions → Azure) if I ask for it.

5. **Verify** the deployed site renders, `/api/health` returns `{ok:true, db:true}`, and
   `/api/dataset` returns data. Report the URL.

Constraints: ask me before anything that spends money or creates cloud resources; never
commit secrets; keep changes minimal and on-brand. Start by reading the docs above and
proposing the rebrand checklist + the exact list of files you'll touch.
