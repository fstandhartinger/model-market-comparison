"""Idempotent v1.7.22 integration: self-hosted unranked Umpire on the 27 Oct draw."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
from rows_v1722 import ROW
HIST="Added Umpire 35B-A3B (self-hosted) on the 27 Oct regular draw, shown unranked."
DISCLOSURE=ROW['disclosure']
RELEASE_DATE = os.environ.get('V1722_RELEASE_DATE') or '2026-10-29'
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.22', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.22 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.21's own files)
p = W / 'app/api/jevbench/v1.7.22/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.21/route.ts').read_text().replace('V1721', 'V1722').replace('v1721', 'v1722'))
p = W / 'app/jev-models/v1.7.22/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.21/page.tsx').read_text()
s = s.replace('v1.7.21', '__NEW__').replace('v1.7.20', 'v1.7.21').replace('__NEW__', 'v1.7.22').replace('V1721', 'V1722').replace('v1721', 'v1722').replace('jev1721', 'jev1722')
TITLE='Umpire 35B-A3B on the 27 Oct regular draw, shown unranked'
s=s.replace('Umpire 35B-A3B on the 27 Oct regular draw, shown unranked',TITLE).replace('VisionJEV 1.0.0 on the 27 Oct regular draw, shown unranked',TITLE)
s=re.sub(r"description:'[^']*'", "description:'Umpire 35B-A3B measured on the 27 Oct regular draw, shown unranked.'",s)
BODY=HIST+" A 35B-total, 3B-active MoE model measured through the author's unchanged Transformers server on one A100 80 GB GPU. All 1,500 items were sent; five exceeded its native 16,384-token input cap and returned HTTP 400, scored as misses and unbilled. Output tokens are zero. The cost estimate uses the unchanged 1,489-item basis and a labelled size/architecture-class Qwen3.5-35B-A3B reference: its declared Ornith base is unlisted with no declared parent. Weights are CC BY-NC 4.0 (non-commercial use only); serving code Apache-2.0. The author claims the BF16 weights are his served 4-bit weights dequantized; parity is unverified. Training-data overlap is unchecked. Stronger anchor runs are being measured; the draw is not yet equated to the reference scale."
s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+BODY.replace("'",'&apos;')+'</p>',s)
s=s.replace('measurement_notes.slice(-2);','measurement_notes.slice(-1);')
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1721ForBoard, withV1721Addendum } from './jevbench-v1721-release.mjs';",
     "import { readJevbenchV1722ForBoard, withV1722Addendum } from './jevbench-v1722-release.mjs';\nimport { readJevbenchV1721ForBoard, withV1721Addendum } from './jevbench-v1721-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1721 = await readJevbenchV1721ForBoard(root);\n  return v1721 ? withV1721Addendum(throughV1720, v1721) : throughV1720;',
     '  const v1721 = await readJevbenchV1721ForBoard(root);\n  const throughV1721 = v1721 ? withV1721Addendum(throughV1720, v1721) : throughV1720;\n  const v1722 = await readJevbenchV1722ForBoard(root);\n  return v1722 ? withV1722Addendum(throughV1721, v1722) : throughV1721;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1721ForBoard(root)) ? 'v1.7.21'", "return (await readJevbenchV1722ForBoard(root)) ? 'v1.7.22' : (await readJevbenchV1721ForBoard(root)) ? 'v1.7.21'")
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.21'", "type JevRelease = 'v1.7.22' | 'v1.7.21'")
edit('lib/jevbench-categories.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21'];", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21', 'v1.7.22'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.22', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.22', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.22'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.21'", line + "  { version: 'v1.7.21'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';",
     "import { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';\nimport { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1716, v1717, v1718, v1719, v1720, v1721] = await Promise.all([', 'v1716, v1717, v1718, v1719, v1720, v1721, v1722] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1721Release()]);', 'hasPublishedJevbenchV1721Release(), hasPublishedJevbenchV1722Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1721 && 'v1.7.21'].filter(Boolean)", "!v1721 && 'v1.7.21', !v1722 && 'v1.7.22'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';",
     "import { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';\nimport { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';")
edit('app/sitemap.ts', "  const v1721Visible = await hasPublishedJevbenchV1721Release();\n",
     "  const v1721Visible = await hasPublishedJevbenchV1721Release();\n  const v1722Visible = await hasPublishedJevbenchV1722Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.21' || v1721Visible))",
     "(r.version !== 'v1.7.21' || v1721Visible) && (r.version !== 'v1.7.22' || v1722Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.22 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1721Release()) ? 'v1721' :", "(await hasPublishedJevbenchV1722Release()) ? 'v1722' : (await hasPublishedJevbenchV1721Release()) ? 'v1721' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1721Release()) ? 'v1721' :", "(await hasPublishedJevbenchV1722Release()) ? 'v1722' : (await hasPublishedJevbenchV1721Release()) ? 'v1721' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1721Release()) ? 'v1721' :", "(await hasPublishedJevbenchV1722Release()) ? 'v1722' : (await hasPublishedJevbenchV1721Release()) ? 'v1721' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' :", "(await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' : (await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' :", "(await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' : (await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' :", "(await hasPublishedJevbenchV1722Release()) ? 'v1.7.22' : (await hasPublishedJevbenchV1721Release()) ? 'v1.7.21' :")]:
    edit(name, "import { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';",
         "import { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';\nimport { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21'].sort());", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18', 'v1.7.19', 'v1.7.20', 'v1.7.21', 'v1.7.22'].sort());")
# v1.7.21's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.22; unranked 27 Oct-draw addition; predecessor chain retained')


# Explicit archive loader for the on-demand All data grid. Predecessor gaps belong to the base owner.
edit('lib/jevbench-alldata-input.mjs', "import { readJevbenchV1721ForBoard, v1721BoardInput } from './jevbench-v1721-release.mjs';", "import { readJevbenchV1721ForBoard, v1721BoardInput } from './jevbench-v1721-release.mjs';\nimport { readJevbenchV1722ForBoard, v1722BoardInput } from './jevbench-v1722-release.mjs';")
edit('lib/jevbench-alldata-input.mjs', "  'v1.7.21': { read: readJevbenchV1721ForBoard, board: v1721BoardInput },", "  'v1.7.21': { read: readJevbenchV1721ForBoard, board: v1721BoardInput },\n  'v1.7.22': { read: readJevbenchV1722ForBoard, board: v1722BoardInput },")

q=W/'data/jevbench-draw-equating.json';d=json.loads(q.read_text());draw=next(x for x in d['draws'] if x['draw']=='v1.6-regular-20261027')
assert draw['status']=='anchor-runs-pending' and draw['offset']=={'I':0,'C':0}
if 'v1.7.22' not in draw['releases']:draw['releases'].append('v1.7.22')
draw['latest_release']='v1.7.22';q.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.7.22':")==1
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("from './jevbench-v1722-release.mjs'")==1
