import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1636Release, v1636BoardInput } from '../../../lib/jevbench-v1636-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title: seoTitle('JevBench v1.6.36 · Myles-G 31B, HS1, Arbiter-4B, Decider-4B'), alternates:{canonical:'/jev-models/v1.6.36'}};
export default async function JevModelsV1636Page() {
 const release=await readOptionalJevbenchV1636Release();if(!release) notFound();
 const board=v1636BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.36" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.36 · same-draw addendum</div>
 <h1 className="mt-1 text-3xl font-bold">Myles-G 31B, HS1, Arbiter-4B and Decider-4B added</h1>
 <p className="mt-3 max-w-3xl">Four rows are added on the same draw and the same common cost basis as v1.6.35: two paid fast-lane vendor-hosted APIs (Myles-G 31B from Launchables and HS1 from Hyland) and two free-queue self-hosted models (Arbiter-4B and Decider-4B). All 65 carried full-draw rows keep their point estimates. All four are priced as base-model estimates, as for attest-31B-v1.0; the vendor and customer tariffs are shown in the row notes and do not count. Myles-G 31B answered the 15 longest items on silently truncated input; they are scored as answered and the accuracy split is disclosed. HS1 was asked 64 items twice by an operator error; the first answer is scored. The Arbiter-4B and Decider-4B author servers refuse the 15 longest items, which are scored as wrong.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.36">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.35">Previous v1.6.35</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1636-method><h2 className="text-2xl font-bold">What changed in v1.6.36</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
