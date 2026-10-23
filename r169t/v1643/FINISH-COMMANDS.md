# Lead-only gates

This branch is a candidate, with both independent review and publication authority PENDING. No flip/freeze script is supplied or invoked.

The historical Publish answer on card 18406 approved a v1.6.40 preview. Current v1.6.42 baseline still gives 14/40 changing lists, but SubQ is #5 rather than #4 on mixed/release A/C, displacing Nimble-v4-max rather than Drex Max. A refreshed GO is required before merge. The existing answer is evidence, not a PASS for this changed effect.

Review `receipts/APPROVAL-COMPARISON.json`, `preview/APPROVAL-COMPARISON.md`, and `preview/preview-full-ranking.html`. Keep authority pending until the lead obtains the refreshed decision. The validator requires `publication_approval.status === 'PASS'` separately from manifest review PASS; rebuilding proof bytes also requires regenerating the validator hash pins and publication file hash, after an authorized lead update.

`make_passtree_v1643.sh` creates a disposable copy with synthetic authority PASS, synthetic review PASS and rehashed proof bindings. It never edits the real publication or proof. Synthetic receipts do not grant authority. The genuine tree refuses loading.

Rebuild on this branch with `bash r169t/v1643/rebuild_v1643.sh`; run `bash r169t/v1643/run-gates.sh` after the PASS copy exists. The rebuild reads only existing raw measurements and writes only inside this worktree; the batch and PASS directories are ignored. Frozen raw input is symlinked, never copied into Git. The proof uses the current frozen v1.6.42 registry and seal as read-only inputs.

The public release page intentionally describes pending approval in candidate notes. After refreshed GO and independent review, the lead should update that note and corresponding validator test truthfully, regenerate proof/hash pins, and follow the project's normal publication workflow. No paid-publication exception applies to this unpaid API row.
