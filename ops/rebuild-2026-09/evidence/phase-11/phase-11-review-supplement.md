# Supplementary frozen evidence — Benchmark Heaven phase 11 (round 2)

Artifact: phase-11-realswe-ingestion; round: 2; producers: openrouter/deepseek/deepseek-v4.1-flash (deepseek).
artifact_sha256 (canonical bundle: parser + realswe scores rows + realswe registry entries + realswe observations + realswe details): `0b2deb5e82c6cd20fbb861a921f4c1849a1f2552e071bc0c5ca80337232eef3d`
- parser lib/realswe.mjs sha256: `6f7f553ebee55ecd9f4980e3c217b085e59c2bcb2ac25ad2d7995425e44821b7`
- data/raw/benchmarks/scores.json sha256: `6212b1986d55209dc52969a2f9a96c309d60000087096a20f20e98c5beba3d01`
- new history state 20260912-35c64794 content_sha256: `35c647944c4a100a84cd5f2e68fa21b481275a6786599af45350d914b5b4f631` count=13924; prior state 20260912-b2963bd0 content_sha256: `b2963bd0a3cc1d4865d0b1c0dfa9ad0d9e604e66a4bbddca813376638e81e831` count=13908

## 1. Raw page output-token titles (fills the round-1 qa-r11-02 gap)
Direct extraction from the captured page HTML; three columns: `k`, `task`, `configuration`. Compare against our `details.("realswe::snapshot-2026-09-12").output_tokens_k`.
```text
34k	Entitlement overage lines	Fable 5.1
30k	Multi-region sweep	Fable 5.1
78k	Tax jurisdiction	Fable 5.1
95k	API token metering	Fable 5.1
71k	API keys &amp; environments	Fable 5.1
62k	S3 datastore measurement	Fable 5.1
67k	Customer identity migration	Fable 5.1
26k	Billing schedule migration	Fable 5.1
86k	Linearizable scan	Fable 5.1
88k	Analytics stream reducer	Fable 5.1
13k	Entitlement overage lines	GPT-6 Astra
13k	Multi-region sweep	GPT-6 Astra
24k	Tax jurisdiction	GPT-6 Astra
31k	API token metering	GPT-6 Astra
32k	API keys &amp; environments	GPT-6 Astra
22k	S3 datastore measurement	GPT-6 Astra
25k	Customer identity migration	GPT-6 Astra
15k	Billing schedule migration	GPT-6 Astra
33k	Linearizable scan	GPT-6 Astra
29k	Analytics stream reducer	GPT-6 Astra
78k	Entitlement overage lines	Gemini 3.8 Flash
67k	Multi-region sweep	Gemini 3.8 Flash
95k	Tax jurisdiction	Gemini 3.8 Flash
134k	API token metering	Gemini 3.8 Flash
102k	API keys &amp; environments	Gemini 3.8 Flash
106k	S3 datastore measurement	Gemini 3.8 Flash
97k	Customer identity migration	Gemini 3.8 Flash
70k	Billing schedule migration	Gemini 3.8 Flash
106k	Linearizable scan	Gemini 3.8 Flash
88k	Analytics stream reducer	Gemini 3.8 Flash
68k	Entitlement overage lines	GLM 5.3
53k	Multi-region sweep	GLM 5.3
141k	Tax jurisdiction	GLM 5.3
177k	API token metering	GLM 5.3
125k	API keys &amp; environments	GLM 5.3
121k	S3 datastore measurement	GLM 5.3
90k	Customer identity migration	GLM 5.3
58k	Billing schedule migration	GLM 5.3
172k	Linearizable scan	GLM 5.3
169k	Analytics stream reducer	GLM 5.3
7k	Entitlement overage lines	Grok 4.6
3k	Multi-region sweep	Grok 4.6
12k	Tax jurisdiction	Grok 4.6
15k	API token metering	Grok 4.6
16k	API keys &amp; environments	Grok 4.6
13k	S3 datastore measurement	Grok 4.6
20k	Customer identity migration	Grok 4.6
6k	Billing schedule migration	Grok 4.6
261k	Linearizable scan	Grok 4.6
315k	Analytics stream reducer	Grok 4.6
36k	Entitlement overage lines	Muse Spark 1.3
43k	Multi-region sweep	Muse Spark 1.3
67k	Tax jurisdiction	Muse Spark 1.3
152k	API token metering	Muse Spark 1.3
104k	API keys &amp; environments	Muse Spark 1.3
71k	S3 datastore measurement	Muse Spark 1.3
76k	Customer identity migration	Muse Spark 1.3
38k	Billing schedule migration	Muse Spark 1.3
141k	Linearizable scan	Muse Spark 1.3
137k	Analytics stream reducer	Muse Spark 1.3
30k	Entitlement overage lines	Kimi K3
9k	Multi-region sweep	Kimi K3
39k	Tax jurisdiction	Kimi K3
69k	API token metering	Kimi K3
44k	API keys &amp; environments	Kimi K3
32k	S3 datastore measurement	Kimi K3
66k	Customer identity migration	Kimi K3
19k	Billing schedule migration	Kimi K3
71k	Linearizable scan	Kimi K3
55k	Analytics stream reducer	Kimi K3
12k	Entitlement overage lines	GPT-5.6 Sol
8k	Multi-region sweep	GPT-5.6 Sol
22k	Tax jurisdiction	GPT-5.6 Sol
31k	API token metering	GPT-5.6 Sol
25k	API keys &amp; environments	GPT-5.6 Sol
25k	S3 datastore measurement	GPT-5.6 Sol
24k	Customer identity migration	GPT-5.6 Sol
13k	Billing schedule migration	GPT-5.6 Sol
37k	Linearizable scan	GPT-5.6 Sol
30k	Analytics stream reducer	GPT-5.6 Sol
```

