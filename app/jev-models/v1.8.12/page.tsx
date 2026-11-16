import { jevMethodLabel } from '../../../lib/jev-decision-limit.mjs';
import { seoTitle } from '../../../lib/seo';
import { notFound } from 'next/navigation';
import { readJevbenchV1812ForBoard, v1812BoardInput } from '../../../lib/jevbench-v1812-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { readJevbenchV157Release, withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { readJevbenchV161Release } from '../../../lib/jevbench-v16-release.mjs';
import { assembleJevBoard } from '../../../lib/jevbench-live-board.mjs';
import apiA4 from '../../../data/jevbench-api-a4-equated.json';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:seoTitle('JevBench v1.8.12: Starlord-27B-v2.0-preview'),description:'Starlord-27B-v2.0-preview, measured on the 27 Oct draw and listed unranked until the next ranking review.',alternates:{canonical:'/jev-models/v1.8.12'}};
export default async function JevModelsV1812Page() {
 const release=await readJevbenchV1812ForBoard();if(!release)notFound();
 const [base,previous]=await Promise.all([readJevbenchV161Release(),readJevbenchV157Release()]);
 const chain=await assembleJevBoard({release:{artifact:base.artifact,categories:base.categories,carry:base.carry},previous,live:true,apiA4});
 const board=v1812BoardInput(release,chain);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.8.12"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.8.12 · {jevMethodLabel('v1.8.12')}</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.8.12: Starlord-27B-v2.0-preview</h1>
 <p className="mt-3 max-w-3xl">Added Starlord-27B-v2.0-preview, measured on the 27 Oct draw, unranked until the next ranking review.</p>
      <p>H2O-Lightning-4B v1.4.1 now uses the same ranking-hold wording as the other held rows; its scores and ranking status are unchanged.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.8.12">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.8.11">Previous v1.8.11</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.8.12' && row.new_in!=='v1.8.12').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1812-method><h2 className="text-2xl font-bold">What changed in v1.8.12</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
