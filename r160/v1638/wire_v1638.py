"""Wire the v1.6.38 release into the site: API route, release page, release list, revision lists, nav, history availability, cohort reader and
draw table. Idempotent; every replacement is asserted. Usage: wire_v1638.py <worktree>"""

import pathlib, json, sys

WT = pathlib.Path(sys.argv[1])
_ROWS = json.loads((pathlib.Path(__file__).resolve().parent / "batch/ROWS.json").read_text())
DREX = "drex-max" in _ROWS
NWL = "three" if DREX else "two"
NWU = NWL.capitalize()
LABEL = "Drex Max, Myles-G 12B and iota-decide-4b" if DREX else "Myles-G 12B and iota-decide-4b"
REV = "v1.6.38"
PREV = "v1.6.37"
# ---- route ----------------------------------------------------------------------------------------
route = WT / f"app/api/jevbench/{REV}/route.ts"
route.parent.mkdir(parents=True, exist_ok=True)
route.write_text(
    (WT / f"app/api/jevbench/{PREV}/route.ts")
    .read_text()
    .replace("V1637", "V1638")
    .replace("v1637-release", "v1638-release")
)
assert (
    "V1637" not in route.read_text()
    and "readOptionalJevbenchV1638Release" in route.read_text()
)

p = WT / "app/jev-models/v1.6.38/page.tsx"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(
    """import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1638Release, v1638BoardInput } from '../../../lib/jevbench-v1638-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
export const metadata = {title: 'JevBench v1.6.38 · """+LABEL+"""', alternates:{canonical:'/jev-models/v1.6.38'}};
export default async function JevModelsV1638Page() {
 const release=await readOptionalJevbenchV1638Release();if(!release) notFound();
 const board=v1638BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><JevBenchReleaseVersionNav active="v1.6.38" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.38 · """+NWL+""" paid fast-lane additions</div>
 <h1 className="mt-1 text-3xl font-bold">"""+LABEL+""" added</h1>
 <p className="mt-3 max-w-3xl">"""+NWU+""" paid public fast-lane additions on the same draw and common cost basis. """+("Drex Max retains two provider-overloaded failures. " if DREX else "")+"""Myles-G 12B and iota-decide-4b answered 15 truncated states, scored as answered. All carried rows retain every score and confidence interval; only placement changes. Pricing, hosting and provenance are disclosed below.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.38">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.37">Previous v1.6.37</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={board.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1638-method><h2 className="text-2xl font-bold">What changed in v1.6.38</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
"""
)
p = WT / "lib/jevbench-releases.mjs"
s = p.read_text()
s = "".join(l for l in s.splitlines(keepends=True) if "version: 'v1.6.38'" not in l)
entry = "  { version: 'v1.6.38', date: '2026-10-21', href: '/jev-models/v1.6.38', text: '" + NWU + " paid public fast-lane additions: " + ("Drex Max (Nace AI), " if DREX else "") + "Myles-G 12B (Launchables), and iota-decide-4b (Macrocosmos). Same draw and common cost basis; all carried scores and intervals retained. " + ("Two Drex overloaded failures retained; " if DREX else "") + "Myles and Iota answered 15 truncated states, scored as answered.' },\n"
assert s.count("  { version: 'v1.6.37'") == 1
p.write_text(s.replace("  { version: 'v1.6.37'", entry + "  { version: 'v1.6.37'", 1))
# ---- revision lists, nav, history availability, cohort reader, equating ----------------------------
p = WT / "lib/jevbench-categories.mjs"
t = p.read_text()
if "'v1.6.38'" not in t:
    old = "'v1.6.34', 'v1.6.35', 'v1.6.36', 'v1.6.37'];"
    assert t.count(old) == 2
    t = t.replace(old, "'v1.6.34', 'v1.6.35', 'v1.6.36', 'v1.6.37', 'v1.6.38'];")
p.write_text(t)
p = WT / "components/JevBenchReleaseVersionNav.tsx"
t = p.read_text()
if "'v1.6.38'" not in t:
    t = t.replace("type JevRelease = ", "type JevRelease = 'v1.6.38' | ")
