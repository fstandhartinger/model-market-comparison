"""Public row text from the pinned Jev-Style-2B preregistration; no sealed strings."""
KEY='chaoliangunsw-jev-style-2b-decision-v4'
DISPLAY='Jev-Style-2B'
DRAW_ID='v1.6-regular-20261027'
CAP=0.06459465517241379
H2O_KEY='h2o-lightning-4b-v1.4.1'
MSFT_KEY='microsoft-decision-1-r2'
DECISIO_KEY='decisio-gemma-4-12b-tuned-commit-think'
DRAW_NOTE='DRAW: measured on the 27 Oct 2026 regular draw (fresh sealed items; not yet equated to the reference scale, so its numbers are shown as published, offset 0).'
TOPIC='This draw has no subject-topic labels yet, so the row has no topic cells'
NOT_RANKED_BECAUSE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'
STRIKE_NOTE=NOT_RANKED_BECAUSE
NOTE_HEAD='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.'
NOTE_TAIL='Shown unranked until then.'
H2O_EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.'
def note_for(k):
 if k in [KEY,'strike-1']:return NOT_RANKED_BECAUSE
 return NOTE_HEAD+(' '+H2O_EXTRA if k==H2O_KEY else '')+' '+NOTE_TAIL
def same_items_sentence(n,usd_all):return f'Cost on the {n:,} items every row on this draw answered (same-items rule); all-items cost USD {usd_all:.6f} per 1,000 decisions.'
def cost_figures(usd,n,usd_all):return f'COST FIGURES: USD {usd:.6f} per 1,000 decisions, {usd/CAP:.2f}x the official cost cap USD 0.064595. '+same_items_sentence(n,usd_all)
ROW={
'display':DISPLAY,'author':'chaoliangUNSW','provider':'self-hosted',
'repo':'https://huggingface.co/chaoliangUNSW/Jev-Style-2B-Decision-v4',
'model_pin':{'model':'chaoliangUNSW/Jev-Style-2B-Decision-v4','revision':'c9504148dae7f7a43d67a5782f12a015a4b4022c','base':'Qwen/Qwen3.5-2B','served_model':'jev-style-2b-decision-v4'},
'licence':'Apache-2.0',
'endpoint_condition':"Self-hosted on one evaluator-rented Verda RTX 6000 Ada GPU in Finland (EU), through the author's own documented HTTP server: CUDA, bf16, CUDA graphs and FLA kernel. Measured 28 Oct 2026, 16:45-16:56 UTC. Contributor code ran only on a disposable rented pod, with network cut before the scored run. GPU rental is separate from the estimated model tariff.",
'disclosure':("FIRST MEASUREMENT of Jev-Style-2B, a full fine-tune of Qwen/Qwen3.5-2B (Apache-2.0). TRAINING: trained in part on soft labels distilled from TypeSafe Jev 1.14 via its public API (334,739 rows), plus official train splits of several public benchmarks (not zero-shot); the author states that public JevBench items were not used. We did not inspect the training examples or verify overlap. SERVING: measured through the author's own documented HTTP server on CUDA, bf16, CUDA graphs and the FLA kernel; the author's own 74.9% JevBench figure used float32 on Apple MPS and is not an official result. The multimodal tower is present but unused on this text draw. Contributor code ran only on a disposable rented pod. ITEMS: all 1,500 items of the draw were sent; the 5 longest items exceed the model's 32,768-token input limit and were refused (HTTP 400), scored as misses and kept in the denominator. TOKENS: output tokens reported as 0 (native probability distribution readout, no text generation); input is the server's native usage. "+DRAW_NOTE+' '+TOPIC+'; its use-case and language cells are measured on its own draw. LATENCY: p50 {P50}, p95 {P95}, maximum {MAX}.'),
'cost_basis':("ESTIMATE (*est.), base-model market reference Qwen/Qwen3.5-2B through the frozen pricing module's reference(): deepinfra:Qwen/Qwen3.5-2B, USD 0.02 per million input tokens and USD 0.10 per million output tokens (frozen pricing module sha256 645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4). Native usage: {TIN} input tokens and 0 output tokens on the {N} common items; output 0 as reported, with no nominal token added. {FIG} Estimated model tariff, not charged usage or a host quote; GPU rental is separate.")}
