"""v1.7.15 public text for the one new row, microsoft-decision-1-r2 (Microsoft-Decision-1 with updated weights, paid public evaluation,
hosted API) on draw v1.6-regular-20261027, shown UNRANKED like every row on that draw. Internal ids (order, credit, mailbox, board, roles) are not published; every quoted number
is re-derived in prepare_v1715.py from the scorer outputs and the validation receipt."""
KEY = 'microsoft-decision-1-r2'
DISPLAY = 'Microsoft-Decision-1 (updated weights, Oct 2026)'
# The draw sentence shared by every row on the 27 Oct draw (same words as the v1.7.13/v1.7.14 rows): the draw is not equated.
DRAW_NOTE = ("DRAW: measured on the 27 Oct 2026 regular draw (fresh sealed items; not yet equated to the reference scale, so its numbers "
             "are shown as published, offset 0).")
# The public not-ranked note of every row on the 27 Oct draw (decision d1027-strong-anchors-needed): the six carried rows' notes are
# replaced with it (H2O-Lightning-4B v1.4.1 keeps its extra v1.1 comparison sentence) and the new row carries it.
NOTE_HEAD = ("Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.")
NOTE_TAIL = "Shown unranked until then."
NOT_RANKED_BECAUSE = NOTE_HEAD + ' ' + NOTE_TAIL
H2O_KEY = 'h2o-lightning-4b-v1.4.1'
H2O_EXTRA = 'On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.'
def note_for(key):
    return NOTE_HEAD + (' ' + H2O_EXTRA if key == H2O_KEY else '') + ' ' + NOTE_TAIL
ROW = {
 'display': DISPLAY, 'author': 'Microsoft', 'provider': 'microsoft',
 'repo': 'https://commandline.microsoft.com/microsoft-decision-1-model-foundry/',
 'model_pin': {'deployment': 'Decision-1', 'model': 'Microsoft-Decision-1', 'provider': 'Microsoft/Azure Foundry', 'response_model': 'microsoft-decision-1',
               'version': 'updated weights, Oct 2026 (per Microsoft; served model id unchanged)'},
 'endpoint_condition': ("Vendor-hosted Azure AI Foundry deployment (Sweden Central), native API; latency measured from our server in Germany. "
                        "1,489 of 1,493 requests answered (HTTP 200); 4 were refused by the server because the prompt exceeded its 32,768-token "
                        "context limit and are scored wrong; no decision took longer than 10 s."),
 'disclosure': ("SECOND MEASUREMENT (paid evaluation, public) of Microsoft-Decision-1 after a weights update reported by Microsoft. The served "
                "model id (microsoft-decision-1) is identical to the first measurement; we cannot verify a weights change behind an API. "
                "The first measurement (10 Oct 2026, another draw) stays listed unchanged as Microsoft-Decision-1 (Azure Foundry). "
                "ITEMS: n = 1,493 of the draw's 1,500 items (1,193 sealed + 300 public): 7 sealed items are excluded because this provider "
                "had seen them in an earlier evaluation, so every score, the speed and the cost are computed on those 1,493 items. "
                + DRAW_NOTE + " This draw has no subject-topic labels yet, so the row has no topic cells; its use-case and language cells "
                "are measured on its own 1,493 items. LATENCY: p50 {P50}, p95 {P95}, maximum {MAX}."),
 'cost_basis': ("Advertised Azure Foundry tariff USD 0.042 per million input tokens, output free (same basis as the first "
                "Microsoft-Decision-1 row); provider-reported usage on all n = 1,493 decisions ({TIN} input and {TOUT} output tokens), the "
                "4 refused requests kept in the denominator: USD {USD} per 1,000 decisions. Billed invoice unknown."),
}
