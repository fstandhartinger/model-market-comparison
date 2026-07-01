# Sync prompt — pull upstream developments into the msg-branded fork

Paste this into the Claude Code session working on the **msg-branded fork** whenever you
want to pull the latest data + features from the original project (new providers like
**TensorX**, new models like **Claude Sonnet 5**, new tabs, filter fixes, price/score
refreshes). The upstream repo is public.

---

You maintain an **msg-branded fork** of the open-source "Model Market Comparison" app. The
original ("upstream") lives at **https://github.com/fstandhartinger/model-market-comparison**
(public). I want you to pull upstream's latest **data and feature developments** into our
fork **without losing our msg branding** (colours, logo, product name, fonts, footer, repo,
Azure hosting).

Recent upstream changes to bring in include: the new **TensorX** EU-sovereign provider,
**Claude Sonnet 5** (priced + featured), refreshed prices/benchmark scores across all
providers (AWS/Azure/Vertex/Nebius/Inceptron/Scaleway/IONOS/Mistral), the **Gateways** tab,
the **Provider explorer** tab, the **EU dedicated/BYOC** filter, and the **blocklist
provider-filter** fix (storage key `mmc.settings.v3`).

Do this:

1. **Add upstream + fetch.**
   ```bash
   git remote add upstream https://github.com/fstandhartinger/model-market-comparison.git 2>/dev/null || true
   git fetch upstream
   git log --oneline HEAD..upstream/main    # review what's new since our fork
   ```

2. **Merge, preferring OUR branding but THEIR data + logic.** Create a branch, then
   `git merge upstream/main`. Resolve conflicts on this rule:
   - **Keep OURS (msg branding)** for: `app/layout.tsx` (title/metadata), `components/Nav.tsx`
     (product name/labels), `app/icon.svg`, `tailwind.config.ts` + `app/globals.css` (theme
     tokens/palette/fonts), any msg footer/disclaimer, `README.md` header, and CI/Azure config.
   - **Take THEIRS (upstream)** for everything else — especially **all of `data/`**
     (`data/raw/*.json`, `data/dataset.json`, `data/gateways.json`), `scripts/build-dataset.mjs`,
     `lib/`, and any new/changed files under `app/` and `components/` that are functional
     (new tabs, filter logic, API routes). When unsure and it's not a branding file, take theirs.
   - If a conflict mixes branding + logic in one file, hand-merge: keep our visual tokens,
     take their behavior.

3. **If the merge is too tangled, do a data-first sync instead** (fast path — data changes
   are the bulk of upstream churn and are branding-free):
   ```bash
   git checkout upstream/main -- data/ scripts/build-dataset.mjs lib/ data/gateways.json
   ```
   Then manually re-apply any *new-tab / new-component* files from `git diff HEAD..upstream/main --stat`
   (e.g. `app/gateways/`, `app/provider-explorer/`, `components/GatewaysView.tsx`,
   `components/ProviderExplorer.tsx`) and the small settings/filter changes in
   `components/SettingsContext.tsx`, `components/GlobalFilters.tsx`, `components/ui.tsx`,
   `lib/cost.ts`. Re-skin any new UI to msg's palette before shipping.

4. **Rebuild + verify locally.**
   ```bash
   npm install
   npm run data:build     # regenerates data/dataset.json from the merged raw snapshots
   npm test               # must stay green (5 passing)
   npm run build
   npm start              # spot-check: TensorX + Sonnet 5 appear; Gateways & Provider-explorer tabs load
   ```
   Confirm via the API: `/api/meta` shows the new source dates; `/api/dataset` contains
   `claude-sonnet-5` and a `TensorX` provider (`eu_hosted: true`).

5. **Re-seed + redeploy on msg's Azure** (per our DEPLOYMENT.md): run `npm run db:seed`
   against the msg `DATABASE_URL`, then deploy the container/App Service. Verify the live
   msg site renders the new data and `/api/health` returns `{ok:true, db:true}`.

6. **Report** what you merged (commit range), any conflicts you resolved and how, and the
   live msg URL. Do NOT push msg secrets; keep our branding intact.

Notes:
- Upstream prices/scores refresh often — re-running this sync periodically is expected; the
  `git remote add` only needs doing once.
- The provider filter now persists under localStorage key `mmc.settings.v3` (blocklist
  semantics) — that's intentional; don't revert it to an older key.
- Upstream is USD-priced and EU-focused; keep that intact (msg's EU/data-residency angle
  aligns with it).
