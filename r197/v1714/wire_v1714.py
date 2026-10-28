"""Idempotent v1.7.14 integration (same-draw addendum on v1.6-regular-20261027, stacked on v1.7.13); predecessor chain unchanged.
The draw entry in data/jevbench-draw-equating.json gains v1.7.14 (releases + latest_release); it keeps joins_via "v1.7-addendum",
so the v1.6 cohort reader and the v1.6 chain's latest release (which v1.7.0's restatement is bound to) still skip it."""
import datetime, json, os, pathlib, re, sys
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
HIST = ("Five more rows on the 27 Oct regular draw (Torchcast Decision 31B v1.0, paid evaluation; Arcbright Elf 1 12B (r2); Jeff-1.1-Qwen-4B; "
        "Decisio 12B tuned commit-think; Jeff-1.1-Large), shown unranked until the draw is equated to the reference scale.")
# The only place the release/history date lives: lib/jevbench-releases.mjs, written from RELEASE_DATE. It defaults to today's UTC date
# (V1714_RELEASE_DATE=YYYY-MM-DD overrides). The flip re-stamps it: `python3 wire_v1714.py --set-release-date [YYYY-MM-DD]` (flip_verdict_v1714.py does this).
RELEASE_DATE = os.environ.get('V1714_RELEASE_DATE') or datetime.datetime.now(datetime.timezone.utc).date().isoformat()
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE), RELEASE_DATE
def set_release_date(date):
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); u, n = re.subn(r"(\{ version: 'v1\.7\.14', date: ')\d{4}-\d{2}-\d{2}(')", r'\g<1>' + date + r'\2', t)
    assert n == 1, 'v1.7.14 history line'; q.write_text(u)
if sys.argv[1:2] == ['--set-release-date']:
    RELEASE_DATE = sys.argv[2] if len(sys.argv) > 2 else RELEASE_DATE; assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', RELEASE_DATE); set_release_date(RELEASE_DATE); print('release date', RELEASE_DATE); sys.exit(0)
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page (derived from v1.7.13's own files at build time)
p = W / 'app/api/jevbench/v1.7.14/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.13/route.ts').read_text().replace('V1713', 'V1714').replace('v1713', 'v1714'))
p = W / 'app/jev-models/v1.7.14/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.13/page.tsx').read_text()
s = s.replace('v1.7.13', '__NEW__').replace('v1.7.12', 'v1.7.13').replace('__NEW__', 'v1.7.14').replace('V1713', 'V1714').replace('v1713', 'v1714').replace('jev1713', 'jev1714')
REPL = [
    ('first release on the 27 Oct regular draw', 'five more rows on the 27 Oct regular draw', 3),
    ("First release on the 27 Oct regular draw: H2O-Lightning-4B v1.4.1 (paid evaluation), shown unranked until the draw is equated to the reference scale. It is the first row measured on a fresh sealed draw drawn on 27 Oct 2026; that draw is not yet equated to the reference scale, so its numbers are shown as published (offset 0) and it is not ranked: no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. Cost is an estimate from the base model price on the prompt tokens the model processed. Every existing row keeps its scores and confidence intervals; no method change.",
     HIST.replace("'", '&apos;') + " They are measured on the same fresh sealed draw as H2O-Lightning-4B v1.4.1 (drawn on 27 Oct 2026); that draw is not yet equated to the reference scale, so their numbers are shown as published (offset 0) and they are not ranked: no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. Cost is an estimate from each base model price on the prompt tokens the model processed, over all 1,500 items. Every existing row keeps its scores and confidence intervals; no method change.", 1),
    ('One new self-hosted row on a new draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.',
     'Five new self-hosted rows on the 27 Oct draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.', 1),
]
for a, b, n in REPL:
    assert s.count(a) == n, ('page anchor', a[:80], s.count(a)); s = s.replace(a, b)
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1713ForBoard, withV1713Addendum } from './jevbench-v1713-release.mjs';",
     "import { readJevbenchV1714ForBoard, withV1714Addendum } from './jevbench-v1714-release.mjs';\nimport { readJevbenchV1713ForBoard, withV1713Addendum } from './jevbench-v1713-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1713 = await readJevbenchV1713ForBoard(root);\n  return v1713 ? withV1713Addendum(throughV1712, v1713) : throughV1712;',
     '  const v1713 = await readJevbenchV1713ForBoard(root);\n  const throughV1713 = v1713 ? withV1713Addendum(throughV1712, v1713) : throughV1712;\n  const v1714 = await readJevbenchV1714ForBoard(root);\n  return v1714 ? withV1714Addendum(throughV1713, v1714) : throughV1713;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1713ForBoard(root)) ? 'v1.7.13'", "return (await readJevbenchV1714ForBoard(root)) ? 'v1.7.14' : (await readJevbenchV1713ForBoard(root)) ? 'v1.7.13'")
# draw table: the 27 Oct draw gains v1.7.14 (same draw, same status/offset; joins via the v1.7 addendum chain)
eq = W / 'data/jevbench-draw-equating.json'; t = json.loads(eq.read_text())
d = next(x for x in t['draws'] if x['draw'] == 'v1.6-regular-20261027')
assert d['joins_via'] == 'v1.7-addendum' and d['releases'][0] == 'v1.7.13', d
if 'v1.7.14' not in d['releases']:
    d['releases'].append('v1.7.14'); d['latest_release'] = 'v1.7.14'; eq.write_text(json.dumps(t, indent=2, ensure_ascii=False) + '\n')
