import { notFound } from 'next/navigation';
import { readJevbenchV173ForBoard, v173BoardInput } from '../../../lib/jevbench-v173-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.3 · GPU re-time on the same draw',description:'Chon-1.0-E4B re-timed on GPU, replacing its CPU measurement. No method change; carried scores and confidence intervals retained.',alternates:{canonical:'/jev-models/v1.7.3'}};
export default async function JevModelsV173Page() {
 const release=await readJevbenchV173ForBoard();if(!release)notFound();
 const board=v173BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.3"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.3 · same-draw GPU re-time</div>
 <h1 className="mt-1 text-3xl font-bold">Chon-1.0-E4B re-timed on GPU</h1>
 <p className="mt-3 max-w-3xl">Chon-1.0-E4B uses the same system and configuration on GPU, replacing its CPU measurement. The 10-second rule and common cost basis are unchanged. All 288 other rows retain their scores and confidence intervals; only placements move.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.3">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.2">Previous v1.7.2</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string})=>row.remeasured_in!=='v1.7.3').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev173-method><h2 className="text-2xl font-bold">What changed in v1.7.3</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
