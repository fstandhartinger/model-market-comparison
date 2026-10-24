# Intermediate fixes (not hidden)

- First scorer invocation completed successfully (result SHA 54f838bd...), but its subsequent category command failed with `3: command not found`: the worker edited the running shell script's comments while Bash had it open, shifting its read cursor. Corrected by running the post-score stages from a new file; a second complete scorer invocation is recorded separately. No requests or measurements were repeated.
- Initial finalization rejected the v1.6.42 carried-topic binding because the Python-generated canonical JSON hash represented integer-valued floats differently from JavaScript. Recomputed the pin with the reader's exact JavaScript canonicalizer on the clean base snapshot (5c21c371...). No data cells changed.
- Initial prior-row comparison compared the entire `cost` object; corrected to compare all its fields except the intentionally updated public `basis` prose. All computational values remain exact.

- One exploratory read of the pre-existing public identity-check receipt exposed item-level public-test data to tool output. It was stopped and is not retained, copied, committed or quoted in reports. No sealed item text was printed. All new artifacts and retained receipts are aggregate-only.

- Final metadata review removed the stale geography claim from the copied run-168 endpoint prose. It now says evaluator host. No computational field, point estimate, interval, category or ranking changed. The final row validator and hash checks are re-run after regenerating these metadata bindings.
