# v1.7.15 scoring — microsoft-decision-1-r2 on v1.6-regular-20261027 (1,493 items)

The scorer outputs live in the job directory `r197/v1715/score/field` (REGISTRY.json, out-frozen, out-v17-off, out-v17-share,
cells/{off,share}); they were produced for the parked equated candidate and are reused byte-for-byte here (all pinned by sha256 in
`receipts/INPUTS.json`; scoring never depends on equating: `v16.equating_offset` is null). Harness score_v16 02132271 / score_v17
6363458d, B 1000, seed 16, O1S, share rule (10 s; 0 decisions over 10 s), fixed reference G_med 2.573387642438244, private 1,493-item
gold view `120d0ba7…` (the 7 items the provider had seen earlier excluded). `cells_v1715.sh` documents the cell/decisive run
(no topics: the draw has no topic labels). Cost: tariff 0.042/M input, output free, on 467,021 input / 1,489 output tokens over 1,493.
