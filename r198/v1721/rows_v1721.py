"""Public row text from the pinned VisionJEV 1.0.0 preregistration; no sealed strings."""
KEY='visionjev-1.0.0-27b'
DISPLAY='VisionJEV 1.0.0'
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
import json,pathlib
ROW=json.loads((pathlib.Path(__file__).resolve().parent/'inputs/ROW.json').read_text())
