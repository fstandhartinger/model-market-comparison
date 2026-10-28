"""Idempotent v1.7.15 integration (unranked variant: Microsoft-Decision-1 round 2 on the 27 Oct draw), stacked on v1.7.14 (PASS).
The draw entry in data/jevbench-draw-equating.json keeps status "anchor-runs-pending", offset 0 and no anchors (the 12-anchor equating
is not applied, decision d1027-strong-anchors-needed); it only gains v1.7.15 (releases + latest_release) and keeps joins_via
"v1.7-addendum", so the v1.6 cohort reader still skips it (the v1.7 chain carries the rows)."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
HIST = ("Added Microsoft-Decision-1 with updated weights (paid evaluation) on the 27 Oct regular draw; that draw's rows stay unranked "
        "until stronger anchors are measured.")
RELEASE_DATE = os.environ.get('V1715_RELEASE_DATE') or datetime.datetime.now(datetime.timezone.utc).date().isoformat()
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.15', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.15 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.14's own files)
p = W / 'app/api/jevbench/v1.7.15/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.14/route.ts').read_text().replace('V1714', 'V1715').replace('v1714', 'v1715'))
p = W / 'app/jev-models/v1.7.15/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.14/page.tsx').read_text()
s = s.replace('v1.7.14', '__NEW__').replace('v1.7.13', 'v1.7.14').replace('__NEW__', 'v1.7.15').replace('V1714', 'V1715').replace('v1714', 'v1715').replace('jev1714', 'jev1715')
TITLE = 'Microsoft-Decision-1 with updated weights on the 27 Oct regular draw'
body_old = re.search(r'<p className="mt-3 max-w-3xl">(.*?)</p>', s).group(1)
BODY = (HIST.replace("'", '&apos;') + ' It is measured on 1,493 of the draw&apos;s items (7 items its provider had seen in an earlier evaluation are excluded; '
        '4 requests over its 32,768-token context limit count as wrong); the first Microsoft-Decision-1 row stays unchanged. The draw&apos;s first anchor runs '
        'used models weaker than the draw&apos;s rows and stronger anchors are being measured, so the draw is not equated: its numbers are shown as published (offset 0) and '
        'no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. Cost uses the advertised Azure Foundry tariff '
        '(USD 0.042 per million input tokens, output free), as for the first row. Every existing row keeps its scores and confidence intervals; no method change.')
REPL = [
    ('five more rows on the 27 Oct regular draw', TITLE, 3),
    (body_old, BODY, 1),
    ('Five new self-hosted rows on the 27 Oct draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.',
     'Microsoft-Decision-1 with updated weights on the 27 Oct draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.', 1),
]
for a, b, n in REPL:
    assert s.count(a) == n, ('page anchor', a[:80], s.count(a)); s = s.replace(a, b)
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1714ForBoard, withV1714Addendum } from './jevbench-v1714-release.mjs';",
     "import { readJevbenchV1715ForBoard, withV1715Addendum } from './jevbench-v1715-release.mjs';\nimport { readJevbenchV1714ForBoard, withV1714Addendum } from './jevbench-v1714-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1714 = await readJevbenchV1714ForBoard(root);\n  return v1714 ? withV1714Addendum(throughV1713, v1714) : throughV1713;',
     '  const v1714 = await readJevbenchV1714ForBoard(root);\n  const throughV1714 = v1714 ? withV1714Addendum(throughV1713, v1714) : throughV1713;\n  const v1715 = await readJevbenchV1715ForBoard(root);\n  return v1715 ? withV1715Addendum(throughV1714, v1715) : throughV1714;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1714ForBoard(root)) ? 'v1.7.14'", "return (await readJevbenchV1715ForBoard(root)) ? 'v1.7.15' : (await readJevbenchV1714ForBoard(root)) ? 'v1.7.14'")
# draw table: the 27 Oct draw gains v1.7.15 (same draw, same status/offset; joins via the v1.7 addendum chain); NOT equated
eq = W / 'data/jevbench-draw-equating.json'; t = json.loads(eq.read_text())
d = next(x for x in t['draws'] if x['draw'] == 'v1.6-regular-20261027')
assert d['joins_via'] == 'v1.7-addendum' and d['releases'][:2] == ['v1.7.13', 'v1.7.14'], d
assert d['status'] == 'anchor-runs-pending' and d['offset'] == {'I': 0, 'C': 0} and d['offset_ci95'] is None and d['anchors'] == [], d
if 'v1.7.15' not in d['releases']:
    d['releases'].append('v1.7.15'); d['latest_release'] = 'v1.7.15'; eq.write_text(json.dumps(t, indent=2, ensure_ascii=False) + '\n')
assert d['latest_release'] == 'v1.7.15' and d['releases'][-1] == 'v1.7.15'
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.14'", "type JevRelease = 'v1.7.15' | 'v1.7.14'")
edit('lib/jevbench-categories.mjs', "'v1.7.13', 'v1.7.14'];", "'v1.7.13', 'v1.7.14', 'v1.7.15'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.15', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.15', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.15'.*\n", '', t))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.14'", line + "  { version: 'v1.7.14'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';",
     "import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';\nimport { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1713, v1714] = await Promise.all([', 'v1713, v1714, v1715] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1714Release()]);', 'hasPublishedJevbenchV1714Release(), hasPublishedJevbenchV1715Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1714 && 'v1.7.14'].filter(Boolean)", "!v1714 && 'v1.7.14', !v1715 && 'v1.7.15'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';",
     "import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';\nimport { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';")
edit('app/sitemap.ts', "  const v1714Visible = await hasPublishedJevbenchV1714Release();\n",
     "  const v1714Visible = await hasPublishedJevbenchV1714Release();\n  const v1715Visible = await hasPublishedJevbenchV1715Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.14' || v1714Visible))",
     "(r.version !== 'v1.7.14' || v1714Visible) && (r.version !== 'v1.7.15' || v1715Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.15 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1714Release()) ? 'v1714' :", "(await hasPublishedJevbenchV1715Release()) ? 'v1715' : (await hasPublishedJevbenchV1714Release()) ? 'v1714' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1714Release()) ? 'v1714' :", "(await hasPublishedJevbenchV1715Release()) ? 'v1715' : (await hasPublishedJevbenchV1714Release()) ? 'v1714' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1714Release()) ? 'v1714' :", "(await hasPublishedJevbenchV1715Release()) ? 'v1715' : (await hasPublishedJevbenchV1714Release()) ? 'v1714' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' :", "(await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' : (await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' :", "(await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' : (await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' :", "(await hasPublishedJevbenchV1715Release()) ? 'v1.7.15' : (await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' :")]:
    edit(name, "import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';",
         "import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';\nimport { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.13', 'v1.7.14'].sort());", "'v1.7.13', 'v1.7.14', 'v1.7.15'].sort());")
# v1.7.14's own draw-entry test pinned releases ['v1.7.13','v1.7.14']; a same-draw addendum appends to it (status/offset unchanged).
edit('test/jevbench-v1714-release.test.mjs',
     " assert.deepEqual({...d},{draw:V1714_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:['v1.7.13','v1.7.14'],latest_release:'v1.7.14',status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});",
     " // Later same-draw addenda (v1.7.15+) append to releases; the first two releases stay v1.7.13 and v1.7.14 and the latest release is the newest entry.\n"
     " assert.deepEqual(d.releases.slice(0,2),['v1.7.13','v1.7.14']);assert.equal(d.latest_release,d.releases.at(-1));assert.ok(d.releases.every(r=>/^v1\\.7\\.\\d+$/.test(r)));\n"
     " assert.deepEqual({...d,releases:undefined,latest_release:undefined},{draw:V1714_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:undefined,latest_release:undefined,status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});")
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.15; predecessor chain retained; 27 Oct draw entry stays anchor-runs-pending (offset 0) and now lists v1.7.13, v1.7.14 and v1.7.15')
