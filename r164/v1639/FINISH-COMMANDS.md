# v1.6.39 finish commands (run by the lead after the independent delta check passes; NOT run by the finalize worker)

WT=/home/flori/jobs/jevbench-add-requests-20260919/workers/r164-v1639-build/wt   (branch fusion/jevbench-add-requests-20260919-r164-v1639-build, on origin/main cfb2c604)
CRITIC=/home/flori/jobs/jevbench-add-requests-20260919/workers/r164-v1639-critic/RESULT.json   ({"verdict":"PASS","engine":"claude", ...}; reviewed 77eb13c6 = c701ffb3 replayed)
Authority: paid public fast-lane publication exception (a top-5 change publishes automatically); no card, no approval fill, `top_five_preview` null, `button_tap` false.
Reviewed delta: `git -C $WT diff c701ffb3 HEAD -- . ':!r164/v1639/receipts' ':!r164/v1639/shots' ':!r164/v1639/FINISH-COMMANDS.md'` = r164/v1639/receipts/FINALIZE-DIFF.patch
(sha256 1a42da748d607974c81a188aa55acab612a3913134491c347a9f805be8df1557, 260 lines; c701ffb3 is 77eb13c6 replayed onto cfb2c604, receipts/finalize/REBASE-RANGE-DIFF.txt).

1. Delta check (lead): read the patch. It contains: the shred sentence and the HF-token/host-egress wording removed from prepare_v1639.py (and ENTRY input copy), regenerated results/categories/proof/publication/topic supplement/lib pins/preview, the hardened v1638 topic-supplement check (pinned hash of the carried cells) + test, wire script assertion, pass-tree base cfb2c604.
   If the critic should accept its receipt for the delta, write a delta receipt: echo '{"engine":"claude","verdict":"PASS"}' > $WT/r164/v1639/receipts/CRITIC-DELTA-RECEIPT.json   (otherwise use $CRITIC)
2. Flip dry run (writes nothing):
   WT=$WT python3 -B $WT/r164/v1639/flip_verdict_v1639.py $CRITIC --dry-run
3. Flip the manifest PENDING -> PASS (rewrites only data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.39-publication.json, review block):
   WT=$WT python3 -B $WT/r164/v1639/flip_verdict_v1639.py $CRITIC
4. Freeze (needs manifest PASS, v1.6.38 seal bound, live pricing a8a05890; writes /home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.6.39/):
   python3 -B $WT/r164/v1639/freeze_v1639.py --wt $WT           # dry run first
   python3 -B $WT/r164/v1639/freeze_v1639.py --wt $WT --write
5. Post-flip verification (real tree has no node_modules: use a copy with node_modules; verify_v1639.py and rebuild_v1639.sh must NOT be rerun after the flip):
   node --test $WT/test/jevbench-v1639-release.test.mjs   # in a copy with node_modules
   python3 -B $WT/r164/v1639/final_sanity_v1639.py origin/main
   git -C $WT add -A && git -C $WT commit -m "JevBench v1.6.39: independent PASS (flip)"
6. CR id, push, PR (push WITHOUT -u; never write shared git config):
   CR=$(bh-allocate-cr --owner jevbench-add-requests-20260919-v1639 --title "JevBench v1.6.39: H2O-Lightning-31B (paid)")   # note the printed CR id
   git -C $WT fetch origin && git -C $WT rebase origin/main      # only if main moved; then rerun the dry-run gates (a rebase after the flip needs no rebuild if no overlap)
   git -C $WT push origin HEAD:refs/heads/jobs/jevbench-add-requests-20260919-v1639
   bh-pr open --head jobs/jevbench-add-requests-20260919-v1639 --title "<CR id>: JevBench v1.6.39: H2O-Lightning-31B (paid)" --body-file /home/flori/jobs/jevbench-add-requests-20260919/r164/v1639/PR-BODY.md
   bh-pr ready <PR number printed by open>
   (then the benchmarkheaven-site-merge-queue skill: merge-ready label, queue gates, Coolify deploy verification)
