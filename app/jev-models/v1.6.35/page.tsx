import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1635Release, v1635BoardInput } from '../../../lib/jevbench-v1635-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = { description: 'JevBench v1.6.35 release — Seb-9B. Ranked decision-model results, sources and methodology on Benchmark Heaven.',title: seoTitle('JevBench v1.6.35 · Seb-9B'), alternates:{canonical:'/jev-models/v1.6.35'}};
export default async function JevModelsV1635Page() {
 const release=await readOptionalJevbenchV1635Release();if(!release) notFound();
 const board=v1635BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.35" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.35 · same-draw addendum</div>
 <h1 className="mt-1 text-3xl font-bold">Seb-9B re-measured at its corrected context</h1>
 <p className="mt-3 max-w-3xl">Seb-9B is re-measured at the author’s corrected 32,768-token context on the same draw and common cost basis as v1.6.34. All 64 carried full-draw rows keep their point estimates. Stock vLLM and our unchanged shim ran on a Verda A100 80 GB in the EU. The 15 items beyond the context limit were refused and scored wrong. The author now declares base Qwen/Qwen3.5-9B; the weights are unchanged. This measurement supersedes the 7 Oct v1.6.1 row on live boards; the frozen v1.6.1 archive keeps the old row as published.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.35">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.34">Previous v1.6.34</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1635-method><h2 className="text-2xl font-bold">What changed in v1.6.35</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