Our produced `output_tokens_k` (from data/dataset.json details):
```json
{
 "Entitlement overage lines": {
  "Fable 5.1": 34,
  "GPT-6 Astra": 13,
  "Gemini 3.8 Flash": 78,
  "GLM 5.3": 68,
  "Grok 4.6": 7,
  "Muse Spark 1.3": 36,
  "Kimi K3": 30,
  "GPT-5.6 Sol": 12
 },
 "Multi-region sweep": {
  "Fable 5.1": 30,
  "GPT-6 Astra": 13,
  "Gemini 3.8 Flash": 67,
  "GLM 5.3": 53,
  "Grok 4.6": 3,
  "Muse Spark 1.3": 43,
  "Kimi K3": 9,
  "GPT-5.6 Sol": 8
 },
 "Tax jurisdiction": {
  "Fable 5.1": 78,
  "GPT-6 Astra": 24,
  "Gemini 3.8 Flash": 95,
  "GLM 5.3": 141,
  "Grok 4.6": 12,
  "Muse Spark 1.3": 67,
  "Kimi K3": 39,
  "GPT-5.6 Sol": 22
 },
 "API token metering": {
  "Fable 5.1": 95,
  "GPT-6 Astra": 31,
  "Gemini 3.8 Flash": 134,
  "GLM 5.3": 177,
  "Grok 4.6": 15,
  "Muse Spark 1.3": 152,
  "Kimi K3": 69,
  "GPT-5.6 Sol": 31
 },
 "API keys & environments": {
  "Fable 5.1": 71,
  "GPT-6 Astra": 32,
  "Gemini 3.8 Flash": 102,
  "GLM 5.3": 125,
  "Grok 4.6": 16,
  "Muse Spark 1.3": 104,
  "Kimi K3": 44,
  "GPT-5.6 Sol": 25
 },
 "S3 datastore measurement": {
  "Fable 5.1": 62,
  "GPT-6 Astra": 22,
  "Gemini 3.8 Flash": 106,
  "GLM 5.3": 121,
  "Grok 4.6": 13,
  "Muse Spark 1.3": 71,
  "Kimi K3": 32,
  "GPT-5.6 Sol": 25
 },
 "Customer identity migration": {
  "Fable 5.1": 67,
  "GPT-6 Astra": 25,
  "Gemini 3.8 Flash": 97,
  "GLM 5.3": 90,
  "Grok 4.6": 20,
  "Muse Spark 1.3": 76,
  "Kimi K3": 66,
  "GPT-5.6 Sol": 24
 },
 "Billing schedule migration": {
  "Fable 5.1": 26,
  "GPT-6 Astra": 15,
  "Gemini 3.8 Flash": 70,
  "GLM 5.3": 58,
  "Grok 4.6": 6,
  "Muse Spark 1.3": 38,
  "Kimi K3": 19,
  "GPT-5.6 Sol": 13
 },
 "Linearizable scan": {
  "Fable 5.1": 86,
  "GPT-6 Astra": 33,
  "Gemini 3.8 Flash": 106,
  "GLM 5.3": 172,
  "Grok 4.6": 261,
  "Muse Spark 1.3": 141,
  "Kimi K3": 71,
  "GPT-5.6 Sol": 37
 },
 "Analytics stream reducer": {
  "Fable 5.1": 88,
  "GPT-6 Astra": 29,
  "Gemini 3.8 Flash": 88,
  "GLM 5.3": 169,
  "Grok 4.6": 315,
  "Muse Spark 1.3": 137,
  "Kimi K3": 55,
  "GPT-5.6 Sol": 30
 }
}
```

