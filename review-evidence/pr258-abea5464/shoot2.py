import json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:3918"
ROWS = ["xor-26b-a4b-nvfp4", "wald-q4b-v11", "janus-08b-gpu", "decision2-kai-0.6b"]
INFO_JS = """(el) => {
  const s = el.querySelector('svg[data-bh-jev12-radar-svg]');
  const ser = [...s.querySelectorAll('[data-bh-jev12-radar-series]')].map(g => ({shape: g.dataset.bhRadarShape, gaps: g.dataset.bhRadarGaps ?? null, markers: g.querySelectorAll('circle,rect').length}));
  const vals = [...el.querySelectorAll('[data-bh-jev12-radar-value],[data-bh-radar-key-value]')].map(t => (t.getAttribute('data-bh-jev12-radar-value') || t.getAttribute('data-bh-radar-key-value')) + '=' + t.textContent.replace(/^\\s*·\\s*/, ''));
  return {domain: s.dataset.bhRadarDomain ?? 'default', labelMode: s.dataset.bhRadarLabelMode, zeroRing: !!s.querySelector('[data-bh-radar-zero-ring]'),
    ringLabels: [...s.querySelectorAll('[data-radar-ring]')].map(t => t.textContent), series: ser, values: [...new Set(vals)],
    desc: s.querySelector('desc')?.textContent, caption: el.querySelector('[data-bh-radar-scale]')?.textContent ?? null,
    keyItems: el.querySelectorAll('[data-bh-radar-key-item]').length, svgW: Math.round(s.getBoundingClientRect().width), boxW: Math.round(el.getBoundingClientRect().width)};
}"""
out = {"historical": [], "current": [], "banner": {}}
with sync_playwright() as p:
  b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--headless=new"])
  for vw, vh in [(390, 844), (1440, 1000)]:
    ctx = b.new_context(viewport={"width": vw, "height": vh}, has_touch=(vw == 390))
    pg = ctx.new_page()
    pg.goto(f"{BASE}/jev-models/v1.5.7", wait_until="load", timeout=60000)
    pg.wait_for_selector("[data-jevbench-historical-supplement]", timeout=30000); pg.wait_for_timeout(1500)
    # 1) Ordinary page, banner not dismissed: open the XOR row and capture the viewport with the overlay.
    d = pg.locator("details#historical-xor-26b-a4b-nvfp4"); d.locator("summary").click(); pg.wait_for_timeout(300)
    d.locator("svg[data-bh-jev12-radar-svg]").first.scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    pg.screenshot(path=f"/tmp/rv2/shots/banner-visible-{vw}.png")
    ban = pg.locator("[data-bh-fastlane-banner]")
    out["banner"][vw] = {"present": ban.count() > 0, "box": ban.first.bounding_box() if ban.count() else None}
    close = pg.locator('button[aria-label="Close priority evaluation banner for this session"]')
    out["banner"][vw]["closeButton"] = close.count()
    if close.count():
      if not close.first.is_visible():
        pg.locator("[data-bh-fastlane-teaser]").first.click(); pg.wait_for_timeout(300)
      close.first.click(); pg.wait_for_timeout(300)
    out["banner"][vw]["afterClose"] = pg.locator("[data-bh-fastlane-banner]").count()
    for key in ROWS:
      d = pg.locator(f'details[id="historical-{key}"]')
      if d.get_attribute("open") is None: d.locator("summary").click(); pg.wait_for_timeout(300)
      for dim in ["topics", "usecases"]:
        fig = d.locator(f"svg[aria-labelledby^='history-{key}-{dim}-t']").first.locator("xpath=ancestor::div[h4][1]")
        fig.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        info = fig.evaluate(INFO_JS); info.update(row=key, dim=dim, vw=vw)
        hit = fig.locator('svg circle[role="button"]').last
        if vw == 1440: hit.hover(timeout=5000); pg.wait_for_timeout(150); info["hoverPressed"] = hit.get_attribute("aria-pressed"); pg.mouse.move(0, 0); pg.wait_for_timeout(100); info["afterMouseLeave"] = hit.get_attribute("aria-pressed")
        else: hit.tap(timeout=5000); pg.wait_for_timeout(150); info["tapPressed"] = hit.get_attribute("aria-pressed")
        hit.focus(); pg.wait_for_timeout(100); info["focusPressed"] = hit.get_attribute("aria-pressed"); info["hitLabel"] = hit.get_attribute("aria-label")
        info["tooltip"] = fig.locator("[data-bh-jev-radar-interactive]").inner_text()[-200:]
        if key in ("janus-08b-gpu", "xor-26b-a4b-nvfp4"): fig.screenshot(path=f"/tmp/rv2/shots/hist-{key}-{dim}-{vw}-tooltip.png")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(100); info["afterEscape"] = hit.get_attribute("aria-pressed"); hit.evaluate("e => e.blur()")
        fig.screenshot(path=f"/tmp/rv2/shots/hist-{key}-{dim}-{vw}.png")
        out["historical"].append(info)
    out.setdefault("overflowX", {})[f"v157-{vw}"] = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    ctx.close()
  # Cheap current-page re-checks at 390 (unchanged source except the identical rim expression).
  for name, path, A, B, f in [("mirror-vs-jev", "/jev-models", "mirror", "jev-1.13.0", "types"), ("omnijev-vs-wity", "/image-jev-bench", "omnijev_9b_v4_tzcfly", "wity_1", "cat-capabilities")]:
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True); pg = ctx.new_page()
    pg.goto(f"{BASE}{path}?compare={A},{B}", wait_until="load", timeout=60000); pg.wait_for_selector("[data-bh-jev15-compare] svg[data-bh-jev12-radar-svg]", timeout=30000); pg.wait_for_timeout(1200)
    fig = pg.locator(f'[data-bh-jev15-compare] [data-bh-jev15-radar="{f}"]').first; fig.scroll_into_view_if_needed()
    info = fig.evaluate(INFO_JS); info.update(name=name, fig=f, overflowX=pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"))
    fig.screenshot(path=f"/tmp/rv2/shots/current-{name}-390-{f}.png"); out["current"].append(info); ctx.close()
  b.close()
json.dump(out, open("/tmp/rv2/results.json", "w"), indent=1)
print("banner", out["banner"], "overflow", out["overflowX"])
for i in out["historical"]:
  print(i["vw"], i["row"], i["dim"], i["domain"], i["labelMode"], "zeroRing", i["zeroRing"], i["ringLabels"], i["series"], "keyItems", i["keyItems"],
        "hov/tap", i.get("hoverPressed") or i.get("tapPressed"), "focus", i["focusPressed"], "esc", i["afterEscape"], "svgW", i["svgW"], "/", i["boxW"])
  print("    neg/zero/thin:", [v for v in i["values"] if "-" in v.split("=")[1] or v.split("=")[1].startswith("0.0") or "n=" in v][:12])
for i in out["current"]: print("current", i["name"], i["fig"], i["domain"], i["series"], i["values"][:6], "overflowX", i["overflowX"])
