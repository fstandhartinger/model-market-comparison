#!/usr/bin/env python3
"""Render a concise approval image from the refreshed v1.6.43 preview."""
import asyncio
import html
import json
from pathlib import Path

J = Path(__file__).resolve().parent
BUILD = J
REPO = J.parents[1]
diff = json.loads((BUILD / 'receipts/topfive-diff.json').read_text())
results = json.loads((REPO / 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.43-results.json').read_text())
by = {x['key']: x for x in results['systems']}
new, old = by['subq-snap-1.1'], by['subq-snap-preview']

def nice(key):
    return {
        'subq-snap-1.1': 'SubQ Snap 1.1',
        'subq-snap-preview': 'SubQ preview',
        'nimble-v4-max': 'Nimble-v4-max',
        'drex-max': 'Drex Max',
    }.get(key, key)

def f(value):
    return f'{value:.2f}'

changed = [x for x in diff['rows'] if x['changed']]
assert diff['changed_lists'] == 14 and diff['merged_variants'] + diff['release_lists'] == 40
selected = changed
sections = []
for x in selected:
    label = f"{x['view'].title()} · {x['metric']}"
    before = ' · '.join(f"{i+1}. {nice(k)}" for i, k in enumerate(x['before']))
    after = ' · '.join(f"{i+1}. {nice(k)}" for i, k in enumerate(x['after']))
    sections.append(f"<section><b>{html.escape(label)}</b><div><span>Before</span>{html.escape(before)}</div><div><span>After</span>{html.escape(after)}</div></section>")

def radar_svg(a, b):
    labels = ['Intelligence', 'Calibration', 'Speed', 'Cost']
    vals_a = [a['axes'][k] for k in ('intelligence', 'calibration', 'speed', 'cost')]
    vals_b = [b['axes'][k] for k in ('intelligence', 'calibration', 'speed', 'cost')]
    cx, cy, radius, n = 260, 205, 128, 4
    def pt(i, value):
        import math
        angle = 2 * math.pi * i / n - math.pi / 2
        return (cx + radius * value / 100 * math.cos(angle), cy + radius * value / 100 * math.sin(angle))
    paths = []
    for i in range(1, 5):
        coords = [pt(j, i * 25) for j in range(n)]
        paths.append('<polygon points="' + ' '.join(f'{x:.1f},{y:.1f}' for x,y in coords) + '" fill="none" stroke="#34435f"/>')
    for vals, color in ((vals_a, '#42d4e8'), (vals_b, '#ffb15b')):
        coords = [pt(i, v) for i,v in enumerate(vals)]
        paths.append(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x,y in coords)}" fill="{color}" fill-opacity=".18" stroke="{color}" stroke-width="3"/>')
    for i, label in enumerate(labels):
        x,y = pt(i, 118)
        paths.append(f'<text x="{x:.1f}" y="{y:.1f}" fill="#dce6f4" text-anchor="middle" font-size="16">{label}</text>')
    return '<svg width="520" height="410" viewBox="0 0 520 410">' + ''.join(paths) + '</svg>'

html_doc = f'''<!doctype html><meta charset="utf-8"><style>
*{{box-sizing:border-box}} body{{margin:0;width:1080px;background:#101724;color:#edf2fa;font:24px/1.25 system-ui,sans-serif}}
.wrap{{padding:34px}}h1{{font-size:45px;line-height:1.08;margin:0 0 9px}}.muted{{color:#a8b5ca;font-size:22px}}
.pillrow{{display:flex;gap:12px;margin:24px 0}}.pill{{background:#1a2740;border:1px solid #2a3a57;border-radius:15px;padding:14px 18px;flex:1}}
.pill strong{{display:block;color:#42d4e8;font-size:34px;margin-top:5px}}h2{{font-size:26px;margin:28px 0 12px;color:#ffb15b}}
section{{background:#1a2740;border-radius:12px;padding:9px 14px;margin:7px 0;font-size:16px}}section b{{display:block;color:#ffb15b;font-size:18px;margin-bottom:4px}}section div{{margin-top:3px}}section span{{color:#93a3be;margin-right:8px}}
.radar{{display:flex;align-items:center;gap:20px;background:#1a2740;border-radius:15px;padding:14px}}.legend div{{margin:9px 0}}.c1{{color:#42d4e8}}.c2{{color:#ffb15b}}
.foot{{margin-top:18px;padding:16px;background:#18253d;border-radius:14px;font-size:18px}}
</style><div class="wrap">
<h1>SubQ Snap 1.1 · refreshed v1.6.43 preview</h1>
<div class="muted">14 of 40 top-five lists still change. This refresh moves SubQ from #4 to #5 on combined/release Composite A and C, displacing Nimble-v4-max instead of Drex Max. API composite A and Capability remain #4.</div>
<div class="pillrow"><div class="pill">Composite A / B / C<strong>{f(new['scores']['A'])} / {f(new['scores']['B'])} / {f(new['scores']['C'])}</strong></div><div class="pill">Capability<strong>{f(new['capability'])}</strong></div><div class="pill">USD per 1,000<strong>${new['cost']['usd_per_1000']:.4f}</strong></div><div class="pill">Answers<strong>1,500 / 1,500</strong></div></div>
<h2>All 14 changed top-five lists (v1.6.42 → v1.6.43)</h2><div class="muted">The other 26 of 40 lists are unchanged. Open-weights lists stay unchanged.</div>
{''.join(sections)}
<h2>SubQ model comparison · measured axes</h2><div class="radar">{radar_svg(new, old)}<div class="legend"><div class="c1">● SubQ Snap 1.1 — new</div><div class="c2">● SubQ preview — 13 Oct</div><p class="muted">New score: Intelligence {f(new['axes']['intelligence'])}, Calibration {f(new['axes']['calibration'])}, Speed {f(new['axes']['speed'])}, Cost {f(new['axes']['cost'])}.</p></div></div>
<div class="foot">Disclosure: same-author second use; the provider saw these sealed items on 13 Oct through the preview run. The sealed-vs-public check is not flagged. <b>Fresh Florian GO required before release</b> because the refreshed top-five position and displaced row differ from card #18406.</div>
</div>'''

async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/home/flori/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell')
        page = await browser.new_page(viewport={'width': 1080, 'height': 900}, device_scale_factor=1)
        await page.set_content(html_doc)
        await page.screenshot(path=str(J / 'preview/card-v1643.png'), full_page=True)
        await browser.close()

asyncio.run(main())
print(J / 'preview/card-v1643.png')
