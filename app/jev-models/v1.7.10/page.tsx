import { notFound } from 'next/navigation';
import { readJevbenchV1710ForBoard, v1710BoardInput } from '../../../lib/jevbench-v1710-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.10: three same-draw self-hosted additions',description:'Philly Decider v2, iota-decide-4b-v0.3 and Decisio 0.9.0 join as self-hosted rows. Same method; 297 carried rows retain their scores and confidence intervals.',alternates:{canonical:'/jev-models/v1.7.10'}};
export default async function JevModelsV1710Page() {
 const release=await readJevbenchV1710ForBoard();if(!release)notFound();
 const board=v1710BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.10"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.10: three same-draw self-hosted additions</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.10: three same-draw self-hosted additions</h1>
 <p className="mt-3 max-w-3xl">Three new self-hosted rows Philly Decider v2, iota-decide-4b-v0.3 and Decisio 0.9.0 (Qwen3.6-35B-A3B); no method change. All 297 carried rows keep their scores and confidence intervals. Super Decider rows now link to the vendor page (completes the v1.7.9 change). Philly and iota v0.3 answered all 1,500 requests with disclosed truncation; Decisio answered 1,485 and its 15 HTTP 500 length refusals count as misses. All three use estimated base-model pricing; Decisio exceeds the official cost cap.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.10">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.9">Previous v1.7.9</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.10' && row.new_in!=='v1.7.10').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1710-method><h2 className="text-2xl font-bold">What changed in v1.7.10</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
