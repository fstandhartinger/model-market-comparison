"""Wire the v1.6.43 release into the site: API route, release page, release list, revision lists, nav, history availability, cohort reader and
draw table. Idempotent; every replacement is asserted. Usage: wire_v1643.py <worktree>"""

import pathlib, json, sys

WT = pathlib.Path(sys.argv[1])
_ROWS = json.loads((pathlib.Path(__file__).resolve().parent / "batch/ROWS.json").read_text())
assert sorted(_ROWS) == ["subq-snap-1.1"]
LABEL = "SubQ Snap 1.1"
REV = "v1.6.43"
PREV = "v1.6.42"
# ---- route ----------------------------------------------------------------------------------------
route = WT / f"app/api/jevbench/{REV}/route.ts"
route.parent.mkdir(parents=True, exist_ok=True)
route.write_text(
    (WT / f"app/api/jevbench/{PREV}/route.ts")
    .read_text()
    .replace("V1642", "V1643")
    .replace("v1642-release", "v1643-release")
)
assert (
    "V1642" not in route.read_text()
    and "readOptionalJevbenchV1643Release" in route.read_text()
)

p = WT / "app/jev-models/v1.6.43/page.tsx"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(
    """import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1643Release, v1643BoardInput } from '../../../lib/jevbench-v1643-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = { description: 'JevBench v1.6.43 release — """+LABEL+""". Ranked decision-model results, sources and methodology on Benchmark Heaven.',title: 'JevBench v1.6.43 · """+LABEL+"""', alternates:{canonical:'/jev-models/v1.6.43'}};
export default async function JevModelsV1643Page() {
 const release=await readOptionalJevbenchV1643Release();if(!release) notFound();
 const board=v1643BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.43" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.43 · one hosted API addition</div>
 <h1 className="mt-1 text-3xl font-bold">"""+LABEL+""" added</h1>
 <p className="mt-3 max-w-3xl">SubQ Snap 1.1 joins the hosted API board alongside its historical 13 Oct preview measurement. Public-preview capacity limits, same-author second exposure, published pricing and the sealed-versus-public check are disclosed below. All carried scores and confidence intervals are retained; only placement changes.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.43">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.42">Previous v1.6.42</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={board.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1643-method><h2 className="text-2xl font-bold">What changed in v1.6.43</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
"""
)
p = WT / "lib/jevbench-releases.mjs"
s = p.read_text()
s = "".join(l for l in s.splitlines(keepends=True) if "version: 'v1.6.43'" not in l)
entry = "  { version: 'v1.6.43', date: '2026-10-23', href: '/jev-models/v1.6.43', text: 'SubQ Snap 1.1 hosted API addition alongside the historical preview row. Capacity-limited public preview; same-author second use after the 13 Oct exposure, with the S/P check disclosed. Same draw and common cost basis; all carried scores and intervals retained.' },\n"
assert s.count("  { version: 'v1.6.42'") == 1
p.write_text(s.replace("  { version: 'v1.6.42'", entry + "  { version: 'v1.6.42'", 1))
# ---- revision lists, nav, history availability, cohort reader, equating ----------------------------
p = WT / "lib/jevbench-categories.mjs"
t = p.read_text()
if "'v1.6.43'" not in t:
    old = "'v1.6.39', 'v1.6.40', 'v1.6.42'];"
    assert t.count(old) == 2
    t = t.replace(old, "'v1.6.39', 'v1.6.40', 'v1.6.42', 'v1.6.43'];")
p.write_text(t)
p = WT / "components/JevBenchReleaseVersionNav.tsx"
t = p.read_text()
if "'v1.6.43'" not in t:
    assert t.count("type JevRelease = 'v1.6.42' | ") == 1
    t = t.replace("type JevRelease = ", "type JevRelease = 'v1.6.43' | ")
p.write_text(t)
p = WT / "components/JevReleaseHistory.tsx"
t = p.read_text()
if "hasPublishedJevbenchV1643Release" not in t:
    a = "import { hasPublishedJevbenchV1642Release } from '../lib/jevbench-v1642-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { hasPublishedJevbenchV1643Release } from '../lib/jevbench-v1643-release.mjs';")
    for x, y in (
        ("v1639, v1640, v1642] =", "v1639, v1640, v1642, v1643] ="),
        ("hasPublishedJevbenchV1642Release()]);", "hasPublishedJevbenchV1642Release(), hasPublishedJevbenchV1643Release()]);"),
        ("!v1642 && 'v1.6.42']", "!v1642 && 'v1.6.42', !v1643 && 'v1.6.43']"),
    ):
        assert t.count(x) == 1, x
        t = t.replace(x, y)
p.write_text(t)
p = WT / "lib/jevbench-cohort-merge.mjs"
t = p.read_text()
if "readOptionalJevbenchV1643Release" not in t:
    a = "import { readOptionalJevbenchV1642Release } from './jevbench-v1642-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { readOptionalJevbenchV1643Release } from './jevbench-v1643-release.mjs';")
    x = "'v1.6.42': readOptionalJevbenchV1642Release }"
    assert t.count(x) == 1
    t = t.replace(x, "'v1.6.42': readOptionalJevbenchV1642Release, 'v1.6.43': readOptionalJevbenchV1643Release }")
p.write_text(t)
p = WT / "data/jevbench-draw-equating.json"
d = json.loads(p.read_text())
hits = []


def update(x):
    if isinstance(x, dict):
        if x.get("latest_release") in (PREV, REV):
            x["latest_release"] = REV
            if REV not in x["releases"]:
                x["releases"].append(REV)
            hits.append(1)
        for v in x.values():
            update(v)
    elif isinstance(x, list):
        for v in x:
            update(v)


update(d)
assert len(hits) == 1, hits
p.write_text(json.dumps(d, indent=2) + "\n")
print("wired", REV)

import copy
p=WT/'data/jevbench-architecture.json';d=json.loads(p.read_text());rows=d['benchmarks']['jevbench'];rows['subq-snap-1.1']={'arch':'closed-api','badges':{'derivation':None,'params':None,'quant':None},'evidence':[{'url':'https://docs.subq.ai/using-the-api/models/','kind':'provider-docs','fact':'SubQ Snap 1.1 is a vendor-hosted API with native probabilities; deployed weights and base model are undisclosed.'}]};p.write_text(json.dumps(d,indent=2)+'\n')
# No base-model claim is invented for this closed API; absent entry renders undisclosed.
