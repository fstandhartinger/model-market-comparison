import { notFound } from 'next/navigation';
import { readJevbenchV1716ForBoard, v1716BoardInput } from '../../../lib/jevbench-v1716-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.16: Strike-1 on the 27 Oct regular draw; same-items cost on that draw',description:'Strike-1 on the 27 Oct draw, shown unranked; that draw is now costed on the items every row answered. No ranking or ranked order changes.',alternates:{canonical:'/jev-models/v1.7.16'}};
export default async function JevModelsV1716Page() {
 const release=await readJevbenchV1716ForBoard();if(!release)notFound();
 const board=v1716BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.16"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.16: Strike-1 on the 27 Oct regular draw; same-items cost on that draw</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.16: Strike-1 on the 27 Oct regular draw; same-items cost on that draw</h1>
 <p className="mt-3 max-w-3xl">Added Strike-1 (hosted) on the 27 Oct regular draw, shown unranked; costs on that draw now use the items every row answered. Strike-1 is a hosted decision API (EU, OVH Gravelines); it answered 1,495 of the draw&apos;s 1,500 items: 5 items over the provider&apos;s input limit were refused and count as wrong. Microsoft-Decision-1 (updated weights) ran on 1,493 items and answered 1,489; Strike-1&apos;s 5 refused long items are among those it did not answer, so every row on this draw is costed on those 1,489 items, each with its own price reference and token basis, and its all-items cost is stated next to it. Only cost, the Cost axis and the composites of those rows move; Intelligence, Calibration, Speed and category cells are unchanged. The draw is not yet equated to the reference scale (stronger anchor runs for that draw are being measured), so its numbers are shown as published (offset 0) and no ranking or ranked order changes. The 10 s rule applies; no decision took longer than 10 s. Rows on other draws keep their scores and confidence intervals; no method change.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.16">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.15">Previous v1.7.15</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.16' && row.new_in!=='v1.7.16').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1716-method><h2 className="text-2xl font-bold">What changed in v1.7.16</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
