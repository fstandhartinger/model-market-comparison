import { notFound } from 'next/navigation';
import { readJevbenchV1715ForBoard, v1715BoardInput } from '../../../lib/jevbench-v1715-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.15: Microsoft-Decision-1 with updated weights on the 27 Oct regular draw',description:'Microsoft-Decision-1 with updated weights on the 27 Oct draw, shown unranked. Every existing score, rank, interval and category cell is unchanged.',alternates:{canonical:'/jev-models/v1.7.15'}};
export default async function JevModelsV1715Page() {
 const release=await readJevbenchV1715ForBoard();if(!release)notFound();
 const board=v1715BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.15"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.15: Microsoft-Decision-1 with updated weights on the 27 Oct regular draw</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.15: Microsoft-Decision-1 with updated weights on the 27 Oct regular draw</h1>
 <p className="mt-3 max-w-3xl">Added Microsoft-Decision-1 with updated weights (paid evaluation) on the 27 Oct regular draw; that draw&apos;s rows stay unranked until stronger anchors are measured. It is measured on 1,493 of the draw&apos;s items (7 items its provider had seen in an earlier evaluation are excluded; 4 requests over its 32,768-token context limit count as wrong); the first Microsoft-Decision-1 row stays unchanged. The draw&apos;s anchor runs are complete, but the anchor models are weaker than the draw&apos;s rows, so the draw is not equated: its numbers are shown as published (offset 0) and no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. Cost uses the advertised Azure Foundry tariff (USD 0.042 per million input tokens, output free), as for the first row. Every existing row keeps its scores and confidence intervals; no method change.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.15">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.14">Previous v1.7.14</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.15' && row.new_in!=='v1.7.15').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1715-method><h2 className="text-2xl font-bold">What changed in v1.7.15</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
