"""Idempotent v1.7.18 integration: two ranked KnowLine additions, mechanical carried ranks only."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
from rows_v1718 import HIST, LOST, NOUL, PARTIAL
RELEASE_DATE = os.environ.get('V1718_RELEASE_DATE') or '2026-10-28'
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.18', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.18 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.17's own files)
p = W / 'app/api/jevbench/v1.7.18/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.17/route.ts').read_text().replace('V1717', 'V1718').replace('v1717', 'v1718'))
p = W / 'app/jev-models/v1.7.18/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.17/page.tsx').read_text()
s = s.replace('v1.7.17', '__NEW__').replace('v1.7.16', 'v1.7.17').replace('__NEW__', 'v1.7.18').replace('V1717', 'V1718').replace('v1717', 'v1718').replace('jev1717', 'jev1718')
TITLE='KnowLine 4B-Gen5.5 and KnowLine 26B-A4B-Gen2.5'
s=re.sub(r'Jev-Style-2B on the 27 Oct regular draw, shown unranked',TITLE,s)
s=re.sub(r"description:'[^']*'", "description:'Two KnowLine models measured on 23 Oct on the 12 Oct regular draw, with retained scores and confidence intervals.'",s)
s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+(HIST+' '+LOST+' KnowLine 26B-A4B-Gen2.5: '+NOUL+' '+PARTIAL).replace("'",'&apos;')+'</p>',s)
# This release's method section describes only its own additions, not inherited draw notes.
s = s.replace('}).measurement_notes;', '}).measurement_notes.slice(-3);')
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1717ForBoard, withV1717Addendum } from './jevbench-v1717-release.mjs';",
     "import { readJevbenchV1718ForBoard, withV1718Addendum } from './jevbench-v1718-release.mjs';\nimport { readJevbenchV1717ForBoard, withV1717Addendum } from './jevbench-v1717-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1717 = await readJevbenchV1717ForBoard(root);\n  return v1717 ? withV1717Addendum(throughV1716, v1717) : throughV1716;',
     '  const v1717 = await readJevbenchV1717ForBoard(root);\n  const throughV1717 = v1717 ? withV1717Addendum(throughV1716, v1717) : throughV1716;\n  const v1718 = await readJevbenchV1718ForBoard(root);\n  return v1718 ? withV1718Addendum(throughV1717, v1718) : throughV1717;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1717ForBoard(root)) ? 'v1.7.17'", "return (await readJevbenchV1718ForBoard(root)) ? 'v1.7.18' : (await readJevbenchV1717ForBoard(root)) ? 'v1.7.17'")
# Export every ranked measurement, including the newly introduced over-cap listing.
edit('lib/jevbench-llms-full.mjs', "  const listed = data.systems.filter((r) => r.ranked && r.listing === 'ranked');",
     "  // Outside-cap ranked rows remain public measurements; their Capability rank is shown as outside caps.\n  const listed = data.systems.filter((r) => r.ranked && ['ranked', 'ranked_over_cap'].includes(r.listing));")
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.17'", "type JevRelease = 'v1.7.18' | 'v1.7.17'")
edit('lib/jevbench-categories.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17'];", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.18', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.18', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.18'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.17'", line + "  { version: 'v1.7.17'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';",
     "import { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';\nimport { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1716, v1717] = await Promise.all([', 'v1716, v1717, v1718] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1717Release()]);', 'hasPublishedJevbenchV1717Release(), hasPublishedJevbenchV1718Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1717 && 'v1.7.17'].filter(Boolean)", "!v1717 && 'v1.7.17', !v1718 && 'v1.7.18'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';",
     "import { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';\nimport { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';")
edit('app/sitemap.ts', "  const v1717Visible = await hasPublishedJevbenchV1717Release();\n",
     "  const v1717Visible = await hasPublishedJevbenchV1717Release();\n  const v1718Visible = await hasPublishedJevbenchV1718Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.17' || v1717Visible))",
     "(r.version !== 'v1.7.17' || v1717Visible) && (r.version !== 'v1.7.18' || v1718Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.18 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1717Release()) ? 'v1717' :", "(await hasPublishedJevbenchV1718Release()) ? 'v1718' : (await hasPublishedJevbenchV1717Release()) ? 'v1717' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1717Release()) ? 'v1717' :", "(await hasPublishedJevbenchV1718Release()) ? 'v1718' : (await hasPublishedJevbenchV1717Release()) ? 'v1717' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1717Release()) ? 'v1717' :", "(await hasPublishedJevbenchV1718Release()) ? 'v1718' : (await hasPublishedJevbenchV1717Release()) ? 'v1717' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' :", "(await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' : (await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' :", "(await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' : (await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' :", "(await hasPublishedJevbenchV1718Release()) ? 'v1.7.18' : (await hasPublishedJevbenchV1717Release()) ? 'v1.7.17' :")]:
    edit(name, "import { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';",
         "import { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';\nimport { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.15', 'v1.7.16', 'v1.7.17'].sort());", "'v1.7.15', 'v1.7.16', 'v1.7.17', 'v1.7.18'].sort());")
# v1.7.17's own draw-entry test already accepts appended releases (slice(0,3) + latest = newest); no edit.
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.18; aggregate-only 12 Oct additions; predecessor chain retained')
