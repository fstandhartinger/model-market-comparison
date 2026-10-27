"""Idempotent v1.7.13 integration (first release on draw v1.6-regular-20261027); predecessor chain unchanged.
The new draw joins data/jevbench-draw-equating.json for the board's draw table, marked joins_via "v1.7-addendum": its row
enters the live board through the v1.7.13 addendum, so the v1.6 cohort reader and the v1.6 chain's latest release
(which v1.7.0's restatement is bound to) skip it."""
import json, os, pathlib
J = pathlib.Path(__file__).resolve().parent; W = pathlib.Path(os.environ.get('WT', str(J.parents[1])))
HIST = "First release on the 27 Oct regular draw: H2O-Lightning-4B v1.4.1 (paid evaluation), shown unranked until the draw's anchor runs are complete."
# Earlier wired wordings of the v1.7.13 history line (replaced, never duplicated, on a rewire).
STALE_HIST = ['First release on the 27 Oct regular draw: H2O-Lightning-4B v1.4.1 (paid evaluation).']
def edit(name, old, new, count=1):
    p = W / name; s = p.read_text()
    if new in s: return
    assert s.count(old) == count, (name, old[:120], s.count(old))
    p.write_text(s.replace(old, new))
# API route + release page
p = W / 'app/api/jevbench/v1.7.13/route.ts'; p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((W / 'app/api/jevbench/v1.7.12/route.ts').read_text().replace('V1712', 'V1713').replace('v1712', 'v1713'))
p = W / 'app/jev-models/v1.7.13/page.tsx'; p.parent.mkdir(parents=True, exist_ok=True)
s = (W / 'app/jev-models/v1.7.12/page.tsx').read_text()
s = s.replace('v1.7.12', '__NEW__').replace('v1.7.11', 'v1.7.12').replace('__NEW__', 'v1.7.13').replace('V1712', 'V1713').replace('v1712', 'v1713').replace('jev1712', 'jev1713')
REPL = [
    ('self-hosted cost disclosures', 'first release on the 27 Oct regular draw', 3),
    ('Four existing rows receive cost-basis wording updates: Jez Large, Jez Small and two D1A Gemma 4 rows. Their numeric costs, scores, ranks and measurement records are unchanged. No new measurement or method change.',
     HIST.replace("'", '&apos;') + ' It is the first row measured on a fresh sealed draw drawn on 27 Oct 2026; that draw has no anchor runs yet, so its numbers are shown as published (offset 0) and it is not ranked: no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. Cost is an estimate from the base model price on the prompt tokens the model processed. Every existing row keeps its scores and confidence intervals; no method change.', 1),
    ('Jez Large, Jez Small and two D1A Gemma 4 rows receive cost-basis wording updates. Numeric costs, scores, ranks and measurement records stay unchanged.',
     'One new self-hosted row on a new draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.', 1),
]
for a, b, n in REPL:
    assert s.count(a) == n, ('page anchor', a[:80]); s = s.replace(a, b)
p.write_text(s)
# live board chain
edit('lib/jevbench-live-board.mjs', "import { readJevbenchV1712ForBoard, withV1712Addendum } from './jevbench-v1712-release.mjs';",
     "import { readJevbenchV1713ForBoard, withV1713Addendum } from './jevbench-v1713-release.mjs';\nimport { readJevbenchV1712ForBoard, withV1712Addendum } from './jevbench-v1712-release.mjs';")
edit('lib/jevbench-live-board.mjs', '  const v1712 = await readJevbenchV1712ForBoard(root);\n  return v1712 ? withV1712Addendum(throughV1711, v1712) : throughV1711;',
     '  const v1712 = await readJevbenchV1712ForBoard(root);\n  const throughV1712 = v1712 ? withV1712Addendum(throughV1711, v1712) : throughV1711;\n  const v1713 = await readJevbenchV1713ForBoard(root);\n  return v1713 ? withV1713Addendum(throughV1712, v1713) : throughV1712;')
edit('lib/jevbench-live-board.mjs', "return (await readJevbenchV1712ForBoard(root)) ? 'v1.7.12'", "return (await readJevbenchV1713ForBoard(root)) ? 'v1.7.13' : (await readJevbenchV1712ForBoard(root)) ? 'v1.7.12'")
# v1.6 chain: draws that join through a v1.7 addendum are not v1.6 cohort releases
edit('lib/jevbench-live-board.mjs', "  return [baseRelease, ...draws.map((d) => d.latest_release)].reduce(",
     "  return [baseRelease, ...draws.filter((d) => d.joins_via !== 'v1.7-addendum').map((d) => d.latest_release)].reduce(")
edit('lib/jevbench-cohort-merge.mjs', "  for (const draw of equating.draws) {\n    const read = readers[draw.latest_release];",
     "  for (const draw of equating.draws) {\n    // A draw first released in a v1.7 addendum (v1.7.13+) joins the live board through that addendum, not the v1.6 cohort chain.\n    if (draw.joins_via === 'v1.7-addendum') continue;\n    const read = readers[draw.latest_release];")
