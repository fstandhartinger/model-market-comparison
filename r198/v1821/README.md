# JevBench v1.8.21 candidate

Six public unranked rows: Strands Decider v2 E2B, E4B, 12B, 26B-A4B, 31B and basal-omni-2.0-mini-preview. All 352 predecessor rows keep their scores, stored category cells, boards and top fives; the only carried-row change is the hash-pinned gemini-decision-1 disclosure/underlying text (TEXT-EXCEPTIONS, board #81132). The review verdict remains PENDING, which hides v1.8.21 from every public reader; inputs/APPROVAL.json holds the release owner's standing row-only GO text that flip_verdict requires. Ranking 26B-A4B or 31B (possible leading-board impact) needs Florian's preview and GO first.

Build: `python3 -B r198/v1821/build_v1821.py` twice; snapshot: `node scripts/build-jevbench-v1821-alldata.mjs`; validate: `node r198/v1821/validate_v1821.mjs`. Supplied job-local frozen score_v15 is hash-bound to predecessor proof; COMPOSITE-MODULE.json records the copy. BUILD-INPUTS.json and PROVENANCE.json pin all aggregates. No sealed raw is read here.

Category usecases/languages are copied literally from regenerated aggregates. Topics remain withheld pending release-owner exception. Display suppression follows v1.8.20 (n >= 30 and completed language coverage >= 30). E2B has no frozen list-price leg. All other rows use min(list, GPU-time), with the GPU-time leg binding. The 12B list leg is the settled Gemma-3-12B reference. HTTP treatment is per row: Strands five refusals counted wrong; basal all 200 with five answers exceeding the 10 s limit counted wrong.

PR #705 (CR-852) adds an archive allowlist; whichever branch merges second must include v1.8.21. The worker does not publish, seal, allocate CR, push or open a PR.
