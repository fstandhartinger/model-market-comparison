import asyncio, sys, json, hashlib, urllib.request, pathlib
from playwright.async_api import async_playwright

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
BASE = "http://127.0.0.1:3638"
V = W / "data/raw/benchmarks/jevbench/v1.6"
res = json.loads((V / "jevbench-v1.6.38-results.json").read_text())
by = {s["key"]: s for s in res["systems"]}
variant = "A" if by["drex-max"]["ranked"] else "B"
shots = J / "shots" / variant
shots.mkdir(parents=True, exist_ok=True)
out = {}


async def main():
    with urllib.request.urlopen(BASE + "/api/jevbench/v1.6.38") as r:
        b = r.read()
        d = json.loads(b)
        assert (
            r.status == 200
            and d["revision"] == "v1.6.38"
            and d["n_ranked"] == res["n_ranked"]
            and len(d["systems"]) == 75
        )
        assert hashlib.sha256(b).hexdigest() == r.headers["X-Content-SHA256"]
        out["api"] = {"status": 200, "sha256": hashlib.sha256(b).hexdigest()}
        for k in ["drex-max", "iota-decide-4b", "launchables-myles-g-12b"]:
            assert next(s for s in d["systems"] if s["key"] == k) == by[k]
    with urllib.request.urlopen(BASE + "/api/jevbench/latest") as r:
        d = json.loads(r.read())
        out["latest_feed"] = {
            k: sum(s["key"] == k for s in d["systems"])
            for k in ["drex-max", "iota-decide-4b", "launchables-myles-g-12b"]
        }
        assert all(n == 1 for n in out["latest_feed"].values()), out["latest_feed"]
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9333")
        ctx = browser.contexts[0]
        pages = [
            ("/jev-models", "open"),
            ("/jev-models/api", "api"),
            ("/jev-models/all", "all"),
            ("/jev-models/v1.6.38", "release"),
            ("/jev-models/iota-decide-4b", "system-iota"),
            ("/jev-models/drex-max", "system-drex"),
            ("/jev-models/launchables-myles-g-12b", "system-myles"),
            ("/jev-models/v1.6.37", "archive-v1637"),
        ]
        for path, name in pages:
            page = await ctx.new_page()
            try:
                await page.set_viewport_size({"width": 1400, "height": 1000})
                errors = []
                page.on(
                    "pageerror",
                    lambda e: errors.append({"message": str(e), "stack": e.stack}),
                )
                r = await page.goto(BASE + path, wait_until="load", timeout=180000)
                assert r.status == 200, (path, r.status)
                await page.wait_for_timeout(1500)
                await page.mouse.move(1399, 5)
                await page.evaluate(
                    "document.querySelectorAll('main details').forEach(x=>x.open=true);document.querySelectorAll('header details').forEach(x=>x.open=false)"
                )
                for y in range(
                    0,
                    min(await page.evaluate("document.body.scrollHeight"), 18000),
                    1200,
                ):
                    await page.evaluate("(y)=>window.scrollTo(0,y)", y)
                    await page.wait_for_timeout(80)
                await page.evaluate("window.scrollTo(0,0)")
                await page.screenshot(path=str(shots / (name + "-top.png")))
                app = [e for e in errors if "chrome-extension://" not in e["stack"]]
                assert not app, (path, app)
                text = await page.locator("body").first.inner_text()
                out[path] = {
                    "status": r.status,
                    "page_errors": app,
                    "mentions_new": {
                        k: k.lower() in text.lower()
                        for k in by
                        if k
                        in ["drex-max", "iota-decide-4b", "launchables-myles-g-12b"]
                    },
                }
                if name == "system-drex" and variant == "B":
                    assert "API offering, listed but not ranked" in text
                    assert "API offering, ranked on the API leaderboard" not in text
                if name.startswith("system-"):
                    assert any(
                        k.lower() in text.lower()
                        for k in ["drex", "iota-decide", "myles"]
                    ), path
                if name == "release":
                    assert "Capability by subject topic" in text
                    assert "Use cases (TypeSafe categories)" in text
                if name == "release":
                    assert all(
                        k in text for k in ["Drex Max", "Myles-G 12B", "iota-decide-4b"]
                    )
            finally:
                await page.close()
        page = await ctx.new_page()
        try:
            await page.set_viewport_size({"width": 1400, "height": 1000})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.set_viewport_size({"width": 1400, "height": 2000})
            await page.goto((J / "preview/preview-full-ranking.html").as_uri())
            await page.wait_for_timeout(400)
            assert await page.locator("svg").count() == 3
            assert (
                await page.locator(
                    'select#left option[value="quyet-1-0-large"]'
                ).count()
                == 1
            )
            assert not errors, errors
            await page.screenshot(path=str(shots / "preview-top.png"))
            out["preview"] = {"radars": 3, "page_errors": errors}
        finally:
            await page.close()
    (J / "receipts" / ("LOCAL-RENDER-" + variant + ".json")).write_text(
        json.dumps(out, indent=1) + "\n"
    )
    print(json.dumps(out, indent=1))


asyncio.run(main())
