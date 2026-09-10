# Master brief — "Benchmark Heaven" rebuild (2026-09-10)

**Owner of this work:** Codex CLI running `gpt-6-astra` at reasoning effort `xhigh`, on the
Sandy Hetzner server (`65.109.49.103`), in `/opt/model-market-comparison`.
**Commissioned by:** Florian, via a Claude Code session on 2026-09-10.
**Repo:** https://github.com/fstandhartinger/model-market-comparison (public, `main`).
**Live today:** https://model-market-comparison.app.mintapis.com → to become **https://benchmarkheaven.com**

You (Astra) are the **owner and quality gate**. You do not have to type every token yourself:
delegate bulk work to cheap/free worker models (§7), but **you** review, verify and are
accountable for every artifact that lands in the repo. Nothing merges that you have not
checked. See §8 for the gauntlet-loop discipline that governs every phase.

Work through the phases in `phases/`, one at a time, in order. `bin/tick.sh` (cron, every
10 min) starts the next phase when the previous one is done; state lives in `state.json`.

---

## 0. Ground rules

1. **Read `10-RECON-FINDINGS.md` first.** A Claude session already did the expensive
   recon on the three hardest data questions. Do not re-discover what is written there.
2. **The app must never be broken on `main`.** Every phase ends with `npm test` green,
   `node scripts/build-dataset.mjs` clean, `npx tsc --noEmit -p .` clean, a commit, a push
   and a verified live deploy. Small commits per phase, not one giant one.
3. **The daily refresh cron must keep working the whole time.** It runs at 05:17 UTC from
   `/opt/mmc-daily/run.sh`. If your rebuild changes the data pipeline, update that prompt
   in the same commit. Never leave the cron pointing at a script that no longer exists.
4. **Data honesty is the product.** Every number in the dataset carries its provenance
   (source, URL, date, and whether it is *measured by a third party*, *self-reported by the
   vendor*, or *derived by us*). A number you cannot attribute does not ship. Estimated or
   imputed values must be flagged as such in the JSON and visibly in the UI.
5. **Never invent a benchmark score.** If a worker model returns a score you cannot verify
   against a primary source, drop the row and log it as unverified. A missing cell is fine;
   a wrong cell destroys the product's reason to exist.
6. **Respect robots.txt, rate limits and bot protection.** Do not circumvent any access
   control, ever. If a source is not reachable politely, mark it unavailable and move on.
7. **Secrets:** on Sandy they live in `/root/.config/dev-secrets.env` and `/etc/environment`.
   Relevant: `OPEN_ROUTER_API_KEY` (note the underscore), `CHUTES_API_KEY`,
   `ARTIF_ANALYSIS_API_KEY` (the fetch script expects `ARTIFICIAL_ANALYSIS_API_KEY` — the
   run scripts already alias it), `TG_BOT_TOKEN`/`TG_CHAT_ID`, `ELEVENLABS_API_KEY`.
   Never echo a secret value into a log, a commit or a Telegram message.
8. **You run on Florian's ChatGPT Pro subscription, never on API-key billing.** The
   rebuild runs as the `flori` user on Sandy, whose `~/.codex/auth.json` is
   `auth_mode: chatgpt`. `run-phase.sh` unsets `OPENAI_API_KEY` before invoking codex and
   refuses to start unless `codex login status` reports ChatGPT. If you ever see codex
   report API-key auth, stop and report it — do not work around it.
9. **Budget discipline.** Subscription capacity is finite and shared with everything else
   Florian runs, and `model_reasoning_effort="xhigh"` across many parallel agents exhausts
   it. Your job is judgement,
   architecture, review and the tricky code. Scraping, bulk extraction, repetitive
   transformation, first drafts of long documents and mechanical refactors go to the free
   workers in §7. If a phase is burning tokens on something mechanical, stop and delegate.

---

## 1. What the product becomes