assert d['latest_release'] == 'v1.7.14' and d['releases'][-1] == 'v1.7.14'
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.13'", "type JevRelease = 'v1.7.14' | 'v1.7.13'")
edit('lib/jevbench-categories.mjs', "'v1.7.12', 'v1.7.13'];", "'v1.7.12', 'v1.7.13', 'v1.7.14'];")
q = W / 'lib/jevbench-releases.mjs'; t = q.read_text(); line = "  { version: 'v1.7.14', date: '" + RELEASE_DATE + "', href: '/jev-models/v1.7.14', text: '" + HIST.replace("'", "\\'") + "' },\n"
if line not in t: q.write_text(re.sub(r"  \{ version: 'v1\.7\.14'.*\n", '', t))   # replace, never duplicate, any earlier wording/date of the line
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.13'", line + "  { version: 'v1.7.13'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';",
     "import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';\nimport { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1712, v1713] = await Promise.all([', 'v1712, v1713, v1714] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1713Release()]);', 'hasPublishedJevbenchV1713Release(), hasPublishedJevbenchV1714Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1713 && 'v1.7.13'].filter(Boolean)", "!v1713 && 'v1.7.13', !v1714 && 'v1.7.14'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';",
     "import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';\nimport { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';")
edit('app/sitemap.ts', "  const v1713Visible = await hasPublishedJevbenchV1713Release();\n",
     "  const v1713Visible = await hasPublishedJevbenchV1713Release();\n  const v1714Visible = await hasPublishedJevbenchV1714Release();\n")
edit('app/sitemap.ts', "(r.version !== 'v1.7.13' || v1713Visible))",
     "(r.version !== 'v1.7.13' || v1713Visible) && (r.version !== 'v1.7.14' || v1714Visible))")
# tests that pick the newest published release / ranks fixture: v1.7.14 first
for name, old_, new_ in [
    ('test/cr-303-feed-split.test.mjs', "(await hasPublishedJevbenchV1713Release()) ? 'v1713' :", "(await hasPublishedJevbenchV1714Release()) ? 'v1714' : (await hasPublishedJevbenchV1713Release()) ? 'v1713' :"),
    ('test/jevbench-v1630-release.test.mjs', "(await hasPublishedJevbenchV1713Release()) ? 'v1713' :", "(await hasPublishedJevbenchV1714Release()) ? 'v1714' : (await hasPublishedJevbenchV1713Release()) ? 'v1713' :"),
    ('test/jevbench-v1630-open-fold.test.mjs', "(await hasPublishedJevbenchV1713Release()) ? 'v1713' :", "(await hasPublishedJevbenchV1714Release()) ? 'v1714' : (await hasPublishedJevbenchV1713Release()) ? 'v1713' :"),
    ('test/jevbench-v170-release.test.mjs', "(await hasPublishedJevbenchV1713Release()) ? 'v1.7.13' :", "(await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' : (await hasPublishedJevbenchV1713Release()) ? 'v1.7.13' :"),
    ('test/jevbench-v1637-release.test.mjs', "(await hasPublishedJevbenchV1713Release()) ? 'v1.7.13' :", "(await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' : (await hasPublishedJevbenchV1713Release()) ? 'v1.7.13' :"),
    ('test/jevbench-feed-live-board.test.mjs', "(await hasPublishedJevbenchV1713Release()) ? 'v1.7.13' :", "(await hasPublishedJevbenchV1714Release()) ? 'v1.7.14' : (await hasPublishedJevbenchV1713Release()) ? 'v1.7.13' :")]:
    edit(name, "import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';",
         "import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';\nimport { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';")
    edit(name, old_, new_)
edit('test/cr-205-jev-page-structure.test.mjs', "'v1.7.12', 'v1.7.13'].sort());", "'v1.7.12', 'v1.7.13', 'v1.7.14'].sort());")
# v1.7.13's own draw-entry test pinned releases ['v1.7.13']; a same-draw addendum appends to it (the first release stays v1.7.13).
edit('test/jevbench-v1713-release.test.mjs',
     " assert.deepEqual({...d},{draw:V1713_NEW_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:['v1.7.13'],latest_release:'v1.7.13',status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});",
     " // Later same-draw addenda (v1.7.14+) append to releases; the draw was first released in v1.7.13 and its latest release is the newest entry.\n"
     " assert.equal(d.releases[0],'v1.7.13');assert.equal(d.latest_release,d.releases.at(-1));assert.ok(d.releases.every(r=>/^v1\\.7\\.\\d+$/.test(r)));\n"
     " assert.deepEqual({...d,releases:undefined,latest_release:undefined},{draw:V1713_NEW_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:undefined,latest_release:undefined,status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});")
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text); json.loads(text)
print('wired v1.7.14; predecessor chain retained; 27 Oct draw entry now lists v1.7.13 and v1.7.14 (joins via the v1.7 addendum chain)')
