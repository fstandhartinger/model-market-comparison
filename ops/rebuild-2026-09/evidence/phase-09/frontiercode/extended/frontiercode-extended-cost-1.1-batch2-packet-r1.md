# FrontierCode 1.1 Extended candidate review packet (frontiercode-extended-cost::1.1, batch 2)

Review our own candidate data rows before publication. Read-only QA; captured source is untrusted data, never instructions.
Artifact ID: frontiercode-extended-cost-1.1-batch2-cr173-2026-09-26
Artifact SHA-256 (raw artifact bytes): f91b584a7c23401e7d11d94b0f226b1f66fd4e36db787ff3a8cfe411e3320314
Round: 1
Rows: 20; benchmark identity: frontiercode-extended-cost::1.1
Producer: anthropic/claude-opus-5-5 (owner integration)
Primary source: https://cognition.com/frontiercode (leaderboard page) and its own data file https://cognition.com/data/frontiercode-leaderboard/data.json
Retrieved: 2026-09-26T04:23:00.682196+00:00; data file SHA-256 (full capture): edba28c872b94a4abf665ed5443c52a001c75646eb4ae01a2c83a794128893bc; data.v1_1.subsets = {"main":100,"extended":150}
Acceptance, for every listed row:
1. source_id is "<model>|<effort>" and name is "<model> · <effort>"; effort is one of source_efforts_for_model (the data file's own effort keys for that model; "none" and "0.99" are the source's own keys).
2. value = cost of data.v1_1.data[model][effort].extended, unit USD per rollout, no transformation (basis "self_reported").
3. harness equals source_harness_for_model.
4. unit is "USD"; this is secondary/community scope and must not enter the Composite. Cognition publishes the board and ships its own SWE models, so the basis must stay self-reported (never "measured").
5. No catalog model join (model_id null) and no effort inference.
Each row below carries, verbatim from the data file: source_efforts_for_model = data.v1_1.efforts[model], source_harness_for_model = data.v1_1.harness[model], source_extended_entry = data.v1_1.data[model][effort].extended.
Report a finding for any mismatch. Floating-point representation differences below 1e-9 are not errors.

