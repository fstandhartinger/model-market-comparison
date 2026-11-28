import { jevMethodLabel } from '../../../lib/jev-decision-limit.mjs';
import { seoTitle } from '../../../lib/seo';
import { notFound } from 'next/navigation';
import { readJevbenchV1823ForBoard, v1823BoardInput } from '../../../lib/jevbench-v1823-release.mjs';
import { JevBenchArchiveBoard } from '../../../components/JevBenchArchiveBoard';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { readJevbenchV157Release, withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { readJevbenchV161Release } from '../../../lib/jevbench-v16-release.mjs';
import { assembleJevBoard } from '../../../lib/jevbench-live-board.mjs';
import apiA4 from '../../../data/jevbench-api-a4-equated.json';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:seoTitle('JevBench v1.8.23: three new unranked rows'),description:'Added Starlord-4B-v2.2-preview, Starlord-27B-v2.2-preview and Sieve-31B-v4 on the 22 November draw. The three rows are unranked while anchor runs are pending.',alternates:{canonical:'/jev-models/v1.8.23'}};
export default async function JevModelsV1823Page() {
 const release=await readJevbenchV1823ForBoard();if(!release)notFound();
 const [base,previous]=await Promise.all([readJevbenchV161Release(),readJevbenchV157Release()]);
 const chain=await assembleJevBoard({release:{artifact:base.artifact,categories:base.categories,carry:base.carry},previous,live:true,apiA4});
 const board=v1823BoardInput(release,chain);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.8.23"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.8.23 · {jevMethodLabel('v1.8.23')}</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.8.23: three new unranked rows</h1>
 <p className="mt-3 max-w-3xl">Added Starlord-4B-v2.2-preview, Starlord-27B-v2.2-preview and Sieve-31B-v4 on the 22 November draw. The three rows are unranked while anchor runs are pending.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.8.23">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.8.22">Previous v1.8.22</a></p></header>
 <JevBenchArchiveBoard version="v1.8.23" artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.8.23' && row.new_in!=='v1.8.23').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1823-method><h2 className="text-2xl font-bold">What changed in v1.8.23</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
