# Addendum — Benchmark Heaven requirements Florian sent only to Hermes (read after 00 and 01)

Recovered on 2026-09-12 ~19:45 UTC from Hermes' Telegram history (`/home/flori/.hermes/state.db`)
and Hermes' recovered requirement draft
`/home/flori/portfolio-review-20260912/requirements/benchmark-heaven.md`. These are Florian's
own instructions and are **as binding as `00-REQUIREMENTS-VERBATIM.md`**; newer messages win
over older ones. Add every item below as rows to `PROGRESS.md`.

Also read, once, for context: `/home/flori/portfolio-review-20260912/user-request.txt` (the
portfolio round Florian ordered on 2026-09-12) and `.../policy.md` (its quality bar).

---

## E — Extra benchmarks and scoring (Florian → Hermes, 2026-09-11/12)

- **E1 — ECI into the Composite** (2026-09-11 10:32 UTC, newer than the 2026-09-10 "keep the
  Composite as it is" rule, so it wins): *"add the general ECI and software engineering ECI to
  the list of main benchmark scores we have integrated into our Composite score (see
  https://epoch.ai/eci?view=graph&tab=leaderboard&colorCategorization=Organization&eciPreset=software).
  Get the data for all models, and add that scraping howto and code to the update mechanism."*
  Document the re-weighting, keep version/provenance, and show in the Score (i) explanation
  that ECI is part of it. Make sure historical bridging (H2) handles the Composite definition
  change.
- **E2 — secondary/community benchmarks** (not in the Composite):
  - Vals AI: https://x.com/ValsAI/status/2098125164072554545 (2026-09-11 10:32)
  - https://x.com/gregpr07/status/2098067206210998586 (2026-09-11 10:32)
  - https://x.com/petergostev/status/2098331418577256546 (2026-09-11 10:35)
  - CursorBench: https://cursor.com/cursorbench (2026-09-11 10:35)
  - Apprentice Bench: https://neocognition.io/blog/apprentice-bench/ (2026-09-11 10:35)
  - DeepSWE: https://deepswe.datacurve.ai/data/v1.1 (2026-09-11 10:40)
  - FrontierBench (Cognition): https://x.com/cognition/status/2064061031912288715 — search for an
    easier primary source of the scores (2026-09-11 10:40)
  - RealSWE: https://realswe.withspecific.com/ (2026-09-12 08:19)
  Check whether earlier phases already ingested some of these (`data/raw/benchmarks/`,
  phase 11 "Real-SWE source" commit `bfeada7`); verify live, do not re-add duplicates.
- **E3 — collection method** (2026-09-11 10:35): *"as always try to find the most efficient way
  to scrape these benchmarks. Twitter posts are okish but original website is better, maybe you
  find an api or a way to intercept network traffic on that webpage — respect this for all of the
  benchmarks."* Order: official API/export → structured data in the page → static HTML → observe
  the page's own network requests in a normal browser session. Never circumvent bot protection,
  logins or paywalls; respect robots.txt and rate limits. Every recipe goes into the skills and
  the daily refresh.

## P — Portfolio-round quality bar that also applies to Benchmark Heaven (2026-09-12 10:38)

- **P1** Requirements from **both** Telegram chats (the Hermes chat and "AI Agent
  notifications") are in scope; Hermes' recovered file above is the starting point. Structure
  them as a PRD, and have an **independent reviewer** (a different engine) check the PRD for
  correctness and coverage **before** declaring the ledger complete.
- **P2** Gauntlet-loop quality: feature-complete and at least as good as the leading comparable
  product. Hermes' policy names **Artificial Analysis** as the reference comparator for
  Benchmark Heaven — build a short, cited capability comparison and close the gaps that matter.
- **P3** Do not stop before that is achieved.
- **P4** Positioning claims ("most complete collection…", "only place…") are product
  positioning; publish them only in a form the live coverage numbers support.

## F — Florian's latest wording on the result (2026-09-12 ~19:40 UTC, to Claude Code)

*"wichtig ist, dass alles umgesetzt wird und zwar in der gauntlet loop qualität und simple und
elegant und gut verständlich mit perfektem user interface, extrem intuitiv, aber dennoch
vollumfänglich"* — everything implemented, gauntlet-loop quality, simple, elegant, easy to
understand, perfect UI, extremely intuitive, yet complete. Fable 5.1 design passes judge
against exactly this.

## C — Coordination with Hermes (one writer only)

- This workstream is the **only** writer for Benchmark Heaven until `PROGRESS.md` ends with
  `ALL-ACCEPTED`. A long-lived process `bh-ux-workstream-owner-lease` (cwd = repo) marks the
  ownership for Hermes' portfolio controller between iterations; it exits by itself when
  `/opt/benchmarkheaven/state/ux/finished` exists.
- Hermes has been asked (in `/home/flori/.hermes/fuer-claude.md`) not to start Benchmark Heaven
  writers or delegations meanwhile, and to forward any new Florian wishes for Benchmark Heaven
  into this folder.
- If an iteration finds **another agent writing to this repo** (unknown commits appearing,
  a foreign process with cwd in the repo that is not a `next start` preview server), do not
  race it: finish the current safe step, record it in `PROGRESS.md`, append a short note to
  `/home/flori/.hermes/fuer-claude.md`, and exit.
- Hermes' earlier Benchmark Heaven work (commits `f59c021`, `4c363b6`, `53e8ad7`, `9caf5f3`,
  the Benchmaxxing page worker, the dark-logo SVG `public/benchmark-heaven-logo-dark.svg`) is
  the base to build on, not to redo — but every claim is re-verified live before it counts.