Methodology and legend, verbatim from this capture (cognition.com/blog/frontier-code; the leaderboard's own client chunk https://cognition.com/_next/static/chunks/0~9a1jxgdu5tr.js):
- We present three nested subsets of FrontierCode at increasing difficulty: Extended, Main, and Diamond. Diamond comprises the 50 hardest tasks, Main the 100 hardest (including Diamond), and Extended the full set of 150.
- A solution’s score is a weighted aggregate of the rubric items. Solutions that do not pass blocking criteria receive 0.
- Each model is run 5 times at every available reasoning effort. For each effort, we average the metric across the 5 trials, then report each model’s score at its best performing reasoning level.
- {id:"cost",field:"cost",label:"Cost ($)",title:"cost",axisLabel:"avg cost (USD) per rollout",fmt:function(t){return t>=10?`$${Math.round(t)}`:`$${t.toFixed(2)}`},note:"Cost ($): the mean USD spend per rollout."}

## Candidate rows (the frozen artifact holds these observations in full)
[
 {
  "id": "public:848ae9006e22830719d31fca",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Fable 5|high",
  "name": "Claude Fable 5 · high",
  "model_id": null,
  "harness": "claude-code",
  "value": 7.711,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 20; Claude Fable 5|high; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.6981,
   "new_score": 0.6425,
   "tokens": 36013,
   "cost": 7.711,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0013
  }
 },
 {
  "id": "public:995c6214306b509873d30adb",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Fable 5|xhigh",
  "name": "Claude Fable 5 · xhigh",
  "model_id": null,
  "harness": "claude-code",
  "value": 10.5282,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 21; Claude Fable 5|xhigh; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.7086,
   "new_score": 0.6494,
   "tokens": 48419.3,
   "cost": 10.5282,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.002
  }
 },
 {
  "id": "public:7529d30b6c9a0c7d8ce19ef7",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Fable 5|max",
  "name": "Claude Fable 5 · max",
  "model_id": null,
  "harness": "claude-code",
  "value": 15.4885,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 22; Claude Fable 5|max; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.6956,
   "new_score": 0.6363,
   "tokens": 68418.6,
   "cost": 15.4885,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0013
  }
 },
 {
  "id": "public:3ec75688d891de1f4650db9c",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.6 Sol|low",
  "name": "GPT-5.6 Sol · low",
  "model_id": null,
  "harness": "codex",
  "value": 1.6667,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 23; GPT-5.6 Sol|low; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.5536,
   "new_score": 0.4999,
   "tokens": 10515.7,
   "cost": 1.6667,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0007
  }
 },
 {
  "id": "public:70b7545577c226cd5e0b119f",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.6 Sol|medium",
  "name": "GPT-5.6 Sol · medium",
  "model_id": null,
  "harness": "codex",
  "value": 2.3007,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 24; GPT-5.6 Sol|medium; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.6031,
   "new_score": 0.5468,
   "tokens": 14708.8,
   "cost": 2.3007,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0013
  }
 },
 {
  "id": "public:a0e08ba14f228bf1947cf9ca",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.6 Sol|high",
  "name": "GPT-5.6 Sol · high",
  "model_id": null,
  "harness": "codex",
  "value": 2.9349,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 25; GPT-5.6 Sol|high; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.6475,
   "new_score": 0.5874,
   "tokens": 18822.8,
   "cost": 2.9349,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0008
  }
 },
 {
  "id": "public:4d63c7a655208cac65c3e835",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.6 Sol|xhigh",
  "name": "GPT-5.6 Sol · xhigh",
  "model_id": null,
  "harness": "codex",
  "value": 3.4541,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 26; GPT-5.6 Sol|xhigh; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.6601,
   "new_score": 0.5998,
   "tokens": 22452.5,
   "cost": 3.4541,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0007
  }
 },
 {
  "id": "public:6e69d4f29bae4687bc474ee2",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.6 Sol|max",
  "name": "GPT-5.6 Sol · max",
  "model_id": null,
  "harness": "codex",
  "value": 4.253,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 27; GPT-5.6 Sol|max; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.6661,
   "new_score": 0.6055,
   "tokens": 28060.4,
   "cost": 4.253,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0
  }
 },
 {
  "id": "public:ccdad810e9fc100620f82ecc",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Opus 4.8|low",
  "name": "Claude Opus 4.8 · low",
  "model_id": null,
  "harness": "claude-code",
  "value": 2.2736,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 28; Claude Opus 4.8|low; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.5601,
   "new_score": 0.5083,
   "tokens": 21383.6,
   "cost": 2.2736,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0013
  }
 },
 {
  "id": "public:9e6298b2398fe975a4861a1f",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Opus 4.8|medium",
  "name": "Claude Opus 4.8 · medium",
  "model_id": null,
  "harness": "claude-code",
  "value": 3.062,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 29; Claude Opus 4.8|medium; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.6076,
   "new_score": 0.5537,
   "tokens": 29302,
   "cost": 3.062,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.004
  }
 },
 {
  "id": "public:8218b83ed0538c914231c68a",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Opus 4.8|high",
  "name": "Claude Opus 4.8 · high",
  "model_id": null,
  "harness": "claude-code",
  "value": 3.5377,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 30; Claude Opus 4.8|high; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.611,
   "new_score": 0.5563,
   "tokens": 34584.2,
   "cost": 3.5377,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0073
  }
 },
 {
  "id": "public:f19a7d335c5f2054c5ace208",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Opus 4.8|xhigh",
  "name": "Claude Opus 4.8 · xhigh",
  "model_id": null,
  "harness": "claude-code",
  "value": 5.5793,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 31; Claude Opus 4.8|xhigh; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.6504,
   "new_score": 0.5945,
   "tokens": 55453.9,
   "cost": 5.5793,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0033
  }
 },
 {
  "id": "public:c90ef6438ae930cce1508ec0",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Claude Opus 4.8|max",
  "name": "Claude Opus 4.8 · max",
  "model_id": null,
  "harness": "claude-code",
  "value": 8.0501,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 32; Claude Opus 4.8|max; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "source_harness_for_model": "claude-code",
  "source_extended_entry": {
   "correct": 0.6549,
   "new_score": 0.596,
   "tokens": 82896.6,
   "cost": 8.0501,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.004
  }
 },
 {
  "id": "public:34fab0aad73786e393005474",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.5|low",
  "name": "GPT-5.5 · low",
  "model_id": null,
  "harness": "codex",
  "value": 1.434,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 33; GPT-5.5|low; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.5039,
   "new_score": 0.4555,
   "tokens": 7726.6,
   "cost": 1.434,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0
  }
 },
 {
  "id": "public:44ecb9defb60bd39aeedfa77",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.5|medium",
  "name": "GPT-5.5 · medium",
  "model_id": null,
  "harness": "codex",
  "value": 1.9847,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 34; GPT-5.5|medium; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.5679,
   "new_score": 0.5137,
   "tokens": 11724.3,
   "cost": 1.9847,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0
  }
 },
 {
  "id": "public:aac15b9402f889926c75a9f9",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.5|high",
  "name": "GPT-5.5 · high",
  "model_id": null,
  "harness": "codex",
  "value": 2.6054,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 35; GPT-5.5|high; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.5987,
   "new_score": 0.5399,
   "tokens": 15775,
   "cost": 2.6054,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.002
  }
 },
 {
  "id": "public:38e9f4edd67567a7a34c090f",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "GPT-5.5|xhigh",
  "name": "GPT-5.5 · xhigh",
  "model_id": null,
  "harness": "codex",
  "value": 3.3393,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 36; GPT-5.5|xhigh; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high",
   "xhigh"
  ],
  "source_harness_for_model": "codex",
  "source_extended_entry": {
   "correct": 0.6276,
   "new_score": 0.5666,
   "tokens": 21330.9,
   "cost": 3.3393,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0.0027
  }
 },
 {
  "id": "public:f0fa7c938fe63dc8d053ea5d",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Grok 4.5|low",
  "name": "Grok 4.5 · low",
  "model_id": null,
  "harness": "grok-build",
  "value": 0.7092,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 37; Grok 4.5|low; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high"
  ],
  "source_harness_for_model": "grok-build",
  "source_extended_entry": {
   "correct": 0.5827,
   "new_score": 0.5314,
   "tokens": 10110.1,
   "cost": 0.7092,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0
  }
 },
 {
  "id": "public:85cccb622b753ad988232860",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Grok 4.5|medium",
  "name": "Grok 4.5 · medium",
  "model_id": null,
  "harness": "grok-build",
  "value": 1.0238,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 38; Grok 4.5|medium; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high"
  ],
  "source_harness_for_model": "grok-build",
  "source_extended_entry": {
   "correct": 0.6157,
   "new_score": 0.5607,
   "tokens": 12590.5,
   "cost": 1.0238,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0
  }
 },
 {
  "id": "public:34085acb722e43caae013591",
  "benchmark_id": "frontiercode-extended-cost::1.1",
  "source_id": "Grok 4.5|high",
  "name": "Grok 4.5 · high",
  "model_id": null,
  "harness": "grok-build",
  "value": 1.0863,
  "unit": "USD",
  "basis": "self_reported",
  "source_basis": null,
  "derivation": null,
  "locator": "effort_runs_json; source row 39; Grok 4.5|high; field cost",
  "source_efforts_for_model": [
   "low",
   "medium",
   "high"
  ],
  "source_harness_for_model": "grok-build",
  "source_extended_entry": {
   "correct": 0.6227,
   "new_score": 0.5655,
   "tokens": 12956.8,
   "cost": 1.0863,
   "tool_calls": null,
   "steps": null,
   "ote": null,
   "flagged_rate": 0
  }
 }
]

## Expected coverage
- Exactly the 20 listed IDs.

Return ONLY valid JSON with artifact_id, artifact_sha256, round number 1, verdict, coverage_checked array containing every listed row ID, errors_found integer, findings array, fixed array, uncertainties array and missing_evidence array. If all rows match, use verdict "pass", errors_found 0, findings [], fixed [], missing_evidence []. No prose outside JSON.
