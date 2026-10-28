"""Idempotent v1.7.17 integration: one self-hosted unranked row, no carried-row changes, unequated draw gains this release only."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
HIST = "Added Jev-Style-2B (self-hosted) on the 27 Oct regular draw, shown unranked."
RELEASE_DATE = os.environ.get('V1717_RELEASE_DATE') or datetime.datetime.now(datetime.timezone.utc).date().isoformat()
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.17', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.17 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.16's own files)
p = W / 'app/api/jevbench/v1.7.17/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.16/route.ts').read_text().replace('V1716', 'V1717').replace('v1716', 'v1717'))
p = W / 'app/jev-models/v1.7.17/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.16/page.tsx').read_text()
s = s.replace('v1.7.16', '__NEW__').replace('v1.7.15', 'v1.7.16').replace('__NEW__', 'v1.7.17').replace('V1716', 'V1717').replace('v1716', 'v1717').replace('jev1716', 'jev1717')
TITLE = 'Jev-Style-2B on the 27 Oct regular draw, shown unranked'
for old_title in ['Strike-1 on the 27 Oct regular draw; same-items cost on that draw']:
    s = s.replace(old_title, TITLE)
body_old = re.search(r'<p className="mt-3 max-w-3xl">(.*?)</p>', s).group(1)
BODY = (HIST + " Jev-Style-2B is a Qwen3.5-2B fine-tune, measured through the author's own server on one rented RTX 6000 Ada GPU. "
        "All 1,500 items were sent; the five longest exceeded its 32,768-token input limit and count as misses. "
        "The model was trained in part on soft labels from TypeSafe Jev 1.14 via its public API and official train splits of public benchmarks. "
        "The server reports 0 output tokens. Cost is an estimate at the base-model market reference, on the unchanged 1,489 items every row on the draw answered. "
        "The draw is not yet equated to the reference scale (stronger anchor runs for that draw are being measured), so its numbers are shown as published (offset 0) and no ranking or ranked order changes.")
s=s.replace(body_old,BODY.replace("'",'&apos;'))
s=s.replace('Strike-1 on the 27 Oct draw, shown unranked; that draw is now costed on the items every row answered. No ranking or ranked order changes.',
            'Jev-Style-2B on the 27 Oct draw, shown unranked. All existing rows and ranked orders are unchanged.')
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1716ForBoard, withV1716Addendum } from './jevbench-v1716-release.mjs';",
     "import { readJevbenchV1717ForBoard, withV1717Addendum } from './jevbench-v1717-release.mjs';\nimport { readJevbenchV1716ForBoard, withV1716Addendum } from './jevbench-v1716-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1716 = await readJevbenchV1716ForBoard(root);\n  return v1716 ? withV1716Addendum(throughV1715, v1716) : throughV1715;',
     '  const v1716 = await readJevbenchV1716ForBoard(root);\n  const throughV1716 = v1716 ? withV1716Addendum(throughV1715, v1716) : throughV1715;\n  const v1717 = await readJevbenchV1717ForBoard(root);\n  return v1717 ? withV1717Addendum(throughV1716, v1717) : throughV1716;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1716ForBoard(root)) ? 'v1.7.16'", "return (await readJevbenchV1717ForBoard(root)) ? 'v1.7.17' : (await readJevbenchV1716ForBoard(root)) ? 'v1.7.16'")
# draw table: the 27 Oct draw gains v1.7.17 (same draw, same status/offset; joins via the v1.7 addendum chain); NOT equated
eq = W / 'data/jevbench-draw-equating.json'; t = json.loads(eq.read_text())
d = next(x for x in t['draws'] if x['draw'] == 'v1.6-regular-20261027')
assert d['joins_via'] == 'v1.7-addendum' and d['releases'][:3] == ['v1.7.13', 'v1.7.14', 'v1.7.15'], d
assert d['status'] == 'anchor-runs-pending' and d['offset'] == {'I': 0, 'C': 0} and d['offset_ci95'] is None and d['anchors'] == [], d
if 'v1.7.17' not in d['releases']:
    d['releases'].append('v1.7.17'); d['latest_release'] = 'v1.7.17'; eq.write_text(json.dumps(t, indent=2, ensure_ascii=False) + '\n')
assert d['latest_release'] == 'v1.7.17' and d['releases'][-1] == 'v1.7.17'
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.16'", "type JevRelease = 'v1.7.17' | 'v1.7.16'")
edit('lib/jevbench-categories.mjs', "'v1.7.15', 'v1.7.16'];", "'v1.7.15', 'v1.7.16', 'v1.7.17'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.17', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.17', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.17'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.16'", line + "  { version: 'v1.7.16'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';",
     "import { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';\nimport { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1715, v1716] = await Promise.all([', 'v1715, v1716, v1717] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1716Release()]);', 'hasPublishedJevbenchV1716Release(), hasPublishedJevbenchV1717Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1716 && 'v1.7.16'].filter(Boolean)", "!v1716 && 'v1.7.16', !v1717 && 'v1.7.17'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';",
     "import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';\nimport { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';")
edit('app/sitemap.ts', "  const v1716Visible = await hasPublishedJevbenchV1716Release();\n",
     "  const v1716Visible = await hasPublishedJevbenchV1716Release();\n  const v1717Visible = await hasPublishedJevbenchV1717Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.16' || v1716Visible))",
     "(r.version !== 'v1.7.16' || v1716Visible) && (r.version !== 'v1.7.17' || v1717Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.17 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1716Release()) ? 'v1716' :", "(await hasPublishedJevbenchV1717Release()) ? 'v1717' : (await hasPublishedJevbenchV1716Release()) ? 'v1716' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1716Release()) ? 'v1716' :", "(await hasPublishedJevbenchV1717Release()) ? 'v1717' : (await hasPublishedJevbenchV1716Release()) ? 'v1716' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1716Release()) ? 'v1716' :", "(await hasPublishedJevbenchV1717Release()) ? 'v1717' : (await hasPublishedJevbenchV1716Release()) ? 'v1716' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' :", "(await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' : (await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' :", "(await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' : (await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' :", "(await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' : (await hasPublishedJevbenchV1716Release()) ? 'v1.7.16' :")]:
    edit(name, "import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';",
         "import { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';\nimport { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.15', 'v1.7.16'].sort());", "'v1.7.15', 'v1.7.16', 'v1.7.17'].sort());")
# v1.7.16's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.17; predecessor chain retained; 27 Oct draw entry stays anchor-runs-pending (offset 0) and now lists v1.7.13 to v1.7.17')
