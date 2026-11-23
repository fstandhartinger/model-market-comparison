import { jevMethodLabel } from '../../../lib/jev-decision-limit.mjs';
import { seoTitle } from '../../../lib/seo';
import { notFound } from 'next/navigation';
import { readJevbenchV1811ForBoard, v1811BoardInput } from '../../../lib/jevbench-v1811-release.mjs';
import { JevBenchArchiveBoard } from '../../../components/JevBenchArchiveBoard';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { readJevbenchV157Release, withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { readJevbenchV161Release } from '../../../lib/jevbench-v16-release.mjs';
import { assembleJevBoard } from '../../../lib/jevbench-live-board.mjs';
import apiA4 from '../../../data/jevbench-api-a4-equated.json';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:seoTitle('JevBench v1.8.11: Minimodels Decision 1.0'),description:'Minimodels Decision 1.0 (candy-cane), measured on the 27 Oct draw and listed unranked until the next ranking review.',alternates:{canonical:'/jev-models/v1.8.11'}};
export default async function JevModelsV1811Page() {
 const release=await readJevbenchV1811ForBoard();if(!release)notFound();
 const [base,previous]=await Promise.all([readJevbenchV161Release(),readJevbenchV157Release()]);
 const chain=await assembleJevBoard({release:{artifact:base.artifact,categories:base.categories,carry:base.carry},previous,live:true,apiA4});
 const board=v1811BoardInput(release,chain);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.8.11"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.8.11 · {jevMethodLabel('v1.8.11')}</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.8.11: Minimodels Decision 1.0 (candy-cane)</h1>
 <p className="mt-3 max-w-3xl">Added Minimodels Decision 1.0 (candy-cane), measured on the 27 Oct draw, unranked until the next ranking review.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.8.11">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.8.10">Previous v1.8.10</a></p></header>
 <JevBenchArchiveBoard version="v1.8.11" artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.8.11' && row.new_in!=='v1.8.11').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1811-method><h2 className="text-2xl font-bold">What changed in v1.8.11</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