Today the app compares LLM **prices** and a handful of **benchmark indices** across
**providers**. It should become the most complete, most honest, best-looking public
overview of *model data, provider data, price data and benchmark data* that exists —
rebranded as **Benchmark Heaven**.

Three substantive additions, one UI revamp, one rebrand, plus the automation that keeps
all of it fresh daily.

---

## 2. Feature A — Token & caching-efficiency adjusted costs (default ON)

The app's cost model today assumes one fixed input:output blend. Three things are missing.

### A1 — Realistic input:output ratio (agentic coding workloads)

The base case we want to represent is **typical agentic usage of coding-agent tools**
(Claude Code, Codex, opencode): huge cached-ish input, comparatively small output.

- Preferred: derive a **per-model** empirical ratio. See `10-RECON-FINDINGS.md` §1 —
  Artificial Analysis publishes `canonicalIntelligenceIndexTokenCount`
  (`{input, output, answer, reasoning}`) per model, which is a real measured token budget
  over a whole benchmark run and yields a per-model input:output ratio directly.
- Cross-check against OpenRouter statistics if a per-model aggregate is reachable, and
  against the Chutes API (https://api.chutes.ai/openapi.json) for typical LLM values.
- Fall back to a single documented global ratio if per-model data is missing — but record
  which models use the fallback, and show it in the UI.
- Keep the existing fixed blends available as alternative scenarios the user can pick.

### A2 — Tokens needed per task (verbosity / reasoning overhead)

Two models with the same list price are not equally expensive if one burns 5× the output
tokens to solve the same task. Artificial Analysis measures exactly this: the
"Output Tokens per Intelligence Index Task" chart, i.e.
`intelligenceIndexOutputTokensPerTask = {reasoning, answer, output}` — see
`10-RECON-FINDINGS.md` §1 for the exact extraction, including the caveat that the homepage
payload only ships this for ~24 chart-selected models and how to get it for all.

Ingest per model+variant (reasoning effort matters enormously here) and use it in the
effective-cost formula.

### A3 — Caching efficiency, per **model × provider**

Cached input tokens are cheaper, and how much you actually get cached differs per
inference provider. Collect the cache-hit statistics OpenRouter shows on a model's pricing
section (e.g. https://openrouter.ai/moonshotai/kimi-k3#pricing) **per model+endpoint**,
together with the cache read/write prices we already have in several catalogs.

### A4 — The effective-cost engine

Compose the above into an `effective_cost_per_task` (and per-1M-blended equivalent):

```
effective_cost = (input_tokens_per_task × (1 − cache_hit_rate) × input_price
               +  input_tokens_per_task × cache_hit_rate      × cache_read_price
               +  cache_write_tokens    × cache_write_price
               +  output_tokens_per_task × output_price) 
```

- Every term must degrade gracefully when a component is unknown (documented fallbacks,
  flagged as estimated).
- **Default the UI to the adjusted price**, with a clearly labelled toggle back to raw
  list price, and a per-row explainer showing which inputs produced the adjusted number.
  The point is that a user can answer *"which model is really cheapest at a given minimum
  benchmark score"* — make that question answerable in one screen.
- Unit-test the formula, including the degradation paths.

---

## 3. Feature B — The benchmark universe

Ambition: **the most complete benchmark collection in the AI-Twitter universe.**

### B1 — Benchmark registry

A first-class `data/raw/benchmarks/` registry. Per benchmark:
`id, name, version, family (to group versions), category (Coding | Agentic | Math |
Reasoning | Knowledge | Science | Long-context | Writing | Roleplay | Instruction-following
| Vision | Multilingual | Safety/Alignment | Tool-use | Uncensored | Efficiency | Other),
one_sentence_description (English), scoring (what the number means, range, higher-better),
maintainer/who runs it, source_type (official_leaderboard | vendor_report | x_account |
huggingface | github | discord), primary_url, how_to_collect (an executable recipe),
update_cadence, saturated (bool + note), superseded_by, first_seen, last_verified`.

**Versioning is a hard requirement**: Terminal-Bench 4.0 scores must never be mixed with
3.0 scores. Version is part of the identity, comparisons are only ever within one version,
and the UI must show the version.

### B2 — Discovery

Cast the net wide, then prune:

- Public leaderboards and sites (SimpleBench, EQ-Bench and its suites, UGI Leaderboard,
  Fiction.liveBench, WeirdML, Vending-Bench, Aider polyglot, LiveBench, ARC-AGI, SWE-Bench
  variants, Terminal-Bench, GDPval, τ²-bench, Omniscience, CritPt, MLCR, IT-Bench, …).
  Note that Artificial Analysis's own payload already carries a dozen benchmarks we do not
  yet ingest (`10-RECON-FINDINGS.md` §1) — that is the cheapest possible win, do it first.
- **X/Twitter sweep.** Use the Sandy desktop Chrome (`gui-control-sandy` skill; the
  server's KDE session is reachable and Chrome holds a logged-in profile). **Use the
  `xplainervideo` X account for all searches — explicitly NOT `airesearch12`**, so
  Florian's main research account carries no bot-detection risk. Start with
  `https://x.com/search?q=benchmark&src=typed_query`, and use Grok in the X UI
  (`https://x.com/i/grok`) with prompts such as the one in `phases/phase-04-*.md`.
  Behave like a human user: no scripted scrolling storms, no parallel sessions.
- For each benchmark, record **where its results actually appear** (a leaderboard page, a
  specific X account that publishes them regularly, a HuggingFace space, a GitHub repo) —
  that recipe is what makes the daily refresh cheap forever.
- Prune deliberately: exclude saturated benchmarks (note *why*), pick the newest version,
  and record what you excluded and the reason, so the decision is reviewable.

### B3 — Self-reported scores

Collect vendor-claimed numbers from model-release posts, HuggingFace model cards and tech
reports. Store them **flagged as `self_reported`** with the source URL, alongside
independently measured numbers. Where a third party (e.g. Artificial Analysis) later
measures the same benchmark and the numbers diverge, surface the delta in the UI — that
discrepancy is one of the most interesting things the app can show. A gauntlet critic must
verify every captured number against its primary source before it ships.

### B4 — Composite stays as it is

Do **not** change the existing Composite score's inputs. The current sources are the ones
that are reliably available. New benchmarks are additive; they may power new views and new
sortable columns, but the headline Composite keeps its current definition. (If you have a
strong argument for a second, clearly-labelled experimental composite, propose it in the
final report — do not silently change the existing one.)

### B5 — Missing data must be elegant

Sparse coverage is the normal case. Never impute silently, never show a blank where the
reason matters. Distinguish *not tested*, *tested but not published*, *we could not reach
the source*, and *withheld/contested*. Sorting, filtering and comparison must all behave
sanely with holes, and coverage per model must be visible at a glance.

---

## 4. Feature C — UI revamp

The whole app gets a pass for usability and visual quality, judged by "absolutely perfect
standards". Concretely, at minimum:

1. **Radar charts.** On `/compare`, and as their own tab, where the user picks **up to 4
   models** and sees them overlaid on a radar whose axes are the benchmarks we collect
   (Artificial Analysis, DesignArena, and the new registry). Handle differing scales
   (normalize per axis, state how), handle missing axes honestly, let the user choose which
   axes to plot, keep it readable in light and dark.
2. **Per-model benchmark sheet** — the complete score list for one model, grouped by
   category, with version, source, date, self-reported flag and links.
3. **Per-benchmark view** — the inverse direction: pick a benchmark, get the model ranking,
   filterable, with coverage and provenance.
4. **Model-vs-model comparison** across the full benchmark set.
5. **Anomaly / outlier highlighting.** For every model, surface at a glance where it is
   unusually strong or unusually weak relative to its own overall level (e.g. z-score of a
   benchmark against that model's own profile and against the peer distribution). Show the
   self-reported-vs-measured divergences from §3 B3 here too. Make it explainable: the user
   must be able to see *why* something was flagged.
6. General revamp: information hierarchy, navigation, responsive behaviour, empty/loading
   states, accessibility (keyboard, contrast, focus), fast first paint, and no layout jank.
   Design quality is part of the deliverable, not a nice-to-have.

---

## 5. Rebrand — Benchmark Heaven

- Domain **benchmarkheaven.com** was just bought at Namecheap. Hosting stays on the Sandy
  PaaS (Coolify). You need: DNS A record → `65.109.49.103`, the domain added to the Coolify
  app (uuid `ggbs6upie6tqsousmrkw0vja`), TLS issued, and the old
  `model-market-comparison.app.mintapis.com` host kept working (redirect or serve both).
- There are **no Namecheap API credentials** in the vault. Try the Namecheap web UI in
  Sandy's logged-in Chrome (see the `self-service-provisioning` skill). If login is gated,
  do everything else and hand Florian the exact DNS records to paste, via Telegram.
- Develop real branding: name, logo/mark, favicon, colour system, typography, tone of the
  copy, og-image, README header. It should look like a product, not a rename.
- Update every user-visible mention, `app/layout.tsx` metadata, README, API docs, and the
  fork-sync prompt.

---

## 6. Automation — daily, self-critical, cheap

- Rebuild the daily refresh so it covers the new data (token efficiency, caching stats,
  benchmark registry, self-reported scores) as well as the existing sources.
- Structure each nightly run as a **gauntlet loop** (§8): a cheap worker collects, a critic
  verifies against primary sources, disagreements are resolved or the row is dropped.
- **Worker-model selection must be dynamic.** Continuously discover which OpenRouter models
  are currently free (`:free` suffix) or near-free, and pick from them — but never use a
  model below **Artificial Analysis Intelligence Index 34**, because weak models produce
  catastrophic data. We already have the AA index in our own dataset, so the picker can
  score candidates from our own data. Known-good today: `nex-agi/nex-n2.5-pro:free`,
  `inclusionai/ling-3.0-flash-vl:free`, DeepSeek V4.1 Flash (very cheap), Kimi K3 via
  Chutes (free for us). Ship this as a reusable script + skill, not a hardcoded list.
- Keep the existing Telegram policy: **quiet by default.** No daily "all good" messages.
  Notify only on (a) a new family entering the top 5, (b) a failed run at most once per 7
  days, and — new — (c) a genuinely notable data event (a major new model, or a large
  self-reported-vs-measured divergence). Florian explicitly does not want spam.

---

## 7. Delegation — who does which work

| Work | Runs on | How |
|---|---|---|
| Architecture, schema design, review, tricky code, final say | **you (gpt-6-astra xhigh)** | directly |
| Scraping, bulk extraction, first drafts, mechanical refactors, long boring documents | free/cheap workers | `bin/worker.sh` |
| Critic passes in the gauntlet loop | a *different* model than the one that produced the artifact | `bin/worker.sh --critic` |

`bin/worker.sh` wraps: opencode (Kimi K3 via Chutes — free for us), OpenRouter free models,
and DeepSeek V4.1 Flash. `bin/pick-worker-models.mjs` returns the currently viable free
models filtered by AA Intelligence Index ≥ 34. Prefer the cheapest model that is good
enough for the specific job, and always have a critic of a *different* family check
data-bearing output.

---

## 8. The gauntlet loop

Research the technique properly and write down what you learn (phase 1 deliverable). The
working definition for this project:

> An artifact is not accepted because its author is confident. It is accepted because a
> separate, adversarially-instructed reviewer tried to find what is wrong with it against
> primary sources, and either found nothing or the findings were fixed. Then the loop runs
> again until a round produces no new findings, or a bounded number of rounds is reached.

Rules for this project:

- **Framing is defensive, never offensive.** This is quality assurance of *our own* code
  and *our own* data before it reaches users. Never phrase a critic prompt as breaking,
  attacking, or circumventing anything. (This matters: an aggressively-worded review prompt
  previously triggered a policy flag on the account.)
- The critic must be a **different model** from the producer, and must be given the
  primary sources, not the producer's claims.
- Critic output is structured: `errors_found`, `fixed`, and a report with one line of
  evidence (a URL or a command output) per finding.
- Rounds are bounded (2–3 per artifact) and the residue is written down rather than hidden:
  what is still uncertain goes into the phase report.
- Apply it to **everything**, not just benchmark numbers: prices, UI copy, accessibility,
  the design, the docs.

---

## 9. Definition of done

- [ ] All features in §2–§6 implemented, tested, documented.
- [ ] `npm test` green, typecheck clean, build clean.
- [ ] Committed and pushed to `main` in reviewable commits.
- [ ] Deployed and **verified live** on https://benchmarkheaven.com (and the old host still
      resolving), with today's data.
- [ ] Daily cron rebuilt, gauntlet-based, running on free/cheap workers, verified by an
      actual dry run — not just by reading the script.
- [ ] Skills written and installed for **every** agent runtime and in **both** places
      (this machine and Sandy): Claude Code (`~/.claude/skills/<name>/SKILL.md`), Codex
      (`~/.codex/`), opencode. They must make the recurring data collection cheap and
      repeatable for a future agent that knows nothing about this project.
- [ ] `CHANGELOG.md` and the downstream-consumer docs updated: any app that syncs from this
      repo must be able to find the data after the rebrand — call out explicitly what moved
      (URLs, endpoints, file paths, schema fields) and what did not.
- [ ] A final report at `ops/rebuild-2026-09/REPORT.md`: what was built, what was verified
      and how, what was deliberately left out, what is still uncertain, and the residue list.
- [ ] Telegram update to Florian (German, concise) when done.

---

## 10. Verify the brief itself

Before you start, and again before you declare done: **read §11, the verbatim original
request, and check that every single wish in it is covered** by this brief and by your
implementation. If you find something in the original that this structured brief lost or
softened, the original wins — implement it, and note the discrepancy in the final report.

If something in the original is genuinely ambiguous, make the call a careful colleague
would make, document the assumption, and keep going. Do not block waiting for an answer.
Florian's standing preference: act autonomously and report results, not decision points.

---

## 11. The original request, verbatim (German)

> Ich möchte unsere App um ein feature erweitern:
>
> Tken and caching efficiency adjusted adjusted costs. (per default aktiviert)
>
> Die Idee ist folgende: Die App berücksichtigt ja bereits die unterschiedlichen Tokenkosten und zwar unter der Annahme eines bestimmten Mischpreises von Input/Output Tokens.
> Aber was die App noch nicht berücksichtigt sind drei Dinge
> 1. Das Verhältnis von Input zu Output Tokens, das wir aktuell annehmen ist vielleicht nicht realistisch, oder repräsentativ für das was typischerweise heutzutage passiert. Unser base case, den wir repräsentieren wollen ist typische agentic usage, wie sie üblicherweise für codeing agent tools wie claude code, codex und opencode anfällt. Versuche, aus den Statistiken von OpenRouter.ai irgendwie pro modell herauszubekommen, wie das tatsächliche Verhältnis von input- zu output tokens pro modell ist, und wenn das nicht möglich ist, schau in der api von chutes (siehe https://api.chutes.ai/openapi.json) was typische werte sind für LLMs und nehme diese als Grundlage für alle LLMs.
> 2. Nicht alle Modelle brauchen gleich viele Tokens um eine Aufgabe zu lösen. Es kann vorkommen, dass ein Modell ein vielfaches von Tokens braucht, um die gleiche Aufgabe zu lösen, wie ein anderes Modell. Dementsprechend ist das eine Modell natürlich eigentlich effektiv preiswerter als das andere Modell. Das können wir aus den Daten von ArtifialAnalysis ableiten (wir haben einen api key und die seite kann man auch scrapen). Hier ist ein beispielshaftes diagramm, das uns diese info gibt: https://artificialanalysis.ai/?intelligence-efficiency=output-tokens-per-task#intelligence-efficiency-tabs (und anbei als bild). Lass uns versuchen, diese Werte für jedes Modell bei der Datensammlung und beim Datenupdate zu sammeln, damit wir entsprechend den effective price besser ausrechnen können
> 3. Caching Efficiency - da gecachte input tokens billiger sind als ungecachte ist es wichtig zu wissen, wie viel gecachte tokens man zu erwarten hat. Und da das eine Statistik ist, die von Provider (Inference Provider) zu Provider unterschiedlich ist (je nachdem wie effizient die Provider im Caching sind), müssen wir diese Statistik pro Modell & Provider Paar speichern. Wir können sie von hier scrapen: https://openrouter.ai/moonshotai/kimi-k3#pricing. Du musst herausbekommen, sowohl für diese Info als auch für die Info die wir bei 2. und 1. brauchen, wie man diese Infos am effizientesten erlangen kann und dann skills ablegen (überall: hier, am Sandy Hetzner, für alle Agents, also claude code, codex, opencode, auf user ebene), damit wir in zukunft das sehr effizient machen können und auch nicht so viele tokens dafür brauchen und auch evtl günstigere Modelle für die gleiche Aufgabe (die täglichen Datenupdates) verwenden können.
>
> Meine Idee ist, dass wir all diese Daten sammeln und mit in unseren Datenbestand der Model Market Comparison App einbauen und dann auch bei jedem der regelmäßigen Datenupdates aktualisieren.
>
> Und ich will diese Daten in der App dann so berücksichtigen, dass wir also per default die dementsprechend adjusted prices anzeigen, denn nur so kann der Benutzer wirklich gut verstehen, welches Modell wirklich das günstigste für eine bestimmte Leistungsschwelle (minim benchmark result) ist.
>
> Gib die komplette aufgabe dieses Umbaus an Codex mit GPT-6 Astra xHigh weiter, welches am Sandy Hetzner an dieser Aufgabe arbeiten soll, samt re-test und deploy am Ende. Codex mit GPT-6 Astra xHigh darf dann wiederum einen Teil der weniger komplexen aber tokenintensiven Arbeit weitergeben an opencode mit nex-agi/nex-n2.5-pro:free via OpenRouter (aktuell komplett kostenlos) oder an DeepSeek V4.1 Flash via OpenRouter (sehr billig) oder an Kimi K3 via Chutes (für uns kostenlos), damit wir auch hier Kosten bzw Tokenbudget sparen. Aber GPT-6 Astra soll der Qualitätssicherer bleiben. Und dann Update an mich via /notify-telegram . Claude Code ist hinsichtlich weekly limit fast am Ende, daher möchte ich gerne, dass die Aufgabe so komplett wie möglich an Codex weitergegeben wird.
>
> Außerdem baue in die App noch Radar Charts ein, beispielsweise bei /compare, aber auch als eigenen Tab - wo man bis zu 4 Modelle auswählen kann, die dann in so radar charts angezeigt werden sollen. Die verschiedenen Dimensionen des Radars sind die verschiedenen Benchmarks, die wir sammeln (also z.b. die ArtifialAnalysis Benchmarks und die Design Arena Benchmarks).
>
> Eine weitere Aufgabe ist: Sammle in meinem Twitter Account weitere benchmarks, über die bereits in der Anwendung berücksichtigten. Du kannst mal einfach anfangen mit einer Suche via https://x.com/search?q=benchmark&src=typed_query. Im Chrome Browser mit meinem Google Account ist x.com mit meinem Account airesearch12 eingeloggt, da solltest du einige gute benchmarks finden, die wir auch noch mit einbauen können in die Datensammlung. Mein Anspruch ist, dass wir in unserer App am Ende die vollständigste Benchmark Sammlung des AI Twitter Universums haben. Wir können gerne den Composite Benchmark erst mal so zusammengesetzt lassen wie bisher, denn die bisherigen Quellen sind solche die sehr zuverlässig verfügbar sind, aber es wäre super wichtig, dass wir auch weitere Benchmarks einbauen. Es gibt sehr viele Community Benchmarks auf Twitter. Es funktioniert vermutlich auch gut, wenn du grok über die pberfläche des browsers verwendest (https://x.com/i/grok) und ein Prompt wie dieses absetzt:
> <prompt>
> List a lot of LLM evals that show up in X/Discord/HF feeds when a new model drops. Include official launch-card benchmarks and especially indie/personal ones: EQ-Bench-style suites, SimpleBench, UGI, Fiction.liveBench, WeirdML, Vending-Bench, self-run Aider/OTIS harnesses, writing/slop/RP boards, long-context homebrew, uncensored willingness boards. Group by mainstream vs maintainer-owned. Note how each is scored and who runs it.
> </prompt>
> Du kannst auch gerne weitere prompts absetzen oder mit subagents in die tiefe recherchieren um zu verstehen welche dieser benchmarks wir lieber exkludieren, oder was veraltete weil saturierte benchmarks sind, oder welche version der benchmarks jeweils die neueste ist.
> Wir sollten hier gerne exzessiv vorgehen. recherchiere online wie die gauntlet loop prompting technik funktioniert. Ich will, dass wir sie verwenden, um sicherzustellen, dass wir so viele und so vollständige und so korrekte Daten (gerade auch beim Thema der Benchmark-Listen und ihrer Scores, aber eigentlich hinsichtlich aller aspekte, also auch der anderen daten, der oberfläche, des designs etc) wie möglich verwenden, um unsere Model Market Comparison app zur absolut besten übersicht über alle Model-Daten, Provider-Daten, Preis-Daten und Benchmark-Daten zu machen, die es auf der Welt gibt.
>
> Und natürlcih auch wichtig: all das muss täglich aktualisiert werden können, und hierfür verwenden wir auf dem Sandy Hetzner cron jobs die wir ebenfalls mit Gauntlet Loops zweks kritik und korrketheit starten und damit das nicht so teuer wird, lass uns stetig recherchieren welche Modelle auf OpenRouter gerade kostenlos sind (aktuell zum Beispiel ist es nex-agi/nex-n2.5-pro:free, und auch andere, z.b. inclusionai/ling-3.0-flash-vl:free - aber wichtig ist: lass uns keine Modelle verwenden die extrem schwach sind, z.b. keine unter Artificial Analysis Intelligence Index Ergebnis 34, denn sonst ist das Risiko zu groß, dass wir katastrophale falsche Daten erhalten).
>
> Manche Benchmarks kann man eventuell nur über Twitter finden, indem man die Tweets der entsprechenden User findet, die diese Ergebnisse immer wieder veröffentlichen, andere findet man vielleicht auf bestimmten Webseiten. Fidne das für alle Benchmarks heraus und notieres es auch für die Zukunft. Recherchiere und notiere auch eine kurze Zusammenfassung für jeden Benchmark/Eval, also nur 1 kurzer Satz auf englisch, damit wir in der App anzeigen können, wofür welcher Benchmark steht. Kategorisiere die Benchmarks auch nach Themen, z.b. Coding, Math, Knowledge, Writing, etc.
>
> Unsere App soll dann auch mehrere neue Sektionen über Benchmarkergebnisse erhalten: Zum Beispiel für jedes Modell die vollständige Liste der Benchmark Scores und auch vergleichsmöglichkeiten zwischen modellen und auch sektionen in der oberfläche, die andersrum vorgehen, also wo die benchmarks gelistet sind und man von dort aus eine liste der modelle auswerten kann und sie auflisten kann.
>
> Wir müssen allgemein sehr elegant damit umgehen lernen, wenn benchmark scores für manche modelle vorhanden sind und für andere modelle nicht. auch mit Versionen von benchmarks müssen wir entsprechend vorsichtig umgehen: Terminal Bench 4.0 scores sind natürlich nicht mit Terminal Bench 3.0 Scores zu vermengen etc.
>
> Überhaupt sollte die App grundsätzlich revampt werden und nach absolut perfekten Maßstäben für gute Bedienbarkeit und gute Benutzeroberfläche optimiert werden.
>
> Ich möchte auch, dass in irgendeiner Ansicht der App Auffälligkeiten bei benchmarks markiert und hervorhebt, z.b. wenn ein Modell auffällig gut abschneidet in einem bestimmten benchmark oder wenn sie besonders schlecht abschneidet. Und auch wenn ein benchmarkergebniswert ein ausreißer ist, also bespielsweise: sehr gut in bestimmten Benchmarks, aber dann sehr schlecht in einem anderen. Da soll es für jedes Modell die möglichkeit geben derartige Auffälligkeiten auf einen Blick zu erkennen.
>
> Ich habe gerade bei namecheap.com die domain benchmarkheaven.com gekauft. Lass uns die App so rebranden und dort veröffentlichen (hosting immernoch technisch gesehen über unseren Sandy PaaS, aber die Domain soll die App anzeigen). Auch gutes Branding entwickeln für diesen neuen Produktnamen.
>
> Außerdem sollten wir sef-reported benchmark scores ermitteln und auch abspeichern, aber auch als solche markieren. Wir können hierzu die ganzen Modell-Release Twitter posts der jeweiligen Modellhersteller anschauen, und eventuell finden sich die scores auch in den huggingface model pages der den tech reports. subagents unserer daten update agentensysteme (wie oben beschrieben: idealerweise kostenlose modelle) sollen dann diese initial reporteten daten finden und sammeln und ein gauntlet loop kritiker agent soll dann die korrektheit der erfassten zahlen prüfen. und wenn später die offiziell gemessenen daten von einer anderen quelle (z.b. von ArtificialAnalsysis) von diesen self reported scores abweichen, dann sollten wir das irgendwo in der app flaggen: das sind interessante einblicke.
>
> Ich weiß, das ist jetzt eine große, umfangreiche liste von änderungswünschen, aber mir ist wichtig, dass alles davon vollständig und perfekt umgesetzt wird, gib daher den auftrag vollständig an Codex GPT-6 Astra am Standy Hetzner weiter, etwas besser strukturiert, aber auch zusätzlich mit dem original-prompttext von mir hier, und dem auftrag nachzuprüfen, ob alles vollständig ist.
>
> Am Ende will ich ein Update an mein /notify-telegram und auch ein /explainer-video über das Endergebnis.

**Follow-up message from Florian (2026-09-10), binding:**

> eine Anmerkung noch: damit es für mein wichtiges airesearch12 Twitter Konto ein geringeres
> Risiko gibt, dass mich X als bot identifiziert und sperrt, verwende für die Grok und
> Twitter suchen lieber den xplainervideo X account, der ist ebenfalls am Hetzner Sandy am
> Haupt Chrome eingeloggt

→ Use **xplainervideo** for every X/Grok interaction. Do not use airesearch12.

The explainer video at the end is produced by the Claude session on Florian's machine
(the `explainer-video` skill lives there, with ElevenLabs narration). Your part is to make
sure the final report contains everything that video needs: what changed, what it looks
like, and the numbers worth showing.
