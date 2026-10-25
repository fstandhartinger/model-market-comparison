import { notFound } from 'next/navigation';
import { readJevbenchV171ForBoard, v171BoardInput } from '../../../lib/jevbench-v171-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.1 · Three same-draw additions',description:'Amazon Strands Decider 26B-A4B, Turion JEV 31B and Chon-1.0-12B-Fast added. No method change; carried scores and confidence intervals retained.',alternates:{canonical:'/jev-models/v1.7.1'}};
export default async function JevModelsV171Page() {
 const release=await readJevbenchV171ForBoard();if(!release)notFound();
 const board=v171BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.1"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.1 · same-draw additions</div>
 <h1 className="mt-1 text-3xl font-bold">Three decision models added</h1>
 <p className="mt-3 max-w-3xl">Amazon Strands Decider 26B-A4B, Turion JEV 31B and Chon-1.0-12B-Fast join on the same draw. The 10-second rule and common cost basis are unchanged. All carried scores and confidence intervals are retained; only placements move. Turion exceeds the official cost cap and appears in uncapped views.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.1">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.0">Previous v1.7.0</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {new_in?: string})=>row.new_in!=='v1.7.1').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev171-method><h2 className="text-2xl font-bold">What changed in v1.7.1</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
