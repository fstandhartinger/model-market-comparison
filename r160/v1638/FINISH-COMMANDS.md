# v1.6.38 finish commands (run by the lead after the independent delta check passes)

WT=/home/flori/jobs/jevbench-add-requests-20260919/workers/r160-v1638-build2/wt
Approval: Telegram card #18139, "Publish all (recomm.)", telegram-button, 2026-10-22T08:18:57Z, PNG sha256 23cf47ae5dec385f1403bee90909e682faad6fdd8567c225c9d6915b16afb28e (approval-v1638.json, filled by fill_approval_v1638.sh).
Reviewed bytes: `git -C $WT diff ea0f8475 751b206f -- . ':!r160/v1638/receipts' ':!r160/v1638/shots'` = receipts/APPROVAL-DIFF.patch (sha256 f37a2941f9042a0d59f2170a5bef9105d3fa8effbe5bdfb6db0d22b3a27b7731). The rebase onto origin/main 6ccb11fe is a pure replay (receipts/REBASE-RANGE-DIFF.txt: both commits `=`).

1. Independent delta check (lead): review receipts/APPROVAL-DIFF.patch, then write the receipt JSON, e.g. $WT/r160/v1638/receipts/CRITIC-DELTA-RECEIPT.json
   {"engine": "claude", "verdict": "PASS"}
2. Dry run of the flip (writes nothing; must print "approval filled" and predecessor PASS + seal bound):
   WT=$WT python3 -B $WT/r160/v1638/flip_verdict_v1638.py <receipt.json> --dry-run
3. Flip the manifest PENDING -> PASS (rewrites only data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.38-publication.json, review block):
   WT=$WT python3 -B $WT/r160/v1638/flip_verdict_v1638.py <receipt.json>
4. Freeze (seal; refuses unless manifest PASS, approval filled, live pricing a8a05890, v1.6.37 seal bound; writes /home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.6.38/):
   python3 -B $WT/r160/v1638/freeze_v1638.py --wt $WT            # dry run first
   python3 -B $WT/r160/v1638/freeze_v1638.py --wt $WT --write
5. Re-verify and gate after the flip (real tree now PASS, so the loader accepts it):
   node --test $WT/test/jevbench-v1638-release.test.mjs    # needs node_modules (run in a checkout/copy with node_modules)
   python3 -B $WT/r160/v1638/final_sanity_v1638.py origin/main
   git -C $WT add -A && git -C $WT commit -m "JevBench v1.6.38: independent PASS (flip)"   # then push/PR/merge queue per benchmarkheaven-site-merge-queue
Notes: after the flip, `verify_v1638.py` asserts a PENDING review and will fail on the real tree by design; do not rerun it after the flip. Do not rerun rebuild_v1638.sh after the flip (it regenerates the manifest as PENDING).
