"""Wire the v1.6.42 release into the site: API route, release page, release list, revision lists, nav, history availability, cohort reader and
draw table. Idempotent; every replacement is asserted. Usage: wire_v1642.py <worktree>"""

import pathlib, json, sys

WT = pathlib.Path(sys.argv[1])
_ROWS = json.loads((pathlib.Path(__file__).resolve().parent / "batch/ROWS.json").read_text())
assert sorted(_ROWS) == ["torchcast-decision-4b-v1.3"]
LABEL = "Torchcast Decision 4B (v1.3)"
REV = "v1.6.42"
PREV = "v1.6.40"
# ---- route ----------------------------------------------------------------------------------------
route = WT / f"app/api/jevbench/{REV}/route.ts"
route.parent.mkdir(parents=True, exist_ok=True)
route.write_text(
    (WT / f"app/api/jevbench/{PREV}/route.ts")
    .read_text()
    .replace("V1640", "V1642")
    .replace("v1640-release", "v1642-release")
)
assert (
    "V1640" not in route.read_text()
    and "readOptionalJevbenchV1642Release" in route.read_text()
)

p = WT / "app/jev-models/v1.6.42/page.tsx"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(
    """import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1642Release, v1642BoardInput } from '../../../lib/jevbench-v1642-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
export const metadata = {title: 'JevBench v1.6.42 · """+LABEL+"""', alternates:{canonical:'/jev-models/v1.6.42'}};
export default async function JevModelsV1642Page() {
 const release=await readOptionalJevbenchV1642Release();if(!release) notFound();
 const board=v1642BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><JevBenchReleaseVersionNav active="v1.6.42" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.42 · one paid fast-lane addition</div>
 <h1 className="mt-1 text-3xl font-bold">"""+LABEL+""" added</h1>
 <p className="mt-3 max-w-3xl">One paid public fast-lane addition on the same draw and common cost basis: Torchcast Decision 4B v1.3, a self-hosted model measured as its author ships it (the author's own server unchanged, non-causal full attention as trained), priced as an estimate from its declared base model. It is a new version next to v1.2, which stays listed. All carried rows retain every score and confidence interval; only placement changes. Pricing, hosting and provenance are disclosed below.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.42">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.40">Previous v1.6.40</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={board.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1642-method><h2 className="text-2xl font-bold">What changed in v1.6.42</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
"""
)
p = WT / "lib/jevbench-releases.mjs"
s = p.read_text()
s = "".join(l for l in s.splitlines(keepends=True) if "version: 'v1.6.42'" not in l)
entry = "  { version: 'v1.6.42', date: '2026-10-23', href: '/jev-models/v1.6.42', text: 'One paid public fast-lane addition: Torchcast Decision 4B (v1.3) (Torchcast AI, self-hosted, the author-supplied server unchanged). Same draw and common cost basis; all carried scores and intervals retained. Priced as an estimate from its declared base model Qwen/Qwen3.5-4B; all 1,500 items answered, none over 10 seconds. A new version next to v1.2; v1.6.41 is not used.' },\n"
assert s.count("  { version: 'v1.6.40'") == 1
p.write_text(s.replace("  { version: 'v1.6.40'", entry + "  { version: 'v1.6.40'", 1))
# ---- revision lists, nav, history availability, cohort reader, equating ----------------------------
p = WT / "lib/jevbench-categories.mjs"
t = p.read_text()
if "'v1.6.42'" not in t:
    old = "'v1.6.39', 'v1.6.40'];"
    assert t.count(old) == 2
    t = t.replace(old, "'v1.6.39', 'v1.6.40', 'v1.6.42'];")
p.write_text(t)
p = WT / "components/JevBenchReleaseVersionNav.tsx"
t = p.read_text()
if "'v1.6.42'" not in t:
    assert t.count("type JevRelease = 'v1.6.40' | ") == 1
    t = t.replace("type JevRelease = ", "type JevRelease = 'v1.6.42' | ")
p.write_text(t)
p = WT / "components/JevReleaseHistory.tsx"
t = p.read_text()
if "hasPublishedJevbenchV1642Release" not in t:
    a = "import { hasPublishedJevbenchV1640Release } from '../lib/jevbench-v1640-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { hasPublishedJevbenchV1642Release } from '../lib/jevbench-v1642-release.mjs';")
    for x, y in (
        ("v1639, v1640] =", "v1639, v1640, v1642] ="),
        ("hasPublishedJevbenchV1640Release()]);", "hasPublishedJevbenchV1640Release(), hasPublishedJevbenchV1642Release()]);"),
        ("!v1640 && 'v1.6.40']", "!v1640 && 'v1.6.40', !v1642 && 'v1.6.42']"),
    ):
        assert t.count(x) == 1, x
        t = t.replace(x, y)
p.write_text(t)
p = WT / "lib/jevbench-cohort-merge.mjs"
t = p.read_text()
if "readOptionalJevbenchV1642Release" not in t:
    a = "import { readOptionalJevbenchV1640Release } from './jevbench-v1640-release.mjs';"
    assert t.count(a) == 1
    t = t.replace(a, a + "\nimport { readOptionalJevbenchV1642Release } from './jevbench-v1642-release.mjs';")
    x = "'v1.6.40': readOptionalJevbenchV1640Release }"
    assert t.count(x) == 1
    t = t.replace(x, "'v1.6.40': readOptionalJevbenchV1640Release, 'v1.6.42': readOptionalJevbenchV1642Release }")
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
PIN = "004acea2e23056bc79415cfa69b9f3ea4254e6d0"
arch = {
    "torchcast-decision-4b-v1.3": {
        "arch": "open-llm-decoder",
        "badges": {"derivation": "fine-tune", "params": "4B", "quant": None},
        "evidence": [
            {
                "url": HF + "torchcast-ai/torchcast-decision-4b/blob/" + PIN + "/README.md",
                "kind": "model-card",
                "fact": "Pinned v1.3 card (tag v1.3.0): Qwen/Qwen3.5-4B fine-tune (base_model_relation finetune), option-letter readout without generation, Apache-2.0 weights; noncausal_full_attention as trained, calibration temperature 0.9, yes/no commit floor 0.801.",
            }
        ],
    }
}
p = WT / "data/jevbench-architecture.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(arch)
p.write_text(json.dumps(d, indent=2) + "\n")
base = {
    "torchcast-decision-4b-v1.3": {
        "label": "Qwen/Qwen3.5-4B",
        "status": "disclosed",
        "sources": [
            {
                "url": HF + "torchcast-ai/torchcast-decision-4b/blob/" + PIN + "/README.md",
                "title": "Pinned model card",
                "evidence": "Card metadata base_model: Qwen/Qwen3.5-4B (finetune).",
            }
        ],
        "checked_utc": "2026-10-23T00:00:00Z",
    }
}
p = WT / "data/jevbench-base-models.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(base)
p.write_text(json.dumps(d, indent=2) + "\n")
# The v1.6.40 archive reader's topic-supplement binding is hardened in lib/jevbench-v1640-release.mjs by hand (v1640TopicSupplementBinds:
# a v1.6.42-bound supplement is accepted only if the carried cells equal v1.6.40's pinned hash); here only assert it is in place.
t = (WT / "lib/jevbench-v1640-release.mjs").read_text()
assert "v1640TopicSupplementBinds(t,b.results.sha256" in t