edit('lib/jevbench-cohort-merge.mjs', "    if (d.status === 'equated' && (d.anchors?.length ?? 0) < 5) throw new Error(`draw equating ${d.draw}: at least 5 anchors`);",
     "    if (d.status === 'equated' && (d.anchors?.length ?? 0) < 5) throw new Error(`draw equating ${d.draw}: at least 5 anchors`);\n    if (d.joins_via !== undefined && (d.joins_via !== 'v1.7-addendum' || !/^v1\\.7\\.\\d+$/.test(d.latest_release ?? ''))) throw new Error(`draw equating ${d.draw}: joins_via`);")
eq = W / 'data/jevbench-draw-equating.json'; t = json.loads(eq.read_text())
entry = {'draw': 'v1.6-regular-20261027', 'label': 'Third regular draw', 'drawn_on': '2026-10-27', 'releases': ['v1.7.13'], 'latest_release': 'v1.7.13',
         'status': 'anchor-runs-pending', 'offset': {'I': 0, 'C': 0}, 'offset_ci95': None, 'anchors': [], 'joins_via': 'v1.7-addendum'}
if not any(d['draw'] == entry['draw'] for d in t['draws']):
    t['draws'].append(entry); eq.write_text(json.dumps(t, indent=2, ensure_ascii=False) + '\n')
# navigation, categories, release list, history, sitemap
edit('components/JevBenchReleaseVersionNav.tsx', "type JevRelease = 'v1.7.12'", "type JevRelease = 'v1.7.13' | 'v1.7.12'")
edit('lib/jevbench-categories.mjs', "'v1.7.11', 'v1.7.12'];", "'v1.7.11', 'v1.7.12', 'v1.7.13'];")
for old in STALE_HIST:
    q = W / 'lib/jevbench-releases.mjs'; t = q.read_text()
    stale = "  { version: 'v1.7.13', date: '2026-10-28', href: '/jev-models/v1.7.13', text: '" + old + "' },\n"
    if stale in t: q.write_text(t.replace(stale, ''))
edit('lib/jevbench-releases.mjs', "  { version: 'v1.7.12'", "  { version: 'v1.7.13', date: '2026-10-28', href: '/jev-models/v1.7.13', text: '" + HIST.replace("'", "\\'") + "' },\n  { version: 'v1.7.12'")
edit('components/JevReleaseHistory.tsx', "import { hasPublishedJevbenchV1712Release } from '../lib/jevbench-v1712-release.mjs';",
     "import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';\nimport { hasPublishedJevbenchV1712Release } from '../lib/jevbench-v1712-release.mjs';")
edit('components/JevReleaseHistory.tsx', 'v1711, v1712] = await Promise.all([', 'v1711, v1712, v1713] = await Promise.all([')
edit('components/JevReleaseHistory.tsx', 'hasPublishedJevbenchV1712Release()]);', 'hasPublishedJevbenchV1712Release(), hasPublishedJevbenchV1713Release()]);')
edit('components/JevReleaseHistory.tsx', "!v1712 && 'v1.7.12'].filter(Boolean)", "!v1712 && 'v1.7.12', !v1713 && 'v1.7.13'].filter(Boolean)")
edit('app/sitemap.ts', "import { hasPublishedJevbenchV1712Release } from '../lib/jevbench-v1712-release.mjs';",
     "import { hasPublishedJevbenchV1712Release } from '../lib/jevbench-v1712-release.mjs';\nimport { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';")
edit('app/sitemap.ts', "  const v1712Visible = await hasPublishedJevbenchV1712Release();\n",
     "  const v1712Visible = await hasPublishedJevbenchV1712Release();\n  const v1713Visible = await hasPublishedJevbenchV1713Release();\n")
edit('app/sitemap.ts', ".filter((r: { version: string }) => r.version !== 'v1.7.12' || v1712Visible)",
     ".filter((r: { version: string }) => (r.version !== 'v1.7.12' || v1712Visible) && (r.version !== 'v1.7.13' || v1713Visible))")
p = W / 'data/jevbench-architecture.json'; text = p.read_text(); arch = json.loads((J / 'inputs/ARCHITECTURE.json').read_text())
for key, entry in arch.items():
    marker = '"' + key + '": '; encoded = json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n      ')
    if marker in text:
        start = text.index(marker) + len(marker); _, length = json.JSONDecoder().raw_decode(text[start:]); text = text[:start] + encoded + text[start + length:]
    else:
        boundary = '\n    },\n    "imagejevbench":'; assert boundary in text; text = text.replace(boundary, ',\n      ' + marker + encoded + boundary, 1)
p.write_text(text)
print('wired v1.7.13; predecessor chain retained; new draw in the equating table (joins via the v1.7.13 addendum)')
