import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1639Release, v1639BoardInput } from '../../../lib/jevbench-v1639-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = { description: 'JevBench v1.6.39 release — H2O-Lightning-31B. Ranked decision-model results, sources and methodology on Benchmark Heaven.',title: seoTitle('JevBench v1.6.39 · H2O-Lightning-31B'), alternates:{canonical:'/jev-models/v1.6.39'}};
export default async function JevModelsV1639Page() {
 const release=await readOptionalJevbenchV1639Release();if(!release) notFound();
 const board=v1639BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.39" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.39 · one paid fast-lane addition</div>
 <h1 className="mt-1 text-3xl font-bold">H2O-Lightning-31B added</h1>
 <p className="mt-3 max-w-3xl">One paid public fast-lane addition on the same draw and common cost basis: a self-hosted model measured as its author ships it (one-engine FP8 profile, two-way reading by default), priced as an estimate from its exact base model. All carried rows retain every score and confidence interval; only placement changes. Pricing, hosting and provenance are disclosed below.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.39">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.38">Previous v1.6.38</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={board.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1639-method><h2 className="text-2xl font-bold">What changed in v1.6.39</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
