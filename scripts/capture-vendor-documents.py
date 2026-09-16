#!/usr/bin/env python3
"""Bounded capture of vendor release documents (model cards, system cards, technical reports).

Same access discipline as scripts/capture-benchmark-sources.py: robots.txt is honoured for our
user agent, one host at a time with a crawl delay, bounded response size and time, no downloaded
code is executed, and a bot challenge stops the host instead of being worked around.

One deviation, for large PDFs only: a model release PDF is regularly 15-25 MB, which does not
belong in a git repository. For a PDF the original bytes are hashed and their length recorded,
and the retained evidence file is the `pdftotext -layout` **text layer** of exactly those bytes
(gzip, page breaks kept as form feeds). Vendor PDF URLs are content-addressed CDN paths, so the
recorded digest lets anyone re-download the document and confirm the extract came from it.
HTML and Markdown sources are retained as their original bytes (gzip), as everywhere else.

Usage: capture-vendor-documents.py URL_LIST.json OUT_DIR [--max-bytes N]
"""
import sys, json, gzip, time, hashlib, subprocess, tempfile, os
import urllib.request, urllib.error, urllib.robotparser, urllib.parse
from pathlib import Path
from datetime import datetime, timezone

UA = 'BenchmarkHeavenResearch/1.0 (+https://github.com/fstandhartinger/model-market-comparison)'
args = [a for a in sys.argv[1:] if not a.startswith('--')]
max_bytes = 32_000_000
if '--max-bytes' in sys.argv:
    max_bytes = int(sys.argv[sys.argv.index('--max-bytes') + 1])
urls = json.loads(Path(args[0]).read_text())
dest = Path(args[1])
dest.mkdir(parents=True, exist_ok=True)

policies, last, blocked, receipts = {}, {}, set(), []
for item in urls:
    url = item if isinstance(item, str) else item['url']
    host = urllib.parse.urlsplit(url).netloc
    origin = 'https://' + host
    r = {'url': url, 'retrieved_at': datetime.now(timezone.utc).isoformat()}
    try:
        if host in blocked:
            raise RuntimeError('Host stopped after access restriction')
        if host not in policies:
            rp = urllib.robotparser.RobotFileParser()
            try:
                q = urllib.request.urlopen(urllib.request.Request(origin + '/robots.txt', headers={'User-Agent': UA}), timeout=30)
                policy = q.read(200000).decode('utf-8', 'replace')
                rp.parse(policy.splitlines())
                (dest / (host + '-robots.txt')).write_text(policy)
            except urllib.error.HTTPError as e:
                if e.code != 404:
                    raise
                rp.parse([])
            policies[host] = rp
            last[host] = time.monotonic()
        rp = policies[host]
        if not rp.can_fetch(UA, url):
            raise RuntimeError('robots disallows source')
        delay = max(2.5, rp.crawl_delay(UA) or rp.crawl_delay('*') or 0)
        time.sleep(max(0, delay - (time.monotonic() - last.get(host, 0))))
        q = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=120)
        raw = q.read(max_bytes)
        last[host] = time.monotonic()
        if len(raw) >= max_bytes:
            raise RuntimeError(f'Response exceeds {max_bytes} byte bound')
        if any(x in raw[:100000].lower() for x in [b'<title>just a moment', b'cf-chl-', b'g-recaptcha', b'hcaptcha']):
            blocked.add(host)
            raise RuntimeError('Challenge detected; stopped host')
        document_sha = hashlib.sha256(raw).hexdigest()
        if raw[:5] == b'%PDF-':
            with tempfile.TemporaryDirectory() as tmp:
                pdf = os.path.join(tmp, 'doc.pdf')
                Path(pdf).write_bytes(raw)
                txt = os.path.join(tmp, 'doc.txt')
                subprocess.run(['pdftotext', '-layout', pdf, txt], check=True, timeout=600)
                text = Path(txt).read_bytes()
            retained, kind = text, 'pdf_text_layer'
        else:
            retained, kind = raw, 'original_bytes'
        sha = hashlib.sha256(retained).hexdigest()
        path = dest / (sha[:20] + '.gz')
        path.write_bytes(gzip.compress(retained, mtime=0))
        r.update(status=q.status, file=str(path), sha256=sha, bytes=len(retained), evidence=kind,
                 document_sha256=document_sha, document_bytes=len(raw), final_url=q.url)
        if kind == 'pdf_text_layer':
            r['extraction'] = 'pdftotext -layout ' + subprocess.run(['pdftotext', '-v'], capture_output=True, text=True).stderr.splitlines()[0].strip()
            r['pages'] = retained.count(b'\f')
    except Exception as e:
        if isinstance(e, urllib.error.HTTPError) and e.code in (403, 429):
            blocked.add(host)
        r.update(status='source_unreachable', reason=str(e))
    receipts.append(r)
    (dest / 'manifest.json').write_text(json.dumps(receipts, indent=2) + '\n')
    print(json.dumps(r), flush=True)
