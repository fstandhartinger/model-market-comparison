"""Idempotent v1.7.20 integration: ranked, over-cap paid Lychee addition on the 12 Oct draw."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
from rows_v1720 import HIST, DISCLOSURE
RELEASE_DATE = os.environ.get('V1720_RELEASE_DATE') or '2026-10-29'
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.20', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.20 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.19's own files)
p = W / 'app/api/jevbench/v1.7.20/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.19/route.ts').read_text().replace('V1719', 'V1720').replace('v1719', 'v1720'))
p = W / 'app/jev-models/v1.7.20/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.19/page.tsx').read_text()
s = s.replace('v1.7.19', '__NEW__').replace('v1.7.18', 'v1.7.19').replace('__NEW__', 'v1.7.20').replace('V1719', 'V1720').replace('v1719', 'v1720').replace('jev1719', 'jev1720')
TITLE='Lychee-27B'
s=re.sub(r'DecisionNode and DecisionNode Flash \(hosted, unranked and not priced\)',TITLE,s)
s=re.sub(r"description:'[^']*'", "description:'Lychee-27B measured on 13 Oct 2026 on the 12 Oct draw as a paid priority evaluation, published at the customer request.'",s)
s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+(HIST+' '+DISCLOSURE.split('. ',1)[1]).replace("'",'&apos;')+'</p>',s)
s=s.replace('measurement_notes.slice(-3);','measurement_notes.slice(-2);')
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1719ForBoard, withV1719Addendum } from './jevbench-v1719-release.mjs';",
     "import { readJevbenchV1720ForBoard, withV1720Addendum } from './jevbench-v1720-release.mjs';\nimport { readJevbenchV1719ForBoard, withV1719Addendum } from './jevbench-v1719-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1719 = await readJevbenchV1719ForBoard(root);\n  return v1719 ? withV1719Addendum(throughV1718, v1719) : throughV1718;',
     '  const v1719 = await readJevbenchV1719ForBoard(root);\n  const throughV1719 = v1719 ? withV1719Addendum(throughV1718, v1719) : throughV1718;\n  const v1720 = await readJevbenchV1720ForBoard(root);\n  return v1720 ? withV1720Addendum(throughV1719, v1720) : throughV1719;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1719ForBoard(root)) ? 'v1.7.19'", "return (await readJevbenchV1720ForBoard(root)) ? 'v1.7.20' : (await readJevbenchV1719ForBoard(root)) ? 'v1.7.19'")
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.19'", "type JevRelease = 'v1.7.20' | 'v1.7.19'")
edit('lib/jevbench-categories.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19'];", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.20', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.20', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.20'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.19'", line + "  { version: 'v1.7.19'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';",
     "import { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';\nimport { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1716, v1717, v1718, v1719] = await Promise.all([', 'v1716, v1717, v1718, v1719, v1720] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1719Release()]);', 'hasPublishedJevbenchV1719Release(), hasPublishedJevbenchV1720Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1719 && 'v1.7.19'].filter(Boolean)", "!v1719 && 'v1.7.19', !v1720 && 'v1.7.20'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';",
     "import { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';\nimport { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';")
edit('app/sitemap.ts', "  const v1719Visible = await hasPublishedJevbenchV1719Release();\n",
     "  const v1719Visible = await hasPublishedJevbenchV1719Release();\n  const v1720Visible = await hasPublishedJevbenchV1720Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.19' || v1719Visible))",
     "(r.version !== 'v1.7.19' || v1719Visible) && (r.version !== 'v1.7.20' || v1720Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.20 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1719Release()) ? 'v1719' :", "(await hasPublishedJevbenchV1720Release()) ? 'v1720' : (await hasPublishedJevbenchV1719Release()) ? 'v1719' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1719Release()) ? 'v1719' :", "(await hasPublishedJevbenchV1720Release()) ? 'v1720' : (await hasPublishedJevbenchV1719Release()) ? 'v1719' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1719Release()) ? 'v1719' :", "(await hasPublishedJevbenchV1720Release()) ? 'v1720' : (await hasPublishedJevbenchV1719Release()) ? 'v1719' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' :", "(await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' : (await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' :", "(await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' : (await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' :", "(await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' : (await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' :")]:
    edit(name, "import { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';",
         "import { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';\nimport { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19'].sort());", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20'].sort());")
# v1.7.19's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.20; paid 12 Oct-draw addition; predecessor chain retained')


# Explicit archive loader for the on-demand All data grid. Predecessor gaps belong to the base owner.
edit('lib/jevbench-alldata-input.mjs', "import { readJevbenchV1715ForBoard, v1715BoardInput } from './jevbench-v1715-release.mjs';", "import { readJevbenchV1715ForBoard, v1715BoardInput } from './jevbench-v1715-release.mjs';\nimport { readJevbenchV1720ForBoard, v1720BoardInput } from './jevbench-v1720-release.mjs';")
edit('lib/jevbench-alldata-input.mjs', "  'v1.7.15': { read: readJevbenchV1715ForBoard, board: v1715BoardInput },", "  'v1.7.15': { read: readJevbenchV1715ForBoard, board: v1715BoardInput },\n  'v1.7.20': { read: readJevbenchV1720ForBoard, board: v1720BoardInput },")
