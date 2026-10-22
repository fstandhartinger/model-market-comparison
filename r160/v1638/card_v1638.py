#!/usr/bin/env python3
"""GO-card material for v1.6.38 variant A: card-v1638.png + CARD-DETAILS.md, every number read from the built artifacts.
Usage: card_v1638.py [--fallback-topfive-diff <variant C topfive-diff.json>]"""
import asyncio, collections, hashlib, html, json, pathlib, sys

J = pathlib.Path(__file__).resolve().parent
P = J / "preview"
V = J.parents[1] / "data/raw/benchmarks/jevbench/v1.6"
load = lambda p: json.loads(pathlib.Path(p).read_text())
res = load(V / "jevbench-v1.6.38-results.json")
diff = load(J / "receipts/topfive-diff.json")
after = load(J / "receipts/topfive-after.json")
before = load(J / "receipts/topfive-before.json")
by = {s["key"]: s for s in res["systems"]}
disp = {}
for src in (before, after):
    for groups in src["full_rankings"].values():
        for metrics in groups.values():
            for rows in metrics.values():
                for r in rows:
                    disp[r["key"]] = r["display"]
for k, s in by.items():
    disp[k] = s["display"]
disp = {k: v.split(" (")[0] for k, v in disp.items()}
DREX = "drex-max"
assert DREX in by and by[DREX]["ranked"]
SCOPE = {"all": "Mixed board", "api": "API board", "release": "Release page"}
METRIC = {
    "composites/A": "Composite A", "composites/B": "Composite B", "composites/C": "Composite C",
    "A": "Composite A", "B": "Composite B", "C": "Composite C", "capability": "Capability",
    "capability/official_caps": "Capability (official caps)",
    "capability/latency_none": "Capability (no latency cap)",
    "capability/cost_off_latency_2x": "Capability (cost cap off, 2x latency)",
    "extra_capability/cost_7x": "Capability (7x cost cap)",
    "extra_capability/cost_10x": "Capability (10x cost cap)",
    "extra_capability/cost_7x_latency_none": "Capability (7x cost cap, no latency cap)",
    "extra_capability/cost_10x_latency_none": "Capability (10x cost cap, no latency cap)",
}
changed = [r for r in diff["rows"] if r["changed"]]
assert len(changed) == diff["changed_lists"] and all(r["causes"] == [DREX] for r in changed)
groups = collections.OrderedDict()
for r in changed:
    groups.setdefault((tuple(r["before"]), tuple(r["after"])), []).append(
        (SCOPE[r["view"]] + " " + METRIC[r["metric"]], r["positions"][DREX], r["field"]))
assert sum(len(v) for v in groups.values()) == len(changed)
def where(items):
    pos = sorted({(l.split(" ")[0], p, f) for l, p, f in items})
    return "; ".join(f"{sc} #{p} of {f}" for sc, p, f in pos)
names = lambda keys, bold=None: ", ".join(("<b>%s</b>" if k == bold else "%s") % html.escape(disp[k]) for k in keys)
plain = lambda keys: ", ".join(disp[k] for k in keys)
# composite lists first, then capability lists
is_comp = lambda items: all("Composite" in l for l, _, _ in items)
ordered = [g for g in groups.items() if is_comp(g[1])] + [g for g in groups.items() if not is_comp(g[1])]
NEW = [DREX, "launchables-myles-g-12b", "iota-decide-4b"]
fallback = None
if "--fallback-topfive-diff" in sys.argv:
    fallback = load(sys.argv[sys.argv.index("--fallback-topfive-diff") + 1])
rows_html = "".join(
    "<tr><td>%s</td><td>%s</td><td>%s</td><td style='white-space:nowrap'>%s</td></tr>"
    % (html.escape("; ".join(l for l, _, _ in items)), names(b), names(a, DREX), where(items))
    for (b, a), items in ordered
)
new_html = "".join(
    "<tr><td><b>%s</b></td><td>%.2f</td><td>%.2f</td><td>%.2f</td><td>%.2f</td><td>%s</td><td>#%d / #%d</td><td>USD %.6f</td></tr>"
    % (html.escape(disp[k]), by[k]["scores"]["A"], by[k]["scores"]["B"], by[k]["scores"]["C"], by[k]["capability"],
       "listed price" if by[k]["cost"]["kind"] == "listed" else "estimate", by[k]["ranks"]["A"], by[k]["ranks"]["capability"],
       by[k]["cost"]["usd_per_1000"])
    for k in NEW
)
fb = ""
if fallback:
    fb = ("<p style='margin:10px 0 0;font-size:15px'><b>Fallback without Drex Max</b> (Myles-G 12B and iota-decide-4b only): %d of 40 top-five lists change.</p>"
          % fallback["changed_lists"])
