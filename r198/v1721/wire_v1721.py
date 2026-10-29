"""Idempotent v1.7.21 integration: self-hosted unranked VisionJEV on the 27 Oct draw."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
from rows_v1721 import ROW
HIST="Added VisionJEV 1.0.0 (self-hosted) on the 27 Oct regular draw, shown unranked."
DISCLOSURE=ROW['disclosure']
RELEASE_DATE = os.environ.get('V1721_RELEASE_DATE') or '2026-10-29'
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.21', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.21 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.20's own files)
p = W / 'app/api/jevbench/v1.7.21/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.20/route.ts').read_text().replace('V1720', 'V1721').replace('v1720', 'v1721'))
p = W / 'app/jev-models/v1.7.21/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.20/page.tsx').read_text()
s = s.replace('v1.7.20', '__NEW__').replace('v1.7.19', 'v1.7.20').replace('__NEW__', 'v1.7.21').replace('V1720', 'V1721').replace('v1720', 'v1721').replace('jev1720', 'jev1721')
TITLE='VisionJEV 1.0.0 on the 27 Oct regular draw, shown unranked'
s=s.replace('Lychee-27B',TITLE)
s=re.sub(r"description:'[^']*'", "description:'VisionJEV 1.0.0 measured on the 27 Oct regular draw, shown unranked.'",s)
BODY=HIST+" A Qwen3.8-27B model measured through the author's own server on one A100 80 GB GPU, text only. All 1,500 items were sent; five exceeded its native 8,192-token input cap and were refused with HTTP 422, scored as misses and unbilled. Output tokens are zero. The cost estimate uses the unchanged 1,489-item basis. Training-data overlap is unchecked; 49 of 50 replayed requests were bit-identical, with no argmax flips. Apache-2.0 + NOTICE. Stronger anchor runs are being measured; the draw is not yet equated to the reference scale."
s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+BODY.replace("'",'&apos;')+'</p>',s)
s=s.replace('measurement_notes.slice(-2);','measurement_notes.slice(-2);')
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1720ForBoard, withV1720Addendum } from './jevbench-v1720-release.mjs';",
     "import { readJevbenchV1721ForBoard, withV1721Addendum } from './jevbench-v1721-release.mjs';\nimport { readJevbenchV1720ForBoard, withV1720Addendum } from './jevbench-v1720-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1720 = await readJevbenchV1720ForBoard(root);\n  return v1720 ? withV1720Addendum(throughV1719, v1720) : throughV1719;',
     '  const v1720 = await readJevbenchV1720ForBoard(root);\n  const throughV1720 = v1720 ? withV1720Addendum(throughV1719, v1720) : throughV1719;\n  const v1721 = await readJevbenchV1721ForBoard(root);\n  return v1721 ? withV1721Addendum(throughV1720, v1721) : throughV1720;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1720ForBoard(root)) ? 'v1.7.20'", "return (await readJevbenchV1721ForBoard(root)) ? 'v1.7.21' : (await readJevbenchV1720ForBoard(root)) ? 'v1.7.20'")
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.20'", "type JevRelease = 'v1.7.21' | 'v1.7.20'")
edit('lib/jevbench-categories.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20'];", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.21', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.21', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.21'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.20'", line + "  { version: 'v1.7.20'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';",
     "import { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';\nimport { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1716, v1717, v1718, v1719, v1720] = await Promise.all([', 'v1716, v1717, v1718, v1719, v1720, v1721] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1720Release()]);', 'hasPublishedJevbenchV1720Release(), hasPublishedJevbenchV1721Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1720 && 'v1.7.20'].filter(Boolean)", "!v1720 && 'v1.7.20', !v1721 && 'v1.7.21'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';",
     "import { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';\nimport { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';")
edit('app/sitemap.ts', "  const v1720Visible = await hasPublishedJevbenchV1720Release();\n",
     "  const v1720Visible = await hasPublishedJevbenchV1720Release();\n  const v1721Visible = await hasPublishedJevbenchV1721Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.20' || v1720Visible))",
     "(r.version !== 'v1.7.20' || v1720Visible) && (r.version !== 'v1.7.21' || v1721Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.21 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1720Release()) ? 'v1720' :", "(await hasPublishedJevbenchV1721Release()) ? 'v1721' : (await hasPublishedJevbenchV1720Release()) ? 'v1720' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1720Release()) ? 'v1720' :", "(await hasPublishedJevbenchV1721Release()) ? 'v1721' : (await hasPublishedJevbenchV1720Release()) ? 'v1720' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1720Release()) ? 'v1720' :", "(await hasPublishedJevbenchV1721Release()) ? 'v1721' : (await hasPublishedJevbenchV1720Release()) ? 'v1720' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' :", "(await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' : (await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' :", "(await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' : (await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' :", "(await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' : (await hasPublishedJevbenchV1720Release()) ? 'v1.7.20' :")]:
    edit(name, "import { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';",
         "import { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';\nimport { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20'].sort());", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21'].sort());")
# v1.7.20's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.21; unranked 27 Oct-draw addition; predecessor chain retained')


# Explicit archive loader for the on-demand All data grid. Predecessor gaps belong to the base owner.
edit('lib/jevbench-alldata-input.mjs', "import { readJevbenchV1720ForBoard, v1720BoardInput } from './jevbench-v1720-release.mjs';", "import { readJevbenchV1720ForBoard, v1720BoardInput } from './jevbench-v1720-release.mjs';\nimport { readJevbenchV1721ForBoard, v1721BoardInput } from './jevbench-v1721-release.mjs';")
edit('lib/jevbench-alldata-input.mjs', "  'v1.7.20': { read: readJevbenchV1720ForBoard, board: v1720BoardInput },", "  'v1.7.20': { read: readJevbenchV1720ForBoard, board: v1720BoardInput },\n  'v1.7.21': { read: readJevbenchV1721ForBoard, board: v1721BoardInput },")

q=W/'data/jevbench-draw-equating.json';d=json.loads(q.read_text());draw=next(x for x in d['draws'] if x['draw']=='v1.6-regular-20261027')
assert draw['status']=='anchor-runs-pending' and draw['offset']=={'I':0,'C':0}
if 'v1.7.21' not in draw['releases']:draw['releases'].append('v1.7.21')
draw['latest_release']='v1.7.21';q.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.7.21':")==1
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("from './jevbench-v1721-release.mjs'")==1
