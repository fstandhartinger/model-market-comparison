"""v1.7.16 public text: the one new row, strike-1 (hosted API, provider Strike, EU), on draw v1.6-regular-20261027, shown UNRANKED like
every row on that draw; and the same-items cost sentence every d1027 row's cost basis now carries (v1.6.30 precedent on
v1.6-regular-20261012). Internal ids (submission, kit, board, roles) are not published; every quoted number is re-derived in
prepare_v1716.py from the scorer outputs and the sealed raw (aggregates only)."""
import re
KEY = 'strike-1'
DISPLAY = 'Strike-1'
DRAW_ID = 'v1.6-regular-20261027'
CAP = 0.06459465517241379
# The draw sentence shared by every row on the 27 Oct draw (same words as the v1.7.13-v1.7.15 rows): the draw is not equated.
DRAW_NOTE = ("DRAW: measured on the 27 Oct 2026 regular draw (fresh sealed items; not yet equated to the reference scale, so its numbers "
             "are shown as published, offset 0).")
TOPIC = "This draw has no subject-topic labels yet, so the row has no topic cells"
# The carried public not-ranked note of every row on the 27 Oct draw (unchanged from v1.7.15; H2O-Lightning-4B v1.4.1 keeps its v1.1 sentence).
NOTE_HEAD = ("Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.")
NOTE_TAIL = "Shown unranked until then."
NOT_RANKED_BECAUSE = NOTE_HEAD + ' ' + NOTE_TAIL
H2O_KEY = 'h2o-lightning-4b-v1.4.1'
MSFT_KEY = 'microsoft-decision-1-r2'
H2O_EXTRA = 'On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.'
STRIKE_NOTE = "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then."
def note_for(key):
    if key == KEY: return STRIKE_NOTE
    return NOTE_HEAD + (' ' + H2O_EXTRA if key == H2O_KEY else '') + ' ' + NOTE_TAIL
# ---- same-items cost rule (every d1027 row)
def same_items_sentence(n, usd_all):
    return (f"Cost on the {n:,} items every row on this draw answered (same-items rule); all-items cost USD {usd_all:.6f} per 1,000 decisions.")
def cost_figures(usd, n, usd_all):
    return (f"COST FIGURES: USD {usd:.6f} per 1,000 decisions, {usd / CAP:.2f}x the official cost cap USD 0.064595. "
            + same_items_sentence(n, usd_all))
# Old all-items sentence of the six v1.7.13/v1.7.14 rows; replaced by cost_figures(...).
OLD_FIGURES = re.compile(r"COST FIGURES: USD (\d\.\d{6}) per 1,000 decisions over all 1,500 items of the draw \((?:every row on this draw is costed on all 1,500 items|the first row on this draw, so no common cost basis applies)\); (\d\.\d\d)x the official cost cap USD 0\.064595\.")
H2O_OLD_UNTRIM = "Priced on the untrimmed count it would be USD 0.019044 per 1,000 decisions."
H2O_NEW_UNTRIM = ("No state among those items is trimmed, so the processed and untrimmed counts agree there; over all items, priced on the "
                  "untrimmed count it would be USD 0.019044 per 1,000 decisions.")
DECISIO_KEY = 'decisio-gemma-4-12b-tuned-commit-think'
DECISIO_EXTRA = ("On those items the engine-processed input is {ENG} tokens (exact to within 6 tokens: the per-item recount is kept as "
                 "totals only) and the output {OUT} tokens.")
# Microsoft r2: the old basis ended with its own all-1,493 figure; the ITEMS sentence of its disclosure said the cost used all 1,493 items.
MSFT_OLD_TAIL = re.compile(r"provider-reported usage on all n = 1,493 decisions \(467,021 input and 1,489 output tokens\), the 4 refused requests kept in the denominator: USD (\d\.\d{6}) per 1,000 decisions\. Billed invoice unknown\.$")
MSFT_NEW_TAIL = ("provider-reported usage. {FIG} Over all n = 1,493 decisions: 467,021 input and 1,489 output tokens, the 4 refused "
                 "requests in the denominator. Billed invoice unknown.")
MSFT_OLD_ITEMS = "so every score, the speed and the cost are computed on those 1,493 items."
MSFT_NEW_ITEMS = ("so every score and the speed are computed on those 1,493 items; the cost uses the 1,489 items every row on this draw "
                  "answered (same-items rule).")
ROW = {
 'display': DISPLAY, 'author': 'Strike (strike-ai.eu)', 'provider': 'strike',
 'repo': 'https://strike-ai.eu',
 'model_pin': {'model': 'strike-1', 'provider': 'Strike (strike-ai.eu), hosted API', 'region': 'EU, OVH Gravelines (ovh-gra)',
               'response_model': 'strike-1', 'version': 'v20261023 (vendor revision)'},
 'licence': 'Hosted API; weights not published',
 'endpoint_condition': ("Vendor-hosted API in the EU (OVH Gravelines, France), native /v1/systemone; latency measured from our server in "
                        "Germany. 1,495 of 1,500 requests answered (HTTP 200, served model strike-1 on every answer); 5 were refused by the "
                        "server because the input exceeded its limit (8,192 tokens or 32,000 characters) and are scored as misses; no "
                        "decision took longer than 10 s."),
 'disclosure': ("FIRST MEASUREMENT of Strike-1, a hosted decision API (EU, OVH Gravelines). The vendor describes it as a fine-tune of "
                "Qwen/Qwen3.5-4B; the weights are not published, so the base is the vendor's statement. The vendor describes the service "
                "as beta and states that its probabilities are uncalibrated during beta; Calibration is measured on the probabilities as "
                "returned. ITEMS: all 1,500 items of the draw were sent; 5 items over the provider's input limit were refused and are "
                "scored as misses (kept in the denominator). TOKENS: the API reports 0 output tokens on every answer (it returns a "
                "probability distribution and generates no text). " + DRAW_NOTE + " " + TOPIC + "; its use-case and language cells are "
                "measured on its own draw. LATENCY: p50 {P50}, p95 {P95}, maximum {MAX}."),
 'cost_basis': ("ESTIMATE (*est.), hosted API without a counted list price: the vendor's stated base Qwen/Qwen3.5-4B at its market "
                "reference deepinfra:Qwen/Qwen3.5-4B, USD 0.03 per million input tokens and USD 0.15 per million output tokens (frozen "
                "pricing module sha256 645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4), x the vendor-reported usage: "
                "{TIN} input tokens and 0 output tokens on the {N} common items (output 0 as reported: no text is generated). {FIG} "
                "Estimated model tariff, not charged usage or a host quote; the vendor reported no charge for these requests."),
}
