# JevBench v1.7.18 — aggregate-only PENDING candidate

Adds KnowLine 4B-Gen5.5 and 26B-A4B-Gen2.5 from the retained 23 Oct scoring summaries. Never reads the lost answer files or the sealed tree. No rescoring, publication, push or seal write.

Run `bash r198/v1718/rebuild_v1718.sh` for a deterministic aggregate-only rebuild; `node r198/v1718/validate_v1718.mjs` for candidate validation and negative cases. The captured inputs permit rebuilds without the measurement tree. `prepare_v1718.py` and `derive_v1718.py` are provenance checks on unsealed retained aggregates; they are not part of the standalone rebuild.

The lead corrected the carried-row gate: every carried field and cell is equal except rank/ranks. Independent insertion into all four predecessor orders recomputes and pins the 255 changed rank records by value in proof.exceptions. No other stored rank-derived field differs. The derived live-feed ranks are independently projected in derived_ranks_v1718.mjs and pinned by value in proof.derived_rank_exceptions (211 carried rows; rank, open_board_rank, capability.rank and capability.open_board_rank change; both API ranks remain unchanged). Precedent: r160/v1638/build_publication_v1638.py:109–116 and lib/jevbench-v1638-release.mjs:33,46–52 (strip only rank/ranks, preserve all cells and check rank positions).

Both rows omit subject-topic and use-case cells by the recorded release-owner ruling; family/language cells are exact reconstructions. Only the 26B key has null decisiveness fields, supported=true and the exact unavailable reason. The diagnostic module checks that allowance independently of the new-row pins and is used by the display.

`make_passtree_v1718.py` creates a synthetic PASS copy and rebinds its PENDING predecessor manifests solely for isolated visibility/tests. Its receipt has no release authority. `flip_verdict_v1718.py --dry-run` plans a flip without writing; freeze refuses while PENDING. The heavy harness refuses to run outside the disposable snapshot. The v1.7.17 and v1.7.18 manifests remain PENDING; the final v1.7.16 PASS predecessor is preserved byte-for-byte.

Review preview: preview/index.html and preview/card.png (inspected). See receipts for actual gate results; absent receipts do not imply a pass.

The text export includes ranked-over-cap measurements with an explicit outside-caps label. The existing SEO completeness test caught the initial omission; `repair_llms_v1718.sh` reverifies the affected PENDING/post-flip SEO behavior, production build, and compiled text route on the corrected candidate. The one requested full-suite run is retained; the affected failing SEO test is rerun after the fix. The failed pre-fix run is retained separately in receipts.
