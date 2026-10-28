# JevBench v1.7.17 — Jev-Style-2B (unranked)

Base: a65b7568dadc6084a3018dfba12975c6f7ad8e6c, v1.7.16 still PENDING. This pipeline prepares an unpublished candidate only.

The public row key follows the handoff/raw key `chaoliangunsw-jev-style-2b-decision-v4`; the kit's launcher alias is `jevstyle2b` and the served model name is `jev-style-2b-decision-v4`. Display: Jev-Style-2B.

`prepare_v1717.py` captures aggregate outputs of the frozen scorers, B=1000 seed=16 O1S, fixed G_med 2.573387642438244, 10-second share and `--cost-basis`. Raw and private cost-basis files stay in the job/sealed custody locations, never in this repository. The common set is recomputed across all nine draw raws: unchanged at 1,489 items, sha256 `4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537`. Every one of the 308 carried rows and all their cells stay equal. New row: 1,500-item scoring denominator, 1,495 answers plus five pre-registered over-limit refusals counted as misses. Price: frozen Qwen/Qwen3.5-2B reference 0.02/0.10 per million, native input, reported output 0, estimate.

Run `compare_v1717.sh`, `rebuild_v1717.sh`, then `run-gates.sh`. Heavy gates use `suite-slot` + `heavy-run`; the full suite runs once. `heavy_v1717.sh` initializes a real temporary git repository with a tracked HEAD in the remote snapshot because heavy-run excludes .git and an existing full-suite test invokes git status. It does not change the test. The once-only full run exposed an untracked-snapshot stdout overflow; the tracked-HEAD fix was verified red/green against the unchanged checkout test in a minimized offline batch fixture. The original full-run failure is retained, with no full-suite retry. No sealed material is sent remotely.

`prev_v1717.mjs` validates the PENDING predecessor candidate only for candidate tests. Public readers continue to require a real predecessor PASS. `make_passtree_v1717.py` simulates its PASS in a disposable fixture, rebinds the v1.7.17 proof/publication/loader, and optionally simulates v1.7.17 PASS. Its four swap files must be restored byte-equal. The real tree remains PENDING and the public board remains v1.7.15.

After the lead finishes the predecessor review/flip, v1.7.17 must be rebuilt to bind its current predecessor manifest hash, then reviewed before publication. `flip_verdict_v1717.py --dry-run` permits a pinned pending predecessor for planning; a real flip still refuses it. Freeze refuses while the release is PENDING; the freeze helper never writes a seal.
