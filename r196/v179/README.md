# JevBench v1.7.9 candidate (not published)

Built on origin/main 2e303d93 (v1.7.8, PR449). Exactly one addition (GLiClass v4 9B), one re-price (Myles-G 12B public launch list price), and two source_url fixes for the Super Decider modes. No method change, measurement call, seal write or publication.

293 predecessor rows are identical except ranks. Myles-G 12B changes only cost, composites/composite CIs, ranks and price text; all other metrics and their CIs stay equal. Both Super Decider rows change only source_url (plus ranks). All 296 carried category cells and the carry/history bytes remain exact. Myles-G 31B stays exact except ranks.

GLiClass comes from reviewed R16B aggregates and its raw hash verified in place. Pricing module pinned to 645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4; base/candidate resolve equivalence is recorded for GLiClass. Myles-G uses source=api and USD 0.0020020/0.0 per million tokens; the old source=pod entry is never resolved under the new module. Existing raw, O1S method, seed 46 and B=1000 are reused. No new measurement.

123/580 watched lists change. Approval is the standing fair top-five shape with workers/r196-v179-fair/RESULT.json PENDING; publication review is PENDING. Helpers refuse the actual candidate until the lead binds fairness and review. Synthetic fixture dry runs grant no authority.

Run `bash r196/v179/rebuild_v179.sh` to deterministically regenerate site artifacts from captured aggregate inputs. `score_myles_v179.sh` and `run_cells_v179.sh` reproduce aggregate scoring/cells using existing raw in place (Sandy only). `compare_v179.sh` recomputes all watched lists in an isolated synthetic PASS tree. `run-gates.sh` runs required verification. The preview is preview/index.html, card preview/card.png. Its footer is parameterized with `preview_v179.py --publication-status pending|published`.
