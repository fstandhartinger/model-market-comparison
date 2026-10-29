import { notFound } from 'next/navigation';
import { readJevbenchV1718ForBoard, v1718BoardInput } from '../../../lib/jevbench-v1718-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.18: KnowLine 4B-Gen5.5 and KnowLine 26B-A4B-Gen2.5',description:'Two KnowLine models measured on 23 Oct on the 12 Oct regular draw, with retained scores and confidence intervals.',alternates:{canonical:'/jev-models/v1.7.18'}};
export default async function JevModelsV1718Page() {
 const release=await readJevbenchV1718ForBoard();if(!release)notFound();
 const board=v1718BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-3);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.18"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.18: KnowLine 4B-Gen5.5 and KnowLine 26B-A4B-Gen2.5</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.18: KnowLine 4B-Gen5.5 and KnowLine 26B-A4B-Gen2.5</h1>
 <p className="mt-3 max-w-3xl">Added KnowLine 4B-Gen5.5 and KnowLine 26B-A4B-Gen2.5 (measured 23 Oct on the 12 Oct regular draw). The answer file was lost on 26 Oct 2026 after scoring. These are the scores and confidence intervals computed on 23 Oct; the measurement cannot be scored again. Subject-topic and use-case breakdowns are unavailable. KnowLine 26B-A4B-Gen2.5: The Noul decisiveness diagnostic is unavailable because the stored summaries do not record which timed-out answers were decisive. The measurement runner&apos;s internal time cap fired about 1.4 seconds before the scored loop ended. An independent review found the answer file complete: all 1,500 requests were answered, with token usage equal to the offline count. The runner&apos;s partial flag is retained in the measurement record.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.18">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.17">Previous v1.7.17</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.18' && row.new_in!=='v1.7.18').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1718-method><h2 className="text-2xl font-bold">What changed in v1.7.18</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
