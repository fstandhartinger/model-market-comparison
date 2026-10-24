import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1637Release, v1637BoardInput } from '../../../lib/jevbench-v1637-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = { description: 'JevBench v1.6.37 release — cost of H2O-Lightning-4B and Kahn1 corrected. Ranked decision-model results, sources and methodology on Benchmark Heaven.',title: seoTitle('JevBench v1.6.37 · cost of H2O-Lightning-4B and Kahn1 corrected'), alternates:{canonical:'/jev-models/v1.6.37'}};
export default async function JevModelsV1637Page() {
 const release=await readOptionalJevbenchV1637Release();if(!release) notFound();
 const board=v1637BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.37" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.37 · cost correction, no new measurement</div>
 <h1 className="mt-1 text-3xl font-bold">Cost of H2O-Lightning-4B and Kahn1 corrected</h1>
 <p className="mt-3 max-w-3xl">The earlier cost of H2O-Lightning-4B v1.1 and of Kahn1 4B used USD 0.04 per 1M input tokens. The frozen reference for Qwen/Qwen3.5-4B is USD 0.03 per 1M input and USD 0.15 per 1M output (DeepInfra, 25 Sep 2026 snapshot), so both costs are corrected in v1.6.37. No model was run again: Intelligence, Calibration, Capability and Speed of both rows are unchanged, and only their Cost axis, composites and composite intervals move. The corrected rows supersede the 7 Oct v1.6.1 rows on the live boards; the frozen v1.6.1 archive keeps them as published. All 69 carried full-draw rows keep every point estimate.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.37">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.36">Previous v1.6.36</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1637-method><h2 className="text-2xl font-bold">What changed in v1.6.37</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