## 2. Phase-10 Zusatzauftrag — machine-readable not_comparable cause (fills a round-1 missing-evidence item)
historical.counts: {"estimated":85,"not_comparable":482,"recompute_required":0}; estimates length 567; not_comparable rows 482; estimated rows 85.
Cause distribution over ALL not_comparable rows:
```json
{
 "spread_too_wide": 482
}
```
Two representative not_comparable rows (cause + cause_value + spread):
```json
[
 {
  "id": "hist:aa-terminal-bench::2.1->aa-terminal-bench::4.0:a.x-k2::default||",
  "benchmark_id": "aa-terminal-bench::4.0",
  "model_id": "a.x-k2::default",
  "unit": "fraction",
  "value": null,
  "status": "not_comparable",
  "comparison": {
   "bridge_count": 91,
   "spread": {
    "min": 0.007840028188865398,
    "q1": 0.0277587790126975,
    "q3": 0.31844015603606435,
    "max": 0.6685765215176982,
    "iqr": 0.2906813770233668,
    "iqr_relative": 2.237733361483256
   },
   "comparable": false,
   "reason": "bridge IQR is 223.8% of the median (limit 25%)",
   "cause": "spread_too_wide",
   "cause_value": 2.237733361483256
  }
 },
 {
  "id": "hist:aa-terminal-bench::2.1->aa-terminal-bench::4.0:agnes-2.5-pro-beta::default||",
  "benchmark_id": "aa-terminal-bench::4.0",
  "model_id": "agnes-2.5-pro-beta::default",
  "unit": "fraction",
  "value": null,
  "status": "not_comparable",
  "comparison": {
   "bridge_count": 91,
   "spread": {
    "min": 0.007840028188865398,
    "q1": 0.0277587790126975,
    "q3": 0.31844015603606435,
    "max": 0.6685765215176982,
    "iqr": 0.2906813770233668,
    "iqr_relative": 2.237733361483256
   },
   "comparable": false,
   "reason": "bridge IQR is 223.8% of the median (limit 25%)",
   "cause": "spread_too_wide",
   "cause_value": 2.237733361483256
  }
 }
]
```
Two representative estimated rows (bridge_count + spread + uncertainty):
```json
[
 {
  "id": "hist-state:20260912-b2963bd0:aa-automationbench::1.0.6:source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "status": "estimated",
  "value": 0.6889097769674057,
  "uncertainty": {
   "lower": 0.6889097769674057,
   "upper": 0.6889097769674057,
   "min": 0.6889097769674057,
   "max": 0.6889097769674057,
   "iqr": 0,
   "iqr_relative": 0
  },
  "comparison": {
   "bridge_count": 153,
   "spread": {
    "min": 1,
    "q1": 1,
    "q3": 1,
    "max": 1,
    "iqr": 0,
    "iqr_relative": 0
   },
   "comparable": true,
   "cause": null,
   "cause_value": null
  }
 },
 {
  "id": "hist-state:20260912-b2963bd0:aa-automationbench::1.0.6:source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "status": "estimated",
  "value": 0.1568437535870999,
  "uncertainty": {
   "lower": 0.1568437535870999,
   "upper": 0.1568437535870999,
   "min": 0.1568437535870999,
   "max": 0.1568437535870999,
   "iqr": 0,
   "iqr_relative": 0
  },
  "comparison": {
   "bridge_count": 153,
   "spread": {
    "min": 1,
    "q1": 1,
    "q3": 1,
    "max": 1,
    "iqr": 0,
    "iqr_relative": 0
   },
   "comparable": true,
   "cause": null,
   "cause_value": null
  }
 }
]
```

