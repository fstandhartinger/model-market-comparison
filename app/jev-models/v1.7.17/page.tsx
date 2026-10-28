import { notFound } from 'next/navigation';
import { readJevbenchV1717ForBoard, v1717BoardInput } from '../../../lib/jevbench-v1717-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.17: Jev-Style-2B on the 27 Oct regular draw, shown unranked',description:'Jev-Style-2B on the 27 Oct draw, shown unranked. All existing rows and ranked orders are unchanged.',alternates:{canonical:'/jev-models/v1.7.17'}};
export default async function JevModelsV1717Page() {
 const release=await readJevbenchV1717ForBoard();if(!release)notFound();
 const board=v1717BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.17"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.17: Jev-Style-2B on the 27 Oct regular draw, shown unranked</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.17: Jev-Style-2B on the 27 Oct regular draw, shown unranked</h1>
 <p className="mt-3 max-w-3xl">Added Jev-Style-2B (self-hosted) on the 27 Oct regular draw, shown unranked. Jev-Style-2B is a Qwen3.5-2B fine-tune, measured through the author&apos;s own server on one rented RTX 6000 Ada GPU. All 1,500 items were sent; the five longest exceeded its 32,768-token input limit and count as misses. The model was trained in part on soft labels from TypeSafe Jev 1.14 via its public API and official train splits of public benchmarks. The server reports 0 output tokens. Cost is an estimate at the base-model market reference, on the unchanged 1,489 items every row on the draw answered. The draw is not yet equated to the reference scale; stronger anchor runs are being measured. No existing score, interval, rank, order or category cell changes.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.17">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.16">Previous v1.7.16</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.17' && row.new_in!=='v1.7.17').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1717-method><h2 className="text-2xl font-bold">What changed in v1.7.17</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
