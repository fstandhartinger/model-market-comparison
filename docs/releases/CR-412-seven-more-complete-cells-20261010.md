# CR-412 — complete language/category cells for seven more rows; mixed column first (board note v1.7.35)

Rows: René-1 31B FP8, decisio v0.8.0 on gemma-4-12B-it, Hopper 12B trained, decider-12b (v2), decider-12b v1, Bobcat Flash 1.2,
Mica v0.1 4B.

- Same method as CR-411: original pinned model, packages, serving stack and adapter; rented pods with outbound network cut
  before the sealed inputs were uploaded; every item sent once; failures stay recorded and scored.
- Public-item (P300) agreement with the original runs: 100 % for René, Hopper, decider-12b v1/v2 in every pool; decisio 12B
  99.7 % (L1); Bobcat 99.3-99.7 %.
- Mica v0.1 4B is a historical row: it keeps its v1.5 headline. It had no run on the current pools, so it answered S+P (1,500)
  plus the supplements on its original llama.cpp setup; its P300 answers agree 100 % across the four pools. These cells are
  descriptive only.
- Minima per row: languages 65 (23), topics 109 (7), use cases 83 (20). Long-input refusals stay scored as before.
- Layout (Florian, 10 Oct): the mixed-language group is the first column of the Languages table, then English, then the other
  languages by item count. Compact headers and hover tooltips are unchanged.
- Headline scores, Capability, Composite, ranks and prices are unchanged.
