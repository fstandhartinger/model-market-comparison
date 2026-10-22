#!/usr/bin/env python3
"""preview/card-v1640.png: changed top fives of v1.6.40 (Fastino GLiDE hosted), phone-readable, from receipts/topfive-diff.json + topfive-after.json."""
import asyncio, html, json, pathlib
from playwright.async_api import async_playwright
J = pathlib.Path(__file__).resolve().parent
d = json.loads((J / "receipts/topfive-diff.json").read_text()); a = json.loads((J / "receipts/topfive-after.json").read_text())
disp = {}
for g in a["full_rankings"].values():
    for m in g.values():
        for arr in m.values():
            for r in arr: disp[r["key"]] = r["display"]
K = "fastino-glide-api"
short = lambda k: {K: "Fastino GLiDE (API, new)", "subq-snap-preview": "SubQ Snap preview"}.get(k, (disp.get(k) or k).replace(" (Nace AI)", ""))
res = json.loads((J.parents[1] / "data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.40-results.json").read_text())
n = next(x for x in res["systems"] if x["key"] == K)
LAB = {"composites/A": "Composite A", "composites/B": "Composite B", "composites/C": "Composite C", "capability/official_caps": "Capability (official caps)",
       "capability/cost_off_latency_2x": "Capability (cost cap off, latency 2x)", "capability/latency_none": "Capability (no latency cap)",
       "extra_capability/cost_7x": "Capability (cost cap 7x)", "extra_capability/cost_10x": "Capability (cost cap 10x)",
       "extra_capability/cost_7x_latency_none": "Capability (cost 7x, no latency cap)", "extra_capability/cost_10x_latency_none": "Capability (cost 10x, no latency cap)"}
VIEW = {"all": "Combined board", "api": "API board"}
chg = [r for r in d["rows"] if r["changed"] and r["view"] in VIEW]
f2 = lambda v: f"{v:.2f}"
rows = "".join(f"<div class=r><div class=h>{VIEW[r['view']]} · {LAB[r['metric']]}</div><div class=a>" + "".join(
    f"<span class='{'n' if k == K else ''}'>{i+1}. {html.escape(short(k))}</span>" for i, k in enumerate(r['after'])) + "</div></div>" for r in chg)
doc = f"""<!doctype html><meta charset=utf-8><style>
body{{margin:0;background:#101724;color:#f2f5fa;font:30px/1.25 system-ui,sans-serif;width:1080px}}.w{{padding:36px}}h1{{font-size:44px;margin:0 0 6px}}
.s{{color:#a5b2c9;font-size:28px;margin-bottom:22px}}.k{{display:flex;gap:16px;margin:10px 0 26px}}.k div{{background:#18253d;border-radius:14px;padding:14px 18px;flex:1}}.k b{{font-size:40px;color:#42d4e8}}
.r{{background:#18253d;border-radius:14px;padding:12px 18px;margin:12px 0}}.h{{color:#ffb15b;font-size:27px;margin-bottom:4px}}.a span{{display:inline-block;margin-right:16px;font-size:27px}}.n{{color:#42d4e8;font-weight:700}}</style>
<div class=w><h1>Fastino GLiDE (hosted) enters {d['changed_lists']} of 40 top fives</h1>
<div class=s>v1.6.40, scored on 1,497 of 1,500 items (3 already-seen items never sent). API + combined boards only; no open-weights list changes. Release GO: glide-api-release-go.</div>
<div class=k><div>Composite A<br><b>{f2(n['scores']['A'])}</b></div><div>Capability<br><b>{f2(n['capability'])}</b></div><div>Cost / 1k<br><b>${n['cost']['usd_per_1000']:.4f}</b></div><div>Rank A<br><b>#{n['ranks']['A']}</b></div></div>{rows}</div>"""
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path='/home/flori/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell')
        pg = await br.new_page(viewport={"width": 1080, "height": 800}); await pg.set_content(doc)
        await pg.screenshot(path=str(J / "preview/card-v1640.png"), full_page=True); await br.close()
asyncio.run(main()); print("ok", len(chg))