doc = (
    "<html><body style=\"font-family:Arial,sans-serif;width:1360px;padding:20px;background:#fff;color:#111\">"
    "<h2 style='margin:0 0 6px'>JevBench v1.6.38 — Drex Max, Myles-G 12B and iota-decide-4b added</h2>"
    "<p style='margin:0 0 10px;font-size:17px'>Three paid fast-lane rows on the same draw and common cost basis; all 72 existing rows keep their scores and intervals. "
    "<b>%d of 40 top-five lists change, all because of Drex Max</b> (priced at its public launch list price, USD 0.06 per 1M input, output not billed: USD %.6f per 1,000 decisions). "
    "Myles-G 12B (composite A rank %d) and iota-decide-4b (rank %d) enter no top five.</p>"
    "<table style='border-collapse:collapse;font-size:14px;width:100%%' border='1' cellpadding='5'><tr style='background:#eee'>"
    "<th>Lists</th><th>Top five before (v1.6.37 live)</th><th>Top five after (v1.6.38)</th><th>Drex Max</th></tr>%s</table>"
    "<h3 style='margin:14px 0 6px'>The three new rows</h3>"
    "<table style='border-collapse:collapse;font-size:15px;width:100%%' border='1' cellpadding='5'><tr style='background:#eee'>"
    "<th>Row</th><th>Composite A</th><th>B</th><th>C</th><th>Capability</th><th>Cost basis</th><th>Rank A / Capability</th><th>Cost per 1,000</th></tr>%s</table>%s"
    "</body></html>"
) % (diff["changed_lists"], by[DREX]["cost"]["usd_per_1000"], by["launchables-myles-g-12b"]["ranks"]["A"], by["iota-decide-4b"]["ranks"]["A"], rows_html, new_html, fb)
P.mkdir(exist_ok=True)
(P / "card-v1638.html").write_text(doc)

# CARD-DETAILS.md (tables of at most 8 rows)
md = ["# CARD-DETAILS (v1.6.38 variant A, for the Telegram GO card)", "",
      "**What changes.** Three paid fast-lane rows are added on the same draw and common 1,485-item cost basis: Drex Max (Nace AI), Myles-G 12B (Launchables), iota-decide-4b (Macrocosmos). "
      f"{diff['changed_lists']} of 40 top-five lists change, all through Drex Max; Myles-G 12B and iota-decide-4b enter none. All 72 existing rows keep every score and interval; only placement can move.", "",
      f"**Why Drex Max ranks.** It is costed at its public launch list tariff (USD 0.06 per 1M input tokens, output not billed), counted by the re-frozen pricing module (a8a05890; reviewed addition of one key). "
      f"Common-basis cost USD {by[DREX]['cost']['usd_per_1000']:.6f} per 1,000 decisions. Two provider-overloaded failures stay in as failures.", ""]
def table(items, header):
    out = ["|" + "|".join(header) + "|", "|" + "|".join("---" for _ in header) + "|"]
    for g_items, b, a in items:
        out.append(f"|{'; '.join(l for l, _, _ in g_items)}|{plain(b)}|{plain(a)}|{where(g_items)}|")
    assert len(out) - 2 <= 8, len(out) - 2
    return out
comp = [(l, b, a) for (b, a), l in ordered if is_comp(l)]
cap = [(l, b, a) for (b, a), l in ordered if not is_comp(l)]
hdr = ["Lists", "Top five before (v1.6.37 live)", "Top five after (v1.6.38)", "Drex Max position"]
md += ["**Composite lists (Drex Max enters each; it was not listed before).**", ""] + table(comp, hdr) + ["", "**Capability lists.**", ""] + table(cap, hdr) + [""]
md += ["**The three new rows.**", "", "|Row|Composite A|Capability|Rank A / Capability|Cost per 1,000 decisions|", "|---|---|---|---|---|"]
for k in NEW:
    s = by[k]
    md.append(f"|{disp[k]}|{s['scores']['A']:.2f}|{s['capability']:.2f}|#{s['ranks']['A']} / #{s['ranks']['capability']}|USD {s['cost']['usd_per_1000']:.6f} ({s['cost']['kind']})|")
md += [""]
if fallback:
    md += [f"**Fallback (variant C, no Drex Max row).** Myles-G 12B and iota-decide-4b only; {fallback['changed_lists']} of 40 top-five lists change.", ""]
md += ["**Not changed.** The 72 existing rows' scores and intervals, the scorer (02132271), the v1.6 method, the common cost basis; no 10-second rule.", "",
       "**Approval fields (PENDING; the lead fills them after the GO):** card id PENDING; selection PENDING; recorded at PENDING; PNG sha256 PENDING (see preview/card-v1638.png)."]
(P / "CARD-DETAILS.md").write_text("\n".join(md) + "\n")

async def shot():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9333")
        page = await browser.contexts[0].new_page()
        try:
            await page.set_viewport_size({"width": 1400, "height": 300})
            await page.goto((P / "card-v1638.html").as_uri(), wait_until="load")
            await page.screenshot(path=str(P / "card-v1638.png"), full_page=True)
        finally:
            await page.close()
asyncio.run(shot())
print("card-v1638.png", hashlib.sha256((P / "card-v1638.png").read_bytes()).hexdigest())
