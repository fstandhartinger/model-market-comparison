"""v1.7.14 public text for the five new rows on draw v1.6-regular-20261027 (all unranked).
Every text is derived from the row's entry draft (pinned by sha256 in prepare_v1714.py): measured facts are kept, internal ids,
board numbers, order ids, roles, ranking language and job names are removed, and the shared draw sentence is added.
prepare_v1714.py asserts that every quoted number reproduces from the trusted scorer outputs, raws or recount."""
DRAW_NOTE = ("DRAW: measured on the 27 Oct 2026 regular draw (fresh sealed items; not yet equated to the reference scale, so its numbers "
             "are shown as published, offset 0). This draw has no subject-topic labels yet, so the row has no topic cells; its use-case "
             "and language cells are measured on its own draw.")
ESTIMATE_TAIL = 'Estimated model tariff, not charged usage or a host quote.'
ALL_ITEMS = 'over all 1,500 items of the draw (every row on this draw is costed on all 1,500 items)'

ROWS = {
 'torchcast-decision-31b-v1.0': {
  'display': 'Torchcast Decision 31B v1.0', 'author': 'Torchcast AI', 'paid': True, 'gpu': 'RTX PRO 6000',
  'repo_id': 'torchcast-ai/torchcast-decision-31b',
  # The entry text is kept except for these exact replacements (asserted present).
  'replace': {
   'code_revision': [("fast-lane source review and independent kit reviews PASS (kit SHAS 15d49a98)",
                      "independent source and kit reviews PASS (evaluator kit hash 15d49a98)"),
                     ("no trust_remote_code, safetensors weights only.",
                      "no trust_remote_code, safetensors weights only. Run with the PyTorch SDPA attention kernel (TC_SLIDE=sdpa); the author's H100 FlashAttention-3 path was not used.")],
   'disclosure': [("to 0.801 / 0.199 on the same side; its code comment names",
                   "to 0.801 / 0.199 on the same side (decision_config.json noul_floor 0.801, model.py lines 208-212); its code comment names"),
                  ("FIRST MEASUREMENT (paid fast-lane order 69f7a75d).", "FIRST MEASUREMENT (paid evaluation, public). " + DRAW_NOTE),
                  ("Kept unchanged as shipped and disclosed (release owner #29200), as for earlier rows with the same floor.",
                   "Kept unchanged as shipped and disclosed, as for earlier rows with the same floor; the argmax never changes, the Calibration axis includes its effect, and no variant without it was measured."),
                  ("HARDWARE: RTX PRO 6000 Blackwell 96 GB with the PyTorch SDPA kernel (the author's H100 FA3 path not used); latency reflects that card.",
                   "HARDWARE: one Verda RTX PRO 6000 Blackwell Server Edition 96 GB (FIN-03, EU) with the PyTorch SDPA kernel (the author's H100 FlashAttention-3 path not used); latency reflects that card. ANSWERED: 1,500 of 1,500, HTTP 200 on every row, none over 10 s (maximum 6.235 s; measured p50 0.095 s, p95 0.202 s).")],
  },
  'cost_basis': ("ESTIMATE (*est.), self-hosted open weights, no public tariff: base google/gemma-4-31B-it, {REF} (frozen pricing module sha256 {PIN}). "
                 "Input is billed on the engine-processed prompt tokens as reported by the server (equal to our offline count on every item): 645,268 tokens "
                 "on 1,500 answered items; the 5 head+tail-cut states count at their truncated size. Output: 0 tokens (one forward pass per question, "
                 "option-letter readout, no generation). COST FIGURES: USD {USD} per 1,000 decisions " + ALL_ITEMS + "; {CAPX}x the official cost cap USD {CAP}. " + ESTIMATE_TAIL),
  'must': ['noul_floor 0.801', '0.801 / 0.199', '5 items', 'RTX PRO 6000', 'SDPA', '645,268'],
 },
 'arcbright-elf-1-12b-r2': {
  'display': 'Arcbright Elf 1 12B (r2)', 'author': 'Arcbright (arcbright on Hugging Face)', 'paid': False, 'gpu': 'RTX PRO 6000',
  'repo_id': 'arcbright/elf-1-12b',
  'licence': 'Apache-2.0 (model card, root LICENSE and serve/LICENSE; base google/gemma-4-12B-it under the Gemma 4 licence), public, not gated',
  'replace': {
   'code_revision': [("Source review of the delta from the previously measured revision (line by line): PASS WITH CONDITIONS, no blocker. ",
                      "Independent source review of the delta from the previously measured revision (line by line): PASS with conditions, no blocker. "),
                     ("both were disclosed and cleared for the earlier revision and ran here only on the disposable rented pod (standing rule: author code only on a disposable rented pod).",
                      "both were disclosed and cleared for the earlier revision and ran here only on a disposable rented GPU VM."),
                     ("Independent kit review of the exact final kit: PASS, no must-fix. Kit SHAS sha256 prefix bcbaca2d.",
                      "The measurement kit was hash-pinned (bcbaca2d) and independently reviewed (PASS) before measurement.")],
  },
  'disclosure': (DRAW_NOTE + " SECOND ROW ON THESE WEIGHTS, A NEW REVISION: arcbright/elf-1-12b@10186960 is a new revision of the repository whose earlier "
   "revision da29a170 is the live Arcbright Elf 1 12B row. All five safetensors shards, the index, config, tokenizer files, chat template and render.py are "
   "byte-identical to the measured earlier revision (by sha256 and git blob oid); the new revision changes only decision_config.json (adds noul_commit "
   "[0.199, 0.801]), the serve code (serve/elf_serve/{__init__,server,settings}.py and a new truncate.py), the version and the READMEs. It is a separate row "
   "and replaces nothing; the earlier row stays on the board unchanged. The name is 'Jev-compatible' only: it is an Elf model, not a Jev model. AUTHOR'S OWN "
   "SERVER on our rented hardware, run unmodified apart from the documented option ELF_TRUNCATE=1 (see code_revision), no shim. NATIVE OUTPUTS: probabilities "
   "for choice, noul and score from the per-marker logit readout of one vLLM forward pass, at the shipped per-type temperatures. TRUNCATION (author's documented "
   "option ELF_TRUNCATE=1, a non-default setting we enabled so that long items are answered): a row of 40,960 tokens or more is re-rendered with its state cut "
   "to the first and last 3,000 tokens joined by ' … '. Exactly the 5 pre-registered long items were cut and answered with HTTP 200 (30,789 input tokens "
   "in total, about 6,160 each); their answers rest on the first and last 3,000 state tokens, not the whole state. They are answered, not refused, and counted "
   "as answers. All other rows are unchanged. COMMIT BAND (noul_commit [0.199, 0.801], new in this revision, disclosed like the DOPEST floor): yes/no "
   "probabilities strictly inside (0.199, 0.801) are moved to the nearer band edge; the argmax is unchanged. The band equals the abstention band JevBench "
   "counts; the author does not name JevBench, but the effect is benchmark-aware by construction. The Calibration axis includes this transform and we did not "
   "measure a variant without it. JOINT MODE: decision_config.json ships joint 'generic'; with exactly one question per request it is a pass-through, so the "
   "row is the author-default configuration apart from ELF_TRUNCATE=1. TRAINING DATA, the author's own statement: fine-tuned from google/gemma-4-12B-it on "
   "84,470 rows including ZefanCai/Open-Jev and Open-Jev-v1.1 (public Open-Jev material) and the train splits of ten Decision Index benchmarks; the author "
   "states it screened for overlap with DI test items - not independently verified here, and overlap with JevBench items was not checked, so contamination "
   "of the sealed draw is unchecked. SELF-REPORTED, unverified: DI public index 58.35 and 54.5 ms median latency on the author's card. English only; not "
   "evaluated for decisions about people. LoRA on attention and MLP merged into bf16 (11,959,730,176 parameters). LICENCE NOTE: Apache-2.0 on the weights "
   "and the serve code; the base is Gemma 4 under its own terms. ANSWERED: 1,500 of 1,500, HTTP 200 on every row, no refusal, no error; none over 10 s "
   "(maximum 0.557 s; measured p50 0.029 s, p95 0.060 s). USAGE: server-native input usage totals 610,840 tokens and equals our first-party count exactly, "
   "0 mismatches; output_tokens 1 per answered row (1,500 in total). DETERMINISM (record-only): the first 50 requests were run twice; 1 of 50 was "
   "bit-identical, 0 argmax flips, maximum probability difference 0.0327 (serial vLLM path; cause not isolated). The scored rows are the first run and "
   "stand. The scored loop of 1,500 requests took 55 s. ATTEMPT HISTORY: one attempt on this draw's sealed input, one create call that produced the only "
   "instance; the pre-sealed smoke (including the cut probes), network-cut proof, pre-warm and TTL fit gate passed before any sealed item. HARDWARE: one "
   "Verda RTX PRO 6000 Blackwell Server Edition 96 GB (FIN-03, EU); latency reflects that card."),
  'cost_basis': ("ESTIMATE (*est.), self-hosted open weights, no public tariff: the declared base google/gemma-4-12B-it has no listing in the frozen pricing "
                 "module (sha256 {PIN}), so the settled Gemma-4-12B estimate applies: the nearest listed 12B Gemma sibling, {REF}, the same explicit "
                 "reference as the earlier google/gemma-4-12B-it rows. Tokens as reported by the author's server usage block (the full rendered chat prompt "
                 "incl. system prompt, options and answer prefill; equal to our offline count on every item): 610,840 input tokens (the 5 cut items count at "
                 "their cut size, 30,789 tokens) and 1,500 output tokens (one forward pass per answered question, reported as 1 output token each). "
                 "COST FIGURES: USD {USD} per 1,000 decisions " + ALL_ITEMS + "; {CAPX}x the official cost cap USD {CAP}. " + ESTIMATE_TAIL),
  'must': ['ELF_TRUNCATE=1', '5 pre-registered long items', 'noul_commit', 'RTX PRO 6000', '610,840', '0.0327'],
 },
 'jeff_1_1_qwen_4b': {
  'display': 'Jeff-1.1-Qwen-4B (jgeuter)', 'author': 'jgeuter (Hugging Face)', 'paid': False, 'gpu': 'RTX PRO 6000',
  'repo_id': 'jgeuter/Jeff-1.1-Qwen-4B',
  'licence': 'Weights CC BY-NC-4.0 per the model card (non-commercial; listed for evaluation only); base Apache-2.0; serving code Apache-2.0 (jeff 1.4.0).',
  'code_revision': ("The author's own serving path ran unmodified: j-geuter/Jeff-JevBench@3b53b463f6427f45450b1e99c9d67842fed780d6 installing jeff 1.4.0 "
   "(j-geuter/Jeff@47ac025a1d8a011bdb1fb1cbbbf20607884d35ee). Native /v1/systemone endpoint with no response shim or instruction conversion. Reasoning enabled, "
   "JevBench limits enabled, fast_reasoning resolved to copy, reasoning_engine transformers, batching off, shipped Jeff-1.1-Qwen-4B settings unchanged (settings "
   "sha256 4b06e2ea). Reasoning budget 256, shares choice 0 / noul 0.1 / score 0.6, maximum output per decision 143, maximum share 0.45, decision_seconds 8.5, "
   "request_seconds 30, window 1000 and warm-up 100 decisions. The commitment band moves probabilities strictly inside (0.2, 0.8) to 0.801 or 0.199. Adapted "
   "Qwen/Qwen3.5-4B with adapter and decision head (jgeuter/Jeff-1.1-Qwen-4B@5401940b, 18 files hash-verified), full bidirectional attention in the decision pass, "
   "maximum input 8,192 tokens, no quantisation. Hash-locked dependencies included torch 2.13.0+cu130 and transformers 5.17.0; no vLLM or flash-linear-attention "
   "present, so the Qwen3.5 linear-attention layers ran without the optional kernels. Source and weights ran on isolated rented hardware with networking "
   "disabled, no credentials and read-only mounts. The scored process was fresh; no earlier probes affected its process-wide running limits."),
  'endpoint_condition': ("Measured 27 Oct 2026 on one rented Verda NVIDIA RTX PRO 6000 Blackwell Server Edition 96 GB (FIN-03, Finland, EU) over loopback. "
   "One measured attempt in a fresh process with pinned weights and serving code, read-only model and source, no credentials and networking disabled. "
   "The standard self-hosted x2 + 0.15 s latency adjustment applies. GPU rental is separate from the estimated model tariff."),
  'disclosure': ("First measurement of jgeuter/Jeff-1.1-Qwen-4B, a Jev-compatible model. Jeff-1.0-Large, Jeff-1.1-Medium and Jeff-1.1-Large are separate "
   "measured models; nothing is inferred between them. " + DRAW_NOTE + " The author's own serving path ran unmodified with native choice, noul and score "
   "probabilities. The shipped configuration uses a one-pass decision head and limited generated reasoning read back into the answer: 313 decisions were "
   "reasoned, none dropped, and 1,187 were one-pass (69,580 reasoning tokens). Fast reasoning resolved to copy on this hardware; other hardware may use a "
   "slower shared path. The settings target the published latency and cost caps: decision_seconds 8.5, max_share 0.45 and max_output_per_decision 143. The "
   "commitment band changes yes/no probabilities; Calibration includes its effect. No alternative configuration was measured. The card reports public-231 "
   "scores and separately held-out tuning data; the data used to tune the JevBench-specific settings are not identified. Training data are not identified "
   "beyond the card's description of CC BY-NC and research-only sources; the author states no JevBench items were used. Training examples and overlap with "
   "JevBench were not independently checked. Question-aware retrieval answered the 5 long items at at most 8,192 input tokens, selecting state passages "
   "matching the question in original order, with a start-of-state fallback. These answers use retrieved passages, not the whole state. All 1,500 requests "
   "returned HTTP 200 with answers, no refusals or errors; zero exceeded 10 s (maximum 5.921 s). Measured p50 0.039 s and p95 3.110 s; the common self-hosted "
   "latency assumption is twice p50 plus 0.15 s. Native usage is 629,951 input and 69,580 output tokens. Ordinary input counts match the independent count on "
   "all 1,495 ordinary items; the 5 retrieval answers stay within 8,192 tokens. The server counts one-pass input only: an uncounted second-prefill estimate "
   "totals 348,654 tokens (138,911 generation-prefill plus 209,743 read-prefill), not measured natively and not priced. Native nonzero output is generated "
   "reasoning and is priced as reported. Pre-sealed smoke repeats showed no non-deterministic probe. Weights carry non-commercial CC BY-NC-4.0 terms; listed "
   "for evaluation only. HARDWARE: one Verda RTX PRO 6000 Blackwell Server Edition 96 GB (FIN-03, EU); latency reflects that card."),
  'cost_basis': ("ESTIMATE (*est.), self-hosted open weights, no public tariff: base Qwen/Qwen3.5-4B, {REF} (frozen 25 Sep 2026 snapshot; pricing module "
                 "sha256 {PIN}). Native usage priced as reported: 629,951 input tokens (one-pass decision prompts after the author's long-input retrieval) "
                 "and 69,580 output tokens (generated reasoning). The server does not count the two further prefills of a reasoned decision; our offline "
                 "estimate of 348,654 such input tokens is disclosed, not priced (priced as input, the cost would be USD {SENS} per 1,000 decisions). "
                 "COST FIGURES: USD {USD} per 1,000 decisions " + ALL_ITEMS + "; {CAPX}x the official cost cap USD {CAP}. " + ESTIMATE_TAIL),
  'sens_input_extra': 348654,
  'must': ['313 decisions', '348,654', 'max_output_per_decision 143', 'RTX PRO 6000', '629,951'],
 },
 'decisio-gemma-4-12b-tuned-commit-think': {
  'display': 'Decisio 12B tuned commit-think (variant of the Decisio family)', 'author': 'tachara-ai (Hugging Face)', 'paid': False, 'gpu': 'RTX PRO 6000',
  'repo_id': 'tachara-ai/Decisio-12b-tuned-commit-think',
  'licence': 'Apache-2.0 per the model card, LICENSE and NOTICE on the weights and the author server; base google/gemma-4-12B-it public, ungated, under its own terms',
  'replace': {
   'code_revision': [("plus a rank-16 LoRA merged in fp32", "plus a LoRA with adapter dimension 16 merged in fp32"),
                     ("Author code and weights were fetched by our code at the pinned revisions and ran only on the disposable rented pod (standing rule: author code only on a disposable rented pod, no infrastructure credentials, egress cut, USD and TTL limits, deletion receipt); one first self-hosted use on this draw (custody admitted). Independent kit review of the exact final kit: PASS, no must-fix. Kit SHAS sha256 prefix ceaf8953.",
                      "Author code and weights were fetched by our code at the pinned revisions and ran only on a disposable rented GPU VM; the measurement kit was hash-pinned (ceaf8953) and independently reviewed (PASS) before measurement.")],
  },
  'disclosure': ("FIRST MEASUREMENT of Decisio-12b-tuned-commit-think. " + DRAW_NOTE + " A NEW ROW OF THE DECISIO FAMILY AND A SERVING-CONFIGURATION "
   "VARIANT OF A LIVE ROW: the weights tachara-ai/Decisio-12b-tuned-commit-think@e36aeb24 are the same weights as the live Decisio 12B tuned commit row "
   "(tachara-ai/Decisio-12b-tuned-commit@245e00dc): 16 of 20 files are identical by LFS sha256 or git blob oid and by sha256, including all six safetensors "
   "shards, the index, tokenizer, config and chat template; exactly 4 files differ (decision_config.json, README.md, NOTICE, SHA256SUMS). The behavioural "
   "difference is decision_config.json only: decisio 0.31.0 to 0.35.0, a think default {factor 0.495, budget 256, types [choice]}, over_limit truncate at "
   "45,000 tokens, and the flavor name commit to commit-think. It is a separate row and replaces none of the live rows; nothing is inferred about the "
   "author's third same-weights repository (Decisio-12b-tuned-calibrated), which was not measured. The name is 'Jev-compatible' only: it is a Decisio model, "
   "not a Jev model. AUTHOR'S OWN SERVER on our rented hardware, run unmodified (see code_revision), no shim. NATIVE OUTPUTS: probabilities for choice, "
   "noul and score from the option-letter readout (one vLLM label-logprob readout, softmax over the label tokens) at the repository's shipped per-type "
   "temperatures (yes/no 3.314, score 2.1109, choice 2-10 options 2.1317, 11-26 options 1.8766, 27-255 options 1.7181). CONFIGURATION: the repository's "
   "shipped flavor 'commit-think', exactly as shipped; we measured no other flavor or setting and infer nothing about one. THINK PASS (author's feature, on "
   "by default in this flavor): a choice question of at most 16 options whose served first-read top probability is below 0.37125 (0.75 x 0.495) is read a "
   "second time after up to 256 greedy reasoning tokens; the two reads are mixed in log space and served at the same temperature. Noul and score never think "
   "and a cut state never thinks. OBSERVED: 36 of the 746 think-eligible choice decisions thought, 7,621 reasoning tokens in total, 19 of them stopped at the "
   "256-token budget; no noul, score or cut decision thought. TRUNCATION (author's over-limit truncate): a state whose rendered text exceeds the cut room "
   "(45,000 tokens minus the longest plain user turn minus 32) is cut to its START at a whitespace boundary within 64 tokens, with no marker, and answered by "
   "the single read without thinking. Exactly the 5 pre-registered long items (76,554 to 81,413 tokens before the cut) were cut to 44,801 to 44,816 tokens; "
   "the observed cut set equals the counted set. Their answers rest on the first part of the state only. They are answered, not refused, and counted as "
   "answers. COMMIT RULE (a disclosed non-raw, item-blind output transform, in the same way as the DOPEST 0.801 floor): for yes/no questions, a "
   "temperature-scaled P(yes) strictly between 0.20 and 0.80 is reported at the nearer band edge, 0.80 if it is above 0.5, otherwise 0.20 (exactly 0.5 goes "
   "to 0.20). The argmax never changes; the Calibration axis includes the effect of this transform, and we did not measure a variant without it. LABEL-SHAPE "
   "RULES ON BY DEFAULT: hide_index_keys, describe_options and desnake_labels, which act on the shape of the labels of any request, never on item text, ids, "
   "gold labels or item lists (source review confirmed item-blind); the answer keys are always the request's own keys. The frozen offline layout counter "
   "recorded 746 describe_options, 375 noul_as_letters and 4 hide_index_keys applications across the 1,500 draw rows. TRAINING DATA (author statement, not "
   "independently verified): the model card says the training data is not disclosed, that no Decision Index or JevBench evaluation items were used in "
   "training or checkpoint selection, that the data was decontaminated against both boards' public test sets, and that official training splits of some "
   "public benchmarks were used under their licences. We did not inspect the training examples or check overlap with JevBench items; contamination of the "
   "sealed draw is unchecked. LICENCE NOTE: Apache-2.0 per the model card, LICENSE and NOTICE on the weights and per the author server licence; the base is "
   "Gemma 4 under its own terms. ANSWERED: 1,500 of 1,500, HTTP 200 on every row, no refusal, no error; none over 10 s (maximum 6.928 s; measured p50 "
   "0.052 s, p95 0.096 s). USAGE: cost is billed on the engine-processed input (chat template and system turn included), 844,031 tokens by an exact offline "
   "per-item recount; the server-native input usage, 727,045 tokens without template and system turn, equals our first-party count exactly. Output tokens "
   "are native, 9,121 in total (1 per readout plus the 7,621 reasoning tokens), priced as reported. The think pass's second read is not priced (see "
   "cost_basis). DETERMINISM (record-only): the first 50 requests were run twice; 1 of 50 was bit-identical, 0 argmax flips, maximum probability difference "
   "0.0205 (serial vLLM path; cause not isolated; a pre-sealed smoke probe also varied between 0.80 and 0.845). The scored rows are the first run and stand. "
   "The scored loop of 1,500 requests took 260 s. ATTEMPT HISTORY: one attempt on this draw's sealed input, one create call that produced the only instance; "
   "the pre-sealed smoke, context/cut probes, think gate and TTL fit gate passed before any sealed item. HARDWARE: one Verda RTX PRO 6000 Blackwell Server "
   "Edition 96 GB (FIN-03, EU); latency reflects that card."),
  'cost_basis': ("ESTIMATE (*est.), self-hosted open weights, no public tariff: the declared base google/gemma-4-12B-it has no listing in the frozen pricing "
                 "module (sha256 {PIN}), so the settled Gemma-4-12B estimate applies: the nearest listed 12B Gemma sibling, {REF}. Billed on engine-processed "
                 "input: the primary prompt the engine reads per decision, chat template and system turn included, 844,031 input tokens on all 1,500 items by "
                 "an exact offline per-item recount (0 mismatches; decisio's own usage reports 727,045 tokens without the template and system turn, 78 tokens "
                 "less per item, 77 on 14 items at a tokenizer merge seam); the 5 cut items count at their cut size. Output: 9,121 tokens as reported natively "
                 "(1,500 option-label readouts plus 7,621 reasoning tokens from the 36 decisions that thought), priced at the full output rate. Not priced: "
                 "the second read of the think pass, which has no native count (the run thought on 36 items; an offline upper bound for its prefill, if all "
                 "746 think-eligible items had thought, is 504,719 tokens), and any state-prefix registration prefill. COST FIGURES: USD {USD} per 1,000 "
                 "decisions " + ALL_ITEMS + "; {CAPX}x the official cost cap USD {CAP}. " + ESTIMATE_TAIL),
  'must': ['844,031', '727,045', '504,719', '36 of the 746', 'RTX PRO 6000', 'commit-think'],
 },
 'jeff_1_1_large': {
  'display': 'Jeff-1.1-Large (jgeuter)', 'author': 'jgeuter (Hugging Face)', 'paid': False, 'gpu': 'RTX PRO 6000',
  'repo_id': 'jgeuter/Jeff-1.1-Large',
  'licence': 'Weights CC BY-NC-4.0 per the model card (non-commercial; listed for evaluation only); base Apache-2.0; serving code Apache-2.0 (jeff 1.4.0).',
  'code_revision': ("The author's own serving path ran unmodified: j-geuter/Jeff-JevBench@3b53b463f6427f45450b1e99c9d67842fed780d6 installing jeff 1.4.0 "
   "(j-geuter/Jeff@47ac025a1d8a011bdb1fb1cbbbf20607884d35ee). Native /v1/systemone endpoint with no response shim or instruction conversion. Reasoning enabled, "
   "JevBench limits enabled, fast_reasoning resolved to shared, reasoning_engine transformers, batching off, shipped Jeff-1.1-Large settings unchanged (settings "
   "sha256 75b684ae). Reasoning budget 128, shares choice 0 / noul 0.2 / score 0.6, maximum output per decision 35, maximum share 0.45, decision_seconds 8.5, "
   "request_seconds 30, window 1000 and warm-up 100 decisions. The commitment band moves probabilities strictly inside (0.2, 0.8) to 0.801 or 0.199. Adapted "
   "google/gemma-4-31B-it with adapter and decision head (jgeuter/Jeff-1.1-Large@970c21af, 29 files hash-verified), maximum input 8,192 tokens, no "
   "quantisation. Hash-locked dependencies included torch 2.13.0+cu130 and transformers 5.17.0; no vLLM or flash-linear-attention present. Source and weights "
   "ran on isolated rented hardware with networking disabled, no credentials and read-only mounts. The scored process was fresh; no earlier probes affected "
   "its process-wide running limits."),
  'endpoint_condition': ("Measured 27 Oct 2026 on one rented Verda NVIDIA RTX PRO 6000 Blackwell Server Edition 96 GB (FIN-03, Finland, EU) over loopback. "
   "One measured attempt in a fresh process with pinned weights and serving code, read-only model and source, no credentials and networking disabled. "
   "The standard self-hosted x2 + 0.15 s latency adjustment applies. GPU rental is separate from the estimated model tariff."),
  'disclosure': ("First measurement of jgeuter/Jeff-1.1-Large, a Jev-compatible model. Jeff-1.0-Large, Jeff-1.1-Medium and Jeff-1.1-Qwen-4B are separate "
   "measured models; nothing is inferred between them. " + DRAW_NOTE + " The author's own serving path ran unmodified with native choice, noul and score "
   "probabilities. The shipped configuration uses a one-pass decision head and limited generated reasoning read back into the answer: 186 decisions were "
   "reasoned, none dropped, and 1,314 were one-pass (21,830 reasoning tokens). Fast reasoning resolved to shared on this hardware (no room for a second copy "
   "of the weights); a card with room for a second copy could use the copy path, so this result is for this hardware. The settings target the published "
   "latency and cost caps: decision_seconds 8.5, max_share 0.45 and max_output_per_decision 35. The commitment band changes yes/no probabilities; Calibration "
   "includes its effect. No alternative configuration was measured. The card reports public-231 scores and separately held-out tuning data; the data used to "
   "tune the JevBench-specific settings are not identified. Training data are not identified beyond the card's description of CC BY-NC and research-only "
   "sources; the author states no JevBench items were used. Training examples and overlap with JevBench were not independently checked. Question-aware "
   "retrieval answered the 5 long items at at most 8,192 input tokens, selecting state passages matching the question in original order, with a "
   "start-of-state fallback. These answers use retrieved passages, not the whole state. All 1,500 requests returned HTTP 200 with answers, no refusals or "
   "errors; zero exceeded 10 s (maximum 8.319 s, under the author's own 8.5 s decision limit). Measured p50 0.106 s and p95 8.269 s; the reasoned decisions "
   "are the slow tail; the common self-hosted latency assumption is twice p50 plus 0.15 s. Native usage is 620,215 input and 21,830 output tokens. Ordinary "
   "input counts match the independent count on all 1,495 ordinary items; the 5 retrieval answers stay within 8,192 tokens. The server counts one-pass input "
   "only: an uncounted second-prefill estimate totals 199,718 tokens (88,572 generation-prefill plus 111,146 read-prefill), not measured natively and not "
   "priced. Native nonzero output is generated reasoning and is priced as reported. DETERMINISM (record-only): in the pre-sealed smoke, one repeated probe, a "
   "short score question that took the reasoning path, returned different probability vectors on its two repeats; no other probe differed, and the "
   "forced-reasoning process showed none. Weights carry non-commercial CC BY-NC-4.0 terms, the same terms as the Jeff-1.0-Large row; listed for evaluation "
   "only. HARDWARE: one Verda RTX PRO 6000 Blackwell Server Edition 96 GB (FIN-03, EU); latency reflects that card."),
  'cost_basis': ("ESTIMATE (*est.), self-hosted open weights, no public tariff: base google/gemma-4-31B-it, {REF} (frozen pricing module sha256 {PIN}). "
                 "Native usage priced as reported: 620,215 input tokens (one-pass decision prompts after the author's long-input retrieval) and 21,830 output "
                 "tokens (generated reasoning). The server does not count the two further prefills of a reasoned decision; our offline estimate of 199,718 "
                 "such input tokens is disclosed, not priced (priced as input, the cost would be USD {SENS} per 1,000 decisions). COST FIGURES: USD {USD} "
                 "per 1,000 decisions " + ALL_ITEMS + "; {CAPX}x the official cost cap USD {CAP}. " + ESTIMATE_TAIL),
  'sens_input_extra': 199718,
  'must': ['186 decisions', '199,718', 'max_output_per_decision 35', 'RTX PRO 6000', '620,215', 'different probability vectors'],
 },
}
