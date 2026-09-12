Round 2 (critic z-ai/glm-5.3-flash, findings 1) raised one real minor defect, now accepted
and repaired:

- **R2-F6 (minor) — accepted and fixed.** In `lib/benchmark-history.mjs`,
  `crossVersionEstimates` built each estimate with
  `source: targetSource(targetObs.get(key) || [...targetObs.values()][0])`. Because the
  surrounding loop begins `if (targetObs.has(key)) continue;`, `targetObs.get(key)` is
  always `undefined`, so every estimate fell back to the FIRST target observation's
  url/file/locator — another configuration's provenance. It now reads
  `source: targetSource(s)`, i.e. the provenance of the source row the estimate is bridged
  from. A new test, `cross-version estimate cites the source row provenance, not another
  target row`, asserts the estimate for the vanished `h` row cites `locator: "row h"`
  (the source), not `"row b1"` (the first target board row).

Gate after the repair: `node scripts/build-dataset.mjs` exit 0; `npm test` 190 passed /
0 failed (12 new phase-10 tests); `npx tsc --noEmit -p .` exit 0.

Round-3 task: verify R2-F6 is correctly repaired and that no other defect was introduced
by the change. This is the final round for this artifact. Return only the JSON verdict.
