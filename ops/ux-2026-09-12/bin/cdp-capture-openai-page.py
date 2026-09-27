#!/usr/bin/env python3
"""CR-190.3: retain the original document bytes of a 403-for-plain-clients openai.com page.

Same discipline as jobs/bh-launch-ingest-20260922-14247142/cdp_capture.py (the reviewed
precedent behind openai-agents-last-exam::v1): the page is opened once in the SHARED desktop
Chrome on CDP 9333 under the shared fair lock, the bytes the server returned for the document
request are retained unchanged, and the tab is closed again. No challenge is solved, bypassed
or replayed; no downloaded JavaScript is executed here; robots.txt allows the path.
"""
import asyncio, gzip, hashlib, json, os, sys, time
sys.path.insert(0, "/home/flori/x-german-solopreneurs/crawler")
from add_to_list import browser_lock
from playwright.async_api import async_playwright

URL = sys.argv[1]
DEST = sys.argv[2]
CDP = "http://127.0.0.1:9333"
NOTE = ("scripts/capture-vendor-documents.py receives HTTP 403 for this path: openai.com answers a plain HTTP "
        "client with a challenge page even though https://openai.com/robots.txt allows it ('User-agent: *  Allow: /', "
        "only /microsoft-for-startups/ is disallowed). The page was therefore opened once in the shared desktop Chrome "
        "(CDP 9333, one tab, closed afterwards) and the bytes the server returned for the document request were "
        "retained unchanged - no challenge was solved, bypassed or replayed, and no downloaded JavaScript was executed "
        "here. Capture tool: ops/ux-2026-09-12/bin/cdp-capture-openai-page.py.")

async def main():
    os.makedirs(DEST, exist_ok=True)
    async with async_playwright() as p:
        with browser_lock():
            b = await p.chromium.connect_over_cdp(CDP)
            pg = await b.contexts[0].new_page()
            try:
                resp = await pg.goto(URL, wait_until="domcontentloaded", timeout=90000)
                body = await resp.body()
                status = resp.status
                final = resp.url
            finally:
                await pg.close()
    digest = hashlib.sha256(body).hexdigest()
    name = digest[:20] + ".gz"
    path = os.path.join(DEST, name)
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(body)
    rec = {
        "url": URL,
        "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + ".000000+00:00",
        "status": status,
        "file": path.replace("/opt/model-market-comparison/", ""),
        "sha256": digest,  # house convention: the retained body, as capture-vendor-documents.py records it
        "bytes": len(body),
        "evidence": "original_bytes",
        "document_sha256": digest,
        "document_bytes": len(body),
        "final_url": final,
        "capture_method": "desktop_chrome_cdp",
        "capture_note": NOTE,
    }
    rec["gz_sha256"] = hashlib.sha256(open(path, "rb").read()).hexdigest()  # what registry.json evidence[].sha256 must carry
    print(json.dumps(rec, indent=1))
    json.dump(rec, open(os.path.join(DEST, "cdp-receipt.json"), "w"), indent=1)

asyncio.run(main())
