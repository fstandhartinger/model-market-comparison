# CR-410: Messier One v0.2 language and category cells (draft)

Owner job: jevbench-languages-full-20261007 (worker slice messier-release). Point-release
note v1.7.33 (v1.7.32 is already named in the CR-401 follow-up docs).

`messier-one-v0.2` now has cells built from the sanitized public aggregate
`ops/evidence/messier-one-v0.2-language-category-complete-20261010.json`
(SHA-256 e03206ca5efcd1133eb94b7fe82b6a78bdcee4769354473263af0127c128676e), stored
byte-identical as a reproducibility artifact: 23 languages (minimum 65 completed
responses), 7 topics (minimum 109), 20 use cases (minimum 83) and 12 families.
Supplied values are copied exactly, including the small-n calibration family (n 22).
`category_spoke_n` is each cell's n.

Basis is the original S+P (1,500 native answers, no HTTP errors) plus all 1,505 newly
completed frozen supplemental items (354 L1, 33 L2, 1,118 L3; official O1S audit and
scoring), all HTTP 200, answered natively on the original Messier image with the network
disabled. Each supplement pool also carries the same original P300 answers by stable item
identity; they count once in the union (3,005 category observations). No partial-completeness
exception is used.

L3 items were reviewed by an OpenAI model, so cells based on L3 carry that exposure;
headline scores do not use L3. The row coverage note says this next to the row in the
Languages table and under the compare radars. Messier is self-hosted, not an OpenAI API
offering; the shared L3 exposure notes are unchanged.

The row's "supplements not measured" radar spoke exception is removed (pruned by
`scripts/jevbench-radar-spokes.mjs --prune`). Of the 177 listed radar rows, 142 now meet
all 27 spokes (35 explicit exceptions remain). No cost or price is attached to these
supplements.

Unchanged: headline, rank, Composite, top five, prices, every other row, common pool
descriptors and the L3 exposure notes.

Status: draft. Review, queue gates and deployment are pending; no merge-ready label applied.