## 3. Value-level history diff (fills a round-1 missing-evidence item)
New state rows 13924, prior 13908; added keys 41; removed keys 25; changed value/unit/basis among keys present in both: 0.
Added keys (all realswe? false):
```json
[
 "aa-automationbench::1.0.6|deepseek-v4.1-flash::max||||",
 "aa-automationbench::1.0.6|ling-3.0-flash-vl::default||||",
 "aa-briefcase::snapshot-2026-09-10|deepseek-v4.1-flash::max||||",
 "aa-briefcase::snapshot-2026-09-10|ling-3.0-flash-vl::default||||",
 "aa-critpt::snapshot-2026-09-10|deepseek-v4.1-flash::max||||",
 "aa-critpt::snapshot-2026-09-10|ling-3.0-flash-vl::default||||",
 "aa-gdp-pdf::snapshot-2026-09-10|deepseek-v4.1-flash::max||||",
 "aa-gdp-pdf::snapshot-2026-09-10|ling-3.0-flash-vl::default||||",
 "aa-gdpval::2|deepseek-v4.1-flash::max||||",
 "aa-gdpval::2|ling-3.0-flash-vl::default||||",
 "aa-gpqa-diamond::snapshot-2026-09-10|ling-3.0-flash-vl::default||||",
 "aa-hle::snapshot-2026-09-10|deepseek-v4.1-flash::max||||",
 "aa-hle::snapshot-2026-09-10|ling-3.0-flash-vl::default||||",
 "aa-lcr::1.1|deepseek-v4.1-flash::max||||",
 "aa-lcr::1.1|ling-3.0-flash-vl::default||||",
 "aa-mmmu-pro::snapshot-2026-09-10|deepseek-v4.1-flash::max||||",
 "aa-mmmu-pro::snapshot-2026-09-10|ling-3.0-flash-vl::default||||",
 "aa-omniscience::snapshot-2026-09-10|deepseek-v4.1-flash::max||||",
 "aa-omniscience::snapshot-2026-09-10|ling-3.0-flash-vl::default||||",
 "aa-scicode::1.0.1|deepseek-v4.1-flash::max||||",
 "aa-scicode::1.0.1|ling-3.0-flash-vl::default||||",
 "aa-tau3-banking::1.0.1|ling-3.0-flash-vl::default||||",
 "aa-terminal-bench::2.1|ling-3.0-flash-vl::default||||",
 "aa-terminal-bench::4.0|deepseek-v4.1-flash::max||||",
 "aa-terminal-bench::4.0|ling-3.0-flash-vl::default||||",
 "realswe-cost::snapshot-2026-09-12|source:realswe:astra|Codex CLI||Codex CLI|",
 "realswe-cost::snapshot-2026-09-12|source:realswe:fable|Claude Code||Claude Code|",
 "realswe-cost::snapshot-2026-09-12|source:realswe:gemini|Gemini CLI||Gemini CLI|",
 "realswe-cost::snapshot-2026-09-12|source:realswe:glm|Claude Code||Claude Code|",
 "realswe-cost::snapshot-2026-09-12|source:realswe:gpt|Codex CLI||Codex CLI|",
 "realswe-cost::snapshot-2026-09-12|source:realswe:grok|Grok Build||Grok Build|",
 "realswe-cost::snapshot-2026-09-12|source:realswe:kimi|Kimi Code||Kimi Code|",
 "realswe-cost::snapshot-2026-09-12|source:realswe:meta|Muse Code||Muse Code|",
 "realswe::snapshot-2026-09-12|source:realswe:astra|Codex CLI||Codex CLI|",
 "realswe::snapshot-2026-09-12|source:realswe:fable|Claude Code||Claude Code|",
 "realswe::snapshot-2026-09-12|source:realswe:gemini|Gemini CLI||Gemini CLI|",
 "realswe::snapshot-2026-09-12|source:realswe:glm|Claude Code||Claude Code|",
 "realswe::snapshot-2026-09-12|source:realswe:gpt|Codex CLI||Codex CLI|",
 "realswe::snapshot-2026-09-12|source:realswe:grok|Grok Build||Grok Build|",
 "realswe::snapshot-2026-09-12|source:realswe:kimi|Kimi Code||Kimi Code|",
 "realswe::snapshot-2026-09-12|source:realswe:meta|Muse Code||Muse Code|"
]
```
Identity re-keys: 25 removed keys were unmatched `source:<uuid>` rows that became catalog-matched rows newly added by this snapshot. Each re-key target is unique (true) and preserves value+unit exactly. Target distribution: {"ling-3.0-flash-vl::default||":14,"deepseek-v4.1-flash::max||":11}. No other key was added or removed, so 13908 - 25 + 41 = 13924.
Re-keyed rows (old unmatched identity -> new catalog identity, value/unit preserved):
```json
[
 {
  "benchmark_id": "aa-automationbench::1.0.6",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.1568437535870999,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-automationbench::1.0.6",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.6889097769674057,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-briefcase::snapshot-2026-09-10",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 985.98,
  "unit": "Elo",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-briefcase::snapshot-2026-09-10",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 1423.72,
  "unit": "Elo",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-critpt::snapshot-2026-09-10",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.02,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-critpt::snapshot-2026-09-10",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.142857142857143,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-gdp-pdf::snapshot-2026-09-10",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.064,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-gdp-pdf::snapshot-2026-09-10",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.128,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-gdpval::2",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 1224.84,
  "unit": "Elo",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-gdpval::2",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 1632.06,
  "unit": "Elo",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-gpqa-diamond::snapshot-2026-09-10",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.861616161616162,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-hle::snapshot-2026-09-10",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.219647822057461,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-hle::snapshot-2026-09-10",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.392493049119555,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-lcr::1.1",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.783333333333333,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-lcr::1.1",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.84,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-mmmu-pro::snapshot-2026-09-10",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.789595375722543,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-mmmu-pro::snapshot-2026-09-10",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.769942196531792,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-omniscience::snapshot-2026-09-10",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": -4.53333333333333,
  "unit": "points",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-omniscience::snapshot-2026-09-10",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": -5.3,
  "unit": "points",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-scicode::1.0.1",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.44212962962963,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-scicode::1.0.1",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.518518518518518,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-tau3-banking::1.0.1",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.344329896907216,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-terminal-bench::2.1",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0.644194756554307,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-terminal-bench::4.0",
  "old_model_key": "source:433d5c5d-3092-4026-9727-1587ca07915d||",
  "new_model_key": "ling-3.0-flash-vl::default||",
  "value": 0,
  "unit": "fraction",
  "unique_match": true
 },
 {
  "benchmark_id": "aa-terminal-bench::4.0",
  "old_model_key": "source:dbe7c625-3100-4463-b479-a228c41f75dd||",
  "new_model_key": "deepseek-v4.1-flash::max||",
  "value": 0.267676767676768,
  "unit": "fraction",
  "unique_match": true
 }
]
```
AA coding rows in prior state 81, in new state 81; value/unit mismatches among AA coding rows: 0.
Changed rows sample (value-level):
```json
[]
```

