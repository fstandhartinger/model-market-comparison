# Future use-case pools: acceptance requirements (8 October 2026)

Applies prospectively to L4/C2 and the reserve generator, never to a frozen release or headline ranking. No existing sealed prompt, answer or item-derived text may be used for authoring or tuning. Use only aggregate failure patterns, explicit scenarios and new disjoint public pilot tasks; hold future evaluation items out of pilot selection.

- Target at least 60 distinct items per use case, at least 20 each choice/noul/score when all three are supported. The existing 30-item spoke floor remains a coverage minimum, not a precision guarantee. Report within-type n and supports, not just total n.
- Cover easy, standard, hard and judge tasks without concentrating all thin categories in hard/judge. Specify required facts, units, scope, tie-breaking and allowed outputs.
- Binary gold is yes/no; balance both (40–60% each as a review target). Do not add an 'unsure' gold label to this schema. Distractor options must be plausible and uniquely distinguishable.
- Score rubrics must state anchors and decision boundaries; review a midpoint chance-error baseline below 0.15 and excessive middle gold concentration. Keep continuous Score error and accuracy separate. Never raise a cell by changing the scorer retrospectively.
- On the disjoint pilot, select a frozen multi-family strong cohort and weaker cohort before collecting results. Target strong category competence around 40–85 with weaker systems lower. Record ceiling effects (>85), floor effects (<10), confidence intervals and type-level values. No guaranteed score, cherry-picking from scored held-out items or benchmark coaching.
- Verify semantic labels using an independent model family on owned infrastructure, blind to the first labeller and to scores. Authoring-label precedence prevents Winnow overrides but does not establish semantic correctness. Double-review every dispute; correct before freeze or retire the prospective item; log date, reason and pool epoch.
- Quarantine suspected-gold candidates. A unanimous wrong response is a trigger for a blind second-family review, not proof that the gold should be flipped. If unresolved, exclude from a future draw; keep historical results and release notes dated.
- Release review flags: all ranked models <10, or best-minus-median <5 points. Missing cells never count as zero. Also inspect unsupported types, different row pools, low per-type n, clipped negative medians and top-model ceiling effects even when the two requested flags do not trigger.

Owner coordination: board #11, entries #11920/#11946 and following; reserve and language owners keep their own frozen pools and workflows. Acknowledgement/disposition is recorded in RESULT.md.
