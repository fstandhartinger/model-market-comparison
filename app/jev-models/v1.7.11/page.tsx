import { notFound } from 'next/navigation';
import { readJevbenchV1711ForBoard, v1711BoardInput } from '../../../lib/jevbench-v1711-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.11: Decisio Gemma cost correction',description:'Four existing Decisio Gemma rows receive corrected engine-input cost. Same measurements and method; four costs corrected.',alternates:{canonical:'/jev-models/v1.7.11'}};
export default async function JevModelsV1711Page() {
 const release=await readJevbenchV1711ForBoard();if(!release)notFound();
 const board=v1711BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.11"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.11: Decisio Gemma cost correction</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.11: Decisio Gemma cost correction</h1>
 <p className="mt-3 max-w-3xl">Cost correction for four Decisio Gemma rows (engine-processed input); no new measurement, no method change. Intelligence, Calibration, Speed and Capability retain their published values. Each row keeps its own common item basis. Registration prefill estimates are disclosed separately and are not priced.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.11">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.10">Previous v1.7.10</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.11' && row.new_in!=='v1.7.11').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1711-method><h2 className="text-2xl font-bold">What changed in v1.7.11</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
