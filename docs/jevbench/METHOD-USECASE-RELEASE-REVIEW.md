# Use-case discrimination review (CR-339)

Before a release, run `node scripts/check-jevbench-usecase-release.mjs --json`
and attach the report to the release PR. Run the same command with `--check`
for a nonzero exit when review is required. Without `--check` it is a report,
not a pass/fail assertion. The command reads only public repository aggregates.

The cohort is the union of actually ranked models on the
current open-weights and API boards, deduplicated by system key. It uses the
current release loader, live A4/A5 overlays, scoped ranking flags. Ranked models outside the Capability cost/latency caps
remain included because they are ranked on the other charts. Unmeasured and catalogue rows,
dated carry, preliminary rows, unranked references, and wrappers do not enter the cohort. No ranking, score, eligibility or pool changes
are made by this check. Update the loader with the route if a future release
changes the live overlay wiring.

Only plotted use-case spokes from `jevbenchCategoryView` are checked. Values
and answered-item counts come directly from the shipped live category view,
including its category supplements and API cells. A missing/non-finite value
or a cell below the radar's answered-item minimum is missing, never zero.
The report includes each spoke's measured/eligible coverage, missing keys,
pool count, per-model value, answered-item count and pool provenance.

With complete nonempty coverage, a spoke requires release review when **every
eligible model is strictly below 10** (equivalently best <10), or **best minus
median is strictly below 5**. Equality at 10 or 5 does not trigger that rule.
The median is the middle sorted value for odd counts and the mean of the two
middle values for even counts. Statistics on incomplete coverage describe
only the measured cells; the whole-cohort threshold flags are withheld, and
incomplete coverage independently requires review. An empty cohort requires
coverage review and has null statistics. These are review prompts, not evidence
that a category or scorer is defective, and not authorization to change a pool.

The published chance-corrected category competence uses final category clipping
**0..100**. Zero can include chance-level or below-chance pre-clipping outcomes;
these public aggregates cannot recover negative cells. Do not invent negatives,
unclip the stored values, or treat a missing cell as clipped zero. Review flags
should lead to a separate audit of labels, gold, scorer and task difficulty,
with any corrective release independently reviewed. Scores and rankings remain
unchanged while this report is produced.

Future pools follow the prospective [acceptance requirements](FUTURE-USECASE-POOL-ACCEPTANCE.md). The live category metric now explicitly explains clipped zeros and the Score midpoint baseline; historical artifacts and all numerical results remain unchanged.

The ordinary full test suite also checks the live threshold flags, so a newly flagged complete spoke fails the release gate for review. Incomplete coverage stays explicitly reported alongside the existing per-row spoke exceptions. Zero count/share and observed best >85 are diagnostics, not additional automatic threshold failures. Neither requested threshold alone detects a median of zero with a strong best model. Noul uses a fixed 50% accuracy baseline rather than the majority class; abstentions count as wrong. A clipped category zero refers to the equal-weight type mean, not to every type individually.
