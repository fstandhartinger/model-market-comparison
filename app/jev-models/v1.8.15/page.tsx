import { jevMethodLabel } from '../../../lib/jev-decision-limit.mjs';
import { seoTitle } from '../../../lib/seo';
import { notFound } from 'next/navigation';
import { readJevbenchV1815ForBoard, v1815BoardInput } from '../../../lib/jevbench-v1815-release.mjs';
import { JevBenchArchiveBoard } from '../../../components/JevBenchArchiveBoard';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { readJevbenchV157Release, withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { readJevbenchV161Release } from '../../../lib/jevbench-v16-release.mjs';
import { assembleJevBoard } from '../../../lib/jevbench-live-board.mjs';
import apiA4 from '../../../data/jevbench-api-a4-equated.json';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:seoTitle('JevBench v1.8.15: Starlord-4B-preview'),description:'Starlord-4B-preview, measured on the 27 Oct draw and listed unranked until the next ranking review.',alternates:{canonical:'/jev-models/v1.8.15'}};
export default async function JevModelsV1815Page() {
 const release=await readJevbenchV1815ForBoard();if(!release)notFound();
 const [base,previous]=await Promise.all([readJevbenchV161Release(),readJevbenchV157Release()]);
 const chain=await assembleJevBoard({release:{artifact:base.artifact,categories:base.categories,carry:base.carry},previous,live:true,apiA4});
 const board=v1815BoardInput(release,chain);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.8.15"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.8.15 · {jevMethodLabel('v1.8.15')}</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.8.15: Starlord-4B-preview</h1>
 <p className="mt-3 max-w-3xl">Added Starlord-4B-preview, measured on the 27 Oct draw, unranked until the next ranking review.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.8.15">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.8.14">Previous v1.8.14</a></p></header>
 <JevBenchArchiveBoard version="v1.8.15" artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.8.15' && row.new_in!=='v1.8.15').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1815-method><h2 className="text-2xl font-bold">What changed in v1.8.15</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
