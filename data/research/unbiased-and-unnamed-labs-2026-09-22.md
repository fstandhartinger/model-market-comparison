# Unbiased (provider metadata) and the three models that named no lab — source note (2026-09-22)

Why: the 2026-09-22 daily receipt reported `Neue Anbieter ohne gepruefte Metadaten (nicht in
EU-/Nicht-US-Filtern): Unbiased`. A provider new to OpenRouter publishes with
`metadata_unverified` since 2026-09-17 instead of failing the refresh, which keeps its offers out
of the EU-hosted and non-US filters on an absence rather than on a checked fact. OpenRouter's own
provider table gives `"headquarters": null` for this one, so the country had to come from the
company's pages. Reading them also settled the lab of the model it serves, and of the two other
rows that were published with `org: "Other"`.

## Unbiased / Circuit & Chisel, Inc.

Read 2026-09-22 from the vendor's own pages:

- `https://unbiased.ai/terms/` — legal entity **"Circuit & Chisel, Inc."**; postal address
  **"268 Post Road STE 200 PMB 586312, Fairfield, CT 06824"**; "These Terms will be governed by and
  construed in accordance with the laws of the State of Delaware", disputes in Delaware courts. EU
  and UK representatives are EDPO (Brussels) and EDPO UK (London) — GDPR representation, not an EU
  establishment or an EU serving region.
- `https://unbiased.ai/terms/#privacy-policy` — **"We are headquartered in the United States and may
  use service providers that operate in other countries."**; "your personal information will
  necessarily be accessed and processed in the U.S."; **"Company will not use Customer Content to
  train, fine-tune, or improve any model unless Customer provides explicit written consent."**;
  customer content is not retained "beyond the time reasonably necessary to process Customer's
  request … except as required by law or as necessary for abuse prevention and security monitoring
  for a period not to exceed thirty (30) days". The named subprocessors handling customer content
  are AWS, Anthropic, OpenAI and xAI Corp, all United States.
- `https://unbiased.ai/` — "a remote-first team located across the US and Canada", founded by
  Circuit & Chisel. On the model: "One model string, one bill. Under the hood it runs several
  models on your request and keeps the best answer"; it "runs a mix of frontier and open source
  models against each other on every request … then keeps the best result for less"; the page
  calls it "Not a router" because "Pareto never switches models mid-conversation".

Curated judgment (`data/raw/provider-meta.json`): `country: "US"`, `eu_hosted: false`,
`non_us: false`. No EU serving region is published anywhere, so both filters keep excluding it —
now for a stated reason rather than for missing metadata. OpenRouter's data-policy table agrees on
what it does publish (`does_not_train: true`, `zero_retention: false`), and those two flags are
exactly what the terms say. The note also records that **Pareto is a composite**: the published
price buys the ensemble, not one model, which is the one thing a price comparison must not hide.

Not curated: a headquarters *city* claim beyond the address the terms print, and any EU-hosting
flag on the strength of the EDPO representatives — GDPR representation is not residency.

## The three rows published with `org: "Other"`

CR-25.4 reserves `Other` for a lab whose home country is not documented, and
`lib/regions.mjs` never guesses one. These three were in it because nothing *derived* the maker,
not because the maker is unknown:

| row | lab | source read 2026-09-22 |
|---|---|---|
| `pareto::default` | Unbiased | above; OpenRouter author slug `unbiased/pareto`, no `Vendor: ` prefix in the catalog name |
| `swe-1.7-lightning-max::default` | Cognition AI | `https://cognition.com/blog/swe-1-7`: "Today, we're launching SWE-1.7, the most capable model we've trained so far". The AA Coding Agent Index row is scored under Cognition's own **Devin CLI** harness. `https://cognition.com/privacy` names the entity "Cognition AI, Inc"; `https://cognition.com/terms` is governed by the law of the State of California |
| `muse-spark-1.3-max::default` | Meta | every Muse Spark row in the OpenRouter catalog is named "Meta: Muse Spark …"; AA scores `muse-spark-1.3::max` as Meta. Only Intelligence.ai's product name "Max" keeps the board row in a family of its own |

`lib/regions.mjs` therefore gains `Unbiased: 'US'` and `'Cognition AI': 'US'` — both documented by
the companies' own legal pages, which is the standard the table's comment sets. Meta was already
listed.

Deliberately **not** done: re-attaching `muse-spark-1.3-max::default`'s Intelligence.ai result to
the `muse-spark-1.3` family. The board publishes it at product/family scope under that name, the
existing attachment note says so, and moving an observation between variants creates history
estimates. The label was wrong; the attachment was not.
