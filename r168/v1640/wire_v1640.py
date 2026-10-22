"""Wire the v1.6.40 release into the site: API route, release page, release list, revision lists, nav, history availability, cohort reader and
draw table. Idempotent; every replacement is asserted. Usage: wire_v1640.py <worktree>"""

import pathlib, json, sys

WT = pathlib.Path(sys.argv[1])
_ROWS = json.loads((pathlib.Path(__file__).resolve().parent / "batch/ROWS.json").read_text())
assert sorted(_ROWS) == ["fastino-glide-api"]
LABEL = "Fastino GLiDE (hosted API)"
REV = "v1.6.40"
PREV = "v1.6.39"
# ---- route ----------------------------------------------------------------------------------------
route = WT / f"app/api/jevbench/{REV}/route.ts"
route.parent.mkdir(parents=True, exist_ok=True)
route.write_text(
    (WT / f"app/api/jevbench/{PREV}/route.ts")
    .read_text()
    .replace("V1639", "V1640")
    .replace("v1639-release", "v1640-release")
)
assert (
    "V1639" not in route.read_text()
    and "readOptionalJevbenchV1640Release" in route.read_text()
)

p = WT / "app/jev-models/v1.6.40/page.tsx"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(
    """import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1640Release, v1640BoardInput } from '../../../lib/jevbench-v1640-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
export const metadata = {title: 'JevBench v1.6.40 · """+LABEL+"""', alternates:{canonical:'/jev-models/v1.6.40'}};
export default async function JevModelsV1640Page() {
 const release=await readOptionalJevbenchV1640Release();if(!release) notFound();
 const board=v1640BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><JevBenchReleaseVersionNav active="v1.6.40" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.40 · one hosted-API addition</div>
 <h1 className="mt-1 text-3xl font-bold">"""+LABEL+""" added</h1>
 <p className="mt-3 max-w-3xl">One hosted-API addition on the same draw and common cost basis: Fastino's GLiDE, measured on 22 Oct 2026 and scored on 1,497 of the draw's 1,500 items (three items the vendor had already seen were never sent). It is priced from the operator's published tariff. All carried rows retain every score and confidence interval; only placement changes. Pricing, hosting and provenance are disclosed below.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.40">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.39">Previous v1.6.39</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={board.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1640-method><h2 className="text-2xl font-bold">What changed in v1.6.40</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
"""
)
p = WT / "lib/jevbench-releases.mjs"
s = p.read_text()
s = "".join(l for l in s.splitlines(keepends=True) if "version: 'v1.6.40'" not in l)
entry = "  { version: 'v1.6.40', date: '2026-10-22', href: '/jev-models/v1.6.40', text: 'One hosted-API addition: Fastino GLiDE (api.fastino.ai, model fastino/GLiDE, USD 0.04 per 1M input tokens). Scored on 1,497 of the 1,500 items of the draw: three items the vendor had already seen were never sent. Same draw and common cost basis; all carried scores and intervals retained. The 6 Oct measurement of the same vendor (key fastino-glide) stays as history.' },\n"
assert s.count("  { version: 'v1.6.39'") == 1
p.write_text(s.replace("  { version: 'v1.6.39'", entry + "  { version: 'v1.6.39'", 1))
# ---- revision lists, nav, history availability, cohort reader, equating ----------------------------
p = WT / "lib/jevbench-categories.mjs"
t = p.read_text()
if "'v1.6.40'" not in t:
    old = "'v1.6.38', 'v1.6.39'];"
    assert t.count(old) == 2
    t = t.replace(old, "'v1.6.38', 'v1.6.39', 'v1.6.40'];")
p.write_text(t)
p = WT / "components/JevBenchReleaseVersionNav.tsx"
t = p.read_text()
if "'v1.6.40'" not in t:
    assert t.count("type JevRelease = 'v1.6.39' | ") == 1
    t = t.replace("type JevRelease = ", "type JevRelease = 'v1.6.40' | ")
p.write_text(t)
p = WT / "components/JevReleaseHistory.tsx"
t = p.read_text()
if "hasPublishedJevbenchV1640Release" not in t:
    a = "import { hasPublishedJevbenchV1639Release } from '../lib/jevbench-v1639-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { hasPublishedJevbenchV1640Release } from '../lib/jevbench-v1640-release.mjs';")
    for x, y in (
        ("v1638, v1639] =", "v1638, v1639, v1640] ="),
        ("hasPublishedJevbenchV1639Release()]);", "hasPublishedJevbenchV1639Release(), hasPublishedJevbenchV1640Release()]);"),
        ("!v1639 && 'v1.6.39']", "!v1639 && 'v1.6.39', !v1640 && 'v1.6.40']"),
    ):
        assert t.count(x) == 1, x
        t = t.replace(x, y)
p.write_text(t)
p = WT / "lib/jevbench-cohort-merge.mjs"
t = p.read_text()
if "readOptionalJevbenchV1640Release" not in t:
    a = "import { readOptionalJevbenchV1639Release } from './jevbench-v1639-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { readOptionalJevbenchV1640Release } from './jevbench-v1640-release.mjs';")
    x = "'v1.6.39': readOptionalJevbenchV1639Release }"
    assert t.count(x) == 1
    t = t.replace(x, "'v1.6.39': readOptionalJevbenchV1639Release, 'v1.6.40': readOptionalJevbenchV1640Release }")
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
arch = {
    "fastino-glide-api": {
        "arch": "closed-api",
        "badges": {"derivation": None, "params": None, "quant": None},
        "evidence": [
            {
                "url": "https://docs.fastino.ai/pricing.md",
                "kind": "provider-docs",
                "fact": "Fastino documents GLiDE behind POST /v1/systemone (model fastino/GLiDE) at USD 0.04 per 1M input tokens and no output charge; the API serves it as glide_v2; no evaluated weights are published.",
            }
        ],
    }
}
p = WT / "data/jevbench-architecture.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(arch)
p.write_text(json.dumps(d, indent=2) + "\n")
base = {
    "fastino-glide-api": {
        "label": "undisclosed",
        "status": "undisclosed",
        "sources": [],
        "note": "No public base model declared; proprietary vendor-hosted API.",
        "checked_utc": "2026-10-22T00:00:00Z",
    }
}
p = WT / "data/jevbench-base-models.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(base)
p.write_text(json.dumps(d, indent=2) + "\n")
# The v1.6.39 archive reader's topic-supplement binding is hardened in lib/jevbench-v1639-release.mjs by hand (v1639TopicSupplementBinds:
# a v1.6.40-bound supplement is accepted only if the carried cells equal v1.6.39's pinned hash); here only assert it is in place.
t = (WT / "lib/jevbench-v1639-release.mjs").read_text()
assert "v1639TopicSupplementBinds(t,b.results.sha256" in t