p.write_text(t)
p = WT / "components/JevReleaseHistory.tsx"
t = p.read_text()
if "hasPublishedJevbenchV1638Release" not in t:
    a = "import { hasPublishedJevbenchV1637Release } from '../lib/jevbench-v1637-release.mjs';"
    assert a in t
    t = t.replace(
        a,
        a
        + "\nimport { hasPublishedJevbenchV1638Release } from '../lib/jevbench-v1638-release.mjs';",
    )
    for x, y in (
        ("v1634, v1635, v1636, v1637] =", "v1634, v1635, v1636, v1637, v1638] ="),
        (
            "hasPublishedJevbenchV1637Release()]);",
            "hasPublishedJevbenchV1637Release(), hasPublishedJevbenchV1638Release()]);",
        ),
        ("!v1637 && 'v1.6.37']", "!v1637 && 'v1.6.37', !v1638 && 'v1.6.38']"),
    ):
        assert t.count(x) == 1, x
        t = t.replace(x, y)
p.write_text(t)
p = WT / "lib/jevbench-cohort-merge.mjs"
t = p.read_text()
if "readOptionalJevbenchV1638Release" not in t:
    a = "import { readOptionalJevbenchV1637Release } from './jevbench-v1637-release.mjs';"
    assert a in t
    t = t.replace(
        a,
        a
        + "\nimport { readOptionalJevbenchV1638Release } from './jevbench-v1638-release.mjs';",
    )
    x = "'v1.6.37': readOptionalJevbenchV1637Release }"
    assert t.count(x) == 1
    t = t.replace(
        x,
        "'v1.6.37': readOptionalJevbenchV1637Release, 'v1.6.38': readOptionalJevbenchV1638Release }",
    )
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
# Architecture/base provenance feeds shared comparison and system pages.
HF = "https://huggingface.co/"
arch = {
    "drex-max": {
        "arch": "closed-api",
        "badges": {"derivation": None, "params": None, "quant": None},
        "evidence": [
            {
                "url": "https://drex.nace.ai/docs/drex/reference/pricing",
                "kind": "provider-docs",
                "fact": "Nace AI vendor-hosted Drex Max API; public launch input tariff, output not billed; deployed model and serving stack not independently inspected.",
            }
        ],
    },
    "launchables-myles-g-12b": {
        "arch": "closed-api",
        "badges": {"derivation": None, "params": None, "quant": None},
        "evidence": [
            {
                "url": "https://www.launchables.ai/licensing",
                "kind": "provider-docs",
                "fact": "Launchables vendor-hosted Myles-G 12B API. Customer states merged LoRA on google/gemma-4-12B-it; deployed weights and serving stack not independently inspected.",
            }
        ],
    },
    "iota-decide-4b": {
        "arch": "open-llm-decoder",
        "badges": {"derivation": "fine-tune", "params": "4B", "quant": "bf16"},
        "evidence": [
            {
                "url": HF
                + "macrocosm-os/iota-decide-4b/blob/bd88855a7e3379468537e0142d5f0ada079aca41/README.md",
                "kind": "model-card",
                "fact": "Macrocosmos Clef joint-head 4B on Qwen/Qwen3.5-4B-Base; one forward pass, no generated tokens; measured on Verda A100 80 GB through a first-party bridge.",
            }
        ],
    },
}
if not DREX:
    arch.pop("drex-max")
p = WT / "data/jevbench-architecture.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(arch)
p.write_text(json.dumps(d, indent=2) + "\n")
base = {
    "drex-max": {
        "label": "undisclosed",
        "status": "undisclosed",
        "sources": [],
        "note": "No public base model declared; proprietary vendor-hosted API.",
        "checked_utc": "2026-10-21T00:00:00Z",
    },
    "launchables-myles-g-12b": {
        "label": "google/gemma-4-12B-it",
        "status": "self-reported",
        "sources": [],
        "note": "Customer states merged LoRA on Gemma 4 12B; not independently verified.",
        "checked_utc": "2026-10-21T00:00:00Z",
    },
    "iota-decide-4b": {
        "label": "Qwen/Qwen3.5-4B-Base",
        "status": "disclosed",
        "sources": [
            {
                "url": HF
                + "macrocosm-os/iota-decide-4b/blob/bd88855a7e3379468537e0142d5f0ada079aca41/README.md",
                "title": "Pinned model card",
                "evidence": "Author declares Qwen/Qwen3.5-4B-Base and Cloudflare Clef joint-head distillation.",
            }
        ],
        "checked_utc": "2026-10-21T00:00:00Z",
    },
}
if not DREX:
    base.pop("drex-max")
p = WT / "data/jevbench-base-models.json"
d = json.loads(p.read_text())
d["benchmarks"]["jevbench"].update(base)
p.write_text(json.dumps(d, indent=2) + "\n")
