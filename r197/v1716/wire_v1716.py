"""Idempotent v1.7.16 integration (Strike-1 unranked + same-items cost on the 27 Oct draw), stacked on v1.7.15 (PASS).
The draw entry in data/jevbench-draw-equating.json keeps status "anchor-runs-pending", offset 0 and no anchors (the 12-anchor equating
is not applied, decision d1027-strong-anchors-needed); it only gains v1.7.16 (releases + latest_release) and keeps joins_via
"v1.7-addendum", so the v1.6 cohort reader still skips it (the v1.7 chain carries the rows)."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
HIST = "Added Strike-1 (hosted) on the 27 Oct regular draw, shown unranked; costs on that draw now use the items every row answered."
RELEASE_DATE = os.environ.get('V1716_RELEASE_DATE') or datetime.datetime.now(datetime.timezone.utc).date().isoformat()
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.16', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.16 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.15's own files)
p = W / 'app/api/jevbench/v1.7.16/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.15/route.ts').read_text().replace('V1715', 'V1716').replace('v1715', 'v1716'))
p = W / 'app/jev-models/v1.7.16/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.15/page.tsx').read_text()
s = s.replace('v1.7.15', '__NEW__').replace('v1.7.14', 'v1.7.15').replace('__NEW__', 'v1.7.16').replace('V1715', 'V1716').replace('v1715', 'v1716').replace('jev1715', 'jev1716')
TITLE = 'Strike-1 on the 27 Oct regular draw; same-items cost on that draw'
body_old = re.search(r'<p className="mt-3 max-w-3xl">(.*?)</p>', s).group(1)
BODY = (HIST.replace("'", '&apos;') + ' Strike-1 is a hosted decision API (EU, OVH Gravelines); it answered 1,495 of the draw&apos;s 1,500 items: 5 items over '
        'the provider&apos;s input limit were refused and count as wrong. Because Strike-1 refuses the 5 longest items and Microsoft-Decision-1 (updated weights) ran '
        'on 1,493 items, every row on the draw is now costed on the 1,489 items every row answered, each with its own price reference and token basis, and its '
        'all-items cost is stated next to it. Only cost, the Cost axis and the composites of those rows move; Intelligence, Calibration, Speed and category cells '
        'are unchanged. The draw&apos;s first anchor runs used models weaker than the draw&apos;s rows and stronger anchors are being measured, so the draw is not '
        'equated: its numbers are shown as published (offset 0) and no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. '
        'Rows on other draws keep their scores and confidence intervals; no method change.')
REPL = [
    ('Microsoft-Decision-1 with updated weights on the 27 Oct regular draw', TITLE, 3),
    (body_old, BODY, 1),
    ('Microsoft-Decision-1 with updated weights on the 27 Oct draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.',
     'Strike-1 on the 27 Oct draw, shown unranked; that draw is now costed on the items every row answered. No ranking or ranked order changes.', 1),
]
for a, b, n in REPL:
    assert s.count(a) == n, ('page anchor', a[:80], s.count(a)); s = s.replace(a, b)
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1715ForBoard, withV1715Addendum } from './jevbench-v1715-release.mjs';",
     "import { readJevbenchV1716ForBoard, withV1716Addendum } from './jevbench-v1716-release.mjs';\nimport { readJevbenchV1715ForBoard, withV1715Addendum } from './jevbench-v1715-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1715 = await readJevbenchV1715ForBoard(root);\n  return v1715 ? withV1715Addendum(throughV1714, v1715) : throughV1714;',
     '  const v1715 = await readJevbenchV1715ForBoard(root);\n  const throughV1715 = v1715 ? withV1715Addendum(throughV1714, v1715) : throughV1714;\n  const v1716 = await readJevbenchV1716ForBoard(root);\n  return v1716 ? withV1716Addendum(throughV1715, v1716) : throughV1715;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1715ForBoard(root)) ? 'v1.7.15'", "return (await readJevbenchV1716ForBoard(root)) ? 'v1.7.16' : (await readJevbenchV1715ForBoard(root)) ? 'v1.7.15'")
# draw table: the 27 Oct draw gains v1.7.16 (same draw, same status/offset; joins via the v1.7 addendum chain); NOT equated
eq = W / 'data/jevbench-draw-equating.json'; t = json.loads(eq.read_text())
d = next(x for x in t['draws'] if x['draw'] == 'v1.6-regular-20261027')
assert d['joins_via'] == 'v1.7-addendum' and d['releases'][:3] == ['v1.7.13', 'v1.7.14', 'v1.7.15'], d
assert d['status'] == 'anchor-runs-pending' and d['offset'] == {'I': 0, 'C': 0} and d['offset_ci95'] is None and d['anchors'] == [], d
if 'v1.7.16' not in d['releases']:
    d['releases'].append('v1.7.16'); d['latest_release'] = 'v1.7.16'; eq.write_text(json.dumps(t, indent=2, ensure_ascii=False) + '\n')
assert d['latest_release'] == 'v1.7.16' and d['releases'][-1] == 'v1.7.16'
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.15'", "type JevRelease = 'v1.7.16' | 'v1.7.15'")
edit('lib/jevbench-categories.mjs', "'v1.7.14', 'v1.7.15'];", "'v1.7.14', 'v1.7.15', 'v1.7.16'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.16', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.16', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.16'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.15'", line + "  { version: 'v1.7.15'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';",
     "import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';\nimport { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1714, v1715] = await Promise.all([', 'v1714, v1715, v1716] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1715Release()]);', 'hasPublishedJevbenchV1715Release(), hasPublishedJevbenchV1716Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1715 && 'v1.7.15'].filter(Boolean)", "!v1715 && 'v1.7.15', !v1716 && 'v1.7.16'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';",
     "import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';\nimport { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';")
edit('app/sitemap.ts', "  const v1715Visible = await hasPublishedJevbenchV1715Release();\n",
     "  const v1715Visible = await hasPublishedJevbenchV1715Release();\n  const v1716Visible = await hasPublishedJevbenchV1716Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.15' || v1715Visible))",
     "(r.version !== 'v1.7.15' || v1715Visible) && (r.version !== 'v1.7.16' || v1716Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.16 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1715Release()) ? 'v1715' :", "(await hasPublishedJevbenchV1716Release()) ? 'v1716' : (await hasPublishedJevbenchV1715Release()) ? 'v1715' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1715Release()) ? 'v1715' :", "(await hasPublishedJevbenchV1716Release()) ? 'v1716' : (await hasPublishedJevbenchV1715Release()) ? 'v1715' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1715Release()) ? 'v1715' :", "(await hasPublishedJevbenchV1716Release()) ? 'v1716' : (await hasPublishedJevbenchV1715Release()) ? 'v1715' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' :", "(await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' : (await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' :", "(await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' : (await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' :", "(await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' : (await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' :")]:
    edit(name, "import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';",
         "import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';\nimport { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.14', 'v1.7.15'].sort());", "'v1.7.14', 'v1.7.15', 'v1.7.16'].sort());")
# v1.7.15's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.16; predecessor chain retained; 27 Oct draw entry stays anchor-runs-pending (offset 0) and now lists v1.7.13 to v1.7.16')
