# Bounded OpenRouter endpoint withdrawal review

Review our own daily-refresh source-change decision before publication. This is a
read-only review. The source is the public OpenRouter endpoint API; do not infer or
invent provider policy, pricing, or model scores.

## Primary source receipt

- URL: https://openrouter.ai/api/v1/models/z-ai/glm-5.3-flash/endpoints
- Fresh HTTP response: 200
- Retrieved: 2026-09-14T00:52:14.538Z
- Complete response body SHA-256: f89f1672fc33c4429cac609cc51896249daf92629a76ca1ee3779c244bf4a323
- Current endpoint rows: 26; unique identities: 26
- Current complete identity-set SHA-256: f6f12ed21d421e8ef6f255fa5942cafc88db48ebf21158ae12b9016eca45ac12

## Prior accepted snapshot

- Snapshot date: 2026-09-13
- Prior endpoint rows: 27; unique identities: 27
- Prior complete identity-set SHA-256: 6463dcad83f7f331e1697012193efb9a57800eb19fba30d188b9618af7598c98

## Exact identity delta (computed from the complete sets)

- Removed: `OpenInference/open-inference/fp4/fp4`
- Added: none

The collector's rule is: an endpoint identity reduction may be accepted only by a
fresh, expiring approval that binds both complete identity-set hashes and exactly
lists every removed identity. Any other shrink, malformed response, bad status, or
invalid token price must remain fatal. The current response is not yet approved.

## Required JSON response

Return exactly one JSON object with:

```json
{
  "artifact_id": "openrouter-z-ai-glm-5.3-flash-withdrawal-2026-09-14",
  "artifact_sha256": "f6f12ed21d421e8ef6f255fa5942cafc88db48ebf21158ae12b9016eca45ac12",
  "round": 1,
  "verdict": "pass|revise|blocked",
  "coverage_checked": [],
  "errors_found": 0,
  "findings": [],
  "fixed": [],
  "uncertainties": [],
  "missing_evidence": []
}
```

Pass only if the evidence supports a narrowly scoped, expiring approval for this
one exact withdrawal and does not claim permanent retirement. Flag missing evidence
or any unsupported assumption as a finding. Do not modify files.
