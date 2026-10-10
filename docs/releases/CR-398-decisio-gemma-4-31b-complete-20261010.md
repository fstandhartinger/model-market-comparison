# CR-398: decisio v0.8.0 (gemma-4-31B-it) language and category cells (draft)

Owner job: jevbench-decisio-complete-cells-20261010. Point-release note v1.7.30
(follows v1.7.29 on main).

decisio-gemma-4-31b-v080 now has cells built from the sanitized public aggregate
ops/evidence/decisio-gemma-4-31b-language-category-complete-20261010.json
(SHA cfcbbb70e8815f7d31bd7d8d1a7b070e9d042c852cd7776606378dc5e999d45e), stored
byte-identical as a reproducibility artifact: 23 languages (minimum 65 completed
responses), 7 topics (minimum 109), 20 use cases (minimum 83) and 12 families.
Supplied values are copied exactly, including the small-n calibration family
(n 22) and long_state, whose 23 items are all original operational failures
(competence 0, coverage 0). category_spoke_n is each cell's n.

Basis is the original S+P plus all 1,505 newly completed frozen supplemental
items (354 L1, 33 L2, 1,118 L3; official O1S audit and scoring). Each
supplement pool also carries the same original P300 answers by stable item
identity; they count once in the union (3,005 category observations). The
original S+P measurement has 1,477 native answers and 23 HTTP 500 operational
non-answers (20 S, 3 P); they are retained without imputation and do not count
toward completed coverage. No partial-completeness exception is used.

L3 items were reviewed by an OpenAI model, so this row's cells based on L3
carry that exposure; headline scores do not use L3. The shared L3 exposure note
for OpenAI rows is unchanged; decisio is the original locally served Gemma
offering, not an OpenAI API offering. The row coverage note says this next to
the row in the Languages table and under the compare radars.

The row's "supplements not measured" radar spoke exception is removed (pruned
by scripts/jevbench-radar-spokes.mjs). The radar display regression that used
this row's old gaps now uses its 12B v0.8.0 sibling, which still has them.

Unchanged: headline, rank, Composite, top five, prices, every other row, common
pool descriptors and the L3 exposure notes. Of the 176 listed radar rows, 139
now meet both coverage targets (was 138); 37 retain their gaps (36 spoke
exceptions and one row below 60 in a language). New v1.6.2 targets are
separate. This is not a completion claim for the other open rows.

Status: draft. Review, queue gates and deployment are pending; release is not
authorized by the handoff (release_authorized false). No merge-ready label has
been applied.
