# v1.6.42 finish commands (run by the lead after the independent critic passes; NOT run by the build worker)

WT=/home/flori/jobs/fastlane-torchcast4b-v13-native-20261023/workers/v1642-build/wt   (branch fusion/fastlane-torchcast4b-v13-native-20261023-v1642-build, on origin/main 054204ae; ONE local commit)
CRITIC=/home/flori/jobs/fastlane-torchcast4b-v13-native-20261023/workers/v1642-critic/RESULT.json   ({"verdict":"PASS","engine":"claude", ...}; placeholder until the critic has run)
Authority: paid public fast-lane publication exception (a top-five change by a paid public order publishes automatically; skill `jevbench-fast-lane`); no card, no approval fill, `top_five_preview` null, `button_tap` false.
Version: v1.6.42. v1.6.41 stays RESERVED for SubQ Snap 1.1. If origin/main already has a v1.6.41 (or any other release) when you start: stop and restack (a rebuild, not a plain rebase: predecessor, supplement binding, release lists and ranks change).

0. Before anything: `git -C $WT fetch origin && git -C $WT log --oneline HEAD..origin/main` must be empty (or only unrelated commits that do not touch jevbench release files; then rebase and rerun the dry-run gates).
1. Delta check (lead): if the critic asks for should-fixes, rebuild with `bash $WT/r169t/v1642/rebuild_v1642.sh`, rerun `bash $WT/r169t/v1642/run-gates.sh`, and have the critic review the delta. Optional delta receipt instead of $CRITIC:
   echo '{"engine":"claude","verdict":"PASS"}' > $WT/r169t/v1642/receipts/CRITIC-DELTA-RECEIPT.json
2. Flip dry run (writes nothing):
   WT=$WT python3 -B $WT/r169t/v1642/flip_verdict_v1642.py $CRITIC --dry-run
3. Flip PENDING -> PASS (rewrites only data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.42-publication.json, review block):
   WT=$WT python3 -B $WT/r169t/v1642/flip_verdict_v1642.py $CRITIC
4. Freeze (needs manifest PASS, v1.6.40 seal bound, live pricing aa2afcd5; writes /home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.6.42/):
   python3 -B $WT/r169t/v1642/freeze_v1642.py --wt $WT           # dry run first
   python3 -B $WT/r169t/v1642/freeze_v1642.py --wt $WT --write
5. Post-flip verification (real tree has no node_modules: use a copy with node_modules; do NOT rerun verify_v1642.py or rebuild_v1642.sh after the flip):
   node --test $WT/test/jevbench-v1642-release.test.mjs   # in a copy with node_modules
   python3 -B $WT/r169t/v1642/final_sanity_v1642.py origin/main
   git -C $WT add -A && git -C $WT commit -m "JevBench v1.6.42: independent PASS (flip)"
6. CR id, push, PR (push WITHOUT -u; never write shared git config):
   CR=$(bh-allocate-cr --owner fastlane-torchcast4b-v13-native-20261023 --title "JevBench v1.6.42: Torchcast Decision 4B v1.3 (paid)")   # note the printed CR id
   git -C $WT fetch origin && git -C $WT rebase origin/main      # only if main moved; then rerun the dry-run gates (run-authority-gates.sh)
   git -C $WT push origin HEAD:refs/heads/jobs/fastlane-torchcast4b-v13-native-20261023-v1642
   bh-pr open --head jobs/fastlane-torchcast4b-v13-native-20261023-v1642 --title "<CR id>: JevBench v1.6.42: Torchcast Decision 4B v1.3 (paid)" --body-file /home/flori/jobs/fastlane-torchcast4b-v13-native-20261023/v1642/PR-BODY.md
   bh-pr ready <PR number printed by open>
   (then the benchmarkheaven-site-merge-queue skill: merge-ready label, queue gates, Coolify deploy verification; the queue's 900 s `npm test` is tight on a loaded box)
7. After it is live on both hosts: post the version and composite A (76.19; release rank A 3, open-weights board A #1) on board topic #11 for the release owner; then `scripts/deliver.py` for order 9494e9ea (see STATE.md RESUME HERE). The v1.7.0 builder takes the row from `r169t/v1642/v17-input/` (copy in /home/flori/jobs/fastlane-torchcast4b-v13-native-20261023/v1642/v17-input/).
