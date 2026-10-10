# CR-411 — complete language/category cells for seven self-hosted rows (board note v1.7.34)

Rows: TypeCastLM 1.4.0, CoCo-Decision-4B, ClassOne Qwen 3.5 9B, EXAONE-4.0-1.2B-JEV v0.3, jul fast, WaterSheep, Tacet Sonata.

- Each row answered the three sealed supplements (L1 354, L2 33, L3 1,118 new items, each also carrying the 300 public
  P items) with the same pinned model, package versions, serving stack and adapter as its published S+P run. GPU rows ran
  on rented pods with outbound network cut before the sealed inputs were uploaded; CPU rows ran in Docker with
  `--network none`. Every item was sent once; failures stay recorded.
- Reproduction check: argmax agreement with the original run on the 300 public items is 100 % for every row and pool,
  except EXAONE L2 (98.3 %) and L3 (99.0 %), where the flips are near-ties.
- Cells: official O1S scorer; the P300 answers come from the original run (stable item identity, counted once).
  Minima per row: languages 65 (all 23), topics 109 (all 7), use cases 83 (all 20). Long-input refusals (HTTP 400/422
  on the same public items as in the original runs) remain scored as before.
- ClassOne Gemma 4 E2B was run too but is not published: its public-item agreement with the original run was 87.7 %
  (below the 95 % bar; the model weights were fetched from an unpinned branch in the original run). It keeps its exception.
- Headline scores, Capability, Composite, ranks and prices are unchanged. Evidence: `ops/evidence/<row>-language-category-complete-20261010.json`.
