"""Wire the v1.6.39 release into the site: API route, release page, release list, revision lists, nav, history availability, cohort reader and
draw table. Idempotent; every replacement is asserted. Usage: wire_v1639.py <worktree>"""

import pathlib, json, sys

WT = pathlib.Path(sys.argv[1])
_ROWS = json.loads((pathlib.Path(__file__).resolve().parent / "batch/ROWS.json").read_text())
assert sorted(_ROWS) == ["h2o-lightning-31b"]
LABEL = "H2O-Lightning-31B"
REV = "v1.6.39"
PREV = "v1.6.38"
# ---- route ----------------------------------------------------------------------------------------
route = WT / f"app/api/jevbench/{REV}/route.ts"
route.parent.mkdir(parents=True, exist_ok=True)
route.write_text(
    (WT / f"app/api/jevbench/{PREV}/route.ts")
    .read_text()
    .replace("V1638", "V1639")
    .replace("v1638-release", "v1639-release")
)
assert (
    "V1638" not in route.read_text()
    and "readOptionalJevbenchV1639Release" in route.read_text()
)

p = WT / "app/jev-models/v1.6.39/page.tsx"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(
    """import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1639Release, v1639BoardInput } from '../../../lib/jevbench-v1639-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
export const metadata = {title: 'JevBench v1.6.39 · """+LABEL+"""', alternates:{canonical:'/jev-models/v1.6.39'}};
export default async function JevModelsV1639Page() {
 const release=await readOptionalJevbenchV1639Release();if(!release) notFound();
 const board=v1639BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><JevBenchReleaseVersionNav active="v1.6.39" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.39 · one paid fast-lane addition</div>
 <h1 className="mt-1 text-3xl font-bold">"""+LABEL+""" added</h1>
 <p className="mt-3 max-w-3xl">One paid public fast-lane addition on the same draw and common cost basis: a self-hosted model measured as its author ships it (one-engine FP8 profile, two-way reading by default), priced as an estimate from its exact base model. All carried rows retain every score and confidence interval; only placement changes. Pricing, hosting and provenance are disclosed below.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.39">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.38">Previous v1.6.38</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={board.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1639-method><h2 className="text-2xl font-bold">What changed in v1.6.39</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
"""
)
p = WT / "lib/jevbench-releases.mjs"
s = p.read_text()
s = "".join(l for l in s.splitlines(keepends=True) if "version: 'v1.6.39'" not in l)
entry = "  { version: 'v1.6.39', date: '2026-10-22', href: '/jev-models/v1.6.39', text: 'One paid public fast-lane addition: H2O-Lightning-31B (H2O.ai, self-hosted, one-engine FP8 profile). Same draw and common cost basis; all carried scores and intervals retained. Priced as an estimate from its exact base model google/gemma-4-31B-it; all 1,500 items answered in full.' },\n"
assert s.count("  { version: 'v1.6.38'") == 1
p.write_text(s.replace("  { version: 'v1.6.38'", entry + "  { version: 'v1.6.38'", 1))
# ---- revision lists, nav, history availability, cohort reader, equating ----------------------------
p = WT / "lib/jevbench-categories.mjs"
t = p.read_text()
if "'v1.6.39'" not in t:
    old = "'v1.6.37', 'v1.6.38'];"
    assert t.count(old) == 2
    t = t.replace(old, "'v1.6.37', 'v1.6.38', 'v1.6.39'];")
p.write_text(t)
p = WT / "components/JevBenchReleaseVersionNav.tsx"
t = p.read_text()
if "'v1.6.39'" not in t:
    assert t.count("type JevRelease = 'v1.6.38' | ") == 1
    t = t.replace("type JevRelease = ", "type JevRelease = 'v1.6.39' | ")
