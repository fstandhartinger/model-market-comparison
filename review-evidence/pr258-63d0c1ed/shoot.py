import json, sys
from playwright.sync_api import sync_playwright
BASE = "http://localhost:3917"
SCEN = [
  ("decisio-vs-jev", "/jev-models", "decisio-gemma-4-31b-v080", "jev-1.13.0", ["cat-usecases", "cat-topics", "types"]),
  ("mirror-vs-jev", "/jev-models", "mirror", "jev-1.13.0", ["types", "tiers-open", "cat-usecases"]),
  ("gte-vs-jev", "/jev-models", "gte-reranker-modernbert-base", "jev-1.13.0", ["types"]),
  ("omnijev-vs-wity", "/image-jev-bench", "omnijev_9b_v4_tzcfly", "wity_1", ["cat-capabilities", "cat-usecases"]),
]
out = []
with sync_playwright() as p:
  b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--headless=new"])
  for vw, vh in [(390, 844), (1440, 1000)]:
    for name, path, A, B, figs in SCEN:
      ctx = b.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=1, has_touch=(vw == 390))
      pg = ctx.new_page()
      pg.goto(f"{BASE}{path}?compare={A},{B}", wait_until="load", timeout=60000); pg.wait_for_selector("[data-bh-jev15-compare] svg[data-bh-jev12-radar-svg]", timeout=30000)
      pg.wait_for_timeout(1500); pg.add_style_tag(content='[data-bh-fastlane-banner]{display:none!important}')
      sec = pg.locator("[data-bh-jev15-compare]").first
      r = {"scenario": name, "viewport": vw, "url": pg.url,
           "pairA": sec.get_attribute("data-bh-jev15-compare-a"), "pairB": sec.get_attribute("data-bh-jev15-compare-b"),
           "overflowX": pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"), "figs": {}}
      for f in figs:
        fig = sec.locator(f'[data-bh-jev15-radar="{f}"]')
        if fig.count() == 0: r["figs"][f] = "absent"; continue
        fig.scroll_into_view_if_needed()
        svg = fig.locator("svg[data-bh-jev12-radar-svg]")
        info = fig.evaluate("""(el) => {
          const s = el.querySelector('svg[data-bh-jev12-radar-svg]');
          if (!s) return {svg: false, text: el.innerText.slice(0, 200)};
          const ser = [...s.querySelectorAll('[data-bh-jev12-radar-series]')].map(g => ({k: g.dataset.bhJev12RadarSeries, shape: g.dataset.bhRadarShape, gaps: g.dataset.bhRadarGaps ?? null, markers: g.querySelectorAll('circle,rect').length}));
          const vals = [...s.querySelectorAll('[data-bh-jev12-radar-value],[data-bh-radar-key-value]')].map(t => (t.getAttribute('data-bh-jev12-radar-value') || t.getAttribute('data-bh-radar-key-value')) + '=' + t.textContent.replace(/^\\s*·\\s*/, ''));
          const keyVals = [...el.querySelectorAll('[data-bh-radar-key-value]')].map(t => t.getAttribute('data-bh-radar-key-value') + '=' + t.textContent.replace(/^\\s*·\\s*/, ''));
          return {svg: true, domain: s.dataset.bhRadarDomain ?? 'default', zeroRing: !!s.querySelector('[data-bh-radar-zero-ring]'),
            ringLabels: [...s.querySelectorAll('[data-radar-ring]')].map(t => t.textContent), series: ser,
            values: vals.concat(keyVals).slice(0, 60), scaleCaption: el.querySelector('[data-bh-radar-scale]')?.textContent ?? null,
            zeroNote: el.querySelector('[data-bh-radar-zero-note]')?.textContent ?? null,
            figW: el.getBoundingClientRect().width, svgW: s.getBoundingClientRect().width};
        }""")
        if info.get("svg"):
          hit = svg.locator('circle[role="button"]').last
          if hit.count():
            if vw == 1440:
              hit.hover(timeout=5000); pg.wait_for_timeout(150); info["hoverPressed"] = hit.get_attribute("aria-pressed")
              pg.mouse.move(0, 0); pg.wait_for_timeout(100)
            else:
              hit.tap(timeout=5000); pg.wait_for_timeout(150); info["tapPressed"] = hit.get_attribute("aria-pressed")
            hit.focus(); pg.wait_for_timeout(100); info["focusPressed"] = hit.get_attribute("aria-pressed")
            info["tooltipText"] = fig.locator("[data-bh-jev-radar-interactive]").inner_text()[:160]
            fig.screenshot(path=f"/tmp/rv/shots/{name}-{vw}-{f}-tooltip.png")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(100); info["afterEscapePressed"] = hit.get_attribute("aria-pressed")
            pg.mouse.move(0, 0); hit.evaluate("e => e.blur()")
        fig.screenshot(path=f"/tmp/rv/shots/{name}-{vw}-{f}.png")
        r["figs"][f] = info
      # Reference button + archive isolation: reference button selects Jev as B; archive section (if any) keeps its own pair.
      ref = sec.locator("[data-bh-jev-reference-compare]")
      r["referenceButton"] = ref.count() > 0
      others = pg.locator("[data-bh-jev15-compare]")
      r["compareSections"] = [(others.nth(i).get_attribute("data-bh-jev15-compare-a"), others.nth(i).get_attribute("data-bh-jev15-compare-b")) for i in range(others.count())]
      out.append(r)
      ctx.close()
  b.close()
json.dump(out, open("/tmp/rv/results.json", "w"), indent=1)
for r in out:
  print(r["scenario"], r["viewport"], "A/B", r["pairA"], r["pairB"], "overflowX", r["overflowX"], "sections", r["compareSections"])
  for f, i in r["figs"].items():
    if not isinstance(i, dict) or not i.get("svg"): print("  ", f, i); continue
    print("  ", f, i["domain"], "zeroRing", i["zeroRing"], i["ringLabels"], [(s["k"], s["shape"], s["gaps"], s["markers"]) for s in i["series"]],
          "hover/tap", i.get("hoverPressed") or i.get("tapPressed"), "focus", i.get("focusPressed"), "esc", i.get("afterEscapePressed"), "svgW", round(i["svgW"]), "figW", round(i["figW"]))
