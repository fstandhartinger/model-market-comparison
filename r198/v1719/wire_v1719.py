"""Idempotent v1.7.19 integration: two unranked, unpriced hosted additions."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
from rows_v1719 import HIST, DISCLOSURE, MAIN_DISCLOSURE
RELEASE_DATE = os.environ.get('V1719_RELEASE_DATE') or '2026-10-29'
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.19', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.19 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.18's own files)
p = W / 'app/api/jevbench/v1.7.19/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.18/route.ts').read_text().replace('V1718', 'V1719').replace('v1718', 'v1719'))
p = W / 'app/jev-models/v1.7.19/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.18/page.tsx').read_text()
s = s.replace('v1.7.18', '__NEW__').replace('v1.7.17', 'v1.7.18').replace('__NEW__', 'v1.7.19').replace('V1718', 'V1719').replace('v1718', 'v1719').replace('jev1718', 'jev1719')
TITLE='DecisionNode and DecisionNode Flash (hosted, unranked and not priced)'
s=re.sub(r'KnowLine 4B-Gen5.5 and KnowLine 26B-A4B-Gen2.5',TITLE,s)
s=re.sub(r"description:'[^']*'", "description:'DecisionNode and DecisionNode Flash measured on the 27 Oct regular draw, shown unranked and not priced.'",s)
s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+(HIST+' '+DISCLOSURE+' DecisionNode:'+MAIN_DISCLOSURE).replace("'",'&apos;')+'</p>',s)
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1718ForBoard, withV1718Addendum } from './jevbench-v1718-release.mjs';",
     "import { readJevbenchV1719ForBoard, withV1719Addendum } from './jevbench-v1719-release.mjs';\nimport { readJevbenchV1718ForBoard, withV1718Addendum } from './jevbench-v1718-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1718 = await readJevbenchV1718ForBoard(root);\n  return v1718 ? withV1718Addendum(throughV1717, v1718) : throughV1717;',
     '  const v1718 = await readJevbenchV1718ForBoard(root);\n  const throughV1718 = v1718 ? withV1718Addendum(throughV1717, v1718) : throughV1717;\n  const v1719 = await readJevbenchV1719ForBoard(root);\n  return v1719 ? withV1719Addendum(throughV1718, v1719) : throughV1718;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1718ForBoard(root)) ? 'v1.7.18'", "return (await readJevbenchV1719ForBoard(root)) ? 'v1.7.19' : (await readJevbenchV1718ForBoard(root)) ? 'v1.7.18'")
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.18'", "type JevRelease = 'v1.7.19' | 'v1.7.18'")
edit('lib/jevbench-categories.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18'];", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.19', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.19', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.19'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.18'", line + "  { version: 'v1.7.18'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';",
     "import { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';\nimport { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1716, v1717, v1718] = await Promise.all([', 'v1716, v1717, v1718, v1719] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1718Release()]);', 'hasPublishedJevbenchV1718Release(), hasPublishedJevbenchV1719Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1718 && 'v1.7.18'].filter(Boolean)", "!v1718 && 'v1.7.18', !v1719 && 'v1.7.19'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';",
     "import { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';\nimport { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';")
edit('app/sitemap.ts', "  const v1718Visible = await hasPublishedJevbenchV1718Release();\n",
     "  const v1718Visible = await hasPublishedJevbenchV1718Release();\n  const v1719Visible = await hasPublishedJevbenchV1719Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.18' || v1718Visible))",
     "(r.version !== 'v1.7.18' || v1718Visible) && (r.version !== 'v1.7.19' || v1719Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.19 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1718Release()) ? 'v1718' :", "(await hasPublishedJevbenchV1719Release()) ? 'v1719' : (await hasPublishedJevbenchV1718Release()) ? 'v1718' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1718Release()) ? 'v1718' :", "(await hasPublishedJevbenchV1719Release()) ? 'v1719' : (await hasPublishedJevbenchV1718Release()) ? 'v1718' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1718Release()) ? 'v1718' :", "(await hasPublishedJevbenchV1719Release()) ? 'v1719' : (await hasPublishedJevbenchV1718Release()) ? 'v1718' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' :", "(await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' : (await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' :", "(await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' : (await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' :", "(await hasPublishedJevbenchV1719Release()) ? 'v1.7.19' : (await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' :")]:
    edit(name, "import { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';",
         "import { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';\nimport { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18'].sort());", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19'].sort());")
# v1.7.18's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.19; hosted 27 Oct additions; predecessor chain retained')

p=W/'data/jevbench-draw-equating.json';t=p.read_text()
if '"v1.7.19"' not in t:
 t=t.replace('"v1.7.17"\n      ]','"v1.7.17",\n        "v1.7.19"\n      ]')
t=t.replace('"latest_release": "v1.7.17"','"latest_release": "v1.7.19"')
p.write_text(t)

edit('test/jevbench-breakdowns-every-listed-row.test.mjs', "'knowline-4b-gen5.5'].includes", "'knowline-4b-gen5.5','decisionnode-flash-0.9.1-rc1','decisionnode-main-0.9.1-rc1'].includes")
