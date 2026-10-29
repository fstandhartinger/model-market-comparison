import { notFound } from 'next/navigation';
import { readJevbenchV180ForBoard, v180BoardInput } from '../../../lib/jevbench-v180-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.8.0: GPU-time cost basis',description:'GPU-time cost estimates for self-hosted open weights; API prices and both caps unchanged.',alternates:{canonical:'/jev-models/v1.8.0'}};
export default async function JevModelsV180Page() {
 const release=await readJevbenchV180ForBoard();if(!release)notFound();
 const board=v180BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.8.0"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.8.0: GPU-time cost basis</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.8.0: GPU-time cost basis</h1>
 <p className="mt-3 max-w-3xl">Cost basis for self-hosted open weights changed from base-model list prices to GPU time on a monthly-rented RTX PRO 6000 with an efficient inference engine. 210 rows have verified scored usage and a resolvable architecture; 46 additional open-weight rows fall within both official caps. Intelligence, Calibration and latency are unchanged; API costs and both caps are unchanged. Encoders, unresolved architectures and rows without a verified token basis retain their old costs. Composite intervals affected by the cost change are withheld; the archived v1.7 intervals use the old cost. Old values remain available in v1.7.x.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.8.0">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.23">Previous v1.7.23</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.8.0' && row.new_in!=='v1.8.0').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev180-method><h2 className="text-2xl font-bold">What changed in v1.8.0</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