## 4. Coverage block (compact) + catalog exclusion (round-1 section H was truncated)
coverage keys: ["by_model","by_benchmark","note"]; by_benchmark entries 75; by_model entries 839; note: "Denominators are catalog model configurations × versioned registry entries. Basis counts count covered cells, not runs; measured and self_reported may overlap. Unmatched source identities remain in observations and never inflate catalog coverage."
coverage.by_benchmark entries for the two realswe ids:
```json
{
 "realswe::snapshot-2026-09-12": {
  "total_models": 839,
  "available": 0,
  "unknown": 839,
  "not_tested": 0,
  "not_published": 0,
  "source_unreachable": 0,
  "contested": 0,
  "measured": 0,
  "self_reported": 0,
  "observations": 8,
  "unmatched_observations": 8
 },
 "realswe-cost::snapshot-2026-09-12": {
  "total_models": 839,
  "available": 0,
  "unknown": 839,
  "not_tested": 0,
  "not_published": 0,
  "source_unreachable": 0,
  "contested": 0,
  "measured": 0,
  "self_reported": 0,
  "observations": 8,
  "unmatched_observations": 8
 }
}
```
All realswe observations have subject.model_id === null: true. Catalog models whose benchmarks map contains a realswe key: 0 (must be 0).

## 5. Named test receipts and independent execution evidence
```text
✔ radar preserves zero, reverses lower-better, and withholds missing or uninformative ranges (0.816284ms)
✔ observation selection prefers measured and latest, never highest or vendor-derived claims (3.566402ms)
✔ peer distribution excludes unmatched identities, claims, low battle counts, and duplicate source identities (0.803445ms)
✔ profile flags require both relative strength and peer deviation and expose independently computable inputs (3.283187ms)
✔ tiny peer groups, narrow family coverage, and insufficient model profile never trigger flags (0.715006ms)
✔ explicit CoT settings, dataset splits, and harnesses create separate evaluation axes (0.354553ms)
✔ two harnesses of one model stay separate axes and rows, never merged (9.752973ms)
✔ actual source adapter keeps all version identities, values and dated legacy inputs, without mutating data (592.666322ms)
✔ Real-SWE evidence is hash-bound to the lock and never fetched at parse time (9.836761ms)
✔ Real-SWE parses the full public sample: 8 configurations x 10 tasks x 8 runs (15.355865ms)
✔ Real-SWE exact scores are the pass rate, not the rounded display value (7.743501ms)
✔ Real-SWE chunk independently repeats passes/valid and the page cross-check holds (7.746081ms)
✔ Real-SWE snapshot is additive: eight score rows and eight cost rows, model_id stays null (11.378822ms)
✔ Real-SWE cost provenance flags the lower-bound configurations (8.465038ms)
✔ Real-SWE refuses drifted bytes instead of publishing a wrong number (13.729676ms)
✔ Real-SWE parsing is deterministic (13.887194ms)
✔ Real-SWE is additive: Composite slots and the AA v1.4/v1.5 Coding entries are untouched (148.469649ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 691.143862

```
Hash-mismatch / drift refusal receipt (owner-executed; mutated fixture must throw):
```text
baseline parse ok: configs 8 rollouts 640
drift refused: Real-SWE source: Fable 5.1: bar 99.75% disagrees with 31/80

```

