# z-ai/glm-5.3-flash on OpenInference drops the middle of long producer packets (2026-11-04)

Run 2026-11-04T05-17-01-174Z-2658864: PR #553 brought the VulcanBench Frontier score batches under the
packet bound (no `Frozen packet exceeds`), the protocol gauntlet for vulcanbench-frontier::4 passed, and
all four score batches (37 rows) were still quarantined: the producer marked 10/10/10/7 rows
`missing_evidence`, saying the native-row sources from SOURCE 7 onward were empty. They are not; the
packet holds every row. All 18 producer calls of the run went to OpenInference (`sort: price`).
The 2026-11-03 replay of the same packet shape went to Morph and accepted 58 of 58 rows twice.

Probe: `openinference-probe.mjs <work> <gauntlet/scores-0> <provider> <tag>` sends the exact producer
request (235,569-byte task, same system text, json_object, low/exclude reasoning, max_tokens 16384) with
`provider.only` and no fallbacks.

| provider | calls | result per call | prompt tokens |
| --- | --- | --- | --- |
| OpenInference | 2 | 5 match, 10 missing_evidence | 69,618 |
| Morph | 2 | 15 match | 69,593 |
| DeepInfra | 1 | 15 match | 69,599 |
| Together | 1 | 15 match | 69,599 |

Total probe cost about USD 0.03.