p.write_text(t)
p = WT / "components/JevReleaseHistory.tsx"
t = p.read_text()
if "hasPublishedJevbenchV1639Release" not in t:
    a = "import { hasPublishedJevbenchV1638Release } from '../lib/jevbench-v1638-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { hasPublishedJevbenchV1639Release } from '../lib/jevbench-v1639-release.mjs';")
    for x, y in (
        ("v1637, v1638] =", "v1637, v1638, v1639] ="),
        ("hasPublishedJevbenchV1638Release()]);", "hasPublishedJevbenchV1638Release(), hasPublishedJevbenchV1639Release()]);"),
        ("!v1638 && 'v1.6.38']", "!v1638 && 'v1.6.38', !v1639 && 'v1.6.39']"),
    ):
        assert t.count(x) == 1, x
        t = t.replace(x, y)
p.write_text(t)
p = WT / "lib/jevbench-cohort-merge.mjs"
t = p.read_text()
if "readOptionalJevbenchV1639Release" not in t:
    a = "import { readOptionalJevbenchV1638Release } from './jevbench-v1638-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { readOptionalJevbenchV1639Release } from './jevbench-v1639-release.mjs';")
    x = "'v1.6.38': readOptionalJevbenchV1638Release }"
    assert t.count(x) == 1
    t = t.replace(x, "'v1.6.38': readOptionalJevbenchV1638Release, 'v1.6.39': readOptionalJevbenchV1639Release }")
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
HF = "https://huggingface.co/"
PIN = "ca6e6f6e8e08e2d21c8c9f45261e05444626647a"
arch = {
    "h2o-lightning-31b": {
        "arch": "open-llm-decoder",
        "badges": {"derivation": "fine-tune", "params": "31B", "quant": None},
        "evidence": [
            {
                "url": HF + "h2oai/h2o-lightning-31b/blob/" + PIN + "/README.md",
                "kind": "model-card",
                "fact": "Pinned model card: H2O.ai decision model, card metadata base_model google/gemma-4-31B-it (finetune), pipeline image-text-to-text; served by the author's documented one-engine profile on vLLM 0.30.0 with the h2oai/vllm overlay, FP8 weights (vLLM online FP8 of the bf16 checkpoint), two-way reading by default; H2O Model Non-Commercial Licence v1.1.",
            },
            {
                "url": HF + "h2oai/h2o-lightning-31b/blob/" + PIN + "/config.json",
                "kind": "config.json",
                "fact": "architectures: [\"Gemma4ForConditionalGeneration\"]; model_type: \"gemma4\".",
            },
        ],
    }
}
p = WT / "data/jevbench-architecture.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(arch)
p.write_text(json.dumps(d, indent=2) + "\n")
base = {
    "h2o-lightning-31b": {
        "label": "google/gemma-4-31B-it",
        "status": "disclosed",
        "sources": [
            {
                "url": HF + "h2oai/h2o-lightning-31b/blob/" + PIN + "/README.md",
                "title": "Pinned model card",
                "evidence": "Card metadata base_model: google/gemma-4-31B-it (finetune).",
            }
        ],
        "checked_utc": "2026-10-22T00:00:00Z",
    }
}
p = WT / "data/jevbench-base-models.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(base)
p.write_text(json.dumps(d, indent=2) + "\n")
# The v1.6.38 archive reader binds the shared topic supplement to v1.6.38's results hash. Once the supplement is re-bound to v1.6.39
# (which the v1.6.39 reader checks strictly), the v1.6.38 reader must still work: accept the stacked successor's binding (the
# carried rows' cells are asserted identical by the v1.6.39 build) and keep its own strict check while it is the newest release.
p = WT / "lib/jevbench-v1638-release.mjs"
t = p.read_text()
old = "if(t?.release!=='v1.6.38'||t.results_sha256!==b.results.sha256)fail('comparison topic/results binding');"
new = "if(!(t?.release==='v1.6.38'&&t.results_sha256===b.results.sha256)&&t?.release!=='v1.6.39')fail('comparison topic/results binding');"
if new not in t:
    assert t.count(old) == 1
    t = t.replace(old, new)
p.write_text(t)
