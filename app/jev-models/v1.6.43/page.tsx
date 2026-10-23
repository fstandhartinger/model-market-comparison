import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1643Release, v1643BoardInput } from '../../../lib/jevbench-v1643-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
export const metadata = {title: 'JevBench v1.6.43 · SubQ Snap 1.1', alternates:{canonical:'/jev-models/v1.6.43'}};
export default async function JevModelsV1643Page() {
 const release=await readOptionalJevbenchV1643Release();if(!release) notFound();
 const board=v1643BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><JevBenchReleaseVersionNav active="v1.6.43" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.6.43 · one hosted API addition</div>
 <h1 className="mt-1 text-3xl font-bold">SubQ Snap 1.1 added</h1>
 <p className="mt-3 max-w-3xl">SubQ Snap 1.1 joins the hosted API board alongside its historical 13 Oct preview measurement. Public-preview capacity limits, same-author second exposure, published pricing and the sealed-versus-public check are disclosed below. All carried scores and confidence intervals are retained; only placement changes.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.6.43">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.6.42">Previous v1.6.42</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={board.categoriesSha256}
 carry={{...release.historical.carry,rows:[]}} carrySha256={release.historical.carrySha256} previousKeys={historicalCatalogue(release.historical.artifact, release.historical.carry).map(row => row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1643-method><h2 className="text-2xl font-bold">What changed in v1.6.43</h2>
 <p>{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
 {notes.map((note,index)=><p className="mt-2" key={index}>{note}</p>)}</section><JevHistoryLazy /></>;
}