## 6. Disposition of round-1 findings
- qa-r11-01 (low, lower-bound caveat only in details): DEFERRED as explicit scope residue, recorded in REPORT.md; no value change, cost rows remain exact to the Pareto titles.
- qa-r11-02 (low, output tokens unverifiable): ADDRESSED by section 1 above.
- qa-r11-03 (info, packet duplication): no artifact impact; ack.
- qa-r11-04 (info, CI level source-asserted): DEFERRED as residue; captured page exposes whisker geometry, level 0.95 comes from the registry/how_to_collect.
- qa-r11-05 (info, chunk minification for astra/meta): ack; verified via raw titles C2.

## 7. Round-2 finding disposition
- qa-r11-r2-01 (low, re-key/added-keys tension in the round-2 supplement): FIXED by re-deriving re-keys against only the newly added keys and requiring a unique value/harness/variant match; the corrected table pairs all 25 rows to exactly two newly matched models (ling-3.0-flash-vl::default x14, deepseek-v4.1-flash::max x11), value+unit preserved. The three previously mis-paired rows were a presentation artifact, not an artifact change.
- qa-r11-r2-02 (low, cost lower-bound residue) and qa-r11-r2-03 (info, CI level registry-asserted): remain explicitly deferred scope residue recorded in REPORT.md; no stored value affected.
- qa-r11-r2-04 (info, 1-ulp CI upper bounds): acknowledged; bounds are computed independently of page arithmetic; no display-precision error.