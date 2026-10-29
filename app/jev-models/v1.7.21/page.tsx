import { notFound } from 'next/navigation';
import { readJevbenchV1721ForBoard, v1721BoardInput } from '../../../lib/jevbench-v1721-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.21: VisionJEV 1.0.0 on the 27 Oct regular draw, shown unranked',description:'VisionJEV 1.0.0 measured on the 27 Oct regular draw, shown unranked.',alternates:{canonical:'/jev-models/v1.7.21'}};
export default async function JevModelsV1721Page() {
 const release=await readJevbenchV1721ForBoard();if(!release)notFound();
 const board=v1721BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.21"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.21: VisionJEV 1.0.0 on the 27 Oct regular draw, shown unranked</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.21: VisionJEV 1.0.0 on the 27 Oct regular draw, shown unranked</h1>
 <p className="mt-3 max-w-3xl">Added VisionJEV 1.0.0 (self-hosted) on the 27 Oct regular draw, shown unranked. A Qwen3.8-27B model measured through the author&apos;s own server on one A100 80 GB GPU, text only. All 1,500 items were sent; five exceeded its native 8,192-token input cap and were refused with HTTP 422, scored as misses and unbilled. Output tokens are zero. The cost estimate uses the unchanged 1,489-item basis. Training-data overlap is unchecked; 49 of 50 replayed requests were bit-identical, with no argmax flips. Apache-2.0 + NOTICE. Stronger anchor runs are being measured; the draw is not yet equated to the reference scale.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.21">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.20">Previous v1.7.20</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.21' && row.new_in!=='v1.7.21').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1721-method><h2 className="text-2xl font-bold">What changed in v1.7.21</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
