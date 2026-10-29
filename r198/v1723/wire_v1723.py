"""Idempotent v1.7.23 text-only correction integration."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
from texts_v1723 import HIST


RELEASE_DATE = os.environ.get('V1723_RELEASE_DATE') or '2026-10-29'
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.23', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.23 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.22's own files)
p = W / 'app/api/jevbench/v1.7.23/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.22/route.ts').read_text().replace('V1722', 'V1723').replace('v1722', 'v1723'))
p = W / 'app/jev-models/v1.7.23/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.22/page.tsx').read_text()
s = s.replace('v1.7.22', '__NEW__').replace('v1.7.20', 'v1.7.22').replace('__NEW__', 'v1.7.23').replace('V1722', 'V1723').replace('v1722', 'v1723').replace('jev1722', 'jev1723')
TITLE='Text-only corrections'
s=s.replace('Umpire 35B-A3B on the 27 Oct regular draw, shown unranked',TITLE).replace('VisionJEV 1.0.0 on the 27 Oct regular draw, shown unranked',TITLE)
s=re.sub(r"description:'[^']*'", "description:'Text-only corrections; no score, cost or rank changed.'",s)
BODY=HIST
s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+BODY.replace("'",'&apos;')+'</p>',s)
s=s.replace('measurement_notes.slice(-2);','measurement_notes.slice(-1);')
s=s.replace('/jev-models/v1.7.21', '/jev-models/v1.7.22').replace('Previous v1.7.21','Previous v1.7.22')
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1722ForBoard, withV1722Addendum } from './jevbench-v1722-release.mjs';",
     "import { readJevbenchV1723ForBoard, withV1723Addendum } from './jevbench-v1723-release.mjs';\nimport { readJevbenchV1722ForBoard, withV1722Addendum } from './jevbench-v1722-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1722 = await readJevbenchV1722ForBoard(root);\n  return v1722 ? withV1722Addendum(throughV1721, v1722) : throughV1721;',
     '  const v1722 = await readJevbenchV1722ForBoard(root);\n  const throughV1722 = v1722 ? withV1722Addendum(throughV1721, v1722) : throughV1721;\n  const v1723 = await readJevbenchV1723ForBoard(root);\n  return v1723 ? withV1723Addendum(throughV1722, v1723) : throughV1722;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1722ForBoard(root)) ? 'v1.7.22'", "return (await readJevbenchV1723ForBoard(root)) ? 'v1.7.23' : (await readJevbenchV1722ForBoard(root)) ? 'v1.7.22'")
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.22'", "type JevRelease = 'v1.7.23' | 'v1.7.22'")
edit('lib/jevbench-categories.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21', 'v1.7.22'];", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21', 'v1.7.22', 'v1.7.23'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.23', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.23', text: '" + HIST.replace("'", "\\'") + "' },\n"
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.22'", line + "  { version: 'v1.7.22'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';",
     "import { hasPublishedJevbenchV1723Release } from '../lib/jevbench-v1723-release.mjs';\nimport { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1720, v1721, v1722] = await Promise.all([', 'v1720, v1721, v1722, v1723] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1722Release()]);', 'hasPublishedJevbenchV1722Release(), hasPublishedJevbenchV1723Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1722 && 'v1.7.22'].filter(Boolean)", "!v1722 && 'v1.7.22', !v1723 && 'v1.7.23'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';",
     "import { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';\nimport { hasPublishedJevbenchV1723Release } from '../lib/jevbench-v1723-release.mjs';")
edit('app/sitemap.ts', "  const v1722Visible = await hasPublishedJevbenchV1722Release();\n",
     "  const v1722Visible = await hasPublishedJevbenchV1722Release();\n  const v1723Visible = await hasPublishedJevbenchV1723Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.22' || v1722Visible))",
     "(r.version !== 'v1.7.22' || v1722Visible) && (r.version !== 'v1.7.23' || v1723Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.23 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1722Release()) ? 'v1722' :", "(await hasPublishedJevbenchV1723Release()) ? 'v1723' : (await hasPublishedJevbenchV1722Release()) ? 'v1722' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1722Release()) ? 'v1722' :", "(await hasPublishedJevbenchV1723Release()) ? 'v1723' : (await hasPublishedJevbenchV1722Release()) ? 'v1722' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1722Release()) ? 'v1722' :", "(await hasPublishedJevbenchV1723Release()) ? 'v1723' : (await hasPublishedJevbenchV1722Release()) ? 'v1722' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' :", "(await hasPublishedJevbenchV1723Release()) ? 'v1.7.23' : (await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' :", "(await hasPublishedJevbenchV1723Release()) ? 'v1.7.23' : (await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' :", "(await hasPublishedJevbenchV1723Release()) ? 'v1.7.23' : (await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' :")]:
    edit(name, "import { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';",
         "import { hasPublishedJevbenchV1723Release } from '../lib/jevbench-v1723-release.mjs';\nimport { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21', 'v1.7.22'].sort());", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21', 'v1.7.22', 'v1.7.23'].sort());")
# v1.7.22's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.23; text-only corrections; predecessor chain retained')


# Explicit archive loader for the on-demand All data grid. Predecessor gaps belong to the base owner.
edit('lib/jevbench-alldata-input.mjs', "import { readJevbenchV1722ForBoard, v1722BoardInput } from './jevbench-v1722-release.mjs';", "import { readJevbenchV1722ForBoard, v1722BoardInput } from './jevbench-v1722-release.mjs';\nimport { readJevbenchV1723ForBoard, v1723BoardInput } from './jevbench-v1723-release.mjs';")
edit('lib/jevbench-alldata-input.mjs', "  'v1.7.22': { read: readJevbenchV1722ForBoard, board: v1722BoardInput },", "  'v1.7.22': { read: readJevbenchV1722ForBoard, board: v1722BoardInput },\n  'v1.7.23': { read: readJevbenchV1723ForBoard, board: v1723BoardInput },")

assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.7.23':")==1
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("from './jevbench-v1723-release.mjs'")==1

# Sanitise carried summaries shown in the live release-history catalog. Archived artifacts are immutable.
edit('lib/jevbench-releases.mjs', 'unpriced under deputy decision #19084', 'unpriced under the frozen pricing policy')
edit('lib/jevbench-releases.mjs', 'with Florian GO (card #17487)', 'after publication approval')

# Live architecture evidence is displayed by the shared row disclosure overlay.
for correction in json.loads((J/'receipts/SITE-TEXT-PROOF.json').read_text())['exceptions']:
    if correction['path'].startswith('data/jevbench-architecture.json:'):
        edit('data/jevbench-architecture.json', json.dumps(correction['old'],ensure_ascii=False), json.dumps(correction['new'],ensure_ascii=False))
