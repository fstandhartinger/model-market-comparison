import { notFound } from 'next/navigation';
import { readJevbenchV1713ForBoard, v1713BoardInput } from '../../../lib/jevbench-v1713-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.13: first release on the 27 Oct regular draw',description:'One new self-hosted row on a new draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.',alternates:{canonical:'/jev-models/v1.7.13'}};
export default async function JevModelsV1713Page() {
 const release=await readJevbenchV1713ForBoard();if(!release)notFound();
 const board=v1713BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.13"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.13: first release on the 27 Oct regular draw</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.13: first release on the 27 Oct regular draw</h1>
 <p className="mt-3 max-w-3xl">First release on the 27 Oct regular draw: H2O-Lightning-4B v1.4.1 (paid evaluation), shown unranked until the draw is equated to the reference scale. It is the first row measured on a fresh sealed draw drawn on 27 Oct 2026; that draw is not yet equated to the reference scale, so its numbers are shown as published (offset 0) and it is not ranked: no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. Cost is an estimate from the base model price on the prompt tokens the model processed. Every existing row keeps its scores and confidence intervals; no method change.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.13">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.12">Previous v1.7.12</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.13' && row.new_in!=='v1.7.13').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1713-method><h2 className="text-2xl font-bold">What changed in v1.7.13</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
