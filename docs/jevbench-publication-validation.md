# JevBench render validation

Publication readers still validate the exact pinned files, predecessor evidence,
review verdicts, rows and category cells. Direct readers outside a render scope
always read and validate again; release tools and fixture edits keep that behavior.

`withPublicationValidationScope` uses AsyncLocalStorage for one immutable source
snapshot during a render. It remembers successful root/revision checks and only
the latest complete validated release bundle. Nothing is shared between renders,
retained globally, or recorded for a missing, failed or custom-option read. Do not
write publication files inside a render scope; use a new scope after any write.

The live board visits addenda in ascending order. Its next reader can reuse its
immediately preceding validated bundle, then replace that single cached bundle.
The assembly loop retains one current board instead of every intermediate board.

Release history visits readers newest first, one at a time. A successful reader
has actually run its predecessor readers, so later visibility checks can reuse
those successful facts without holding all their bundles. The boolean results
are restored to the existing display order. If a successor fails, only its
successful predecessors can be reused; the failed publication remains hidden.

When adding a release, keep the public optional-reader wrapper and its original
parameter/return JSDoc, with the new exact version. Its private loader must finish
all existing validation before the wrapper records success. Keep the existing
`hasPublished…` catch/log behavior and scoped success check. Do not replace these
with a filename-based ancestry shortcut or a process-wide results cache.
