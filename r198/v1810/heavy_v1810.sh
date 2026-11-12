#!/bin/bash
# Gate sequence used for v1.8.10 (every heavy step ran through ~/bin/suite-slot; the Next build and the full suite as systemd-run user units).
set -euo pipefail
W=$PWD;J=r198/v1810;R=$J/receipts
bash $J/rebuild_v1810.sh                                   # build + wire
node $J/validate_v1810.mjs > $R/validator.log
npx --no-install tsc --noEmit > $R/tsc.log
python3 -B $J/make_passtree_v1810.py                       # synthetic PASS + synthetic FAIR fixture (.pass)
node $J/topfive_v1810.mjs "$W" > $R/topfive-before.json    # real tree: v1.8.9 PASS, v1.8.10 PENDING (hidden)
node $J/topfive_v1810.mjs "$W/$J/.pass" > $R/topfive-after.json
node $J/extended_preview_v1810.mjs "$W"; node $J/slider_preview_v1810.mjs; node $J/custom_preview_v1810.mjs
python3 -B $J/compare_v1810.py; python3 -B $J/changed_lists_v1810.py
python3 -B $J/check_repro_v1810.py > $R/rebuild-determinism.log          # two deterministic rebuilds
python3 -B $J/check_source_v1810.py > $R/source.log; python3 -B $J/check_equating_v1810.py > $R/equating.log
python3 -B $J/check_visibility_v1810.py > $R/visibility.log; python3 -B $J/check_public_text_v1810.py > $R/public-text.log
python3 -B $J/check_helpers_v1810.py > $R/helpers.log
node $J/whatif_v1810.mjs "$W" /home/flori/jobs/jevbench-add-requests-20260919/r276/v1810/WHATIF.json; cp /home/flori/jobs/jevbench-add-requests-20260919/r276/v1810/WHATIF.json $R/WHATIF.json
python3 -B $J/preview_v1810.py
python3 -B $J/make_passtree_v1810.py; node $J/ranks_fixture_v1810.mjs "$W/$J/.pass" "$W/test/fixtures/jevbench-v1810-ranks.json"; python3 -B $J/make_passtree_v1810.py
TESTS=(test/jevbench-v1810-public-scope.test.mjs test/jevbench-v1810-release.test.mjs test/jevbench-v189-artifact-scan.test.mjs test/jevbench-v189-public-scope.test.mjs test/jevbench-v189-release.test.mjs test/jevbench-v188-release.test.mjs test/jevbench-v187-release.test.mjs test/jevbench-v186-release.test.mjs test/jevbench-v185-release.test.mjs test/jevbench-v184-release.test.mjs test/jevbench-v183-release.test.mjs test/jevbench-v182-release.test.mjs test/jevbench-v181-release.test.mjs test/jevbench-v180-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/cr-254-base-model-display.test.mjs test/jevbench-architecture-data.test.mjs test/jevbench-alldata-fetch.test.mjs test/sitemap-releases-redirects.test.mjs test/release-page-seo.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-tariff-label.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1719-release.test.mjs test/jevbench-v1720-release.test.mjs test/jevbench-v1721-release.test.mjs test/jevbench-v1722-release.test.mjs test/helpers/release-history.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/daily-clean-checkout-wait.test.mjs test/jevbench-multimodal-preview.test.mjs test/support-link.test.mjs)
node --test --test-concurrency=4 "${TESTS[@]}" > $R/release-tests.log 2>&1                       # PENDING tree
( cd $J/.pass && node --test --test-concurrency=4 "${TESTS[@]}" > $W/$R/postflip-tests.log 2>&1 ) # post-flip simulation
( cd $J/.pass && python3 -B r198/v1810/check_build_disk.py && bash r198/v1810/build_public_v1810.sh $PWD/$R/build-postflip.log && node $W/$J/check_built_v1810.mjs )   # production next build + built-route check
( cd $J/.pass && node --test --test-concurrency=4 test/ > $W/$R/fulltest-postflip.log 2>&1 )      # full suite once
rm -rf $J/.pass .next tsconfig.tsbuildinfo
